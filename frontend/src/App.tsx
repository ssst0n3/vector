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

const MANDALA_CELLS = [
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

type ViewMode = 'home' | 'projects' | 'projectDetail'
type ProjectId = (typeof PROJECTS)[number]['id']
type ProjectTabId = (typeof PROJECT_TABS)[number]['id']
type MandalaCell = (typeof MANDALA_CELLS)[number]
type MandalaCellId = MandalaCell['id']
type MandalaContent = Record<MandalaCellId, { title: string; subtitle: string }>

const createDefaultMandalaContent = (): MandalaContent => {
  return MANDALA_CELLS.reduce((acc, cell) => {
    acc[cell.id] = {
      title: cell.title,
      subtitle: cell.subtitle,
    }
    return acc
  }, {} as MandalaContent)
}

const loadMandalaContent = (projectId: ProjectId): MandalaContent => {
  const defaultContent = createDefaultMandalaContent()

  if (typeof window === 'undefined') {
    return defaultContent
  }

  const raw = window.localStorage.getItem(`ow64:mandala:${projectId}`)
  if (!raw) {
    return defaultContent
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<MandalaCellId, Partial<{ title: string; subtitle: string }>>>
    for (const cell of MANDALA_CELLS) {
      const incoming = parsed[cell.id]
      if (!incoming) {
        continue
      }

      if (typeof incoming.title === 'string') {
        defaultContent[cell.id].title = incoming.title
      }

      if (typeof incoming.subtitle === 'string') {
        defaultContent[cell.id].subtitle = incoming.subtitle
      }
    }
  } catch {
    return defaultContent
  }

  return defaultContent
}

const persistMandalaContent = (projectId: ProjectId, content: MandalaContent) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(`ow64:mandala:${projectId}`, JSON.stringify(content))
}

function App() {
  const [view, setView] = useState<ViewMode>('home')
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>('atlas')
  const [activeTab, setActiveTab] = useState<ProjectTabId>('mandala')
  const [mandalaByProject, setMandalaByProject] = useState<Record<ProjectId, MandalaContent>>(() => {
    return PROJECTS.reduce((acc, project) => {
      acc[project.id] = loadMandalaContent(project.id)
      return acc
    }, {} as Record<ProjectId, MandalaContent>)
  })
  const [editingCellId, setEditingCellId] = useState<MandalaCellId | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSubtitle, setDraftSubtitle] = useState('')

  const selectedProject = useMemo(
    () => PROJECTS.find((project) => project.id === selectedProjectId),
    [selectedProjectId],
  )

  const currentMandala = mandalaByProject[selectedProjectId]

  const activeTabInfo = PROJECT_TABS.find((tab) => tab.id === activeTab)

  const resetEditingDraft = () => {
    setEditingCellId(null)
    setDraftTitle('')
    setDraftSubtitle('')
  }

  const handleViewChange = (nextView: ViewMode) => {
    resetEditingDraft()
    setView(nextView)
  }

  const handleTabChange = (tabId: ProjectTabId) => {
    resetEditingDraft()
    setActiveTab(tabId)
  }

  const handleProjectEnter = (projectId: ProjectId) => {
    resetEditingDraft()
    setSelectedProjectId(projectId)
    setView('projectDetail')
  }

  const handleBackToProjects = () => {
    resetEditingDraft()
    setView('projects')
  }

  const handleStartEdit = (cellId: MandalaCellId) => {
    const cellData = currentMandala[cellId]
    setEditingCellId(cellId)
    setDraftTitle(cellData.title)
    setDraftSubtitle(cellData.subtitle)
  }

  const handleCancelEdit = () => {
    resetEditingDraft()
  }

  const handleSaveEdit = () => {
    if (!editingCellId) {
      return
    }

    const trimmedTitle = draftTitle.trim()
    if (!trimmedTitle) {
      return
    }

    const trimmedSubtitle = draftSubtitle.trim()

    setMandalaByProject((prev) => {
      const updatedProjectContent: MandalaContent = {
        ...prev[selectedProjectId],
        [editingCellId]: {
          title: trimmedTitle,
          subtitle: trimmedSubtitle,
        },
      }

      const next = {
        ...prev,
        [selectedProjectId]: updatedProjectContent,
      }

      persistMandalaContent(selectedProjectId, updatedProjectContent)
      return next
    })

    handleCancelEdit()
  }

  const handleResetCell = (cellId: MandalaCellId) => {
    const defaults = MANDALA_CELLS.find((cell) => cell.id === cellId)
    if (!defaults) {
      return
    }

    setMandalaByProject((prev) => {
      const updatedProjectContent: MandalaContent = {
        ...prev[selectedProjectId],
        [cellId]: {
          title: defaults.title,
          subtitle: defaults.subtitle,
        },
      }

      const next = {
        ...prev,
        [selectedProjectId]: updatedProjectContent,
      }

      persistMandalaContent(selectedProjectId, updatedProjectContent)
      return next
    })

    if (editingCellId === cellId) {
      handleCancelEdit()
    }
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
                <section className="mandala-layout" aria-label="曼德拉九宫格">
                  <div className="mandala-grid">
                    {MANDALA_CELLS.map((cell) => (
                      editingCellId === cell.id ? (
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
                            <button
                              type="button"
                              className="mandala-action is-muted"
                              onClick={handleCancelEdit}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              className="mandala-action is-muted"
                              onClick={() => handleResetCell(cell.id)}
                            >
                              恢复默认
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          key={cell.id}
                          type="button"
                          className={`mandala-cell ${cell.role === 'core' ? 'is-core' : ''}`}
                          aria-label={`${cell.marker} ${currentMandala[cell.id].title}`}
                          onClick={() => handleStartEdit(cell.id)}
                        >
                          <span className="mandala-marker">{cell.marker}</span>
                          <h2 className="mandala-title">{currentMandala[cell.id].title}</h2>
                          <p className="mandala-subtitle">{currentMandala[cell.id].subtitle}</p>
                        </button>
                      )
                    ))}
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
