import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Dark follows the system; ?theme=dark|light on the hash forces it (screenshots).
const applyTheme = () => {
  const forced = new URLSearchParams(location.hash.split('?')[1] ?? '').get('theme')
  const root = document.documentElement
  if (forced) root.dataset.theme = forced; else delete root.dataset.theme
  root.classList.toggle('system-dark', matchMedia('(prefers-color-scheme: dark)').matches)
}
applyTheme()
addEventListener('hashchange', applyTheme)
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
