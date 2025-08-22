import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { copyTextToClipboard } from '../utils/clipboard'
import { CopyIcon } from './Icons'

type CopyWithToastProps = {
  getText: () => string;
  t: (key: 'copyTooltip' | 'copied') => string;
}

export function CopyWithToast({ getText, t }: CopyWithToastProps) {
  const [phase, setPhase] = useState<'idle' | 'show' | 'leave'>('idle')
  const timersRef = useRef<number[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(id => window.clearTimeout(id))
    timersRef.current = []
  }

  const show = () => {
    clearTimers()
    setPhase('show')
    timersRef.current.push(window.setTimeout(() => setPhase('leave'), 400))
    timersRef.current.push(window.setTimeout(() => setPhase('idle'), 600))
  }

  const onCopy = async () => {
    await copyTextToClipboard(getText())
    show()
  }

  const onKey = async (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      await onCopy()
    }
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <span
        className="copy-icon"
        role="button"
        tabIndex={0}
        aria-label={t('copyTooltip')}
        title={t('copyTooltip')}
        onClick={onCopy}
        onKeyDown={onKey}
      >
        <CopyIcon />
      </span>
      <span className={`copied-toast${phase === 'show' ? ' show' : ''}${phase === 'leave' ? ' leave' : ''}`}>
        {t('copied')}
      </span>
    </span>
  )
}
