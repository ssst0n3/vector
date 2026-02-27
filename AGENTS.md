# AGENTS.md

This file guides agentic coding tools working in this repository.

## Project Layout
- Frontend lives in `frontend/` (Vite + React + TypeScript).
- Source code is under `frontend/src/`.
- Build config in `frontend/vite.config.ts`.
- Lint rules in `frontend/eslint.config.js`.
- TS configs in `frontend/tsconfig*.json`.

## Required Rules From Other Tools
- Cursor rules: not found (no `.cursorrules` or `.cursor/rules/`).
- Copilot rules: not found (no `.github/copilot-instructions.md`).

## Quick Start
All commands should be run from the repo root unless stated otherwise.

### Install
```bash
cd frontend
npm install
```

### Dev Server
```bash
cd frontend
npm run dev
```

### Production Build
```bash
cd frontend
npm run build
```

### Preview Build
```bash
cd frontend
npm run preview
```

### Lint
```bash
cd frontend
npm run lint
```

### Tests
There is no test script configured in `frontend/package.json`.
If tests are added later, document:
- The main test command
- How to run a single test file
- How to filter by test name

## Running a Single Test (Placeholder)
No test runner is configured. When adding one, prefer a command like:
```bash
cd frontend
npm run test -- path/to/file.test.tsx
```
And a name filter like:
```bash
cd frontend
npm run test -- -t "test name"
```

## Code Style and Conventions
Follow existing code and tooling first. Do not introduce new style rules
unless required by project changes.

### Language and Tooling
- TypeScript is required (`strict` enabled).
- React with JSX (automatic runtime).
- ESLint uses `@eslint/js`, `typescript-eslint`, `react-hooks`, and
  `react-refresh` configs.

### Imports
- Use ES module syntax everywhere.
- Keep imports at the top of the file.
- Group imports in this order when possible:
  1) External packages
  2) Internal modules
  3) Relative modules
  4) Stylesheets
- Prefer type-only imports when a type is only used in types.
- Do not use side-effect imports unless necessary (TS `noUncheckedSideEffectImports`).

### Formatting
- Use the existing formatting style in the file.
- Keep line widths reasonable (no enforced formatter configured).
- Prefer trailing commas in multiline objects/arrays when it matches the file.

### Types and TS Config Expectations
- `strict: true` is enabled. Avoid `any`.
- `noUnusedLocals` and `noUnusedParameters` are enabled.
- `verbatimModuleSyntax` is enabled: keep type imports explicit.
- `allowImportingTsExtensions` is enabled; follow current file style.

### Naming
- React components: PascalCase (e.g., `MyWidget`).
- Hooks: `useX` prefix and follow React Hooks rules.
- Functions and variables: camelCase.
- Files: follow existing component/file naming in `src/`.
- CSS classes: follow existing `App.css` and `index.css` patterns.

### React Conventions
- Use function components.
- Keep state updates immutable.
- Use `useState`/`useEffect` according to hooks rules.
- Avoid stale closures in hooks (depend on hooks linting).

### Error Handling
- Prefer early returns for invalid states.
- Guard nullable DOM access (see `document.getElementById('root')!`).
- For async code, handle errors with try/catch and surface a user-friendly
  message if UI-facing.

### Accessibility
- Provide `alt` text for images.
- Prefer semantic HTML elements and attributes.
- Ensure interactive elements are keyboard accessible.

### CSS and Assets
- Keep CSS in `App.css` / `index.css` or co-located patterns that already exist.
- Avoid global CSS changes unless the feature requires it.

## Repository Hygiene
- Do not delete unrelated files.
- Do not change configs unless needed for the task.
- Keep dependencies minimal and justified.

## Git Guidance for Agents
- Never amend commits unless explicitly requested.
- Do not use destructive git commands.
- Keep commits focused and follow semantic commit messages.

## Common Pitfalls
- Forgetting to run lint before finalizing changes.
- Adding unused imports or unused vars (will fail lint/tsc).
- Introducing side-effect imports without necessity.

## References
- `frontend/package.json`
- `frontend/eslint.config.js`
- `frontend/tsconfig.app.json`
- `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
