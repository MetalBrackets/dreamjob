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
| Storage    | JSON files (`fs`)       | Zero config — just files, no ORM or DB needed |
| AI         | OpenAI API              | Powers all AI agent operations               |

---

## Data Models

All models use auto-generated string IDs (e.g. `"job_1"`, `"cv_1"`) and `createdAt`/`updatedAt` ISO-8601 timestamps. Each model type is stored in its own JSON file inside the `data/` directory.

### Profile

Single document representing the user's complete professional identity (CandidateMasterProfile). Stored as `data/profile.json`. Retrieved and updated as a whole via `GET` / `PUT /api/profile`.

| Field | Type   | Notes                                    |
| ----- | ------ | ---------------------------------------- |
| id    | String | Always `"default"` (single user)         |
| data  | Object | Full CandidateMasterProfile — see below  |

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
| id               | String   | e.g. `"raw_1"`                         |
| source           | String   | e.g. "linkedin"                        |
| sourceUrl        | String   | Original job post URL                  |
| capturedAt       | DateTime | When the extension scraped it          |
| htmlSnapshotRef  | String   | Optional — ref to stored HTML snapshot |
| rawText          | String   | Full text extracted from the page      |
| rawFields        | Object   | `{title, company, location, employment_type, ...}` |

### JobPost

Normalized job post created from raw data. Used by the AI agents.

| Field                | Type     | Notes                                  |
| -------------------- | -------- | -------------------------------------- |
| id                   | String   | e.g. `"job_1"`                         |
| jobOfferRawId        | String   | Ref → JobOfferRaw id                   |
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
| responsibilities     | String[] | Key responsibilities        |
| requirementsMustHave | String[] | Hard requirements           |
| requirementsNiceToHave | String[] | Nice-to-have requirements |
| keywords             | String[] | Extracted keywords          |
| tools                | String[] | Tools mentioned             |
| languages            | String[] | Language requirements       |
| yearsExperienceMin   | Int      | Optional                               |
| postedDate           | DateTime | Optional                               |

### GeneratedCV

Structured, job-targeted CV generated by the Candidate Agent.

| Field                  | Type     | Notes                                              |
| ---------------------- | -------- | -------------------------------------------------- |
| id                     | String   | e.g. `"cv_1"`                                      |
| profileId              | String   | Ref → Profile id                                   |
| jobPostId              | String   | Ref → JobPost id                                   |
| version                | Int      | Iteration count                                    |
| language               | String   | CV language (e.g. "fr", "en")                      |
| title                  | String   | e.g. "CV ciblé - Senior Product Designer"          |
| header                 | Object   | `{fullName, headline, contact, links}`             |
| summary                | String   | Tailored professional summary                      |
| skillsHighlighted      | String[] | Selected skills for this job            |
| experiencesSelected    | Object[] | `[{experienceId, rewrittenBullets[]}]`             |
| educationSelected      | Object[] | Selected education entries                         |
| certificationsSelected | Object[] | Selected certifications                            |
| keywordsCovered        | String[] | Job keywords addressed                  |
| omittedItems           | String[] | Items deliberately excluded             |
| generationNotes        | String[] | Agent reasoning notes                   |

### ATSReview

Output from the ATS Agent — keyword and format compliance check.

| Field             | Type     | Notes                                      |
| ----------------- | -------- | ------------------------------------------ |
| id                | String   | e.g. `"ats_1"`                             |
| cvId              | String   | Ref → GeneratedCV id                       |
| jobPostId         | String   | Ref → JobPost id                           |
| score             | Int      | 0–100                                      |
| passed            | Boolean  |                                            |
| hardFiltersStatus | Object[] | `[{filter, status, evidence}]`             |
| matchedKeywords   | String[] | Keywords found in CV            |
| missingKeywords   | String[] | Keywords absent from CV         |
| formatFlags       | String[] | Formatting issues               |
| recommendations   | String[] | Suggested improvements          |

### RecruiterReview

Output from the Recruiter Agent — human-readability and credibility check.

| Field            | Type     | Notes                              |
| ---------------- | -------- | ---------------------------------- |
| id               | String   | e.g. `"rr_1"`                      |
| cvId             | String   | Ref → GeneratedCV id               |
| jobPostId        | String   | Ref → JobPost id                   |
| score            | Int      | Overall 0–100                      |
| passed           | Boolean  |                                    |
| readabilityScore | Int      | 0–100                              |
| credibilityScore | Int      | 0–100                              |
| coherenceScore   | Int      | 0–100                              |
| evidenceScore    | Int      | 0–100                              |
| strengths        | String[] | What works well         |
| concerns         | String[] | Issues found            |
| recommendations  | String[] | Suggested improvements  |

### ReviewAgreement

Final decision object from the orchestrator.

| Field              | Type     | Notes                                                |
| ------------------ | -------- | ---------------------------------------------------- |
| id                 | String   | e.g. `"ra_1"`                                        |
| jobPostId          | String   | Ref → JobPost id                                     |
| cvId               | String   | Ref → GeneratedCV id                                 |
| cvGenerationOk     | Boolean  |                                                      |
| atsOk              | Boolean  |                                                      |
| recruiterOk        | Boolean  |                                                      |
| reviewAgreementOk  | Boolean  |                                                      |
| finalStatus        | String   | `FINAL_APPROVED` / `REJECTED` / `NEEDS_REVISION`    |
| rejectionReasons   | String[] | Why it was rejected                       |
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
  "jobPostId": "job_1",
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
| ID params    | Route `:id` params must be non-empty strings                          |

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
    store.ts             — Thin read/write layer over JSON files (fs)
    cv-generator.ts      — Orchestrates the multi-agent pipeline
    normalize.ts         — Normalizes raw job data into JobPost
  seed.ts                — Writes demo profile data to data/profile.json
data/                    — Auto-created on first run, gitignored
  profile.json           — Single profile document
  jobs-raw.json          — Raw job captures
  jobs.json              — Normalized job posts
  cvs.json               — Generated CVs
  ats-reviews.json       — ATS review results
  recruiter-reviews.json — Recruiter review results
  review-agreements.json — Final review decisions
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
```

### Getting Started

```bash
git clone <repo-url>
cd dreamjob
cp .env.example .env       # Add your API key(s)
npm install
npm run seed                # Load demo profile data into data/
npm run dev                 # Start Fastify on :3000
```

### Scripts

| Script          | Command                | Purpose                    |
| --------------- | ---------------------- | -------------------------- |
| `dev`           | `tsx watch src/server.ts` | Dev server with hot reload |
| `build`         | `tsc`                  | Compile TypeScript         |
| `start`         | `node dist/server.js`  | Production start           |
| `seed`          | `tsx src/seed.ts`      | Write demo profile to data/|

---

## Seed Data

The seed script writes a `data/profile.json` file containing:
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
