// ═══════════════════════════════════════════════════════════
//  CAMPAÑAS DE TEMPORADA
//  Día de la Madre, del Padre, del Niño, San Valentín, Navidad...
//
//  UN SOLO INTERRUPTOR: el campo `activa` controla las dos páginas.
//
//   activa: true   →  LANDING: la tarjeta de campaña REEMPLAZA a
//                     "Decoraciones de esta semana" en el hero.
//                     En móvil/tablet aparece arriba de todo.
//                  →  TIENDA:  se muestra la sección de campaña con las
//                     fotos de los productos seleccionados.
//
//   activa: false  →  LANDING: vuelve "Decoraciones de esta semana".
//                  →  TIENDA:  la sección de campaña desaparece.
//
//  CÓMO ACTIVAR:
//   1. (Opcional) Sube una imagen a  public/assets/campanias/
//   2. Rellena los campos de abajo
//   3. Cambia  activa: false  ->  activa: true
//   4. git commit -m "Campaña San Valentín [deploy]" && git push
//
//  CÓMO APAGARLA: pon  activa: false. No borres nada: los datos quedan
//  guardados para reutilizarlos el año siguiente.
// ═══════════════════════════════════════════════════════════

export const CAMPANIA = {
  // Interruptor maestro. En false NO se publica nada de la campaña,
  // sin importar las fechas.
  activa: true,

  // ── FECHAS (se apaga sola) ──
  // Formato: 'AAAA-MM-DD'. Ambos días se incluyen.
  //   desde: '2027-02-01'  →  aparece el 1 de febrero a las 00:00
  //   hasta: '2027-02-14'  →  se va sola el 15 de febrero a las 00:00
  //
  // Déjalos VACÍOS ('') para que la campaña no caduque y dependa solo
  // del interruptor `activa`.
  //
  // La fecha se comprueba en el navegador de cada visitante, así que la
  // campaña se apaga sola aunque nadie vuelva a publicar el sitio.
  desde: '',
  hasta: '',

  // Texto
  etiqueta:   'Campaña',                       // píldora pequeña arriba
  titulo:     'San Valentín',
  subtitulo:  'Decoraciones y globos personalizados para engreírla.',

  // ── DESTINO POR UNIDAD DE NEGOCIO ──
  // Una sola campaña, pero cada unidad convierte a lo suyo:
  //
  //   SERVICIOS (landing) → abre el formulario de cotización.
  //     Los packs de eventos son S/650–1999; mandar esa visita a la tienda
  //     (S/50–129) cambia un lead caro por uno barato.
  //
  //   TIENDA → no redirige a ningún lado: muestra los productos de campaña
  //     en la misma página, con su botón de agregar al carrito.
  //
  // Valores posibles para accionServicios:
  //   'cotizar'  → abre el modal de cotización (recomendado)
  //   'tienda'   → lleva a /tienda/
  //   una ruta   → cualquier URL, ej. '/#galeria'
  accionServicios: 'cotizar',

  // Texto del botón en la portada de campaña de la landing
  cta: 'Quiero cotizar mi decoración',

  // Texto del botón cuando accionServicios NO es 'cotizar'
  ctaAlterno: 'Ver la campaña',

  // ── IMÁGENES DE LA PORTADA ──
  // Con la campaña activa, ESTAS imágenes reemplazan al carrusel de fondo del
  // hero: la portada pasa a ser la campaña y las fotos rotan dentro de su
  // tarjeta. Deben estar en  public/assets/campanias/
  //
  // ⚠️ PROVISIONAL: hoy son copias de las fotos del hero (foto1–foto4).
  //    Reemplazarlas por las fotos reales de la campaña cuando lleguen.
  //
  // Si se deja el arreglo vacío, la tarjeta usa un degradado de marca.
  imagenes: [
    '/assets/campanias/foto1.jpg',
    '/assets/campanias/foto2.jpg',
    '/assets/campanias/foto3.jpg',
    '/assets/campanias/foto4.jpg',
  ],

  // Milisegundos entre foto y foto dentro de la tarjeta de campaña
  intervaloMs: 4000,

  // ── PRODUCTOS DE LA CAMPAÑA (sección en /tienda/) ──
  // IDs tomados de src/data/productos.json.
  // Si se deja el arreglo VACÍO, se usan automáticamente los productos
  // marcados con  "destacado": true  en productos.json.
  productos: [],

  // Texto que acompaña a la parrilla de productos en la tienda
  tituloTienda: 'Productos de campaña',
};

/** Avisa en la consola del build si las fechas están mal escritas o ya vencieron.
 *  Es solo un aviso para quien publica: no rompe el build. */
let _yaAviso = false;
export function revisaFechas() {
  // BaseLayout se ejecuta una vez por página: sin esto el aviso saldría 12 veces
  if (_yaAviso || !CAMPANIA.activa) return;
  _yaAviso = true;
  const formato = /^\d{4}-\d{2}-\d{2}$/;
  const { desde, hasta, titulo } = CAMPANIA;

  for (const [campo, valor] of [['desde', desde], ['hasta', hasta]]) {
    if (valor && !formato.test(valor)) {
      console.warn(`[campaña] "${campo}" no tiene formato AAAA-MM-DD: "${valor}". Se ignorará.`);
    }
  }
  if (desde && hasta && formato.test(desde) && formato.test(hasta) && desde > hasta) {
    console.warn(`[campaña] "desde" (${desde}) es posterior a "hasta" (${hasta}): no se mostrará nunca.`);
  }
  const hoy = new Date().toISOString().slice(0, 10);
  if (hasta && formato.test(hasta) && hasta < hoy) {
    console.warn(`[campaña] "${titulo}" ya venció el ${hasta}. Publicándose apagada.`);
  }
}

/** href y comportamiento de la portada de campaña en la landing.
 *  Con 'cotizar' el href queda en '#contacto' como respaldo: si el JS no
 *  cargara, el clic al menos lleva a la sección de contacto en vez de a nada. */
export function destinoServicios() {
  const a = CAMPANIA.accionServicios || 'cotizar';
  if (a === 'cotizar') return { href: '#contacto', abreModal: true,  cta: CAMPANIA.cta };
  if (a === 'tienda')  return { href: '/tienda/',  abreModal: false, cta: CAMPANIA.ctaAlterno };
  return { href: a, abreModal: false, cta: CAMPANIA.ctaAlterno };
}

// Historial de campañas ya usadas — copiar y pegar sobre CAMPANIA para reactivar.
export const CAMPANIAS_GUARDADAS = [
  { titulo: 'Día de la Madre',  imagen: '', productos: [] },
  { titulo: 'Día del Padre',    imagen: '', productos: [] },
  { titulo: 'Día del Niño',     imagen: '', productos: [] },
  { titulo: 'San Valentín',     imagen: '', productos: [] },
];

/**
 * Productos que se muestran en la sección de campaña de la tienda.
 * @param {{productos: Array<any>}} data  contenido de productos.json
 */
export function productosDeCampania(data) {
  const todos = (data && data.productos) || [];
  const ids = CAMPANIA.productos || [];
  if (ids.length) {
    // Respeta el orden en que el cliente los listó en `productos`
    return ids.map(id => todos.find(p => p.id === id)).filter(Boolean);
  }
  return todos.filter(p => p.destacado);
}
