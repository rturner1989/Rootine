import { useContext } from 'react'
import AddPlantContext from '../context/AddPlantContext'

export function useAddPlant() {
  const value = useContext(AddPlantContext)
  if (!value) {
    throw new Error('useAddPlant must be used inside an <AddPlantProvider>')
  }
  return value
}
