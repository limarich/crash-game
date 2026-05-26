#!/bin/sh
set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
WALLETS_URL="${WALLETS_URL:-http://wallets:4002}"
REALM="${KEYCLOAK_REALM:-crash-game}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-crash-game-client}"
USERNAME="${SEED_USERNAME:-player}"
PASSWORD="${SEED_PASSWORD:-player123}"

echo "[seeder] Logging in as $USERNAME..."
TOKEN_RESPONSE=$(curl -sf --retry 5 --retry-delay 3 \
  -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=$CLIENT_ID&username=$USERNAME&password=$PASSWORD")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "[seeder] ERROR: failed to obtain access token"
  exit 1
fi

echo "[seeder] Creating wallet (idempotent)..."
curl -sf \
  -X POST "$WALLETS_URL/wallets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -o /dev/null || true  # 409 if already exists

echo "[seeder] Seeding initial balance..."
RESULT=$(curl -sf \
  -X POST "$WALLETS_URL/wallets/admin/seed" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "[seeder] Done: $RESULT"
