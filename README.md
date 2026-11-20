# Mago Axel — sitio web v1 (GitHub Pages)

Sitio estático responsive para publicar en GitHub Pages. Incluye diseño, slider, planes, galería, videos y demostración de cotizador por ciudad.

## Publicar en GitHub

1. Creá un repositorio nuevo, por ejemplo `mago-axel-web`.
2. Subí **el contenido de esta carpeta** a la raíz del repositorio (debe quedar `index.html` en la raíz, no dentro de una carpeta adicional).
3. Abrí **Settings → Pages → Build and deployment**.
4. En **Source**, seleccioná **Deploy from a branch**; elegí **main** y **/(root)** y guardá.
5. Esperá el despliegue. La dirección suele ser `https://TU-USUARIO.github.io/mago-axel-web/`.

> GitHub Pages no es un servidor de aplicaciones: no puede guardar uploads desde un formulario web, proteger secretos ni ejecutar una IA privada. El asistente actual es una demostración guiada, NO una IA real. Google Calendar y el panel privado requerirán backend y autenticación.

## Cambiar las fotos del slider y la galería

1. En el repositorio, abrí `assets/images/` y usá **Add file → Upload files** para subir fotos comprimidas (`.webp`, `.jpg`, `.png`).
2. Abrí `data/media.json`, tocá el lápiz y editá los registros de `slides` o `photos`.
3. Cada slide usa `title`, `subtitle`, `category`, `image` y `theme`. Ejemplo: `"image": "assets/images/show-escuela.jpg"`.
4. Si dejás `image` vacío en un slide, se muestra una portada gráfica con emoji. Así evitamos presentar fotos genéricas como si fueran de Mago Axel.
5. Confirmá el cambio con **Commit changes**. La web se actualizará al desplegarse.

## Agregar videos

Editá `data/media.json` y agregá entradas a `videos`, por ejemplo:

```json
"videos": [
  {"title": "Show en escuela", "url": "https://www.youtube.com/watch?v=VIDEO_ID"},
  {"title": "Presentación de Mago Axel", "url": "assets/videos/presentacion.mp4"}
]
```

Para MP4, creá `assets/videos/` y subí el archivo allí. **Recomendación:** usar YouTube para videos largos, porque GitHub tiene límites de tamaño y rendimiento. No se aceptan enlaces arbitrarios como HTML embebido.

## Tarifas y reglas

- `data/catalogo-base.json`: borrador comercial con planes, ciudades y tarifas confirmadas. Las tarifas pendientes deben mantenerse sin valor.
- `data/media.json`: slider, fotos y videos.
- `assets/css/styles.css`: diseño, colores y versión móvil.
- `assets/js/app.js`: interacciones y cotizador guiado.
- `index.html`: estructura del sitio.

El catálogo de Charlie es prioritario. La línea tradicional se conserva para solicitud explícita. Los precios del combo Gs. 1.150.000 solo aplican a las siete ciudades del grupo A. Full Fest + Acompañamiento: grupo A Gs. 650.000, Luque Gs. 670.000, Villeta Gs. 680.000, Nueva Italia Gs. 730.000. CDE y Encarnación siguen pendientes.

**Importante:** el simulador no comprueba distancia real, disponibilidad, pagos ni reservas. Los planes y precios están sujetos a validación final; no usar como sistema de contratación automática.

## Próximas fases

1. Sustituir portadas de servicios con fotografías reales.
2. Definir tarifas faltantes y reglas de las dos líneas comerciales.
3. Integrar un backend seguro para IA, Calendar y gestión de contenidos.
4. Crear panel administrador con inicio de sesión, carga de multimedia y aprobación de cambios comerciales.
5. Conectar WhatsApp y analítica de campañas.

## Probar localmente

La lectura de archivos JSON mediante `fetch()` puede bloquearse si abrís `index.html` con `file://` o `content://`. Para probarlo usá GitHub Pages o un servidor local como `python -m http.server 8000`.
