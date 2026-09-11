#!/bin/bash

PASS=0
FAIL=0

run_check() {
  local name="$1"
  local cmd="$2"
  echo ""
  echo "▶  $name"
  echo "───────────────────────────────────────────────"
  if (eval "$cmd"); then
    echo "✓  $name passed"
    PASS=$((PASS + 1))
  else
    echo "✗  $name failed"
    FAIL=$((FAIL + 1))
  fi
}

# Parse arguments
TARGET="${1:-all}"

echo "================================"
echo "  PlantCare Tests"
echo "================================"

if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  run_check "API Tests (Minitest)" "docker compose exec -e RAILS_ENV=test api rails test"
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "client" ]; then
  # Vite's proxy defaults to http://api:3000, which only resolves inside the
  # compose network — these tests run on the host, so Playwright's registration
  # calls die with ENOTFOUND api unless the published port is used instead.
  run_check "Client Tests (Playwright)" "cd client && npm install --silent && npx playwright install --with-deps 2>/dev/null; VITE_API_URL=\${VITE_API_URL:-http://localhost:3000} npm test"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════"

[ $FAIL -eq 0 ]
