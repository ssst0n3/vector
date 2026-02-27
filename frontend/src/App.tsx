import { useMemo, useState } from 'react'
import './App.css'

const PROJECTS = [
  {
    id: 'atlas',
    name: 'Atlas Initiative',
    summary: '跨团队目标对齐与路线拆解',
    status: 'Active',
  },
  {
    id: 'harbor',
    name: 'Harbor Systems',
    summary: '流程优化与交付节奏重塑',
    status: 'Planning',
  },
  {
    id: 'northstar',
    name: 'Northstar Program',
    summary: '关键指标与增长闭环设计',
    status: 'In review',
  },
] as const

const PROJECT_TABS = [
  {
    id: 'mandala',
    label: '曼德拉九宫格 (OW64)',
    description: '目标聚焦与行动拆解空间',
  },
  {
    id: 'tasks',
    label: '任务管理',
    description: '待办、优先级与节奏管理',
  },
] as const

const ROOT_CELLS = [
  {
    id: 'w1',
    title: '战略澄清',
    subtitle: '左上 North-West',
    role: 'pillar',
    marker: 'W1',
  },
  {
    id: 'w2',
    title: '资源整合',
    subtitle: '上方 North',
    role: 'pillar',
    marker: 'W2',
  },
  {
    id: 'w3',
    title: '协作机制',
    subtitle: '右上 North-East',
    role: 'pillar',
    marker: 'W3',
  },
  {
    id: 'w4',
    title: '节奏推进',
    subtitle: '左侧 West',
    role: 'pillar',
    marker: 'W4',
  },
  {
    id: 'objective',
    title: '2026 核心目标',
    subtitle: '中心 Objective',
    role: 'core',
    marker: 'O',
  },
  {
    id: 'w5',
    title: '关键里程碑',
    subtitle: '右侧 East',
    role: 'pillar',
    marker: 'W5',
  },
  {
    id: 'w6',
    title: '能力建设',
    subtitle: '左下 South-West',
    role: 'pillar',
    marker: 'W6',
  },
  {
    id: 'w7',
    title: '风险治理',
    subtitle: '下方 South',
    role: 'pillar',
    marker: 'W7',
  },
  {
    id: 'w8',
    title: '复盘优化',
    subtitle: '右下 South-East',
    role: 'pillar',
    marker: 'W8',
  },
] as const

const ACTION_LAYOUT = [
  { id: 'a1', marker: 'A1', subtitle: '左上 Action' },
  { id: 'a2', marker: 'A2', subtitle: '上方 Action' },
  { id: 'a3', marker: 'A3', subtitle: '右上 Action' },
  { id: 'a4', marker: 'A4', subtitle: '左侧 Action' },
  { id: 'a5', marker: 'A5', subtitle: '右侧 Action' },
  { id: 'a6', marker: 'A6', subtitle: '左下 Action' },
  { id: 'a7', marker: 'A7', subtitle: '下方 Action' },
  { id: 'a8', marker: 'A8', subtitle: '右下 Action' },
] as const

const PILLAR_GRID_LAYOUT = [
  { type: 'action', actionId: 'a1' },
  { type: 'action', actionId: 'a2' },
  { type: 'action', actionId: 'a3' },
  { type: 'action', actionId: 'a4' },
  { type: 'center' },
  { type: 'action', actionId: 'a5' },
  { type: 'action', actionId: 'a6' },
  { type: 'action', actionId: 'a7' },
  { type: 'action', actionId: 'a8' },
] as const

type ViewMode = 'home' | 'projects' | 'projectDetail'
type MandalaLayer = 'root' | 'pillar'
type ProjectId = (typeof PROJECTS)[number]['id']
type ProjectTabId = (typeof PROJECT_TABS)[number]['id']
type RootCell = (typeof ROOT_CELLS)[number]
type RootCellId = RootCell['id']
type PillarId = Exclude<RootCellId, 'objective'>
type ActionMeta = (typeof ACTION_LAYOUT)[number]
type ActionId = ActionMeta['id']

type CellContent = {
  title: string
  subtitle: string
}

type Ow64Board = {
  core: CellContent
  pillars: Record<PillarId, CellContent>
  actions: Record<PillarId, Record<ActionId, CellContent>>
}

type EditingTarget =
  | { scope: 'core' }
  | { scope: 'pillar'; pillarId: PillarId }
  | { scope: 'action'; pillarId: PillarId; actionId: ActionId }

const NEW_STORAGE_KEY_PREFIX = 'ow64:board:'
const LEGACY_STORAGE_KEY_PREFIX = 'ow64:mandala:'

const PILLAR_CELLS = ROOT_CELLS.filter((cell): cell is Extract<RootCell, { role: 'pillar' }> => cell.role === 'pillar')

const OBJECTIVE_CELL = ROOT_CELLS.find((cell): cell is Extract<RootCell, { id: 'objective' }> => cell.id === 'objective')

const PILLAR_META = PILLAR_CELLS.reduce(
  (acc, cell) => {
    acc[cell.id] = cell
    return acc
  },
  {} as Record<PillarId, Extract<RootCell, { role: 'pillar' }>>,
)

const ACTION_META = ACTION_LAYOUT.reduce(
  (acc, action) => {
    acc[action.id] = action
    return acc
  },
  {} as Record<ActionId, ActionMeta>,
)

const createDefaultOw64Board = (): Ow64Board => {
  const core: CellContent = {
    title: OBJECTIVE_CELL?.title ?? '核心目标',
    subtitle: OBJECTIVE_CELL?.subtitle ?? '中心 Objective',
  }

  const pillars = PILLAR_CELLS.reduce((acc, cell) => {
    acc[cell.id] = {
      title: cell.title,
      subtitle: cell.subtitle,
    }
    return acc
  }, {} as Record<PillarId, CellContent>)

  const actions = PILLAR_CELLS.reduce((pillarAcc, cell) => {
    pillarAcc[cell.id] = ACTION_LAYOUT.reduce((actionAcc, action) => {
      actionAcc[action.id] = {
        title: `${cell.marker} ${action.marker}`,
        subtitle: action.subtitle,
      }
      return actionAcc
    }, {} as Record<ActionId, CellContent>)
    return pillarAcc
  }, {} as Record<PillarId, Record<ActionId, CellContent>>)

  return {
    core,
    pillars,
    actions,
  }
}

const isCellContent = (value: unknown): value is CellContent => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const maybe = value as Partial<CellContent>
  return typeof maybe.title === 'string' && typeof maybe.subtitle === 'string'
}

const mergeBoardWithDefault = (incoming: unknown): Ow64Board => {
  const defaults = createDefaultOw64Board()
  if (!incoming || typeof incoming !== 'object') {
    return defaults
  }

  const parsed = incoming as Partial<Ow64Board>

  if (isCellContent(parsed.core)) {
    defaults.core = parsed.core
  }

  for (const pillar of PILLAR_CELLS) {
    const incomingPillar = parsed.pillars?.[pillar.id]
    if (isCellContent(incomingPillar)) {
      defaults.pillars[pillar.id] = incomingPillar
    }

    for (const action of ACTION_LAYOUT) {
      const incomingAction = parsed.actions?.[pillar.id]?.[action.id]
      if (isCellContent(incomingAction)) {
        defaults.actions[pillar.id][action.id] = incomingAction
      }
    }
  }

  return defaults
}

const migrateLegacyBoard = (incoming: unknown): Ow64Board => {
  const defaults = createDefaultOw64Board()
  if (!incoming || typeof incoming !== 'object') {
    return defaults
  }

  const parsed = incoming as Partial<Record<RootCellId, Partial<CellContent>>>
  for (const cell of ROOT_CELLS) {
    const oldCell = parsed[cell.id]
    if (!oldCell) {
      continue
    }

    const title = typeof oldCell.title === 'string' ? oldCell.title : null
    const subtitle = typeof oldCell.subtitle === 'string' ? oldCell.subtitle : null
    if (!title && !subtitle) {
      continue
    }

    if (cell.id === 'objective') {
      defaults.core = {
        title: title ?? defaults.core.title,
        subtitle: subtitle ?? defaults.core.subtitle,
      }
    } else {
      defaults.pillars[cell.id] = {
        title: title ?? defaults.pillars[cell.id].title,
        subtitle: subtitle ?? defaults.pillars[cell.id].subtitle,
      }
    }
  }

  return defaults
}

const loadOw64Board = (projectId: ProjectId): Ow64Board => {
  if (typeof window === 'undefined') {
    return createDefaultOw64Board()
  }

  const rawNew = window.localStorage.getItem(`${NEW_STORAGE_KEY_PREFIX}${projectId}`)
  if (rawNew) {
    try {
      return mergeBoardWithDefault(JSON.parse(rawNew))
    } catch {
      return createDefaultOw64Board()
    }
  }

  const rawLegacy = window.localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${projectId}`)
  if (!rawLegacy) {
    return createDefaultOw64Board()
  }

  try {
    const migrated = migrateLegacyBoard(JSON.parse(rawLegacy))
    window.localStorage.setItem(`${NEW_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(migrated))
    return migrated
  } catch {
    return createDefaultOw64Board()
  }
}

const persistOw64Board = (projectId: ProjectId, board: Ow64Board) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(`${NEW_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(board))
}

const isSameTarget = (left: EditingTarget | null, right: EditingTarget) => {
  if (!left) {
    return false
  }

  if (left.scope !== right.scope) {
    return false
  }

  if (left.scope === 'core' && right.scope === 'core') {
    return true
  }

  if (left.scope === 'pillar' && right.scope === 'pillar') {
    return left.pillarId === right.pillarId
  }

  if (left.scope === 'action' && right.scope === 'action') {
    return left.pillarId === right.pillarId && left.actionId === right.actionId
  }

  return false
}

const getContentByTarget = (board: Ow64Board, target: EditingTarget): CellContent => {
  if (target.scope === 'core') {
    return board.core
  }

  if (target.scope === 'pillar') {
    return board.pillars[target.pillarId]
  }

  return board.actions[target.pillarId][target.actionId]
}

const setContentByTarget = (board: Ow64Board, target: EditingTarget, content: CellContent): Ow64Board => {
  if (target.scope === 'core') {
    return {
      ...board,
      core: content,
    }
  }

  if (target.scope === 'pillar') {
    return {
      ...board,
      pillars: {
        ...board.pillars,
        [target.pillarId]: content,
      },
    }
  }

  return {
    ...board,
    actions: {
      ...board.actions,
      [target.pillarId]: {
        ...board.actions[target.pillarId],
        [target.actionId]: content,
      },
    },
  }
}

const getDefaultContentByTarget = (target: EditingTarget): CellContent => {
  const defaults = createDefaultOw64Board()
  return getContentByTarget(defaults, target)
}

function App() {
  const [view, setView] = useState<ViewMode>('home')
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>('atlas')
  const [activeTab, setActiveTab] = useState<ProjectTabId>('mandala')
  const [activeLayer, setActiveLayer] = useState<MandalaLayer>('root')
  const [activePillarId, setActivePillarId] = useState<PillarId | null>(null)
  const [boardByProject, setBoardByProject] = useState<Record<ProjectId, Ow64Board>>(() => {
    return PROJECTS.reduce((acc, project) => {
      acc[project.id] = loadOw64Board(project.id)
      return acc
    }, {} as Record<ProjectId, Ow64Board>)
  })
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSubtitle, setDraftSubtitle] = useState('')

  const selectedProject = useMemo(
    () => PROJECTS.find((project) => project.id === selectedProjectId),
    [selectedProjectId],
  )

  const currentBoard = boardByProject[selectedProjectId]
  const activeTabInfo = PROJECT_TABS.find((tab) => tab.id === activeTab)

  const resetEditingDraft = () => {
    setEditingTarget(null)
    setDraftTitle('')
    setDraftSubtitle('')
  }

  const resetMandalaLayer = () => {
    setActiveLayer('root')
    setActivePillarId(null)
  }

  const handleViewChange = (nextView: ViewMode) => {
    resetEditingDraft()
    resetMandalaLayer()
    setView(nextView)
  }

  const handleTabChange = (tabId: ProjectTabId) => {
    resetEditingDraft()
    if (tabId !== 'mandala') {
      resetMandalaLayer()
    }
    setActiveTab(tabId)
  }

  const handleProjectEnter = (projectId: ProjectId) => {
    resetEditingDraft()
    resetMandalaLayer()
    setSelectedProjectId(projectId)
    setView('projectDetail')
    setActiveTab('mandala')
  }

  const handleBackToProjects = () => {
    resetEditingDraft()
    resetMandalaLayer()
    setView('projects')
  }

  const handleStartEdit = (target: EditingTarget) => {
    const content = getContentByTarget(currentBoard, target)
    setEditingTarget(target)
    setDraftTitle(content.title)
    setDraftSubtitle(content.subtitle)
  }

  const handleCancelEdit = () => {
    resetEditingDraft()
  }

  const handleSaveEdit = () => {
    if (!editingTarget) {
      return
    }

    const trimmedTitle = draftTitle.trim()
    if (!trimmedTitle) {
      return
    }

    const nextContent: CellContent = {
      title: trimmedTitle,
      subtitle: draftSubtitle.trim(),
    }

    setBoardByProject((prev) => {
      const updatedBoard = setContentByTarget(prev[selectedProjectId], editingTarget, nextContent)
      const next = {
        ...prev,
        [selectedProjectId]: updatedBoard,
      }

      persistOw64Board(selectedProjectId, updatedBoard)
      return next
    })

    handleCancelEdit()
  }

  const handleResetTarget = (target: EditingTarget) => {
    const defaultContent = getDefaultContentByTarget(target)

    setBoardByProject((prev) => {
      const updatedBoard = setContentByTarget(prev[selectedProjectId], target, defaultContent)
      const next = {
        ...prev,
        [selectedProjectId]: updatedBoard,
      }

      persistOw64Board(selectedProjectId, updatedBoard)
      return next
    })

    if (isSameTarget(editingTarget, target)) {
      handleCancelEdit()
    }
  }

  const handleOpenPillar = (pillarId: PillarId) => {
    resetEditingDraft()
    setActiveLayer('pillar')
    setActivePillarId(pillarId)
  }

  const handleBackToRoot = () => {
    resetEditingDraft()
    resetMandalaLayer()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">OW64</span>
          <div className="brand-text">
            <p className="brand-title">Project Layout</p>
            <p className="brand-subtitle">Focus and execution workspace</p>
          </div>
        </div>
        <div className="header-meta">
          <p className="header-label">Workspace</p>
          <p className="header-value">Layout v0.1</p>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <nav className="side-nav" aria-label="Primary">
            <p className="nav-title">Navigation</p>
            <div className="nav-items">
              <button
                type="button"
                className={`nav-item ${view === 'home' ? 'is-active' : ''}`}
                onClick={() => handleViewChange('home')}
                aria-current={view === 'home' ? 'page' : undefined}
              >
                <span className="nav-label">首页</span>
                <span className="nav-desc">项目与任务概览</span>
              </button>
              <button
                type="button"
                className={`nav-item ${view === 'projects' ? 'is-active' : ''}`}
                onClick={() => handleViewChange('projects')}
                aria-current={view === 'projects' ? 'page' : undefined}
              >
                <span className="nav-label">项目管理</span>
                <span className="nav-desc">项目列表与管理入口</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="app-main">
          {view === 'home' && (
            <>
              <section className="content-header">
                <p className="content-eyebrow">Overview</p>
                <h1 className="content-title">首页</h1>
                <p className="content-desc">集中展示项目进度与任务节奏。</p>
              </section>
              <section className="content-panel home-panel">
                <div className="panel-card">
                  <h2 className="panel-title">项目概览</h2>
                  <p className="panel-desc">展示关键项目进展、里程碑与风险提示。</p>
                </div>
                <div className="panel-card muted">
                  <h3 className="panel-subtitle">任务概览</h3>
                  <p className="panel-desc">展示本周重点任务、到期提醒与优先级分布。</p>
                </div>
              </section>
            </>
          )}

          {view === 'projects' && (
            <>
              <section className="content-header">
                <p className="content-eyebrow">Projects</p>
                <h1 className="content-title">项目管理</h1>
                <p className="content-desc">浏览项目列表，进入详情空间。</p>
              </section>
              <section className="content-panel projects-panel">
                {PROJECTS.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="panel-card project-card"
                    onClick={() => handleProjectEnter(project.id)}
                  >
                    <div>
                      <p className="project-status">{project.status}</p>
                      <h2 className="panel-title">{project.name}</h2>
                      <p className="panel-desc">{project.summary}</p>
                    </div>
                    <span className="project-cta">进入项目</span>
                  </button>
                ))}
              </section>
            </>
          )}

          {view === 'projectDetail' && (
            <>
              <section className="content-header">
                <p className="content-eyebrow">Project</p>
                <div className="detail-title">
                  <h1 className="content-title">{selectedProject?.name}</h1>
                  <button type="button" className="ghost-button" onClick={handleBackToProjects}>
                    返回项目管理
                  </button>
                </div>
                <p className="content-desc">{selectedProject?.summary}</p>
              </section>

              <section className="tab-bar" role="tablist" aria-label="Project tabs">
                {PROJECT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    className={`tab-item ${activeTab === tab.id ? 'is-active' : ''}`}
                    aria-selected={activeTab === tab.id}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </section>

              {activeTab === 'mandala' ? (
                <section className="mandala-layout" aria-label="曼德拉九宫格 OW64">
                  {activeLayer === 'pillar' && activePillarId && (
                    <div className="mandala-toolbar">
                      <button type="button" className="ghost-button" onClick={handleBackToRoot}>
                        返回 OW9 主盘
                      </button>
                      <p className="mandala-path">
                        OW64 / {PILLAR_META[activePillarId].marker} {currentBoard.pillars[activePillarId].title}
                      </p>
                    </div>
                  )}

                  <div className="mandala-grid">
                    {activeLayer === 'root' &&
                      ROOT_CELLS.map((cell) => {
                        const target: EditingTarget =
                          cell.id === 'objective'
                            ? { scope: 'core' }
                            : { scope: 'pillar', pillarId: cell.id as PillarId }
                        const content = getContentByTarget(currentBoard, target)
                        const editing = isSameTarget(editingTarget, target)

                        if (editing) {
                          return (
                            <div
                              key={cell.id}
                              className={`mandala-cell mandala-editor ${cell.role === 'core' ? 'is-core' : ''}`}
                            >
                              <span className="mandala-marker">{cell.marker}</span>
                              <label className="mandala-field" htmlFor={`title-${cell.id}`}>
                                <span>目标</span>
                                <input
                                  id={`title-${cell.id}`}
                                  value={draftTitle}
                                  onChange={(event) => setDraftTitle(event.target.value)}
                                  className="mandala-input"
                                  placeholder="输入目标"
                                />
                              </label>
                              <label className="mandala-field" htmlFor={`subtitle-${cell.id}`}>
                                <span>说明</span>
                                <input
                                  id={`subtitle-${cell.id}`}
                                  value={draftSubtitle}
                                  onChange={(event) => setDraftSubtitle(event.target.value)}
                                  className="mandala-input"
                                  placeholder="输入说明"
                                />
                              </label>
                              <div className="mandala-actions">
                                <button
                                  type="button"
                                  className="mandala-action"
                                  onClick={handleSaveEdit}
                                  disabled={!draftTitle.trim()}
                                >
                                  保存
                                </button>
                                <button type="button" className="mandala-action is-muted" onClick={handleCancelEdit}>
                                  取消
                                </button>
                                <button
                                  type="button"
                                  className="mandala-action is-muted"
                                  onClick={() => handleResetTarget(target)}
                                >
                                  恢复默认
                                </button>
                              </div>
                            </div>
                          )
                        }

                        if (cell.role === 'pillar') {
                          return (
                            <button
                              key={cell.id}
                              type="button"
                              className="mandala-cell"
                              aria-label={`${cell.marker} ${content.title}，点击展开 8 个行动点`}
                              onClick={() => handleOpenPillar(cell.id as PillarId)}
                            >
                              <span className="mandala-marker">{cell.marker}</span>
                              <h2 className="mandala-title">{content.title}</h2>
                              <p className="mandala-subtitle">{content.subtitle}</p>
                              <p className="mandala-hint">点击进入 {cell.marker} 的 8 个行动点</p>
                            </button>
                          )
                        }

                        return (
                          <button
                            key={cell.id}
                            type="button"
                            className="mandala-cell is-core"
                            aria-label={`${cell.marker} ${content.title}`}
                            onClick={() => handleStartEdit(target)}
                          >
                            <span className="mandala-marker">{cell.marker}</span>
                            <h2 className="mandala-title">{content.title}</h2>
                            <p className="mandala-subtitle">{content.subtitle}</p>
                            <p className="mandala-hint">点击编辑核心目标</p>
                          </button>
                        )
                      })}

                    {activeLayer === 'pillar' &&
                      activePillarId &&
                      PILLAR_GRID_LAYOUT.map((gridItem) => {
                        const target: EditingTarget =
                          gridItem.type === 'center'
                            ? { scope: 'pillar', pillarId: activePillarId }
                            : { scope: 'action', pillarId: activePillarId, actionId: gridItem.actionId }

                        const marker =
                          gridItem.type === 'center'
                            ? PILLAR_META[activePillarId].marker
                            : ACTION_META[gridItem.actionId].marker

                        const content = getContentByTarget(currentBoard, target)
                        const editing = isSameTarget(editingTarget, target)

                        if (editing) {
                          const inputIdSuffix =
                            gridItem.type === 'center' ? `${activePillarId}-center` : `${activePillarId}-${gridItem.actionId}`

                          return (
                            <div
                              key={inputIdSuffix}
                              className={`mandala-cell mandala-editor ${gridItem.type === 'center' ? 'is-core' : ''}`}
                            >
                              <span className="mandala-marker">{marker}</span>
                              <label className="mandala-field" htmlFor={`title-${inputIdSuffix}`}>
                                <span>目标</span>
                                <input
                                  id={`title-${inputIdSuffix}`}
                                  value={draftTitle}
                                  onChange={(event) => setDraftTitle(event.target.value)}
                                  className="mandala-input"
                                  placeholder="输入目标"
                                />
                              </label>
                              <label className="mandala-field" htmlFor={`subtitle-${inputIdSuffix}`}>
                                <span>说明</span>
                                <input
                                  id={`subtitle-${inputIdSuffix}`}
                                  value={draftSubtitle}
                                  onChange={(event) => setDraftSubtitle(event.target.value)}
                                  className="mandala-input"
                                  placeholder="输入说明"
                                />
                              </label>
                              <div className="mandala-actions">
                                <button
                                  type="button"
                                  className="mandala-action"
                                  onClick={handleSaveEdit}
                                  disabled={!draftTitle.trim()}
                                >
                                  保存
                                </button>
                                <button type="button" className="mandala-action is-muted" onClick={handleCancelEdit}>
                                  取消
                                </button>
                                <button
                                  type="button"
                                  className="mandala-action is-muted"
                                  onClick={() => handleResetTarget(target)}
                                >
                                  恢复默认
                                </button>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <button
                            key={gridItem.type === 'center' ? `${activePillarId}-center` : `${activePillarId}-${gridItem.actionId}`}
                            type="button"
                            className={`mandala-cell ${gridItem.type === 'center' ? 'is-core' : ''}`}
                            onClick={() => handleStartEdit(target)}
                            aria-label={`${marker} ${content.title}`}
                          >
                            <span className="mandala-marker">{marker}</span>
                            <h2 className="mandala-title">{content.title}</h2>
                            <p className="mandala-subtitle">{content.subtitle}</p>
                            <p className="mandala-hint">点击编辑</p>
                          </button>
                        )
                      })}
                  </div>
                </section>
              ) : (
                <section className={`content-panel detail-panel ${activeTab}-panel`}>
                  <div className="panel-card">
                    <h2 className="panel-title">{activeTabInfo?.label}</h2>
                    <p className="panel-desc">{activeTabInfo?.description}</p>
                  </div>
                  <div className="panel-card muted">
                    <h3 className="panel-subtitle">功能占位</h3>
                    <p className="panel-desc">此处将填充对应模块的布局与交互。</p>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
