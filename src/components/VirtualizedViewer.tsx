import { useMemo, useState, useRef, useEffect, type ComponentType } from 'react'
import { FixedSizeList as List, ListChildComponentProps, type FixedSizeListProps } from 'react-window'

type VirtualizedViewerProps = {
  value: string;
  fontSize?: number; 
}

export function VirtualizedViewer({ value, fontSize = 14 }: VirtualizedViewerProps) {
  const lines = useMemo(() => (value ? value.split('\n') : []), [value])
  const rowHeight = Math.max(16, Math.ceil(fontSize * 1.4))
  const itemSize = rowHeight
  const [height, setHeight] = useState(240)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const containerElement = containerRef.current
    if (!containerElement) return
    
    const resizeObserver = new ResizeObserver(resizeObserverEntries => {
      for (const resizeObserverEntry of resizeObserverEntries) {
        const observedHeight = Math.max(0, Math.floor(resizeObserverEntry.contentRect.height))
        if (observedHeight !== height) setHeight(observedHeight)
      }
    })
    
    resizeObserver.observe(containerElement)
    return () => resizeObserver.disconnect()
  }, [height])

  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={{ ...style, width: 'auto', right: 'auto', whiteSpace: 'pre', fontSize, lineHeight: `${rowHeight}px` }}>{lines[index]}</div>
  )
  
  const VList = List as unknown as ComponentType<FixedSizeListProps>

  return (
    <div className="virtual-list" ref={containerRef} style={{ width: '100%' }}>
      <VList className="virtual-scroll" height={height} itemCount={lines.length} itemSize={itemSize} width={'100%'}>
        {Row}
      </VList>
    </div>
  )
}
