# DreamJob Activity Log

## Session Log

### 2026-03-28
- **Data Directory Structure**: Created data/ and data/uploads/ directories with .gitkeep files. Added data/ to .gitignore (preserving .gitkeep). Created src/ensure-dirs.ts to auto-create directories on first run.

### 2026-03-28
- **Dependency Verification**: Verified all production deps (Fastify, TypeBox, pdf-parse, @fastify/multipart, @fastify/cors, OpenAI SDK) and dev deps (TypeScript, tsx, @types/node) are installed and resolve correctly. Added src/index.ts placeholder so `tsc --noEmit` passes on the empty project.

### 2026-03-28 (earlier)
- **Project Scaffolding**: Initialized Node.js/TypeScript backend project — created package.json (dreamjob-backend), tsconfig.json (ES2022/NodeNext/strict), src/ directory structure (routes/, services/, services/ai/), .env.example, and installed all dependencies (Fastify, TypeBox, pdf-parse, multipart, CORS, OpenAI SDK, tsx, TypeScript).
