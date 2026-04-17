# Merak — Claude Code Instructions

This file guides Claude Code when working in the `merak` repository.

## Repository Overview

**Primary languages:** TypeScript (React 19 + Vite) and Go (Gin + SQLite)

**Package manager:** `pnpm` (frontend), Go modules (backend)

**Build tools:** `vite`, `tsc` (project references), `go build`

**Styling:** Tailwind CSS v4.x

### Directory Structure

- `src/` — Frontend TypeScript/React source
  - State stores go in `src/models/` (using Zustand)
- `backend/` — Go backend server (Gin + SQLite)
  - `routes/` — HTTP handlers (REST API)
  - `models/` — Database models (GORM)
  - `services/` — Business logic layer
  - `db/` — Database initialization
  - `common/` — Shared utilities (response helpers)

### Key Files

- `package.json` — Frontend scripts: `dev`, `build`, `lint`, `preview`, `prepare`
- `backend/go.mod` — Go module definition
- `components.json` — Shadcn component registry
- `tsconfig.json` — Path alias `@/*` maps to `./src/*`

**License:** AGPL-v3.0 (preserve headers, do not suggest relicensing)

## Coding Conventions

### TypeScript/React

- Use **PascalCase** for file and component names (e.g., `UserCard.tsx`)
- Use `@/*` path alias for imports from `src/`
- Keep imports explicit and minimal; prefer named imports
- Enable strict TypeScript; avoid `any` (add `// TODO` with rationale if unavoidable)
- Components should accept `className?: string` and forward `...props` to root element
- Complex UI components should use `cva` for variant management
- Simple components may use direct Tailwind classes

### Go

- Follow standard Go project layout within `backend/`
- HTTP handlers go in `routes/`, domain models in `models/`, business logic in `services/`
- Use GORM for database operations
- Use `common.Response()` helper for consistent API responses
- JWT authentication via `services/jwt.go`

### Styling

- Tailwind CSS utility classes
- Components should accept `className` prop for style overrides

### State Management

- **Page-level state:** `useState` / `useReducer`
- **Cross-component shared state:** Zustand
- **Persistent / global business state:** Zustand store under `src/models/`

## Commands

```bash
# Frontend dev
pnpm dev

# Build (TypeScript then Vite)
pnpm build

# Lint (Biome)
pnpm lint

# Preview build
pnpm preview

# Backend (Go)
cd backend
go run main.go              # Dev server
go build -o merak .         # Build binary
go test ./...               # Run tests
```

## Adding Components

**Shadcn components:**

```bash
pnpm dlx shadcn@latest add <component>
```

This updates `components.json` and installs the component.

## Constraints

- Do not add dependencies without clear benefit and documented rationale
- Do not introduce untested code paths for significant logic
- Never include secrets, credentials, or API keys in code
- Do not add telemetry or analytics without explicit approval
- Generated TypeScript must pass `tsc -b`
- Code must conform to Biome linting rules
- Pre-commit hooks use `prek` (run via `prek run`)

## Code Review Reminders

When reviewing or generating code:

- Does `pnpm build` pass?
- Are imports using `@/*` alias?
- Are types explicit and `any`-free?
- Is Tailwind usage consistent?
- Are UI components accessible (semantic HTML, labels)?
- Are tests present for non-trivial logic?
- No hard-coded secrets?
