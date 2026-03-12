#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Setup inicial (Arch Linux)
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

# ── Colores ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$ROOT_DIR/logs/setup-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$ROOT_DIR/logs" "$ROOT_DIR/sessions" "$ROOT_DIR/backups"

# ── Redirigir logs ──────────────────────────────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${BOLD}"
cat << 'EOF'
  ██╗   ██╗██╗   ██╗██╗  ██╗██╗██╗  ██╗ ██████╗
  ╚██╗ ██╔╝██║   ██║██║ ██╔╝██║██║ ██╔╝██╔═══██╗
   ╚████╔╝ ██║   ██║█████╔╝ ██║█████╔╝ ██║   ██║
    ╚██╔╝  ██║   ██║██╔═██╗ ██║██╔═██╗ ██║   ██║
     ██║   ╚██████╔╝██║  ██╗██║██║  ██╗╚██████╔╝
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝
                 Setup Script v1.0 — Arch Linux
EOF
echo -e "${RESET}"

# ── Verificar Arch Linux ────────────────────────────────────────────────────
step "Verificando sistema operativo"
if [[ ! -f /etc/arch-release ]]; then
  warn "Este script está optimizado para Arch Linux. Continuando de todas formas..."
else
  success "Arch Linux detectado"
fi

# ── Dependencias del sistema ────────────────────────────────────────────────
step "Instalando dependencias del sistema (pacman)"
PACMAN_PKGS=(
  "git"
  "nodejs"
  "npm"
  "ffmpeg"           # para música
  "postgresql"       # pg_dump para backups
  "redis"            # cache local dev
  "docker"
  "docker-compose"
  "jq"               # parse JSON en scripts
  "curl"
  "wget"
  "zip"
  "unzip"
  "openssh"
)

MISSING_PKGS=()
for pkg in "${PACMAN_PKGS[@]}"; do
  if ! pacman -Qi "$pkg" &>/dev/null; then
    MISSING_PKGS+=("$pkg")
  fi
done

if [[ ${#MISSING_PKGS[@]} -gt 0 ]]; then
  info "Instalando: ${MISSING_PKGS[*]}"
  sudo pacman -S --noconfirm --needed "${MISSING_PKGS[@]}" || {
    error "Falló la instalación de paquetes. Inténtalo manualmente: sudo pacman -S ${MISSING_PKGS[*]}"
  }
else
  success "Todas las dependencias del sistema están instaladas"
fi

# ── Node.js version check ───────────────────────────────────────────────────
step "Verificando versión de Node.js"
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 20 ]]; then
  error "Se requiere Node.js 20+. Versión actual: $(node --version)"
  info "Instala con: sudo pacman -S nodejs  o usa nvm"
  exit 1
fi
success "Node.js $(node --version)"

# ── Gestor de paquetes ────────────────────────────────────────────────────
step "Verificando npm"
success "npm $(npm --version)"

# ── pm2 ────────────────────────────────────────────────────────────────────
step "Instalando PM2 (process manager)"
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
success "PM2 $(pm2 --version)"

# ── tsx (TypeScript runner) ─────────────────────────────────────────────────
step "Instalando tsx"
if ! command -v tsx &>/dev/null; then
  npm install -g tsx
fi
success "tsx instalado"

# ── Git hooks ──────────────────────────────────────────────────────────────
step "Configurando Git hooks"
cd "$ROOT_DIR"

# Inicializar repo si no existe
if [[ ! -d .git ]]; then
  git init
  git remote add origin git@github.com:joseangelalejo/yukiko.git || true
  success "Repositorio Git inicializado"
else
  success "Repositorio Git ya existe"
fi

# Pre-push hook
cat > .git/hooks/pre-push << 'HOOK'
#!/usr/bin/env bash
echo "🌨️  Ejecutando pre-push checks..."
bash scripts/pre-push.sh
HOOK
chmod +x .git/hooks/pre-push
success "Hook pre-push instalado"

# Pre-commit hook
cat > .git/hooks/pre-commit << 'HOOK'
#!/usr/bin/env bash
echo "🌨️  Ejecutando pre-commit checks..."
# Verificar que no se suba .env
if git diff --cached --name-only | grep -q "^\.env$"; then
  echo "❌ ¡No subas el archivo .env! Usa .env.example"
  exit 1
fi
# Formatear archivos staged
npx prettier --write $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|json)$') 2>/dev/null || true
git add -u
HOOK
chmod +x .git/hooks/pre-commit
success "Hook pre-commit instalado"

# ── Variables de entorno ────────────────────────────────────────────────────
step "Configurando variables de entorno"
if [[ ! -f "$ROOT_DIR/.env" ]]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  warn "Archivo .env creado desde .env.example"
  warn "⚠️  IMPORTANTE: Edita .env con tus tokens antes de continuar"
  warn "   nano $ROOT_DIR/.env"
else
  success ".env ya existe"
fi

# ── Instalar dependencias npm ────────────────────────────────────────────────
step "Instalando dependencias de Node.js"
cd "$ROOT_DIR"
npm install
success "Dependencias instaladas"

# ── Validar .env ────────────────────────────────────────────────────────────
step "Validando configuración"
bash "$SCRIPT_DIR/env-validator.sh" || warn "Algunas variables de entorno faltan — normal en el primer setup"

# ── Docker ─────────────────────────────────────────────────────────────────
step "Configurando Docker"
if ! groups | grep -q docker; then
  sudo usermod -aG docker "$USER"
  warn "Añadido al grupo docker. Necesitas reiniciar sesión para que surta efecto."
fi

# Activar servicios
sudo systemctl enable --now docker redis || true
success "Docker y Redis configurados"

# ── Scripts ejecutables ─────────────────────────────────────────────────────
step "Haciendo scripts ejecutables"
chmod +x "$SCRIPT_DIR"/*.sh
success "Permisos configurados"

# ── Alias útiles ────────────────────────────────────────────────────────────
step "Añadiendo alias de shell"
SHELL_RC=""
if [[ -f "$HOME/.zshrc" ]]; then SHELL_RC="$HOME/.zshrc"
elif [[ -f "$HOME/.bashrc" ]]; then SHELL_RC="$HOME/.bashrc"
fi

if [[ -n "$SHELL_RC" ]]; then
  if ! grep -q "yukiko aliases" "$SHELL_RC"; then
    cat >> "$SHELL_RC" << ALIASES

# ── Yukiko aliases ──────────────────────────────────────────
alias yk='cd $ROOT_DIR'
alias yk-dev='cd $ROOT_DIR && bash scripts/dev.sh'
alias yk-status='cd $ROOT_DIR && pm2 status'
alias yk-logs='cd $ROOT_DIR && pm2 logs'
alias yk-restart='cd $ROOT_DIR && pm2 restart all'
alias yk-health='cd $ROOT_DIR && bash scripts/health-check.sh'
ALIASES
    success "Alias añadidos a $SHELL_RC (recarga con: source $SHELL_RC)"
  else
    success "Alias ya configurados"
  fi
fi

# ── Resumen ─────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  ✅ Setup completado${RESET}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════${RESET}\n"
echo -e "Próximos pasos:"
echo -e "  1. Editar .env:        ${CYAN}nano .env${RESET}"
echo -e "  2. Setup plataformas:  ${CYAN}cat docs/PLATFORM_SETUP.md${RESET}"
echo -e "  3. Crear tablas BD:    ${CYAN}npx drizzle-kit push${RESET}"
echo -e "  4. Iniciar en dev:     ${CYAN}bash scripts/dev.sh${RESET}"
echo -e "  5. Ver guía completa:  ${CYAN}cat docs/PLATFORM_SETUP.md${RESET}"
echo -e "\nLog guardado en: ${CYAN}$LOG_FILE${RESET}\n"
