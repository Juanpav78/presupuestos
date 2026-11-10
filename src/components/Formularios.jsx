import { useMemo, useRef, useState } from 'react'
import {
  LuCreditCard, LuLandmark, LuFileSpreadsheet, LuArrowRight, LuArrowLeft, LuDownload, LuUpload,
  LuCircleAlert, LuSparkles, LuWallet,
} from 'react-icons/lu'
import { Formulario, CampoMonto, Chips, Segmentado, SelectorColor, avisar } from './UI'
import TarjetaVisual from './TarjetaVisual'
import { CATEGORIAS, IconoCategoria } from '../lib/categorias'
import { hoyISO, mesActual, mesDe, formatFecha, degradado } from '../lib/format'
import { aplicarPago, cobroDelMes, cuotaFrancesa, saldoDeuda, tasaMensual } from '../lib/deudas'
import { leerArchivo, crearExcel, descargar } from '../lib/excel'
import { interpretar, plantilla } from '../lib/importar'

const opcionesCategoria = Object.keys(CATEGORIAS).map((k) => ({ valor: k, texto: k }))
const CUOTAS = [1, 3, 6, 12, 24, 36].map((n) => ({ valor: n, texto: n === 1 ? '1 cuota' : `${n}` }))
const fechaPorDefecto = (mes) => (mes === mesActual() ? hoyISO() : `${mes}-01`)

// ---------- Categorías con íconos ----------
function SelectorCategoria({ valor, onChange }) {
  return (
    <div className="categorias" role="radiogroup" aria-label="Categoría">
      {Object.keys(CATEGORIAS).map((c) => (
        <button key={c} type="button" role="radio" aria-checked={valor === c} className={valor === c ? 'activo' : ''} onClick={() => onChange(c)}>
          <IconoCategoria categoria={c} tamano={36} />
          <span>{c}</span>
        </button>
      ))}
    </div>
  )
}

// ---------- Gasto del día a día ----------
export function FormGasto({ datos, mes, inicial, onGuardar, onEliminar }) {
  const tarjetas = datos.deudas.filter((d) => d.tipo === 'tarjeta')
  const [v, setV] = useState(
    inicial
      ? { ...inicial, deudaId: inicial.deudaId ?? '', cuotas: datos.deudas.find((d) => d.id === inicial.deudaId)?.compras.find((c) => c.id === inicial.compraId)?.cuotas ?? 1 }
      : { nombre: '', monto: '', categoria: 'Comida', fecha: fechaPorDefecto(mes), deudaId: '', cuotas: 1 }
  )
  const [error, setError] = useState('')
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }))

  const enviar = (e) => {
    e.preventDefault()
    if (!v.monto) return setError('Escribe el monto')
    if (!v.nombre.trim()) return setError('Escribe una descripción')
    onGuardar({ ...v, monto: Number(v.monto), cuotas: v.deudaId ? Number(v.cuotas) || 1 : undefined, deudaId: v.deudaId || undefined })
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <CampoMonto grande value={v.monto} onChange={(n) => set('monto', n)} aria-label="Monto" autoFocus />
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="g-nombre">Descripción</label>
        <input id="g-nombre" value={v.nombre} placeholder="Ej: Mercado, almuerzo, gasolina" onChange={(e) => set('nombre', e.target.value)} />
      </div>
      <div className="campo">
        <span className="campo-etiqueta">Categoría</span>
        <SelectorCategoria valor={v.categoria} onChange={(c) => set('categoria', c)} />
      </div>
      <div className="campo">
        <span className="campo-etiqueta">¿Cómo pagaste?</span>
        <Chips
          etiqueta="Medio de pago"
          valor={v.deudaId}
          onChange={(x) => set('deudaId', x)}
          opciones={[{ valor: '', texto: 'Efectivo / débito' }, ...tarjetas.map((t) => ({ valor: t.id, texto: t.nombre }))]}
        />
      </div>
      {v.deudaId && (
        <div className="campo aparecer">
          <span className="campo-etiqueta">¿A cuántas cuotas?</span>
          <Chips etiqueta="Cuotas" valor={Number(v.cuotas)} onChange={(x) => set('cuotas', x)} opciones={CUOTAS} />
          <small>
            Se suma a la tarjeta como una compra.{' '}
            {v.monto > 0 && Number(v.cuotas) > 1 && `Cuota aprox. ${new Intl.NumberFormat('es-CO').format(Math.round(v.monto / v.cuotas))} + intereses.`}
            {Number(v.cuotas) === 1 && ' A 1 cuota normalmente no cobra intereses.'}
          </small>
        </div>
      )}
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="g-fecha">Fecha</label>
        <input id="g-fecha" type="date" value={v.fecha} onChange={(e) => set('fecha', e.target.value)} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-acciones">
        {onEliminar && (
          <button type="button" className="btn btn-peligro" onClick={() => confirm('¿Eliminar este gasto?') && onEliminar()}>Eliminar</button>
        )}
        <button type="submit" className="btn btn-primario">{inicial ? 'Guardar cambios' : 'Añadir gasto'}</button>
      </div>
    </form>
  )
}

export function FormFijo({ inicial, onGuardar, onEliminar }) {
  const [cat, setCat] = useState(inicial?.categoria ?? 'Vivienda')
  return (
    <Formulario
      inicial={inicial ?? { nombre: '', monto: '', dia: 1 }}
      campos={[
        { nombre: 'monto', etiqueta: 'Monto mensual', tipo: 'monto', grande: true, requerido: true },
        { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, placeholder: 'Ej: Arriendo, Internet, Netflix' },
        { nombre: 'dia', etiqueta: 'Día de pago', tipo: 'numero', min: 1, max: 31, paso: 1 },
      ]}
      pie={() => (
        <div className="campo">
          <span className="campo-etiqueta">Categoría</span>
          <SelectorCategoria valor={cat} onChange={setCat} />
        </div>
      )}
      onGuardar={(f) => onGuardar({ ...f, categoria: cat, dia: Math.min(Math.max(Math.round(f.dia) || 1, 1), 31) })}
      onEliminar={onEliminar}
      textoBoton={inicial ? 'Guardar cambios' : 'Añadir gasto fijo'}
    />
  )
}

export function FormIngreso({ mes, inicial, onGuardar, onEliminar }) {
  return (
    <Formulario
      inicial={inicial ?? { nombre: '', monto: '', fecha: fechaPorDefecto(mes) }}
      campos={[
        { nombre: 'monto', etiqueta: 'Monto', tipo: 'monto', grande: true, requerido: true },
        { nombre: 'nombre', etiqueta: 'Concepto', tipo: 'texto', requerido: true, placeholder: 'Ej: Prima, freelance, bono' },
        { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
      ]}
      onGuardar={onGuardar}
      onEliminar={onEliminar}
      textoBoton={inicial ? 'Guardar cambios' : 'Añadir ingreso'}
    />
  )
}

// ---------- Asistente para crear tarjeta o crédito ----------
export function AsistenteDeuda({ fmt, onCrear, onImportar }) {
  const [paso, setPaso] = useState(0)
  const [d, setD] = useState({ tipo: 'tarjeta', nombre: '', color: 'oro', ultimos4: '', tasa: '', tipoTasa: 'EA', cupo: '', diaPago: '' })
  const [s, setS] = useState({ monto: '', cuotas: 12, cuotaFija: '' })
  const [error, setError] = useState('')
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const esCredito = d.tipo === 'credito'

  const r = tasaMensual({ tasa: Number(d.tasa) || 0, tipoTasa: d.tipoTasa })
  const cuotaSugerida = s.monto ? Math.round(cuotaFrancesa(s.monto, r, Number(s.cuotas) || 1)) : 0
  const vista = {
    ...d,
    nombre: d.nombre || (esCredito ? 'Mi crédito' : 'Mi tarjeta'),
    cupo: Number(d.cupo) || 0,
    tasa: Number(d.tasa) || 0,
    compras: s.monto ? [{ id: 'x', saldo: s.monto, monto: s.monto, cuotas: Number(s.cuotas) || 1, cuotaFija: esCredito ? Number(s.cuotaFija) || cuotaSugerida : undefined }] : [],
  }

  const siguiente = () => {
    if (paso === 1 && !d.nombre.trim()) return setError('Ponle un nombre')
    if (paso === 2 && d.tasa === '') return setError('Escribe la tasa de interés (está en tu extracto)')
    setError('')
    setPaso(paso + 1)
  }
  const guardar = () => {
    onCrear(
      { ...d, nombre: d.nombre.trim(), tasa: Number(d.tasa) || 0, cupo: Number(d.cupo) || 0, diaPago: Number(d.diaPago) || undefined, ultimos4: d.ultimos4 || undefined },
      { monto: Number(s.monto) || 0, cuotas: Number(s.cuotas) || 1, cuotaFija: Number(s.cuotaFija) || cuotaSugerida }
    )
  }

  return (
    <div className="asistente">
      <div className="pasos" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} className={i <= paso ? 'hecho' : ''} />)}
      </div>

      {paso > 0 && <TarjetaVisual deuda={vista} fmt={fmt} estilo={{ marginBottom: 4 }} />}

      <div className="paso" key={paso}>
        {paso === 0 && (
          <>
            <p className="paso-titulo">¿Qué quieres agregar?</p>
            <div className="opciones-grandes">
              <button className="opcion-grande" onClick={() => { setD((x) => ({ ...x, tipo: 'tarjeta', color: 'oro' })); setPaso(1) }}>
                <span className="og-icono"><LuCreditCard /></span>
                <strong>Tarjeta de crédito</strong>
                <small>Con cupo, compras a cuotas e intereses</small>
              </button>
              <button className="opcion-grande" onClick={() => { setD((x) => ({ ...x, tipo: 'credito', color: 'azul' })); setS((x) => ({ ...x, cuotas: 24 })); setPaso(1) }}>
                <span className="og-icono"><LuLandmark /></span>
                <strong>Crédito o préstamo</strong>
                <small>Libre inversión, vehículo, libranza…</small>
              </button>
              <button className="opcion-grande secundaria" onClick={onImportar}>
                <span className="og-icono"><LuFileSpreadsheet /></span>
                <strong>Subir desde Excel</strong>
                <small>Carga varias tarjetas y compras de una vez</small>
              </button>
            </div>
          </>
        )}

        {paso === 1 && (
          <>
            <p className="paso-titulo">Dale nombre y color</p>
            <div className="campo">
              <label className="campo-etiqueta" htmlFor="d-nombre">Nombre</label>
              <input id="d-nombre" autoFocus value={d.nombre} placeholder={esCredito ? 'Ej: Libre inversión Bancolombia' : 'Ej: Visa Davivienda'} onChange={(e) => set('nombre', e.target.value)} />
            </div>
            <div className="campo">
              <span className="campo-etiqueta">Color</span>
              <SelectorColor valor={d.color} onChange={(c) => set('color', c)} />
            </div>
            {!esCredito && (
              <div className="campo">
                <label className="campo-etiqueta" htmlFor="d-u4">Últimos 4 dígitos (opcional)</label>
                <input id="d-u4" inputMode="numeric" maxLength={4} value={d.ultimos4} placeholder="1234" onChange={(e) => set('ultimos4', e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </div>
            )}
          </>
        )}

        {paso === 2 && (
          <>
            <p className="paso-titulo">Condiciones</p>
            <div className="fila-2">
              <div className="campo">
                <label className="campo-etiqueta" htmlFor="d-tasa">Tasa de interés %</label>
                <input id="d-tasa" autoFocus inputMode="decimal" value={d.tasa} placeholder={d.tipoTasa === 'EA' ? '28,5' : '2,1'} onChange={(e) => set('tasa', e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} />
              </div>
              <div className="campo">
                <label className="campo-etiqueta" htmlFor="d-dia">Día de pago</label>
                <input id="d-dia" inputMode="numeric" value={d.diaPago} placeholder="15" onChange={(e) => set('diaPago', e.target.value.replace(/\D/g, '').slice(0, 2))} />
              </div>
            </div>
            <Segmentado etiqueta="Tipo de tasa" valor={d.tipoTasa} onChange={(v) => set('tipoTasa', v)} opciones={[{ valor: 'EA', texto: 'Efectiva anual (E.A.)' }, { valor: 'MV', texto: 'Mensual (M.V.)' }]} />
            <small className="nota">La encuentras en tu extracto o en la app del banco.</small>
            {!esCredito && (
              <div className="campo">
                <span className="campo-etiqueta">Cupo total</span>
                <CampoMonto value={d.cupo} onChange={(n) => set('cupo', n)} aria-label="Cupo total" />
              </div>
            )}
          </>
        )}

        {paso === 3 && (
          <>
            <p className="paso-titulo">{esCredito ? '¿Cuánto debes del crédito?' : '¿Cuánto debes hoy en la tarjeta?'}</p>
            <CampoMonto grande value={s.monto} onChange={(n) => setS((x) => ({ ...x, monto: n }))} aria-label="Saldo actual" autoFocus />
            <div className="campo">
              <span className="campo-etiqueta">{esCredito ? 'Cuotas que te faltan' : '¿En cuántas cuotas lo tienes?'}</span>
              <Chips etiqueta="Cuotas" valor={Number(s.cuotas)} onChange={(n) => setS((x) => ({ ...x, cuotas: n }))} opciones={esCredito ? [12, 24, 36, 48, 60, 72].map((n) => ({ valor: n, texto: `${n}` })) : CUOTAS} />
              <input inputMode="numeric" aria-label="Otro número de cuotas" placeholder="Otro número de cuotas" value={(esCredito ? [12, 24, 36, 48, 60, 72] : [1, 3, 6, 12, 24, 36]).includes(Number(s.cuotas)) ? '' : s.cuotas} onChange={(e) => setS((x) => ({ ...x, cuotas: e.target.value.replace(/\D/g, '') }))} />
            </div>
            {esCredito && (
              <div className="campo">
                <span className="campo-etiqueta">Cuota mensual</span>
                <CampoMonto value={s.cuotaFija} onChange={(n) => setS((x) => ({ ...x, cuotaFija: n }))} placeholder={cuotaSugerida ? new Intl.NumberFormat('es-CO').format(cuotaSugerida) : '0'} aria-label="Cuota mensual" />
                <small>Si la dejas vacía calculamos {cuotaSugerida ? fmt.dinero(cuotaSugerida) : 'la cuota'} con la tasa.</small>
              </div>
            )}
            {!esCredito && (
              <small className="nota">
                <LuSparkles aria-hidden="true" /> Si tienes varias compras a distintas cuotas, puedes dejar esto en 0 y agregarlas una por una, o subirlas desde Excel.
              </small>
            )}
          </>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {paso > 0 && (
        <div className="form-acciones">
          <button className="btn btn-secundario" onClick={() => { setError(''); setPaso(paso - 1) }} aria-label="Atrás"><LuArrowLeft /></button>
          {paso < 3 ? (
            <button className="btn btn-primario" onClick={siguiente}>Siguiente <LuArrowRight aria-hidden="true" /></button>
          ) : (
            <button className="btn btn-primario" onClick={guardar}>Guardar {esCredito ? 'crédito' : 'tarjeta'}</button>
          )}
        </div>
      )}
    </div>
  )
}

export function FormEditarDeuda({ deuda, onGuardar, onEliminar }) {
  const esCredito = deuda.tipo === 'credito'
  return (
    <Formulario
      inicial={{ ...deuda, ultimos4: deuda.ultimos4 ?? '', diaPago: deuda.diaPago ?? '' }}
      campos={[
        { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
        { nombre: 'color', etiqueta: 'Color', tipo: 'color' },
        { nombre: 'ultimos4', etiqueta: 'Últimos 4 dígitos', tipo: 'texto', maxLength: 4, oculto: () => esCredito },
        { nombre: 'tasa', etiqueta: 'Tasa de interés %', tipo: 'numero', requerido: true },
        { nombre: 'tipoTasa', etiqueta: 'Tipo de tasa', tipo: 'segmento', opciones: [{ valor: 'EA', texto: 'E.A.' }, { valor: 'MV', texto: 'M.V.' }] },
        { nombre: 'cupo', etiqueta: 'Cupo total', tipo: 'monto', oculto: () => esCredito },
        { nombre: 'diaPago', etiqueta: 'Día de pago', tipo: 'numero', min: 1, max: 31, paso: 1, vacio: undefined },
      ]}
      onGuardar={(x) => onGuardar({ ...x, ultimos4: String(x.ultimos4 || '').replace(/\D/g, '').slice(0, 4) || undefined })}
      onEliminar={onEliminar}
    />
  )
}

export function FormCompra({ deuda, inicial, onGuardar, onEliminar }) {
  const esCredito = deuda.tipo === 'credito'
  const nuevo = !inicial
  return (
    <Formulario
      inicial={inicial ?? { nombre: '', monto: '', fecha: hoyISO(), cuotas: 1, cuotasPagadas: 0 }}
      campos={[
        { nombre: 'monto', etiqueta: 'Valor de la compra', tipo: 'monto', grande: true, requerido: true },
        { nombre: 'nombre', etiqueta: 'Descripción', tipo: 'texto', requerido: true, placeholder: 'Ej: Celular, tiquetes, mercado' },
        { nombre: 'cuotas', etiqueta: 'Número de cuotas', tipo: 'chips', opciones: esCredito ? [12, 24, 36, 48, 60, 72].map((n) => ({ valor: n, texto: `${n}` })) : CUOTAS },
        { nombre: 'cuotas', etiqueta: 'Otro número de cuotas', tipo: 'numero', min: 1, paso: 1 },
        { nombre: 'cuotasPagadas', etiqueta: 'Cuotas ya pagadas', tipo: 'numero', min: 0, paso: 1, ayuda: 'Si es una compra vieja, cuántas cuotas ya pagaste.' },
        { nombre: 'saldo', etiqueta: 'Saldo pendiente (opcional)', tipo: 'monto', oculto: () => nuevo, ayuda: 'Lo que falta por pagar de esta compra.' },
        { nombre: 'fecha', etiqueta: 'Fecha de la compra', tipo: 'fecha', requerido: true },
      ]}
      onGuardar={(c) => {
        const cuotas = Math.max(Math.round(c.cuotas) || 1, 1)
        const pagadas = Math.min(Math.max(Math.round(c.cuotasPagadas) || 0, 0), cuotas - 1)
        const saldo = nuevo || c.saldo === undefined || c.saldo === '' ? c.monto * (1 - pagadas / cuotas) : c.saldo
        onGuardar({ ...c, cuotas, cuotasPagadas: pagadas, saldo: Math.round(saldo * 100) / 100 })
      }}
      onEliminar={onEliminar}
      textoBoton={nuevo ? 'Agregar compra' : 'Guardar cambios'}
    />
  )
}

// ---------- Pago a tarjeta / crédito, con vista previa del reparto ----------
export function FormPago({ deuda, fmt, onPagar }) {
  const [fecha, setFecha] = useState(hoyISO())
  const mes = mesDe(fecha)
  const cobro = cobroDelMes(deuda, mes)
  const saldo = saldoDeuda(deuda)
  const pagoTotal = Math.round((saldo + cobro.interes) * 100) / 100
  const [monto, setMonto] = useState(cobro.total > 0 ? cobro.total : '')
  const res = useMemo(() => (monto > 0 ? aplicarPago(deuda, monto, mes) : null), [monto, mes, deuda])
  const saldoDespues = res ? res.compras.reduce((t, c) => t + c.saldo, 0) : saldo

  return (
    <div className="formulario">
      <div className="pago-resumen">
        <div><span>Pago del mes</span><strong>{fmt.dinero(cobro.total)}</strong></div>
        <div><span>Saldo total</span><strong>{fmt.dinero(saldo)}</strong></div>
      </div>
      <CampoMonto grande value={monto} onChange={setMonto} aria-label="Monto a pagar" />
      <Chips
        etiqueta="Montos sugeridos"
        valor={monto}
        onChange={setMonto}
        opciones={[
          ...(cobro.total > 0 ? [{ valor: cobro.total, texto: 'Pago del mes' }] : []),
          ...(cobro.interes > 0 ? [{ valor: cobro.interes, texto: 'Solo intereses' }] : []),
          { valor: pagoTotal, texto: 'Pago total' },
        ]}
      />
      {res && (
        <div className="reparto aparecer">
          <p className="campo-etiqueta">Así se aplica tu pago</p>
          <ul>
            {res.reparto.intereses > 0 && <li><span>1. Intereses del mes</span><b>{fmt.dinero(res.reparto.intereses)}</b></li>}
            {res.reparto.cuotas > 0 && <li><span>{res.reparto.intereses > 0 ? '2.' : '1.'} Cuotas del mes</span><b>{fmt.dinero(res.reparto.cuotas)}</b></li>}
            {res.abonos.map((a) => (
              <li key={a.compraId} className="abono"><span>Abono a capital · {a.nombre}</span><b>{fmt.dinero(a.monto)}</b></li>
            ))}
            {res.sobrante > 0 && <li className="texto-naranja"><span>Te sobra (paga de más)</span><b>{fmt.dinero(res.sobrante)}</b></li>}
          </ul>
          <div className="reparto-total">
            <span>Saldo después del pago</span>
            <strong className={saldoDespues <= 0 ? 'texto-verde' : ''}>{fmt.dinero(saldoDespues)}</strong>
          </div>
          {res.reparto.cuotas + res.reparto.intereses < cobro.total - 1 && (
            <p className="alerta"><LuCircleAlert aria-hidden="true" /> No alcanza a cubrir el pago del mes ({fmt.dinero(cobro.total)}). El banco podría cobrar mora.</p>
          )}
        </div>
      )}
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="p-fecha">Fecha del pago</label>
        <input id="p-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <button className="btn btn-primario" disabled={!(monto > 0)} onClick={() => onPagar(Math.min(monto, pagoTotal), fecha)}>
        <LuWallet aria-hidden="true" /> Registrar pago de {fmt.dinero(Math.min(monto || 0, pagoTotal))}
      </button>
    </div>
  )
}

// ---------- Importar desde Excel ----------
export function Importar({ fmt, onImportar }) {
  const input = useRef()
  const [estado, setEstado] = useState({ cargando: false, resultado: null, error: '', archivo: '' })

  const leer = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setEstado({ cargando: true, resultado: null, error: '', archivo: f.name })
    try {
      const res = interpretar(await leerArchivo(f))
      if (!res.deudas.length && !res.gastos.length && !res.fijos.length) throw new Error('No encontramos datos. Revisa que la primera fila tenga los títulos de las columnas (usa la plantilla).')
      setEstado({ cargando: false, resultado: res, error: '', archivo: f.name })
    } catch (err) {
      setEstado({ cargando: false, resultado: null, error: err.message || 'No se pudo leer el archivo', archivo: f.name })
    }
  }

  const bajarPlantilla = async () => descargar(await crearExcel(plantilla()), 'plantilla-finanzas.xlsx')
  const r = estado.resultado

  return (
    <div className="formulario">
      {!r && (
        <>
          <ol className="pasos-importar">
            <li><b>Descarga la plantilla</b> y llénala en Excel o Google Sheets (también sirve tu propio archivo con columnas como Tarjeta, Fecha, Monto, Cuotas, Interés y Pago).</li>
            <li><b>Súbela aquí.</b> Te mostramos lo que vamos a cargar antes de guardar.</li>
          </ol>
          <button className="btn btn-secundario" onClick={bajarPlantilla}><LuDownload aria-hidden="true" /> Descargar plantilla Excel</button>
          <button className="zona-subir" onClick={() => input.current.click()} disabled={estado.cargando}>
            <LuUpload aria-hidden="true" />
            <strong>{estado.cargando ? 'Leyendo…' : 'Elegir archivo'}</strong>
            <small>.xlsx o .csv</small>
          </button>
          <input ref={input} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden onChange={leer} />
          {estado.error && <p className="alerta"><LuCircleAlert aria-hidden="true" /> {estado.error}</p>}
        </>
      )}
      {r && (
        <div className="aparecer">
          <p className="nota">Archivo: <b>{estado.archivo}</b></p>
          {r.deudas.length > 0 && (
            <div className="importar-grupo">
              <p className="campo-etiqueta">{r.deudas.length} tarjeta(s) / crédito(s)</p>
              {r.deudas.map((d) => (
                <div key={d.nombre} className="importar-item">
                  <span className="punto-color" style={{ background: degradado(d.datos.color) }} />
                  <div className="lista-texto">
                    <strong>{d.nombre}</strong>
                    <small>{d.compras.length} compra(s) · {d.datos.tasa}% {d.datos.tipoTasa}</small>
                  </div>
                  <b>{fmt.dinero(d.compras.reduce((t, c) => t + c.saldo, 0))}</b>
                </div>
              ))}
            </div>
          )}
          {(r.gastos.length > 0 || r.fijos.length > 0) && (
            <div className="importar-grupo">
              {r.gastos.length > 0 && <div className="importar-item"><div className="lista-texto"><strong>{r.gastos.length} gasto(s)</strong><small>desde {formatFecha([...r.gastos].sort((a, b) => a.fecha.localeCompare(b.fecha))[0].fecha, true)}</small></div><b>{fmt.dinero(r.gastos.reduce((t, g) => t + g.monto, 0))}</b></div>}
              {r.fijos.length > 0 && <div className="importar-item"><div className="lista-texto"><strong>{r.fijos.length} gasto(s) fijo(s)</strong><small>mensuales</small></div><b>{fmt.dinero(r.fijos.reduce((t, f) => t + f.monto, 0))}</b></div>}
            </div>
          )}
          {r.avisos.length > 0 && <div className="alerta">{r.avisos.map((a, i) => <div key={i}>{a}</div>)}</div>}
          <p className="nota">Si una tarjeta ya existe con el mismo nombre, sus compras se agregan a ella.</p>
          <div className="form-acciones">
            <button className="btn btn-secundario" onClick={() => setEstado({ cargando: false, resultado: null, error: '', archivo: '' })}>Otro archivo</button>
            <button className="btn btn-primario" onClick={() => { onImportar(r); avisar('Datos importados') }}>Importar todo</button>
          </div>
        </div>
      )}
    </div>
  )
}
