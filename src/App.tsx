import { MainLayout } from '@components/Layout/MainLayout'
import { DocumentProvider } from '@components/DocumentContext'
import { NotificationProvider } from '@components/Notification/Notification'
import './styles/app.css'

function App() {
  return (
    <DocumentProvider>
      <MainLayout />
      <NotificationProvider />
    </DocumentProvider>
  )
}

export default App