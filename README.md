# Huellas franciscanas · Tierra Santa en 3D

Nueva versión de la web, rediseñada como una experiencia 3D:

- **Maqueta 3D en relieve** de Tierra Santa (three.js) construida sobre el mapa físico de la web original,
  con agua animada, faros dorados en los santuarios y la ruta del recorrido dibujándose al desplazarse.
- **Recorrido narrativo**: Belén → Nazaret → Jordán → Galilea → Jerusalén. La cámara vuela a cada lugar.
- **Carrusel 3D** con los 20 santuarios en vídeo; cada uno abre su vídeo, explicación y reflexión.
- **Línea del tiempo en profundidad** con las seis etapas históricas y la película de entrada.
- **Presencia franciscana** y **torre de portadas** con los 503 números de Revista Tierra Santa por décadas.
- **Modo exploración**: girar, acercar y elegir cualquier lugar de la maqueta.

## Publicar en GitHub Pages

1. Descomprime el ZIP y sube **el contenido de la carpeta** a un repositorio (con GitHub Desktop, como la versión anterior).
   `index.html` debe quedar en la raíz, junto a `css`, `js`, `data`, `vendor`, `assets` y `assets3d`.
2. En el repositorio: **Settings → Pages → Deploy from a branch → main → /(root) → Save**.

Si prefieres conservar la web anterior, crea un repositorio nuevo (por ejemplo `huellas-franciscanas-3d`).

## Probar en local

```powershell
py -m http.server 8000
```

Abre `http://localhost:8000`. No funciona con doble clic sobre `index.html` (los módulos JavaScript necesitan un servidor).

## Estructura

- `index.html`: página única.
- `css/estilo.css`: diseño (escritorio y móvil).
- `js/maqueta.js`: escena 3D (relieve, luces, faros, ruta, cámara).
- `js/app.js`: recorrido por scroll, carrusel, línea del tiempo, torre de portadas, ventanas y modo exploración.
- `data/contenido.js`: textos y datos extraídos de la web original (santuarios, reflexiones, etapas, catálogo de la revista).
- `assets3d/`: textura y mapa de alturas de la maqueta.
- `assets/`: vídeos, portadas e imágenes de la web original (mismos nombres).
- `vendor/`: three.js 0.169 (licencia MIT), incluido localmente.

## Notas

- Las fuentes tipográficas se cargan de Google Fonts; sin conexión se usan fuentes del sistema.
- El relieve es una **aproximación ilustrativa**: las altitudes se han modelado a partir del mapa físico, no de un modelo digital de elevación.
- Navegadores sin WebGL ven una imagen fija y el resto del contenido funciona igual.
- Se mantienen los créditos fotográficos (`assets/monumentos/creditos.html`) y los avisos de imágenes creadas con IA.

## Versión para Vercel (gratis)

Esta carpeta es la versión ligera (unos 85 MB), pensada para el plan gratuito Hobby de Vercel.
Los vídeos y las portadas están comprimidos para no superar su límite de 100 MB.

- Contraseña de entrada: **1234** (se recuerda en cada dispositivo después de entrar).
- La contraseña es una cortina de privacidad sencilla, no una protección real:
  quien sepa de informática podría saltársela. No subas nada confidencial.
- La web no aparece en buscadores (`noindex`).
