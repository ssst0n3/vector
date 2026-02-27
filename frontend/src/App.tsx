import { useState } from 'react'
import './App.css'

const NAV_ITEMS = [
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

type NavId = (typeof NAV_ITEMS)[number]['id']

function App() {
  const [activeId, setActiveId] = useState<NavId>('mandala')
  const activeItem = NAV_ITEMS.find((item) => item.id === activeId)

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
            <p className="nav-title">Modules</p>
            <div className="nav-items">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${activeId === item.id ? 'is-active' : ''}`}
                  onClick={() => setActiveId(item.id)}
                  aria-current={activeId === item.id ? 'page' : undefined}
                >
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-desc">{item.description}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className="app-main">
          <section className="content-header">
            <p className="content-eyebrow">Current view</p>
            <h1 className="content-title">{activeItem?.label}</h1>
            <p className="content-desc">{activeItem?.description}</p>
          </section>

          <section className={`content-panel ${activeId}-panel`}>
            <div className="panel-card">
              <h2 className="panel-title">基础布局占位</h2>
              <p className="panel-desc">
                在这里放置核心功能区域。当前仅保留框架与排版结构。
              </p>
            </div>
            <div className="panel-card muted">
              <h3 className="panel-subtitle">状态提示</h3>
              <p className="panel-desc">
                后续将添加功能组件、数据与交互逻辑。
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
