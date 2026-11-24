# iPhone 16 Pro Max · Por dentro

Video animado (1920×1080, 30 fps, ~2 min, en español) que desarma un iPhone 16 Pro Max
en una vista explosionada 3D y explica cada componente:

1. Cristal trasero
2. MagSafe (imanes + bobina de cobre)
3. Módulo de cámaras (Fusion 48 MP, ultra gran angular 48 MP, teleobjetivo 5x, LiDAR)
4. Placa lógica tipo sándwich (A18 Pro, NAND, módem Qualcomm SDX71M, Wi‑Fi 7)
5. Batería (≈ 4 685 mAh)
6. Taptic Engine
7. Altavoz, micrófono y puerto USB‑C (USB 3)
8. Control de Cámara (zafiro, sensor capacitivo, sensor de fuerza, motor háptico)
9. TrueDepth / Face ID
10. Chasis de titanio con subestructura de aluminio
11. Pantalla Super Retina XDR de 6.9″

Es una **ilustración esquemática**: posiciones, formas y tamaños son aproximados.
Las cifras vienen de las especificaciones técnicas de Apple y del desmontaje de iFixit (2024).

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `iphone16-pro-max-por-dentro.mp4` | El video final |
| `scene.js` | Escena 3D (Three.js): geometría de cada pieza, texturas, línea de tiempo, cámara |
| `content.js` | Todos los textos de las tarjetas y etiquetas |
| `index.html` | Capa de títulos, tarjetas y etiquetas sobre el 3D |
| `render.js` | Renderiza cuadro por cuadro en Chromium sin interfaz y codifica con ffmpeg |
| `audio.py` | Música ambiental y efectos sintetizados, sincronizados con la animación |

## Volver a generarlo

Requiere Node 18+, ffmpeg, Python 3 con numpy y Playwright con Chromium.

```bash
npm install
node render.js preview 18 33 60          # cuadros sueltos en ./preview para revisar
node render.js video 0 30 out/seg_a.mp4   # segmentos (se pueden correr en paralelo)
node render.js video 30 60 out/seg_b.mp4
node render.js video 60 90 out/seg_c.mp4
node render.js video 90 999 out/seg_d.mp4
python3 audio.py 119.2 out/audio.wav
printf "file 'seg_a.mp4'\nfile 'seg_b.mp4'\nfile 'seg_c.mp4'\nfile 'seg_d.mp4'\n" > out/list.txt
ffmpeg -f concat -safe 0 -i out/list.txt -i out/audio.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 -movflags +faststart -shortest iphone16-pro-max-por-dentro.mp4
```

Para cambiar textos, edita `content.js`; para ajustar tiempos, la línea de tiempo está al final de `scene.js`.
