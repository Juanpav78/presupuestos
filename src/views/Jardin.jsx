import { useState } from 'react'
import { LuSprout, LuCircleCheck, LuCircle, LuWallet, LuHeart } from 'react-icons/lu'
import { estadoMascota, saludFinanciera, ESTADOS } from '../lib/jardin'
import { Tarjeta, Vacio, NumeroAnimado } from '../components/UI'
import { Progreso } from '../components/Graficas'
import Mascota from '../components/Mascota'
import Arbol from '../components/Arbol'

export default function Jardin({ datos, fmt, abrir }) {
  const salud = saludFinanciera(datos)
  const mascotas = datos.deudas.map((d) => ({ d, ...estadoMascota(d, datos) }))
  const [hablando, setHablando] = useState(null)
  const noche = new Date().getHours() >= 19 || new Date().getHours() < 6
  const siguiente = [15, 30, 50, 70, 85, 101].find((x) => x > salud.puntaje)

  const tocar = (id) => {
    setHablando(id)
    clearTimeout(window.__hablar)
    window.__hablar = setTimeout(() => setHablando(null), 3500)
  }
  const habla = mascotas.find((m) => m.d.id === hablando)

  return (
    <>
      <section className={`escena ${noche ? 'noche' : ''}`} aria-label="Tu jardín">
        <span className="astro" aria-hidden="true" />
        <span className="nube n1" aria-hidden="true" />
        <span className="nube n2" aria-hidden="true" />
        {noche && <span className="estrellas" aria-hidden="true" />}
        <div className="escena-arbol"><Arbol puntaje={salud.puntaje} /></div>
        <div className="pasto" aria-hidden="true" />
        {habla && <div className="globo aparecer" role="status">{habla.mensaje}</div>}
        <div className="escena-mascotas">
          {mascotas.slice(0, 6).map((m, i) => (
            <button key={m.d.id} className="mini-mascota" style={{ animationDelay: `${i * 0.4}s` }} onClick={() => tocar(m.d.id)} aria-label={`${m.d.nombre}: ${ESTADOS[m.estado].texto}. ${m.mensaje}`}>
              <Mascota estado={m.estado} colorKey={m.d.color} tamano={62} saltando={hablando === m.d.id} />
              <span>{m.d.nombre}</span>
            </button>
          ))}
        </div>
      </section>

      <Tarjeta className="salud">
        <div className="salud-cabeza">
          <div>
            <span className="campo-etiqueta">Salud financiera</span>
            <strong><NumeroAnimado valor={salud.puntaje} formato={(n) => Math.round(n)} /><small>/100</small></strong>
          </div>
          <div className="etapa">
            <LuSprout aria-hidden="true" />
            <span>{salud.etapa.nombre}</span>
            {siguiente <= 100 && <small>{siguiente - salud.puntaje} pts para crecer</small>}
          </div>
        </div>
        <Progreso valor={salud.puntaje} max={100} color="#22C55E" etiqueta="Salud financiera" />
        <ul className="factores">
          {salud.factores.map((f) => (
            <li key={f.nombre} className={f.puntos === f.max ? 'ok' : ''}>
              {f.puntos === f.max ? <LuCircleCheck aria-hidden="true" /> : <LuCircle aria-hidden="true" />}
              <div>
                <div className="factor-fila"><b>{f.nombre}</b><span>{f.puntos}/{f.max}</span></div>
                <small>{f.consejo}</small>
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      {mascotas.length === 0 ? (
        <Vacio Icono={LuHeart} titulo="Tus mascotas" texto="Cada tarjeta o crédito que agregues se convierte en una mascota. Cuídalas pagando a tiempo.">
          <button className="btn btn-primario" onClick={() => abrir('deuda-nueva')}>Agregar tarjeta</button>
        </Vacio>
      ) : (
        <Tarjeta titulo="Tus mascotas" Icono={LuHeart}>
          <ul className="mascotas">
            {mascotas.map((m, i) => (
              <li key={m.d.id} style={{ animationDelay: `${i * 70}ms` }}>
                <button className="mascota-boton" onClick={() => tocar(m.d.id)} aria-label={`Hablar con ${m.d.nombre}`}>
                  <Mascota estado={m.estado} colorKey={m.d.color} tamano={84} saltando={hablando === m.d.id} />
                </button>
                <div className="mascota-info">
                  <div className="factor-fila">
                    <b>{m.d.nombre}</b>
                    <em className="estado-chip" style={{ '--c': ESTADOS[m.estado].color }}>{ESTADOS[m.estado].texto}</em>
                  </div>
                  <div className="vida" aria-label={`Salud ${m.salud} de 100`}>
                    <LuHeart aria-hidden="true" />
                    <Progreso valor={m.salud} max={100} color={m.salud > 60 ? '#22C55E' : m.salud > 35 ? '#F97316' : '#EF4444'} />
                  </div>
                  <small>{m.mensaje}</small>
                  {m.saldo > 0 && m.cobro.total > 0 && (
                    <button className="btn btn-mini btn-primario" onClick={() => abrir('pago', { deudaId: m.d.id })}>
                      <LuWallet aria-hidden="true" /> Alimentar: pagar {fmt.dinero(m.cobro.total)}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      <p className="nota centro">El jardín se puede apagar en Ajustes cuando quieras.</p>
    </>
  )
}
