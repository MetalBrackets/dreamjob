# Backend Design — DreamJob

## Overview

DreamJob helps users tailor their resume to LinkedIn job posts. This document describes the backend architecture for the single-user, open-source demo.

**Goals:** minimal setup friction (`git clone && npm install && npm run dev`), no authentication, local-first.

---

## Stack

| Layer      | Choice                  | Why                                         |
| ---------- | ----------------------- | ------------------------------------------- |
| Runtime    | Node.js + TypeScript    | Widely known, great tooling                 |
| Framework  | Fastify                 | Fast, plugin-based, first-class TS support  |
| Database   | SQLite via Prisma       | Zero config — single file, no server needed |
| AI         | OpenAI API              | Powers all AI agent operations               |

---

## Data Models

All models use auto-increment integer IDs and `createdAt`/`updatedAt` timestamps.

### Profile

Single document representing the user's complete professional identity (CandidateMasterProfile). Stored as one row with a single JSON column. Retrieved and updated as a whole via `GET` / `PUT /api/profile`.

| Field | Type | Notes                                    |
| ----- | ---- | ---------------------------------------- |
| id    | Int  | Always 1 (single user)                   |
| data  | Json | Full CandidateMasterProfile — see below  |

#### Profile JSON shape

```json
{
  "identity": {
    "name": "Jane Doe",
    "headline": "Product Designer",
    "email": "jane@example.com",
    "phone": "+33...",
    "location": "Paris",
    "links": {
      "linkedin": "https://linkedin.com/in/janedoe",
      "portfolio": "https://janedoe.com",
      "github": "https://github.com/janedoe"
    }
  },
  "targetRoles": ["Senior Product Designer", "Lead Product Designer"],
  "professionalSummaryMaster": "Master summary text",
  "experiences": [
    {
      "experienceId": "exp_01",
      "title": "Product Designer",
      "company": "Company A",
      "location": "Paris",
      "startDate": "2021-01",
      "endDate": "2024-02",
      "description": "Owned core journeys",
      "achievements": [
        { "text": "Improved activation by 18%", "metric": "18%", "proofLevel": "strong" }
      ],
      "skillsUsed": ["Figma", "Design System", "UX Research"]
    }
  ],
  "education": [
    {
      "school": "School X",
      "degree": "Master in Design",
      "field": "Design",
      "year": "2020"
    }
  ],
  "skills": [
    {
      "name": "Figma",
      "category": "tool",
      "level": "advanced",
      "years": 6,
      "evidenceRefs": ["exp_01", "proj_03"]
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "date": "2023-06"
    }
  ],
  "languages": [
    { "name": "French", "level": "native" },
    { "name": "English", "level": "professional" }
  ],
  "projects": [
    {
      "name": "Portfolio Site",
      "description": "Personal portfolio",
      "url": "https://janedoe.com",
      "technologies": ["React", "Next.js"]
    }
  ],
  "references": [
    {
      "name": "John Smith",
      "title": "Engineering Manager",
      "company": "Company A",
      "email": "john@example.com",
      "phone": "+33...",
      "relationship": "Former Manager"
    }
  ],
  "constraints": {
    "preferredCvLanguage": "fr",
    "maxCvPages": 1,
    "mustNotClaim": ["Team management if not proven"]
  }
}
```

### JobOfferRaw

Raw data captured by the browser extension before AI normalization.

| Field            | Type     | Notes                                  |
| ---------------- | -------- | -------------------------------------- |
| id               | Int      |                                        |
| source           | String   | e.g. "linkedin"                        |
| sourceUrl        | String   | Original job post URL                  |
| capturedAt       | DateTime | When the extension scraped it          |
| htmlSnapshotRef  | String   | Optional — ref to stored HTML snapshot |
| rawText          | String   | Full text extracted from the page      |
| rawFields        | Json     | `{title, company, location, employment_type, ...}` |

### JobPost

Normalized job post created from raw data. Used by the AI agents.

| Field                | Type     | Notes                                  |
| -------------------- | -------- | -------------------------------------- |
| id                   | Int      |                                        |
| jobOfferRawId        | Int      | FK → JobOfferRaw                       |
| title                | String   | Job title                              |
| company              | String   |                                        |
| description          | String   | Full job description text              |
| url                  | String   | LinkedIn post URL                      |
| salary               | String   | Optional, as posted                    |
| location             | String   |                                        |
| remoteMode           | String   | `onsite` / `hybrid` / `remote`         |
| employmentType       | String   | `full_time` / `part_time` / `contract` / `internship` |
| seniority            | String   | `entry` / `mid` / `senior` / `lead` / `executive` |
| jobSummary           | String   | Short normalized summary               |
| responsibilities     | String[] | Key responsibilities (JSON col)        |
| requirementsMustHave | String[] | Hard requirements (JSON col)           |
| requirementsNiceToHave | String[] | Nice-to-have requirements (JSON col) |
| keywords             | String[] | Extracted keywords (JSON col)          |
| tools                | String[] | Tools mentioned (JSON col)             |
| languages            | String[] | Language requirements (JSON col)       |
| yearsExperienceMin   | Int      | Optional                               |
| postedDate           | DateTime | Optional                               |

### GeneratedCV

Structured, job-targeted CV generated by the Candidate Agent.

| Field                  | Type     | Notes                                              |
| ---------------------- | -------- | -------------------------------------------------- |
| id                     | Int      |                                                    |
| profileId              | Int      | FK → Profile                                       |
| jobPostId              | Int      | FK → JobPost                                       |
| version                | Int      | Iteration count                                    |
| language               | String   | CV language (e.g. "fr", "en")                      |
| title                  | String   | e.g. "CV ciblé - Senior Product Designer"          |
| header                 | Json     | `{fullName, headline, contact, links}`             |
| summary                | String   | Tailored professional summary                      |
| skillsHighlighted      | String[] | Selected skills for this job (JSON col)            |
| experiencesSelected    | Json     | `[{experienceId, rewrittenBullets[]}]`             |
| educationSelected      | Json     | Selected education entries                         |
| certificationsSelected | Json     | Selected certifications                            |
| keywordsCovered        | String[] | Job keywords addressed (JSON col)                  |
| omittedItems           | String[] | Items deliberately excluded (JSON col)             |
| generationNotes        | String[] | Agent reasoning notes (JSON col)                   |

### ATSReview

Output from the ATS Agent — keyword and format compliance check.

| Field             | Type     | Notes                                      |
| ----------------- | -------- | ------------------------------------------ |
| id                | Int      |                                            |
| cvId              | Int      | FK → GeneratedCV                        |
| jobPostId         | Int      | FK → JobPost                               |
| score             | Int      | 0–100                                      |
| passed            | Boolean  |                                            |
| hardFiltersStatus | Json     | `[{filter, status, evidence}]`             |
| matchedKeywords   | String[] | Keywords found in CV (JSON col)            |
| missingKeywords   | String[] | Keywords absent from CV (JSON col)         |
| formatFlags       | String[] | Formatting issues (JSON col)               |
| recommendations   | String[] | Suggested improvements (JSON col)          |

### RecruiterReview

Output from the Recruiter Agent — human-readability and credibility check.

| Field            | Type     | Notes                              |
| ---------------- | -------- | ---------------------------------- |
| id               | Int      |                                    |
| cvId             | Int      | FK → GeneratedCV                   |
| jobPostId        | Int      | FK → JobPost                       |
| score            | Int      | Overall 0–100                      |
| passed           | Boolean  |                                    |
| readabilityScore | Int      | 0–100                              |
| credibilityScore | Int      | 0–100                              |
| coherenceScore   | Int      | 0–100                              |
| evidenceScore    | Int      | 0–100                              |
| strengths        | String[] | What works well (JSON col)         |
| concerns         | String[] | Issues found (JSON col)            |
| recommendations  | String[] | Suggested improvements (JSON col)  |

### ReviewAgreement

Final decision object from the orchestrator.

| Field              | Type     | Notes                                                |
| ------------------ | -------- | ---------------------------------------------------- |
| id                 | Int      |                                                      |
| jobPostId          | Int      | FK → JobPost                                         |
| cvId               | Int      | FK → GeneratedCV                                  |
| cvGenerationOk     | Boolean  |                                                      |
| atsOk              | Boolean  |                                                      |
| recruiterOk        | Boolean  |                                                      |
| reviewAgreementOk  | Boolean  |                                                      |
| finalStatus        | String   | `FINAL_APPROVED` / `REJECTED` / `NEEDS_REVISION`    |
| rejectionReasons   | String[] | Why it was rejected (JSON col)                       |
| iterationCount     | Int      |                                                      |

---

## API Routes

Base path: `/api`

### Profile

| Method | Route            | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| GET    | `/api/profile`   | Get the full profile document            |
| PUT    | `/api/profile`   | Replace the full profile document        |

### Job Posts — Raw

| Method | Route               | Description                                              |
| ------ | ------------------- | -------------------------------------------------------- |
| POST   | `/api/jobs/raw`     | Extension posts raw scraped data; auto-normalizes into a JobPost |
| GET    | `/api/jobs/raw`     | List raw captures                                        |
| GET    | `/api/jobs/raw/:id` | Get one raw capture                                      |

### Job Posts — Normalized

| Method | Route             | Description                  |
| ------ | ----------------- | ---------------------------- |
| GET    | `/api/jobs`       | List normalized job posts    |
| GET    | `/api/jobs/:id`   | Get a normalized job post    |
| PUT    | `/api/jobs/:id`   | Update a job post            |
| DELETE | `/api/jobs/:id`   | Delete a job post            |

### CVs

| Method | Route                                        | Description                        |
| ------ | -------------------------------------------- | ---------------------------------- |
| POST   | `/api/cvs/generate`                          | Generate a tailored CV (kicks off the full agent pipeline) |
| GET    | `/api/cvs`                                   | List all generated CVs             |
| GET    | `/api/cvs/:id`                               | Get a specific generated CV        |
| DELETE | `/api/cvs/:id`                               | Delete a generated CV              |

### Reviews

| Method | Route                                        | Description                        |
| ------ | -------------------------------------------- | ---------------------------------- |
| GET    | `/api/cvs/:id/ats-review`                    | Get ATS review for a CV            |
| GET    | `/api/cvs/:id/recruiter-review`              | Get recruiter review for a CV      |

**POST `/api/cvs/generate` request body:**

```json
{
  "jobPostId": 1,
  "language": "fr"
}
```

The endpoint fetches the full profile + job post, runs the multi-agent pipeline (Candidate Agent → ATS Agent → Recruiter Agent → Orchestrator), and stores the GeneratedCV, ATSReview, RecruiterReview, and ReviewAgreement.

---

## Validation

Fastify has built-in request validation via JSON Schema. Each route defines a schema for its request body and params, and Fastify rejects invalid requests with a `400` before the handler runs.

### Approach

- Define schemas with `@sinclair/typebox` (ships with Fastify) for type-safe schema + TypeScript type from a single definition.
- Schemas live alongside their routes (co-located in each route file).
- Only validate at the API boundary — no redundant checks inside services.

### What to validate

| Area         | Rules                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Required fields | Reject missing required fields (e.g. `identity.name`, `identity.email`) |
| Types        | Strings are strings, numbers are numbers, dates are ISO-8601 strings  |
| Enums        | `employmentType`, `seniority`, `remoteMode`, `level`, `finalStatus` must be one of the allowed values |
| String limits | Reasonable max lengths (e.g. `name` ≤ 200, `description` ≤ 10000)   |
| ID params    | Route `:id` params must be positive integers                          |

### Error format

Fastify's default validation error response:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body/email must match format \"email\""
}
```

No custom error handler needed — the default format is clear enough for a demo.

---

## AI Layer

```
services/ai/
  openai.ts   — OpenAI implementation (OpenAI SDK)
```

All AI agent operations (normalization, CV generation, ATS review, recruiter review) use the OpenAI API via the official SDK. Requires `OPENAI_API_KEY` env var.

---

## Project Structure

```
src/
  server.ts              — Fastify app setup, plugin registration
  routes/
    profile.ts           — Profile CRUD
    jobs.ts              — Job post + raw capture endpoints
    cvs.ts               — CV generation + review endpoints
  services/
    ai/
      openai.ts          — OpenAI API calls
    cv-generator.ts      — Orchestrates the multi-agent pipeline
    normalize.ts         — Normalizes raw job data into JobPost
prisma/
  schema.prisma          — All data models
  seed.ts                — Demo profile data
.env.example             — Template with required env vars
package.json
tsconfig.json
```

---

## Setup & Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...

# Optional
PORT=3000                   # Server port (default: 3000)
DATABASE_URL=file:./dev.db  # SQLite path (default: file:./dev.db)
```

### Getting Started

```bash
git clone <repo-url>
cd dreamjob
cp .env.example .env       # Add your API key(s)
npm install
npx prisma db push          # Create SQLite DB + tables
npx prisma db seed           # Load demo profile data
npm run dev                  # Start Fastify on :3000
```

### Scripts

| Script          | Command                | Purpose                    |
| --------------- | ---------------------- | -------------------------- |
| `dev`           | `tsx watch src/server.ts` | Dev server with hot reload |
| `build`         | `tsc`                  | Compile TypeScript         |
| `start`         | `node dist/server.js`  | Production start           |
| `db:push`       | `prisma db push`       | Sync schema to DB          |
| `db:seed`       | `prisma db seed`       | Seed demo data             |
| `db:studio`     | `prisma studio`        | Visual DB browser          |

---

## Seed Data

The seed script creates a single Profile row with a full JSON document containing:
- Identity (name, headline, contact, links)
- Target roles and constraints
- 2-3 work experiences with achievements (text, metric, proof level) and skills used
- 1-2 education entries
- 8-10 skills across categories with years and evidence refs
- 1-2 certifications
- 2-3 languages with proficiency levels
- 2-3 portfolio projects
- 1-2 references

This lets users immediately try the tailoring feature without manual data entry.
