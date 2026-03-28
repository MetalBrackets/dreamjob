# DreamJob Backend Design

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (TypeScript) |
| Framework | Fastify or Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Job Parsing | LLM-assisted extraction (Claude API) |
| Resume Tailoring | LLM-assisted rewriting (Claude API) |

---

## Overview

Single-user, self-hosted backend for a resume-tailoring application. The user builds a master profile containing all career information, then generates targeted resumes matched to job posts. Designed as an open-source tool that anyone can download and run locally for their own use. Single profile, no authentication.

---

## Database Schema

**Database:** PostgreSQL
**ORM:** Prisma

All foreign keys use `ON DELETE CASCADE` unless noted otherwise. Deleting master profile data removes associated child records (e.g. deleting an experience deletes its bullets). Exception: tailored resume tables use `ON DELETE SET NULL` for references back to master data -- this prevents edits to the master profile from silently destroying saved tailored resumes (see Key Design Decisions).

**Sort order convention:** `sort_order` is client-provided on create/update. When omitted, the backend defaults to max+1 within the parent scope.

---

### Master Profile Tables

#### `profile`

Top-level personal/contact info. Exactly one row -- the app seeds this on first run and the row is never deleted, only updated.

| Column | Type | Notes |
|---|---|---|
| id | int | PK, always 1 |
| first_name | varchar(100) | |
| last_name | varchar(100) | |
| headline | varchar(300) | professional headline |
| summary | text | career summary / bio |
| email_contact | varchar(255) | contact email |
| phone | varchar(30) | |
| location_city | varchar(100) | |
| location_state | varchar(100) | |
| location_country | varchar(100) | |
| willing_to_relocate | boolean | default false |
| remote_preference | enum | `remote`, `hybrid`, `onsite`, `flexible` |
| linkedin_url | varchar(500) | |
| github_url | varchar(500) | |
| website_url | varchar(500) | |
| portfolio_url | varchar(500) | |
| avatar_url | varchar(500) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `experiences`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| company | varchar(200) | not null |
| title | varchar(200) | not null |
| employment_type | enum | `full_time`, `part_time`, `contract`, `freelance`, `internship` |
| location | varchar(200) | |
| is_remote | boolean | |
| start_date | date | not null |
| end_date | date | null = current |
| description | text | full role description |
| sort_order | int | user-defined ordering |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `experience_bullets`

Individual bullet points per experience, stored separately so the user can select/deselect them per tailored resume.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| experience_id | int | FK -> experiences |
| content | text | single accomplishment/responsibility |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `skills`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| name | varchar(100) | not null |
| category | varchar(100) | e.g. "Languages", "Frameworks", "Soft Skills" |
| proficiency | enum | `beginner`, `intermediate`, `advanced`, `expert` |
| years_experience | smallint | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint on `(name)`.

#### `education`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| institution | varchar(200) | not null |
| degree | varchar(200) | e.g. "B.S. Computer Science" |
| field_of_study | varchar(200) | |
| start_date | date | |
| end_date | date | null = in progress |
| gpa | varchar(10) | optional |
| description | text | honors, activities, thesis |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `certifications`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| name | varchar(200) | not null |
| issuing_org | varchar(200) | |
| issue_date | date | |
| expiry_date | date | null = no expiry |
| credential_url | varchar(500) | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `achievements`

Awards, publications, patents, talks, or anything notable.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| title | varchar(300) | not null |
| category | enum | `award`, `publication`, `patent`, `talk`, `open_source`, `other` |
| description | text | |
| date | date | |
| url | varchar(500) | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `projects`

Portfolio / side projects.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| name | varchar(200) | not null |
| description | text | |
| url | varchar(500) | live link |
| repo_url | varchar(500) | source code |
| tech_stack | text[] | array of techs used |
| start_date | date | |
| end_date | date | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `profile_references`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| name | varchar(200) | not null |
| relationship | varchar(200) | e.g. "Former Manager at Acme" |
| email | varchar(255) | |
| phone | varchar(30) | |
| linkedin_url | varchar(500) | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `languages`

Spoken/written languages.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| name | varchar(100) | not null |
| proficiency | enum | `basic`, `conversational`, `professional`, `native` |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `volunteer_experience`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| organization | varchar(200) | not null |
| role | varchar(200) | |
| description | text | |
| start_date | date | |
| end_date | date | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### Job Post Tables

#### `job_posts`

Represents a job post captured from a listing. The exact ingestion method is TBD -- options include browser extension capture, page scraping, or manual paste. Regardless of method, the backend accepts either a raw job description (text) or structured fields. When raw text is provided, the backend uses LLM-assisted extraction (Claude API) to parse it into structured fields and populate `job_post_skills`.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| source_url | varchar(500) | job listing URL |
| raw_input | text | original pasted/scraped text before LLM extraction |
| title | varchar(300) | null until parsed |
| company | varchar(200) | |
| location | varchar(200) | |
| remote_type | enum | `remote`, `hybrid`, `onsite` |
| employment_type | enum | `full_time`, `part_time`, `contract`, `freelance`, `internship` |
| salary_min | int | |
| salary_max | int | |
| salary_currency | varchar(3) | e.g. "USD" |
| experience_level | enum | `entry`, `mid`, `senior`, `lead`, `executive` |
| description | text | full job description |
| requirements | text | extracted requirements section |
| posted_at | timestamptz | |
| status | enum | `saved`, `applying`, `applied`, `interviewing`, `offered`, `rejected`, `withdrawn` |
| notes | text | user's private notes |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `job_post_skills`

Skills extracted from the job post (used for matching).

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| job_post_id | int | FK -> job_posts |
| skill_name | varchar(100) | |
| is_required | boolean | required vs nice-to-have |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### Tailored Resume Tables

#### `tailored_resumes`

A resume generated from the master profile, customized for a specific job post.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| job_post_id | int | FK -> job_posts, not null |
| name | varchar(200) | user-given label |
| tailored_headline | varchar(300) | |
| tailored_summary | text | |
| match_score | smallint | 0-100, computed by backend |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_experiences`

Which experiences and bullets are included in this version.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| experience_id | int | FK -> experiences, nullable, `ON DELETE SET NULL` |
| company | varchar(200) | copied from master on generate; user may edit |
| tailored_title | varchar(200) | copied from master on generate; user may edit |
| tailored_description | text | copied from master on generate; user may edit |
| employment_type | enum | `full_time`, `part_time`, `contract`, `freelance`, `internship`; copied from master |
| location | varchar(200) | copied from master on generate; user may edit |
| is_remote | boolean | copied from master on generate; user may edit |
| start_date | date | copied from master on generate; user may edit |
| end_date | date | copied from master on generate; user may edit |
| sort_order | int | |
| included | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_bullets`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_experience_id | int | FK -> tailored_resume_experiences |
| experience_bullet_id | int | FK -> experience_bullets, nullable, `ON DELETE SET NULL` |
| content | text | copied from master on generate; user may edit |
| sort_order | int | |
| included | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_skills`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| skill_id | int | FK -> skills, nullable, `ON DELETE SET NULL` |
| name | varchar(100) | |
| category | varchar(100) | copied from master on generate; user may edit |
| proficiency | enum | `beginner`, `intermediate`, `advanced`, `expert`; copied from master |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_education`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| education_id | int | FK -> education, nullable, `ON DELETE SET NULL` |
| institution | varchar(200) | copied from master on generate; user may edit |
| degree | varchar(200) | copied from master on generate; user may edit |
| field_of_study | varchar(200) | copied from master on generate; user may edit |
| description | text | copied from master on generate; user may edit |
| start_date | date | copied from master on generate; user may edit |
| end_date | date | copied from master on generate; user may edit |
| gpa | varchar(10) | copied from master on generate; user may edit |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_certifications`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| certification_id | int | FK -> certifications, nullable, `ON DELETE SET NULL` |
| name | varchar(200) | copied from master on generate; user may edit |
| issuing_org | varchar(200) | copied from master on generate; user may edit |
| issue_date | date | copied from master on generate; user may edit |
| expiry_date | date | copied from master on generate; user may edit |
| credential_url | varchar(500) | copied from master on generate; user may edit |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_achievements`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| achievement_id | int | FK -> achievements, nullable, `ON DELETE SET NULL` |
| title | varchar(300) | copied from master on generate; user may edit |
| category | enum | `award`, `publication`, `patent`, `talk`, `open_source`, `other`; copied from master |
| description | text | copied from master on generate; user may edit |
| date | date | copied from master on generate; user may edit |
| url | varchar(500) | copied from master on generate; user may edit |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_projects`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| project_id | int | FK -> projects, nullable, `ON DELETE SET NULL` |
| name | varchar(200) | copied from master on generate; user may edit |
| description | text | copied from master on generate; user may edit |
| url | varchar(500) | copied from master on generate; user may edit |
| repo_url | varchar(500) | copied from master on generate; user may edit |
| tech_stack | text[] | copied from master on generate; user may edit |
| start_date | date | copied from master on generate; user may edit |
| end_date | date | copied from master on generate; user may edit |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> **Note:** Volunteer experience, languages, and references do not have tailored resume join tables. These sections rarely appear on resumes and are excluded by design. They can be added later if needed.

---

## API Structure

```
/api
├── /profile
│   ├── GET    /                              # get profile
│   └── PUT    /                              # update profile
│
├── /experiences                               # CRUD
├── /experiences/:id/bullets                   # CRUD
├── /skills                                    # CRUD
├── /education                                 # CRUD
├── /certifications                            # CRUD
├── /achievements                              # CRUD
├── /projects                                  # CRUD
├── /references                                # CRUD
├── /languages                                 # CRUD
├── /volunteer                                 # CRUD
│
├── /jobs                                      # CRUD
├── /jobs/:id/skills                           # view/correct extracted skills
├── /jobs/:id/status                           # PATCH update application status
├── /jobs/:id/parse                            # POST re-run LLM extraction
├── /jobs/:id/analyze                          # POST match analysis
│
├── /resumes                                   # GET list tailored resumes
├── /resumes/generate                          # POST generate a tailored resume (body: { job_post_id })
├── /resumes/:id                               # GET, PUT, DELETE
├── /resumes/:id/experiences                   # CRUD
├── /resumes/:id/experiences/:expId/bullets    # CRUD
├── /resumes/:id/skills                        # CRUD
├── /resumes/:id/education                     # CRUD
├── /resumes/:id/certifications                # CRUD
├── /resumes/:id/achievements                  # CRUD
├── /resumes/:id/projects                      # CRUD
└── /resumes/:id/selections                    # PATCH bulk toggle
```

---

## Key Design Decisions

1. **Single user, single profile** -- The app assumes one user running it locally. The `profile` table always has exactly one row (seeded on first run). There is no authentication, no profile picker, and no multi-tenancy. Anyone who needs the tool downloads it and runs their own instance.

2. **Bullets as separate rows** -- Allows granular include/exclude per tailored resume without duplicating text. The user can toggle individual accomplishments on or off for each application.

3. **Content snapshot on generate** -- When a tailored resume is generated, all content columns in tailored tables are populated by copying from the master profile. This makes each tailored resume self-contained. Subsequent edits to master data do not alter existing tailored resumes. The FK back to master data is retained for UI convenience (e.g. showing "derived from" links) but is not required for the tailored resume to render completely.

4. **SET NULL for tailored resume FKs back to master data** -- `tailored_resume_experiences.experience_id`, `tailored_resume_bullets.experience_bullet_id`, and similar FKs use `ON DELETE SET NULL` instead of `CASCADE`. Because all tailored tables snapshot content at generation time (see #3), deleting a master record nullifies the FK but the tailored resume retains all its content and continues to render correctly.

5. **Job post ingestion & skill extraction** -- Job ingestion method is TBD (browser extension, scraping, or manual paste). The backend accepts raw job description text or structured fields. When raw text is provided, LLM-assisted extraction parses it into structured fields and populates `job_post_skills` for matching. `POST /jobs/:id/parse` allows re-running extraction on an existing job post if the initial results are unsatisfactory.

6. **Match score** -- `POST /jobs/:id/analyze` compares the job's extracted skills and requirements against the user's profile and returns: match score (0-100), matched skills, skill gaps, and improvement suggestions. `POST /resumes/generate` also runs the analysis during generation and stores the resulting score on the new `tailored_resumes` row. The score on a tailored resume is a snapshot from generation time and is not automatically updated if the profile or job post changes.

7. **Application tracking built in** -- The `status` field on `job_posts` lets the user track where they are in the pipeline without needing a separate tool.

8. **Cascade deletes for parent-child** -- Direct parent-child relationships (e.g. experience -> bullets, job_post -> job_post_skills, tailored_resume -> tailored_resume_experiences) use `ON DELETE CASCADE`. Cross-reference FKs from tailored resume tables back to master data use `SET NULL` (see #4).

9. **Bulk selections** -- `PATCH /resumes/:id/selections` accepts an array of `{ type, id, included }` toggles (where `type` is `experience`, `bullet`, `skill`, `education`, `certification`, `achievement`, or `project`). This avoids N individual requests when customizing which items appear on a tailored resume.

10. **Table naming** -- `profile_references` is used instead of `references` to avoid the PostgreSQL reserved word. The API route remains `/references` for cleanliness.
