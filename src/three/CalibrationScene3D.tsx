import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, Line, OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Vector3, type Mesh } from 'three'
import type { CalibrationBucket, CalibrationDiagnosis } from '../lib/types'

type Props = {
  buckets: CalibrationBucket[]
  diagnosis?: CalibrationDiagnosis | null
  tall?: boolean
}

const OVER = '#ffc35b'
const UNDER = '#35d8f4'
const GOOD = '#54dd9b'

function bucketColor(diff: number) {
  if (Math.abs(diff) < 0.05) return GOOD
  return diff > 0 ? OVER : UNDER
}

function toPosition(bucket: CalibrationBucket): [number, number, number] {
  const x = (bucket.averageProbability - 0.5) * 8
  const y = (bucket.observedRate - 0.5) * 5
  const z = Math.min(2.1, Math.sqrt(bucket.count) * 0.32) - 0.9
  return [x, y, z]
}

function BucketNode({ bucket, highlighted }: { bucket: CalibrationBucket; highlighted: boolean }) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<Mesh>(null)
  const diff = bucket.averageProbability - bucket.observedRate
  const color = bucketColor(diff)
  const position = useMemo(() => toPosition(bucket), [bucket])
  const radius = 0.14 + Math.min(0.26, Math.sqrt(bucket.count) * 0.045)
  const active = hovered || highlighted

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const target = active ? 1.35 : 1
    meshRef.current.scale.lerp(new Vector3(target, target, target), Math.min(1, delta * 6))
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.5 : 0.65} roughness={0.35} metalness={0.1} />
      </mesh>
      {highlighted && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.14, 0.014, 8, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} />
        </mesh>
      )}
      {hovered && (
        <Html distanceFactor={7.5} center style={{ pointerEvents: 'none' }}>
          <div className="scene3d-tooltip">
            <b>{bucket.label}% confidence</b>
            <span>{bucket.count} resolved forecast{bucket.count === 1 ? '' : 's'}</span>
            <dl>
              <div><dt>Predicted</dt><dd>{Math.round(bucket.averageProbability * 100)}%</dd></div>
              <div><dt>Observed</dt><dd>{Math.round(bucket.observedRate * 100)}%</dd></div>
              <div><dt>Difference</dt><dd>{diff > 0 ? '+' : ''}{Math.round(diff * 100)}pp</dd></div>
            </dl>
          </div>
        </Html>
      )}
    </group>
  )
}

function DiagonalReference() {
  const points: [number, number, number][] = [[-4, -2.5, -0.9], [4, 2.5, -0.9]]
  return <Line points={points} color="#8aa3b8" dashed dashSize={0.18} gapSize={0.14} transparent opacity={0.55} />
}

export function CalibrationScene3D({ buckets, diagnosis, tall = false }: Props) {
  const active = buckets.filter((bucket) => bucket.count > 0)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className={`scene3d ${tall ? 'scene3d--tall' : ''}`}>
      {!active.length && (
        <div className="scene3d-empty">
          <b>Nothing resolved yet</b>
          <span>Resolve a few forecasts to watch this space fill in.</span>
        </div>
      )}
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.3, 6.4], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.55} />
        <pointLight position={[4, 5, 5]} intensity={1.1} color="#bfe9ff" />
        <pointLight position={[-4, -3, 3]} intensity={0.5} color="#35d8f4" />
        <Suspense fallback={null}>
          <Grid position={[0, -2.7, 0]} args={[10, 10]} cellColor="#173247" sectionColor="#1f4a63" fadeDistance={16} fadeStrength={1.4} infiniteGrid />
          <DiagonalReference />
          {active.map((bucket) => (
            <BucketNode key={bucket.label} bucket={bucket} highlighted={diagnosis?.bucket.label === bucket.label} />
          ))}
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={!reduced}
          autoRotateSpeed={0.6}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 3.4}
          enableDamping
          dampingFactor={0.08}
        />
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={0.2} luminanceSmoothing={0.3} intensity={0.55} />
        </EffectComposer>
      </Canvas>
      <div className="scene3d-legend">
        <span><i className="good" /> Well calibrated</span>
        <span><i className="over" /> Overconfident</span>
        <span><i className="under" /> Underconfident</span>
        <span>Drag to rotate · size = sample count</span>
      </div>
    </div>
  )
}
