export const reveal = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.22 },
  transition: { duration: 0.55, ease: 'easeOut' as const },
}

export const revealDelay = (delay: number) => ({
  ...reveal,
  transition: { ...reveal.transition, delay },
})
