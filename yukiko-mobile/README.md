# Yukiko Mobile

App Android para chatear con el bot Yukiko, construida con React Native (Expo).

## Estructura

```
yukiko-mobile/
├── platforms/mobile/src/index.ts   ← Backend WebSocket (añadir al monorepo Yukiko)
├── mobile-app/                     ← App React Native
│   ├── App.tsx                     ← App principal
│   ├── app.json                    ← Config Expo
│   ├── eas.json                    ← Config builds
│   └── package.json
└── README.md
```

---

## 1. Backend — Servidor WebSocket

### Añadir al monorepo de Yukiko

```bash
# Copiar la plataforma mobile al monorepo
cp -r platforms/mobile /ruta/a/yukiko/platforms/

# Instalar dependencia ws
cd /ruta/a/yukiko && npm install ws @types/ws
```

### Añadir variable de entorno

```env
MOBILE_WS_PORT=3002
```

### Añadir a ecosystem.config.cjs

```js
{
  name: 'yukiko-mobile',
  script: './node_modules/.bin/tsx',
  args: '--env-file=.env platforms/mobile/src/index.ts',
  cwd: 'your-home-path/yukiko',
  watch: false,
  env: { NODE_ENV: 'production', PLATFORM: 'mobile' },
  error_file: './logs/mobile-error.log',
  out_file: './logs/mobile-out.log',
  restart_delay: 5000,
  max_restarts: 10,
},
```

### Añadir 'mobile' al tipo Platform en core/src/types.ts

```ts
export type Platform = 'discord' | 'telegram' | 'whatsapp' | 'mobile';
```

### Arrancar

```bash
pm2 start ecosystem.config.cjs --only yukiko-mobile
```

---

## 2. App React Native

### Requisitos

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (para builds): `npm install -g eas-cli`
- Cuenta en [expo.dev](https://expo.dev)

### Instalación

```bash
cd mobile-app
npm install
```

### Configurar la IP del servidor

En `App.tsx`, cambia la línea:

```ts
const WS_URL = 'ws://YOUR_HOMELAB_IP:3002';
```

Por la IP de tu homelab, por ejemplo:
```ts
const WS_URL = 'ws://your-homelab-ip:3002';
```

> Para acceso externo, puedes usar Tailscale o exponer el puerto con nginx + SSL.

### Desarrollo (Expo Go)

```bash
npm start
# Escanea el QR con Expo Go en tu Android
```

### Build APK (para instalar en Android)

```bash
# Login en Expo
eas login

# Crear proyecto en expo.dev y obtener projectId
eas build:configure

# Build APK (se puede instalar directamente)
eas build --platform android --profile preview
```

El APK se descarga desde el dashboard de Expo.

---

## Funcionalidades

- 💬 Chat en tiempo real via WebSocket
- 🔐 Autenticación persistente (token local)
- 💰 Economía: /balance, /daily, /transfer, /shop, /buy, /inventory
- 🤖 IA: /ask, /imagine, /rp, /translate
- 🎭 Roleplay: /hug, /kiss, /pat, /slap, /dance...
- 🔗 Link: /link, /accounts, /unlink
- 📊 Moderación: /stats, /help
- ⚡ Comandos rápidos con botón /
- 🖼️ Imágenes y GIFs inline
- 📳 Haptics en mensajes
- 🔄 Reconexión automática

---

## Notas

- Los comandos +18 requieren verificación igual que en Discord/Telegram
- El token de usuario se genera automáticamente y se guarda en AsyncStorage
- La plataforma `mobile` comparte toda la lógica de módulos con Discord y Telegram
