# Web Parroquia San Isidro Labrador

Sitio web oficial de la **Parroquia San Isidro Labrador**, Maimón, Provincia Monseñor Nouel, República Dominicana.

## Estructura del proyecto

- `index.html` — estructura y contenido del sitio.
- `style.css` — estilos, paleta institucional y diseño adaptable.
- `main.js` — interactividad (menú móvil, evangelio del día, galería, formularios y modales).
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

Para regenerar los datos (por ejemplo, para ampliar los años cubiertos):

```bash
npm install
npm run generate:gospel -- --from=2026 --to=2040
```

Los archivos se sobrescriben en `data/evangelio/` y deben publicarse junto con el sitio.

## Accesibilidad y navegación

- Enlace “Saltar al contenido principal”, foco visible y soporte para movimiento reducido.
- Menú móvil y modales operables con teclado (Escape, tabulación contenida y retorno del foco).
- Navegación con la sección activa resaltada automáticamente.

## Formularios

Los formularios de contacto y de intenciones de misa preparan un correo dirigido al despacho parroquial con los datos ingresados. Al enviarlos, se abre la aplicación de correo del usuario para completar el envío; el sitio no almacena datos en un servidor.

## Ejecutar localmente

Puedes abrir `index.html` directamente en el navegador o levantar un servidor local:

```bash
python -m http.server 8080
```

Luego visita `http://localhost:8080`.

## Publicación

El sitio es estático (HTML, CSS y JavaScript), por lo que puede publicarse en cualquier servicio de hosting estático, por ejemplo GitHub Pages, Netlify o Vercel.
