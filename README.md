# Web Parroquia San Isidro Labrador

Sitio web oficial de la **Parroquia San Isidro Labrador**, Maimón, Provincia Monseñor Nouel, República Dominicana.

## Estructura del proyecto

- `index.html` — estructura y contenido del sitio.
- `style.css` — estilos, paleta institucional y diseño adaptable.
- `main.js` — interactividad (menú móvil, evangelio del día, galería, formularios y modales).
- `manifest.webmanifest` — configuración de la aplicación web instalable (PWA).
- `img/` — fotografías, logo parroquial, logo de Comunicaciones, favicon e iconos PWA.

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
