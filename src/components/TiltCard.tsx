import type { MouseEvent, ReactNode } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'

type Props = { children: ReactNode; className?: string }

export function TiltCard({ children, className = '' }: Props) {
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const rotateX = useTransform(y, [0, 1], [7, -7])
  const rotateY = useTransform(x, [0, 1], [-9, 9])

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - rect.left) / rect.width)
    y.set((event.clientY - rect.top) / rect.height)
  }
  const reset = () => {
    x.set(0.5)
    y.set(0.5)
  }

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  )
}
