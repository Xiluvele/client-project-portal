import { useEffect } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

export function Modal({ title, open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="card card__pad modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <Button variant="ghost" aria-label="Close" onClick={onClose}><Icon name="close" /></Button>
        </header>
        {children}
      </div>
    </div>
  )
}
