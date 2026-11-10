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
    abonosPlaneados: [], // {id, mes, monto, anual}
    jardin: false, // minijuego opcional
  },
  fuentes: [], // ingresos fijos: {id, nombre, monto, frecuencia:'mensual'|'quincenal', dia, dia2, desde}
  recibos: {}, // estado de ingresos fijos por fecha: { 'f:fuenteId:YYYY-MM:n': {estado, fecha, monto} }
  ingresosExtra: [], // ingresos únicos: {id, nombre, monto, fecha, estado:'recibido'|'esperado', fechaOriginal}
  gastos: [], // {id, nombre, monto, categoria, fecha, deudaId?, compraId?}
  fijos: [], // {id, nombre, monto, categoria, dia}
  pagosFijos: {}, // { 'YYYY-MM': [fijoId] }
  deudas: [], // {id, nombre, tipo:'tarjeta'|'credito', color, ultimos4, cupo, tasa, tipoTasa, diaPago, compras:[]}
  pagos: [], // {id, deudaId, monto, fecha, mes, reparto, abonos, antes}
  metas: [], // metas de ahorro: {id, nombre, objetivo, fechaMeta, icono, color, creado, aportes:[{id, monto, fecha}]}
}

const completar = (d) => {
  const datos = { ...estadoInicial, ...d, config: { ...estadoInicial.config, ...d.config } }
  // El "ingreso mensual" de versiones anteriores pasa a ser una fuente fija (Salario)
  if (!d.fuentes && Number(datos.config.ingresoMensual) > 0) {
    datos.fuentes = [{ id: generarId(), nombre: 'Salario', monto: Number(datos.config.ingresoMensual), frecuencia: 'mensual', dia: 30, desde: mesDe(hoyISO()) }]
  }
  return datos
}

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
          facturada: true,
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
        const gasto = { creado: Date.now(), ...g, compraId: g.deudaId ? compraId : undefined, deudaId: g.deudaId || undefined }
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

    guardarIngreso: (i) => setDatos((s) => ({ ...s, ingresosExtra: upsert(s.ingresosExtra, { estado: 'recibido', ...i }) })),
    guardarFuente: (f) => setDatos((s) => ({ ...s, fuentes: upsert(s.fuentes, { desde: mesDe(hoyISO()), ...f }) })),
    eliminarFuente: (id) => setDatos((s) => ({ ...s, fuentes: s.fuentes.filter((x) => x.id !== id) })),
    /** Marca un ingreso (fijo o único) como recibido. */
    recibirIngreso: (item, { monto, fecha }) =>
      setDatos((s) =>
        item.tipo === 'fijo'
          ? { ...s, recibos: { ...s.recibos, [item.id]: { ...s.recibos[item.id], estado: 'recibido', monto: Number(monto), fecha } } }
          : { ...s, ingresosExtra: s.ingresosExtra.map((e) => (e.id === item.id ? { ...e, estado: 'recibido', monto: Number(monto), fecha, fechaOriginal: e.fechaOriginal ?? e.fecha } : e)) }
      ),
    /** Pospone un ingreso a otra fecha (sigue sin contar como recibido). */
    posponerIngreso: (item, fecha) =>
      setDatos((s) =>
        item.tipo === 'fijo'
          ? { ...s, recibos: { ...s.recibos, [item.id]: { ...s.recibos[item.id], estado: 'pospuesto', fecha } } }
          : { ...s, ingresosExtra: s.ingresosExtra.map((e) => (e.id === item.id ? { ...e, fecha, fechaOriginal: e.fechaOriginal ?? e.fecha } : e)) }
      ),
    /** Vuelve un ingreso recibido a "por recibir". */
    deshacerRecibo: (item) =>
      setDatos((s) => {
        if (item.tipo === 'fijo') {
          const { [item.id]: _, ...resto } = s.recibos
          return { ...s, recibos: resto }
        }
        return { ...s, ingresosExtra: s.ingresosExtra.map((e) => (e.id === item.id ? { ...e, estado: 'esperado' } : e)) }
      }),
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
            facturada: true,
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
    /** Devuelve el id del pago para poder deshacerlo. */
    pagarDeuda: (deudaId, monto, fecha) => {
      const id = generarId()
      setDatos((s) => {
        const d = s.deudas.find((x) => x.id === deudaId)
        if (!d) return s
        const mes = mesDe(fecha)
        const res = aplicarPago(d, monto, mes)
        const pago = { id, deudaId, monto: Number(monto), fecha, mes, creado: Date.now(), reparto: res.reparto, abonos: res.abonos, antes: d.compras }
        return { ...s, pagos: [...s.pagos, pago], deudas: editarDeuda(s.deudas, deudaId, (x) => ({ ...x, compras: res.compras })) }
      })
      return id
    },
    /**
     * Deshace cualquier pago: vuelve las compras a como estaban antes de ese pago
     * y vuelve a aplicar, en orden, los pagos que se hicieron después.
     */
    deshacerPago: (pagoId) =>
      setDatos((s) => {
        const idx = s.pagos.findIndex((x) => x.id === pagoId)
        if (idx < 0) return s
        const p = s.pagos[idx]
        const d = s.deudas.find((x) => x.id === p.deudaId)
        const pagos = s.pagos.filter((x) => x.id !== pagoId)
        if (!d) return { ...s, pagos }

        const posteriores = s.pagos.slice(idx + 1).filter((x) => x.deudaId === p.deudaId)
        let compras
        if (p.antes) {
          const actuales = new Set(d.compras.map((c) => c.id))
          const enBase = new Set(p.antes.map((c) => c.id))
          // Compras de antes del pago que todavía existen + compras agregadas después
          const agregadas = d.compras
            .filter((c) => !enBase.has(c.id))
            .map((c) => posteriores.map((q) => q.antes?.find((x) => x.id === c.id)).find(Boolean) ?? c)
          compras = [...p.antes.filter((c) => actuales.has(c.id)), ...agregadas]
        } else {
          // Pagos viejos sin detalle: se devuelve el monto a la compra más antigua
          compras = d.compras.map((c, i) => (i === 0 ? { ...c, saldo: c.saldo + p.monto } : c))
        }

        // Volver a aplicar los pagos posteriores sobre el nuevo estado
        const rehechos = {}
        for (const q of posteriores) {
          const res = aplicarPago({ ...d, compras }, q.monto, q.mes)
          rehechos[q.id] = { ...q, antes: compras, reparto: res.reparto, abonos: res.abonos }
          compras = res.compras
        }
        return {
          ...s,
          pagos: pagos.map((x) => rehechos[x.id] ?? x),
          deudas: editarDeuda(s.deudas, d.id, (x) => ({ ...x, compras })),
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

    // ----- Metas de ahorro -----
    guardarMeta: (m) => setDatos((s) => ({ ...s, metas: upsert(s.metas ?? [], { creado: Date.now(), aportes: [], ...m }) })),
    eliminarMeta: (id) => setDatos((s) => ({ ...s, metas: (s.metas ?? []).filter((m) => m.id !== id) })),
    guardarAporte: (metaId, a) =>
      setDatos((s) => ({ ...s, metas: (s.metas ?? []).map((m) => (m.id === metaId ? { ...m, aportes: upsert(m.aportes ?? [], { creado: Date.now(), ...a }) } : m)) })),
    eliminarAporte: (metaId, id) =>
      setDatos((s) => ({ ...s, metas: (s.metas ?? []).map((m) => (m.id === metaId ? { ...m, aportes: m.aportes.filter((a) => a.id !== id) } : m)) })),

    importar: (nuevo) => setDatos(nuevo.version === 2 ? completar(nuevo) : desdeV1(nuevo)),
    resetear: () => setDatos(estadoInicial),
  }

  return [datos, acciones]
}
