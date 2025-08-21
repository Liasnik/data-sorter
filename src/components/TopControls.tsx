import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '../i18n'
import { SunIcon, MoonIcon } from './Icons'

type Theme = 'system' | 'light' | 'dark'

export function TopControls({
  locale,
  onSelectLocale,
  theme,
  onSelectTheme,
}: {
  locale: Locale
  onSelectLocale: (l: Locale) => void
  theme: Theme
  onSelectTheme: (t: Theme) => void
}) {
  const effectiveTheme: 'light' | 'dark' = useMemo(() => {
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  }, [theme])
  return (
    <div className="top-controls" aria-label="Quick toggles">
      <LanguageMenu locale={locale} onSelect={onSelectLocale} />
      <ThemeMenu theme={theme} effectiveTheme={effectiveTheme} onSelect={onSelectTheme} />
    </div>
  )
}

function LanguageMenu({ locale, onSelect }: { locale: Locale; onSelect: (l: Locale) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const label = locale === 'en' ? 'en' : locale === 'ru' ? 'ru' : 'ua'
  return (
    <div ref={wrapRef} className="top-dd">
      <button className="top-dd-trigger" onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>{label}</button>
      {open && (
        <div className="top-dd-menu" role="listbox">
          <MenuItem active={locale==='en'} onClick={() => { onSelect('en'); setOpen(false) }}>English</MenuItem>
          <MenuItem active={locale==='uk'} onClick={() => { onSelect('uk'); setOpen(false) }}>Українська</MenuItem>
          <MenuItem active={locale==='ru'} onClick={() => { onSelect('ru'); setOpen(false) }}>Русский</MenuItem>
        </div>
      )}
    </div>
  )
}

function ThemeMenu({ theme, effectiveTheme, onSelect }: { theme: Theme; effectiveTheme: 'light' | 'dark'; onSelect: (t: Theme) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const icon = effectiveTheme === 'light' ? <SunIcon width={14} height={14} /> : <MoonIcon width={12} height={12} />
  return (
    <div ref={wrapRef} className="top-dd">
      <button className="top-dd-trigger top-dd-trigger-theme" onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open} title="Theme">{icon}</button>
      {open && (
        <div className="top-dd-menu" role="listbox">
          <MenuItem active={theme==='system'} onClick={() => { onSelect('system'); setOpen(false) }}>System</MenuItem>
          <MenuItem active={theme==='light'} onClick={() => { onSelect('light'); setOpen(false) }}>Light</MenuItem>
          <MenuItem active={theme==='dark'} onClick={() => { onSelect('dark'); setOpen(false) }}>Dark</MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`top-dd-item${active ? ' active' : ''}`} onClick={onClick} role="option" aria-selected={active}>
      <span>{children}</span>
    </button>
  )
}


