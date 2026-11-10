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

/** eventos: [{ id, titulo, detalle, dia }] */
export function crearICS(eventos, diasAntes = 2) {
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
