// Lógica de tarjetas y créditos.
//
// Cada deuda (tarjeta o crédito) tiene una lista de "compras":
//   - En una tarjeta, cada compra se difiere a N cuotas. Cada mes se cobra
//     capital (saldo / cuotas restantes) + intereses sobre el saldo.
//     Las compras a 1 cuota no generan intereses.
//   - Un crédito es una sola "compra" con cuota fija (sistema francés).
//
// Al pagar, el dinero se aplica como lo hacen los bancos:
//   1) intereses del mes, 2) cuotas del mes (de la compra más antigua a la
//   más nueva), 3) el excedente abona a capital
//   empezando por la compra más antigua.

export const tasaMensual = (deuda) => {
  const t = (Number(deuda?.tasa) || 0) / 100
  if (t <= 0) return 0
  return deuda.tipoTasa === 'MV' ? t : Math.pow(1 + t, 1 / 12) - 1
}

export const tasaEA = (deuda) => {
  const t = (Number(deuda?.tasa) || 0) / 100
  return deuda.tipoTasa === 'MV' ? Math.pow(1 + t, 12) - 1 : t
}

/** Cuota fija de un crédito (sistema francés). */
export const cuotaFrancesa = (monto, tasaMes, n) => {
  if (!n || n <= 0) return monto
  if (!tasaMes) return monto / n
  return (monto * tasaMes) / (1 - Math.pow(1 + tasaMes, -n))
}

const r2 = (n) => Math.round(n * 100) / 100

export const saldoDeuda = (d) => (d.compras ?? []).reduce((t, c) => t + Math.max(Number(c.saldo) || 0, 0), 0)
export const cuotasRestantes = (c) => Math.max((Number(c.cuotas) || 1) - (Number(c.cuotasPagadas) || 0), 1)
const generaInteres = (c) => Number(c.cuotas) > 1 || Number(c.cuotaFija) > 0

/** Lo que cobra una compra en un mes (si no se ha pagado ya ese mes). */
export const cobroCompra = (c, r, mes) => {
  const saldo = Number(c.saldo) || 0
  if (saldo <= 0.5 || (mes && c.ultimoMesPagado === mes)) return { interes: 0, capital: 0, total: 0 }
  const interes = generaInteres(c) ? saldo * r : 0
  const capital = Number(c.cuotaFija) > 0
    ? Math.min(Math.max(Number(c.cuotaFija) - interes, 0), saldo)
    : Math.min(saldo / cuotasRestantes(c), saldo)
  return { interes: r2(interes), capital: r2(capital), total: r2(interes + capital) }
}

export const ordenarCompras = (compras) =>
  [...compras].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.creado || 0) - (b.creado || 0))

/** Pago del mes de una deuda (lo que el banco cobraría como pago mínimo). */
export const cobroDelMes = (d, mes) => {
  const r = tasaMensual(d)
  const detalle = ordenarCompras(d.compras ?? []).map((c) => ({ compra: c, ...cobroCompra(c, r, mes) }))
  const suma = (k) => r2(detalle.reduce((t, x) => t + x[k], 0))
  return { interes: suma('interes'), capital: suma('capital'), total: suma('total'), detalle }
}

/** Intereses estimados de un mes sobre el saldo actual. */
export const interesesDeuda = (d) => {
  const r = tasaMensual(d)
  return (d.compras ?? []).reduce((t, c) => t + (generaInteres(c) ? (Number(c.saldo) || 0) * r : 0), 0)
}

/**
 * Aplica un pago a una deuda.
 * Devuelve { compras, reparto: {intereses, cuotas, abono}, abonos:[{compraId, nombre, monto}], sobrante }
 */
export const aplicarPago = (d, monto, mes) => {
  const r = tasaMensual(d)
  let resto = Number(monto) || 0
  const compras = ordenarCompras(d.compras ?? []).map((c) => ({ ...c }))
  const reparto = { intereses: 0, cuotas: 0, abono: 0 }
  const abonos = []

  // 1. Intereses del mes de todas las compras
  // 2. Cuotas del mes, de la compra más antigua a la más nueva
  const cobros = compras.map((c) => cobroCompra(c, r, mes))
  const pagado = compras.map(() => ({ interes: 0, capital: 0 }))
  compras.forEach((c, i) => {
    const p = Math.min(resto, cobros[i].interes)
    resto -= p
    reparto.intereses += p
    pagado[i].interes = p
  })
  compras.forEach((c, i) => {
    const p = Math.min(resto, cobros[i].capital)
    resto -= p
    reparto.cuotas += p
    pagado[i].capital = p
    c.saldo = r2(c.saldo - p)
    const debe = cobros[i].interes + cobros[i].capital
    if (debe > 0 && pagado[i].interes + pagado[i].capital >= debe - 0.5) {
      c.cuotasPagadas = Math.min((Number(c.cuotasPagadas) || 0) + 1, Number(c.cuotas) || 1)
      c.ultimoMesPagado = mes
    }
  })

  // 3. Excedente: abono a capital empezando por la compra más antigua
  for (const c of compras) {
    if (resto <= 0) break
    if (c.saldo <= 0) continue
    const abono = Math.min(resto, c.saldo)
    c.saldo = r2(c.saldo - abono)
    resto -= abono
    reparto.abono += abono
    abonos.push({ compraId: c.id, nombre: c.nombre, monto: r2(abono) })
  }

  compras.forEach((c) => {
    if (c.saldo <= 0.5) {
      c.saldo = 0
      c.cuotasPagadas = Number(c.cuotas) || 1
    }
  })

  return {
    compras,
    reparto: { intereses: r2(reparto.intereses), cuotas: r2(reparto.cuotas), abono: r2(reparto.abono) },
    abonos,
    sobrante: r2(Math.max(resto, 0)),
  }
}

export const ordenarPorEstrategia = (deudas, estrategia) => {
  const lista = [...deudas]
  const saldo = (d) => d._saldo ?? saldoDeuda(d)
  if (estrategia === 'bola') lista.sort((a, b) => saldo(a) - saldo(b) || tasaMensual(b) - tasaMensual(a))
  else lista.sort((a, b) => tasaMensual(b) - tasaMensual(a) || saldo(a) - saldo(b))
  return lista
}

/**
 * Simula mes a mes el pago de todas las deudas.
 * estrategia: 'avalancha' | 'bola' | 'minimos'
 */
export const simularPlan = (deudas, presupuestoMensual, estrategia = 'avalancha', maxMeses = 360) => {
  let lista = deudas
    .filter((d) => saldoDeuda(d) > 0.5)
    .map((d) => ({
      id: d.id,
      nombre: d.nombre,
      tasa: d.tasa,
      tipoTasa: d.tipoTasa,
      r: tasaMensual(d),
      compras: ordenarCompras(d.compras).filter((c) => c.saldo > 0.5).map((c) => ({ ...c, ultimoMesPagado: undefined })),
    }))

  const total = () => lista.reduce((t, d) => t + d.compras.reduce((s, c) => s + c.saldo, 0), 0)
  const serie = [total()]
  const ordenPago = []
  let totalIntereses = 0
  let totalPagado = 0
  let primerMes = {}
  let mes = 0

  while (total() > 0.5 && mes < maxMeses) {
    mes++
    const pagos = {}
    let disponible = estrategia === 'minimos' ? Infinity : presupuestoMensual

    // Cargos del mes
    for (const d of lista) {
      for (const c of d.compras) {
        if (c.saldo <= 0.5) continue
        const { interes, capital } = cobroCompra(c, d.r)
        totalIntereses += interes
        const pagado = Math.min(disponible, interes + capital)
        disponible -= pagado
        totalPagado += pagado
        pagos[d.id] = (pagos[d.id] || 0) + pagado
        const aInteres = Math.min(pagado, interes)
        c.saldo += interes - aInteres // interés no pagado se capitaliza
        c.saldo -= pagado - aInteres
        if (pagado >= interes + capital - 0.5) c.cuotasPagadas = (c.cuotasPagadas || 0) + 1
      }
    }

    // Extra a la deuda objetivo (y dentro de ella, a la compra más antigua)
    if (estrategia !== 'minimos') {
      const conSaldo = lista
        .map((d) => ({ ...d, _saldo: d.compras.reduce((s, c) => s + c.saldo, 0) }))
        .filter((d) => d._saldo > 0.5)
      for (const obj of ordenarPorEstrategia(conSaldo, estrategia)) {
        const d = lista.find((x) => x.id === obj.id)
        for (const c of d.compras) {
          if (disponible <= 0) break
          if (c.saldo <= 0.5) continue
          const p = Math.min(disponible, c.saldo)
          c.saldo -= p
          disponible -= p
          totalPagado += p
          pagos[d.id] = (pagos[d.id] || 0) + p
        }
        if (disponible <= 0) break
      }
    }

    for (const d of lista) {
      d.compras.forEach((c) => c.saldo <= 0.5 && (c.saldo = 0))
      if (!ordenPago.find((o) => o.id === d.id) && d.compras.every((c) => c.saldo === 0)) {
        ordenPago.push({ id: d.id, nombre: d.nombre, mes })
      }
    }
    if (mes === 1) primerMes = pagos
    serie.push(total())
  }

  return { meses: mes, totalIntereses, totalPagado, serie, ordenPago, atascada: total() > 0.5, primerMes }
}
