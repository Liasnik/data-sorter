type ActionsPanelProps = {
  onSplitTwoAreas: () => void;
  onStrictBegin: () => void;
  onStrictInner: () => void;
  onStrictEnd: () => void;
  onDeduplicate: () => void;
  t: (key: 'splitByAnyMatches' | 'exactBegin' | 'exactInner' | 'exactEnd' | 'deduplicate') => string;
  disabled?: boolean;
}

export function ActionsPanel({
  onSplitTwoAreas,
  onStrictBegin,
  onStrictInner,
  onStrictEnd,
  onDeduplicate,
  t,
  disabled = false,
}: ActionsPanelProps) {
  return (
    <div className="card gridItem-actions">
      <div className="actions">
        <button className="btn btn-accent" type="button" onClick={onSplitTwoAreas} disabled={disabled}>
          {t('splitByAnyMatches')}
        </button>
        <div className="strict-row">
          <button className="btn" type="button" onClick={onStrictBegin} disabled={disabled}>{t('exactBegin')}</button>
          <button className="btn" type="button" onClick={onStrictInner} disabled={disabled}>{t('exactInner')}</button>
          <button className="btn" type="button" onClick={onStrictEnd} disabled={disabled}>{t('exactEnd')}</button>
        </div>
        <div className="strict-row">
          <button className="btn" type="button" onClick={onDeduplicate} disabled={disabled}>{t('deduplicate')}</button>
        </div>
      </div>
    </div>
  )
}
