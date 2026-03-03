type DataSourceType = 'local' | 's3' | 'gist'

type DataSourceSettingsPanelProps = {
  activeSourceType: DataSourceType
  isQuerySourceOverride: boolean
  onActiveSourceTypeChange: (nextType: DataSourceType) => void
  s3SourceUrlDraft: string
  gistSourceUrlDraft: string
  gistTokenDraft: string
  onS3SourceUrlDraftChange: (value: string) => void
  onGistSourceUrlDraftChange: (value: string) => void
  onGistTokenDraftChange: (value: string) => void
  onSaveS3Config: () => void
  onSaveGistConfig: () => void
  localSourceFeedback: string
  s3SourceFeedback: string
  gistSourceFeedback: string
}

function DataSourceSettingsPanel({
  activeSourceType,
  isQuerySourceOverride,
  onActiveSourceTypeChange,
  s3SourceUrlDraft,
  gistSourceUrlDraft,
  gistTokenDraft,
  onS3SourceUrlDraftChange,
  onGistSourceUrlDraftChange,
  onGistTokenDraftChange,
  onSaveS3Config,
  onSaveGistConfig,
  localSourceFeedback,
  s3SourceFeedback,
  gistSourceFeedback,
}: DataSourceSettingsPanelProps) {
  return (
    <section className="content-panel">
      <article className="panel-card">
        <h2 className="panel-title">Data Source</h2>
        <p className="panel-desc">S3 与 GitHub Gist 配置已拆分管理，Gist 会按项目自动写入对应文件（projectId.json）。</p>
        <p className="mandala-path">
          当前激活：{activeSourceType === 'local' ? 'localStorage' : activeSourceType === 's3' ? 'S3' : 'Gist'}
          {isQuerySourceOverride ? '（URL src 参数临时覆盖）' : ''}
        </p>

        <div className="project-actions" role="radiogroup" aria-label="激活数据源类型">
          <button
            type="button"
            className={`mandala-action ${activeSourceType === 'local' ? '' : 'is-muted'}`}
            onClick={() => onActiveSourceTypeChange('local')}
            role="radio"
            aria-checked={activeSourceType === 'local'}
          >
            使用 localStorage
          </button>
          <button
            type="button"
            className={`mandala-action ${activeSourceType === 's3' ? '' : 'is-muted'}`}
            onClick={() => onActiveSourceTypeChange('s3')}
            role="radio"
            aria-checked={activeSourceType === 's3'}
          >
            使用 S3
          </button>
          <button
            type="button"
            className={`mandala-action ${activeSourceType === 'gist' ? '' : 'is-muted'}`}
            onClick={() => onActiveSourceTypeChange('gist')}
            role="radio"
            aria-checked={activeSourceType === 'gist'}
          >
            使用 Gist
          </button>
        </div>
      </article>

      <article className="panel-card">
        <h3 className="panel-subtitle">localStorage（自动保存）</h3>
        <p className="panel-desc">选择 localStorage 后，项目数据会在当前浏览器自动持久化，无需手动保存。</p>
        {localSourceFeedback && <p className="mandala-path">{localSourceFeedback}</p>}
      </article>

      <article className="panel-card">
        <h3 className="panel-subtitle">S3 数据源</h3>
        <div className="project-editor project-editor-inline" role="group" aria-label="S3 数据源配置">
          <label className="project-field" htmlFor="s3-source-url">
            <span>S3 地址（JSON）</span>
            <input
              id="s3-source-url"
              className="project-input"
              value={s3SourceUrlDraft}
              onChange={(event) => onS3SourceUrlDraftChange(event.target.value)}
              placeholder="https://bucket.s3.region.amazonaws.com/data.json"
            />
          </label>

          <div className="project-actions">
            <button type="button" className="mandala-action" onClick={onSaveS3Config}>
              保存 S3 配置并加载
            </button>
          </div>

          {s3SourceFeedback && <p className="mandala-path">{s3SourceFeedback}</p>}
        </div>
      </article>

      <article className="panel-card">
        <h3 className="panel-subtitle">Gist 数据源</h3>
        <div className="project-editor project-editor-inline" role="group" aria-label="Gist 数据源配置">
          <label className="project-field" htmlFor="gist-source-url">
            <span>Gist 地址或 ID</span>
            <input
              id="gist-source-url"
              className="project-input"
              value={gistSourceUrlDraft}
              onChange={(event) => onGistSourceUrlDraftChange(event.target.value)}
              placeholder="https://gist.github.com/user/gistId 或 gistId"
            />
          </label>

          <label className="project-field" htmlFor="gist-token">
            <span>GitHub Token（gist 权限）</span>
            <input
              id="gist-token"
              className="project-input"
              type="password"
              value={gistTokenDraft}
              onChange={(event) => onGistTokenDraftChange(event.target.value)}
              placeholder="ghp_xxx"
              autoComplete="off"
            />
          </label>

          <div className="project-actions">
            <button type="button" className="mandala-action" onClick={onSaveGistConfig}>
              保存 Gist 配置并加载
            </button>
          </div>

          {gistSourceFeedback && <p className="mandala-path">{gistSourceFeedback}</p>}
        </div>
      </article>
    </section>
  )
}

export default DataSourceSettingsPanel
