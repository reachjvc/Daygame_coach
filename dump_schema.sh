#!/usr/bin/env bash
  HOST="db.vcjzbmtcgmjrvvklzqaq.supabase.co"

  IPV4=$(getent ahostsv4 "$HOST" | awk 'NR==1{print $1}')
  if [ -z "$IPV4" ]; then
    IPV4=$(nslookup "$HOST" | awk '/Address: /{print $2}' | tail -n 1)
  read -s -p "DB password: " PGPASSWORD; echo
  PGSSLMODE=require PGPASSWORD="$PGPASSWORD" pg_dump --schema-only --no-owner --no-privileges -h "$IPV4" -U postgres -d postgres > schema.sql
  unset PGPASSWORD

  echo "Wrote schema.sql"
