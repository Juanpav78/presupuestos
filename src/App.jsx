import { useState, useEffect } from 'react'
import { generarId } from './helpers'
import 'normalize.css'
import Header from './components/Header'
import Modal from './components/Modal'
import ListadoGastos from './components/ListadoGastos'
import Filtros from './components/Filtros'
import IconoNuevoGasto from './img/nuevo-gasto.svg'


function App() {
    
  const [gastos, setGastos] = useState(
    localStorage.getItem('gastos') ? JSON.parse(localStorage.getItem('gastos')) : []
  )

  const [presupuesto, setPresupuesto] = useState(
    Number(localStorage.getItem('presupuesto')) ?? 0
  );
  const [isValidPresupuesto, setIsValidPresupuesto] =useState(false)

  const [modal, setModal] = useState(false)
  const [animar, setAnimar] = useState(false)

  const [gastoEditar, setGastoEditar] = useState({})
  const [filtro, setFiltro]=useState('')
  const [gastosFiltro, setGastosFiltro]=useState([])
  
  useEffect(()=>{
    if(Object.keys(gastoEditar).length > 0){
      setModal(true)
    
    setTimeout(()=>{
      setAnimar(true)
    },200);
    }
  }, [gastoEditar])

  useEffect(()=>{
    localStorage.setItem('presupuesto', presupuesto ?? 0)
  },[presupuesto])

  useEffect(()=>{
    localStorage.setItem('gastos', JSON.stringify(gastos) ?? [])

  }, [gastos])

  useEffect(()=>{   
    const presupuestoLS = Number(localStorage.getItem('presupuesto')) ?? 0;

    if (presupuestoLS > 0){
      setIsValidPresupuesto(true)
    }
  },[])

  useEffect(() =>{
    if(filtro){
      const gastosFiltrados = gastos.filter(gasto => gasto.categoria === filtro);
      setGastosFiltro(gastosFiltrados);
    }
  }, [filtro])
  

  const handleNuevoGasto =()=>{
    setModal(true)
    setGastoEditar({})
    setTimeout(()=>{
      setAnimar(true)
    },200);
  }

  const guardarGasto = gasto =>{

    if(gasto.id){
      const gastosActualizados = gastos.map(gastoState => gastoState.id=== gasto.id ?gasto : gastoState)
      setGastos(gastosActualizados)
    }else{
      gasto.id = generarId();
      gasto.fecha= Date.now();
      setGastos([...gastos, gasto])
    }

    setAnimar(false);
    setTimeout(()=>{
      setModal(false);
    },300);
  }

  const eliminarGasto = id =>{
   const gastosActualizados = gastos.filter(gasto => gasto.id !== id);
   setGastos(gastosActualizados)
  }
  return (
    
    <div className={modal ? "fijar" : ""}>
      <Header 
      presupuesto ={presupuesto}
      setPresupuesto = {setPresupuesto}
      isValidPresupuesto = {isValidPresupuesto}
      setIsValidPresupuesto={setIsValidPresupuesto}
      gastos = {gastos}
      setGastos = {setGastos}
      />

      {isValidPresupuesto && (
        <>
        
        <main>
          <Filtros
          filtro = {filtro}
          setFiltro = {setFiltro}
          />
          <ListadoGastos 
          gastos = {gastos}
          setGastoEditar = {setGastoEditar}
          eliminarGasto = {eliminarGasto }
          gastosFiltro ={gastosFiltro}
          filtro = {filtro}
          />
        </main>
        
        <div className='nuevo-gasto'>
          <img 
          src={IconoNuevoGasto} 
          alt="Mas Plus Cruz nuevo gasto"
          onClick={handleNuevoGasto}
          />
        </div>
        </>
        
      )}

      {modal && (
        <Modal 
        setModal = {setModal}
        animar = {animar}
        setAnimar = {setAnimar}
        guardarGasto ={guardarGasto}
        gastoEditar = {gastoEditar}
        setGastoEditar ={setGastoEditar}
        />
      )}

      

    </div>
  
  )
}

export default App
