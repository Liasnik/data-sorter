type WebContextMenuProps = {
  x: number
  y: number
  onClose: () => void
  onPaste: () => void | Promise<void>
  onCopy: () => void | Promise<void>
  onClear: () => void | Promise<void>
  t: (key: 'paste' | 'copy' | 'clear') => string
}

export function WebContextMenu({ x, y, onClose, onPaste, onCopy, onClear, t }: WebContextMenuProps) {
  return (
    <ul
      className="web-ctxmenu"
      style={{ position: 'fixed', top: y, left: x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <li className="web-ctxmenu-item" onClick={async () => { await onPaste(); onClose() }}>{t('paste')}</li>
      <li className="web-ctxmenu-item" onClick={async () => { await onCopy(); onClose() }}>{t('copy')}</li>
      <li className="web-ctxmenu-item" onClick={async () => { await onClear(); onClose() }}>{t('clear')}</li>
    </ul>
  )
}


