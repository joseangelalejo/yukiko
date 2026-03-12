# 🎨 Prompt — Personaje Yukiko (logo anime neko)

## Para usar en: Midjourney / DALL-E 3 / Stable Diffusion / Adobe Firefly

---

### ✅ Prompt principal (inglés, mejor resultado)

```
cute anime neko girl chibi mascot, cat ears, short white-silver hair with pink highlights,
big expressive eyes with sparkles, kawaii style, wearing dark navy hoodie with pink cat logo,
soft smile, sitting pose with tail curling around, snowflake decorations around her,
flat 2D illustration, clean lineart, vibrant colors, pink and dark blue palette,
white background, sticker style, high quality, vector-like, no text
```

---

### 🎯 Variante para logo circular (tipo Discord avatar)

```
chibi anime neko girl mascot bust portrait, cat ears with pink inner, silver-white hair,
large shiny anime eyes, kawaii expression, dark navy circle background with subtle grid pattern,
pink accent colors, snowflake motifs, flat illustration, clean lineart, sticker art style,
centered composition, suitable for circular avatar crop, no text, white highlights
```

---

### 🎨 Paleta de colores a respetar

| Elemento          | Color                |
|-------------------|----------------------|
| Fondo principal   | `#0f1123` (navy dark)|
| Pelo              | Blanco plateado + mechas `#ff6b9d` |
| Orejas neko       | `#ff6b9d` rosa       |
| Ojos              | Rosa/lila brillante  |
| Ropa              | Dark navy + detalles pink |
| Acentos nieve     | `#67e8f9` cyan       |

---

### 📐 Especificaciones técnicas

- **Estilo**: Chibi / kawaii 2D flat (como Nekotina, HimeBot, Miku-style mascots)
- **Ratio**: 1:1 para logo (512x512 o 1024x1024)
- **Fondo**: Transparente o dark navy `#0f1123`
- **Sin texto** en la imagen (el nombre se añade por CSS/HTML)

---

### 🔧 Settings recomendados

**Midjourney:**
```
/imagine [prompt] --ar 1:1 --style raw --stylize 750 --v 6
```

**DALL-E 3 (ChatGPT):**
```
Genera exactamente esto: [prompt]
Estilo flat 2D illustration, chibi anime, kawaii mascot.
No añadas texto ni watermarks. Fondo transparente o dark navy.
```

**Stable Diffusion:**
```
Model: Anything V5 / CuteYukimix
Negative: realistic, 3d, photo, text, watermark, low quality
CFG: 7 | Steps: 28 | Sampler: DPM++ 2M Karras
```

---

### 📁 Nombres de archivo esperados (para reemplazar en el proyecto)

Una vez generada la imagen del personaje, exportar y renombrar así:

```
yukiko-logo-512.png    → 512x512px, fondo transparente o dark navy
yukiko-logo-256.png    → 256x256px
yukiko-logo-128.png    → 128x128px  (usado en nav, footer)
yukiko-favicon-64.png  → 64x64px
yukiko-favicon-32.png  → 32x32px
```

Reemplazar los archivos en `docs/assets/` y el proyecto los usará automáticamente.
El README y el HTML ya apuntan a esas rutas.
