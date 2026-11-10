import {
  LuPiggyBank, LuPlus, LuShieldCheck, LuPlane, LuHouse, LuCar, LuGraduationCap, LuGift, LuSmartphone, LuHeartPulse,
  LuFlag, LuPencil, LuTrendingUp, LuCircleCheck, LuTriangleAlert, LuLightbulb, LuMinus,
} from 'react-icons/lu'
import { mesActual, nombreMes, sumarMeses, color, formatFecha } from '../lib/format'
import { analizarMeta, ahorroDelMes, sugeridoMensual } from '../lib/ahorro'
import { resumenMes } from '../lib/resumen'
import { saldoDeuda, tasaEA, cobroDelMes } from '../lib/deudas'
import { Tarjeta, Vacio, Dato, NumeroAnimado } from '../components/UI'

export const ICONOS_META = {
  emergencia: { Icono: LuShieldCheck, texto: 'Emergencias', color: 'verde' },
  viaje: { Icono: LuPlane, texto: 'Viaje', color: 'turquesa' },
  casa: { Icono: LuHouse, texto: 'Casa', color: 'azul' },
  carro: { Icono: LuCar, texto: 'Carro / moto', color: 'rojo' },
  estudio: { Icono: LuGraduationCap, texto: 'Estudio', color: 'morado' },
  regalo: { Icono: LuGift, texto: 'Regalo / evento', color: 'rosa' },
  tecnologia: { Icono: LuSmartphone, texto: 'Tecnología', color: 'negro' },
  salud: { Icono: LuHeartPulse, texto: 'Salud', color: 'naranja' },
  otro: { Icono: LuPiggyBank, texto: 'Otro', color: 'oro' },
}
export const iconoMeta = (k) => ICONOS_META[k] ?? ICONOS_META.otro

function Anillo({ progreso, colorKey, children, tamano = 76 }) {
  const r = 32
  const c = 2 * Math.PI * r
  return (
    <div className="anillo" style={{ width: tamano, height: tamano }}>
      <svg viewBox="0 0 80 80" width={tamano} height={tamano} aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--superficie-2)" strokeWidth="7" />
        <circle
          className="anillo-progreso" cx="40" cy="40" r={r} fill="none" stroke={color(colorKey).a} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${progreso * c} ${c}`} transform="rotate(-90 40 40)" style={{ '--c': `${c}px` }}
        />
      </svg>
      <span className="anillo-centro" style={{ color: color(colorKey).b }}>{children}</span>
    </div>
  )
}

export default function Ahorro({ datos, fmt, abrir }) {
  const hoy = mesActual()
  const r = resumenMes(datos, hoy)
  const metas = datos.metas ?? []
  const total = metas.reduce((t, m) => t + analizarMeta(m).ahorrado, 0)
  const esteMes = ahorroDelMes(datos, hoy)
  const sugerido = sugeridoMensual(datos)
  const tieneEmergencia = metas.some((m) => m.icono === 'emergencia')
  const deudas = datos.deudas.filter((d) => saldoDeuda(d) > 0.5)
  const gastoBase = r.fijosTotal + deudas.reduce((t, d) => t + cobroDelMes(d).total, 0) + r.presupuestoVariable
  const fondoSugerido = Math.round((gastoBase * 3) / 10000) * 10000
  const tasaAlta = deudas.reduce((m, d) => Math.max(m, tasaEA(d)), 0)

  const ordenadas = [...metas].sort((a, b) => analizarMeta(a).completa - analizarMeta(b).completa || (a.fechaMeta || '9999').localeCompare(b.fechaMeta || '9999'))

  return (
    <>
      <section className="hero ahorro-hero">
        <span className="hero-glow" aria-hidden="true" />
        <span className="hero-etiqueta"><LuPiggyBank aria-hidden="true" /> Tienes ahorrado</span>
        <div className="hero-monto"><NumeroAnimado valor={total} formato={fmt.dinero} /></div>
        <div className="hero-datos">
          <Dato etiqueta="Ahorrado este mes" valor={fmt.corto(esteMes)} tono="acento" />
          <Dato etiqueta="Sugerido este mes" valor={fmt.corto(sugerido)} />
          <Dato etiqueta="Te queda libre" valor={fmt.corto(Math.max(r.libre, 0))} />
          <Dato etiqueta="Metas" valor={`${metas.filter((m) => analizarMeta(m).completa).length}/${metas.length}`} />
        </div>
        {sugerido > 0 && r.libre >= 0 && (
          <span className="hero-sub">
            {r.libre >= sugerido ? `Te alcanza para tus metas este mes y aún te sobran ${fmt.corto(r.libre - sugerido)}.` : `Este mes te quedan ${fmt.corto(r.libre)} libres; tus metas piden ${fmt.corto(sugerido)}.`}
          </span>
        )}
      </section>

      {!tieneEmergencia && (
        <Tarjeta className="sugerencia-fondo" titulo="Empieza por un fondo de emergencia" Icono={LuShieldCheck}>
          <p className="nota">
            Es la base de todo: te protege de imprevistos para no volver a usar la tarjeta.
            {fondoSugerido > 0 && <> Lo ideal son 3 meses de gastos básicos: <b>{fmt.dinero(fondoSugerido)}</b>.</>}
          </p>
          <button className="btn btn-primario" onClick={() => abrir('meta', { inicial: { nombre: 'Fondo de emergencia', icono: 'emergencia', color: 'verde', objetivo: fondoSugerido || '', fechaMeta: sumarMeses(hoy, 11) } })}>
            <LuPlus aria-hidden="true" /> Crear mi fondo de emergencia
          </button>
        </Tarjeta>
      )}

      {metas.length === 0 ? (
        <Vacio Icono={LuFlag} titulo="¿Para qué quieres ahorrar?" texto="Un viaje, la cuota inicial de tu casa, un carro, estudiar… Ponle meta y fecha y te decimos cuánto separar al mes.">
          <button className="btn btn-secundario" onClick={() => abrir('meta')}><LuPlus aria-hidden="true" /> Nueva meta</button>
        </Vacio>
      ) : (
        <>
          <div className="metas">
            {ordenadas.map((m, i) => {
              const a = analizarMeta(m)
              const { Icono } = iconoMeta(m.icono)
              return (
                <section key={m.id} className={`tarjeta meta ${a.completa ? 'completa' : ''}`} style={{ animationDelay: `${i * 60}ms`, '--c': color(m.color).a }}>
                  <div className="meta-cabeza">
                    <Anillo progreso={a.progreso} colorKey={m.color}>
                      {a.completa ? <LuCircleCheck /> : <><Icono /><b>{Math.round(a.progreso * 100)}%</b></>}
                    </Anillo>
                    <div className="meta-info">
                      <div className="factor-fila">
                        <strong>{m.nombre}</strong>
                        <button className="btn-icono" aria-label={`Editar ${m.nombre}`} onClick={() => abrir('meta', { inicial: m })}><LuPencil /></button>
                      </div>
                      <span className="meta-montos"><b>{fmt.dinero(a.ahorrado)}</b> de {fmt.dinero(a.objetivo)}</span>
                      <small>
                        {a.completa ? '🎉 ¡Meta cumplida!' : m.fechaMeta ? `Meta: ${nombreMes(m.fechaMeta)} · faltan ${a.mesesRestantes} mes${a.mesesRestantes > 1 ? 'es' : ''}` : 'Sin fecha límite'}
                      </small>
                    </div>
                  </div>
                  {!a.completa && (
                    <div className="meta-plan">
                      {a.aporteSugerido !== null && (
                        <div className="meta-sugerido">
                          <span>Ahorra al mes</span>
                          <strong>{fmt.dinero(a.aporteSugerido)}</strong>
                          {a.aportadoEsteMes > 0 && <small>Este mes llevas {fmt.dinero(a.aportadoEsteMes)}{a.aportadoEsteMes >= a.aporteSugerido ? ' ✓' : ''}</small>}
                        </div>
                      )}
                      <div className="meta-estado">
                        {a.alDia === true && <span className="estado-chip" style={{ '--c': '#16A34A' }}><LuCircleCheck aria-hidden="true" /> Vas al día</span>}
                        {a.alDia === false && <span className="estado-chip" style={{ '--c': '#EA580C' }}><LuTriangleAlert aria-hidden="true" /> Vas atrasado</span>}
                        {a.llegaEn && <small><LuTrendingUp aria-hidden="true" /> A tu ritmo llegas en {nombreMes(a.llegaEn, true)}</small>}
                      </div>
                    </div>
                  )}
                  <div className="meta-acciones">
                    {!a.completa && <button className="btn btn-primario" onClick={() => abrir('aporte', { metaId: m.id })}><LuPlus aria-hidden="true" /> Ahorrar</button>}
                    {a.ahorrado > 0 && <button className="btn btn-secundario" onClick={() => abrir('aporte', { metaId: m.id, retiro: true })} aria-label={`Retirar de ${m.nombre}`}><LuMinus aria-hidden="true" /> {a.completa ? 'Usar el dinero' : 'Retirar'}</button>}
                  </div>
                  {(m.aportes ?? []).length > 0 && (
                    <details className="meta-historial">
                      <summary>Movimientos ({m.aportes.length})</summary>
                      <ul className="lista compacta">
                        {[...m.aportes].sort((x, y) => y.fecha.localeCompare(x.fecha)).slice(0, 10).map((ap) => (
                          <li key={ap.id} onClick={() => abrir('aporte', { metaId: m.id, aporte: ap })}>
                            <div className="lista-texto"><strong>{ap.monto < 0 ? 'Retiro' : 'Ahorro'}</strong><small>{formatFecha(ap.fecha, true)}</small></div>
                            <span className={`monto ${ap.monto < 0 ? 'texto-rojo' : 'texto-verde'}`}>{ap.monto < 0 ? '−' : '+'}{fmt.dinero(Math.abs(ap.monto))}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </section>
              )
            })}
          </div>
          <button className="btn btn-secundario ancho boton-sombra" onClick={() => abrir('meta')}><LuPlus aria-hidden="true" /> Nueva meta</button>
        </>
      )}

      <Tarjeta titulo="Consejos de ahorro" Icono={LuLightbulb}>
        <ul className="consejos">
          <li><strong>Págate primero:</strong> separa el ahorro el mismo día que te llega el salario, no lo que sobre a fin de mes.</li>
          {tasaAlta > 0.15 && <li>Tienes deudas al <strong>{Math.round(tasaAlta * 100)}% E.A.</strong>: después de un fondo de emergencia pequeño, suele rendir más abonar a esa deuda que ahorrar.</li>}
          <li>Guarda tu ahorro en una cuenta aparte (de bajo movimiento o un bolsillo) para no gastarlo sin querer.</li>
          <li>Las primas y los ingresos extra son ideales para avanzar rápido en tus metas.</li>
        </ul>
      </Tarjeta>
    </>
  )
}
