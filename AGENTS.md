# AGENTS.md
Guidance for agentic coding tools working in this repository.

## Repository Scope
- Main app: `frontend/` (Vite + React + TypeScript).
- Source code: `frontend/src/`.
- Key configs: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/eslint.config.js`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`.

## Cursor / Copilot Rule Files
- Cursor rules: not found.
- Checked paths: `.cursorrules`, `.cursor/rules/`.
- Copilot rules: not found.
- Checked path: `.github/copilot-instructions.md`.
- If any of these files are added later, treat them as higher-priority rules and update this document.

## Build / Lint / Test Commands
- Install deps: `cd frontend && npm install`.
- Dev server: `cd frontend && npm run dev`.
- Build: `cd frontend && npm run build`.
- Build script currently runs: `tsc -b && vite build`.
- Preview build: `cd frontend && npm run preview`.
- Lint: `cd frontend && npm run lint`.

## Test Status (Current)
- There is no test runner configured right now.
- `frontend/package.json` has no `test` script.
- Minimum verification for changes: `cd frontend && npm run lint && npm run build`.

## Single-Test Command Guidance (When Tests Are Added)
- Full suite (generic): `cd frontend && npm run test`.
- Single test file (generic): `cd frontend && npm run test -- src/path/to/file.test.tsx`.
- Test name filter (generic): `cd frontend && npm run test -- -t "test name"`.
- Vitest single file: `cd frontend && npx vitest run src/path/to/file.test.tsx`.
- Vitest name filter: `cd frontend && npx vitest -t "test name"`.
- Jest single file: `cd frontend && npx jest src/path/to/file.test.tsx`.
- Jest name filter: `cd frontend && npx jest -t "test name"`.
- Keep these commands synchronized with actual tooling once a runner is introduced.

## Code Style Guidelines

### Language and Types
- Use TypeScript for app code.
- Assume strict typing; avoid `any`.
- Prefer explicit return/value types where inference is unclear.
- Prefer `unknown` + narrowing instead of broad casts.
- Validate external or persisted data before use.

### TS Compiler Constraints to Respect
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `verbatimModuleSyntax: true`
- `allowImportingTsExtensions: true`
- `noUncheckedSideEffectImports: true`
- `moduleResolution: "bundler"`
- `noEmit: true`

### Imports
- Use ES modules only.
- Keep imports at file top.
- Use this order when practical:
  1) External packages
  2) Internal modules
  3) Relative modules
  4) Styles/assets
- Use type-only imports for type-only symbols.
- Avoid side-effect imports unless absolutely necessary.

### Formatting
- Follow existing formatting style in each touched file.
- No enforced formatter exists; keep lines readable and consistent.
- Keep edits small and task-focused.
- Preserve local trailing comma style.
- Do not perform unrelated formatting churn.

### Naming
- Components: PascalCase.
- Hooks: `useX` prefix.
- Functions/variables: camelCase.
- Constants: UPPER_SNAKE_CASE for real constants.
- Types/interfaces/type aliases: PascalCase.
- CSS class names: follow existing kebab-case patterns.
- File names: follow nearby conventions in `frontend/src/`.

### React Conventions
- Use function components and hooks.
- Keep state updates immutable.
- Keep hook dependency arrays accurate.
- Prefer early returns in handlers for invalid input/state.
- Avoid unnecessary memoization.
- Keep component logic readable; extract helpers when blocks become dense.

### Error Handling
- Use `try/catch` around JSON parsing and localStorage operations.
- Return safe defaults on recoverable failures.
- Preserve current behavior when migrations or fallback paths exist.
- Avoid swallowing errors silently when debugging context is needed.

### Accessibility
- Prefer semantic HTML elements.
- Keep interactive controls keyboard accessible.
- Preserve visible focus styles.
- Use meaningful `aria-*` attributes where necessary.
- Add `alt` text for informative images.

### CSS and UI Consistency
- Reuse variables from `frontend/src/index.css`.
- Keep styles in existing CSS files unless a new pattern is justified.
- Avoid broad global CSS changes unless required.
- Preserve responsive behavior at current breakpoints.

## Git and Change Hygiene for Agents
- Do not use destructive git commands.
- Do not amend commits unless explicitly requested.
- Do not revert unrelated local changes.
- Keep commits focused and semantic.

## Agent Workflow Expectations
- Read relevant files before editing.
- Prefer small, reversible changes over broad rewrites.
- If requirement conflicts exist, prioritize explicit user instructions.
- If uncertain, choose the least risky implementation aligned with existing patterns.
- Validate changed paths with lint/build checks before completion.
- Keep explanations concise and include impacted file paths.
- Avoid introducing new tools/frameworks without clear need.
- Preserve existing behavior unless the task explicitly requests behavior changes.

## Pre-Completion Checklist
- Run `cd frontend && npm run lint`.
- Run `cd frontend && npm run build`.
- Remove unused imports, locals, and parameters.
- Verify no accidental config changes were introduced.
- Document known limitations (especially missing tests).

## References
- `frontend/package.json`
- `frontend/eslint.config.js`
- `frontend/tsconfig.json`
- `frontend/tsconfig.app.json`
- `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/index.css`
