import { useMemo, useState } from 'react'
import './App.css'

const DEFAULT_PROJECTS = [
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

const PROJECT_STATUS_OPTIONS = ['Active', 'Planning', 'In review', 'Paused', 'Done'] as const

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

const OVERVIEW_GRID_LAYOUT = ['w1', 'w2', 'w3', 'w4', 'objective', 'w5', 'w6', 'w7', 'w8'] as const

type ViewMode = 'home' | 'projects' | 'projectDetail'
type MandalaLayer = 'root' | 'pillar' | 'overview'
type ProjectId = (typeof DEFAULT_PROJECTS)[number]['id']
type ProjectTabId = (typeof PROJECT_TABS)[number]['id']
type ProjectMeta = {
  name: string
  summary: string
  status: string
}
type RootCell = (typeof ROOT_CELLS)[number]
type RootCellId = RootCell['id']
type PillarId = Exclude<RootCellId, 'objective'>
type ActionMeta = (typeof ACTION_LAYOUT)[number]
type ActionId = ActionMeta['id']
type DrillPath = [PillarId, ...ActionId[]]

type CellContent = {
  title: string
  subtitle: string
}

type DrillNode = {
  core: CellContent
  actions: Record<ActionId, CellContent>
  children: Partial<Record<ActionId, DrillNode>>
}

type Ow64Board = {
  core: CellContent
  pillars: Record<PillarId, CellContent>
  drills: Record<PillarId, DrillNode>
}

type EditingTarget =
  | { scope: 'core' }
  | { scope: 'pillar'; pillarId: PillarId }
  | { scope: 'drillCore'; path: DrillPath }

const NEW_STORAGE_KEY_PREFIX = 'ow64:board:'
const LEGACY_STORAGE_KEY_PREFIX = 'ow64:mandala:'
const PROJECT_META_STORAGE_KEY = 'project:meta:v1'

const DEFAULT_PROJECT_META_BY_ID = DEFAULT_PROJECTS.reduce(
  (acc, project) => {
    acc[project.id] = {
      name: project.name,
      summary: project.summary,
      status: project.status,
    }
    return acc
  },
  {} as Record<ProjectId, ProjectMeta>,
)

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

const isSamePath = (left: DrillPath, right: DrillPath) => {
  if (left.length !== right.length) {
    return false
  }

  return left.every((segment, index) => segment === right[index])
}

const getMarkerByPath = (path: DrillPath): string => {
  const [pillarId, ...actionIds] = path
  const segments = [PILLAR_META[pillarId].marker, ...actionIds.map((actionId) => ACTION_META[actionId].marker)]
  return segments.join('-')
}

const getPathTitleSegments = (board: Ow64Board, path: DrillPath): string[] => {
  const [pillarId, ...actionPath] = path
  const titles = [board.pillars[pillarId].title]
  let currentNode = board.drills[pillarId]

  for (const actionId of actionPath) {
    titles.push(currentNode.actions[actionId].title)
    const nextNode = currentNode.children[actionId]
    if (!nextNode) {
      break
    }
    currentNode = nextNode
  }

  return titles
}

const createDrillNode = (seed: CellContent, seedMarker: string): DrillNode => {
  const actions = ACTION_LAYOUT.reduce((acc, action) => {
    acc[action.id] = {
      title: `${seedMarker} ${action.marker}`,
      subtitle: action.subtitle,
    }
    return acc
  }, {} as Record<ActionId, CellContent>)

  return {
    core: {
      title: seed.title,
      subtitle: seed.subtitle,
    },
    actions,
    children: {},
  }
}

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

  const drills = PILLAR_CELLS.reduce((pillarAcc, cell) => {
    pillarAcc[cell.id] = createDrillNode(
      {
        title: cell.title,
        subtitle: cell.subtitle,
      },
      cell.marker,
    )
    return pillarAcc
  }, {} as Record<PillarId, DrillNode>)

  return {
    core,
    pillars,
    drills,
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

  const mergeNode = (base: DrillNode, candidate: unknown): DrillNode => {
    if (!candidate || typeof candidate !== 'object') {
      return base
    }

    const parsedNode = candidate as Partial<DrillNode>
    const nextNode: DrillNode = {
      core: base.core,
      actions: { ...base.actions },
      children: { ...base.children },
    }

    if (isCellContent(parsedNode.core)) {
      nextNode.core = parsedNode.core
    }

    for (const action of ACTION_LAYOUT) {
      const incomingAction = parsedNode.actions?.[action.id]
      if (isCellContent(incomingAction)) {
        nextNode.actions[action.id] = incomingAction
      }

      const incomingChild = parsedNode.children?.[action.id]
      if (incomingChild) {
        nextNode.children[action.id] = mergeNode(
          createDrillNode(nextNode.actions[action.id], `${nextNode.actions[action.id].title}`),
          incomingChild,
        )
      }
    }

    return nextNode
  }

  for (const pillar of PILLAR_CELLS) {
    const incomingPillar = parsed.pillars?.[pillar.id]
    if (isCellContent(incomingPillar)) {
      defaults.pillars[pillar.id] = incomingPillar
    }
    defaults.drills[pillar.id].core = {
      title: defaults.pillars[pillar.id].title,
      subtitle: defaults.pillars[pillar.id].subtitle,
    }

    const legacyActions = (parsed as Partial<{ actions: Record<PillarId, Record<ActionId, CellContent>> }>).actions
    for (const action of ACTION_LAYOUT) {
      const legacyAction = legacyActions?.[pillar.id]?.[action.id]
      if (isCellContent(legacyAction)) {
        defaults.drills[pillar.id].actions[action.id] = legacyAction
      }
    }

    const incomingDrill = (parsed as Partial<Ow64Board>).drills?.[pillar.id]
    defaults.drills[pillar.id] = mergeNode(defaults.drills[pillar.id], incomingDrill)
  }

  return defaults
}

const migrateLegacyBoard = (incoming: unknown): Ow64Board => {
  const defaults = createDefaultOw64Board()
  if (!incoming || typeof incoming !== 'object') {
    return defaults
  }

  const parsed = incoming as Partial<Record<RootCellId, Partial<CellContent>>> &
    Partial<{ actions: Record<PillarId, Record<ActionId, Partial<CellContent>>> }>
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
      defaults.drills[cell.id].core = {
        title: defaults.pillars[cell.id].title,
        subtitle: defaults.pillars[cell.id].subtitle,
      }
    }
  }

  for (const pillar of PILLAR_CELLS) {
    for (const action of ACTION_LAYOUT) {
      const oldAction = parsed.actions?.[pillar.id]?.[action.id]
      const title = typeof oldAction?.title === 'string' ? oldAction.title : null
      const subtitle = typeof oldAction?.subtitle === 'string' ? oldAction.subtitle : null

      if (!title && !subtitle) {
        continue
      }

      defaults.drills[pillar.id].actions[action.id] = {
        title: title ?? defaults.drills[pillar.id].actions[action.id].title,
        subtitle: subtitle ?? defaults.drills[pillar.id].actions[action.id].subtitle,
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

const loadProjectMetaById = (): Record<ProjectId, ProjectMeta> => {
  const defaults = DEFAULT_PROJECTS.reduce(
    (acc, project) => {
      acc[project.id] = {
        ...DEFAULT_PROJECT_META_BY_ID[project.id],
      }
      return acc
    },
    {} as Record<ProjectId, ProjectMeta>,
  )

  if (typeof window === 'undefined') {
    return defaults
  }

  const raw = window.localStorage.getItem(PROJECT_META_STORAGE_KEY)
  if (!raw) {
    return defaults
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<ProjectId, Partial<ProjectMeta>>>

    for (const project of DEFAULT_PROJECTS) {
      const incoming = parsed[project.id]
      if (!incoming) {
        continue
      }

      const name = typeof incoming.name === 'string' ? incoming.name : null
      const summary = typeof incoming.summary === 'string' ? incoming.summary : null
      const status = typeof incoming.status === 'string' ? incoming.status : null

      defaults[project.id] = {
        name: name ?? defaults[project.id].name,
        summary: summary ?? defaults[project.id].summary,
        status: status ?? defaults[project.id].status,
      }
    }

    return defaults
  } catch {
    return defaults
  }
}

const persistProjectMetaById = (metaById: Record<ProjectId, ProjectMeta>) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PROJECT_META_STORAGE_KEY, JSON.stringify(metaById))
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

  if (left.scope === 'drillCore' && right.scope === 'drillCore') {
    return isSamePath(left.path, right.path)
  }

  return false
}

const getNodeByPath = (board: Ow64Board, path: DrillPath): DrillNode => {
  const [pillarId, ...actionPath] = path
  let currentNode = board.drills[pillarId]

  for (const actionId of actionPath) {
    const nextNode = currentNode.children[actionId]
    if (!nextNode) {
      return currentNode
    }
    currentNode = nextNode
  }

  return currentNode
}

const upsertNodeByPath = (node: DrillNode, actionPath: ActionId[], depth: number): DrillNode => {
  if (depth >= actionPath.length) {
    return node
  }

  const actionId = actionPath[depth]
  const existingChild = node.children[actionId]
  const seed = node.actions[actionId]
  const marker = `${seed.title}`
  const baseChild = existingChild ?? createDrillNode(seed, marker)
  const nextChild = upsertNodeByPath(baseChild, actionPath, depth + 1)

  if (existingChild === nextChild) {
    return node
  }

  return {
    ...node,
    children: {
      ...node.children,
      [actionId]: nextChild,
    },
  }
}

const ensurePathExists = (board: Ow64Board, path: DrillPath): Ow64Board => {
  const [pillarId, ...actionPath] = path
  if (actionPath.length === 0) {
    return board
  }

  const currentRootNode = board.drills[pillarId]
  const nextRootNode = upsertNodeByPath(currentRootNode, actionPath, 0)

  if (nextRootNode === currentRootNode) {
    return board
  }

  return {
    ...board,
    drills: {
      ...board.drills,
      [pillarId]: nextRootNode,
    },
  }
}

const getContentByTarget = (board: Ow64Board, target: EditingTarget): CellContent => {
  if (target.scope === 'core') {
    return board.core
  }

  if (target.scope === 'pillar') {
    return board.pillars[target.pillarId]
  }

  return getNodeByPath(board, target.path).core
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
      drills: {
        ...board.drills,
        [target.pillarId]: {
          ...board.drills[target.pillarId],
          core: content,
        },
      },
    }
  }

  const [pillarId, ...actionPath] = target.path

  if (actionPath.length === 0) {
    return {
      ...board,
      pillars: {
        ...board.pillars,
        [pillarId]: content,
      },
      drills: {
        ...board.drills,
        [pillarId]: {
          ...board.drills[pillarId],
          core: content,
        },
      },
    }
  }

  const setNodeCore = (node: DrillNode, depth: number): DrillNode => {
    if (depth === actionPath.length) {
      return {
        ...node,
        core: content,
      }
    }

    const actionId = actionPath[depth]
    const childNode = node.children[actionId] ?? createDrillNode(node.actions[actionId], `${node.actions[actionId].title}`)
    const nextChild = setNodeCore(childNode, depth + 1)

    if (nextChild === childNode) {
      return node
    }

    return {
      ...node,
      children: {
        ...node.children,
        [actionId]: nextChild,
      },
    }
  }

  const nextPillarRoot = setNodeCore(board.drills[pillarId], 0)

  return {
    ...board,
    drills: {
      ...board.drills,
      [pillarId]: nextPillarRoot,
    },
  }
}

const getDefaultContentByTarget = (target: EditingTarget, board: Ow64Board): CellContent => {
  if (target.scope === 'drillCore' && target.path.length > 1) {
    const parentPath = [target.path[0], ...target.path.slice(1, -1)] as DrillPath
    const parentNode = getNodeByPath(board, parentPath)
    const seedActionId = target.path[target.path.length - 1] as ActionId
    return parentNode.actions[seedActionId]
  }

  const defaults = createDefaultOw64Board()
  return getContentByTarget(defaults, target)
}

function App() {
  const [view, setView] = useState<ViewMode>('home')
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>('atlas')
  const [activeTab, setActiveTab] = useState<ProjectTabId>('mandala')
  const [activeLayer, setActiveLayer] = useState<MandalaLayer>('root')
  const [drillPath, setDrillPath] = useState<DrillPath | null>(null)
  const [projectMetaById, setProjectMetaById] = useState<Record<ProjectId, ProjectMeta>>(() => loadProjectMetaById())
  const [boardByProject, setBoardByProject] = useState<Record<ProjectId, Ow64Board>>(() => {
    return DEFAULT_PROJECTS.reduce((acc, project) => {
      acc[project.id] = loadOw64Board(project.id)
      return acc
    }, {} as Record<ProjectId, Ow64Board>)
  })
  const [projectEditingId, setProjectEditingId] = useState<ProjectId | null>(null)
  const [projectDraftName, setProjectDraftName] = useState('')
  const [projectDraftSummary, setProjectDraftSummary] = useState('')
  const [projectDraftStatus, setProjectDraftStatus] = useState<string>(PROJECT_STATUS_OPTIONS[0])
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSubtitle, setDraftSubtitle] = useState('')

  const projects = useMemo(
    () =>
      DEFAULT_PROJECTS.map((project) => ({
        id: project.id,
        ...projectMetaById[project.id],
      })),
    [projectMetaById],
  )

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  )

  const currentBoard = boardByProject[selectedProjectId]
  const isProjectEditing = projectEditingId !== null
  const activeTabInfo = PROJECT_TABS.find((tab) => tab.id === activeTab)
  const activeDrillPath = drillPath ?? ([PILLAR_CELLS[0].id] as DrillPath)
  const activeDrillPillarId = activeDrillPath[0]
  const activeDrillNode = getNodeByPath(currentBoard, activeDrillPath)
  const activeDrillTitleSegments = getPathTitleSegments(currentBoard, activeDrillPath)

  const resetEditingDraft = () => {
    setEditingTarget(null)
    setDraftTitle('')
    setDraftSubtitle('')
  }

  const resetMandalaLayer = () => {
    setActiveLayer('root')
    setDrillPath(null)
  }

  const resetProjectDraft = () => {
    setProjectEditingId(null)
    setProjectDraftName('')
    setProjectDraftSummary('')
    setProjectDraftStatus(PROJECT_STATUS_OPTIONS[0])
  }

  const handleViewChange = (nextView: ViewMode) => {
    resetEditingDraft()
    resetMandalaLayer()
    resetProjectDraft()
    setView(nextView)
  }

  const handleTabChange = (tabId: ProjectTabId) => {
    resetEditingDraft()
    resetProjectDraft()
    if (tabId !== 'mandala') {
      resetMandalaLayer()
    }
    setActiveTab(tabId)
  }

  const handleProjectEnter = (projectId: ProjectId) => {
    resetEditingDraft()
    resetMandalaLayer()
    resetProjectDraft()
    setSelectedProjectId(projectId)
    setView('projectDetail')
    setActiveTab('mandala')
  }

  const handleBackToProjects = () => {
    resetEditingDraft()
    resetMandalaLayer()
    resetProjectDraft()
    setView('projects')
  }

  const handleProjectEditStart = (projectId: ProjectId) => {
    const projectMeta = projectMetaById[projectId]
    if (!projectMeta) {
      return
    }

    setProjectEditingId(projectId)
    setProjectDraftName(projectMeta.name)
    setProjectDraftSummary(projectMeta.summary)
    setProjectDraftStatus(projectMeta.status)
  }

  const handleProjectEditCancel = () => {
    resetProjectDraft()
  }

  const handleProjectEditSave = () => {
    if (!projectEditingId) {
      return
    }

    const trimmedName = projectDraftName.trim()
    if (!trimmedName) {
      return
    }

    const nextMeta: ProjectMeta = {
      name: trimmedName,
      summary: projectDraftSummary.trim(),
      status: projectDraftStatus.trim(),
    }

    setProjectMetaById((prev) => {
      const next = {
        ...prev,
        [projectEditingId]: nextMeta,
      }
      persistProjectMetaById(next)
      return next
    })

    handleProjectEditCancel()
  }

  const handleProjectEditReset = () => {
    const targetProjectId = projectEditingId ?? selectedProjectId
    const defaultMeta = DEFAULT_PROJECT_META_BY_ID[targetProjectId]

    setProjectMetaById((prev) => {
      const next = {
        ...prev,
        [targetProjectId]: {
          ...defaultMeta,
        },
      }
      persistProjectMetaById(next)
      return next
    })

    if (isProjectEditing) {
      setProjectDraftName(defaultMeta.name)
      setProjectDraftSummary(defaultMeta.summary)
      setProjectDraftStatus(defaultMeta.status)
    }
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
    const defaultContent = getDefaultContentByTarget(target, currentBoard)

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
    setDrillPath([pillarId] as DrillPath)
  }

  const handleDrillDeeper = (actionId: ActionId) => {
    resetEditingDraft()
    const nextPath = [...activeDrillPath, actionId] as DrillPath

    setBoardByProject((prev) => {
      const ensuredBoard = ensurePathExists(prev[selectedProjectId], nextPath)
      if (ensuredBoard === prev[selectedProjectId]) {
        return prev
      }

      const next = {
        ...prev,
        [selectedProjectId]: ensuredBoard,
      }

      persistOw64Board(selectedProjectId, ensuredBoard)
      return next
    })

    setActiveLayer('pillar')
    setDrillPath(nextPath)
  }

  const handleBackOneLevel = () => {
    if (!drillPath || drillPath.length <= 1) {
      return
    }

    resetEditingDraft()
    setDrillPath([drillPath[0], ...drillPath.slice(1, -1)] as DrillPath)
  }

  const handleMandalaLayerChange = (nextLayer: MandalaLayer) => {
    resetEditingDraft()

    if (nextLayer === 'root') {
      resetMandalaLayer()
      return
    }

    if (nextLayer === 'pillar') {
      setActiveLayer('pillar')
      setDrillPath((prev) => prev ?? ([PILLAR_CELLS[0].id] as DrillPath))
      return
    }

    setActiveLayer('overview')
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
                {projects.map((project) => (
                  <article key={project.id} className="panel-card project-card">
                    <div>
                      <p className="project-status">{project.status}</p>
                      <h2 className="panel-title">{project.name}</h2>
                      <p className="panel-desc">{project.summary}</p>
                    </div>

                    {projectEditingId === project.id ? (
                      <div className="project-editor project-editor-inline" role="group" aria-label="编辑项目信息">
                        <label className="project-field" htmlFor={`project-name-${project.id}`}>
                          <span>项目名称</span>
                          <input
                            id={`project-name-${project.id}`}
                            className="project-input"
                            value={projectDraftName}
                            onChange={(event) => setProjectDraftName(event.target.value)}
                            placeholder="输入项目名称"
                          />
                        </label>
                        <label className="project-field" htmlFor={`project-summary-${project.id}`}>
                          <span>项目简介</span>
                          <input
                            id={`project-summary-${project.id}`}
                            className="project-input"
                            value={projectDraftSummary}
                            onChange={(event) => setProjectDraftSummary(event.target.value)}
                            placeholder="输入项目简介"
                          />
                        </label>
                        <label className="project-field" htmlFor={`project-status-${project.id}`}>
                          <span>项目状态</span>
                          <select
                            id={`project-status-${project.id}`}
                            className="project-input"
                            value={projectDraftStatus}
                            onChange={(event) => setProjectDraftStatus(event.target.value)}
                          >
                            {PROJECT_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                            {!PROJECT_STATUS_OPTIONS.includes(projectDraftStatus as (typeof PROJECT_STATUS_OPTIONS)[number]) && (
                              <option value={projectDraftStatus}>{projectDraftStatus}</option>
                            )}
                          </select>
                        </label>
                        <div className="project-actions">
                          <button
                            type="button"
                            className="mandala-action"
                            onClick={handleProjectEditSave}
                            disabled={!projectDraftName.trim()}
                          >
                            保存
                          </button>
                          <button type="button" className="mandala-action is-muted" onClick={handleProjectEditCancel}>
                            取消
                          </button>
                          <button type="button" className="mandala-action is-muted" onClick={handleProjectEditReset}>
                            恢复默认
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="project-card-actions">
                        <button type="button" className="ghost-button" onClick={() => handleProjectEnter(project.id)}>
                          进入项目
                        </button>
                        <button type="button" className="ghost-button" onClick={() => handleProjectEditStart(project.id)}>
                          编辑信息
                        </button>
                      </div>
                    )}
                  </article>
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
                  <div className="detail-actions">
                    <button type="button" className="ghost-button" onClick={handleBackToProjects}>
                      返回项目管理
                    </button>
                    {projectEditingId !== selectedProjectId && (
                      <button type="button" className="ghost-button" onClick={() => handleProjectEditStart(selectedProjectId)}>
                        编辑项目信息
                      </button>
                    )}
                  </div>
                </div>
                <p className="content-desc">{selectedProject?.summary}</p>
                {projectEditingId === selectedProjectId && (
                  <div className="project-editor" role="group" aria-label="编辑项目信息">
                    <label className="project-field" htmlFor="project-name">
                      <span>项目名称</span>
                      <input
                        id="project-name"
                        className="project-input"
                        value={projectDraftName}
                        onChange={(event) => setProjectDraftName(event.target.value)}
                        placeholder="输入项目名称"
                      />
                    </label>
                    <label className="project-field" htmlFor="project-summary">
                      <span>项目简介</span>
                      <input
                        id="project-summary"
                        className="project-input"
                        value={projectDraftSummary}
                        onChange={(event) => setProjectDraftSummary(event.target.value)}
                        placeholder="输入项目简介"
                      />
                    </label>
                    <label className="project-field" htmlFor="project-status">
                      <span>项目状态</span>
                      <select
                        id="project-status"
                        className="project-input"
                        value={projectDraftStatus}
                        onChange={(event) => setProjectDraftStatus(event.target.value)}
                      >
                        {PROJECT_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                        {!PROJECT_STATUS_OPTIONS.includes(projectDraftStatus as (typeof PROJECT_STATUS_OPTIONS)[number]) && (
                          <option value={projectDraftStatus}>{projectDraftStatus}</option>
                        )}
                      </select>
                    </label>
                    <div className="project-actions">
                      <button
                        type="button"
                        className="mandala-action"
                        onClick={handleProjectEditSave}
                        disabled={!projectDraftName.trim()}
                      >
                        保存
                      </button>
                      <button type="button" className="mandala-action is-muted" onClick={handleProjectEditCancel}>
                        取消
                      </button>
                      <button type="button" className="mandala-action is-muted" onClick={handleProjectEditReset}>
                        恢复默认
                      </button>
                    </div>
                  </div>
                )}
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
                  <div className="mandala-toolbar">
                    <div className="mandala-layer-switch" role="tablist" aria-label="OW64 views">
                      <button
                        type="button"
                        role="tab"
                        className={`layer-switch-item ${activeLayer === 'root' ? 'is-active' : ''}`}
                        aria-selected={activeLayer === 'root'}
                        onClick={() => handleMandalaLayerChange('root')}
                      >
                        OW9 主盘
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={`layer-switch-item ${activeLayer === 'pillar' ? 'is-active' : ''}`}
                        aria-selected={activeLayer === 'pillar'}
                        onClick={() => handleMandalaLayerChange('pillar')}
                      >
                        下钻视图
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={`layer-switch-item ${activeLayer === 'overview' ? 'is-active' : ''}`}
                        aria-selected={activeLayer === 'overview'}
                        onClick={() => handleMandalaLayerChange('overview')}
                      >
                        OW64 全景
                      </button>
                    </div>

                    {activeLayer === 'pillar' ? (
                      <div className="mandala-toolbar-meta">
                        <div className="mandala-toolbar-actions">
                          {activeDrillPath.length > 1 && (
                            <button type="button" className="ghost-button" onClick={handleBackOneLevel}>
                              返回上一级
                            </button>
                          )}
                          <button type="button" className="ghost-button" onClick={handleBackToRoot}>
                            返回 OW9 主盘
                          </button>
                        </div>
                        <p className="mandala-path">
                          OW64 / {getMarkerByPath(activeDrillPath)} / {activeDrillTitleSegments.join(' / ')}
                        </p>
                      </div>
                    ) : activeLayer === 'overview' ? (
                      <p className="mandala-path">全景展示 8 个方向与各自 8 个行动点</p>
                    ) : (
                      <p className="mandala-path">点击 W1~W8 可进入对应行动九宫格</p>
                    )}
                  </div>

                  {activeLayer === 'overview' ? (
                    <div className="ow64-overview-scroll">
                      <div className="ow64-overview-grid">
                        {OVERVIEW_GRID_LAYOUT.map((layoutCellId) => {
                          if (layoutCellId === 'objective') {
                            return (
                              <article key={layoutCellId} className="ow64-overview-panel is-center">
                                <div className="ow64-overview-head">
                                  <p className="ow64-overview-title">主盘</p>
                                  <button
                                    type="button"
                                    className="ghost-button"
                                    onClick={() => handleMandalaLayerChange('root')}
                                  >
                                    打开
                                  </button>
                                </div>
                                <div className="ow64-mini-grid">
                                  {ROOT_CELLS.map((cell) => {
                                    const target: EditingTarget =
                                      cell.id === 'objective'
                                        ? { scope: 'core' }
                                        : { scope: 'pillar', pillarId: cell.id as PillarId }
                                    const content = getContentByTarget(currentBoard, target)
                                    return (
                                      <div key={`root-${cell.id}`} className={`ow64-mini-cell ${cell.id === 'objective' ? 'is-core' : ''}`}>
                                        <span className="ow64-mini-marker">{cell.marker}</span>
                                        <p className="ow64-mini-text">{content.title}</p>
                                      </div>
                                    )
                                  })}
                                </div>
                              </article>
                            )
                          }

                          const pillarId = layoutCellId as PillarId
                          return (
                            <article key={pillarId} className="ow64-overview-panel">
                              <div className="ow64-overview-head">
                                <p className="ow64-overview-title">{PILLAR_META[pillarId].marker} 行动盘</p>
                                <button type="button" className="ghost-button" onClick={() => handleOpenPillar(pillarId)}>
                                  打开
                                </button>
                              </div>
                              <div className="ow64-mini-grid">
                                {PILLAR_GRID_LAYOUT.map((gridItem) => {
                                  const target: EditingTarget =
                                    gridItem.type === 'center'
                                      ? { scope: 'pillar', pillarId }
                                      : { scope: 'drillCore', path: [pillarId] as DrillPath }
                                  const marker =
                                    gridItem.type === 'center' ? PILLAR_META[pillarId].marker : ACTION_META[gridItem.actionId].marker
                                  const content =
                                    gridItem.type === 'center'
                                      ? getContentByTarget(currentBoard, target)
                                      : currentBoard.drills[pillarId].actions[gridItem.actionId]

                                  return (
                                    <div
                                      key={gridItem.type === 'center' ? `${pillarId}-center` : `${pillarId}-${gridItem.actionId}`}
                                      className={`ow64-mini-cell ${gridItem.type === 'center' ? 'is-core' : ''}`}
                                    >
                                      <span className="ow64-mini-marker">{marker}</span>
                                      <p className="ow64-mini-text">{content.title}</p>
                                    </div>
                                  )
                                })}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
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
                              <article key={cell.id} className="mandala-cell" aria-label={`${cell.marker} ${content.title}`}>
                                <span className="mandala-marker">{cell.marker}</span>
                                <h2 className="mandala-title">{content.title}</h2>
                                <p className="mandala-subtitle">{content.subtitle}</p>
                                <p className="mandala-hint">点击进入 {cell.marker} 的 8 个行动点</p>
                                <div className="mandala-cell-actions">
                                  <button
                                    type="button"
                                    className="mandala-cell-action"
                                    onClick={() => handleStartEdit(target)}
                                    aria-label={`编辑 ${cell.marker} ${content.title}`}
                                  >
                                    编辑
                                  </button>
                                  <button
                                    type="button"
                                    className="mandala-cell-action is-primary"
                                    onClick={() => handleOpenPillar(cell.id as PillarId)}
                                    aria-label={`进入 ${cell.marker} 的 8 个行动点`}
                                  >
                                    进入下钻
                                  </button>
                                </div>
                              </article>
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
                        PILLAR_GRID_LAYOUT.map((gridItem) => {
                          const centerTarget: EditingTarget = { scope: 'drillCore', path: activeDrillPath }

                          if (gridItem.type === 'center') {
                            const marker = getMarkerByPath(activeDrillPath)
                            const content = activeDrillNode.core
                            const editing = isSameTarget(editingTarget, centerTarget)

                            const inputIdSuffix =
                              activeDrillPath.length === 1
                                ? `${activeDrillPillarId}-center`
                                : `${activeDrillPath.join('-')}-center`

                            if (editing) {
                              return (
                                <div key={inputIdSuffix} className="mandala-cell mandala-editor is-core">
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
                                      onClick={() => handleResetTarget(centerTarget)}
                                    >
                                      恢复默认
                                    </button>
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <button
                                key={inputIdSuffix}
                                type="button"
                                className="mandala-cell is-core"
                                onClick={() => handleStartEdit(centerTarget)}
                                aria-label={`${marker} ${content.title}`}
                              >
                                <span className="mandala-marker">{marker}</span>
                                <h2 className="mandala-title">{content.title}</h2>
                                <p className="mandala-subtitle">{content.subtitle}</p>
                                <p className="mandala-hint">点击编辑当前下钻主题</p>
                              </button>
                            )
                          }

                          const marker = ACTION_META[gridItem.actionId].marker
                          const content = activeDrillNode.actions[gridItem.actionId]

                          return (
                            <button
                              key={`${activeDrillPath.join('-')}-${gridItem.actionId}`}
                              type="button"
                              className="mandala-cell"
                              onClick={() => handleDrillDeeper(gridItem.actionId)}
                              aria-label={`${marker} ${content.title}`}
                            >
                              <span className="mandala-marker">{marker}</span>
                              <h2 className="mandala-title">{content.title}</h2>
                              <p className="mandala-subtitle">{content.subtitle}</p>
                              <p className="mandala-hint">点击继续下钻</p>
                            </button>
                          )
                        })}
                    </div>
                  )}
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
