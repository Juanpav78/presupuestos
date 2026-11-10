import { useEffect, useState } from 'react'
import { generarId, hoyISO, mesDe } from './format'
import { aplicarPago, cuotaFrancesa, tasaMensual } from './deudas'
import { normalizarCategoria } from './categorias'

const CLAVE = 'finanzas-v2'

export const estadoInicial = {
  version: 2,
  config: {
    moneda: 'COP',
    ingresoMensual: 0,
    presupuestoVariable: 0,
    pagoDeudasMensual: 0,
    estrategia: 'avalancha',
  },
  ingresosExtra: [], // {id, nombre, monto, fecha}
  gastos: [], // {id, nombre, monto, categoria, fecha, deudaId?, compraId?}
  fijos: [], // {id, nombre, monto, categoria, dia}
  pagosFijos: {}, // { 'YYYY-MM': [fijoId] }
  deudas: [], // {id, nombre, tipo:'tarjeta'|'credito', color, ultimos4, cupo, tasa, tipoTasa, diaPago, compras:[]}
  pagos: [], // {id, deudaId, monto, fecha, mes, reparto, abonos, antes}
}

const completar = (d) => ({ ...estadoInicial, ...d, config: { ...estadoInicial.config, ...d.config } })

// ---------- Migraciones ----------
const desdeV1 = (v1) => {
  const tiposCredito = ['prestamo', 'vehiculo', 'otro']
  const colores = ['oro', 'azul', 'morado', 'verde', 'rojo', 'negro']
  return completar({
    ...v1,
    version: 2,
    pagos: (v1.abonos ?? []).map((a) => ({ ...a, mes: mesDe(a.fecha), reparto: { intereses: 0, cuotas: 0, abono: a.monto }, abonos: [] })),
    deudas: (v1.deudas ?? []).map((d, i) => {
      const esCredito = tiposCredito.includes(d.tipo)
      const saldo = Number(d.saldo) || 0
      const pago = Number(d.pagoMinimo) || 0
      return {
        id: d.id,
        nombre: d.nombre,
        tipo: esCredito ? 'credito' : 'tarjeta',
        color: colores[i % colores.length],
        cupo: Number(d.cupo) || 0,
        tasa: Number(d.tasa) || 0,
        tipoTasa: d.tipoTasa || 'EA',
        diaPago: Number(d.diaPago) || 1,
        compras: saldo > 0 ? [{
          id: generarId(),
          nombre: esCredito ? 'Saldo del crédito' : 'Saldo anterior',
          fecha: hoyISO(),
          monto: saldo,
          saldo,
          cuotas: pago > 0 ? Math.max(Math.ceil(saldo / pago), 1) : 12,
          cuotasPagadas: 0,
          ...(esCredito && pago > 0 ? { cuotaFija: pago } : {}),
        }] : [],
      }
    }),
    gastos: (v1.gastos ?? []).map(({ deudaId, ...g }) => g),
  })
}

const desdeV0 = () => {
  const viejos = JSON.parse(localStorage.getItem('gastos') || '[]')
  const presupuesto = Number(localStorage.getItem('presupuesto')) || 0
  return completar({
    config: { presupuestoVariable: presupuesto },
    gastos: viejos.map((g) => ({
      id: g.id || generarId(),
      nombre: g.nombre,
      monto: Number(g.cantidad) || 0,
      categoria: normalizarCategoria(g.categoria),
      fecha: g.fecha ? new Date(g.fecha).toISOString().slice(0, 10) : hoyISO(),
    })),
  })
}

const leer = () => {
  try {
    const v2 = localStorage.getItem(CLAVE)
    if (v2) return completar(JSON.parse(v2))
    const v1 = localStorage.getItem('finanzas-v1')
    if (v1) return desdeV1(JSON.parse(v1))
    return desdeV0()
  } catch {
    return estadoInicial
  }
}

// ---------- Hook principal ----------
export function useFinanzas() {
  const [datos, setDatos] = useState(leer)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos))
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }, [datos])

  const upsert = (lista, item) =>
    item.id && lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [...lista, { ...item, id: item.id || generarId() }]

  const editarDeuda = (deudas, id, fn) => deudas.map((d) => (d.id === id ? fn(d) : d))

  const nuevaCompra = (c) => ({
    id: generarId(),
    creado: Date.now(),
    cuotasPagadas: 0,
    ...c,
    monto: Number(c.monto) || 0,
    cuotas: Math.max(Number(c.cuotas) || 1, 1),
    saldo: c.saldo !== undefined && c.saldo !== '' ? Number(c.saldo) : Number(c.monto) || 0,
  })

  const acciones = {
    setConfig: (cambios) => setDatos((s) => ({ ...s, config: { ...s.config, ...cambios } })),

    // ----- Gastos del día a día. Si se pagan con tarjeta se crea una compra en ella -----
    guardarGasto: (g) =>
      setDatos((s) => {
        let deudas = s.deudas
        const anterior = s.gastos.find((x) => x.id === g.id)
        let compraId = anterior?.compraId

        // Si cambió de tarjeta (o dejó de ser con tarjeta), quitar la compra anterior
        if (anterior?.compraId && anterior.deudaId !== g.deudaId) {
          deudas = editarDeuda(deudas, anterior.deudaId, (d) => ({ ...d, compras: d.compras.filter((c) => c.id !== anterior.compraId) }))
          compraId = undefined
        }
        if (g.deudaId) {
          if (compraId) {
            deudas = editarDeuda(deudas, g.deudaId, (d) => ({
              ...d,
              compras: d.compras.map((c) => {
                if (c.id !== compraId) return c
                const pagado = (Number(c.monto) || 0) - (Number(c.saldo) || 0)
                return { ...c, nombre: g.nombre, fecha: g.fecha, monto: g.monto, cuotas: Number(g.cuotas) || 1, saldo: Math.max(g.monto - pagado, 0) }
              }),
            }))
          } else {
            const compra = nuevaCompra({ nombre: g.nombre, fecha: g.fecha, monto: g.monto, cuotas: g.cuotas })
            compraId = compra.id
            deudas = editarDeuda(deudas, g.deudaId, (d) => ({ ...d, compras: [...d.compras, compra] }))
          }
        }
        const gasto = { ...g, compraId: g.deudaId ? compraId : undefined, deudaId: g.deudaId || undefined }
        return { ...s, deudas, gastos: upsert(s.gastos, gasto) }
      }),
    eliminarGasto: (id) =>
      setDatos((s) => {
        const g = s.gastos.find((x) => x.id === id)
        const deudas = g?.compraId
          ? editarDeuda(s.deudas, g.deudaId, (d) => ({ ...d, compras: d.compras.filter((c) => c.id !== g.compraId) }))
          : s.deudas
        return { ...s, gastos: s.gastos.filter((x) => x.id !== id), deudas }
      }),

    guardarIngreso: (i) => setDatos((s) => ({ ...s, ingresosExtra: upsert(s.ingresosExtra, i) })),
    eliminarIngreso: (id) => setDatos((s) => ({ ...s, ingresosExtra: s.ingresosExtra.filter((x) => x.id !== id) })),

    // ----- Gastos fijos -----
    guardarFijo: (f) => setDatos((s) => ({ ...s, fijos: upsert(s.fijos, f) })),
    eliminarFijo: (id) => setDatos((s) => ({ ...s, fijos: s.fijos.filter((x) => x.id !== id) })),
    togglePagoFijo: (mes, id) =>
      setDatos((s) => {
        const lista = s.pagosFijos[mes] ?? []
        const nueva = lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]
        return { ...s, pagosFijos: { ...s.pagosFijos, [mes]: nueva } }
      }),

    // ----- Tarjetas y créditos -----
    /** saldoInicial: {monto, cuotas, cuotaFija} opcional para crear la deuda con su saldo actual */
    crearDeuda: (d, saldoInicial) =>
      setDatos((s) => {
        const compras = []
        if (saldoInicial?.monto > 0) {
          const esCredito = d.tipo === 'credito'
          const n = Math.max(Number(saldoInicial.cuotas) || 1, 1)
          compras.push(nuevaCompra({
            nombre: esCredito ? 'Saldo del crédito' : 'Saldo anterior',
            fecha: hoyISO(),
            monto: saldoInicial.monto,
            cuotas: n,
            ...(esCredito ? { cuotaFija: Number(saldoInicial.cuotaFija) || Math.round(cuotaFrancesa(saldoInicial.monto, tasaMensual(d), n)) } : {}),
          }))
        }
        return { ...s, deudas: [...s.deudas, { ...d, id: generarId(), compras }] }
      }),
    guardarDeuda: (d) => setDatos((s) => ({ ...s, deudas: s.deudas.map((x) => (x.id === d.id ? { ...x, ...d } : x)) })),
    eliminarDeuda: (id) =>
      setDatos((s) => ({
        ...s,
        deudas: s.deudas.filter((x) => x.id !== id),
        pagos: s.pagos.filter((p) => p.deudaId !== id),
        gastos: s.gastos.map((g) => (g.deudaId === id ? { ...g, deudaId: undefined, compraId: undefined } : g)),
      })),

    guardarCompra: (deudaId, c) =>
      setDatos((s) => ({
        ...s,
        deudas: editarDeuda(s.deudas, deudaId, (d) => ({
          ...d,
          compras: c.id
            ? d.compras.map((x) => (x.id === c.id ? { ...x, ...c, monto: Number(c.monto), cuotas: Math.max(Number(c.cuotas) || 1, 1), saldo: Number(c.saldo) } : x))
            : [...d.compras, nuevaCompra(c)],
        })),
      })),
    eliminarCompra: (deudaId, compraId) =>
      setDatos((s) => ({
        ...s,
        deudas: editarDeuda(s.deudas, deudaId, (d) => ({ ...d, compras: d.compras.filter((c) => c.id !== compraId) })),
        gastos: s.gastos.map((g) => (g.compraId === compraId ? { ...g, deudaId: undefined, compraId: undefined } : g)),
      })),

    /** Pago a una tarjeta/crédito: se reparte como lo hace el banco. */
    pagarDeuda: (deudaId, monto, fecha) =>
      setDatos((s) => {
        const d = s.deudas.find((x) => x.id === deudaId)
        if (!d) return s
        const mes = mesDe(fecha)
        const res = aplicarPago(d, monto, mes)
        const pago = { id: generarId(), deudaId, monto: Number(monto), fecha, mes, reparto: res.reparto, abonos: res.abonos, antes: d.compras }
        return { ...s, pagos: [...s.pagos, pago], deudas: editarDeuda(s.deudas, deudaId, (x) => ({ ...x, compras: res.compras })) }
      }),
    /** Deshace el último pago de una deuda (restaura las compras como estaban). */
    deshacerPago: (pagoId) =>
      setDatos((s) => {
        const p = s.pagos.find((x) => x.id === pagoId)
        if (!p) return s
        return {
          ...s,
          pagos: s.pagos.filter((x) => x.id !== pagoId),
          deudas: p.antes ? editarDeuda(s.deudas, p.deudaId, (d) => ({ ...d, compras: p.antes })) : s.deudas,
        }
      }),

    /** Importa datos leídos de Excel (se agregan a lo que ya existe). */
    importarLote: ({ deudas = [], gastos = [], fijos = [] }) =>
      setDatos((s) => {
        let lista = [...s.deudas]
        for (const nd of deudas) {
          const existente = lista.find((x) => x.nombre.trim().toLowerCase() === nd.nombre.trim().toLowerCase())
          const compras = nd.compras.map(nuevaCompra)
          if (existente) {
            lista = lista.map((x) =>
              x.id === existente.id
                ? { ...x, ...Object.fromEntries(Object.entries(nd.datos).filter(([, v]) => v !== undefined && v !== '')), compras: [...x.compras, ...compras] }
                : x
            )
          } else {
            lista.push({ id: generarId(), ...nd.datos, compras })
          }
        }
        return {
          ...s,
          deudas: lista,
          gastos: [...s.gastos, ...gastos.map((g) => ({ ...g, id: generarId() }))],
          fijos: [...s.fijos, ...fijos.map((f) => ({ ...f, id: generarId() }))],
        }
      }),

    importar: (nuevo) => setDatos(nuevo.version === 2 ? completar(nuevo) : desdeV1(nuevo)),
    resetear: () => setDatos(estadoInicial),
  }

  return [datos, acciones]
}
