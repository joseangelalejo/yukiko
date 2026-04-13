# 🔧 Troubleshooting — Yukiko Bot

Guía completa de resolución de problemas comunes en Yukiko.

---

## 📋 Tabla de contenidos

- [🔧 Troubleshooting — Yukiko Bot](#-troubleshooting--yukiko-bot)
  - [📋 Tabla de contenidos](#-tabla-de-contenidos)
  - [🌐 Web Chat](#-web-chat)
    - [❌ Error: "❌ Error del agente"](#-error--error-del-agente)
    - [❌ Error: "Timeout — el homelab tardó demasiado"](#-error-timeout--el-homelab-tardó-demasiado)
    - [❌ Error SSL: "Firefox detectó un problema de seguridad"](#-error-ssl-firefox-detectó-un-problema-de-seguridad)
    - [❌ Chat no envía mensajes](#-chat-no-envía-mensajes)
  - [🤖 Discord Bot](#-discord-bot)
    - [❌ Bot offline](#-bot-offline)
    - [❌ Slash commands no aparecen](#-slash-commands-no-aparecen)
    - [❌ Bot responde lentamente a comandos](#-bot-responde-lentamente-a-comandos)
  - [📱 Telegram Bot](#-telegram-bot)
    - [❌ Bot no responde en Telegram](#-bot-no-responde-en-telegram)
    - [⚠️ Advertencia: "punycode is deprecated"](#️-advertencia-punycode-is-deprecated)
  - [🏠 Homelab](#-homelab)
    - [❌ Homelab no responde desde internet](#-homelab-no-responde-desde-internet)
    - [❌ PM2 se reinicia constantemente](#-pm2-se-reinicia-constantemente)
    - [❌ Conexión a Neon (PostgreSQL) falla](#-conexión-a-neon-postgresql-falla)
  - [🗄️ Base de datos](#️-base-de-datos)
    - [❌ Error: "Error del agente" + logs muestren queries fallidas](#-error-error-del-agente--logs-muestren-queries-fallidas)
    - [⚠️ Discos / Backups](#️-discos--backups)
  - [🔐 Certificados SSL](#-certificados-ssl)
    - [❌ Firefox: "Certificado no válido para your-app-domain.com"](#-firefox-certificado-no-válido-para-yukikominiserveronline)
  - [🔄 Re-sincronizar después de cambios](#-re-sincronizar-después-de-cambios)
  - [📊 Logs útiles](#-logs-útiles)
    - [Ver logs en tiempo real](#ver-logs-en-tiempo-real)
    - [Exportar logs](#exportar-logs)
  - [🆘 Checklist: "Mi bot no funciona"](#-checklist-mi-bot-no-funciona)
  - [📞 Contacto](#-contacto)

---

## 🌐 Web Chat

### ❌ Error: "❌ Error del agente"

**Causa más común:** El agent no es alcanzable desde Vercel.

**Solución:**

1. Verifica que Tailscale Funnel está activo en el homelab:

   ```bash
   tailscale funnel status
   ```

2. Debería mostrar:

   ```
   https://your-homelab-domain.ts.net (Funnel on)
   |-- / proxy http://127.0.0.1:3001
   ```

3. Si no está activo, reinicialo:

   ```bash
   tailscale funnel reset
   tailscale funnel --bg localhost:3001
   ```

4. Verifica que Vercel tiene la URL correcta:
   - Ve a `vercel.com` → Proyecto **yukiko** → Settings → Environment Variables
   - `HOMELAB_AGENT_URL` debe ser: `https://your-homelab-domain.ts.net`

---

### ❌ Error: "Timeout — el homelab tardó demasiado"

**Causa:** El agent tarda >30 segundos en responder (timeout en Vercel).

**Soluciones:**

1. Verifica que el agent está corriendo:

   ```bash
   yk-status | grep yukiko-agent
   ```

2. Revisa los logs:

   ```bash
   yk-logs yukiko-agent
   ```

3. Si ve errores de Ollama, reinicia:

   ```bash
   systemctl restart ollama
   pm2 restart yukiko-agent
   ```

4. Si los prompts son muy largos, reduce `max_tokens` en `homelab-agent/agent.ts`

---

### ❌ Error SSL: "Firefox detectó un problema de seguridad"

**Causa:** El certificado SSL ha expirado o no es válido.

**Solución:** No es necesario si usas Tailscale Funnel. Si aún ves este error:

1. Limpia la caché del navegador (Ctrl+Shift+Supr)
2. Accede de nuevo a `https://your-app-domain.com/chat`

Si persiste, el certificado de `miniserver.online` necesita actualización (contacta con tu hermano).

---

### ❌ Chat no envía mensajes

**Causa:** CORS, variable de entorno faltante o API route incorrecta.

**Solución:**

1. Abre DevTools (F12) → Console → verifica si hay errores CORS
2. Comprueba `ADMIN_SECRET` en Vercel:

   ```bash
   # Debe ser el mismo en ambos lados
   # .env (homelab) debe coincidir con Vercel Dashboard
   ```

3. Si sale `401 Unauthorized`, regenera `ADMIN_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

4. Actualiza en `.env` del homelab Y en Vercel Dashboard.

---

## 🤖 Discord Bot

### ❌ Bot offline

**Síntoma:** El bot no aparece en Discord con status "Online"

**Solución:**

1. Verifica que está corriendo:

   ```bash
   yk-status | grep yukiko-discord
   ```

2. Si está parado, reinicia:

   ```bash
   pm2 restart yukiko-discord
   ```

3. Revisa logs:

   ```bash
   yk-logs yukiko-discord
   ```

4. Si sale `ENOTFOUND`, comprueba que `DISCORD_TOKEN` es válido en `.env`

---

### ❌ Slash commands no aparecen

**Solución:**

1. Refresca Discord (Ctrl+R)
2. Si sigue sin aparecer, re-registra los comandos:

   ```bash
   pm2 restart yukiko-discord
   ```

3. Si el bot tiene permisos, comprueba `DISCORD_CLIENT_ID` en `.env`

---

### ❌ Bot responde lentamente a comandos

**Causa:** `wakeHomelabIfNeeded()` intenta despertar el homelab si está apagado.

**Solución:**

- Primera ejecución será lenta (~5 segundos)
- Las siguientes serán normales
- Si persiste, verifica que el homelab está completamente online:

  ```bash
  ping 100.66.214.108
  ```

---

## 📱 Telegram Bot

### ❌ Bot no responde en Telegram

**Solución:**

1. Verifica que Telegram está corriendo:

   ```bash
   yk-status | grep yukiko-telegram
   ```

2. Revisa logs:

   ```bash
   yk-logs yukiko-telegram
   ```

3. Comprueba `TELEGRAM_BOT_TOKEN` en `.env` (obtén uno nuevo en [@BotFather](https://t.me/botfather))

4. Reinicia Telegram:

   ```bash
   pm2 restart yukiko-telegram
   ```

---

### ⚠️ Advertencia: "punycode is deprecated"

**Causa:** Node.js 20+ deprecó módulo `punycode`

**No es crítico** — el bot sigue funcionando. Se eliminará con Node.js 22.

---

## 🏠 Homelab

### ❌ Homelab no responde desde internet

**Solución:**

1. Verifica que Tailscale Funnel está activo:

   ```bash
   tailscale funnel status
   ```

2. Testea conexión local primero:

   ```bash
   curl http://localhost:3001/health
   ```

3. Testea Funnel:

   ```bash
   curl https://your-homelab-domain.ts.net/health
   ```

4. Si Funnel no responde, reinicia:

   ```bash
   tailscale restart
   tailscale funnel --bg localhost:3001
   ```

---

### ❌ PM2 se reinicia constantemente

**Causa común:** Memoria insuficiente

**Solución:**

1. Verifica RAM disponible:

   ```bash
   free -h
   ```

2. Revisa proceso más pesado:

   ```bash
   pm2 monit
   ```

3. Detén servicios no esenciales:

   ```bash
   pm2 stop <nombre_proceso>
   ```

---

### ❌ Conexión a Neon (PostgreSQL) falla

**Solución:**

1. Verifica `DATABASE_URL` en `.env`:

   ```bash
   grep DATABASE_URL .env
   ```

2. Testea conexión:

   ```bash
   psql "$DATABASE_URL"
   ```

3. Si falla, obtén URL nueva de [Neon Dashboard](https://console.neon.tech)

4. Reinicia web para que reconozca cambio:

   ```bash
   pm2 restart yukiko-web
   ```

---

## 🗄️ Base de datos

### ❌ Error: "Error del agente" + logs muestren queries fallidas

**Causa:** Tabla no existe o schema está desfasado

**Solución:**

1. Verifica schema:

   ```bash
   npx drizzle-kit introspect
   ```

2. Si hace falta sincronizar:

   ```bash
   npx drizzle-kit push
   ```

3. Reinicia servicios:

   ```bash
   pm2 restart all
   ```

---

### ⚠️ Discos / Backups

**Backup automático:**

Si quieres backups automáticos de Neon:

```bash
# Desde Neon Dashboard
Settings → Backups → Enable automated backups
```

---

## 🔐 Certificados SSL

### ❌ Firefox: "Certificado no válido para your-app-domain.com"

**Causa:** El certificado solo cubre `*.juanje.net`, no `miniserver.online`

**Soluciones:**

- **Opción 1 (Recomendada): Usar Tailscale Funnel**
  - El certificado de Tailscale es válido y se auto-renueva
  - Ya está configurado (`https://your-homelab-domain.ts.net`)
  - No requiere acción adicional

- **Opción 2: Solicitar a tu hermano**
  - El certificado necesita incluir `your-app-domain.com`
  - Comando (en el servidor):

    ```bash
    certbot expand -d your-app-domain.com
    ```

---

## 🔄 Re-sincronizar después de cambios

Después de cambios en `.env` o variables en Vercel:

```bash
# Homelab
pm2 restart all

# Vercel (manual)
# Ve a vercel.com → Deployments → Redeploy
```

---

## 📊 Logs útiles

### Ver logs en tiempo real

```bash
# Todos los bots
yk-logs

# Un bot específico
yk-logs yukiko-agent

# Últimas 100 líneas
yk-logs --lines 100
```

### Exportar logs

```bash
pm2 save-logs yukiko-discord > discord-logs.txt
```

---

## 🆘 Checklist: "Mi bot no funciona"

- [ ] ¿`pm2 status` queda todo en rojo? → `pm2 restart all`
- [ ] ¿Web chat devuelve error? → Verifica `HOMELAB_AGENT_URL` en Vercel
- [ ] ¿Discord offline? → Verifica `DISCORD_TOKEN` en `.env`
- [ ] ¿Lento respondiendo? → Verifica Ollama: `systemctl status ollama`
- [ ] ¿Base de datos? → Verifica `DATABASE_URL` y `npx drizzle-kit push`

---

## 📞 Contacto

Si el problema persiste:

1. Captura logs: `pm2 logs > crash.txt`
2. Abre un [issue en GitHub](https://github.com/joseangelalejo/yukiko/issues)
3. Incluye:
   - Logs completos
   - Steps para reproducir
   - Sistema operativo y versiones (`pm2 -v`, `node -v`)

---

> *Última actualización: 13 de abril de 2026*
