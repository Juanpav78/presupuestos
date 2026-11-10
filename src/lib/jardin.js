// Minijuego "Jardín": cada tarjeta es una mascota y un árbol crece con tu salud financiera.
import { cobroDelMes, interesesDeuda, saldoDeuda } from './deudas'
import { resumenMes } from './resumen'
import { fechaEnMes, hoyISO, mesActual } from './format'

const HORAS_CELEBRACION = 48

/** Estado de la mascota de una tarjeta o crédito. */
export function estadoMascota(d, datos) {
  const hoy = hoyISO()
  const mes = mesActual()
  const saldo = saldoDeuda(d)
  const cobro = cobroDelMes(d, mes)
  const uso = d.tipo !== 'credito' && d.cupo > 0 ? saldo / d.cupo : null
  const fechaPago = d.diaPago ? fechaEnMes(mes, d.diaPago) : null
  const dias = fechaPago ? Math.round((new Date(fechaPago) - new Date(hoy)) / 864e5) : null
  const vencido = cobro.total > 0 && dias !== null && dias < 0
  const atrapada = saldo > 0 && cobroDelMes(d).total > 0 && cobroDelMes(d).capital <= 1 && interesesDeuda(d) > 0
  const ultimoPago = [...datos.pagos].filter((p) => p.deudaId === d.id).sort((a, b) => (b.creado || 0) - (a.creado || 0))[0]
  const reciente = ultimoPago?.creado && Date.now() - ultimoPago.creado < HORAS_CELEBRACION * 3600e3

  let salud = 70
  if (uso !== null) salud -= Math.max(uso - 0.3, 0) * 70
  if (cobro.total === 0 && saldo > 0) salud += 20
  if (vencido) salud -= 40
  else if (dias !== null && dias <= 3 && cobro.total > 0) salud -= 10
  if (atrapada) salud -= 30
  salud = Math.round(Math.min(Math.max(salud, 5), 100))

  let estado, mensaje
  if (saldo <= 0.5) {
    estado = 'libre'; salud = 100
    mensaje = '¡Soy libre! Ya no me debes nada. Gracias por cuidarme.'
  } else if (reciente) {
    estado = 'celebrando'
    mensaje = `¡Gracias por el pago! Me siento ${cobro.total === 0 ? 'súper bien' : 'mejor'}.`
  } else if (vencido || atrapada || (uso !== null && uso > 0.9)) {
    estado = 'enfermo'
    mensaje = vencido
      ? `Estoy enfermo: mi pago venció. Págame ${cobro.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} para curarme.`
      : atrapada ? 'Mi cuota no alcanza a cubrir los intereses… abona a capital para que me recupere.' : 'Estoy muy lleno: casi no me queda cupo.'
  } else if ((dias !== null && dias <= 3 && cobro.total > 0) || (uso !== null && uso > 0.5)) {
    estado = 'preocupado'
    mensaje = dias !== null && dias <= 3 && cobro.total > 0
      ? `Mi pago vence ${dias === 0 ? 'hoy' : `en ${dias} día${dias > 1 ? 's' : ''}`}. ¡No me olvides!`
      : 'Me estoy llenando mucho. Intenta no usarme por un tiempo.'
  } else if (cobro.total === 0) {
    estado = 'feliz'
    mensaje = 'Mi pago de este mes ya está listo. ¡Estoy feliz!'
  } else {
    estado = 'tranquilo'
    mensaje = dias !== null ? `Todo bien. Mi próximo pago es en ${dias} días.` : 'Todo bien por ahora. Ponme un día de pago para avisarte.'
  }
  return { estado, salud, mensaje, uso, cobro, dias, saldo }
}

export const ESTADOS = {
  libre: { texto: 'Libre', color: '#FACC15' },
  celebrando: { texto: 'Celebrando', color: '#EC4899' },
  feliz: { texto: 'Feliz', color: '#22C55E' },
  tranquilo: { texto: 'Tranquilo', color: '#3B82F6' },
  preocupado: { texto: 'Preocupado', color: '#F97316' },
  enfermo: { texto: 'Enfermo', color: '#EF4444' },
}

/** Salud financiera (0–100) con sus factores y consejos para mejorar. */
export function saludFinanciera(datos) {
  const mes = mesActual()
  const hoy = hoyISO()
  const r = resumenMes(datos, mes)
  const deudas = datos.deudas.filter((d) => saldoDeuda(d) > 0.5)
  const factores = []

  // 1. Pagos al día
  const vencidas = datos.deudas.filter((d) => estadoMascota(d, datos).cobro.total > 0 && d.diaPago && fechaEnMes(mes, d.diaPago) < hoy)
  const fijosVencidos = datos.fijos.filter((f) => !(datos.pagosFijos[mes] ?? []).includes(f.id) && fechaEnMes(mes, f.dia) < hoy)
  const nVencidos = vencidas.length + fijosVencidos.length
  factores.push({
    nombre: 'Pagos al día', max: 25, puntos: Math.max(25 - nVencidos * 15, 0),
    consejo: nVencidos ? `Tienes ${nVencidos} pago(s) vencido(s): ${[...vencidas, ...fijosVencidos].map((x) => x.nombre).join(', ')}.` : 'No tienes pagos vencidos. ¡Bien!',
  })

  // 2. Uso del cupo
  const conCupo = datos.deudas.filter((d) => d.tipo !== 'credito' && d.cupo > 0)
  const uso = r.utilizacion
  factores.push({
    nombre: 'Uso del cupo', max: 20, puntos: !conCupo.length ? 20 : Math.round(20 * Math.min(Math.max((0.9 - uso) / 0.6, 0), 1)),
    consejo: !conCupo.length ? 'Sin tarjetas con cupo registrado.' : uso <= 0.3 ? `Usas el ${Math.round(uso * 100)}% de tu cupo. Perfecto.` : `Usas el ${Math.round(uso * 100)}% de tu cupo. Bájalo del 30% para crecer más.`,
  })

  // 3. Gastas menos de lo que ganas
  factores.push({
    nombre: 'Gastas menos de lo que ganas', max: 20, puntos: r.ingreso > 0 && r.libre >= 0 ? 20 : 0,
    consejo: r.ingreso <= 0 ? 'Agrega tu salario en Ingresos.' : r.libre >= 0 ? 'Este mes te sobra dinero. ¡Así se hace!' : 'Este mes gastas más de lo que ganas.',
  })

  // 4. Deudas bajando
  const interes = r.interesesMes
  const pagosMes = datos.pagos.filter((p) => p.mes === mes)
  const capitalPagado = pagosMes.reduce((t, p) => t + (p.reparto ? p.reparto.cuotas + p.reparto.abono : p.monto), 0)
  const bajando = !deudas.length ? 15 : capitalPagado > interes ? 15 : pagosMes.length ? 8 : 0
  factores.push({
    nombre: 'Tus deudas bajan', max: 15, puntos: bajando,
    consejo: !deudas.length ? '¡No tienes deudas!' : bajando === 15 ? 'Este mes ya abonaste más que los intereses.' : 'Registra los pagos de tus tarjetas de este mes.',
  })

  // 5. Presupuesto
  const pres = r.presupuestoVariable
  factores.push({
    nombre: 'Respetas tu presupuesto', max: 10, puntos: pres > 0 && r.gastado <= pres ? 10 : 0,
    consejo: !pres ? 'Define un presupuesto de gastos en Ajustes.' : r.gastado <= pres ? 'Vas dentro de tu presupuesto.' : 'Te pasaste del presupuesto este mes.',
  })

  // 6. Constancia
  const hace3 = Date.now() - 3 * 864e5
  const fechas = [...datos.gastos.map((g) => g.creado || Date.parse(g.fecha)), ...datos.pagos.map((p) => p.creado || Date.parse(p.fecha))]
  const constante = fechas.some((t) => t >= hace3)
  factores.push({
    nombre: 'Registras seguido', max: 10, puntos: constante ? 10 : 0,
    consejo: constante ? 'Has registrado movimientos en los últimos días.' : 'Registra tus gastos a diario para que tu árbol crezca.',
  })

  const puntaje = factores.reduce((t, f) => t + f.puntos, 0)
  return { puntaje, factores, etapa: etapaArbol(puntaje) }
}

export const etapaArbol = (p) =>
  p < 15 ? { n: 0, nombre: 'Semilla' }
  : p < 30 ? { n: 1, nombre: 'Brote' }
  : p < 50 ? { n: 2, nombre: 'Plantita' }
  : p < 70 ? { n: 3, nombre: 'Arbolito' }
  : p < 85 ? { n: 4, nombre: 'Árbol' }
  : { n: 5, nombre: 'Árbol dorado' }
