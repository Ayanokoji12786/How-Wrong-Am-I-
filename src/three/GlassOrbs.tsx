import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

type OrbConfig = { position: [number, number, number]; scale: number; color: string; speed: number }

const ORB_CONFIGS: OrbConfig[] = [
  { position: [-3.6, 0.7, -2.2], scale: 0.5, color: '#e4e9ec', speed: 0.55 },
  { position: [3.7, -1, -3], scale: 0.68, color: '#54dd9b', speed: 0.4 },
  { position: [-2, -1.8, -4.2], scale: 0.36, color: '#ffc35b', speed: 0.7 },
  { position: [2.3, 1.6, -4.8], scale: 0.8, color: '#f3f7fb', speed: 0.3 },
]

function Orb({ config, offset }: { config: OrbConfig; offset: number }) {
  const ref = useRef<Group>(null)
  const [x0, y0] = config.position

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime * config.speed + offset
    ref.current.position.y = y0 + Math.sin(t) * 0.3
    ref.current.position.x = x0 + Math.cos(t * 0.6) * 0.18
    ref.current.rotation.y += 0.0015
    ref.current.rotation.x += 0.0008
  })

  return (
    <group ref={ref} position={config.position}>
      <mesh scale={config.scale}>
        <icosahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          color={config.color}
          transmission={0.88}
          thickness={1.1}
          roughness={0.2}
          ior={1.25}
          emissive={config.color}
          emissiveIntensity={0.08}
          attenuationColor={config.color}
          attenuationDistance={2}
        />
      </mesh>
    </group>
  )
}

export function GlassOrbs() {
  const offsets = useMemo(() => ORB_CONFIGS.map(() => Math.random() * Math.PI * 2), [])
  return (
    <>
      {ORB_CONFIGS.map((config, index) => (
        <Orb key={index} config={config} offset={offsets[index]} />
      ))}
    </>
  )
}
