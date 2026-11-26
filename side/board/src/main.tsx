import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '@/style.css'

const root = document.getElementById('root')
if (!root) throw new Error('게시판을 표시할 영역을 찾을 수 없습니다.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
