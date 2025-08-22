import { useRef, useEffect, useState, useCallback } from 'react'

type WorkerResult = { id: string; ok: boolean; with?: string; without?: string; error?: string }
type WorkerAction =
  | { type: 'splitTwo'; input: string; keywords: string }
  | { type: 'strictBegin' | 'strictInner' | 'strictEnd'; input: string; keywords: string }
  | { type: 'createWith' | 'createWithout'; input: string; keywords: string }
  | { type: 'replace' | 'replaceUpper'; input: string; keywords: string; replacements: string }
  | { type: 'dedup'; input: string }

type LabelMode = 'withKeywords' | 'withoutKeywords' | 'withoutDuplicates' | 'duplicates'

type UseTextProcessingProps = {
  getInput: () => string
  getKeywords: () => string
  getReplacements: () => string
  t: (key: string) => string
}

export function useTextProcessing({ getInput, getKeywords, getReplacements, t }: UseTextProcessingProps) {
  const [withKeywords, setWithKeywords] = useState<string>('')
  const [withoutKeywords, setWithoutKeywords] = useState<string>('')
  const [leftLabelMode, setLeftLabelMode] = useState<LabelMode>('withKeywords')
  const [rightLabelMode, setRightLabelMode] = useState<LabelMode>('withoutKeywords')
  
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, (result: WorkerResult) => void>>(new Map())
  const reqIdRef = useRef<number>(0)

  // initialization of Worker
  useEffect(() => {
    const worker = new Worker(new URL('../workers/textWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    const localPending = pendingRef.current
    
    worker.onmessage = (messageEvent: MessageEvent<WorkerResult>) => {
      const { id } = messageEvent.data || { id: '' }
      const pendingPromiseResolver = localPending.get(String(id))
      if (pendingPromiseResolver) {
        localPending.delete(String(id))
        pendingPromiseResolver(messageEvent.data)
      }
    }
    
    return () => { 
      worker.terminate()
      workerRef.current = null
      localPending.clear()
    }
  }, [])

  const callWorker = useCallback((payload: WorkerAction): Promise<WorkerResult> => {
    const id = String(++reqIdRef.current)
    return new Promise<WorkerResult>((resolve) => {
      pendingRef.current.set(id, resolve)
      workerRef.current?.postMessage({ id, ...payload })
    })
  }, [])

  // Handler functions without parameters (for passing to components)
  const handleSplitTwoAreas = useCallback(async () => {
    const result = await callWorker({ type: 'splitTwo', input: getInput(), keywords: getKeywords() })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setWithoutKeywords(result.without || '')
      setLeftLabelMode('withKeywords')
      setRightLabelMode('withoutKeywords')
    }
  }, [callWorker, getInput, getKeywords])

  const handleStrictBegin = useCallback(async () => {
    const result = await callWorker({ type: 'strictBegin', input: getInput(), keywords: getKeywords() })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setWithoutKeywords(result.without || '')
      setLeftLabelMode('withKeywords')
      setRightLabelMode('withoutKeywords')
    }
  }, [callWorker, getInput, getKeywords])

  const handleStrictInner = useCallback(async () => {
    const result = await callWorker({ type: 'strictInner', input: getInput(), keywords: getKeywords() })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setWithoutKeywords(result.without || '')
      setLeftLabelMode('withKeywords')
      setRightLabelMode('withoutKeywords')
    }
  }, [callWorker, getInput, getKeywords])

  const handleStrictEnd = useCallback(async () => {
    const result = await callWorker({ type: 'strictEnd', input: getInput(), keywords: getKeywords() })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setWithoutKeywords(result.without || '')
      setLeftLabelMode('withKeywords')
      setRightLabelMode('withoutKeywords')
    }
  }, [callWorker, getInput, getKeywords])

  const handleCreateWithKeywords = useCallback(async () => {
    const result = await callWorker({ type: 'createWith', input: getInput(), keywords: getKeywords() })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setLeftLabelMode('withKeywords')
    }
  }, [callWorker, getInput, getKeywords])

  const handleCreateWithoutKeywords = useCallback(async () => {
    const result = await callWorker({ type: 'createWithout', input: getInput(), keywords: getKeywords() })
    if (result?.ok) {
      setWithoutKeywords(result.without || '')
      setRightLabelMode('withoutKeywords')
    }
  }, [callWorker, getInput, getKeywords])

  const handleReplace = useCallback(async () => {
    const result = await callWorker({ 
      type: 'replace', 
      input: getInput(), 
      keywords: getKeywords(), 
      replacements: getReplacements() 
    })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setLeftLabelMode('withKeywords')
    } else {
      alert(t('replacementError'))
    }
  }, [callWorker, getInput, getKeywords, getReplacements, t])

  const handleReplaceUpper = useCallback(async () => {
    const result = await callWorker({ 
      type: 'replaceUpper', 
      input: getInput(), 
      keywords: getKeywords(), 
      replacements: getReplacements() 
    })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setLeftLabelMode('withKeywords')
    } else {
      alert(t('replacementError'))
    }
  }, [callWorker, getInput, getKeywords, getReplacements, t])

  const handleDeduplicate = useCallback(async () => {
    const result = await callWorker({ type: 'dedup', input: getInput() })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setWithoutKeywords(result.without || '')
      setLeftLabelMode('withoutDuplicates')
      setRightLabelMode('duplicates')
    }
  }, [callWorker, getInput])

  const clearResults = useCallback(() => {
    setWithKeywords('')
    setWithoutKeywords('')
  }, [])

  const clearWithKeywords = useCallback(() => {
    setWithKeywords('')
  }, [])

  const clearWithoutKeywords = useCallback(() => {
    setWithoutKeywords('')
  }, [])

  return {
    // States
    withKeywords,
    withoutKeywords,
    leftLabelMode,
    rightLabelMode,
    
    // Actions
    handleSplitTwoAreas,
    handleStrictBegin,
    handleStrictInner,
    handleStrictEnd,
    handleCreateWithKeywords,
    handleCreateWithoutKeywords,
    handleReplace,
    handleReplaceUpper,
    handleDeduplicate,
    clearResults,
    clearWithKeywords,
    clearWithoutKeywords,
  }
}