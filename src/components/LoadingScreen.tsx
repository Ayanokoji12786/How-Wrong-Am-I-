import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AnimatedNumber } from './AnimatedNumber'

export function LoadingScreen() {
  const reduce = useReducedMotion()
  const [done, setDone] = useState(false)

  useEffect(() => {
    const duration = reduce ? 250 : 1350
    const timer = setTimeout(() => setDone(true), duration)
    return () => clearTimeout(timer)
  }, [reduce])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
        >
          <motion.div
            className="loading-mark"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <i />
          </motion.div>
          <span className="loading-word">HOW WRONG AM I?</span>
          <div className="loading-bar">
            <motion.div
              className="loading-bar__fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: reduce ? 0.2 : 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          {!reduce && (
            <span className="loading-percent">
              <AnimatedNumber value={100} format={(n) => `${Math.round(n)}%`} duration={1.2} />
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
