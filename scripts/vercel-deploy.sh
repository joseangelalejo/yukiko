#!/usr/bin/env bash
# yk-deploy — Despliega el web panel en Vercel (producción)
set -e

export PATH="$HOME/.npm-global/bin:$PATH"
cd "$(dirname "$0")/.."

echo "🚀 Desplegando Yukiko web panel en Vercel..."

# Verificar que vercel CLI está disponible
if ! command -v vercel &>/dev/null; then
  echo "❌ vercel CLI no encontrado. Instala con: npm i -g vercel"
  exit 1
fi

vercel --prod --yes

echo "✅ Deploy completado en producción."
