# Merak — Claude Code Instructions

This file guides Claude Code when working in the `merak` repository.

## Repository Overview

**Primary languages:** TypeScript (React 19 + Vite) and Rust (workspace crates)

**Package manager:** `pnpm` (see `packageManager` in `package.json`)

**Build tools:** `vite`, `tsc` (project references), `cargo`

**Styling:** Tailwind CSS v4.x

### Directory Structure

- `src/` — Frontend TypeScript/React source
  - State stores go in `src/models/` (using Zustand)
- `crates/` — Rust workspace crates
  - `crates/merak/` — Backend server crate
  - `crates/macros/` — Procedural macros (`merak_macros::Model`)

### Key Files

- `package.json` — Scripts: `dev`, `build`, `lint`, `preview`, `prepare`
- `Cargo.toml` — Rust workspace configuration
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

### Rust

- Follow existing crate structure; keep workspace settings unchanged
- All code must pass `cargo clippy` with no warnings
- No `unsafe` code
- HTTP handlers go in `routes/`, domain models in `models/`
- Use `merak_macros::Model` derive for database models
- Use `#[utoipa::path]` for OpenAPI documentation on handlers

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

# Rust
cargo build
cargo test
cargo clippy
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

## High-Risk Areas

**merak-macros (`crates/macros`):** Treat as infrastructure — modify with caution, ensure backward compatibility.

**Public crate APIs:** Do not make breaking changes without a migration plan.
