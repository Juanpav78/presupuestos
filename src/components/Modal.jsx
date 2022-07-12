import {useState, useEffect} from 'react'
import Mensaje from './Mensaje'
import CerrarBtn from '../img/cerrar.svg'
const Modal = ({setModal,
    animar,
    setAnimar,
    guardarGasto,
    gastoEditar,
    setGastoEditar
}) => {

    const [mensaje, setMensaje]= useState('')
    const [nombre, setNombre]= useState('')
    const [cantidad, setCantidad]= useState('')
    const [categoria, setCategoria]= useState('')

    const [id, setId]= useState('')
    const [fecha, setFecha]= useState('')


    useEffect(() => {
        if(Object.keys(gastoEditar).length > 0){
            setNombre(gastoEditar.nombre)
            setCantidad(gastoEditar.cantidad)
            setCategoria(gastoEditar.categoria)
            setId(gastoEditar.id)
            setFecha(gastoEditar.fecha)
          }
    }, [])
    

    const handleCerrar =(e)=>{
        e.preventDefault();
        setAnimar(false);
        setGastoEditar({})
        setTimeout(()=>{
            setModal(false);
          },300);
    }

    const handleSubmit =(e)=>{
        e.preventDefault();

        if([nombre, cantidad, categoria].includes('')){
            setMensaje("todos los campos son obligatorios")
            return
        }
        setMensaje("")
        guardarGasto({nombre, cantidad, categoria, id, fecha})
    }
    
  return (
    <div className='modal'>
        <div className='cerrar-modal'>
            <img src={CerrarBtn}
             alt="x cerrar boton"
             onClick={handleCerrar}
             />
        </div>

        <form 
        onSubmit={handleSubmit}
        className={`formulario ${animar ? "animar" : "cerrar"}`}>
            <legend>{gastoEditar.nombre ? 'Editar Gasto' : 'Nuevo Gasto' }</legend>

            <div className='campo'>
                <label htmlFor="nombre">Nombre Gasto</label>
                <input 
                type="text" 
                id='nombre'
                placeholder='Añade el nombre del gasto'
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                />
            </div>

            <div className='campo'>
                <label htmlFor="cantidad">Cantidad</label>
                <input 
                type="number" 
                id='cantidad'
                placeholder='Añade la cantidad del gasto'
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                />
            </div>

            <div className='campo'>
                <label htmlFor="categoria">Categoria</label>

                <select 
                id="categoria"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                 >
                    <option value="">-- Seleccione --</option>
                    <option value="Ahorro">Ahorro</option>
                    <option value="Comida">Comida</option>
                    <option value="Casa">Casa</option>
                    <option value="Gastos">Gastos Varios</option>
                    <option value="Ocio">Ocio</option>
                    <option value="Salud">Salud</option>
                    <option value="Suscripciones">Suscripciones</option>
                </select>
            </div>

            {mensaje && <Mensaje tipo="error">{mensaje}</Mensaje>}

            <input type="submit" value={gastoEditar.nombre ? 'Guardar Cambios' : 'Añadir Gasto' } />
           
        </form>
    </div>
  )
}

export default Modal