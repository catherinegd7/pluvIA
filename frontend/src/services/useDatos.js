import { createContext, useContext } from 'react'

/** Contexto con todos los datos del sistema (lo llena <DatosProvider>). */
export const DatosCtx = createContext(null)

/** Hook para leer los datos desde cualquier página o componente. */
export const useDatos = () => useContext(DatosCtx)
