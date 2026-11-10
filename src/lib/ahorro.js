// Metas de ahorro: objetivo, fecha, aportes y cuánto ahorrar al mes.
import { mesActual, mesDe, sumarMeses, hoyISO } from './format'

const difMeses = (a, b) => {
  const [y1, m1] = a.split('-').map(Number)
  const [y2, m2] = b.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1)
}

export const ahorradoMeta = (m) => (m.aportes ?? []).reduce((t, a) => t + (Number(a.monto) || 0), 0)

/** Aportes netos de todas las metas en un mes (los retiros son negativos). */
export const ahorroDelMes = (datos, mes) =>
  (datos.metas ?? []).reduce((t, m) => t + (m.aportes ?? []).filter((a) => mesDe(a.fecha) === mes).reduce((s, a) => s + Number(a.monto), 0), 0)

/** Análisis de una meta: progreso, cuánto aportar al mes y si va al día. */
export function analizarMeta(m) {
  const hoy = mesActual()
  const ahorrado = ahorradoMeta(m)
  const objetivo = Number(m.objetivo) || 0
  const falta = Math.max(objetivo - ahorrado, 0)
  const progreso = objetivo > 0 ? Math.min(ahorrado / objetivo, 1) : 0
  const completa = objetivo > 0 && ahorrado >= objetivo

  // Meses restantes contando el actual (si la meta es este mes, queda 1)
  const mesesRestantes = m.fechaMeta ? Math.max(difMeses(hoy, m.fechaMeta) + 1, 1) : null
  const aporteSugerido = mesesRestantes ? Math.ceil(falta / mesesRestantes) : null

  // ¿Va al día? Compara con lo que debería llevar si ahorrara parejo desde que se creó
  let alDia = null
  if (m.fechaMeta && !completa) {
    const inicio = mesDe(m.creado ? new Date(m.creado).toISOString().slice(0, 10) : hoyISO())
    const total = Math.max(difMeses(inicio, m.fechaMeta) + 1, 1)
    const transcurridos = Math.min(Math.max(difMeses(inicio, hoy), 0), total)
    alDia = ahorrado + 1 >= (objetivo * transcurridos) / total
  }

  // Ritmo real: promedio de los últimos 3 meses
  const ultimos = [0, 1, 2].map((k) => sumarMeses(hoy, -k))
  const ritmo = (m.aportes ?? []).filter((a) => ultimos.includes(mesDe(a.fecha))).reduce((t, a) => t + Number(a.monto), 0) / 3
  const llegaEn = ritmo > 0 && !completa ? sumarMeses(hoy, Math.ceil(falta / ritmo)) : null
  const aportadoEsteMes = (m.aportes ?? []).filter((a) => mesDe(a.fecha) === hoy).reduce((t, a) => t + Number(a.monto), 0)

  return { ahorrado, objetivo, falta, progreso, completa, mesesRestantes, aporteSugerido, alDia, ritmo, llegaEn, aportadoEsteMes }
}

/** Cuánto se sugiere ahorrar este mes entre todas las metas. */
export const sugeridoMensual = (datos) =>
  (datos.metas ?? []).reduce((t, m) => {
    const a = analizarMeta(m)
    return t + (a.completa ? 0 : Math.max((a.aporteSugerido ?? 0) - Math.max(a.aportadoEsteMes, 0), 0))
  }, 0)
