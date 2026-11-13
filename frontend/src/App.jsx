import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { DatosProvider } from './services/DatosContext'
import Layout from './components/Layout'
import { Vacio } from './components/ui'
import Inicio from './pages/Inicio'
import Panel from './pages/Panel'
import ColaderaDetalle from './pages/ColaderaDetalle'
import Alertas from './pages/Alertas'
import Limpiezas from './pages/Limpiezas'
import Historial from './pages/Historial'

export default function App() {
  return (
    <DatosProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/panel" element={<Layout />}>
            <Route index element={<Panel />} />
            <Route path="coladeras/:id" element={<ColaderaDetalle />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="limpiezas" element={<Limpiezas />} />
            <Route path="historial" element={<Historial />} />
            <Route path="*" element={<NoEncontrada />} />
          </Route>
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </DatosProvider>
  )
}

function NoEncontrada() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <Vacio icono={CircleAlert} titulo="Página no encontrada" texto="Esta dirección no existe.">
        <Link to="/panel" className="btn btn-sm btn-primario">
          Ir al panel
        </Link>
      </Vacio>
    </div>
  )
}
