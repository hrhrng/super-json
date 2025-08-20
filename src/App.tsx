import { MainLayout } from '@components/Layout/MainLayout'
import { NotificationProvider } from '@components/Notification/Notification'

function App() {
  return (
    <>
      <MainLayout />
      <NotificationProvider />
    </>
  )
}

export default App