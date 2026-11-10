import { cobroDelMes, interesesDeuda, saldoDeuda } from './deudas'
import { fechaEnMes, sumarMeses } from './format'
import { infoCategoria } from './categorias'

const suma = (l, f = (x) => x.monto) => l.reduce((t, x) => t + (Number(f(x)) || 0), 0)

export function resumenMes(datos, mes) {
  const { config, gastos, fijos, deudas, pagos, ingresosExtra, pagosFijos } = datos

  const gastosMes = gastos.filter((g) => g.fecha?.startsWith(mes))
  const extrasMes = ingresosExtra.filter((i) => i.fecha?.startsWith(mes))
  const pagosMes = pagos.filter((p) => p.mes === mes || p.fecha?.startsWith(mes))
  const pagados = pagosFijos[mes] ?? []

  const ingreso = (Number(config.ingresoMensual) || 0) + suma(extrasMes)
  const gastado = suma(gastosMes)
  const gastadoTarjeta = suma(gastosMes.filter((g) => g.deudaId))
  const gastadoEfectivo = gastado - gastadoTarjeta

  const fijosTotal = suma(fijos)
  const fijosPagados = suma(fijos.filter((f) => pagados.includes(f.id)))

  // Deudas: lo que cobra cada una este mes (pendiente) + lo que ya se pagó este mes
  const activas = deudas.filter((d) => saldoDeuda(d) > 0.5)
  const pendienteDeudas = suma(deudas, (d) => cobroDelMes(d, mes).total)
  const abonado = suma(pagosMes)
  const pagadoCuotasMes = suma(pagosMes, (p) => (p.reparto ? p.reparto.intereses + p.reparto.cuotas : p.monto))
  const minimos = pendienteDeudas + pagadoCuotasMes
  const pagoDeudas = Math.max(Number(config.pagoDeudasMensual) || 0, minimos)
  const interesesMes = suma(activas, interesesDeuda)
  const deudaTotal = suma(activas, saldoDeuda)

  const tarjetas = deudas.filter((d) => d.tipo === 'tarjeta' && d.cupo > 0)
  const utilizacion = tarjetas.length ? suma(tarjetas, saldoDeuda) / suma(tarjetas, (d) => d.cupo) : 0

  const compromisos = fijosTotal + pagoDeudas
  const libre = ingreso - compromisos - gastadoEfectivo
  const pagadoMes = fijosPagados + abonado

  const porCategoria = {}
  gastosMes.forEach((g) => (porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto))
  fijos.forEach((f) => (porCategoria[f.categoria] = (porCategoria[f.categoria] || 0) + Number(f.monto)))

  const tipoGasto = { necesidad: 0, deseo: 0, ahorro: pagoDeudas }
  Object.entries(porCategoria).forEach(([c, v]) => (tipoGasto[infoCategoria(c).tipo] += v))

  return {
    ingreso, gastado, gastadoTarjeta, gastadoEfectivo, gastosMes,
    fijosTotal, fijosPagados, pagados,
    minimos, pendienteDeudas, pagoDeudas, abonado, interesesMes, deudaTotal, utilizacion,
    compromisos, libre, pagadoMes, porCategoria, tipoGasto,
    presupuestoVariable: Number(config.presupuestoVariable) || 0,
  }
}

export function historico(datos, mes, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = sumarMeses(mes, i - n + 1)
    return {
      mes: m,
      variables: suma(datos.gastos.filter((g) => g.fecha?.startsWith(m))),
      pagos: suma(datos.pagos.filter((p) => p.fecha?.startsWith(m))),
    }
  })
}

/** Todos los vencimientos del mes: fijos y tarjetas/créditos. */
export function vencimientos(datos, mes) {
  const pagados = datos.pagosFijos[mes] ?? []
  const fijos = datos.fijos.map((f) => ({
    tipo: 'fijo', id: f.id, nombre: f.nombre, categoria: f.categoria,
    monto: Number(f.monto), fecha: fechaEnMes(mes, f.dia), pagado: pagados.includes(f.id),
  }))
  const deudas = datos.deudas
    .map((d) => {
      const pendiente = cobroDelMes(d, mes).total
      const pagadoMes = suma(datos.pagos.filter((p) => p.deudaId === d.id && p.mes === mes))
      if (pendiente <= 0 && pagadoMes <= 0) return null
      return {
        tipo: 'deuda', id: d.id, nombre: d.nombre, color: d.color,
        monto: pendiente > 0 ? pendiente : pagadoMes, fecha: fechaEnMes(mes, d.diaPago || 31), sinDia: !d.diaPago, pagado: pendiente <= 0,
      }
    })
    .filter(Boolean)
  return [...fijos, ...deudas].sort((a, b) => a.fecha.localeCompare(b.fecha))
}
