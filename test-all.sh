#!/bin/bash
BASE="http://localhost:3000"
PASS=0
FAIL=0

test_ep() {
  local method=$1 url=$2 data=$3 expected=$4 desc=$5
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE$url" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE$url" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
  fi
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')
  if [ "$http_code" = "$expected" ]; then
    echo "✅ $desc (HTTP $http_code)"
    PASS=$((PASS + 1))
  else
    echo "❌ $desc (expected $expected, got $http_code)"
    echo "   Body: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
  echo "$body" > /tmp/last_resp.json
  sleep 0.3
}

extract() {
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['$1'])" < /tmp/last_resp.json 2>/dev/null
}

echo "════════════════════════════════════════════════════════"
echo "  MAELLIS BOT - COMPLETE ENDPOINT TEST"
echo "════════════════════════════════════════════════════════"

# MERCHANTS
echo "━━━ MERCHANTS ━━━"
test_ep GET "/api/merchants" "" 200 "GET /api/merchants (list)"
test_ep GET "/api/merchants?active=false" "" 200 "GET /api/merchants?active=false"
test_ep POST "/api/merchants" '{"airportCode":"DSS","name":"Dakar Duty-Free","category":"duty_free","terminal":"T1","gate":"B10","phone":"+221771234567","email":"c@ddf.sn","commissionRate":0.10}' 201 "POST /api/merchants (create M1)"
M1=$(extract id)
test_ep POST "/api/merchants" '{"airportCode":"DSS","name":"Le Gourmet","category":"restaurant","terminal":"T2","phone":"+221778889900","email":"c@gourmet.sn"}' 201 "POST /api/merchants (create M2)"
M2=$(extract id)
test_ep GET "/api/merchants/$M1" "" 200 "GET /api/merchants/:id"
test_ep GET "/api/merchants?category=duty_free" "" 200 "GET /api/merchants?category="
test_ep PUT "/api/merchants/$M1" '{"isVerified":true}' 200 "PUT /api/merchants/:id (verify)"
test_ep PUT "/api/merchants/$M1" '{"description":"Updated"}' 200 "PUT /api/merchants/:id (update)"
test_ep DELETE "/api/merchants/$M2" "" 200 "DELETE /api/merchants/:id"

# PRODUCTS
echo "━━━ PRODUCTS ━━━"
test_ep POST "/api/merchants/$M1/products" '{"name":"Chanel N5","category":"perfume","price":45000,"stock":25,"discountPercent":5}' 201 "POST /api/merchants/:id/products (P1)"
P1=$(extract id)
test_ep POST "/api/merchants/$M1/products" '{"name":"Macallan 18","category":"alcohol","price":85000,"stock":10}' 201 "POST /api/merchants/:id/products (P2)"
P2=$(extract id)
test_ep GET "/api/products" "" 200 "GET /api/products (list)"
test_ep GET "/api/products?merchantId=$M1" "" 200 "GET /api/products?merchantId="
test_ep GET "/api/products/$P1" "" 200 "GET /api/products/:id"
test_ep PUT "/api/products/$P1" '{"price":42000,"stock":20}' 200 "PUT /api/products/:id (update)"
test_ep PUT "/api/products/$P2" '{"isAvailable":false}' 200 "PUT /api/products/:id (unavailable)"

# ORDERS
echo "━━━ ORDERS ━━━"
O1_JSON="{\"merchantId\":\"$M1\",\"customerName\":\"Amadou\",\"customerPhone\":\"+221771112233\",\"type\":\"pickup\",\"items\":[{\"productId\":\"$P1\",\"productName\":\"Chanel N5\",\"quantity\":2}]}"
test_ep POST "/api/orders" "$O1_JSON" 201 "POST /api/orders (pickup)"
O1=$(extract id)
test_ep GET "/api/orders" "" 200 "GET /api/orders (list)"
test_ep PUT "/api/orders/$O1/confirm" "" 200 "PUT /api/orders/:id/confirm"
test_ep PUT "/api/orders/$O1/ready" "" 200 "PUT /api/orders/:id/ready"
test_ep PUT "/api/orders/$O1/complete" "" 200 "PUT /api/orders/:id/complete"

O2_JSON="{\"merchantId\":\"$M1\",\"customerName\":\"Fatou\",\"customerPhone\":\"+221774445566\",\"type\":\"delivery_gate\",\"gate\":\"A12\",\"items\":[{\"productId\":\"$P2\",\"productName\":\"Macallan 18\",\"quantity\":1}]}"
test_ep POST "/api/orders" "$O2_JSON" 201 "POST /api/orders (delivery)"
O2=$(extract id)
test_ep PUT "/api/orders/$O2/cancel" "" 200 "PUT /api/orders/:id/cancel"
test_ep GET "/api/orders/$O1" "" 200 "GET /api/orders/:id"

# REVIEWS
echo "━━━ REVIEWS ━━━"
test_ep POST "/api/merchants/$M1/reviews" '{"customerName":"Client1","customerPhone":"+221771112233","rating":5,"comment":"Super!"}' 201 "POST /api/merchants/:id/reviews"
REV=$(extract id)
test_ep GET "/api/merchants/$M1/reviews" "" 200 "GET /api/merchants/:id/reviews"
test_ep PUT "/api/reviews/$REV" '{"response":"Merci!"}' 200 "PUT /api/reviews/:id (respond)"

# WISHLIST
echo "━━━ WISHLIST ━━━"
test_ep POST "/api/wishlist" "{\"customerPhone\":\"+221771112233\",\"productId\":\"$P1\"}" 201 "POST /api/wishlist (add)"
test_ep GET "/api/wishlist?customerPhone=+221771112233" "" 200 "GET /api/wishlist?customerPhone="
test_ep DELETE "/api/wishlist/$P1?customerPhone=+221771112233" "" 200 "DELETE /api/wishlist/:id?customerPhone="

# MERCHANT DASHBOARD
echo "━━━ MERCHANT DASHBOARD ━━━"
test_ep GET "/api/merchants/$M1/dashboard/stats" "" 200 "GET /api/merchants/:id/dashboard/stats"
test_ep GET "/api/merchants/$M1/dashboard/revenue" "" 200 "GET /api/merchants/:id/dashboard/revenue"

# AD CAMPAIGNS
echo "━━━ AD CAMPAIGNS ━━━"
test_ep POST "/api/ads/campaigns" '{"airportCode":"DSS","name":"Summer Promo","startDate":"2025-01-01T00:00:00Z","endDate":"2026-12-31T23:59:59Z","totalBudget":500000}' 201 "POST /api/ads/campaigns"
C1=$(extract id)
test_ep GET "/api/ads/campaigns" "" 200 "GET /api/ads/campaigns"
test_ep GET "/api/ads/campaigns/$C1" "" 200 "GET /api/ads/campaigns/:id"
test_ep GET "/api/ads/campaigns/$C1/stats" "" 200 "GET /api/ads/campaigns/:id/stats"
test_ep PUT "/api/ads/campaigns/$C1" '{"totalBudget":750000}' 200 "PUT /api/ads/campaigns/:id"

# ADS
echo "━━━ ADS ━━━"
A1_JSON="{\"airportCode\":\"DSS\",\"campaignId\":\"$C1\",\"merchantId\":\"$M1\",\"title\":\"20% Off\",\"type\":\"banner\",\"placement\":\"home\",\"imageUrl\":\"https://example.com/a1.jpg\",\"ctaText\":\"Shop Now\",\"startDate\":\"2025-01-01T00:00:00Z\",\"endDate\":\"2026-12-31T23:59:59Z\",\"budget\":100000,\"budgetType\":\"total\"}"
test_ep POST "/api/ads" "$A1_JSON" 201 "POST /api/ads (A1)"
A1=$(extract id)
test_ep POST "/api/ads" "{\"airportCode\":\"DSS\",\"title\":\"Sponsored\",\"type\":\"sponsored_message\",\"placement\":\"between_messages\",\"imageUrl\":\"https://example.com/a2.jpg\",\"startDate\":\"2025-01-01T00:00:00Z\",\"endDate\":\"2026-12-31T23:59:59Z\",\"budget\":50000,\"budgetType\":\"cpm\",\"cpmRate\":5000}" 201 "POST /api/ads (A2 CPM)"
A2=$(extract id)
test_ep GET "/api/ads" "" 200 "GET /api/ads (list)"
test_ep GET "/api/ads/$A1" "" 200 "GET /api/ads/:id"
test_ep PUT "/api/ads/$A1" '{"title":"25% Off All!"}' 200 "PUT /api/ads/:id"
test_ep POST "/api/ads/$A1/submit" "" 200 "POST /api/ads/:id/submit"
test_ep POST "/api/ads/$A2/submit" "" 200 "POST /api/ads/:id/submit (A2)"

# ADMIN ADS
echo "━━━ ADMIN ADS ━━━"
test_ep GET "/api/admin/ads/pending" "" 200 "GET /api/admin/ads/pending"
test_ep PUT "/api/admin/ads/$A1/approve" "" 200 "PUT /api/admin/ads/:id/approve"
test_ep PUT "/api/admin/ads/$A2/reject" '{"reason":"Image too low"}' 200 "PUT /api/admin/ads/:id/reject"
test_ep POST "/api/ads/$A1/pause" "" 200 "POST /api/ads/:id/pause"
test_ep POST "/api/ads/$A1/resume" "" 200 "POST /api/ads/:id/resume"
test_ep GET "/api/admin/ads/stats" "" 200 "GET /api/admin/ads/stats"
test_ep GET "/api/admin/ads/revenue" "" 200 "GET /api/admin/ads/revenue"
test_ep GET "/api/admin/ads/inventory" "" 200 "GET /api/admin/ads/inventory"

# TRACKING
echo "━━━ TRACKING ━━━"
test_ep POST "/api/ads/track/impression" "{\"advertisementId\":\"$A1\",\"placement\":\"home\"}" 200 "POST /api/ads/track/impression"
IMP=$(extract id)
test_ep POST "/api/ads/track/click" "{\"impressionId\":\"$IMP\"}" 200 "POST /api/ads/track/click"
test_ep POST "/api/ads/track/conversion" "{\"impressionId\":\"$IMP\",\"conversionValue\":15000}" 200 "POST /api/ads/track/conversion"
test_ep GET "/api/ads/public/active?airport=DSS" "" 200 "GET /api/ads/public/active"

# CLEANUP
echo "━━━ CLEANUP ━━━"
test_ep DELETE "/api/ads/$A2" "" 200 "DELETE /api/ads/:id"
test_ep DELETE "/api/ads/campaigns/$C1" "" 200 "DELETE /api/ads/campaigns/:id"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  RESULTS: $PASS passed / $FAIL failed / $((PASS+FAIL)) total"
echo "════════════════════════════════════════════════════════"
