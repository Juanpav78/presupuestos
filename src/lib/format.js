export const generarId = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36)

export const MONEDAS = {
  COP: { locale: 'es-CO', decimales: 0 },
  USD: { locale: 'en-US', decimales: 2 },
  MXN: { locale: 'es-MX', decimales: 2 },
  EUR: { locale: 'es-ES', decimales: 2 },
}

export const crearFormato = (moneda = 'COP') => {
  const cfg = MONEDAS[moneda] ?? MONEDAS.COP
  const f = new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: cfg.decimales,
    minimumFractionDigits: 0,
  })
  const corto = new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: moneda,
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const numero = new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: cfg.decimales })
  return {
    moneda,
    locale: cfg.locale,
    dinero: (n) => f.format(Number.isFinite(n) ? n : 0),
    corto: (n) => corto.format(Number.isFinite(n) ? n : 0),
    numero: (n) => numero.format(Number.isFinite(n) ? n : 0),
  }
}

export const pct = (n, dec = 0) => `${(Number.isFinite(n) ? n * 100 : 0).toFixed(dec)}%`
export const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100

// ---------- Fechas ----------
const pad = (n) => String(n).padStart(2, '0')

export const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const hoyISO = () => aISO(new Date())
export const mesActual = () => hoyISO().slice(0, 7) // 'YYYY-MM'
export const mesDe = (iso) => (iso || '').slice(0, 7)

export const sumarMeses = (mes, n) => {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export const nombreMes = (mes, corto = false) => {
  const [y, m] = mes.split('-').map(Number)
  const txt = new Date(y, m - 1, 1).toLocaleDateString('es-CO', {
    month: corto ? 'short' : 'long',
    year: corto ? '2-digit' : 'numeric',
  })
  return (txt.charAt(0).toUpperCase() + txt.slice(1)).replace('.', '')
}

export const soloMes = (mes) => nombreMes(mes).split(' ')[0]

export const formatFecha = (iso, conAno = false) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    ...(conAno ? { year: 'numeric' } : {}),
  }).replace('.', '')
}

export const diasDelMes = (mes) => {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Fecha ISO del día de pago dentro de un mes (ajusta a meses cortos). */
export const fechaEnMes = (mes, dia) => `${mes}-${pad(Math.min(Math.max(Number(dia) || 1, 1), diasDelMes(mes)))}`

// ---------- Colores de tarjetas ----------
export const COLORES = {
  oro: { nombre: 'Oro', a: '#FACC15', b: '#A16207', texto: '#1A1500' },
  negro: { nombre: 'Negro', a: '#3F3F46', b: '#09090B', texto: '#FAFAFA' },
  azul: { nombre: 'Azul', a: '#3B82F6', b: '#1E3A8A', texto: '#FFFFFF' },
  morado: { nombre: 'Morado', a: '#8B5CF6', b: '#4C1D95', texto: '#FFFFFF' },
  verde: { nombre: 'Verde', a: '#10B981', b: '#064E3B', texto: '#FFFFFF' },
  rojo: { nombre: 'Rojo', a: '#EF4444', b: '#7F1D1D', texto: '#FFFFFF' },
  rosa: { nombre: 'Rosa', a: '#EC4899', b: '#831843', texto: '#FFFFFF' },
  naranja: { nombre: 'Naranja', a: '#F97316', b: '#7C2D12', texto: '#FFFFFF' },
  turquesa: { nombre: 'Turquesa', a: '#06B6D4', b: '#164E63', texto: '#FFFFFF' },
  plata: { nombre: 'Plata', a: '#D4D4D8', b: '#71717A', texto: '#18181B' },
}
export const color = (k) => COLORES[k] ?? COLORES.negro
export const degradado = (k) => `linear-gradient(135deg, ${color(k).a}, ${color(k).b})`
