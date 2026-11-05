import { useEffect, useRef } from 'react'

export default function Dialog({ label, onClose, children }) {
  const ref = useRef(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    const root = document.getElementById('root')
    const rootOverflow = root?.style.overflow
    document.body.style.overflow = 'hidden'
    if (root) root.style.overflow = 'hidden'
    ref.current.querySelector('button')?.focus()
    function keydown(e) {
      if (e.key === 'Escape') close.current()
      if (e.key !== 'Tab') return
      const controls = ref.current.querySelectorAll('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]')
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; if (root) root.style.overflow = rootOverflow; previous?.focus() }
  }, [])
  return <div className="modal-backdrop"><section className="order-modal" role="dialog" aria-modal="true" aria-label={label} ref={ref}>{children}</section></div>
}
