import { useEffect, useState } from 'react'

interface NotificationProps {
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

let notificationInstance: ((props: NotificationProps) => void) | null = null

export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (notificationInstance) {
    notificationInstance({ message, type })
  }
}

export function NotificationProvider() {
  const [notification, setNotification] = useState<NotificationProps | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    notificationInstance = (props: NotificationProps) => {
      setNotification(props)
      setShow(true)
      
      setTimeout(() => {
        setShow(false)
      }, props.duration || 3000)
    }

    return () => {
      notificationInstance = null
    }
  }, [])

  if (!notification) return null

  return (
    <div 
      className={`notification ${show ? 'show' : ''} ${notification.type}`}
      id="notification"
    >
      {notification.message}
    </div>
  )
}