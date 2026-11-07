#!/usr/bin/env bash
# Testa as migrações e as regras de segurança num Postgres local temporário.
# Uso: npm run test:db   (precisa do PostgreSQL 15+ instalado)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || { echo "PostgreSQL não encontrado (defina PGBIN)."; exit 1; }
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-55432}"
RUN=""
if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; chown postgres "$WORK"; fi
cleanup() { $RUN "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

$RUN "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
PSQL=("$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -o /dev/null)

"${PSQL[@]}" -f "$ROOT/tests/db/supabase-shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ migração $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
for f in "$ROOT"/tests/db/[0-9]*.sql; do
  echo "→ teste $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "✓ Base de dados: todas as migrações e testes passaram."
