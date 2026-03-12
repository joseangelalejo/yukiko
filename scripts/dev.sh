#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Entorno de desarrollo
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; }

# Parsear args
PLATFORM="all"
SKIP_CHECKS=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --platform|-p) PLATFORM="$2"; shift 2 ;;
    --skip-checks|-s) SKIP_CHECKS=true; shift ;;
    --help|-h)
      echo "Uso: dev.sh [opciones]"
      echo "  -p, --platform <name>   Solo iniciar plataforma específica (discord|telegram|whatsapp|web)"
      echo "  -s, --skip-checks       Saltar verificaciones previas"
      exit 0 ;;
    *) error "Opción desconocida: $1"; exit 1 ;;
  esac
done

echo -e "\n${BOLD}🌨️  Yukiko — Entorno de desarrollo${RESET}\n"

if [[ "$SKIP_CHECKS" == false ]]; then
  step "Pre-checks"

  # .env
  if [[ ! -f .env ]]; then
    error ".env no existe. Ejecuta: bash scripts/setup.sh"
    exit 1
  fi
  success ".env encontrado"

  # Validar variables críticas
  source .env
  CRITICAL_MISSING=()
  [[ -z "${DATABASE_URL:-}" || "${DATABASE_URL}" == *"xxxx"* ]] && CRITICAL_MISSING+=("DATABASE_URL")

  if [[ ${#CRITICAL_MISSING[@]} -gt 0 ]]; then
    error "Variables críticas sin configurar: ${CRITICAL_MISSING[*]}"
    error "Edita .env y vuelve a intentarlo"
    exit 1
  fi
  success "Variables de entorno OK"

  # Redis
  step "Verificando servicios locales"
  if systemctl is-active --quiet redis; then
    success "Redis activo"
  else
    warn "Redis no está corriendo. Intentando iniciar..."
    sudo systemctl start redis 2>/dev/null && success "Redis iniciado" || warn "Redis no disponible (opcional en dev)"
  fi

  # Node modules
  if [[ ! -d node_modules ]]; then
    step "Instalando dependencias..."
    npm install
  fi
  success "Dependencias OK"

  # DB connection test
  step "Probando conexión a base de datos"
  node -e "
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    sql\`SELECT 1\`.then(() => { console.log('  ✅ Base de datos conectada'); process.exit(0); })
      .catch(e => { console.error('  ❌ Error DB:', e.message); process.exit(0); });
  " 2>/dev/null || warn "No se pudo verificar la conexión a BD"
fi

# ── Iniciar plataformas ──────────────────────────────────────────────────────
step "Iniciando servicios (plataforma: $PLATFORM)"
echo ""

case "$PLATFORM" in
  discord)
    info "Iniciando solo Discord..."
    tsx watch platforms/discord/src/index.ts
    ;;
  telegram)
    info "Iniciando solo Telegram..."
    tsx watch platforms/telegram/src/index.ts
    ;;
  whatsapp)
    info "Iniciando solo WhatsApp (escanea el QR)..."
    tsx watch platforms/whatsapp/src/index.ts
    ;;
  web)
    info "Iniciando solo web..."
    cd web && npm run dev
    ;;
  all)
    info "Iniciando todo con concurrently..."
    echo -e "${YELLOW}  Ctrl+C para detener todo${RESET}\n"
    npx concurrently \
      --names "WEB,DISCORD,TELEGRAM,WHATSAPP" \
      --prefix-colors "blue,green,cyan,yellow" \
      "cd web && npm run dev" \
      "tsx watch platforms/discord/src/index.ts" \
      "tsx watch platforms/telegram/src/index.ts" \
      "tsx watch platforms/whatsapp/src/index.ts"
    ;;
  *)
    error "Plataforma desconocida: $PLATFORM"
    exit 1
    ;;
esac
