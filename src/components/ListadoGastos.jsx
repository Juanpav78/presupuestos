import React from 'react'
import Gasto from './Gasto'

const ListadoGastos = ({
    gastos,
    setGastoEditar,
    eliminarGasto,
    filtro,
    gastosFiltro
  }) => {
  return (
    <div className='listado-gastos contenedor'>
        {
          filtro ? (
            <>
            <h2>{gastosFiltro.length ? 'Gastos' : 'No hay gastos en esa categoria'} </h2>
            {gastosFiltro.map( gasto =>(
              <Gasto 
              key={gasto.id}
              gastos={gasto}
              setGastoEditar={setGastoEditar}
              eliminarGasto = {eliminarGasto }
              />
            ))}
            </>
          ) : (
          <>
          <h2>{gastos.length ? 'Gastos' : 'No hay gastos por el momento'} </h2>
          {gastos.map( gasto =>(
            <Gasto 
            key={gasto.id}
            gastos={gasto}
            setGastoEditar={setGastoEditar}
            eliminarGasto = {eliminarGasto }
            />
          ))}
          </>
          
        )
        }

    </div>
  )
}

export default ListadoGastos