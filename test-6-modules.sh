#!/bin/bash
BASE="http://localhost:3099"
PASS=0
FAIL=0
SKIP=0
TOTAL=0

log() {
  echo "  [$1] $2"
}

test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local expected_code="$4"
  local cookie="$5"
  
  TOTAL=$((TOTAL + 1))
  
  local result
  if [ -n "$cookie" ]; then
    result=$(curl -s -w "\n%{http_code}" -X "$method" -H "Cookie: $cookie" "$url" 2>/dev/null)
  else
    result=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null)
  fi
  
  local http_code=$(echo "$result" | tail -1)
  local body=$(echo "$result" | sed '$d')
  
  if [ "$http_code" = "$expected_code" ]; then
    log "PASS" "$name → $http_code OK"
    PASS=$((PASS + 1))
  else
    log "FAIL" "$name → Expected $expected_code, got $http_code"
    if echo "$body" | head -c 200 | grep -q "error\|Error"; then
      echo "       Error: $(echo "$body" | head -c 200)"
    fi
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================================"
echo "  SMARTLY AIRPORT BOT — 6 MODULES ENDPOINT TEST"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# ── Step 0: Login ──────────────────────────────────────────
echo "── AUTH ──────────────────────────────────────────────────"
LOGIN_RESULT=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maellis.aero","password":"admin123"}' 2>/dev/null)

if echo "$LOGIN_RESULT" | grep -q "token\|success"; then
  COOKIE=$(echo "$LOGIN_RESULT" | grep -o 'authjs.session-token=[^;]*' | head -1)
  if [ -z "$COOKIE" ]; then
    COOKIE=$(echo "$LOGIN_RESULT" | grep -o 'next-auth.session-token=[^;"]*' | head -1)
  fi
  log "PASS" "Login successful"
  echo "       Cookie: ${COOKIE:0:50}..."
else
  # Try with seed password from env
  SEED_PASS=$(grep SEED_ADMIN_PASSWORD /home/z/my-project/maellis-airport-bot/.env 2>/dev/null | cut -d= -f2 | tr -d ' "')
  if [ -n "$SEED_PASS" ]; then
    LOGIN_RESULT=$(curl -s -X POST "$BASE/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"admin@maellis.aero\",\"password\":\"$SEED_PASS\"}" 2>/dev/null)
    COOKIE=$(echo "$LOGIN_RESULT" | grep -o 'authjs.session-token=[^;]*' | head -1)
    if [ -z "$COOKIE" ]; then
      COOKIE=$(echo "$LOGIN_RESULT" | grep -o 'next-auth.session-token=[^;"]*' | head -1)
    fi
  fi
fi

if [ -z "$COOKIE" ]; then
  log "WARN" "Could not login, testing without auth"
  COOKIE=""
fi
echo ""

# ── MODULE 1: HÔTELS ──────────────────────────────────────
echo "── MODULE 1: HÔTELS ────────────────────────────────────────"
test_endpoint "GET /api/hotels?airportCode=DSS" "GET" "$BASE/api/hotels?airportCode=DSS" "401" "$COOKIE"
test_endpoint "GET /api/hotels?airportCode=DSS (auth)" "GET" "$BASE/api/hotels?airportCode=DSS&hours=4" "200" "$COOKIE"
test_endpoint "GET /api/hotels/bookings?stats=true" "GET" "$BASE/api/hotels/bookings?stats=true" "200" "$COOKIE"
test_endpoint "GET /api/hotels/bookings?phone=+221771234567" "GET" "$BASE/api/hotels/bookings?phone=+221771234567" "200" "$COOKIE"
echo ""

# ── MODULE 2: PHARMACIE ──────────────────────────────────
echo "── MODULE 2: PHARMACIE ──────────────────────────────────"
test_endpoint "GET /api/pharmacy?action=stats" "GET" "$BASE/api/pharmacy?action=stats" "200" "$COOKIE"
test_endpoint "GET /api/pharmacy?action=orders" "GET" "$BASE/api/pharmacy?action=orders" "200" "$COOKIE"
test_endpoint "GET /api/pharmacy?action=merchants" "GET" "$BASE/api/pharmacy?action=merchants&airportCode=DSS" "200" "$COOKIE"
test_endpoint "GET /api/pharmacy?action=search&q=paracetamol" "GET" "$BASE/api/pharmacy?action=search&q=paracetamol&airportCode=DSS" "200" "$COOKIE"
echo ""

# ── MODULE 3: CHECK-IN ──────────────────────────────────
echo "── MODULE 3: CHECK-IN ────────────────────────────────────"
test_endpoint "GET /api/checkin?stats=true" "GET" "$BASE/api/checkin?stats=true" "200" "$COOKIE"
test_endpoint "GET /api/checkin" "GET" "$BASE/api/checkin" "200" "$COOKIE"
test_endpoint "POST /api/checkin (create session)" "POST" "$BASE/api/checkin" "201" "$COOKIE"
echo ""

# ── MODULE 4: ZEN MUSIC ──────────────────────────────────
echo "── MODULE 4: ZEN MUSIC ──────────────────────────────────"
test_endpoint "GET /api/music/categories" "GET" "$BASE/api/music/categories" "200" "$COOKIE"
test_endpoint "GET /api/music/categories?admin=true" "GET" "$BASE/api/music/categories?admin=true" "200" "$COOKIE"
test_endpoint "GET /api/music/tracks" "GET" "$BASE/api/music/tracks" "200" "$COOKIE"
test_endpoint "GET /api/music/tracks?admin=true" "GET" "$BASE/api/music/tracks?admin=true" "200" "$COOKIE"
echo ""

# ── MODULE 5: SMARTLY MILES ──────────────────────────────────
echo "── MODULE 5: SMARTLY MILES ──────────────────────────────"
test_endpoint "GET /api/miles?action=stats" "GET" "$BASE/api/miles?action=stats" "200" "$COOKIE"
test_endpoint "GET /api/miles?action=leaderboard" "GET" "$BASE/api/miles?action=leaderboard" "200" "$COOKIE"
test_endpoint "GET /api/miles?action=balance&phone=+221771234567" "GET" "$BASE/api/miles?action=balance&phone=+221771234567" "200" "$COOKIE"
test_endpoint "GET /api/miles?action=history&phone=+221771234567" "GET" "$BASE/api/miles?action=history&phone=+221771234567" "200" "$COOKIE"
test_endpoint "GET /api/miles?action=rewards&tier=bronze" "GET" "$BASE/api/miles?action=rewards&tier=bronze" "200" "$COOKIE"
test_endpoint "POST /api/miles (credit points)" "POST" "$BASE/api/miles" "201" "$COOKIE"
echo ""

# ── MODULE 6: OCR / TICKET SCANS ──────────────────────────
echo "── MODULE 6: OCR / TICKET SCANS ──────────────────────────"
test_endpoint "GET /api/ticket-scans" "GET" "$BASE/api/ticket-scans" "200" "$COOKIE"
test_endpoint "GET /api/ticket-scans/stats" "GET" "$BASE/api/ticket-scans/stats" "200" "$COOKIE"
echo ""

# ── SUMMARY ─────────────────────────────────────────────────
echo "============================================================"
echo "  RESULTS"
echo "============================================================"
echo "  Total:  $TOTAL"
echo "  PASS:  $PASS ✅"
echo "  FAIL:  $FAIL ❌"
echo "  Rate:  $(echo "scale=1; $PASS * 100 / $TOTAL" | bc 2>/dev/null || echo 'N/A')%"
echo "============================================================"
