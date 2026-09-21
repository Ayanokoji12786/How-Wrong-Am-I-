import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'

function makeCloud(count: number, spread: number) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * spread
    positions[i + 1] = (Math.random() - 0.5) * spread
    positions[i + 2] = (Math.random() - 0.5) * spread
  }
  return positions
}

function DriftingField() {
  const groupRef = useRef<Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const scrollFraction = useRef(0)

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollFraction.current = max > 0 ? window.scrollY / max : 0
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const near = useMemo(() => makeCloud(420, 15), [])
  const far = useMemo(() => makeCloud(280, 24), [])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    group.rotation.y += delta * 0.018
    const targetX = pointer.current.y * -0.18 + scrollFraction.current * 0.5
    const targetY = pointer.current.x * 0.28
    group.rotation.x += (targetX - group.rotation.x) * 0.04
    group.position.x += (targetY - group.position.x) * 0.04
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={near.length / 3} array={near} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#8fe3ff" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={far.length / 3} array={far} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.032} color="#54dd9b" transparent opacity={0.35} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  )
}

export function AmbientField() {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return null
  return (
    <div className="ambient-field" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 50 }} gl={{ antialias: false, alpha: true }}>
        <DriftingField />
      </Canvas>
    </div>
  )
}
