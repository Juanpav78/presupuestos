import { useEffect, useState } from 'react'
import { generarId, hoyISO } from './format'

const CLAVE = 'finanzas-v1'

export const estadoInicial = {
  version: 1,
  config: {
    moneda: 'COP',
    ingresoMensual: 0,
    presupuestoVariable: 0, // límite de gastos del día a día
    pagoDeudasMensual: 0, // total que quieres destinar a deudas (mínimos + extra)
    estrategia: 'avalancha',
  },
  ingresosExtra: [], // {id, nombre, monto, fecha}
  gastos: [], // {id, nombre, monto, categoria, fecha, deudaId?}
  fijos: [], // {id, nombre, monto, categoria, dia}
  pagosFijos: {}, // { 'YYYY-MM': [fijoId] }
  deudas: [], // {id, nombre, tipo, saldo, cupo, tasa, tipoTasa, pagoMinimo, diaPago}
  abonos: [], // {id, deudaId, monto, fecha}
}

const leer = () => {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) {
      const datos = JSON.parse(guardado)
      return { ...estadoInicial, ...datos, config: { ...estadoInicial.config, ...datos.config } }
    }
    // Migración desde la versión anterior de la app (claves 'gastos' y 'presupuesto')
    const viejos = JSON.parse(localStorage.getItem('gastos') || '[]')
    const presupuesto = Number(localStorage.getItem('presupuesto')) || 0
    const mapaCat = { Casa: 'Vivienda', Gastos: 'Otros' }
    return {
      ...estadoInicial,
      config: { ...estadoInicial.config, presupuestoVariable: presupuesto },
      gastos: viejos.map((g) => ({
        id: g.id || generarId(),
        nombre: g.nombre,
        monto: Number(g.cantidad) || 0,
        categoria: mapaCat[g.categoria] || g.categoria || 'Otros',
        fecha: g.fecha ? new Date(g.fecha).toISOString().slice(0, 10) : hoyISO(),
      })),
    }
  } catch {
    return estadoInicial
  }
}

export function useFinanzas() {
  const [datos, setDatos] = useState(leer)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos))
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }, [datos])

  const ajustarSaldo = (deudas, deudaId, delta) =>
    deudas.map((d) => (d.id === deudaId ? { ...d, saldo: Math.max(0, Number(d.saldo) + delta) } : d))

  const acciones = {
    setConfig: (cambios) => setDatos((s) => ({ ...s, config: { ...s.config, ...cambios } })),

    // Gastos variables. Si se pagan con tarjeta (deudaId) suben el saldo de esa tarjeta.
    guardarGasto: (g) =>
      setDatos((s) => {
        let deudas = s.deudas
        const anterior = s.gastos.find((x) => x.id === g.id)
        if (anterior?.deudaId) deudas = ajustarSaldo(deudas, anterior.deudaId, -anterior.monto)
        if (g.deudaId) deudas = ajustarSaldo(deudas, g.deudaId, g.monto)
        const gastos = anterior
          ? s.gastos.map((x) => (x.id === g.id ? g : x))
          : [...s.gastos, { ...g, id: generarId() }]
        return { ...s, gastos, deudas }
      }),
    eliminarGasto: (id) =>
      setDatos((s) => {
        const g = s.gastos.find((x) => x.id === id)
        const deudas = g?.deudaId ? ajustarSaldo(s.deudas, g.deudaId, -g.monto) : s.deudas
        return { ...s, gastos: s.gastos.filter((x) => x.id !== id), deudas }
      }),

    guardarIngreso: (i) =>
      setDatos((s) => ({
        ...s,
        ingresosExtra: i.id
          ? s.ingresosExtra.map((x) => (x.id === i.id ? i : x))
          : [...s.ingresosExtra, { ...i, id: generarId() }],
      })),
    eliminarIngreso: (id) =>
      setDatos((s) => ({ ...s, ingresosExtra: s.ingresosExtra.filter((x) => x.id !== id) })),

    // Gastos fijos mensuales
    guardarFijo: (f) =>
      setDatos((s) => ({
        ...s,
        fijos: f.id ? s.fijos.map((x) => (x.id === f.id ? f : x)) : [...s.fijos, { ...f, id: generarId() }],
      })),
    eliminarFijo: (id) => setDatos((s) => ({ ...s, fijos: s.fijos.filter((x) => x.id !== id) })),
    togglePagoFijo: (mes, id) =>
      setDatos((s) => {
        const lista = s.pagosFijos[mes] ?? []
        const nueva = lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]
        return { ...s, pagosFijos: { ...s.pagosFijos, [mes]: nueva } }
      }),

    // Deudas y tarjetas
    guardarDeuda: (d) =>
      setDatos((s) => ({
        ...s,
        deudas: d.id ? s.deudas.map((x) => (x.id === d.id ? d : x)) : [...s.deudas, { ...d, id: generarId() }],
      })),
    eliminarDeuda: (id) =>
      setDatos((s) => ({
        ...s,
        deudas: s.deudas.filter((x) => x.id !== id),
        abonos: s.abonos.filter((a) => a.deudaId !== id),
        gastos: s.gastos.map((g) => (g.deudaId === id ? { ...g, deudaId: undefined } : g)),
      })),
    registrarAbono: (a) =>
      setDatos((s) => ({
        ...s,
        abonos: [...s.abonos, { ...a, id: generarId() }],
        deudas: ajustarSaldo(s.deudas, a.deudaId, -a.monto),
      })),
    eliminarAbono: (id) =>
      setDatos((s) => {
        const a = s.abonos.find((x) => x.id === id)
        return {
          ...s,
          abonos: s.abonos.filter((x) => x.id !== id),
          deudas: a ? ajustarSaldo(s.deudas, a.deudaId, a.monto) : s.deudas,
        }
      }),

    importar: (nuevo) => setDatos({ ...estadoInicial, ...nuevo, config: { ...estadoInicial.config, ...nuevo.config } }),
    resetear: () => setDatos(estadoInicial),
  }

  return [datos, acciones]
}
