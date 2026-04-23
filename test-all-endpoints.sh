#!/bin/bash
# MAELLIS Airport Bot - Complete Endpoint Test Suite
# Tests ALL Marketplace + Ads endpoints

BASE="http://localhost:3000"
PASS=0
FAIL=0
RESULTS=""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_endpoint() {
  local method=$1
  local url=$2
  local data=$3
  local expected_status=$4
  local desc=$5
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE$url" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE$url" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅${NC} $desc (HTTP $http_code)"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌${NC} $desc (expected $expected_status, got $http_code)"
    echo "   Body: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
  
  echo "$body" > /tmp/last_response.json
  sleep 0.3
}

echo "═══════════════════════════════════════════════════════════════"
echo "  MAELLIS AIRPORT BOT - COMPLETE ENDPOINT TEST SUITE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ━━━ MERCHANTS ━━━
echo -e "${YELLOW}━━━ MERCHANTS ━━━${NC}"

test_endpoint GET "/api/merchants" "" 200 "GET /api/merchants (list)"
test_endpoint GET "/api/merchants?active=false" "" 200 "GET /api/merchants?active=false (all)"
test_endpoint POST "/api/merchants" '{"airportCode":"DSS","name":"Dakar Duty-Free","category":"duty_free","terminal":"T1","gate":"B10","phone":"+221771234567","email":"contact@ddf.sn","description":"Best duty free","commissionRate":0.10}' 201 "POST /api/merchants (create M1)"
M1_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint POST "/api/merchants" '{"airportCode":"DSS","name":"Le Gourmet","category":"restaurant","terminal":"T2","phone":"+221778889900","email":"contact@gourmet.sn"}' 201 "POST /api/merchants (create M2)"
M2_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint GET "/api/merchants/$M1_ID" "" 200 "GET /api/merchants/:id (by id)"
test_endpoint GET "/api/merchants?category=duty_free" "" 200 "GET /api/merchants?category=duty_free (filter)"
test_endpoint PUT "/api/merchants/$M1_ID" '{"isVerified":true}' 200 "PUT /api/merchants/:id (verify)"
test_endpoint PUT "/api/merchants/$M1_ID" '{"description":"Updated description"}' 200 "PUT /api/merchants/:id (update)"
test_endpoint GET "/api/merchants/$M1_ID/reviews" "" 200 "GET /api/merchants/:id/reviews"
test_endpoint DELETE "/api/merchants/$M2_ID" "" 200 "DELETE /api/merchants/:id (soft delete)"

echo ""

# ━━━ PRODUCTS ━━━
echo -e "${YELLOW}━━━ PRODUCTS ━━━${NC}"

test_endpoint POST "/api/merchants/$M1_ID/products" '{"name":"Chanel N5","category":"perfume","price":45000,"stock":25,"description":"Iconic perfume","discountPercent":5}' 201 "POST /api/merchants/:id/products (create P1)"
P1_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint POST "/api/merchants/$M1_ID/products" '{"name":"Macallan 18","category":"alcohol","price":85000,"stock":10,"tags":["premium","whisky"]}' 201 "POST /api/merchants/:id/products (create P2)"
P2_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint GET "/api/products" "" 200 "GET /api/products (list all)"
test_endpoint GET "/api/products?merchantId=$M1_ID" "" 200 "GET /api/products?merchantId= (by merchant)"
test_endpoint GET "/api/products/$P1_ID" "" 200 "GET /api/products/:id (by id)"
test_endpoint GET "/api/products?search=chanel" "" 200 "GET /api/products?search= (search)"
test_endpoint PUT "/api/products/$P1_ID" '{"price":42000,"stock":20}' 200 "PUT /api/products/:id (update)"
test_endpoint PUT "/api/products/$P2_ID" '{"isAvailable":false}' 200 "PUT /api/products/:id (unavailable)"

echo ""

# ━━━ ORDERS ━━━
echo -e "${YELLOW}━━━ ORDERS ━━━${NC}"

test_endpoint POST "/api/orders" "{\"merchantId\":\"$M1_ID\",\"customerName\":\"Amadou Diallo\",\"customerPhone\":\"+221771112233\",\"type\":\"pickup\",\"items\":[{\"productId\":\"$P1_ID\",\"productName\":\"Chanel N5\",\"quantity\":2}]}" 201 "POST /api/orders (create order pickup)"
O1_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint GET "/api/orders" "" 200 "GET /api/orders (list)"
test_endpoint GET "/api/orders?status=pending" "" 200 "GET /api/orders?status=pending (filter)"

test_endpoint PUT "/api/orders/$O1_ID/confirm" "" 200 "PUT /api/orders/:id/confirm"
test_endpoint PUT "/api/orders/$O1_ID/ready" "" 200 "PUT /api/orders/:id/ready"
test_endpoint PUT "/api/orders/$O1_ID/complete" "" 200 "PUT /api/orders/:id/complete"

# Create order 2 for cancellation
test_endpoint POST "/api/orders" "{\"merchantId\":\"$M1_ID\",\"customerName\":\"Fatou Sy\",\"customerPhone\":\"+221774445566\",\"type\":\"delivery_gate\",\"gate\":\"A12\",\"items\":[{\"productId\":\"$P2_ID\",\"productName\":\"Macallan 18\",\"quantity\":1}]}" 201 "POST /api/orders (create order delivery)"
O2_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint PUT "/api/orders/$O2_ID/cancel" "" 200 "PUT /api/orders/:id/cancel"
test_endpoint GET "/api/orders/$O1_ID" "" 200 "GET /api/orders/:id (by id)"

echo ""

# ━━━ REVIEWS ━━━
echo -e "${YELLOW}━━━ REVIEWS ━━━${NC}"

# Create reviews via the register route
test_endpoint POST "/api/merchants/$M1_ID/reviews" '{"customerName":"Client Test","customerPhone":"+221771112233","rating":5,"comment":"Excellent service!"}' 201 "POST /api/merchants/:id/reviews (create)"
REV_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint GET "/api/merchants/$M1_ID/reviews" "" 200 "GET /api/merchants/:id/reviews (list)"
test_endpoint PUT "/api/reviews/$REV_ID" '{"response":"Merci beaucoup!"}' 200 "PUT /api/reviews/:id (respond)"

echo ""

# ━━━ WISHLIST ━━━
echo -e "${YELLOW}━━━ WISHLIST ━━━${NC}"

test_endpoint POST "/api/wishlist" "{\"customerPhone\":\"+221771112233\",\"productId\":\"$P1_ID\"}" 200 "POST /api/wishlist (add)"
test_endpoint GET "/api/wishlist?phone=+221771112233" "" 200 "GET /api/wishlist?phone= (list)"
test_endpoint DELETE "/api/wishlist/$P1_ID?phone=+221771112233" "" 200 "DELETE /api/wishlist/:productId?phone= (remove)"

echo ""

# ━━━ MERCHANT DASHBOARD ━━━
echo -e "${YELLOW}━━━ MERCHANT DASHBOARD ━━━${NC}"

test_endpoint GET "/api/merchants/$M1_ID/dashboard/stats" "" 200 "GET /api/merchants/:id/dashboard/stats"
test_endpoint GET "/api/merchants/$M1_ID/dashboard/revenue" "" 200 "GET /api/merchants/:id/dashboard/revenue"

echo ""

# ━━━ AD CAMPAIGNS ━━━
echo -e "${YELLOW}━━━ AD CAMPAIGNS ━━━${NC}"

test_endpoint POST "/api/ads/campaigns" '{"airportCode":"DSS","name":"Summer Promo","description":"Summer 2026","startDate":"2026-06-01T00:00:00Z","endDate":"2026-08-31T23:59:59Z","totalBudget":500000}' 201 "POST /api/ads/campaigns (create)"
C1_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint GET "/api/ads/campaigns" "" 200 "GET /api/ads/campaigns (list)"
test_endpoint GET "/api/ads/campaigns/$C1_ID" "" 200 "GET /api/ads/campaigns/:id"
test_endpoint GET "/api/ads/campaigns/$C1_ID/stats" "" 200 "GET /api/ads/campaigns/:id/stats"
test_endpoint PUT "/api/ads/campaigns/$C1_ID" '{"totalBudget":750000}' 200 "PUT /api/ads/campaigns/:id (update)"

echo ""

# ━━━ ADVERTISEMENTS ━━━
echo -e "${YELLOW}━━━ ADVERTISEMENTS ━━━${NC}"

test_endpoint POST "/api/ads" "{\"airportCode\":\"DSS\",\"campaignId\":\"$C1_ID\",\"merchantId\":\"$M1_ID\",\"title\":\"20% Off Perfumes\",\"type\":\"banner\",\"placement\":\"home\",\"imageUrl\":\"https://example.com/ad1.jpg\",\"targetUrl\":\"https://shop.com\",\"ctaText\":\"Shop Now\",\"startDate\":\"2026-06-01T00:00:00Z\",\"endDate\":\"2026-08-31T23:59:59Z\",\"budget\":100000,\"budgetType\":\"total\"}" 201 "POST /api/ads (create A1)"
A1_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint POST "/api/ads" "{\"airportCode\":\"DSS\",\"title\":\"Sponsored Message\",\"type\":\"sponsored_message\",\"placement\":\"between_messages\",\"imageUrl\":\"https://example.com/ad2.jpg\",\"startDate\":\"2026-06-01T00:00:00Z\",\"endDate\":\"2026-08-31T23:59:59Z\",\"budget\":50000,\"budgetType\":\"cpm\",\"cpmRate\":5000}" 201 "POST /api/ads (create A2 - CPM)"
A2_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

test_endpoint GET "/api/ads" "" 200 "GET /api/ads (list)"
test_endpoint GET "/api/ads/$A1_ID" "" 200 "GET /api/ads/:id"
test_endpoint PUT "/api/ads/$A1_ID" '{"title":"25% Off All Perfumes!"}' 200 "PUT /api/ads/:id (update)"

# Ad lifecycle
test_endpoint POST "/api/ads/$A1_ID/submit" "" 200 "POST /api/ads/:id/submit (submit for review)"
test_endpoint POST "/api/ads/$A2_ID/submit" "" 200 "POST /api/ads/:id/submit (submit A2)"

echo ""

# ━━━ ADMIN ADS ━━━
echo -e "${YELLOW}━━━ ADMIN ADS ━━━${NC}"

test_endpoint GET "/api/admin/ads/pending" "" 200 "GET /api/admin/ads/pending"
test_endpoint PUT "/api/admin/ads/$A1_ID/approve" "" 200 "PUT /api/admin/ads/:id/approve"
test_endpoint PUT "/api/admin/ads/$A2_ID/reject" '{"reason":"Image quality too low"}' 200 "PUT /api/admin/ads/:id/reject (with reason)"
test_endpoint POST "/api/ads/$A1_ID/pause" "" 200 "POST /api/ads/:id/pause"
test_endpoint POST "/api/ads/$A1_ID/resume" "" 200 "POST /api/ads/:id/resume"
test_endpoint GET "/api/admin/ads/stats" "" 200 "GET /api/admin/ads/stats"
test_endpoint GET "/api/admin/ads/revenue" "" 200 "GET /api/admin/ads/revenue"
test_endpoint GET "/api/admin/ads/inventory" "" 200 "GET /api/admin/ads/inventory"

echo ""

# ━━━ AD TRACKING ━━━
echo -e "${YELLOW}━━━ AD TRACKING ━━━${NC}"

# Track impression
test_endpoint POST "/api/ads/track/impression" "{\"advertisementId\":\"$A1_ID\",\"placement\":\"home\",\"deviceInfo\":\"{\\\"os\\\":\\\"iOS\\\"}\"}" 200 "POST /api/ads/track/impression"
IMP_ID=$(cat /tmp/last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

# Track click
test_endpoint POST "/api/ads/track/click" "{\"impressionId\":\"$IMP_ID\"}" 200 "POST /api/ads/track/click"

# Track conversion
test_endpoint POST "/api/ads/track/conversion" "{\"impressionId\":\"$IMP_ID\",\"conversionValue\":15000}" 200 "POST /api/ads/track/conversion"

# Public active ads
test_endpoint GET "/api/ads/public/active?airport=DSS" "" 200 "GET /api/ads/public/active (public)"

echo ""

# ━── CLEANUP ━──
echo -e "${YELLOW}━━━ CLEANUP ━━━${NC}"
test_endpoint DELETE "/api/ads/$A2_ID" "" 200 "DELETE /api/ads/:id (cleanup A2)"
test_endpoint DELETE "/api/ads/campaigns/$C1_ID" "" 200 "DELETE /api/ads/campaigns/:id (cleanup C1)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "  RESULTS: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $((PASS + FAIL)) total"
echo "═══════════════════════════════════════════════════════════════"

exit $FAIL
