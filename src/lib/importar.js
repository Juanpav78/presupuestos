// Convierte hojas de Excel en tarjetas, compras, gastos y fijos (y viceversa).
import { serialAFecha } from './excel'
import { COLORES, hoyISO, aISO } from './format'
import { normalizarCategoria } from './categorias'
import { tasaMensual } from './deudas'

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

const ALIAS = {
  tarjeta: ['tarjetaocredito', 'tarjeta', 'credito', 'tarjetacredito', 'deuda', 'producto', 'banco', 'nombretarjeta', 'nombre'],
  tipo: ['tipo', 'tipodeuda'],
  descripcion: ['descripcion', 'compra', 'detalle', 'concepto'],
  fecha: ['fecha', 'fechacompra', 'fechadecompra'],
  monto: ['monto', 'valor', 'valorcompra', 'montooriginal', 'total', 'cantidad', 'valortotal'],
  cuotas: ['cuotas', 'numerocuotas', 'ncuotas', 'nocuotas', 'plazo', 'cuotastotales', 'totalcuotas'],
  cuotasPagadas: ['cuotaspagadas', 'pagadas', 'cuotasyapagadas'],
  saldo: ['saldopendiente', 'saldo', 'saldoactual', 'debo', 'loquedebo'],
  tasa: ['interes', 'tasa', 'tasainteres', 'tasadeinteres', 'interestarjeta', 'tasaea', 'tasamv', 'interesea'],
  tipoTasa: ['tipotasa', 'tipodetasa'],
  pago: ['pagomensual', 'pago', 'cuota', 'valorcuota', 'cuotamensual', 'pagominimo'],
  cupo: ['cupo', 'cupototal'],
  diaPago: ['diadepago', 'diapago', 'fechalimite', 'diadelpago', 'dia', 'diadecobro'],
  color: ['color'],
  categoria: ['categoria'],
}

const mapearColumnas = (encabezados, campos) => {
  const h = encabezados.map(norm)
  const mapa = {}
  for (const campo of campos) {
    for (const alias of ALIAS[campo]) {
      const i = h.findIndex((x, idx) => x === alias && !Object.values(mapa).includes(idx))
      if (i >= 0) { mapa[campo] = i; break }
    }
  }
  // Segundo intento: encabezados que contienen la palabra (ej. "Interés de tarjeta", "Valor de la compra")
  for (const campo of campos) {
    if (mapa[campo] !== undefined || !CONTIENE[campo]) continue
    const [palabras, excluir = []] = CONTIENE[campo]
    const i = h.findIndex((x, idx) => !Object.values(mapa).includes(idx) && palabras.some((p) => x.includes(p)) && !excluir.some((e) => x.includes(e)))
    if (i >= 0) mapa[campo] = i
  }
  return mapa
}

const CONTIENE = {
  tarjeta: [['tarjeta', 'credito', 'banco', 'nombre'], ['tipo']],
  descripcion: [['descrip', 'detalle', 'concepto', 'compra', 'articulo', 'producto'], ['fecha', 'valor']],
  fecha: [['fecha'], ['limite', 'pago', 'corte']],
  monto: [['valor', 'monto', 'precio', 'importe'], ['cuota', 'pago', 'saldo']],
  cuotas: [['cuotas', 'plazo', 'meses'], ['pagad', 'valor']],
  cuotasPagadas: [['pagad']],
  saldo: [['saldo', 'debo', 'pendiente', 'deuda'], []],
  tasa: [['interes', 'tasa'], ['tipo']],
  tipoTasa: [['tipotasa', 'tipodetasa'], []],
  pago: [['pago', 'cuota', 'abono'], ['dia', 'fecha', 'pagad', 'cuotas']],
  cupo: [['cupo', 'limite'], ['fecha', 'dia']],
  diaPago: [['dia', 'fechalimite', 'corte'], []],
  categoria: [['categ', 'tipo'], []],
}

export const numero = (v) => {
  if (typeof v === 'number') return v
  if (v === undefined || v === null) return undefined
  let s = String(v).replace(/[^0-9.,-]/g, '')
  if (!s) return undefined
  const ultPunto = s.lastIndexOf('.')
  const ultComa = s.lastIndexOf(',')
  if (ultPunto >= 0 && ultComa >= 0) {
    s = ultComa > ultPunto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (ultComa >= 0) {
    s = /,\d{1,2}$/.test(s) && (s.match(/,/g) || []).length === 1 ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if (ultPunto >= 0) {
    if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

export const fecha = (v) => {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v === 'number') return v > 20000 && v < 80000 ? serialAFecha(v) : undefined
  const s = String(v).trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return aISO(new Date(+m[1], +m[2] - 1, +m[3]))
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]
    return aISO(new Date(y, +m[2] - 1, +m[1])) // formato día/mes/año
  }
  return undefined
}

const texto = (v) => (v === undefined || v === null ? '' : String(v).trim())

const elegirColor = (v, i) => {
  const t = norm(v)
  const k = Object.keys(COLORES).find((c) => c === t || norm(COLORES[c].nombre) === t)
  return k ?? Object.keys(COLORES)[i % Object.keys(COLORES).length]
}

const tipoHoja = (nombre, enc) => {
  const n = norm(nombre)
  const h = enc.map(norm)
  if (n.includes('instruc') || n.includes('ayuda')) return null
  if (n.includes('fijo')) return 'fijos'
  if (n.includes('gasto')) return 'gastos'
  if (n.includes('tarjeta') || n.includes('credito') || n.includes('deuda') || n.includes('compra')) return 'deudas'
  if (h.some((x) => ALIAS.cuotas.includes(x) || ALIAS.tasa.includes(x) || ALIAS.saldo.includes(x))) return 'deudas'
  if (h.includes('categoria') && h.some((x) => x.startsWith('dia'))) return 'fijos'
  if (h.includes('fecha') && h.some((x) => ALIAS.monto.includes(x))) return 'gastos'
  return null
}

/** Analiza el libro y devuelve lo que se va a importar. */
export function interpretar(hojas) {
  const deudas = {}
  const gastos = []
  const fijos = []
  const avisos = []

  for (const [nombreHoja, filas] of Object.entries(hojas)) {
    // La fila de encabezados es la primera fila con al menos 2 celdas de texto
    const iEnc = filas.findIndex((f) => f && f.filter((c) => typeof c === 'string' && c.trim()).length >= 2)
    if (iEnc < 0) continue
    const enc = filas[iEnc].map(texto)
    const tipo = tipoHoja(nombreHoja, enc)
    if (!tipo) continue
    const datos = filas.slice(iEnc + 1).filter((f) => f && f.some((c) => c !== undefined && c !== ''))

    if (tipo === 'deudas') {
      const col = mapearColumnas(enc, ['tarjeta', 'tipo', 'descripcion', 'fecha', 'monto', 'cuotas', 'cuotasPagadas', 'saldo', 'tasa', 'tipoTasa', 'pago', 'cupo', 'diaPago', 'color'])
      if (col.tarjeta === undefined) { avisos.push(`La hoja "${nombreHoja}" no tiene columna "Tarjeta o crédito".`); continue }
      datos.forEach((f, i) => {
        const v = (k) => (col[k] !== undefined ? f[col[k]] : undefined)
        const nombre = texto(v('tarjeta'))
        if (!nombre) return
        let tasa = numero(v('tasa'))
        if (tasa !== undefined && tasa > 0 && tasa < 1) tasa = tasa * 100 // 0.285 → 28.5 (celda con formato %)
        const tipoTasaTxt = norm(v('tipoTasa'))
        const tipoTasa = tipoTasaTxt.includes('mv') || tipoTasaTxt.includes('mens') ? 'MV' : tipoTasaTxt.includes('ea') || tipoTasaTxt.includes('anual') ? 'EA' : tasa !== undefined && tasa <= 5 ? 'MV' : 'EA'
        const tipoTxt = norm(v('tipo')) + ' ' + norm(nombre)
        const esCredito = /credito|prestamo|libranza|vehiculo|hipoteca|libreinversion/.test(tipoTxt) && !/tarjeta/.test(norm(v('tipo')))
        const clave = nombre.toLowerCase()
        if (!deudas[clave]) {
          deudas[clave] = {
            nombre,
            datos: { nombre, tipo: esCredito ? 'credito' : 'tarjeta', color: elegirColor(v('color'), Object.keys(deudas).length), tasa: tasa ?? 0, tipoTasa, cupo: numero(v('cupo')) ?? 0, diaPago: numero(v('diaPago')) ?? undefined },
            compras: [],
          }
        } else {
          const d = deudas[clave].datos
          if (tasa !== undefined && !d.tasa) Object.assign(d, { tasa, tipoTasa })
          if (numero(v('cupo')) && !d.cupo) d.cupo = numero(v('cupo'))
          if (numero(v('diaPago')) && !d.diaPago) d.diaPago = numero(v('diaPago'))
        }
        const d = deudas[clave].datos
        let monto = numero(v('monto'))
        let saldo = numero(v('saldo'))
        const pago = numero(v('pago'))
        const pagadas = Math.max(Math.round(numero(v('cuotasPagadas')) ?? 0), 0)
        let cuotas = Math.round(numero(v('cuotas')) ?? 0)
        if (!monto && !saldo) { avisos.push(`Fila ${iEnc + i + 2} de "${nombreHoja}": sin monto ni saldo, se omitió.`); return }
        if (!monto) monto = saldo
        if (saldo === undefined) saldo = cuotas > 0 && pagadas > 0 ? Math.max(monto * (1 - pagadas / cuotas), 0) : monto
        if (!cuotas) {
          // Sin número de cuotas: se estima con el pago mensual
          const r = tasaMensual(d)
          if (pago > 0) {
            const n = r > 0 && pago > saldo * r ? Math.ceil(-Math.log(1 - (r * saldo) / pago) / Math.log(1 + r)) : Math.ceil(saldo / pago)
            cuotas = pagadas + Math.max(n || 1, 1)
          } else cuotas = esCredito ? 12 : 1
        }
        deudas[clave].compras.push({
          nombre: texto(v('descripcion')) || (esCredito ? 'Saldo del crédito' : 'Compra'),
          fecha: fecha(v('fecha')) ?? hoyISO(),
          monto,
          saldo,
          cuotas: Math.max(cuotas, pagadas + 1),
          cuotasPagadas: Math.min(pagadas, Math.max(cuotas - 1, 0)),
          ...(esCredito && pago > 0 ? { cuotaFija: pago } : {}),
        })
      })
    }

    if (tipo === 'gastos') {
      const col = mapearColumnas(enc, ['fecha', 'descripcion', 'categoria', 'monto'])
      if (col.descripcion === undefined) col.descripcion = mapearColumnas(enc, ['tarjeta']).tarjeta // columna "Nombre"
      datos.forEach((f) => {
        const monto = numero(f[col.monto])
        if (!monto) return
        gastos.push({
          nombre: texto(f[col.descripcion]) || 'Gasto',
          monto,
          categoria: normalizarCategoria(f[col.categoria]),
          fecha: fecha(f[col.fecha]) ?? hoyISO(),
        })
      })
    }

    if (tipo === 'fijos') {
      const col = mapearColumnas(enc, ['tarjeta', 'monto', 'categoria', 'diaPago'])
      datos.forEach((f) => {
        const monto = numero(f[col.monto])
        const nombre = texto(f[col.tarjeta])
        if (!monto || !nombre) return
        fijos.push({ nombre, monto, categoria: normalizarCategoria(f[col.categoria]), dia: Math.min(Math.max(Math.round(numero(f[col.diaPago]) ?? 1), 1), 31) })
      })
    }
  }

  return { deudas: Object.values(deudas), gastos, fijos, avisos }
}

// ---------- Plantilla y exportación ----------
const ENC_DEUDAS = ['Tarjeta o crédito', 'Tipo', 'Descripción', 'Fecha', 'Monto', 'Cuotas', 'Cuotas pagadas', 'Saldo pendiente', 'Interés %', 'Tipo tasa', 'Pago mensual', 'Cupo', 'Día de pago', 'Color']
const ENC_GASTOS = ['Fecha', 'Descripción', 'Categoría', 'Monto']
const ENC_FIJOS = ['Nombre', 'Monto', 'Categoría', 'Día de pago']

export function plantilla() {
  const hoy = hoyISO()
  return [
    {
      nombre: 'Tarjetas y créditos',
      filas: [
        ENC_DEUDAS,
        ['Visa Oro', 'Tarjeta', 'Celular', hoy, 2400000, 12, 3, '', 28.5, 'EA', '', 6000000, 15, 'Oro'],
        ['Visa Oro', 'Tarjeta', 'Mercado', hoy, 350000, 1, 0, '', '', '', '', '', '', ''],
        ['Mastercard', 'Tarjeta', 'Saldo anterior', hoy, '', '', '', 1800000, 2.1, 'MV', 150000, 4000000, 5, 'Negro'],
        ['Préstamo libre inversión', 'Crédito', '', hoy, 15000000, 48, 10, 11200000, 18, 'EA', 440000, '', 28, 'Azul'],
      ],
    },
    { nombre: 'Gastos', filas: [ENC_GASTOS, [hoy, 'Almuerzo', 'Comida', 22000], [hoy, 'Gasolina', 'Transporte', 80000]] },
    { nombre: 'Fijos', filas: [ENC_FIJOS, ['Arriendo', 1300000, 'Vivienda', 5], ['Internet', 95000, 'Servicios', 12]] },
    {
      nombre: 'Instrucciones',
      filas: [
        ['Cómo llenar este archivo'],
        ['Tarjetas y créditos: una fila por compra o deuda. Repite el nombre de la tarjeta para agregar varias compras a la misma.'],
        ['Si no tienes el detalle de compras, pon una sola fila con el "Saldo pendiente" y el "Pago mensual".'],
        ['Interés %: el que dice tu extracto. Tipo tasa: EA (efectiva anual) o MV (mensual vencida).'],
        ['Cuotas pagadas y Saldo pendiente son opcionales: si no los pones, se calculan.'],
        ['Créditos (préstamos, vehículo): pon Tipo = Crédito y el Pago mensual (cuota fija).'],
        ['Color: Oro, Negro, Azul, Morado, Verde, Rojo, Rosa, Naranja, Turquesa o Plata.'],
        ['Fechas en formato día/mes/año o año-mes-día. Puedes borrar las hojas que no uses.'],
      ],
    },
  ]
}

export function exportar(datos) {
  const filasDeudas = [ENC_DEUDAS]
  datos.deudas.forEach((d) => {
    const base = [d.nombre, d.tipo === 'credito' ? 'Crédito' : 'Tarjeta']
    const extra = [d.tasa, d.tipoTasa, '', d.cupo || '', d.diaPago || '', COLORES[d.color]?.nombre ?? '']
    if (!d.compras.length) filasDeudas.push([...base, '', '', '', '', '', 0, ...extra])
    d.compras.forEach((c) => {
      const fila = [...base, c.nombre, c.fecha, c.monto, c.cuotas, c.cuotasPagadas || 0, Math.round(c.saldo), ...extra]
      fila[10] = c.cuotaFija || ''
      filasDeudas.push(fila)
    })
  })
  return [
    { nombre: 'Tarjetas y créditos', filas: filasDeudas },
    { nombre: 'Gastos', filas: [ENC_GASTOS, ...[...datos.gastos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((g) => [g.fecha, g.nombre, g.categoria, g.monto])] },
    { nombre: 'Fijos', filas: [ENC_FIJOS, ...datos.fijos.map((f) => [f.nombre, Number(f.monto), f.categoria, Number(f.dia)])] },
    {
      nombre: 'Pagos',
      filas: [
        ['Fecha', 'Tarjeta o crédito', 'Monto', 'A intereses', 'A cuotas', 'Abono a capital'],
        ...datos.pagos.map((p) => [p.fecha, datos.deudas.find((d) => d.id === p.deudaId)?.nombre ?? '', p.monto, p.reparto?.intereses ?? 0, p.reparto?.cuotas ?? 0, p.reparto?.abono ?? 0]),
      ],
    },
  ]
}
