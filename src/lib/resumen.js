import { interesDelMes } from './deudas'
import { sumarMeses } from './format'

const suma = (l, f = (x) => x.monto) => l.reduce((t, x) => t + (Number(f(x)) || 0), 0)

export function resumenMes(datos, mes) {
  const { config, gastos, fijos, deudas, abonos, ingresosExtra, pagosFijos } = datos

  const gastosMes = gastos.filter((g) => g.fecha?.startsWith(mes))
  const extrasMes = ingresosExtra.filter((i) => i.fecha?.startsWith(mes))
  const abonosMes = abonos.filter((a) => a.fecha?.startsWith(mes))
  const pagados = pagosFijos[mes] ?? []

  const ingreso = (Number(config.ingresoMensual) || 0) + suma(extrasMes)
  const gastado = suma(gastosMes)
  const gastadoTarjeta = suma(gastosMes.filter((g) => g.deudaId))
  const gastadoEfectivo = gastado - gastadoTarjeta

  const fijosTotal = suma(fijos)
  const fijosPagados = suma(fijos.filter((f) => pagados.includes(f.id)))

  const activas = deudas.filter((d) => d.saldo > 0)
  const minimos = suma(activas, (d) => Math.min(d.pagoMinimo, d.saldo))
  const pagoDeudas = Math.max(Number(config.pagoDeudasMensual) || 0, minimos)
  const abonado = suma(abonosMes)
  const interesesMes = activas.reduce((t, d) => t + interesDelMes(d), 0)
  const deudaTotal = suma(activas, (d) => d.saldo)

  const tarjetas = activas.filter((d) => d.tipo === 'tarjeta' && d.cupo > 0)
  const utilizacion = tarjetas.length ? suma(tarjetas, (d) => d.saldo) / suma(tarjetas, (d) => d.cupo) : 0

  // Lo que debes sacar del bolsillo este mes (fijos + deudas) y lo que queda libre
  const compromisos = fijosTotal + pagoDeudas
  const libre = ingreso - compromisos - gastadoEfectivo

  const porCategoria = {}
  gastosMes.forEach((g) => (porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto))
  fijos.forEach((f) => (porCategoria[f.categoria] = (porCategoria[f.categoria] || 0) + Number(f.monto)))

  return {
    ingreso, gastado, gastadoTarjeta, gastadoEfectivo, gastosMes,
    fijosTotal, fijosPagados, pagados,
    minimos, pagoDeudas, abonado, interesesMes, deudaTotal, utilizacion,
    compromisos, libre, porCategoria,
    presupuestoVariable: Number(config.presupuestoVariable) || 0,
  }
}

/** Gastos (variables + fijos) de los últimos n meses, para gráficas de tendencia. */
export function historico(datos, mes, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = sumarMeses(mes, i - n + 1)
    const variables = suma(datos.gastos.filter((g) => g.fecha?.startsWith(m)))
    const abonos = suma(datos.abonos.filter((a) => a.fecha?.startsWith(m)))
    return { mes: m, variables, abonos }
  })
}

/** Próximos pagos (fijos y deudas) ordenados por día del mes. */
export function proximosPagos(datos, mes, hoyDia) {
  const pagados = datos.pagosFijos[mes] ?? []
  const lista = [
    ...datos.fijos.map((f) => ({ tipo: 'fijo', id: f.id, nombre: f.nombre, monto: Number(f.monto), dia: Number(f.dia) || 1, pagado: pagados.includes(f.id) })),
    ...datos.deudas
      .filter((d) => d.saldo > 0)
      .map((d) => {
        const abonado = suma(datos.abonos.filter((a) => a.deudaId === d.id && a.fecha?.startsWith(mes)))
        const minimo = Math.min(d.pagoMinimo, d.saldo + abonado)
        return { tipo: 'deuda', id: d.id, nombre: d.nombre, monto: minimo, dia: Number(d.diaPago) || 1, pagado: minimo > 0 && abonado >= minimo }
      }),
  ]
  return lista
    .map((p) => ({ ...p, faltan: p.dia - hoyDia }))
    .sort((a, b) => a.dia - b.dia)
}
