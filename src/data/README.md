# Cómo editar el catálogo de productos

El catálogo completo vive en **`productos.json`**. No hay que tocar ningún otro
archivo: la tienda se genera sola a partir de este JSON en cada deploy.

## Para agregar un producto

1. Copia las fotos a `public/assets/productos/` (formato .jpg, idealmente < 300 KB,
   nombres simples sin espacios ni ñ/tildes: `globo-burbuja-1.jpg`)
2. Agrega un bloque `{ ... }` dentro de `"productos": [ ... ]` copiando uno existente
3. Guarda, commitea y pushea:
   ```
   git add .
   git commit -m "Agregar producto X"
   git push origin main
   ```
4. Netlify reconstruye solo. En ~2 minutos el producto está en la web.

## Campos de cada producto

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | Único, sin espacios ni mayúsculas. Es la URL: `/tienda/<id>` |
| `nombre` | texto | Como se muestra en la tienda |
| `precio` | número | En soles, con punto decimal: `89.90` (sin comillas, sin "S/") |
| `categoria` | texto | Debe existir en la lista `"categorias"` de arriba |
| `descripcion` | texto | 1-3 frases |
| `colores` | lista | Opciones del selector. `[]` si no aplica |
| `personalizable` | true/false | `true` muestra campo de dedicatoria/detalle |
| `imagenes` | lista | Nombres de archivo dentro de `public/assets/productos/` |
| `disponible` | true/false | `false` = se muestra como AGOTADO, no se puede comprar |
| `destacado` | true/false | `true` lo muestra primero / en la portada de la tienda |

## Para cambiar un precio

Edita el número y haz commit + push. Nada más.

## Para quitar un producto temporalmente

Pon `"disponible": false` (aparece como agotado) — o borra su bloque si es definitivo.

## Reglas de oro

- Respeta las comas: cada `{ ... }` se separa del siguiente con coma, el último no lleva
- Texto siempre entre comillas dobles `"..."`, precios sin comillas
- Si el build de Netlify falla después de editar, casi seguro es una coma o
  comilla mal puesta — el log del build dice la línea exacta
