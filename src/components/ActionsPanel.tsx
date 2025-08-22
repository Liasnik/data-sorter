type ActionsPanelProps = {
  onSplitTwoAreas: () => void;
  onStrictBegin: () => void;
  onStrictInner: () => void;
  onStrictEnd: () => void;
  onDeduplicate: () => void;
  t: (key: 'splitByAnyMatches' | 'exactBegin' | 'exactInner' | 'exactEnd' | 'deduplicate') => string;
}

export function ActionsPanel({
  onSplitTwoAreas,
  onStrictBegin,
  onStrictInner,
  onStrictEnd,
  onDeduplicate,
  t,
}: ActionsPanelProps) {
  return (
    <div className="card gridItem-actions">
      <div className="actions">
        <button className="btn btn-accent" type="button" onClick={onSplitTwoAreas}>
          {t('splitByAnyMatches')}
        </button>
        <div className="strict-row">
          <button className="btn" type="button" onClick={onStrictBegin}>{t('exactBegin')}</button>
          <button className="btn" type="button" onClick={onStrictInner}>{t('exactInner')}</button>
          <button className="btn" type="button" onClick={onStrictEnd}>{t('exactEnd')}</button>
        </div>
        <div className="strict-row">
          <button className="btn" type="button" onClick={onDeduplicate}>{t('deduplicate')}</button>
        </div>
      </div>
    </div>
  )
}
