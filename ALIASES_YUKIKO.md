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

| Comando             | Proceso         |
|---------------------|-----------------|
| `yk-start-discord`  | yukiko-discord  |
| `yk-start-telegram` | yukiko-telegram |
| `yk-start-mobile`   | yukiko-mobile   |
| `yk-start-all`      | discord + telegram + mobile |

---

## 🛑 Parar (temporal)

> No afecta al arranque automático en el próximo reinicio del sistema.

| Comando            | Proceso         |
|--------------------|-----------------|
| `yk-stop-discord`  | yukiko-discord  |
| `yk-stop-telegram` | yukiko-telegram |
| `yk-stop-mobile`   | yukiko-mobile   |
| `yk-stop-all`      | discord + telegram + mobile |

---

## 🚫 Deshabilitar (permanente)

> Para el proceso **y** desactiva el arranque automático (`pm2 save`).

| Comando               | Proceso         |
|-----------------------|-----------------|
| `yk-disable-discord`  | yukiko-discord  |
| `yk-disable-telegram` | yukiko-telegram |
| `yk-disable-mobile`   | yukiko-mobile   |
| `yk-disable-all`      | discord + telegram + mobile |

---

## 🔄 Reiniciar

> No toca el arranque automático.

| Comando               | Proceso         |
|-----------------------|-----------------|
| `yk-restart-discord`  | yukiko-discord  |
| `yk-restart-telegram` | yukiko-telegram |
| `yk-restart-mobile`   | yukiko-mobile   |
| `yk-restart-all`      | discord + telegram + mobile |
| `yk-restart-agent`    | yukiko-agent    |
| `yk-restart-web`      | yukiko-web      |

---

## 📋 Logs

> Últimas 50 líneas por proceso.

| Comando            | Proceso                           |
|--------------------|-----------------------------------|
| `yk-logs`          | Todos en tiempo real (`pm2 logs`) |
| `yk-logs-discord`  | yukiko-discord                    |
| `yk-logs-telegram` | yukiko-telegram                   |
| `yk-logs-mobile`   | yukiko-mobile                     |
| `yk-logs-agent`    | yukiko-agent                      |
| `yk-logs-web`      | yukiko-web                        |

---

## 🚀 Vercel

| Comando        | Descripción                                  |
|----------------|----------------------------------------------|
| `yk-deploy`    | Despliega el web panel en Vercel (producción)|
| `yk-undeploy`  | Elimina todos los deployments de Vercel      |

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
| 2  | yukiko-agent    | 🟢 online |
| 3  | yukiko-web      | 🟢 online |
| 4  | yukiko-mobile   | 🟢 online |

---

> *Actualizado: 25 de marzo de 2026*
