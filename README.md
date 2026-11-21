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
- `data/evangelio/` — lecturas de la Misa por mes (`YYYY-MM.js`), pendientes de migrar a JSON en F4.
- `scripts/generate-gospel.mjs` — genera los archivos de `data/evangelio/`.

## Evangelio del día

El bloque del Evangelio no usa textos escritos a mano: carga el archivo del mes en curso
(`data/evangelio/YYYY-MM.js`) y muestra automáticamente la lectura correspondiente a la
fecha actual, según la zona horaria de República Dominicana.

- Los textos provienen de [Breviarium Core](https://breviarium.es), una librería de código
  abierto (licencia MIT) con el calendario litúrgico y las lecturas completas en español.
- El calendario generado cubre de 2026 a 2040; no hace falta editar nada cada día.
- En la versión estática los meses se cargaban como scripts (`YYYY-MM.js`) para funcionar
  desde `file://`; en la reescritura se migrarán a JSON validado (F4).
- Si un día no estuviera en los archivos locales, el sitio consulta una API litúrgica de
  respaldo y guarda el resultado en `localStorage` para consultas posteriores sin conexión.
- Si no hay conexión y el día no está guardado, se muestra un aviso honesto en lugar de un
  texto inventado.
- El botón «Próximos Días» recorre los siete días siguientes y vuelve a «Evangelio de Hoy».
- Las lecturas completas (primera lectura, salmo y Evangelio) se muestran en bloques plegables.
  En español se toman de Evangelizo y, si no responde, se conservan las referencias locales.

Para regenerar los datos (por ejemplo, para ampliar los años cubiertos):

```bash
bun install
bun run generate:gospel -- --from=2026 --to=2040
```

Los archivos se sobrescriben en `data/evangelio/` y deben publicarse junto con el sitio.

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
