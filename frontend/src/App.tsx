import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

const LEGACY_DEFAULT_PROJECTS = [
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
type ProjectId = string
type ProjectItem = {
  id: ProjectId
  name: string
  summary: string
  status: string
}
type ProjectTabId = (typeof PROJECT_TABS)[number]['id']
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
  visibleCore: boolean
  visibleActions: Record<ActionId, boolean>
}

type Ow64Board = {
  core: CellContent
  pillars: Record<PillarId, CellContent>
  drills: Record<PillarId, DrillNode>
  visibleCore: boolean
  visiblePillars: Record<PillarId, boolean>
}

type CsvRow = {
  rowType: 'root-core' | 'root-pillar' | 'drill-core' | 'drill-action'
  marker: string
  path: string
  title: string
  subtitle: string
}

const ROW_TYPE_LABEL: Record<CsvRow['rowType'], string> = {
  'root-core': 'Root Core',
  'root-pillar': 'Root Pillar',
  'drill-core': 'Drill Core',
  'drill-action': 'Drill Action',
}

type EditingTarget =
  | { scope: 'core' }
  | { scope: 'pillar'; pillarId: PillarId }
  | { scope: 'drillCore'; path: DrillPath }
  | { scope: 'drillAction'; path: DrillPath; actionId: ActionId }

const NEW_STORAGE_KEY_PREFIX = 'ow64:board:'
const LEGACY_STORAGE_KEY_PREFIX = 'ow64:mandala:'
const PROJECT_LIST_STORAGE_KEY = 'project:list:v1'
const LEGACY_PROJECT_META_STORAGE_KEY = 'project:meta:v1'

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

const PILLAR_ID_BY_MARKER = PILLAR_CELLS.reduce(
  (acc, pillar) => {
    acc[pillar.marker] = pillar.id
    return acc
  },
  {} as Record<string, PillarId>,
)

const ACTION_ID_BY_MARKER = ACTION_LAYOUT.reduce(
  (acc, action) => {
    acc[action.marker] = action.id
    return acc
  },
  {} as Record<string, ActionId>,
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

const createActionVisibilityMap = (visible: boolean): Record<ActionId, boolean> => {
  return ACTION_LAYOUT.reduce((acc, action) => {
    acc[action.id] = visible
    return acc
  }, {} as Record<ActionId, boolean>)
}

const createPillarVisibilityMap = (visible: boolean): Record<PillarId, boolean> => {
  return PILLAR_CELLS.reduce((acc, cell) => {
    acc[cell.id] = visible
    return acc
  }, {} as Record<PillarId, boolean>)
}

const createDrillNode = (
  seed: CellContent,
  seedMarker: string,
  visibility: { core?: boolean; actions?: boolean } = {},
): DrillNode => {
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
    visibleCore: visibility.core ?? false,
    visibleActions: createActionVisibilityMap(visibility.actions ?? false),
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
      { core: true, actions: true },
    )
    return pillarAcc
  }, {} as Record<PillarId, DrillNode>)

  return {
    core,
    pillars,
    drills,
    visibleCore: true,
    visiblePillars: createPillarVisibilityMap(true),
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

  if (typeof parsed.visibleCore === 'boolean') {
    defaults.visibleCore = parsed.visibleCore
  }

  for (const pillar of PILLAR_CELLS) {
    const pillarVisible = parsed.visiblePillars?.[pillar.id]
    if (typeof pillarVisible === 'boolean') {
      defaults.visiblePillars[pillar.id] = pillarVisible
    }
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
      visibleCore: base.visibleCore,
      visibleActions: { ...base.visibleActions },
    }

    if (isCellContent(parsedNode.core)) {
      nextNode.core = parsedNode.core
    }

    if (typeof parsedNode.visibleCore === 'boolean') {
      nextNode.visibleCore = parsedNode.visibleCore
    }

    for (const action of ACTION_LAYOUT) {
      const incomingAction = parsedNode.actions?.[action.id]
      if (isCellContent(incomingAction)) {
        nextNode.actions[action.id] = incomingAction
      }

      const incomingActionVisible = parsedNode.visibleActions?.[action.id]
      if (typeof incomingActionVisible === 'boolean') {
        nextNode.visibleActions[action.id] = incomingActionVisible
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

const removeOw64Board = (projectId: ProjectId) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(`${NEW_STORAGE_KEY_PREFIX}${projectId}`)
  window.localStorage.removeItem(`${LEGACY_STORAGE_KEY_PREFIX}${projectId}`)
}

const isProjectItem = (value: unknown): value is ProjectItem => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const maybe = value as Partial<ProjectItem>
  return (
    typeof maybe.id === 'string' &&
    typeof maybe.name === 'string' &&
    typeof maybe.summary === 'string' &&
    typeof maybe.status === 'string'
  )
}

const sanitizeProjectItem = (project: ProjectItem): ProjectItem | null => {
  const id = project.id.trim()
  const name = project.name.trim()
  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    summary: project.summary.trim(),
    status: project.status.trim(),
  }
}

const persistProjectList = (projects: ProjectItem[]) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PROJECT_LIST_STORAGE_KEY, JSON.stringify(projects))
}

const hasLegacyProjectEvidence = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  if (window.localStorage.getItem(LEGACY_PROJECT_META_STORAGE_KEY)) {
    return true
  }

  return LEGACY_DEFAULT_PROJECTS.some((project) => {
    return (
      window.localStorage.getItem(`${NEW_STORAGE_KEY_PREFIX}${project.id}`) !== null ||
      window.localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${project.id}`) !== null
    )
  })
}

const loadProjectList = (): ProjectItem[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(PROJECT_LIST_STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) {
        return []
      }

      const deduped = new Set<string>()
      const projects: ProjectItem[] = []

      for (const item of parsed) {
        if (!isProjectItem(item)) {
          continue
        }

        const sanitized = sanitizeProjectItem(item)
        if (!sanitized || deduped.has(sanitized.id)) {
          continue
        }

        deduped.add(sanitized.id)
        projects.push(sanitized)
      }

      return projects
    } catch {
      return []
    }
  }

  if (!hasLegacyProjectEvidence()) {
    return []
  }

  const migrated: ProjectItem[] = LEGACY_DEFAULT_PROJECTS.map((project) => ({
    id: project.id,
    name: project.name,
    summary: project.summary,
    status: project.status,
  }))

  const rawLegacyMeta = window.localStorage.getItem(LEGACY_PROJECT_META_STORAGE_KEY)
  if (rawLegacyMeta) {
    try {
      const parsed = JSON.parse(rawLegacyMeta) as Partial<Record<(typeof LEGACY_DEFAULT_PROJECTS)[number]['id'], Partial<ProjectItem>>>

      for (const project of migrated) {
        const incoming = parsed[project.id as (typeof LEGACY_DEFAULT_PROJECTS)[number]['id']]
        if (!incoming) {
          continue
        }

        const merged: ProjectItem = {
          id: project.id,
          name: typeof incoming.name === 'string' ? incoming.name : project.name,
          summary: typeof incoming.summary === 'string' ? incoming.summary : project.summary,
          status: typeof incoming.status === 'string' ? incoming.status : project.status,
        }

        const sanitized = sanitizeProjectItem(merged)
        if (sanitized) {
          project.name = sanitized.name
          project.summary = sanitized.summary
          project.status = sanitized.status
        }
      }
    } catch {
      // Ignore malformed legacy data and keep legacy defaults.
    }
  }

  persistProjectList(migrated)
  return migrated
}

type InitialProjectData = {
  projects: ProjectItem[]
  boards: Record<ProjectId, Ow64Board>
  selectedProjectId: ProjectId | null
}

const loadInitialProjectData = (): InitialProjectData => {
  const projects = loadProjectList()
  const boards = projects.reduce(
    (acc, project) => {
      acc[project.id] = loadOw64Board(project.id)
      return acc
    },
    {} as Record<ProjectId, Ow64Board>,
  )

  return {
    projects,
    boards,
    selectedProjectId: projects[0]?.id ?? null,
  }
}

const INITIAL_PROJECT_DATA = loadInitialProjectData()

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

  if (left.scope === 'drillAction' && right.scope === 'drillAction') {
    return isSamePath(left.path, right.path) && left.actionId === right.actionId
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

const getNodeByPathExact = (board: Ow64Board, path: DrillPath): DrillNode | null => {
  const [pillarId, ...actionPath] = path
  let currentNode = board.drills[pillarId]

  for (const actionId of actionPath) {
    const nextNode = currentNode.children[actionId]
    if (!nextNode) {
      return null
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

  if (target.scope === 'drillAction') {
    const node = getNodeByPathExact(board, target.path)
    if (!node) {
      const defaults = createDefaultOw64Board()
      return getNodeByPath(defaults, target.path).actions[target.actionId]
    }
    return node.actions[target.actionId]
  }

  const node = getNodeByPathExact(board, target.path)
  if (!node) {
    const defaults = createDefaultOw64Board()
    return getNodeByPath(defaults, target.path).core
  }

  return node.core
}

const setContentByTarget = (board: Ow64Board, target: EditingTarget, content: CellContent): Ow64Board => {
  if (target.scope === 'core') {
    return {
      ...board,
      core: content,
      visibleCore: true,
    }
  }

  if (target.scope === 'pillar') {
    const pillarId: PillarId = target.pillarId

    return {
      ...board,
      pillars: {
        ...board.pillars,
        [pillarId]: content,
      },
      visiblePillars: {
        ...board.visiblePillars,
        [pillarId]: true,
      },
      drills: {
        ...board.drills,
        [pillarId]: {
          ...board.drills[pillarId],
          core: content,
          visibleCore: true,
        },
      },
    }
  }

  if (target.scope === 'drillAction') {
    return setActionContentByPath(board, target.path, target.actionId, content)
  }

  const [rawPillarId, ...actionPath] = target.path
  const pillarId: PillarId = rawPillarId

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
        visibleCore: true,
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
  if (target.scope === 'drillAction') {
    const currentNode = getNodeByPathExact(board, target.path)
    if (!currentNode) {
      const defaults = createDefaultOw64Board()
      return getNodeByPath(defaults, target.path).actions[target.actionId]
    }
    const seedMarker = target.path.length === 1 ? PILLAR_META[target.path[0]].marker : currentNode.core.title
    return createDrillNode(currentNode.core, seedMarker).actions[target.actionId]
  }

  if (target.scope === 'drillCore' && target.path.length > 1) {
    const parentPath = [target.path[0], ...target.path.slice(1, -1)] as DrillPath
    const parentNode = getNodeByPath(board, parentPath)
    const seedActionId = target.path[target.path.length - 1] as ActionId
    return parentNode.actions[seedActionId]
  }

  const defaults = createDefaultOw64Board()
  return getContentByTarget(defaults, target)
}

const toMarkerPath = (path: DrillPath): string => {
  const [pillarId, ...actionPath] = path
  const segments = [PILLAR_META[pillarId].marker, ...actionPath.map((actionId) => ACTION_META[actionId].marker)]
  return segments.join('>')
}

const buildOw64CsvRows = (board: Ow64Board): CsvRow[] => {
  const rows: CsvRow[] = []

  rows.push({
    rowType: 'root-core',
    marker: 'O',
    path: 'O',
    title: board.core.title,
    subtitle: board.core.subtitle,
  })

  for (const pillar of PILLAR_CELLS) {
    rows.push({
      rowType: 'root-pillar',
      marker: pillar.marker,
      path: pillar.marker,
      title: board.pillars[pillar.id].title,
      subtitle: board.pillars[pillar.id].subtitle,
    })
  }

  const collectDrillRows = (node: DrillNode, path: DrillPath) => {
    const markerPath = getMarkerByPath(path)
    rows.push({
      rowType: 'drill-core',
      marker: markerPath,
      path: toMarkerPath(path),
      title: node.core.title,
      subtitle: node.core.subtitle,
    })

    for (const action of ACTION_LAYOUT) {
      const actionContent = node.actions[action.id]
      rows.push({
        rowType: 'drill-action',
        marker: `${markerPath}-${action.marker}`,
        path: `${toMarkerPath(path)}>${action.marker}`,
        title: actionContent.title,
        subtitle: actionContent.subtitle,
      })

      const child = node.children[action.id]
      if (child) {
        collectDrillRows(child, [...path, action.id] as DrillPath)
      }
    }
  }

  for (const pillar of PILLAR_CELLS) {
    collectDrillRows(board.drills[pillar.id], [pillar.id] as DrillPath)
  }

  return rows
}

const getPathDepth = (path: string): number => path.split('>').length

const escapeMarkdownCell = (value: string): string => {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\|/g, '\\|').replace(/\n/g, '<br />')
}

const buildMarkdownTable = (rows: CsvRow[]): string => {
  const header = '| Type | Marker | Path | Title | Subtitle |'
  const separator = '| --- | --- | --- | --- | --- |'
  const body = rows.map((row) => {
    return `| ${ROW_TYPE_LABEL[row.rowType]} | ${escapeMarkdownCell(row.marker)} | ${escapeMarkdownCell(row.path)} | ${escapeMarkdownCell(row.title)} | ${escapeMarkdownCell(row.subtitle)} |`
  })
  return [header, separator, ...body].join('\n')
}

const buildOw64MarkdownContent = (projectId: ProjectId, projectName: string, board: Ow64Board): string => {
  const rows = buildOw64CsvRows(board)
  const rootRows = rows.filter((row) => row.rowType === 'root-core' || row.rowType === 'root-pillar')
  const drillCoreRows = rows.filter((row) => row.rowType === 'drill-core')
  const exportedAt = new Date().toISOString()

  const sections: string[] = [
    `# OW64 Export - ${projectName}`,
    '',
    `- Project ID: ${projectId}`,
    `- Project Name: ${projectName}`,
    `- Exported At: ${exportedAt}`,
    '',
    '## 主盘 (OW9)',
    '',
    buildMarkdownTable(rootRows),
    '',
    '## 下钻与行动项',
    '',
  ]

  for (const coreRow of drillCoreRows) {
    const coreDepth = getPathDepth(coreRow.path)
    const actionRows = rows.filter((row) => {
      if (row.rowType !== 'drill-action') {
        return false
      }

      return row.path.startsWith(`${coreRow.path}>`) && getPathDepth(row.path) === coreDepth + 1
    })

    sections.push(`### ${coreRow.path} · ${coreRow.title}`)
    sections.push('')
    sections.push(buildMarkdownTable([coreRow, ...actionRows]))
    sections.push('')
  }

  return sections.join('\n')
}

const unescapeMarkdownCell = (value: string): string => {
  return value.replace(/<br\s*\/?>/gi, '\n').replace(/\\\|/g, '|')
}

const parseMarkdownTableRow = (line: string): string[] | null => {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return null
  }

  return trimmed
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim())
}

const isMarkdownTableSeparator = (cells: string[]): boolean => {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

const parseRowTypeLabel = (value: string): CsvRow['rowType'] | null => {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, ' ')
  if (normalized === 'root core') {
    return 'root-core'
  }
  if (normalized === 'root pillar') {
    return 'root-pillar'
  }
  if (normalized === 'drill core') {
    return 'drill-core'
  }
  if (normalized === 'drill action') {
    return 'drill-action'
  }
  return null
}

const parseDrillPathFromMarker = (path: string): DrillPath | null => {
  const segments = path
    .split('>')
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  const [pillarMarker, ...actionMarkers] = segments
  const pillarId = PILLAR_ID_BY_MARKER[pillarMarker]
  if (!pillarId) {
    return null
  }

  const actionIds: ActionId[] = []
  for (const actionMarker of actionMarkers) {
    const actionId = ACTION_ID_BY_MARKER[actionMarker]
    if (!actionId) {
      return null
    }
    actionIds.push(actionId)
  }

  return [pillarId, ...actionIds] as DrillPath
}

const setActionContentByPath = (board: Ow64Board, path: DrillPath, actionId: ActionId, content: CellContent): Ow64Board => {
  const [pillarId, ...actionPath] = path
  const updateNodeAction = (node: DrillNode, depth: number): DrillNode => {
    if (depth >= actionPath.length) {
      return {
        ...node,
        actions: {
          ...node.actions,
          [actionId]: content,
        },
        visibleActions: {
          ...node.visibleActions,
          [actionId]: true,
        },
      }
    }

    const nextActionId = actionPath[depth]
    const childNode = node.children[nextActionId] ?? createDrillNode(node.actions[nextActionId], `${node.actions[nextActionId].title}`)
    const nextChildNode = updateNodeAction(childNode, depth + 1)

    if (nextChildNode === childNode) {
      return node
    }

    return {
      ...node,
      children: {
        ...node.children,
        [nextActionId]: nextChildNode,
      },
    }
  }

  const nextPillarRootNode = updateNodeAction(board.drills[pillarId], 0)
  return {
    ...board,
    drills: {
      ...board.drills,
      [pillarId]: nextPillarRootNode,
    },
  }
}

const setDrillTargetVisibility = (
  board: Ow64Board,
  target: Extract<EditingTarget, { scope: 'drillCore' | 'drillAction' }>,
  visible: boolean,
): Ow64Board => {
  const [pillarId, ...actionPath] = target.path

  const updateNode = (node: DrillNode, depth: number): DrillNode => {
    if (depth === actionPath.length) {
      if (target.scope === 'drillCore') {
        if (node.visibleCore === visible) {
          return node
        }

        return {
          ...node,
          visibleCore: visible,
        }
      }

      if (node.visibleActions[target.actionId] === visible) {
        return node
      }

      return {
        ...node,
        visibleActions: {
          ...node.visibleActions,
          [target.actionId]: visible,
        },
      }
    }

    const actionId = actionPath[depth]
    const childNode = node.children[actionId]
    if (!childNode) {
      return node
    }

    const nextChildNode = updateNode(childNode, depth + 1)
    if (nextChildNode === childNode) {
      return node
    }

    return {
      ...node,
      children: {
        ...node.children,
        [actionId]: nextChildNode,
      },
    }
  }

  const currentRootNode = board.drills[pillarId]
  const nextRootNode = updateNode(currentRootNode, 0)

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

const importOw64MarkdownContent = (rawMarkdown: string): Ow64Board => {
  const lines = rawMarkdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows: CsvRow[] = []

  for (const line of lines) {
    const cells = parseMarkdownTableRow(line)
    if (!cells || cells.length !== 5 || isMarkdownTableSeparator(cells)) {
      continue
    }

    if (cells[0].toLowerCase() === 'type' && cells[1].toLowerCase() === 'marker') {
      continue
    }

    const rowType = parseRowTypeLabel(cells[0])
    if (!rowType) {
      continue
    }

    rows.push({
      rowType,
      marker: unescapeMarkdownCell(cells[1]),
      path: unescapeMarkdownCell(cells[2]),
      title: unescapeMarkdownCell(cells[3]),
      subtitle: unescapeMarkdownCell(cells[4]),
    })
  }

  if (rows.length === 0) {
    throw new Error('未识别到可导入的 OW64 Markdown 表格。')
  }

  let nextBoard = createDefaultOw64Board()
  let hasRootCore = false
  const rootPillarSet = new Set<PillarId>()

  for (const row of rows) {
    const content: CellContent = {
      title: row.title,
      subtitle: row.subtitle,
    }

    if (row.rowType === 'root-core') {
      hasRootCore = true
      nextBoard = setContentByTarget(nextBoard, { scope: 'core' }, content)
      continue
    }

    if (row.rowType === 'root-pillar') {
      const pillarId = PILLAR_ID_BY_MARKER[row.marker]
      if (!pillarId) {
        throw new Error(`Root Pillar 的 marker 无效: ${row.marker}`)
      }
      rootPillarSet.add(pillarId)
      nextBoard = setContentByTarget(nextBoard, { scope: 'pillar', pillarId }, content)
      continue
    }

    if (row.rowType === 'drill-core') {
      const drillPath = parseDrillPathFromMarker(row.path)
      if (!drillPath) {
        throw new Error(`Drill Core 的 path 无效: ${row.path}`)
      }
      nextBoard = ensurePathExists(nextBoard, drillPath)
      nextBoard = setContentByTarget(nextBoard, { scope: 'drillCore', path: drillPath }, content)
      continue
    }

    const drillActionPath = parseDrillPathFromMarker(row.path)
    if (!drillActionPath || drillActionPath.length < 2) {
      throw new Error(`Drill Action 的 path 无效: ${row.path}`)
    }

    const parentPath = [drillActionPath[0], ...drillActionPath.slice(1, -1)] as DrillPath
    const actionId = drillActionPath[drillActionPath.length - 1] as ActionId
    nextBoard = ensurePathExists(nextBoard, parentPath)
    nextBoard = setActionContentByPath(nextBoard, parentPath, actionId, content)
  }

  if (!hasRootCore) {
    throw new Error('Markdown 缺少 Root Core 行。')
  }

  if (rootPillarSet.size !== PILLAR_CELLS.length) {
    throw new Error('Markdown 缺少完整的 Root Pillar 行（需要 W1~W8）。')
  }

  return nextBoard
}

const sanitizeFileName = (value: string): string => {
  const cleaned = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|]/g, '')

  return cleaned || 'project'
}

const createProjectId = (): ProjectId => {
  const base = `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return base
}

function App() {
  const [view, setView] = useState<ViewMode>('projects')
  const [projects, setProjects] = useState<ProjectItem[]>(() => INITIAL_PROJECT_DATA.projects)
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId | null>(() => INITIAL_PROJECT_DATA.selectedProjectId)
  const [activeTab, setActiveTab] = useState<ProjectTabId>('mandala')
  const [activeLayer, setActiveLayer] = useState<MandalaLayer>('root')
  const [drillPath, setDrillPath] = useState<DrillPath | null>(null)
  const [boardByProject, setBoardByProject] = useState<Record<ProjectId, Ow64Board>>(() => INITIAL_PROJECT_DATA.boards)
  const [projectEditingId, setProjectEditingId] = useState<ProjectId | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [projectDraftName, setProjectDraftName] = useState('')
  const [projectDraftSummary, setProjectDraftSummary] = useState('')
  const [projectDraftStatus, setProjectDraftStatus] = useState<string>(PROJECT_STATUS_OPTIONS[0])
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSubtitle, setDraftSubtitle] = useState('')
  const [markdownImportFeedback, setMarkdownImportFeedback] = useState('')
  const markdownFileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedProject = useMemo(
    () => (selectedProjectId ? projects.find((project) => project.id === selectedProjectId) : undefined),
    [projects, selectedProjectId],
  )

  const currentBoard = selectedProjectId ? boardByProject[selectedProjectId] ?? createDefaultOw64Board() : createDefaultOw64Board()
  const isProjectDetailView = view === 'projectDetail'
  const isProjectMandalaView = isProjectDetailView && activeTab === 'mandala' && Boolean(selectedProject)
  const activeTabInfo = PROJECT_TABS.find((tab) => tab.id === activeTab)
  const activeDrillPath = drillPath ?? ([PILLAR_CELLS[0].id] as DrillPath)
  const activeDrillPillarId = activeDrillPath[0]
  const activeDrillNodeExact = getNodeByPathExact(currentBoard, activeDrillPath)
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
    setIsCreatingProject(false)
    setProjectDraftName('')
    setProjectDraftSummary('')
    setProjectDraftStatus(PROJECT_STATUS_OPTIONS[0])
  }

  const handleViewChange = (nextView: ViewMode) => {
    resetEditingDraft()
    resetMandalaLayer()
    resetProjectDraft()
    setShowProjectInfo(false)
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
    setShowProjectInfo(false)
    setSelectedProjectId(projectId)
    setView('projectDetail')
    setActiveTab('mandala')
  }

  const handleBackToProjects = () => {
    resetEditingDraft()
    resetMandalaLayer()
    resetProjectDraft()
    setShowProjectInfo(false)
    setView('projects')
  }

  const handleProjectEditStart = (projectId: ProjectId) => {
    const targetProject = projects.find((project) => project.id === projectId)
    if (!targetProject) {
      return
    }

    setProjectEditingId(projectId)
    setIsCreatingProject(false)
    setProjectDraftName(targetProject.name)
    setProjectDraftSummary(targetProject.summary)
    setProjectDraftStatus(targetProject.status)
    setShowProjectInfo(true)
  }

  const handleProjectCreateStart = () => {
    resetEditingDraft()
    setProjectEditingId(null)
    setIsCreatingProject(true)
    setProjectDraftName('')
    setProjectDraftSummary('')
    setProjectDraftStatus(PROJECT_STATUS_OPTIONS[0])
  }

  const handleProjectEditCancel = () => {
    resetProjectDraft()
  }

  const handleProjectEditSave = () => {
    const trimmedName = projectDraftName.trim()
    if (!trimmedName) {
      return
    }

    if (isCreatingProject) {
      const newProjectId = createProjectId()
      const nextProject: ProjectItem = {
        id: newProjectId,
        name: trimmedName,
        summary: projectDraftSummary.trim(),
        status: projectDraftStatus.trim(),
      }

      const nextProjects = [...projects, nextProject]
      setProjects(nextProjects)
      persistProjectList(nextProjects)

      const initialBoard = createDefaultOw64Board()
      setBoardByProject((prev) => ({
        ...prev,
        [newProjectId]: initialBoard,
      }))
      persistOw64Board(newProjectId, initialBoard)
      setSelectedProjectId(newProjectId)

      handleProjectEditCancel()
      return
    }

    if (!projectEditingId) {
      return
    }

    const nextProjects = projects.map((project) => {
      if (project.id !== projectEditingId) {
        return project
      }

      return {
        ...project,
        name: trimmedName,
        summary: projectDraftSummary.trim(),
        status: projectDraftStatus.trim(),
      }
    })

    setProjects(nextProjects)
    persistProjectList(nextProjects)

    handleProjectEditCancel()
  }

  const handleProjectDelete = (projectId: ProjectId) => {
    const nextProjects = projects.filter((project) => project.id !== projectId)
    setProjects(nextProjects)
    persistProjectList(nextProjects)

    setBoardByProject((prev) => {
      if (!(projectId in prev)) {
        return prev
      }

      const next = { ...prev }
      delete next[projectId]
      return next
    })
    removeOw64Board(projectId)

    if (projectEditingId === projectId) {
      resetProjectDraft()
    }

    if (selectedProjectId === projectId) {
      resetEditingDraft()
      resetMandalaLayer()
      setShowProjectInfo(false)
      const nextSelected = nextProjects[0]?.id ?? null
      setSelectedProjectId(nextSelected)
      if (!nextSelected) {
        setView('projects')
      }
    }
  }

  const handleStartEdit = (target: EditingTarget) => {
    const content = getContentByTarget(currentBoard, target)
    setEditingTarget(target)
    setDraftTitle(content.title)
    setDraftSubtitle(content.subtitle)
  }

  const handleQuickAdd = (target: EditingTarget) => {
    if (!selectedProjectId) {
      return
    }

    resetEditingDraft()
    const defaultContent = getDefaultContentByTarget(target, currentBoard)

    setBoardByProject((prev) => {
      const sourceBoard = prev[selectedProjectId]
      if (!sourceBoard) {
        return prev
      }

      const updatedBoard = setContentByTarget(sourceBoard, target, defaultContent)
      const next = {
        ...prev,
        [selectedProjectId]: updatedBoard,
      }

      persistOw64Board(selectedProjectId, updatedBoard)
      return next
    })
  }

  const handleCancelEdit = () => {
    resetEditingDraft()
  }

  const handleSaveEdit = () => {
    if (!editingTarget || !selectedProjectId) {
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
      const sourceBoard = prev[selectedProjectId]
      if (!sourceBoard) {
        return prev
      }

      const updatedBoard = setContentByTarget(sourceBoard, editingTarget, nextContent)
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
    if (!selectedProjectId) {
      return
    }

    if (target.scope === 'drillAction') {
      setBoardByProject((prev) => {
        const sourceBoard = prev[selectedProjectId]
        if (!sourceBoard) {
          return prev
        }

        const updatedBoard = setDrillTargetVisibility(sourceBoard, target, false)
        if (updatedBoard === sourceBoard) {
          return prev
        }

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
      return
    }

    if (target.scope === 'drillCore') {
      const defaultContent = getDefaultContentByTarget(target, currentBoard)

      setBoardByProject((prev) => {
        const sourceBoard = prev[selectedProjectId]
        if (!sourceBoard) {
          return prev
        }

        const contentResetBoard = setContentByTarget(sourceBoard, target, defaultContent)
        const updatedBoard = setDrillTargetVisibility(contentResetBoard, target, true)
        if (updatedBoard === sourceBoard) {
          return prev
        }

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
      return
    }

    setBoardByProject((prev) => {
      const sourceBoard = prev[selectedProjectId]
      if (!sourceBoard) {
        return prev
      }

      const updatedBoard: Ow64Board =
        target.scope === 'core'
          ? {
              ...sourceBoard,
              visibleCore: false,
            }
          : {
              ...sourceBoard,
              visiblePillars: {
                ...sourceBoard.visiblePillars,
                [target.pillarId]: false,
              },
            }

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

    if (selectedProjectId) {
      setBoardByProject((prev) => {
        const sourceBoard = prev[selectedProjectId]
        if (!sourceBoard) {
          return prev
        }

        const ensuredBoard = ensurePathExists(sourceBoard, nextPath)
        const updatedBoard = setDrillTargetVisibility(ensuredBoard, { scope: 'drillCore', path: nextPath }, true)
        if (updatedBoard === sourceBoard) {
          return prev
        }

        const next = {
          ...prev,
          [selectedProjectId]: updatedBoard,
        }

        persistOw64Board(selectedProjectId, updatedBoard)
        return next
      })
    }

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

  const handleExportMarkdown = () => {
    if (!selectedProjectId) {
      return
    }

    const projectName = selectedProject?.name ?? selectedProjectId
    const markdownContent = buildOw64MarkdownContent(selectedProjectId, projectName, currentBoard)
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ow64-${selectedProjectId}-${sanitizeFileName(projectName)}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImportMarkdownClick = () => {
    markdownFileInputRef.current?.click()
  }

  const handleImportMarkdownFile = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedProjectId) {
      return
    }

    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const content = typeof reader.result === 'string' ? reader.result : ''
        const importedBoard = importOw64MarkdownContent(content)

        setBoardByProject((prev) => {
          const next = {
            ...prev,
            [selectedProjectId]: importedBoard,
          }
          persistOw64Board(selectedProjectId, importedBoard)
          return next
        })

        resetEditingDraft()
        resetMandalaLayer()
        setMarkdownImportFeedback(`已导入 ${file.name}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : '导入失败，请检查 Markdown 格式。'
        setMarkdownImportFeedback(`导入失败：${message}`)
      }
    }

    reader.onerror = () => {
      setMarkdownImportFeedback('导入失败：文件读取异常。')
    }

    reader.readAsText(file, 'utf-8')
  }

  return (
    <div className={`app ${isProjectDetailView ? 'is-focus-layout' : ''}`}>
      <div className={`app-body ${isProjectDetailView ? 'is-focus-body' : ''}`}>
        <aside className={`app-sidebar ${isProjectDetailView ? 'is-focus-sidebar' : ''}`}>
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

          {isProjectDetailView && selectedProject && (
            <>
              <section className="sidebar-section" aria-label="Project context">
                <p className="nav-title">Project Workspace</p>
                <h2 className="sidebar-project-title">{selectedProject.name}</h2>
                <p className="sidebar-project-status">{selectedProject.status}</p>
                <div className="sidebar-actions">
                  <button type="button" className="ghost-button" onClick={handleBackToProjects}>
                    返回项目管理
                  </button>
                  {projectEditingId !== selectedProjectId && (
                    <button type="button" className="ghost-button" onClick={() => handleProjectEditStart(selectedProject.id)}>
                      编辑项目信息
                    </button>
                  )}
                  {projectEditingId !== selectedProjectId && (
                    <button type="button" className="ghost-button" onClick={() => handleProjectDelete(selectedProject.id)}>
                      删除项目
                    </button>
                  )}
                  {projectEditingId !== selectedProjectId && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setShowProjectInfo((prev) => !prev)}
                      aria-expanded={showProjectInfo}
                    >
                      {showProjectInfo ? '收起项目信息' : '项目信息'}
                    </button>
                  )}
                </div>

                <section className="tab-bar sidebar-tab-bar" role="tablist" aria-label="Project tabs">
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

                {showProjectInfo && projectEditingId !== selectedProjectId && (
                  <p className="focus-summary project-summary-text">{selectedProject.summary}</p>
                )}

                {projectEditingId === selectedProjectId && (
                  <div className="project-editor focus-project-editor" role="group" aria-label="编辑项目信息">
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
                      <textarea
                        id="project-summary"
                        className="project-input project-textarea"
                        value={projectDraftSummary}
                        onChange={(event) => setProjectDraftSummary(event.target.value)}
                        placeholder="输入项目简介"
                        rows={3}
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
                      <button type="button" className="mandala-action is-muted" onClick={() => handleProjectDelete(selectedProject.id)}>
                        删除项目
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {activeTab === 'mandala' && (
                <section className="sidebar-section" aria-label="OW64 controls">
                  <p className="nav-title">OW64 Controls</p>
                  <div className="mandala-layer-switch is-vertical" role="tablist" aria-label="OW64 views">
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
                      className={`layer-switch-item ${activeLayer === 'overview' ? 'is-active' : ''}`}
                      aria-selected={activeLayer === 'overview'}
                      onClick={() => handleMandalaLayerChange('overview')}
                    >
                      OW64 全景
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
                  </div>

                  <div className="mandala-toolbar-actions sidebar-mandala-actions">
                    {activeLayer === 'pillar' && activeDrillPath.length > 1 && (
                      <button type="button" className="ghost-button" onClick={handleBackOneLevel}>
                        返回上一级
                      </button>
                    )}
                    {activeLayer === 'pillar' && (
                      <button type="button" className="ghost-button" onClick={handleBackToRoot}>
                        返回 OW9 主盘
                      </button>
                    )}
                    <button type="button" className="ghost-button" onClick={handleExportMarkdown}>
                      导出 Markdown
                    </button>
                    <button type="button" className="ghost-button" onClick={handleImportMarkdownClick}>
                      导入 Markdown
                    </button>
                    <input
                      ref={markdownFileInputRef}
                      type="file"
                      accept=".md,text/markdown"
                      onChange={handleImportMarkdownFile}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {markdownImportFeedback && <p className="mandala-path sidebar-mandala-path">{markdownImportFeedback}</p>}

                  {activeLayer === 'pillar' ? (
                    <p className="mandala-path sidebar-mandala-path">
                      OW64 / {getMarkerByPath(activeDrillPath)} / {activeDrillTitleSegments.join(' / ')}
                    </p>
                  ) : activeLayer === 'overview' ? (
                    <p className="mandala-path sidebar-mandala-path">全景展示 8 个方向与各自 8 个行动点</p>
                  ) : (
                    <p className="mandala-path sidebar-mandala-path">点击 W1~W8 可进入对应行动九宫格</p>
                  )}
                </section>
              )}
            </>
          )}
        </aside>

        <main className={`app-main ${isProjectDetailView ? 'is-project-detail' : ''} ${isProjectMandalaView ? 'is-project-mandala' : ''}`}>
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
                <div className="detail-actions">
                  <button type="button" className="ghost-button" onClick={handleProjectCreateStart}>
                    新建项目
                  </button>
                </div>
              </section>
              <section className="content-panel projects-panel">
                {isCreatingProject && (
                  <article className="panel-card project-card project-card-create">
                    <div>
                      <p className="project-status">New project</p>
                      <h2 className="panel-title">创建新项目</h2>
                      <p className="panel-desc project-summary-text">填写项目信息后保存，即可进入项目空间。</p>
                    </div>
                    <div className="project-editor project-editor-inline" role="group" aria-label="创建项目">
                      <label className="project-field" htmlFor="project-name-create">
                        <span>项目名称</span>
                        <input
                          id="project-name-create"
                          className="project-input"
                          value={projectDraftName}
                          onChange={(event) => setProjectDraftName(event.target.value)}
                          placeholder="输入项目名称"
                        />
                      </label>
                      <label className="project-field" htmlFor="project-summary-create">
                        <span>项目简介</span>
                        <textarea
                          id="project-summary-create"
                          className="project-input project-textarea"
                          value={projectDraftSummary}
                          onChange={(event) => setProjectDraftSummary(event.target.value)}
                          placeholder="输入项目简介"
                          rows={3}
                        />
                      </label>
                      <label className="project-field" htmlFor="project-status-create">
                        <span>项目状态</span>
                        <select
                          id="project-status-create"
                          className="project-input"
                          value={projectDraftStatus}
                          onChange={(event) => setProjectDraftStatus(event.target.value)}
                        >
                          {PROJECT_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
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
                      </div>
                    </div>
                  </article>
                )}

                {!isCreatingProject && projects.length === 0 && (
                  <article className="panel-card project-empty-state">
                    <h2 className="panel-title">暂无项目</h2>
                    <p className="panel-desc">点击“新建项目”开始创建你的第一个项目。</p>
                  </article>
                )}

                {projects.map((project) => (
                  <article key={project.id} className="panel-card project-card">
                    <div className="project-card-body">
                      <p className="project-status">{project.status}</p>
                      <h2 className="panel-title">{project.name}</h2>
                      <p className="panel-desc project-summary-text">{project.summary}</p>
                    </div>

                    {projectEditingId === project.id && !isCreatingProject ? (
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
                          <textarea
                            id={`project-summary-${project.id}`}
                            className="project-input project-textarea"
                            value={projectDraftSummary}
                            onChange={(event) => setProjectDraftSummary(event.target.value)}
                            placeholder="输入项目简介"
                            rows={3}
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
                          <button type="button" className="mandala-action is-muted" onClick={() => handleProjectDelete(project.id)}>
                            删除项目
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="project-card-tools" aria-label="项目快捷操作">
                        <button
                          type="button"
                          className="project-tool-button"
                          onClick={() => handleProjectEnter(project.id)}
                          title="进入项目"
                          aria-label={`进入项目 ${project.name}`}
                        >
                          <svg aria-hidden="true" className="project-tool-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M8 5L16 12L8 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="project-tool-button"
                          onClick={() => handleProjectEditStart(project.id)}
                          title="编辑信息"
                          aria-label={`编辑项目 ${project.name}`}
                        >
                          <svg aria-hidden="true" className="project-tool-icon" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="project-tool-button is-danger"
                          onClick={() => handleProjectDelete(project.id)}
                          title="删除项目"
                          aria-label={`删除项目 ${project.name}`}
                        >
                          <svg aria-hidden="true" className="project-tool-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M9 7V5H15V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M12 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M16 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M7 7L8 20H16L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            </>
          )}

          {view === 'projectDetail' && selectedProjectId && selectedProject && (
            <>
              {activeTab === 'mandala' ? (
                <section className="mandala-layout focus-content" aria-label="曼德拉九宫格 OW64">
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
                          const rootVisible = target.scope === 'core' ? true : currentBoard.visiblePillars[target.pillarId]
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
                                  <textarea
                                    id={`subtitle-${cell.id}`}
                                    value={draftSubtitle}
                                    onChange={(event) => setDraftSubtitle(event.target.value)}
                                    className="mandala-input mandala-textarea"
                                    placeholder="输入说明"
                                    rows={3}
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
                                  {target.scope === 'pillar' && rootVisible && (
                                    <button
                                      type="button"
                                      className="mandala-action is-muted"
                                      onClick={() => handleResetTarget(target)}
                                    >
                                      删除
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          }

                          if (!rootVisible) {
                            return (
                              <article
                                key={cell.id}
                                className={`mandala-cell is-add ${cell.role === 'core' ? 'is-core' : ''}`}
                                aria-label={`${cell.marker} 添加卡片`}
                              >
                                <button
                                  type="button"
                                  className="mandala-add-button"
                                  onClick={() => handleQuickAdd(target)}
                                  title="添加"
                                  aria-label={`添加 ${cell.marker} 卡片`}
                                >
                                  <span aria-hidden="true">＋</span>
                                </button>
                              </article>
                            )
                          }

                          if (cell.role === 'pillar') {
                            return (
                              <article key={cell.id} className="mandala-cell has-drill-action" aria-label={`${cell.marker} ${content.title}`}>
                                <span className="mandala-marker">{cell.marker}</span>
                                <h2 className="mandala-title">{content.title}</h2>
                                <p className="mandala-subtitle">{content.subtitle}</p>
                                <div className="mandala-cell-actions">
                                  <button
                                    type="button"
                                    className="mandala-cell-action is-primary is-icon"
                                    onClick={() => handleOpenPillar(cell.id as PillarId)}
                                    title="进入下钻"
                                    aria-label={`进入 ${cell.marker} 的 8 个行动点`}
                                  >
                                    <svg aria-hidden="true" className="mandala-icon" viewBox="0 0 24 24" fill="none">
                                      <path d="M8 5L16 12L8 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="mandala-cell-action is-icon"
                                    onClick={() => handleStartEdit(target)}
                                    title="编辑"
                                    aria-label={`编辑 ${cell.marker} ${content.title}`}
                                  >
                                    <svg
                                      aria-hidden="true"
                                      className="mandala-icon"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="mandala-cell-action is-danger is-icon"
                                    onClick={() => handleResetTarget(target)}
                                    title="删除"
                                    aria-label={`删除 ${cell.marker} ${content.title}`}
                                  >
                                    <svg aria-hidden="true" className="mandala-icon" viewBox="0 0 24 24" fill="none">
                                      <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      <path d="M9 7V5H15V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M8 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      <path d="M12 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      <path d="M16 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      <path d="M7 7L8 20H16L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                </div>
                              </article>
                            )
                          }

                          return (
                            <article key={cell.id} className="mandala-cell is-core" aria-label={`${cell.marker} ${content.title}`}>
                              <span className="mandala-marker">{cell.marker}</span>
                              <h2 className="mandala-title">{content.title}</h2>
                              <p className="mandala-subtitle">{content.subtitle}</p>
                              <div className="mandala-cell-actions">
                                <button
                                  type="button"
                                  className="mandala-cell-action is-icon"
                                  onClick={() => handleStartEdit(target)}
                                  title="编辑"
                                  aria-label={`编辑 ${cell.marker} ${content.title}`}
                                >
                                  <svg
                                    aria-hidden="true"
                                    className="mandala-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </article>
                          )
                        })}

                      {activeLayer === 'pillar' &&
                        PILLAR_GRID_LAYOUT.map((gridItem) => {
                          const centerTarget: EditingTarget = { scope: 'drillCore', path: activeDrillPath }

                          if (gridItem.type === 'center') {
                            const marker = getMarkerByPath(activeDrillPath)
                            const editing = isSameTarget(editingTarget, centerTarget)
                            const centerContent = getContentByTarget(currentBoard, centerTarget)

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
                                    <textarea
                                      id={`subtitle-${inputIdSuffix}`}
                                      value={draftSubtitle}
                                      onChange={(event) => setDraftSubtitle(event.target.value)}
                                      className="mandala-input mandala-textarea"
                                      placeholder="输入说明"
                                      rows={3}
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
                                    {activeDrillNodeExact?.visibleCore && (
                                      <button
                                        type="button"
                                        className="mandala-action is-muted"
                                        onClick={() => handleResetTarget(centerTarget)}
                                      >
                                        恢复默认
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <article key={inputIdSuffix} className="mandala-cell is-core" aria-label={`${marker} ${centerContent.title}`}>
                                <span className="mandala-marker">{marker}</span>
                                <h2 className="mandala-title">{centerContent.title}</h2>
                                <p className="mandala-subtitle">{centerContent.subtitle}</p>
                                <div className="mandala-cell-actions">
                                  <button
                                    type="button"
                                    className="mandala-cell-action is-icon"
                                    onClick={() => handleStartEdit(centerTarget)}
                                    title="编辑"
                                    aria-label={`编辑 ${marker} ${centerContent.title}`}
                                  >
                                    <svg
                                      aria-hidden="true"
                                      className="mandala-icon"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </article>
                            )
                          }

                          const marker = ACTION_META[gridItem.actionId].marker
                          const actionTarget: EditingTarget = {
                            scope: 'drillAction',
                            path: activeDrillPath,
                            actionId: gridItem.actionId,
                          }
                          const editing = isSameTarget(editingTarget, actionTarget)
                          const actionVisible = Boolean(activeDrillNodeExact?.visibleActions[gridItem.actionId])

                          if (editing) {
                            const inputIdSuffix = `${activeDrillPath.join('-')}-${gridItem.actionId}`

                            return (
                              <div key={inputIdSuffix} className="mandala-cell mandala-editor">
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
                                  <textarea
                                    id={`subtitle-${inputIdSuffix}`}
                                    value={draftSubtitle}
                                    onChange={(event) => setDraftSubtitle(event.target.value)}
                                    className="mandala-input mandala-textarea"
                                    placeholder="输入说明"
                                    rows={3}
                                  />
                                </label>
                                <div className="mandala-actions">
                                  <button type="button" className="mandala-action" onClick={handleSaveEdit} disabled={!draftTitle.trim()}>
                                    保存
                                  </button>
                                  <button type="button" className="mandala-action is-muted" onClick={handleCancelEdit}>
                                    取消
                                  </button>
                                  {actionVisible && (
                                    <button
                                      type="button"
                                      className="mandala-action is-muted"
                                      onClick={() => handleResetTarget(actionTarget)}
                                    >
                                      恢复默认
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          }

                          if (!actionVisible) {
                            return (
                              <article
                                key={`${activeDrillPath.join('-')}-${gridItem.actionId}`}
                                className="mandala-cell is-add"
                                aria-label={`${marker} 添加卡片`}
                              >
                                <button
                                  type="button"
                                  className="mandala-add-button"
                                  onClick={() => handleQuickAdd(actionTarget)}
                                  title="添加"
                                  aria-label={`添加 ${marker} 卡片`}
                                >
                                  <span aria-hidden="true">＋</span>
                                </button>
                              </article>
                            )
                          }

                          const actionContent = activeDrillNodeExact?.actions[gridItem.actionId]
                          if (!actionContent) {
                            return null
                          }

                          return (
                            <article
                              key={`${activeDrillPath.join('-')}-${gridItem.actionId}`}
                              className="mandala-cell has-drill-action"
                              aria-label={`${marker} ${actionContent.title}`}
                            >
                              <span className="mandala-marker">{marker}</span>
                              <h2 className="mandala-title">{actionContent.title}</h2>
                              <p className="mandala-subtitle">{actionContent.subtitle}</p>
                              <div className="mandala-cell-actions">
                                <button
                                  type="button"
                                  className="mandala-cell-action is-primary is-icon"
                                  onClick={() => handleDrillDeeper(gridItem.actionId)}
                                  title="继续下钻"
                                  aria-label={`继续下钻 ${marker} ${actionContent.title}`}
                                >
                                  <svg aria-hidden="true" className="mandala-icon" viewBox="0 0 24 24" fill="none">
                                    <path d="M8 5L16 12L8 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="mandala-cell-action is-icon"
                                  onClick={() => handleStartEdit(actionTarget)}
                                  title="编辑"
                                  aria-label={`编辑 ${marker} ${actionContent.title}`}
                                >
                                  <svg
                                    aria-hidden="true"
                                    className="mandala-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="mandala-cell-action is-danger is-icon"
                                  onClick={() => handleResetTarget(actionTarget)}
                                  title="删除"
                                  aria-label={`删除 ${marker} ${actionContent.title}`}
                                >
                                  <svg aria-hidden="true" className="mandala-icon" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M9 7V5H15V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M12 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M16 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M7 7L8 20H16L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            </article>
                          )
                        })}
                    </div>
                  )}
                </section>
              ) : (
                <section className={`content-panel detail-panel ${activeTab}-panel focus-content`}>
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
