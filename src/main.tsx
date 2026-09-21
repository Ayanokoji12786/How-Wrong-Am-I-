import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { WebGLBoundary } from './three/WebGLBoundary'
import './styles/index.css'

const AmbientField = lazy(() => import('./three/AmbientField').then((module) => ({ default: module.AmbientField })))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebGLBoundary>
      <Suspense fallback={null}>
        <AmbientField />
      </Suspense>
    </WebGLBoundary>
    <App />
  </StrictMode>,
)
