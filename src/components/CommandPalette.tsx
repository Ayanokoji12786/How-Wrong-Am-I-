import { useEffect } from 'react'

export type CommandAction = 'create' | 'resolve' | 'journal' | 'calibration' | 'overdue'

type Item = { action: CommandAction; label: string; detail: string; key: string }

const items: Item[] = [
  { action: 'create', label: 'Make a forecast', detail: 'Lock a new probability estimate', key: 'N' },
  { action: 'resolve', label: 'Resolve a forecast', detail: 'Record the outcome that reality delivered', key: 'R' },
  { action: 'journal', label: 'Search journal', detail: 'Find a past forecast', key: 'J' },
  { action: 'calibration', label: 'View calibration', detail: 'Inspect probability versus reality', key: 'C' },
  { action: 'overdue', label: 'Show overdue forecasts', detail: 'Focus on forecasts needing resolution', key: 'O' },
]

export function CommandPalette({ onClose, onAction }: { onClose: () => void; onAction: (action: CommandAction) => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="modal-backdrop command-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={(event) => event.stopPropagation()}>
      <header><span>What do you want to do?</span><kbd>ESC</kbd></header>
      <div>{items.map((item) => <button key={item.action} onClick={() => onAction(item.action)}><i>→</i><span><b>{item.label}</b><small>{item.detail}</small></span><kbd>{item.key}</kbd></button>)}</div>
      <footer><span>Use <kbd>⌘ K</kbd> or <kbd>Ctrl K</kbd> from anywhere</span></footer>
    </section>
  </div>
}
