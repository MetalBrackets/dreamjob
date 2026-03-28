# DreamJob Activity Log

## Session Log

### 2026-03-28
- **JSON File Store Service**: Implemented src/services/store.ts with four generic functions — readJSON<T> (returns null if file missing), writeJSON<T> (formatted JSON with auto-mkdir), readCollection<T> (returns [] if missing), writeCollection<T>. All use fs/promises and auto-create parent directories on write. Verified: round-trip tests pass for all four functions.

### 2026-03-28
- **NPM Scripts Verified**: Confirmed all four npm scripts work correctly — `dev` (tsx watch src/server.ts) starts with hot reload, `build` (tsc) compiles to dist/, `start` (node dist/server.js) runs compiled output, `seed` (tsx src/seed.ts) runs seed placeholder. Created src/seed.ts placeholder for the seed script.

### 2026-03-28
- **Fastify Server Entry Point**: Created src/server.ts with Fastify initialization (logger enabled), registered @fastify/cors (origin localhost:5173) and @fastify/multipart (10MB limit), ensureDataDirs on startup, and listen on PORT (default 3000). Verified: server starts, GET / returns 404, tsc --noEmit passes.

### 2026-03-28
- **Data Directory Structure**: Created data/ and data/uploads/ directories with .gitkeep files. Added data/ to .gitignore (preserving .gitkeep). Created src/ensure-dirs.ts to auto-create directories on first run.

### 2026-03-28
- **Dependency Verification**: Verified all production deps (Fastify, TypeBox, pdf-parse, @fastify/multipart, @fastify/cors, OpenAI SDK) and dev deps (TypeScript, tsx, @types/node) are installed and resolve correctly. Added src/index.ts placeholder so `tsc --noEmit` passes on the empty project.

### 2026-03-28 (earlier)
- **Project Scaffolding**: Initialized Node.js/TypeScript backend project — created package.json (dreamjob-backend), tsconfig.json (ES2022/NodeNext/strict), src/ directory structure (routes/, services/, services/ai/), .env.example, and installed all dependencies (Fastify, TypeBox, pdf-parse, multipart, CORS, OpenAI SDK, tsx, TypeScript).
