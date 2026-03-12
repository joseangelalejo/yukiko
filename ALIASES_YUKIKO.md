# 🌨️ Yukiko — Aliases y configuración del servidor

**Usuario:** `dockerja`  
**Servidor:** `dockerja@dockerja`  
**Archivos:** `~/.bash_aliases` (aliases) + `~/.bashrc` (funciones)

---

## 📊 Estado

| Comando     | Descripción                         |
|-------------|-------------------------------------|
| `yk-status` | `pm2 list` — ver todos los procesos |
| `yk-help`   | Muestra este menú en terminal       |

---

## ▶️ Arrancar

> Definidas como **funciones** en `~/.bashrc`. Arrancan el proceso y preguntan si activar arranque automático.

| Comando             | Proceso                       |
|---------------------|-------------------------------|
| `yk-start-discord`  | yukiko-discord                |
| `yk-start-telegram` | yukiko-telegram               |
| `yk-start-whatsapp` | yukiko-whatsapp               |
| `yk-start-all`      | discord + telegram + whatsapp |

---

## 🛑 Parar (temporal)

> No afecta al arranque automático en el próximo reinicio del sistema.

| Comando            | Proceso                       |
|--------------------|-------------------------------|
| `yk-stop-discord`  | yukiko-discord                |
| `yk-stop-telegram` | yukiko-telegram               |
| `yk-stop-whatsapp` | yukiko-whatsapp               |
| `yk-stop-all`      | discord + telegram + whatsapp |

---

## 🚫 Deshabilitar (permanente)

> Para el proceso **y** desactiva el arranque automático (`pm2 save`).

| Comando               | Proceso                       |
|-----------------------|-------------------------------|
| `yk-disable-discord`  | yukiko-discord                |
| `yk-disable-telegram` | yukiko-telegram               |
| `yk-disable-whatsapp` | yukiko-whatsapp               |
| `yk-disable-all`      | discord + telegram + whatsapp |

---

## 🔄 Reiniciar

> No toca el arranque automático.

| Comando               | Proceso                       |
|-----------------------|-------------------------------|
| `yk-restart-discord`  | yukiko-discord                |
| `yk-restart-telegram` | yukiko-telegram               |
| `yk-restart-whatsapp` | yukiko-whatsapp               |
| `yk-restart-all`      | discord + telegram + whatsapp |
| `yk-restart-agent`    | yukiko-agent                  |
| `yk-restart-web`      | yukiko-web                    |

---

## 📋 Logs

> Últimas 50 líneas por proceso.

| Comando            | Proceso                           |
|--------------------|-----------------------------------|
| `yk-logs`          | Todos en tiempo real (`pm2 logs`) |
| `yk-logs-discord`  | yukiko-discord                    |
| `yk-logs-telegram` | yukiko-telegram                   |
| `yk-logs-whatsapp` | yukiko-whatsapp                   |
| `yk-logs-agent`    | yukiko-agent                      |
| `yk-logs-web`      | yukiko-web                        |

---

## 🔧 GitHub Actions

| Comando            | Descripción                                          |
|--------------------|------------------------------------------------------|
| `yk-actions`       | `gh run list --repo joseangelalejo/yukiko --limit 5` |
| `yk-actions-watch` | `gh run watch --repo joseangelalejo/yukiko`          |

---

## 🎮 Minecraft (`.bashrc`)

| Comando          | Descripción                                     |
|------------------|-------------------------------------------------|
| `mc <cmd>`       | mcrcon forge — enviar comando al servidor       |
| `mcdown`         | Avisar, guardar y bajar servidor forge          |
| `mcrestart`      | Reiniciar servidor forge                        |
| `mcpaper <cmd>`  | mcrcon paper — enviar comando al servidor paper |
| `mcpaperdown`    | Avisar, guardar y bajar servidor paper          |
| `mcpaperrestart` | Reiniciar servidor paper                        |

---

## 🗂️ Procesos PM2 activos

| id | nombre          | estado    |
|----|-----------------|-----------|
| 0  | yukiko-discord  | 🟢 online |
| 1  | yukiko-telegram | 🟢 online |
| 2  | yukiko-whatsapp | 🟢 online |
| 3  | yukiko-agent    | 🟢 online |
| 4  | yukiko-web      | 🟢 online |

---

> *Actualizado: 12 de marzo de 2026*
