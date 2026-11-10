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
  return {
    dinero: (n) => f.format(Number.isFinite(n) ? n : 0),
    corto: (n) => corto.format(Number.isFinite(n) ? n : 0),
  }
}

export const pct = (n, dec = 0) => `${(Number.isFinite(n) ? n * 100 : 0).toFixed(dec)}%`

// ---------- Fechas ----------
const pad = (n) => String(n).padStart(2, '0')

export const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const mesActual = () => hoyISO().slice(0, 7) // 'YYYY-MM'

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
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export const formatFecha = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export const diasDelMes = (mes) => {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// ---------- Categorías ----------
export const CATEGORIAS = {
  Vivienda: { emoji: '🏠', color: '#2563eb', tipo: 'necesidad' },
  Comida: { emoji: '🍽️', color: '#16a34a', tipo: 'necesidad' },
  Transporte: { emoji: '🚌', color: '#0891b2', tipo: 'necesidad' },
  Servicios: { emoji: '💡', color: '#7c3aed', tipo: 'necesidad' },
  Salud: { emoji: '🩺', color: '#dc2626', tipo: 'necesidad' },
  Educación: { emoji: '📚', color: '#0d9488', tipo: 'necesidad' },
  Suscripciones: { emoji: '📺', color: '#db2777', tipo: 'deseo' },
  Ocio: { emoji: '🎉', color: '#ea580c', tipo: 'deseo' },
  Compras: { emoji: '🛍️', color: '#ca8a04', tipo: 'deseo' },
  Ahorro: { emoji: '🐷', color: '#059669', tipo: 'ahorro' },
  Otros: { emoji: '📦', color: '#64748b', tipo: 'deseo' },
}

export const infoCategoria = (c) => CATEGORIAS[c] ?? CATEGORIAS.Otros
