#!/bin/sh
set -e

wait_for_mysql() {
  i=0
  until mysql -h "$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; do
    i=$((i+1))
    if [ "$i" -gt 60 ]; then
      exit 1
    fi
    sleep 2
  done
}

should_run() {
  if [ "${MIGRATIONS_FORCE}" = "1" ] || [ "${MIGRATIONS_FORCE}" = "true" ]; then
    return 0
  fi
  COUNT=$(mysql -N -s -h "$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}';")
  if [ "$COUNT" = "0" ]; then
    return 0
  fi
  return 1
}

apply_sql() {
  for f in /migrations/*.sql; do
    [ -e "$f" ] || continue
    echo "[MIGRATIONS] Aplicando $(basename "$f")..."
    mysql -h "$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < "$f"
    echo "[MIGRATIONS] Ok $(basename "$f")"
  done
}

wait_for_mysql
if should_run; then
  apply_sql
fi
