// Recordatorios de pago para el calendario del celular (.ics y Google Calendar).
import { hoyISO } from './format'

const pad = (n) => String(n).padStart(2, '0')
const compacta = (iso) => iso.replace(/-/g, '')
const escICS = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** Próxima fecha (desde hoy) en que cae el día `dia` del mes. */
export const proximaFecha = (dia) => {
  const hoy = new Date()
  for (let i = 0; i < 3; i++) {
    const y = hoy.getFullYear()
    const m = hoy.getMonth() + i
    const ultimo = new Date(y, m + 1, 0).getDate()
    const d = new Date(y, m, Math.min(dia, ultimo))
    if (d >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return hoyISO()
}

// Días 29, 30 y 31 no existen en todos los meses: se usa el último día del mes.
const regla = (dia) => `RRULE:FREQ=MONTHLY;BYMONTHDAY=${dia > 28 ? -1 : dia}`

const sumarDia = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, d + 1)
  return `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}`
}

/** Hora 'HH:MM' de hoy (o mañana si ya pasó) en formato local de calendario. */
const proximaHora = (hora) => {
  const [h, m] = hora.split(':').map(Number)
  const d = new Date()
  if (d.getHours() * 60 + d.getMinutes() > h * 60 + m) d.setDate(d.getDate() + 1)
  const f = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const fin = new Date(2000, 0, 1, h, m + 10)
  return { inicio: `${f}T${pad(h)}${pad(m)}00`, fin: `${f}T${pad(fin.getHours())}${pad(fin.getMinutes())}00` }
}

export const RECORDATORIO_DIARIO = {
  titulo: '📝 ¿Ya registraste tus gastos de hoy?',
  detalle: 'Abre Mis Finanzas y anota lo que gastaste hoy. Toma 1 minuto.',
}

/** eventos: [{ id, titulo, detalle, dia }]; diario: 'HH:MM' para un recordatorio todos los días (opcional) */
export function crearICS(eventos, diasAntes = 2, diario = null) {
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mis Finanzas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const e of eventos) {
    const inicio = proximaFecha(e.dia)
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-misfinanzas@app`,
      `DTSTAMP:${ahora}`,
      `DTSTART;VALUE=DATE:${compacta(inicio)}`,
      `DTEND;VALUE=DATE:${sumarDia(inicio)}`,
      regla(e.dia),
      `SUMMARY:${escICS(e.titulo)}`,
      `DESCRIPTION:${escICS(e.detalle)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escICS(e.titulo)}`, `TRIGGER:-P${diasAntes}DT0H0M0S`, 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escICS(e.titulo)} (hoy)`, 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT'
    )
  }
  if (diario) {
    const { inicio, fin } = proximaHora(diario)
    lineas.push(
      'BEGIN:VEVENT', 'UID:diario-registro-misfinanzas@app', `DTSTAMP:${ahora}`,
      `DTSTART:${inicio}`, `DTEND:${fin}`, 'RRULE:FREQ=DAILY',
      `SUMMARY:${escICS(RECORDATORIO_DIARIO.titulo)}`, `DESCRIPTION:${escICS(RECORDATORIO_DIARIO.detalle)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escICS(RECORDATORIO_DIARIO.titulo)}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT'
    )
  }
  lineas.push('END:VCALENDAR')
  return new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
}

/** Enlace para crear el evento repetido en Google Calendar. */
export function enlaceGoogle(e) {
  const inicio = proximaFecha(e.dia)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    details: e.detalle,
    dates: `${compacta(inicio)}/${sumarDia(inicio)}`,
    recur: regla(e.dia),
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

/** Enlace de Google Calendar para el recordatorio diario. */
export function enlaceGoogleDiario(hora) {
  const { inicio, fin } = proximaHora(hora)
  const p = new URLSearchParams({ action: 'TEMPLATE', text: RECORDATORIO_DIARIO.titulo, details: RECORDATORIO_DIARIO.detalle, dates: `${inicio}/${fin}`, recur: 'RRULE:FREQ=DAILY' })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}
