import { useContext } from 'react'
import { NotificationsContext } from '../context/NotificationsContext'

export function useNotificationsContext() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider')
  }
  return context
}
