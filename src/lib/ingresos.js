// Ingresos: fuentes fijas (salario, arriendo que recibes…) e ingresos únicos esperados.
//
// - Las fuentes fijas cuentan en el mes aunque todavía no lleguen (son seguras),
//   pero puedes marcarlas como recibidas o posponerlas.
// - Los ingresos únicos "esperados" NO cuentan como dinero disponible hasta que
//   los reclamas ("Lo recibí").
import { fechaEnMes, mesDe, sumarMeses, hoyISO, mesActual } from './format'

const suma = (l) => l.reduce((t, x) => t + (Number(x.monto) || 0), 0)

/** Fechas base de una fuente en un mes. */
const fechasFuente = (f, mes) =>
  f.frecuencia === 'quincenal'
    ? [{ n: 1, fecha: fechaEnMes(mes, f.dia || 15) }, { n: 2, fecha: fechaEnMes(mes, f.dia2 || 30) }]
    : [{ n: 1, fecha: fechaEnMes(mes, f.dia || 30) }]

export const montoMensualFuente = (f) => (Number(f.monto) || 0) * (f.frecuencia === 'quincenal' ? 2 : 1)
export const ingresoFijoMensual = (datos) => (datos.fuentes ?? []).reduce((t, f) => t + montoMensualFuente(f), 0)

/**
 * Todos los ingresos que caen en un mes (fijos y únicos), con su estado.
 * Un ingreso pospuesto se muestra en el mes de su nueva fecha.
 */
export function ingresosDelMes(datos, mes) {
  const recibos = datos.recibos ?? {}
  const items = []
  for (const f of datos.fuentes ?? []) {
    for (let k = -3; k <= 0; k++) {
      const base = sumarMeses(mes, k)
      if (f.desde && base < f.desde) continue
      for (const { n, fecha } of fechasFuente(f, base)) {
        const id = `f:${f.id}:${base}:${n}`
        const rec = recibos[id]
        if (k < 0 && !rec) continue // de meses anteriores solo lo que se pospuso hacia acá
        const fechaEf = rec?.fecha ?? fecha
        if (mesDe(fechaEf) !== mes) continue
        items.push({
          id, tipo: 'fijo', fuenteId: f.id, nombre: f.nombre, monto: rec?.monto ?? (Number(f.monto) || 0),
          fecha: fechaEf, fechaOriginal: fecha, recibido: rec?.estado === 'recibido', pospuesto: fechaEf !== fecha,
        })
      }
    }
  }
  for (const e of datos.ingresosExtra ?? []) {
    if (mesDe(e.fecha) !== mes) continue
    items.push({
      id: e.id, tipo: 'extra', nombre: e.nombre, monto: Number(e.monto) || 0, fecha: e.fecha,
      fechaOriginal: e.fechaOriginal ?? e.fecha, recibido: e.estado !== 'esperado', pospuesto: !!e.fechaOriginal && e.fechaOriginal !== e.fecha, extra: e,
    })
  }
  return items.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function resumenIngresos(datos, mes) {
  const items = ingresosDelMes(datos, mes)
  const recibido = suma(items.filter((i) => i.recibido))
  const fijoPendiente = suma(items.filter((i) => i.tipo === 'fijo' && !i.recibido))
  const porRecibir = suma(items.filter((i) => i.tipo === 'extra' && !i.recibido))
  return {
    items,
    recibido,
    fijoPendiente,
    porRecibir, // ingresos únicos esperados: no se cuentan hasta reclamarlos
    contable: recibido + fijoPendiente, // lo que se usa para "te queda libre"
    esperadoTotal: recibido + fijoPendiente + porRecibir,
  }
}

/** Ingresos cuya fecha ya llegó y no se han confirmado (para "Reclamar dinero"). */
export function porReclamar(datos) {
  const hoy = hoyISO()
  const actual = mesActual()
  const lista = []
  for (let k = -2; k <= 0; k++) {
    lista.push(...ingresosDelMes(datos, sumarMeses(actual, k)).filter((i) => !i.recibido && i.fecha <= hoy))
  }
  // Únicos esperados más viejos
  for (const e of datos.ingresosExtra ?? []) {
    if (e.estado === 'esperado' && e.fecha <= hoy && e.fecha < `${sumarMeses(actual, -2)}-01` && !lista.some((x) => x.id === e.id)) {
      lista.push({ id: e.id, tipo: 'extra', nombre: e.nombre, monto: Number(e.monto) || 0, fecha: e.fecha, recibido: false, extra: e })
    }
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Próximos ingresos (desde mañana) para los siguientes meses. */
export function proximosIngresos(datos, meses = 2) {
  const hoy = hoyISO()
  const lista = []
  for (let k = 0; k < meses; k++) lista.push(...ingresosDelMes(datos, sumarMeses(mesActual(), k)).filter((i) => !i.recibido && i.fecha > hoy))
  return lista
}
