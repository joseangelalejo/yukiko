#!/usr/bin/env bash
# ============================================================
# Yukiko Bot — Script de instalación para Arch Linux
# Autor: joseangelalejo — https://github.com/joseangelalejo/yukiko
# Uso: bash scripts/install-arch.sh
# ============================================================

set -euo pipefail

# ─── Colores ─────────────────────────────────────────────────
RESET='\033[0m'
BOLD='\033[1m'
PINK='\033[1;35m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
BLUE='\033[1;34m'

# ─── Banner ───────────────────────────────────────────────────
clear
echo -e "${PINK}"
cat << 'EOF'
  ██╗   ██╗██╗   ██╗██╗  ██╗██╗██╗  ██╗ ██████╗
  ╚██╗ ██╔╝██║   ██║██║ ██╔╝██║██║ ██╔╝██╔═══██╗
   ╚████╔╝ ██║   ██║█████╔╝ ██║█████╔╝ ██║   ██║
    ╚██╔╝  ██║   ██║██╔═██╗ ██║██╔═██╗ ██║   ██║
     ██║   ╚██████╔╝██║  ██╗██║██║  ██╗╚██████╔╝
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝
EOF
echo -e "${RESET}"
echo -e "  ${CYAN}🌨️  Yukiko Bot — Instalador Arch Linux${RESET}"
echo -e "  ${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ─── Verificar que es Arch ────────────────────────────────────
if ! command -v pacman &>/dev/null; then
  echo -e "${RED}✗ Este script es para Arch Linux (pacman).${RESET}"
  echo -e "  Para Ubuntu/Debian usa: scripts/install-ubuntu.sh"
  exit 1
fi

# ─── Verificar que NO es root ─────────────────────────────────
if [[ "$EUID" -eq 0 ]]; then
  echo -e "${RED}✗ No ejecutes este script como root. Usa tu usuario normal.${RESET}"
  echo -e "  Se pedirá sudo cuando sea necesario."
  exit 1
fi

echo -e "${BOLD}📋 Herramientas que se instalarán:${RESET}"
echo -e "  ${CYAN}Pacman:${RESET}  nodejs npm git docker docker-compose redis ffmpeg jq curl wget unzip"
echo -e "  ${CYAN}AUR:${RESET}     yay (si no está)"
echo -e "  ${CYAN}npm -g:${RESET}  pm2 tsx vercel drizzle-kit"
echo -e "  ${CYAN}Extras:${RESET}  github-cli, openssh, ngrok (AUR)"
echo ""
read -rp "$(echo -e ${YELLOW}¿Continuar? [S/n] ${RESET})" confirm
confirm="${confirm:-S}"
[[ "${confirm,,}" == "n" ]] && echo "Cancelado." && exit 0

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}[1/7] Actualizando sistema...${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
sudo pacman -Syu --noconfirm
echo -e "${GREEN}✓ Sistema actualizado${RESET}"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}[2/7] Instalando paquetes base...${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

PKGS=(
  nodejs
  npm
  git
  openssh
  docker
  docker-compose
  redis
  ffmpeg
  jq
  curl
  wget
  unzip
  base-devel   # necesario para AUR (yay)
  github-cli
)

sudo pacman -S --needed --noconfirm "${PKGS[@]}"
echo -e "${GREEN}✓ Paquetes base instalados${RESET}"

# ─── Verificar versión de Node ────────────────────────────────
NODE_VER=$(node --version 2>/dev/null | tr -d 'v' | cut -d. -f1)
if [[ -z "$NODE_VER" || "$NODE_VER" -lt 20 ]]; then
  echo ""
  echo -e "${YELLOW}⚠ Node.js $NODE_VER detectado (necesitas v20+).${RESET}"
  echo -e "  Instalando con nvm para tener la versión correcta..."
  
  if ! command -v nvm &>/dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # shellcheck disable=SC1090
    source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi

  nvm install 20
  nvm use 20
  nvm alias default 20
  echo -e "${GREEN}✓ Node.js 20 instalado via nvm${RESET}"
else
  echo -e "${GREEN}✓ Node.js v${NODE_VER} OK${RESET}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}[3/7] Instalando yay (AUR helper)...${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
if command -v yay &>/dev/null; then
  echo -e "${GREEN}✓ yay ya instalado${RESET}"
else
  tmp_dir=$(mktemp -d)
  git clone https://aur.archlinux.org/yay.git "$tmp_dir/yay"
  (cd "$tmp_dir/yay" && makepkg -si --noconfirm)
  rm -rf "$tmp_dir"
  echo -e "${GREEN}✓ yay instalado${RESET}"
fi

# Paquetes AUR
echo ""
echo -e "  Instalando ngrok (AUR)..."
yay -S --needed --noconfirm ngrok-bin 2>/dev/null || echo -e "${YELLOW}  ⚠ ngrok no disponible en AUR, instala manualmente si lo necesitas${RESET}"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}[4/7] Activando servicios...${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
sudo systemctl enable --now docker
sudo systemctl enable --now redis
sudo usermod -aG docker "$USER"
echo -e "${GREEN}✓ Docker y Redis activados${RESET}"
echo -e "${YELLOW}  ⚠ Para usar docker sin sudo, cierra sesión y vuelve a entrar.${RESET}"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}[5/7] Instalando herramientas globales npm...${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

NPM_GLOBALS=(pm2 tsx vercel)

for pkg in "${NPM_GLOBALS[@]}"; do
  echo -e "  Instalando ${CYAN}${pkg}${RESET}..."
  npm install -g "$pkg" --silent
done

echo -e "${GREEN}✓ pm2, tsx, vercel instalados globalmente${RESET}"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}[6/7] Configurando SSH para deploy...${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
SSH_KEY="$HOME/.ssh/yukiko_rsa"
if [[ ! -f "$SSH_KEY" ]]; then
  ssh-keygen -t ed25519 -C "yukiko-deploy" -f "$SSH_KEY" -N ""
  echo -e "${GREEN}✓ Clave SSH generada: ${SSH_KEY}${RESET}"
  echo -e "  ${YELLOW}Copia la clave pública a tu servidor/homelab:${RESET}"
  echo -e "  ${CYAN}ssh-copy-id -i ${SSH_KEY}.pub usuario@TU_SERVER_IP${RESET}"
else
  echo -e "${GREEN}✓ Clave SSH ya existe: ${SSH_KEY}${RESET}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}[7/7] Configurando gh (GitHub CLI)...${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
if gh auth status &>/dev/null; then
  echo -e "${GREEN}✓ GitHub CLI ya autenticado${RESET}"
else
  echo -e "${YELLOW}  Iniciando login en GitHub (necesitas una cuenta)...${RESET}"
  gh auth login --web || echo -e "${YELLOW}  Puedes autenticarte después con: gh auth login${RESET}"
fi

# ─── Resumen final ────────────────────────────────────────────
echo ""
echo -e "${PINK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}🎉 ¡Instalación completa!${RESET}"
echo -e "${PINK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "${BOLD}Versiones instaladas:${RESET}"
echo -e "  Node.js:  ${CYAN}$(node --version 2>/dev/null || echo 'reinicia terminal')${RESET}"
echo -e "  npm:      ${CYAN}$(npm --version 2>/dev/null || echo '?')${RESET}"
echo -e "  Git:      ${CYAN}$(git --version | awk '{print $3}')${RESET}"
echo -e "  Docker:   ${CYAN}$(docker --version | awk '{print $3}' | tr -d ',')${RESET}"
echo -e "  PM2:      ${CYAN}$(pm2 --version 2>/dev/null || echo 'reinicia terminal')${RESET}"
echo ""
echo -e "${BOLD}Siguientes pasos:${RESET}"
echo -e "  ${CYAN}1.${RESET} Cierra sesión y vuelve a entrar (para Docker sin sudo)"
echo -e "  ${CYAN}2.${RESET} cd yukiko && cp .env.example .env && nano .env"
echo -e "  ${CYAN}3.${RESET} npm install && npx drizzle-kit push"
echo -e "  ${CYAN}4.${RESET} npm run dev"
echo ""
echo -e "  Docs: ${BLUE}https://joseangelalejo.github.io/yukiko${RESET}"
echo ""
