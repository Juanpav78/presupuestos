import {useState, useEffect} from 'react'
import {CircularProgressbar, buildStyles} from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css';

const ControlPresupuesto = ({presupuesto, gastos,  setGastos, setPresupuesto, setIsValidPresupuesto}) => {

    const [disponible, setDisponible]= useState(0)
    const [gastado, setGastado]= useState(0)
    const [porcentaje, setPorcentaje] = useState(100)

    const handleResetApp = () =>{
        const res = confirm("¿deseas resetear la app?")
        if (res){
            setGastos([])
            setPresupuesto(0)
            setIsValidPresupuesto(false)
        }
    }

    useEffect(()=>{
        
        const totalGastado = gastos.reduce((total, gasto)=> gasto.cantidad + total, 0);
        setGastado(totalGastado);
        const totalDisponible = presupuesto - totalGastado; 
        setDisponible(totalDisponible); 

        setTimeout(()=>{
            setPorcentaje((100- ((totalDisponible)/presupuesto)*100).toFixed(1))
        }, 1000)

    }, [gastos])
    
    const formattPresupuesto = (cantidad)=> {
        return cantidad.toLocaleString(
            'en-US', {
                style: 'currency',
                currency: 'USD'
            })
    }
  return (
    <div className='contenedor-presupuesto contenedor sombra dos-columnas'>
        <div>
        <CircularProgressbar 
        value={porcentaje} 
        maxValue={100} 
        text={ `${porcentaje}% Gastado`} 
        styles={buildStyles({
            trailColor : '#c5c5c7',
            pathColor: `${disponible > 0 ? '#3b82f6' : '#db2777'}`,
            textColor: `${disponible > 0 ? '#3b82f6' : '#db2777'}`
        })
        }
        />
        </div>
        <div className='contenido-presupuesto'>
            <button 
            className='reset-app'
            type='button'
            onClick={handleResetApp}
            >
            Resetear App</button>
            <p>
                <span>Presupuesto: </span> {formattPresupuesto(presupuesto)}
            </p>
            <p className={disponible < 0 ? 'negativo' : ''}>
                <span>Disponible: </span> {formattPresupuesto(disponible)}
            </p>
            <p>
                <span>Gastado: </span> {formattPresupuesto(gastado)}
            </p>
        </div>
    </div>
  )
}

export default ControlPresupuesto