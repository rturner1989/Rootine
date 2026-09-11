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

echo "================================"
echo "  PlantCare Lint"
echo "================================"

run_check "RuboCop (API)" "docker compose exec api bundle exec rubocop -A"
run_check "Brakeman (API)" "docker compose exec api bundle exec brakeman --no-pager -q"
run_check "Bundler Audit (API)" "docker compose exec api bundle exec bundler-audit check --update"
run_check "Biome (Client)" "cd client && npm run lint:fix"
run_check "TypeScript (Client)" "cd client && npm run typecheck"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════"

[ $FAIL -eq 0 ]
