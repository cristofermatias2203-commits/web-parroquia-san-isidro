# Web Parroquia San Isidro Labrador

Sitio web oficial de la **Parroquia San Isidro Labrador**, Maimón, Provincia Monseñor Nouel, República Dominicana.

## Estructura del proyecto

- `src/pages/index.astro` — página única.
- `src/layouts/BaseLayout.astro` y `src/components/` — cabecera, secciones, modales y pie.
- `src/styles/tokens.css` — paleta y tipografías institucionales.
- `src/styles/global.css` y `src/styles/site.css` — estilos base y de sección.
- `src/data/site.ts` — metadatos y URL canónica, usados por SEO y JSON-LD.
- `src/icons/generated.ts` y `public/icons/sprite.svg` — sprite de iconos auto-hospedado.
- `public/fonts/` — fuentes variables auto-hospedadas.
- `public/img/` — fotografías, logos, favicon e iconos PWA.
- `data/evangelio/` — lecturas de la Misa por mes (`YYYY-MM.json`), con `manifest.json` y
  `exceptions.json` como fuentes de verdad de la cobertura.
- `scripts/generate-gospel.mjs` — genera los archivos de `data/evangelio/`.
- `scripts/check-gospel-data.mjs` — valida esquema, fechas, manifest y excepciones (`bun run check:gospel-data`).

## Evangelio del día

El bloque del Evangelio no usa textos escritos a mano: carga el archivo JSON del mes en
curso (`data/evangelio/YYYY-MM.json`) y muestra automáticamente la lectura correspondiente
a la fecha actual, según la zona horaria de República Dominicana.

- Los textos provienen de [Breviarium Core](https://breviarium.es), una librería de código
  abierto (licencia MIT) con el calendario litúrgico y las lecturas completas en español.
- La cobertura local es de **2026 a 2040**: 5.441 días con Evangelio y **38 excepciones**
  documentadas en `data/evangelio/exceptions.json` (origen, diagnóstico y solución de cada
  una). El manifest es la fuente de verdad: `bun run check:gospel-data` falla si aparece
  un día nuevo sin datos o si el manifest deja de coincidir con los archivos.
- En la versión estática los meses se cargaban como scripts (`YYYY-MM.js`) para funcionar
  desde `file://`. La reescritura usa JSON validado, así que el sitio debe servirse por HTTP
  (`bun run dev`, `bun run preview` o GitHub Pages).
- En esos 38 días, y a partir del 1 de enero de 2041, no hay archivo local. El sitio intenta
  la [API de respaldo categpt.chat](https://categpt.chat/api/v1/feast), a la que envía solo
  la fecha y el locale `es`, y guarda el resultado en `localStorage`. Esa API solo responde
  para fechas cercanas, por lo que conviene ampliar el rango local antes de necesitarlas.
- Si no hay conexión y el día no está guardado, se muestra un aviso honesto en lugar de un
  texto inventado.
- El botón «Próximos Días» recorre los siete días siguientes y vuelve a «Evangelio de Hoy».
- Las lecturas completas (primera lectura, salmo y Evangelio) se muestran en bloques plegables.
  En español se toman de Evangelizo y, si no responde, se conservan las referencias locales.
  Evangelizo recibe la fecha y el idioma solicitado; no se envían datos personales.

El entorno de desarrollo se obtiene con `nix develop` (Bun, Node >= 22.23.4 y el resto de
herramientas). `bun.lock` es el lockfile canónico; `breviarium` y `he` son dependencias de
desarrollo que solo se necesitan para regenerar los datos, no para servir el sitio.

Para regenerar o ampliar los datos (el rango se fusiona con el manifest existente):

```bash
nix develop --command bun install
nix develop --command bun run generate:gospel -- --from=2026 --to=2040
nix develop --command bun run generate:gospel -- --from 2041 --to 2045
```

La generación usa fechas UTC, es independiente de la zona horaria local y falla antes de
escribir nada si aparece un día sin datos no documentado (por ejemplo, los tres huecos que
Breviarium ya tiene en 2041). En ese caso, el error enumera las fechas: corregí la fuente o
añadí una excepción justificada a `exceptions.json` antes de publicar. Los meses se publican
en `public/data/evangelio/` al ejecutar `bun run build:assets`.

## Idiomas

El selector de la barra superior ofrece nueve idiomas: español, italiano, inglés, francés,
alemán, portugués, polaco, árabe y chino. La preferencia se guarda en `localStorage`
(`parroquia:idioma`); si no hay una guardada, se detecta el idioma del navegador.

- La interfaz, los formularios, los avisos y los metadatos (`<title>` y descripción) se
  traducen con los diccionarios de `i18n.js`. Los textos en español son la clave de cada
  traducción.
- El árabe activa automáticamente la dirección de lectura de derecha a izquierda (`dir="rtl"`)
  y se aplican tipografías adecuadas para árabe y chino.
- Las lecturas bíblicas de los ocho idiomas distintos del español se obtienen de
  [Evangelizo Feed v2](https://feed.evangelizo.org/v2/reader.php) y se guardan en
  `localStorage` (`parroquia:evangelio:v2:{idioma}:{fecha}`). El español sigue usando los
  archivos locales como fuente principal.
- Si Evangelizo no está disponible, se muestra el texto en español con un aviso en el idioma
  elegido; el sitio nunca inventa una traducción.
- Los valores enviados por los formularios se mantienen en español para que el despacho
  parroquial reciba los correos en un formato uniforme.

## Accesibilidad y navegación

- Enlace “Saltar al contenido principal”, foco visible y soporte para movimiento reducido.
- Menú móvil y modales operables con teclado (Escape, tabulación contenida y retorno del foco).
- Navegación con la sección activa resaltada automáticamente.

## Formularios

Los formularios de contacto y de intenciones de misa preparan un correo dirigido al despacho parroquial con los datos ingresados. Al enviarlos, se abre la aplicación de correo del usuario para completar el envío; el sitio no almacena datos en un servidor.

## Navegadores integrados

El sitio se comparte con frecuencia por WhatsApp, Facebook o Instagram, cuyos navegadores
integrados se bloquean con desplazamientos suaves de miles de píxeles y dejan una página en
blanco al abrir enlaces `mailto:`. Por eso:

- En esos navegadores los enlaces internos saltan de inmediato, sin animación.
- El correo se abre en la composición web de Gmail en lugar de `mailto:`.

## Ejecutar localmente

El sitio se genera con Astro; ya no se puede abrir `index.html` desde disco:

```bash
bun install
bun run dev          # http://localhost:4321
bun run build        # genera el sitio estático en dist/
```

`bun run build:assets` regenera las fuentes y el sprite de iconos; `dev` y `build` lo ejecutan
automáticamente.

### Desarrollo con Nix

El repositorio incluye un `flake.nix` con un entorno reproducible. En NixOS, con Flakes
habilitados:

```bash
nix develop          # entra al shell con bun, node, python, git, gh, jq y ripgrep
bun install          # instala las dependencias
nix run .#dev        # astro dev en http://localhost:4321
nix run .#generate -- --from=2026 --to=2040
```

También puedes usar direnv: permite `.envrc` una vez con `direnv allow` y el entorno se
activará automáticamente al entrar al directorio.

## Publicación

El sitio es estático (HTML, CSS y JavaScript), por lo que puede publicarse en cualquier servicio de hosting estático, por ejemplo GitHub Pages, Netlify o Vercel.
