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

type ViewMode = 'home' | 'projects' | 'projectDetail'
type ProjectId = (typeof PROJECTS)[number]['id']
type ProjectTabId = (typeof PROJECT_TABS)[number]['id']

function App() {
  const [view, setView] = useState<ViewMode>('home')
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>('atlas')
  const [activeTab, setActiveTab] = useState<ProjectTabId>('mandala')

  const selectedProject = useMemo(
    () => PROJECTS.find((project) => project.id === selectedProjectId),
    [selectedProjectId],
  )

  const activeTabInfo = PROJECT_TABS.find((tab) => tab.id === activeTab)

  const handleProjectEnter = (projectId: ProjectId) => {
    setSelectedProjectId(projectId)
    setView('projectDetail')
  }

  const handleBackToProjects = () => {
    setView('projects')
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
                onClick={() => setView('home')}
                aria-current={view === 'home' ? 'page' : undefined}
              >
                <span className="nav-label">首页</span>
                <span className="nav-desc">项目与任务概览</span>
              </button>
              <button
                type="button"
                className={`nav-item ${view === 'projects' ? 'is-active' : ''}`}
                onClick={() => setView('projects')}
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
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </section>

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
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
