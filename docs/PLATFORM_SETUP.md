# 🌨️ Yukiko — Guía completa de configuración por plataformas

> Guía paso a paso para configurar Yukiko en Discord, Telegram y Web Chat,
> más el setup del servidor, base de datos y despliegue.
> Sistema operativo principal: **Arch Linux**

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Base de datos — Neon PostgreSQL](#2-base-de-datos--neon-postgresql)
3. [Discord](#3-discord)
4. [Telegram](#4-telegram)
5. [APIs externas](#5-apis-externas)
6. [Panel web — Vercel](#6-panel-web--vercel)
7. [Chat Web](#7-chat-web)
8. [VPS y deploy de bots](#8-vps-y-deploy-de-bots)
9. [GitHub y CI/CD](#9-github-y-cicd)
10. [Solución de problemas comunes](#10-solución-de-problemas-comunes)

---

## 1. Requisitos previos

### Arch Linux — dependencias

```bash
# Script de setup automático:
bash scripts/setup.sh

# O manualmente:
sudo pacman -S --needed nodejs npm git docker docker-compose ffmpeg jq curl

# PM2 (process manager para producción)
npm install -g pm2

# GitHub CLI
sudo pacman -S github-cli
gh auth login
```

### Node.js 20+

```bash
node --version  # debe ser v20+

# Si tienes una versión antigua, usa nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && nvm alias default 20
```

---

## 2. Base de datos — Neon PostgreSQL

1. Ve a **[neon.tech](https://neon.tech)** → Regístrate con GitHub
2. **New Project** → Nombre: `yukiko` → Región: Europe West
3. Copia la **Connection String**

```env
DATABASE_URL=postgresql://user:pass@ep-xxxx.eu-west-2.aws.neon.tech/yukikoDb?sslmode=require
```

### Crear tablas

```bash
npx drizzle-kit generate
npx drizzle-kit push

# Panel visual:
bash scripts/db-studio.sh
```

### Integración Vercel ↔ Neon

1. Vercel → **Storage → Connect Store → Neon**
2. Selecciona tu proyecto → Conectar
3. Vercel inyecta `DATABASE_URL` automáticamente ✅

---

## 3. Discord

### 3.1 Crear la aplicación

1. Ve a **[discord.com/developers/applications](https://discord.com/developers/applications)**
2. **New Application** → Nombre: `Yukiko`
3. Sube un avatar

### 3.2 Configurar el Bot

1. Sección **Bot** → **Add Bot**
2. Copia el token:
   ```env
   DISCORD_TOKEN=MTxxxxxxxxxx...
   ```
3. Activa estos **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
   - ✅ Presence Intent

### 3.3 OAuth2 y permisos

1. **OAuth2 → URL Generator**
2. Scopes: `bot` + `applications.commands`
3. Bot Permissions: Read Messages, Send Messages, Embed Links, Attach Files, Use Slash Commands, Manage Messages, Kick/Ban Members

### 3.4 Variables de entorno

```env
DISCORD_TOKEN=MTxxxxxxxxxx...
DISCORD_CLIENT_ID=1234567890123456789
```

### 3.5 Probar

```bash
bash scripts/dev.sh --platform discord
# ✅ Discord slash commands registered
# 🌨️ Yukiko Discord ready as Yukiko#1234
```

---

## 4. Telegram

### 4.1 Crear el bot

1. Habla con **[@BotFather](https://t.me/BotFather)** en Telegram
2. `/newbot` → Nombre: `Yukiko` → Username: `YukikoNeko_bot`
3. Copia el token:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:AAxxxxxxxxxx...
   ```

### 4.2 Configurar comandos (opcional)

En BotFather, `/setcommands`:
```
ask - Pregúntale algo a Yukiko IA
imagine - Genera una imagen con IA
balance - Ver tus monedas
daily - Recompensa diaria
help - Ver todos los comandos
```

### 4.3 Probar

```bash
bash scripts/dev.sh --platform telegram
# 🌨️ Yukiko Telegram bot started
```

---

## 5. APIs externas

### Tenor (GIFs roleplay)
1. Ve a **[developers.google.com/tenor](https://developers.google.com/tenor)**
2. Crea un proyecto → API Key
```env
TENOR_API_KEY=xxxxxxxxxxxx
```

### Gelbooru (GIFs +18)
1. Regístrate en **[gelbooru.com](https://gelbooru.com)**
2. Ve a **My Account → API**
```env
GELBOORU_API_KEY=xxxxxxxxxxxx
GELBOORU_USER_ID=1234567
```

### Ollama (IA local)
```bash
# Instalar Ollama en el homelab
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar modelo
ollama pull llama3.2:3b
```
```env
OLLAMA_MODEL=llama3.2:3b
```

### Giphy (opcional)
```env
GIPHY_API_KEY=xxxxxxxxxxxx
```

---

## 6. Panel web — Vercel

### Deploy

1. Fork/push el repo a GitHub
2. Ve a **[vercel.com](https://vercel.com)** → New Project → importa el repo
3. **Root Directory**: `web`
4. Framework: Next.js (autodetectado)

### Variables de entorno en Vercel

```env
NEXTAUTH_SECRET=genera-uno-con-openssl-rand-base64-32
NEXTAUTH_URL=https://your-app-domain.com
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
GITHUB_CLIENT_ID=xxxx
GITHUB_CLIENT_SECRET=xxxx
HOMELAB_AGENT_URL=http://100.66.214.108:3001
ADMIN_SECRET=tu-secret-aqui
```

### Dominio personalizado

En Vercel → Settings → Domains → añade `your-app-domain.com`
Sigue las instrucciones DNS de Vercel.

---

## 7. Chat Web

El chat web está disponible en `/chat` y permite interactuar con Yukiko desde el navegador sin necesidad de Discord o Telegram.

### Arquitectura

```
Browser → /chat (Next.js page)
        → POST /api/chat (Next.js API Route en Vercel)
        → POST http://homelab:3001/chat (homelab-agent)
        → Ollama / Pollinations
```

### Comandos disponibles

| Comando | Descripción |
|---|---|
| `/ask <texto>` | Chat con IA (Ollama llama3.2:3b) |
| `/imagine <descripción>` | Genera imagen (Pollinations.ai) |
| `/translate <idioma> <texto>` | Traducción automática |
| `/help` | Lista de comandos |
| Texto libre | Se trata como `/ask` automáticamente |

### Variables necesarias

En Vercel (ya deberían estar del paso anterior):
```env
HOMELAB_AGENT_URL=http://100.66.214.108:3001
ADMIN_SECRET=tu-secret-aqui
```

---

## 8. VPS y deploy de bots

### Setup inicial en el homelab (Debian)

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
npm install -g pm2
pm2 startup systemd -u dockerja --hp /home/dockerja

# Clonar repo
git clone git@github.com:joseangelalejo/yukiko.git
cd yukiko
npm install
cp .env.example .env
# Editar .env con los valores reales
nano .env

# Iniciar todos los procesos
pm2 start ecosystem.config.cjs
pm2 save
```

### Procesos PM2

| Proceso | Puerto | Descripción |
|---|---|---|
| `yukiko-discord` | — | Bot Discord |
| `yukiko-telegram` | — | Bot Telegram |
| `yukiko-mobile` | 3002 | WebSocket server |
| `yukiko-agent` | 3001 | Agente HTTP admin |
| `yukiko-web` | 3000 | Next.js panel |

### Comandos útiles

```bash
yk-status          # pm2 status
yk-logs            # pm2 logs all
pm2 restart yukiko-discord --update-env
pm2 logs yukiko-agent --lines 30 --nostream
```

### Nginx (proxy reverso)

```nginx
# /etc/nginx/sites-available/yukiko
server {
    listen 80;
    server_name your-app-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/yukiko /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. GitHub y CI/CD

### Secrets necesarios en GitHub

Ve a **Settings → Secrets and variables → Actions**:

| Secret | Valor |
|---|---|
| `HOMELAB_SSH_KEY` | Clave privada SSH para el homelab |
| `HOMELAB_HOST` | IP o hostname del homelab |
| `HOMELAB_USER` | `dockerja` |
| `HOMELAB_PATH` | `your-home-path/yukiko` |

### Flujo de trabajo

```bash
# Siempre trabajar en dev
git checkout dev

# Hacer cambios...
git add . && git commit -m "feat: ..." && git push origin dev

# Crear PR
gh pr create --base main --head dev --title "feat: ..." --body "..."

# Esperar CI verde → merge
gh pr merge --merge --delete-branch=false
```

**NUNCA** push directo a `main`.

---

## 10. Solución de problemas comunes

### Bot Discord no responde a slash commands
```bash
# Verificar que los comandos están registrados
pm2 logs yukiko-discord --lines 50 --nostream | grep "registered\|error"

# Forzar re-registro
pm2 restart yukiko-discord --update-env
```

### Error `invalid input syntax for type uuid`
Asegúrate de pasar `platform` en todas las llamadas a `isOnCooldown`, `remainingCooldown` y `setCooldown`:
```typescript
await isOnCooldown(interaction.user.id, 'daily', 30, 'discord')
```

### El agente no responde desde Vercel
1. Verifica que `HOMELAB_AGENT_URL` está configurada en Vercel
2. Comprueba que `yukiko-agent` está online: `pm2 status`
3. Prueba desde el homelab: `curl http://localhost:3001/health`

### TypeScript errors en CI
Si añades plataformas nuevas, actualiza el `include` del tsconfig.

### Next.js build falla en web
```bash
cd web
npm run build 2>&1 | tail -30
# Si hay errores de tipo, verificar que los imports son correctos
```
