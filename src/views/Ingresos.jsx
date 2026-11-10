import { LuBriefcase, LuGift, LuPlus, LuCalendarClock, LuCheck, LuClock, LuHandCoins, LuPencil } from 'react-icons/lu'
import { formatFecha, mesActual, nombreMes, soloMes, hoyISO } from '../lib/format'
import { resumenIngresos, porReclamar, proximosIngresos, montoMensualFuente } from '../lib/ingresos'
import { Tarjeta, Vacio, Dato, NumeroAnimado } from '../components/UI'
import { Progreso } from '../components/Graficas'
import { PorReclamar, textoCuando } from '../components/IngresosUI'

export default function Ingresos({ datos, mes, fmt, abrir }) {
  const r = resumenIngresos(datos, mes)
  const hoy = hoyISO()
  const reclamar = mes === mesActual() ? porReclamar(datos) : []
  const proximos = mes === mesActual() ? proximosIngresos(datos, 3).filter((i) => i.fecha.slice(0, 7) !== mes) : []
  const fuentes = datos.fuentes ?? []

  const tocar = (i) => {
    if (i.recibido) abrir('recibido', { item: i })
    else if (i.fecha <= hoy) abrir('reclamar', { item: i })
    else abrir('posponer', { item: i })
  }

  return (
    <>
      <section className="hero">
        <span className="hero-glow" aria-hidden="true" />
        <span className="hero-etiqueta">Ingresos de {soloMes(mes).toLowerCase()}</span>
        <div className="hero-monto"><NumeroAnimado valor={r.recibido + r.fijoPendiente} formato={fmt.dinero} /></div>
        {r.esperadoTotal > 0 && <Progreso valor={r.recibido} max={r.esperadoTotal} color="#4ADE80" etiqueta="Ingresos recibidos" />}
        <div className="hero-datos">
          <Dato etiqueta="Ya recibido" valor={fmt.corto(r.recibido)} />
          <Dato etiqueta="Fijos por llegar" valor={fmt.corto(r.fijoPendiente)} />
          <Dato etiqueta="Extras esperados" valor={fmt.corto(r.porRecibir)} />
          <Dato etiqueta="Fijo al mes" valor={fmt.corto(fuentes.reduce((t, f) => t + montoMensualFuente(f), 0))} />
        </div>
        {r.porRecibir > 0 && <span className="hero-sub">Los extras esperados no se cuentan como disponibles hasta que los recibas.</span>}
      </section>

      <PorReclamar items={reclamar} fmt={fmt} abrir={abrir} />

      <Tarjeta titulo="Ingresos fijos" Icono={LuBriefcase} accion={fuentes.length > 0 && <button className="btn-texto" onClick={() => abrir('fuente')}><LuPlus aria-hidden="true" /> Agregar</button>}>
        {fuentes.length === 0 ? (
          <Vacio Icono={LuBriefcase} titulo="Agrega tu salario" texto="Tu salario u otros ingresos que llegan cada mes o cada quincena.">
            <button className="btn btn-primario" onClick={() => abrir('fuente')}><LuPlus aria-hidden="true" /> Agregar ingreso fijo</button>
          </Vacio>
        ) : (
          <ul className="lista compacta">
            {fuentes.map((f) => (
              <li key={f.id} onClick={() => abrir('fuente', { fuente: f })}>
                <span className="icono-cat" style={{ '--c': '#16A34A' }}><LuBriefcase /></span>
                <div className="lista-texto">
                  <strong>{f.nombre}</strong>
                  <small>{f.frecuencia === 'quincenal' ? `Quincenal · días ${f.dia} y ${f.dia2}` : `Mensual · día ${f.dia}`}</small>
                </div>
                <span className="monto">{fmt.dinero(montoMensualFuente(f))}</span>
                <LuPencil className="texto-2" aria-hidden="true" />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Este mes" Icono={LuCalendarClock} accion={<button className="btn-texto" onClick={() => abrir('ingreso')}><LuPlus aria-hidden="true" /> Agregar</button>}>
        {r.items.length === 0 ? (
          <p className="nota">No hay ingresos en este mes. Agrega uno único (prima, venta, un dinero que te deben) o tu salario.</p>
        ) : (
          <ul className="lista compacta">
            {r.items.map((i) => {
              const estado = i.recibido ? 'recibido' : i.fecha < hoy ? 'atrasado' : i.fecha === hoy ? 'hoy' : 'pendiente'
              return (
                <li key={i.id} onClick={() => tocar(i)} className={`ingreso-${estado}`}>
                  <span className="fecha-chip"><b>{Number(i.fecha.slice(8))}</b><small>{soloMes(i.fecha.slice(0, 7)).slice(0, 3)}</small></span>
                  <div className="lista-texto">
                    <strong>{i.tipo === 'fijo' ? <LuBriefcase aria-hidden="true" /> : <LuGift aria-hidden="true" />} {i.nombre}</strong>
                    <small>
                      {estado === 'recibido' ? 'Recibido' : estado === 'atrasado' ? `Por reclamar ${textoCuando(i.fecha)}` : estado === 'hoy' ? 'Llega hoy' : `Llega ${textoCuando(i.fecha)}`}
                      {i.pospuesto && ' · pospuesto'}
                      {i.tipo === 'extra' && !i.recibido && ' · no contado aún'}
                    </small>
                  </div>
                  <span className={`monto ${i.recibido ? 'texto-verde' : ''}`}>{i.recibido ? '+' : ''}{fmt.dinero(i.monto)}</span>
                  <span className={`estado-ingreso ${estado}`} aria-hidden="true">{i.recibido ? <LuCheck /> : estado === 'atrasado' || estado === 'hoy' ? <LuHandCoins /> : <LuClock />}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Tarjeta>

      {proximos.length > 0 && (
        <Tarjeta titulo="Próximos meses" Icono={LuClock}>
          <ul className="lista compacta">
            {proximos.map((i) => (
              <li key={i.id} onClick={() => tocar(i)}>
                <span className="fecha-chip"><b>{Number(i.fecha.slice(8))}</b><small>{soloMes(i.fecha.slice(0, 7)).slice(0, 3)}</small></span>
                <div className="lista-texto"><strong>{i.nombre}</strong><small>{nombreMes(i.fecha.slice(0, 7))}{i.tipo === 'extra' ? ' · esperado' : ''}</small></div>
                <span className="monto">{fmt.dinero(i.monto)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  )
}
