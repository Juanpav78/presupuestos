import {
  LuHouse, LuUtensils, LuBus, LuLightbulb, LuHeartPulse, LuGraduationCap, LuTv,
  LuPartyPopper, LuShoppingBag, LuPiggyBank, LuPackage,
} from 'react-icons/lu'

export const CATEGORIAS = {
  Vivienda: { Icono: LuHouse, color: '#3B82F6', tipo: 'necesidad' },
  Comida: { Icono: LuUtensils, color: '#22C55E', tipo: 'necesidad' },
  Transporte: { Icono: LuBus, color: '#06B6D4', tipo: 'necesidad' },
  Servicios: { Icono: LuLightbulb, color: '#EAB308', tipo: 'necesidad' },
  Salud: { Icono: LuHeartPulse, color: '#EF4444', tipo: 'necesidad' },
  Educación: { Icono: LuGraduationCap, color: '#14B8A6', tipo: 'necesidad' },
  Suscripciones: { Icono: LuTv, color: '#EC4899', tipo: 'deseo' },
  Ocio: { Icono: LuPartyPopper, color: '#F97316', tipo: 'deseo' },
  Compras: { Icono: LuShoppingBag, color: '#8B5CF6', tipo: 'deseo' },
  Ahorro: { Icono: LuPiggyBank, color: '#10B981', tipo: 'ahorro' },
  Otros: { Icono: LuPackage, color: '#71717A', tipo: 'deseo' },
}

export const infoCategoria = (c) => CATEGORIAS[c] ?? CATEGORIAS.Otros

/** Convierte texto libre (de Excel o versiones viejas) a una categoría válida. */
export const normalizarCategoria = (txt) => {
  if (!txt) return 'Otros'
  const t = String(txt).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const alias = { casa: 'Vivienda', arriendo: 'Vivienda', mercado: 'Comida', gastos: 'Otros', servicio: 'Servicios', educacion: 'Educación' }
  if (alias[t]) return alias[t]
  return Object.keys(CATEGORIAS).find((k) => k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === t) ?? 'Otros'
}

export function IconoCategoria({ categoria, tamano = 40 }) {
  const { Icono, color } = infoCategoria(categoria)
  return (
    <span className="icono-cat" style={{ '--c': color, width: tamano, height: tamano }} aria-hidden="true">
      <Icono />
    </span>
  )
}
