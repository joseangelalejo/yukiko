#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Validador de variables de entorno
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}❌ No existe .env. Copia .env.example y rellénalo.${RESET}"
  exit 1
fi

# Cargar .env
set -o allexport
source "$ENV_FILE"
set +o allexport

ERRORS=0
WARNINGS=0

check_required() {
  local var="$1"
  local description="$2"
  if [[ -z "${!var:-}" || "${!var}" == *"your_"* || "${!var}" == *"change_me"* ]]; then
    echo -e "  ${RED}✗${RESET} ${BOLD}$var${RESET} — $description"
    ((ERRORS++)) || true
  else
    echo -e "  ${GREEN}✓${RESET} $var"
  fi
}

check_optional() {
  local var="$1"
  local description="$2"
  if [[ -z "${!var:-}" || "${!var}" == *"your_"* ]]; then
    echo -e "  ${YELLOW}○${RESET} ${var} — $description ${YELLOW}(opcional)${RESET}"
    ((WARNINGS++)) || true
  else
    echo -e "  ${GREEN}✓${RESET} $var"
  fi
}

check_url() {
  local var="$1"
  local val="${!var:-}"
  if [[ -z "$val" || "$val" == *"xxxx"* ]]; then
    echo -e "  ${RED}✗${RESET} ${BOLD}$var${RESET} — URL de base de datos"
    ((ERRORS++)) || true
  else
    echo -e "  ${GREEN}✓${RESET} $var ${CYAN}(${val:0:30}...)${RESET}"
  fi
}

echo -e "\n${BOLD}🔍 Validando variables de entorno...${RESET}\n"

echo -e "${BOLD}── Base de datos ──────────────────────────${RESET}"
check_url DATABASE_URL

echo -e "\n${BOLD}── Discord ────────────────────────────────${RESET}"
check_required DISCORD_TOKEN "Token del bot de Discord"
check_required DISCORD_CLIENT_ID "Client ID de la aplicación Discord"
check_optional DISCORD_GUILD_ID "Guild ID para comandos de prueba"

echo -e "\n${BOLD}── Telegram ───────────────────────────────${RESET}"
check_required TELEGRAM_BOT_TOKEN "Token del bot de Telegram (@BotFather)"

echo -e "\n${BOLD}── WhatsApp ───────────────────────────────${RESET}"
echo -e "  ${GREEN}✓${RESET} WhatsApp usa QR — no necesita token"

echo -e "\n${BOLD}── IA / OpenAI ────────────────────────────${RESET}"
check_optional OPENAI_API_KEY "Clave API de OpenAI (para /ask, /imagine)"

echo -e "\n${BOLD}── APIs de media ──────────────────────────${RESET}"
check_optional TENOR_API_KEY "Tenor API (GIFs de roleplay)"
check_optional REDGIFS_CLIENT_ID "RedGifs (contenido +18)"
check_optional DANBOORU_LOGIN "Danbooru login (hentai +18)"

echo -e "\n${BOLD}── Auth web panel ─────────────────────────${RESET}"
check_required NEXTAUTH_SECRET "Secreto de NextAuth (genera con: openssl rand -base64 32)"
check_required ADMIN_SECRET "Secreto para API de admin"
check_optional GITHUB_CLIENT_ID "GitHub OAuth (login en panel)"

echo -e "\n${BOLD}── Infraestructura ────────────────────────${RESET}"
check_optional REDIS_URL "Redis URL (caché)"
check_optional SSH_HOST "Host del VPS para deploy"

# ── Resumen ─────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}────────────────────────────────────────────${RESET}"
if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}❌ $ERRORS error(es) crítico(s) — el bot no funcionará correctamente${RESET}"
  echo -e "${YELLOW}⚠️  $WARNINGS variable(s) opcional(es) sin configurar${RESET}"
  exit 1
else
  echo -e "${GREEN}✅ Configuración válida${RESET}"
  if [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  $WARNINGS función(es) opcionales deshabilitadas${RESET}"
  fi
fi
echo ""
