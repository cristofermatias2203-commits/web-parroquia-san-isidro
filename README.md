# Web Parroquia San Isidro Labrador

Sitio web oficial de la **Parroquia San Isidro Labrador**, Maimón, Provincia Monseñor Nouel, República Dominicana.

## Estructura del proyecto

- `index.html` — estructura y contenido del sitio.
- `style.css` — estilos, paleta institucional y diseño adaptable.
- `i18n.js` — diccionarios de interfaz y metadatos para los nueve idiomas.
- `main.js` — interactividad (menú móvil, evangelio del día, idiomas, galería, formularios y modales).
- `manifest.webmanifest` — configuración de la aplicación web instalable (PWA).
- `img/` — fotografías, logo parroquial, logo de Comunicaciones, favicon e iconos PWA.
- `data/evangelio/` — lecturas de la Misa por mes (`YYYY-MM.json`), generadas con anticipación.
- `scripts/generate-gospel.mjs` — genera los archivos de `data/evangelio/`.

## Evangelio del día

El bloque del Evangelio no usa textos escritos a mano: carga el archivo del mes en curso
(`data/evangelio/YYYY-MM.json`) y muestra automáticamente la lectura correspondiente a la
fecha actual, según la zona horaria de República Dominicana.

- Los textos provienen de [Breviarium Core](https://breviarium.es), una librería de código
  abierto (licencia MIT) con el calendario litúrgico y las lecturas completas en español.
- El calendario generado cubre de 2026 a 2040; no hace falta editar nada cada día.
- Si un día no estuviera en los archivos locales, el sitio consulta una API litúrgica de
  respaldo y guarda el resultado en `localStorage` para consultas posteriores sin conexión.
- Si no hay conexión y el día no está guardado, se muestra un aviso honesto en lugar de un
  texto inventado.
- El botón «Próximos Días» recorre los siete días siguientes y vuelve a «Evangelio de Hoy».
- Las lecturas completas (primera lectura, salmo y Evangelio) se muestran en bloques plegables.
  En español se toman de Evangelizo y, si no responde, se conservan las referencias locales.

Para regenerar los datos (por ejemplo, para ampliar los años cubiertos):

```bash
npm install
npm run generate:gospel -- --from=2026 --to=2040
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

Puedes abrir `index.html` directamente en el navegador o levantar un servidor local:

```bash
python -m http.server 8080
```

Luego visita `http://localhost:8080`.

## Publicación

El sitio es estático (HTML, CSS y JavaScript), por lo que puede publicarse en cualquier servicio de hosting estático, por ejemplo GitHub Pages, Netlify o Vercel.
