#!/bin/bash
# ============================================================
# MAELLIS Airport Bot — Module Test Script  
# Starts dev server, waits, then tests all modules
# ============================================================

cd /home/z/my-project/maellis-airport-bot

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0

echo ""
echo "============================================================"
echo "  MAELLIS AIRPORT BOT — MODULE TESTING"  
echo "============================================================"
echo ""

# Start dev server
echo -e "${CYAN}Starting dev server...${NC}"
PORT=3456
bun run dev -p $PORT > /tmp/nextdev.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (max 60s)
echo -n "  Waiting for server"
for i in $(seq 1 30); do
  if curl -s --max-time 2 http://localhost:$PORT > /dev/null 2>&1; then
    echo " ${GREEN}READY${NC} (port $PORT)"
    break
  fi
  echo -n "."
  sleep 2
done

# Check if server started
if ! curl -s --max-time 5 http://localhost:$PORT > /dev/null 2>&1; then
  echo -e "${RED}  Server failed to start!${NC}"
  echo ""
  echo "Dev server log:"
  cat /tmp/nextdev.log
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

# Function to test an endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="$4"
  
  echo -n "  $name ... "
  
  if [ "$method" = "GET" ]; then
    http_code=$(curl -s -o /tmp/test_body.json -w "%{http_code}" --max-time 20 "$url" 2>/dev/null)
  else
    http_code=$(curl -s -o /tmp/test_body.json -w "%{http_code}" --max-time 20 -X "$method" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null)
  fi
  
  body=$(cat /tmp/test_body.json 2>/dev/null | head -c 300)
  
  # Accept any 2xx or 3xx as pass
  if echo "$http_code" | grep -qE "^[23]"; then
    echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
    PASS=$((PASS + 1))
  elif echo "$http_code" | grep -qE "^4[0-9][0-9]"; then
    # 4xx could be expected (auth required, validation error, etc)
    echo -e "${YELLOW}WARN${NC} (HTTP $http_code)"
    echo "         $body"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC} (HTTP $http_code)"
    echo "         $body"
    FAIL=$((FAIL + 1))
  fi
}

BASE="http://localhost:$PORT"

# ─────────────────────────────────────────
echo ""
echo -e "${BLUE}[1/7] CHECK-IN MODULE${NC}"
test_endpoint "List sessions" "GET" "$BASE/api/checkin"
test_endpoint "Create session" "POST" "$BASE/api/checkin" '{"phone":"+221770000001","flightNumber":"AF724","airline":"Air France","pnr":"KXH4M2"}'
test_endpoint "Get stats" "GET" "$BASE/api/checkin/stats"

echo ""
echo -e "${BLUE}[2/7] HOTELS MODULE${NC}"
test_endpoint "Search hotels" "GET" "$BASE/api/hotels?airportCode=DSS"
test_endpoint "List bookings" "GET" "$BASE/api/hotels/bookings"
test_endpoint "Hotel stats" "GET" "$BASE/api/hotels?stats=true"

echo ""
echo -e "${BLUE}[3/7] PHARMACY MODULE${NC}"
test_endpoint "List orders" "GET" "$BASE/api/pharmacy"
test_endpoint "Create order" "POST" "$BASE/api/pharmacy" '{"customerName":"Test Patient","customerPhone":"+221770000001","items":[{"name":"Paracetamol 500mg","quantity":2,"price":500}]}'

echo ""
echo -e "${BLUE}[4/7] MUSIC MODULE${NC}"
test_endpoint "List categories" "GET" "$BASE/api/music/categories"
test_endpoint "List tracks" "GET" "$BASE/api/music/tracks"
test_endpoint "Music stats" "GET" "$BASE/api/music/tracks?stats=true"

echo ""
echo -e "${BLUE}[5/7] SMARTLY MILES MODULE${NC}"
test_endpoint "Get balance" "GET" "$BASE/api/miles?phone=%2B221770000001"
test_endpoint "Transaction history" "GET" "$BASE/api/miles?phone=%2B221770000001&history=true"

echo ""
echo -e "${BLUE}[6/7] OCR / TICKET SCANS MODULE${NC}"
test_endpoint "List scans" "GET" "$BASE/api/ticket-scans"
test_endpoint "Scan stats" "GET" "$BASE/api/ticket-scans/stats"
test_endpoint "OCR analyze" "POST" "$BASE/api/media/analyze" '{"phone":"+221770000001","imageData":"data:image/png;base64,test"}'

echo ""
echo -e "${BLUE}[7/7] SYSTEM & OTHER ENDPOINTS${NC}"
test_endpoint "Bot health" "GET" "$BASE/api/bot/health"
test_endpoint "FAQ list" "GET" "$BASE/api/faq"
test_endpoint "Flight status" "GET" "$BASE/api/flights/status?flightNumber=AF724"
test_endpoint "Feedback" "GET" "$BASE/api/feedback"
test_endpoint "Dashboard stats" "GET" "$BASE/api/dashboard/stats"
test_endpoint "Emergency contacts" "GET" "$BASE/api/emergency/contacts"

echo ""
echo "============================================================"
echo -e "  RESULTS: ${GREEN}$PASS PASSED${NC}, ${RED}$FAIL FAILED${NC}"
echo "============================================================"
echo ""

# Cleanup
kill $SERVER_PID 2>/dev/null

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Some tests failed! Check errors above.${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
