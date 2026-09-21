import { MeshReflectorMaterial } from '@react-three/drei'

export function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.2, 0]}>
      <planeGeometry args={[50, 50]} />
      <MeshReflectorMaterial
        blur={[280, 100]}
        resolution={256}
        mixBlur={1}
        mixStrength={1.4}
        roughness={1}
        depthScale={1}
        minDepthThreshold={0.85}
        color="#040a12"
        metalness={0.3}
        mirror={0.18}
      />
    </mesh>
  )
}
