import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  getKeywordsArray,
  getReplacementArray,
  getUniqueLines,
  joinLines,
  filterWithAnyKeywordCaseInsensitive,
  filterWithoutAnyKeywordCaseInsensitive,
  splitAtBeginning,
  splitByCellInnerValue,
  splitAtEnding,
  replaceValuesCaseSensitive,
  replaceValuesUpperCase
} from './utils/textProcessing'

function App() {
  const [keywordsInput, setKeywordsInput] = useState<string>('')
  const [replacementsInput, setReplacementsInput] = useState<string>('')
  const [incomingList, setIncomingList] = useState<string>('')
  const [withKeywords, setWithKeywords] = useState<string>('')
  const [withoutKeywords, setWithoutKeywords] = useState<string>('')

  useEffect(() => {
    const savedKeywords = localStorage.getItem('key')
    if (savedKeywords) {
      try {
        const parsed = JSON.parse(savedKeywords)
        if (typeof parsed === 'string') setKeywordsInput(parsed)
      } catch {
        setKeywordsInput(savedKeywords)
      }
    }
  }, [])

  useEffect(() => {
    // persist keywords as a plain string
    localStorage.setItem('key', JSON.stringify(keywordsInput.trim()))
  }, [keywordsInput])

  const keywordsArray = useMemo(() => getKeywordsArray(keywordsInput), [keywordsInput])
  const replacementsArray = useMemo(() => getReplacementArray(replacementsInput), [replacementsInput])
  const uniqueLines = useMemo(() => getUniqueLines(incomingList), [incomingList])

  const handleSplitTwoAreas = () => {
    const withK = filterWithAnyKeywordCaseInsensitive(uniqueLines, keywordsArray)
    const withoutK = filterWithoutAnyKeywordCaseInsensitive(uniqueLines, keywordsArray)
    setWithKeywords(joinLines(withK))
    setWithoutKeywords(joinLines(withoutK))
  }

  const handleStrictBegin = () => {
    const { withKeywords: withK, withoutKeywords: withoutK } = splitAtBeginning(uniqueLines, keywordsArray)
    setWithKeywords(joinLines(withK.length ? [...withK, ''] : withK))
    setWithoutKeywords(joinLines(withoutK))
  }

  const handleStrictInner = () => {
    const { withKeywords: withK, withoutKeywords: withoutK } = splitByCellInnerValue(uniqueLines, keywordsArray)
    setWithKeywords(joinLines(withK.length ? [...withK, ''] : withK))
    setWithoutKeywords(joinLines(withoutK))
  }

  const handleStrictEnd = () => {
    const { withKeywords: withK, withoutKeywords: withoutK } = splitAtEnding(uniqueLines, keywordsArray)
    setWithKeywords(joinLines(withK.length ? [...withK, ''] : withK))
    setWithoutKeywords(joinLines(withoutK))
  }

  const handleCreateWithKeywords = () => {
    const withK = filterWithAnyKeywordCaseInsensitive(uniqueLines, keywordsArray)
    setWithKeywords(joinLines(withK))
  }

  const handleCreateWithoutKeywords = () => {
    const withoutK = filterWithoutAnyKeywordCaseInsensitive(uniqueLines, keywordsArray)
    setWithoutKeywords(joinLines(withoutK))
  }

  const handleReplace = () => {
    try {
      const replaced = replaceValuesCaseSensitive(uniqueLines, keywordsArray, replacementsArray)
      setWithKeywords(joinLines(replaced))
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message)
      else alert('Replacement error')
    }
  }

  const handleReplaceUpper = () => {
    try {
      const replaced = replaceValuesUpperCase(uniqueLines, keywordsArray, replacementsArray)
      setWithKeywords(joinLines(replaced))
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message)
      else alert('Replacement error')
    }
  }

  const handleClearStorage = () => {
    localStorage.removeItem('key')
    setKeywordsInput('')
    setReplacementsInput('')
    setIncomingList('')
    setWithKeywords('')
    setWithoutKeywords('')
  }

  return (
    <div className="container">
      
      <section className="panel">
        <div className="field-group">
          <label htmlFor="input-keywords" className="label">Enter keywords</label>
          <input
            id="input-keywords"
            className="input"
            type="text"
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="e.g.: apple orange banana"
          />
        </div>

        <div className="replace-row">
          <button className="btn btn-primary" type="button" onClick={handleReplace}>Replace</button>
          <button className="btn" type="button" onClick={handleReplaceUpper}>REPLACE (UPPERCASE)</button>
          <input
            id="input-replace"
            className="input flex-1"
            type="text"
            value={replacementsInput}
            onChange={(e) => setReplacementsInput(e.target.value)}
            placeholder="replacements: a1 a2 a3 (same count as keywords)"
          />
        </div>
      </section>

      <section className="grid">
        <div className="card gridItem-input">
          <div className="field-group">
            <label htmlFor="incoming-list" className="label">Paste list here</label>
            <textarea
              id="incoming-list"
              className="textarea"
              value={incomingList}
              onChange={(e) => setIncomingList(e.target.value)}
              rows={10}
              placeholder={"each line is a separate record"}
            />
          </div>
        </div>

        <div className="card gridItem-actions">
          <div className="actions">
            <button className="btn btn-accent" type="button" onClick={handleSplitTwoAreas}>
              SPLIT INTO TWO LISTS by any matches!
            </button>
            <div className="strict-row">
              <button className="btn" type="button" onClick={handleStrictBegin}>Exact match at BEGINNING (tab-prefixed)</button>
              <button className="btn" type="button" onClick={handleStrictInner}>Exact match in MIDDLE cells (space-wrapped)</button>
              <button className="btn" type="button" onClick={handleStrictEnd}>Exact match at END (tab-suffixed)</button>
            </div>
          </div>
        </div>

        <div className="card gridItem-with">
          <div className="field-group">
            <label htmlFor="with-keywords" className="label">Data with keywords</label>
            <textarea
              id="with-keywords"
              className="textarea"
              value={withKeywords}
              onChange={(e) => setWithKeywords(e.target.value)}
              rows={8}
            />
          </div>
          <div className="actions">
            <button className="btn" type="button" onClick={handleCreateWithKeywords}>With keywords</button>
          </div>
        </div>

        <div className="card gridItem-without">
          <div className="field-group">
            <label htmlFor="without-keywords" className="label">Data without keywords</label>
            <textarea
              id="without-keywords"
              className="textarea"
              value={withoutKeywords}
              onChange={(e) => setWithoutKeywords(e.target.value)}
              rows={8}
            />
          </div>
          <div className="actions">
            <button className="btn" type="button" onClick={handleCreateWithoutKeywords}>Without keywords</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-row">
          <button id="del" className="btn" type="button" onClick={handleClearStorage}>clear local storage</button>
        </div>
      </footer>
    </div>
  )
}

export default App
