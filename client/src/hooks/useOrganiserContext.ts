import { useContext } from 'react'
import { OrganiserContext } from '../context/OrganiserContext'

export function useOrganiserContext() {
  const context = useContext(OrganiserContext)
  if (!context) {
    throw new Error('useOrganiserContext must be used within an OrganiserProvider')
  }
  return context
}
