# 🌨️ Yukiko — Guía completa de configuración por plataformas

> Guía paso a paso para configurar Yukiko en Discord, Telegram y WhatsApp,
> más el setup del servidor web, base de datos y despliegue.
> Sistema operativo principal: **Arch Linux**

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Base de datos — Neon PostgreSQL](#2-base-de-datos--neon-postgresql)
3. [Discord](#3-discord)
4. [Telegram](#4-telegram)
5. [WhatsApp](#5-whatsapp)
6. [APIs externas](#6-apis-externas)
7. [Panel web — Vercel](#7-panel-web--vercel)
8. [VPS y deploy de bots](#8-vps-y-deploy-de-bots)
9. [GitHub y CI/CD](#9-github-y-cicd)
10. [Monitorización con Grafana](#10-monitorización-con-grafana)
11. [Solución de problemas comunes](#11-solución-de-problemas-comunes)

---

## 1. Requisitos previos

### Arch Linux — dependencias

```bash
# Ejecuta el script de setup automático:
bash scripts/setup.sh

# O manualmente:
sudo pacman -S --needed nodejs npm git docker docker-compose ffmpeg postgresql redis jq curl

# PM2 (process manager para producción)
npm install -g pm2
# tsx se usa como devDependency local (no instalar globalmente)

# GitHub CLI (opcional pero útil para post-push checks)
sudo pacman -S github-cli
gh auth login
```

### Node.js 20+

```bash
# Verificar versión
node --version  # debe ser v20+

# Si tienes una versión antigua, usa nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
```

### Activar servicios

```bash
sudo systemctl enable --now docker redis
sudo usermod -aG docker $USER
# Cierra sesión y vuelve a entrar para que surta efecto
```

---

## 2. Base de datos — Neon PostgreSQL

Neon es PostgreSQL serverless con tier gratuito generoso e integración nativa con Vercel.

### Crear proyecto

1. Ve a **[neon.tech](https://neon.tech)** → Regístrate / Entra con GitHub
2. **New Project** → Nombre: `yukiko` → Región: Europe West (o la más cercana)
3. Database: `yukikoDb` (o el nombre que prefieras)
4. Copia la **Connection String** → `postgresql://user:pass@ep-xxxx.eu-west-2.aws.neon.tech/yukikoDb?sslmode=require`

### Configurar en el proyecto

```bash
# En tu .env:
DATABASE_URL=postgresql://user:pass@ep-xxxx.eu-west-2.aws.neon.tech/yukikoDb?sslmode=require
```

### Crear tablas (migraciones)

```bash
# Genera las migraciones desde el schema
npx drizzle-kit generate

# Aplica las migraciones a Neon
npx drizzle-kit push

# Ver tablas en el panel visual de Drizzle:
bash scripts/db-studio.sh
# Abre http://local.drizzle.studio
```

### Añadir tabla adult_requests al schema

La tabla `adult_requests` es necesaria para el sistema de verificación +18.
Asegúrate de que `db/schema.ts` incluye:

```typescript
export const adultRequests = pgTable('adult_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformUserId: varchar('platform_user_id', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: varchar('reviewed_by', { length: 100 }),
  rejectionReason: text('rejection_reason'),
});
```

Después: `npx drizzle-kit push`

### Integración Vercel ↔ Neon

1. En Vercel: **Storage → Connect Store → Neon**
2. Selecciona tu proyecto Neon → Conectar
3. Vercel inyecta `DATABASE_URL` automáticamente en el deploy ✅

---

## 3. Discord

### 3.1 Crear la aplicación

1. Ve a **[discord.com/developers/applications](https://discord.com/developers/applications)**
2. **New Application** → Nombre: `Yukiko` → Create
3. En **General Information**:
   - Description: "Tu compañera neko kawaii 🌨️"
   - Sube un avatar bonito

### 3.2 Configurar el Bot

1. Sección **Bot** → **Add Bot** → Confirmar
2. **Token** → **Reset Token** → Copia el token
   ```
   DISCORD_TOKEN=MTxxxxxxxxxx...
   ```
3. Activa estos **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
   - ✅ Presence Intent
4. Desactiva **Public Bot** si quieres que solo tú puedas añadirla

### 3.3 OAuth2 y permisos

1. Sección **OAuth2 → URL Generator**
2. Scopes: `bot` + `applications.commands`
3. Bot Permissions:
   - ✅ Read Messages/View Channels
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Use Slash Commands
   - ✅ Manage Messages (para /clear)
   - ✅ Kick Members (moderación)
   - ✅ Ban Members (moderación)
4. Copia la URL generada y úsala para añadir el bot a tu servidor

### 3.4 Obtener IDs

```bash
# En Discord, activa Modo Desarrollador:
# Ajustes → Avanzado → Modo Desarrollador ✅

# Client ID (Application ID):
# General Information → Application ID

# Guild ID (para comandos de prueba más rápidos):
# Click derecho en tu servidor → Copiar ID del servidor
```

```env
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_GUILD_ID=9876543210987654321   # opcional, para dev
```

### 3.5 Probar

```bash
# Iniciar solo Discord
bash scripts/dev.sh --platform discord

# Verás:
# ✅ Discord slash commands registered
# 🌨️ Yukiko Discord ready as Yukiko#1234

# En tu servidor de Discord, prueba:
/balance
/hug @alguien
/ask ¿Cómo estás?
```

---

## 4. Telegram

### 4.1 Crear el bot con BotFather

1. Abre Telegram → Busca **[@BotFather](https://t.me/BotFather)**
2. Escribe `/newbot`
3. Nombre del bot: `Yukiko`
4. Username: `YukikoBot` (o lo que esté disponible, debe terminar en `bot`)
5. Copia el **token**:
   ```
   TELEGRAM_BOT_TOKEN=7123456789:AAxxxxxxxx...
   ```

### 4.2 Configurar el bot

Sigue enviando comandos a BotFather:

```
/setdescription → Yukiko — Tu compañera neko kawaii 🌨️
/setabouttext → Bot multiplataforma con roleplay, economía, IA y más
/setuserpic → (sube un avatar)
/setcommands →
balance - Ver tu saldo y nivel
daily - Recompensa diaria
hug - Abrazar a alguien
kiss - Besar a alguien
ask - Preguntarle algo a la IA
imagine - Generar una imagen con IA
hentai - Contenido +18 (requiere verificación)
verify18 - Solicitar acceso +18
top - Ranking de monedas
help - Ver todos los comandos
```

### 4.3 Configurar privacidad en grupos

Esto es importante para que el bot reciba todos los mensajes del grupo:

```
/setprivacy → @YukikoBot → DISABLE
```

Con `DISABLE`, el bot puede leer todos los mensajes (necesario para prefijo `/`).

### 4.4 Obtener tu Chat ID (para notificaciones admin)

```bash
# Envía un mensaje a tu bot y visita:
curl https://api.telegram.org/bot<TU_TOKEN>/getUpdates
# En el JSON, busca "chat": {"id": TU_CHAT_ID}
```

### 4.5 Probar

```bash
bash scripts/dev.sh --platform telegram
# Busca tu bot en Telegram → /start
# Prueba /balance, /daily, /ask hola
```

---

## 5. WhatsApp

WhatsApp usa la librería **Baileys** que implementa el protocolo de WhatsApp Web.
No requiere token — se autentica mediante QR code como WhatsApp Web.

> ⚠️ **Importante:** WhatsApp no tiene una API oficial para bots de terceros.
> El uso de Baileys va contra los ToS de WhatsApp en teoría, aunque para uso
> personal/privado con pocos usuarios es prácticamente indetectable.
> No abuses ni lo uses para spam.

### 5.1 Primera ejecución — Escanear QR

```bash
bash scripts/dev.sh --platform whatsapp

# Verás un QR code en la terminal.
# En tu móvil: WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo
# Escanea el QR
# Verás: 🌨️ Yukiko WhatsApp connected!
```

### 5.2 Sesión persistente

La sesión se guarda en `./sessions/whatsapp/` automáticamente.
En los siguientes inicios no necesitarás escanear QR (salvo que desloguees desde el móvil).

```bash
# Si necesitas resetear la sesión:
rm -rf sessions/whatsapp/
# Luego reinicia y escanea de nuevo
```

### 5.3 Añadir Yukiko a un grupo

1. En WhatsApp, crea o abre un grupo
2. Añade el número de teléfono vinculado al bot como participante
3. Yukiko responderá a comandos con prefijo `/` (ej: `/help`, `/balance`)

### 5.4 Consejos para WhatsApp

- **Prefijo:** Por defecto `/`. Puedes cambiarlo en `platforms/whatsapp/src/index.ts`
- **Grupos únicamente para +18:** El contenido adulto solo funciona en grupos, no en chats privados
- **Estabilidad:** Para producción, deja el proceso corriendo con PM2 en un servidor/VPS
- **Múltiples números:** Si quieres un número dedicado solo para el bot, compra una SIM barata

---

## 6. APIs externas

### Giphy (GIFs de roleplay) — Gratuito
1. Ve a **[developers.giphy.com](https://developers.giphy.com)**
2. **Create an App** -> SDK o API
3. Copia la **API Key**
```env
   GIPHY_API_KEY=xxxxxxxxxx
```
   > Nota: Tenor cerro su API a nuevos clientes en enero 2026. Yukiko usa Giphy.

### Ollama (IA local) — Gratuito / Self-hosted
1. Instala Ollama: **[ollama.com](https://ollama.com)**
```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3.2:3b
```
2. Ollama corre en http://127.0.0.1:11434 por defecto
```env
   OLLAMA_MODEL=llama3.2:3b
```
   > No necesita API key. La generacion de imagenes usa Pollinations.ai (gratuito, sin registro).

### RedGifs (GIFs +18) — Gratuito
- No necesita credenciales. Yukiko usa autenticacion temporal automatica (POST /v2/auth/temporary).
- No añadir REDGIFS_CLIENT_ID ni REDGIFS_CLIENT_SECRET al .env.

### Danbooru (imágenes hentai) — Gratuito / Premium

1. Ve a **[danbooru.donmai.us](https://danbooru.donmai.us)** → Crea cuenta
2. Perfil → API Key
   - Sin cuenta: funciona pero con límites bajos (1 request/segundo, sin rating:explicit sin cuenta)
   - Con cuenta gratuita: acceso completo a contenido explícito
   ```env
   DANBOORU_LOGIN=tu_usuario
   DANBOORU_API_KEY=tu_api_key
   ```

### Spotify (metadatos de música) — Gratuito

1. Ve a **[developer.spotify.com](https://developer.spotify.com)**
2. **Create App** → Rellena los campos
3. Settings → Client ID y Client Secret
   ```env
   SPOTIFY_CLIENT_ID=xxxxxxxxxx
   SPOTIFY_CLIENT_SECRET=xxxxxxxxxx
   ```

---

## 7. Panel web — Vercel

### 7.1 Configurar Next.js localmente

```bash
cd web
npm install
npm run dev
# Abre http://localhost:3000
```

### 7.2 Desplegar en Vercel

**Opción A — Desde el CLI (recomendado):**

```bash
npm install -g vercel
cd web
vercel login  # Conecta con tu cuenta de GitHub
vercel        # Primer deploy (modo preview)
vercel --prod # Deploy a producción
```

**Opción B — Desde vercel.com:**

1. Ve a **[vercel.com](https://vercel.com)** → New Project
2. Import Git Repository → `github.com/joseangelalejo/yukiko`
3. Root Directory: `web`
4. Framework: Next.js (autodetectado)
5. Add Environment Variables (copia de tu `.env`)

### 7.3 Variables de entorno en Vercel

Desde Vercel Dashboard → Settings → Environment Variables, añade:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | (conéctalo vía Neon Integration directamente) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://tu-app.vercel.app` |
| `ADMIN_SECRET` | Una contraseña segura |
| `GITHUB_CLIENT_ID` | (para login OAuth en el panel) |
| `GITHUB_CLIENT_SECRET` | |

### 7.4 GitHub OAuth para el panel de admin

1. GitHub → Settings → Developer Settings → **OAuth Apps** → New
2. Application name: `Yukiko Admin`
3. Homepage URL: `https://tu-app.vercel.app`
4. Authorization callback URL: `https://tu-app.vercel.app/api/auth/callback/github`
5. Copia Client ID y Client Secret

### 7.5 URLs del panel

| URL | Descripción |
|---|---|
| `/` | Landing page pública |
| `/commands` | Lista de comandos |
| `/admin` | Panel de administración |
| `/admin/verifications` | Aprobar solicitudes +18 ⭐ |
| `/monitor` | Métricas en tiempo real |

---

## 8. VPS y deploy de bots

Los bots de Discord, Telegram y WhatsApp necesitan un proceso corriendo 24/7.
Vercel no sirve para esto (solo web). Necesitas un VPS.

### 8.1 VPS recomendados (gratuitos o baratos)

| Proveedor | Plan gratuito | Notas |
|---|---|---|
| **Oracle Cloud** | Always Free (4 CPUs, 24GB RAM) | El mejor free tier del mercado |
| **Fly.io** | Tier gratuito | Muy fácil de usar |
| **Railway** | $5/mes | Deploy automático desde GitHub |
| **Hetzner** | €3.29/mes | Excelente calidad/precio en Europa |
| **DigitalOcean** | $4/mes | Buena documentación |

### 8.2 Configurar el VPS (Ubuntu/Arch)

```bash
# Conectar al VPS
ssh root@TU_IP

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs  # Ubuntu
# o: sudo pacman -S nodejs  # Arch

# PM2
npm install -g pm2
# tsx se instala como devDependency con npm install

# Clonar el repositorio
git clone git@github.com:joseangelalejo/yukiko.git
cd yukiko
cp .env.example .env
nano .env  # Rellenar tokens

# Instalar dependencias
npm install

# Iniciar con PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Para que arranque automáticamente al reiniciar el VPS
```

### 8.3 Acceso al homelab via Tailscale

El deploy usa Tailscale para conectar al homelab de forma segura.
```bash
# La clave SSH del homelab está en:
~/.ssh/id_ed25519_github

# Probar conexión:
ssh -i ~/.ssh/id_ed25519_github your-username@your-homelab-ip

# Git está configurado globalmente para usar esta clave:
git config --global core.sshCommand "ssh -i ~/.ssh/id_ed25519_github -o IdentitiesOnly=yes"
```

### 8.4 Deploy manual rápido
```bash
# Deploy manual directo al homelab:
ssh -i ~/.ssh/id_ed25519_github your-username@your-homelab-ip \
  "cd your-home-path/yukiko && git pull origin main && npm install && pm2 restart all && pm2 save"

# O simplemente haz push a main y el CI/CD lo hace automáticamente via Tailscale
```

---

## 9. GitHub y CI/CD

### 9.1 Configurar el repositorio

```bash
cd ~/yukiko
git init
git remote add origin git@github.com:joseangelalejo/yukiko.git

# Primera subida
git add .
git commit -m "🌨️ Initial commit — Yukiko Bot"
git push -u origin main
```

### 9.2 GitHub Secrets para CI/CD

En GitHub → Tu repo → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `VERCEL_TOKEN` | Token de Vercel (Account Settings → Tokens) |
| `VERCEL_PROJECT_ID` | ID del proyecto en Vercel |
| `VERCEL_ORG_ID` | ID de la organización en Vercel |
| `HOMELAB_HOST` | IP Tailscale del homelab (`100.66.214.108`) |
| `HOMELAB_USER` | Usuario SSH (`dockerja`) |
| `HOMELAB_KEY` | Contenido de `~/.ssh/id_ed25519_github` (privada) |
| `HOMELAB_PATH` | Ruta del bot (`your-home-path/yukiko`) |
| `TAILSCALE_AUTHKEY` | Auth key de Tailscale (ephemeral) |
| `DATABASE_URL` | Connection string de Neon (para cleanup diario) |

### 9.3 Flujo CI/CD automático

Al hacer `git push origin main`:

1. GitHub Actions ejecuta `pre-push.sh` (lint, types, seguridad)
2. Si pasa, despliega `web/` en Vercel automáticamente
3. Conecta al VPS via SSH y hace `git pull + pm2 restart`
4. El bot se actualiza en segundos sin downtime notable

---

## 10. Monitorización

La monitorización básica se hace con los scripts incluidos:
```bash
# Health check completo (sistema, bots, APIs, BD):
bash scripts/health-check.sh

# Monitorización continua (refresca cada 30s):
watch -n 30 bash scripts/health-check.sh

# Logs en tiempo real:
pm2 logs

# Estado de los procesos:
pm2 list
```

Para monitorización avanzada con Grafana/Prometheus, es necesario configurar un stack separado (no incluido en este proyecto por defecto).
---

## 11. Solución de problemas comunes

### WhatsApp: QR no aparece o no escanea

```bash
# Eliminar sesión corrupta y reiniciar:
rm -rf sessions/whatsapp/
bash scripts/dev.sh --platform whatsapp
# Escanea el nuevo QR
```

### WhatsApp: Se desconecta constantemente

```bash
# El número puede estar siendo usado en otro dispositivo. Cierra otras sesiones:
# WhatsApp móvil → ⋮ → Dispositivos vinculados → Cerrar todas las sesiones

# Si persiste, usa un número dedicado solo para el bot
```

### Discord: Slash commands no aparecen

```bash
# Los comandos globales tardan hasta 1 hora en propagarse.
# Para dev, usa DISCORD_GUILD_ID para comandos instantáneos en tu servidor.

# Forzar re-registro:
node -e "
  const { REST, Routes } = require('discord.js');
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: [] })
    .then(() => console.log('Comandos eliminados'))
    .then(() => process.exit(0));
"
# Luego reinicia el bot para registrarlos de nuevo
```

### Telegram: El bot no responde en grupos

```bash
# Verifica que la privacidad del bot esté deshabilitada:
# BotFather → /setprivacy → @TuBot → DISABLE

# Verifica que el bot sea administrador del grupo (para algunas funciones)
```

### Neon DB: connection timeout

```bash
# Neon pone en pausa proyectos inactivos (tier gratuito).
# La primera consulta puede tardar 2-3 segundos mientras "despierta".
# Solución: añade keep-alive queries cada 5 minutos en producción

# O upgradea a Neon Pro para conexiones siempre activas
```

### Error: EADDRINUSE (puerto ya en uso)

```bash
# Ver qué proceso usa el puerto:
ss -tulpn | grep :3000

# Matar el proceso:
fuser -k 3000/tcp
```

### TypeScript errors tras actualizar deps

```bash
bash scripts/reset-dev.sh
# O manualmente:
rm -rf node_modules dist .next
npm install
npx tsc --noEmit
```

### Panel de admin vacío / sin datos

```bash
# Verificar que las migraciones están aplicadas:
npx drizzle-kit push

# Verificar conexión a BD:
bash scripts/health-check.sh
```

### Logs de PM2 llenos

```bash
pm2 flush          # Limpiar todos los logs
bash scripts/clean-logs.sh  # Limpiar logs del proyecto
pm2 install pm2-logrotate  # Rotación automática de logs
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 📋 Checklist de puesta en marcha

```
□ 1. bash scripts/setup.sh       — Setup inicial Arch
□ 2. nano .env                   — Rellenar tokens
□ 3. npx drizzle-kit push        — Crear tablas en Neon
□ 4. Discord: crear app + bot    — discord.com/developers
□ 5. Telegram: /newbot           — BotFather
□ 6. WhatsApp: escanear QR       — bash scripts/dev.sh -p whatsapp
□ 7. bash scripts/dev.sh         — Probar todo en local
□ 8. bash scripts/health-check.sh— Verificar estado
□ 9. git push origin main        — Deploy automático
□ 10. Vercel: conectar Neon      — vercel.com/integrations/neon
□ 11. Homelab: pm2 start         — Bots 24/7 via Tailscale
□ 12. /admin/verifications       — Panel de aprobaciones +18 listo
```

---

*Yukiko Bot — Creado por [joseangelalejo](https://github.com/joseangelalejo)*
