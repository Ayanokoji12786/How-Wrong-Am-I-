import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'

type Props = {
  value: number
  format?: (value: number) => string
  duration?: number
}

export function AnimatedNumber({ value, format = (n) => Math.round(n).toString(), duration = 1.1 }: Props) {
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(reduce ? value : 0)
  const display = useTransform(motionValue, (latest) => format(latest))

  useEffect(() => {
    if (reduce) {
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return controls.stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce])

  return <motion.span style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>{display}</motion.span>
}
