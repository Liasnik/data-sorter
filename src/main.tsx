import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

// Use contextBridge
if (window.ipcRenderer?.on) {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
}
