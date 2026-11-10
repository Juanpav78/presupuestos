// Cálculos de intereses y simulación de pago de deudas.

/** Convierte la tasa de la deuda a tasa mensual (decimal). */
export const tasaMensual = (deuda) => {
  const t = (Number(deuda.tasa) || 0) / 100
  if (t <= 0) return 0
  // E.A. = efectiva anual (lo normal en Colombia); M.V. = mensual vencida
  return deuda.tipoTasa === 'MV' ? t : Math.pow(1 + t, 1 / 12) - 1
}

export const tasaEA = (deuda) => {
  const t = (Number(deuda.tasa) || 0) / 100
  return deuda.tipoTasa === 'MV' ? Math.pow(1 + t, 12) - 1 : t
}

export const interesDelMes = (deuda) => (Number(deuda.saldo) || 0) * tasaMensual(deuda)

/** Pago mínimo efectivo: nunca mayor al saldo + intereses. */
const minimo = (d, saldo) => Math.min(Number(d.pagoMinimo) || 0, saldo)

export const ordenarPorEstrategia = (deudas, estrategia) => {
  const lista = [...deudas]
  if (estrategia === 'bola') {
    // Bola de nieve: primero el saldo más pequeño (motivación)
    lista.sort((a, b) => a.saldo - b.saldo || tasaMensual(b) - tasaMensual(a))
  } else {
    // Avalancha: primero la tasa más alta (menos intereses)
    lista.sort((a, b) => tasaMensual(b) - tasaMensual(a) || a.saldo - b.saldo)
  }
  return lista
}

/**
 * Simula mes a mes el pago de las deudas.
 * @param deudas  lista de deudas con saldo > 0
 * @param presupuestoMensual  total que se destina cada mes a deudas (mínimos + extra)
 * @param estrategia 'avalancha' | 'bola' | 'minimos'
 * Devuelve { meses, totalIntereses, totalPagado, serie:[{mes, total, porDeuda}], ordenPago:[{id, mes}], atascada, primerMes }
 */
export const simularPlan = (deudas, presupuestoMensual, estrategia = 'avalancha', maxMeses = 360) => {
  let saldos = deudas
    .filter((d) => d.saldo > 0)
    .map((d) => ({ ...d, saldo: Number(d.saldo), r: tasaMensual(d) }))

  const serie = [{ mes: 0, total: suma(saldos), porDeuda: mapSaldos(saldos) }]
  const ordenPago = []
  let totalIntereses = 0
  let totalPagado = 0
  let primerMes = null
  let mes = 0

  while (saldos.some((d) => d.saldo > 0.5) && mes < maxMeses) {
    mes++
    const pagosMes = {}
    // 1. Se cobran intereses
    saldos.forEach((d) => {
      if (d.saldo <= 0) return
      const i = d.saldo * d.r
      d.saldo += i
      totalIntereses += i
    })

    // 2. Pagos mínimos
    let disponible = estrategia === 'minimos' ? Infinity : presupuestoMensual
    saldos.forEach((d) => {
      if (d.saldo <= 0) return
      const p = Math.min(minimo(d, d.saldo), disponible)
      d.saldo -= p
      disponible -= p
      totalPagado += p
      pagosMes[d.id] = p
    })

    // 3. El extra (incluye mínimos liberados de deudas ya pagadas) va a la deuda objetivo
    if (estrategia !== 'minimos') {
      for (const d of ordenarPorEstrategia(saldos.filter((x) => x.saldo > 0), estrategia)) {
        if (disponible <= 0) break
        const p = Math.min(disponible, d.saldo)
        d.saldo -= p
        disponible -= p
        totalPagado += p
        pagosMes[d.id] = (pagosMes[d.id] || 0) + p
      }
    }

    saldos.forEach((d) => {
      if (d.saldo <= 0.5 && !ordenPago.find((o) => o.id === d.id)) {
        d.saldo = 0
        ordenPago.push({ id: d.id, nombre: d.nombre, mes })
      }
    })
    if (mes === 1) primerMes = pagosMes
    serie.push({ mes, total: suma(saldos), porDeuda: mapSaldos(saldos) })
  }

  const atascada = saldos.some((d) => d.saldo > 0.5)
  return { meses: mes, totalIntereses, totalPagado, serie, ordenPago, atascada, primerMes: primerMes ?? {} }
}

const suma = (l) => l.reduce((t, d) => t + Math.max(d.saldo, 0), 0)
const mapSaldos = (l) => Object.fromEntries(l.map((d) => [d.id, Math.max(d.saldo, 0)]))

/** Meses que tarda una sola deuda pagando un monto fijo (null si nunca termina). */
export const mesesParaPagar = (deuda, pago) => {
  const r = tasaMensual(deuda)
  const s = Number(deuda.saldo) || 0
  if (s <= 0) return 0
  if (pago <= s * r) return null
  if (r === 0) return Math.ceil(s / pago)
  return Math.ceil(-Math.log(1 - (r * s) / pago) / Math.log(1 + r))
}
