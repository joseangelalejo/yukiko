#!/usr/bin/env bash
# yk-undeploy — Elimina todos los deployments de Vercel del proyecto yukiko
set -e

export PATH="$HOME/.npm-global/bin:$PATH"
cd "$(dirname "$0")/.."

echo "🗑️  Eliminando deployments de Vercel..."

if ! command -v vercel &>/dev/null; then
  echo "❌ vercel CLI no encontrado. Instala con: npm i -g vercel"
  exit 1
fi

# Listar y eliminar todos los deployments
DEPLOYMENTS=$(vercel list --yes 2>/dev/null | awk 'NR>2 && $1 ~ /^https/ {print $1}')

if [ -z "$DEPLOYMENTS" ]; then
  echo "ℹ️  No hay deployments activos."
  exit 0
fi

echo "🔎 Deployments encontrados:"
echo "$DEPLOYMENTS"
echo ""
read -rp "⚠️  ¿Confirmas la eliminación de todos los deployments? [s/N] " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo "Cancelado."
  exit 0
fi

while IFS= read -r url; do
  echo "  🗑️  Eliminando $url..."
  vercel remove "$url" --yes 2>/dev/null && echo "  ✅ Eliminado" || echo "  ⚠️  No se pudo eliminar $url"
done <<< "$DEPLOYMENTS"

echo ""
echo "✅ Todos los deployments eliminados."
