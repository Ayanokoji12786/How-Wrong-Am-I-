import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { GlassOrbs } from './GlassOrbs'
import { ReflectiveFloor } from './ReflectiveFloor'

function makeCloud(count: number, spread: number) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * spread
    positions[i + 1] = (Math.random() - 0.5) * spread
    positions[i + 2] = (Math.random() - 0.5) * spread
  }
  return positions
}

const scrollState = { fraction: 0 }

function useScrollFraction() {
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollState.fraction = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
}

function DriftingField() {
  const groupRef = useRef<Group>(null)
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const near = useMemo(() => makeCloud(420, 15), [])
  const far = useMemo(() => makeCloud(280, 24), [])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return
    group.rotation.y += delta * 0.03
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.4) * 0.04
    group.scale.setScalar(breathe)
    const targetX = pointer.current.y * -0.2 + scrollState.fraction * 0.55
    const targetY = pointer.current.x * 0.3
    group.rotation.x += (targetX - group.rotation.x) * 0.04
    group.position.x += (targetY - group.position.x) * 0.04
    group.position.y = -scrollState.fraction * 0.8
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={near.length / 3} array={near} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#8fe3ff" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
      </points>
      <points rotation={[0, Math.PI / 6, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={far.length / 3} array={far} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.032} color="#54dd9b" transparent opacity={0.35} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  )
}

function DiveRig({ rich }: { rich: boolean }) {
  useScrollFraction()
  useFrame((state) => {
    const targetZ = 9 - scrollState.fraction * (rich ? 3.2 : 1.2)
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.05
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

export function AmbientField() {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const rich = typeof window !== 'undefined' && window.innerWidth >= 860
  if (reduced) return null
  return (
    <div className="ambient-field" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 50 }} gl={{ antialias: false, alpha: true }}>
        <fog attach="fog" args={['#07111b', 6, 15]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 4]} intensity={0.6} color="#8fe3ff" />
        <DiveRig rich={rich} />
        <DriftingField />
        {rich && (
          <Suspense fallback={null}>
            <GlassOrbs />
            <ReflectiveFloor />
          </Suspense>
        )}
      </Canvas>
    </div>
  )
}
