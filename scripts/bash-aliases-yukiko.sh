# ─────────────────────────────────────────────
# 🌨️ YUKIKO — ~/.bash_aliases
# Reemplaza el bloque existente con este contenido
# ─────────────────────────────────────────────

YK_DIR="/home/dockerja/docker-compose-files/yukiko"

# Estado
alias yk-status='pm2 list'
alias yk-help='cat $YK_DIR/ALIASES_YUKIKO.md | grep -A1000 "Comandos" | head -60 2>/dev/null || echo "Ver ALIASES_YUKIKO.md"'

# Parar
alias yk-stop-discord='pm2 stop yukiko-discord'
alias yk-stop-telegram='pm2 stop yukiko-telegram'
alias yk-stop-mobile='pm2 stop yukiko-mobile'
alias yk-stop-all='pm2 stop yukiko-discord yukiko-telegram yukiko-mobile'

# Deshabilitar
alias yk-disable-discord='pm2 stop yukiko-discord && pm2 save'
alias yk-disable-telegram='pm2 stop yukiko-telegram && pm2 save'
alias yk-disable-mobile='pm2 stop yukiko-mobile && pm2 save'
alias yk-disable-all='pm2 stop yukiko-discord yukiko-telegram yukiko-mobile && pm2 save'

# Reiniciar
alias yk-restart-discord='pm2 restart yukiko-discord --update-env'
alias yk-restart-telegram='pm2 restart yukiko-telegram --update-env'
alias yk-restart-mobile='pm2 restart yukiko-mobile --update-env'
alias yk-restart-all='pm2 restart yukiko-discord yukiko-telegram yukiko-mobile --update-env'
alias yk-restart-agent='pm2 restart yukiko-agent --update-env'
alias yk-restart-web='pm2 restart yukiko-web --update-env'

# Logs
alias yk-logs='pm2 logs'
alias yk-logs-discord='pm2 logs yukiko-discord --lines 50'
alias yk-logs-telegram='pm2 logs yukiko-telegram --lines 50'
alias yk-logs-mobile='pm2 logs yukiko-mobile --lines 50'
alias yk-logs-agent='pm2 logs yukiko-agent --lines 50'
alias yk-logs-web='pm2 logs yukiko-web --lines 50'

# Vercel
alias yk-deploy='export PATH="$HOME/.npm-global/bin:$PATH" && bash $YK_DIR/scripts/vercel-deploy.sh'
alias yk-undeploy='export PATH="$HOME/.npm-global/bin:$PATH" && bash $YK_DIR/scripts/vercel-undeploy.sh'

# GitHub Actions
alias yk-actions='gh run list --repo joseangelalejo/yukiko --limit 5'
alias yk-actions-watch='gh run watch --repo joseangelalejo/yukiko'

# ─────────────────────────────────────────────
# Funciones yk-start (en ~/.bashrc)
# ─────────────────────────────────────────────
# Pega estas funciones en ~/.bashrc:

# yk-start-discord() {
#   pm2 start yukiko-discord --update-env
#   read -rp "¿Activar arranque automático? [s/N] " r
#   [[ "$r" == "s" || "$r" == "S" ]] && pm2 save
# }
# yk-start-telegram() {
#   pm2 start yukiko-telegram --update-env
#   read -rp "¿Activar arranque automático? [s/N] " r
#   [[ "$r" == "s" || "$r" == "S" ]] && pm2 save
# }
# yk-start-mobile() {
#   pm2 start yukiko-mobile --update-env
#   read -rp "¿Activar arranque automático? [s/N] " r
#   [[ "$r" == "s" || "$r" == "S" ]] && pm2 save
# }
# yk-start-all() {
#   pm2 start yukiko-discord yukiko-telegram yukiko-mobile --update-env
#   read -rp "¿Activar arranque automático? [s/N] " r
#   [[ "$r" == "s" || "$r" == "S" ]] && pm2 save
# }
# yk-help() {
#   echo "🌨️  Yukiko — Comandos disponibles"
#   echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
#   echo "📊 ESTADO"
#   echo "  yk-status            Ver estado PM2"
#   echo "🛑 PARAR (temporal)"
#   echo "  yk-stop-discord/telegram/mobile/all"
#   echo "🚫 DESHABILITAR (para + desactiva arranque)"
#   echo "  yk-disable-discord/telegram/mobile/all"
#   echo "▶️  ARRANCAR (arranca + pregunta arranque auto)"
#   echo "  yk-start-discord/telegram/mobile/all"
#   echo "🔄 REINICIAR"
#   echo "  yk-restart-discord/telegram/mobile/all"
#   echo "  yk-restart-agent  yk-restart-web"
#   echo "📋 LOGS"
#   echo "  yk-logs            Todos en tiempo real"
#   echo "  yk-logs-discord/telegram/mobile"
#   echo "  yk-logs-agent  yk-logs-web"
#   echo "🚀 VERCEL"
#   echo "  yk-deploy          Despliega en producción"
#   echo "  yk-undeploy        Elimina todos los deployments"
#   echo "🔧 GITHUB ACTIONS"
#   echo "  yk-actions         Últimas 5 ejecuciones"
#   echo "  yk-actions-watch   Monitorización en tiempo real"
#   echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# }
