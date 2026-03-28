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

Multi-user demo backend for a resume-tailoring application. Each user builds a master profile containing all career information, then generates targeted resumes matched to LinkedIn job posts. No authentication -- profiles are openly accessible and selected by ID. This is a demo application not intended for production use without adding an auth layer.

---

## Database Schema

**Database:** PostgreSQL
**ORM:** Prisma

All foreign keys use `ON DELETE CASCADE` -- deleting a profile removes all associated records (experiences, skills, jobs, resumes, etc.). This keeps the demo clean and avoids orphaned data.

---

### Master Profile Tables

#### `profiles`

Top-level personal/contact info. One profile per user.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
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
| profile_id | int | FK -> profiles |
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
| profile_id | int | FK -> profiles |
| name | varchar(100) | not null |
| category | varchar(100) | e.g. "Languages", "Frameworks", "Soft Skills" |
| proficiency | enum | `beginner`, `intermediate`, `advanced`, `expert` |
| years_experience | smallint | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint on `(profile_id, name)`.

#### `education`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| profile_id | int | FK -> profiles |
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
| profile_id | int | FK -> profiles |
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
| profile_id | int | FK -> profiles |
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
| profile_id | int | FK -> profiles |
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

#### `references`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| profile_id | int | FK -> profiles |
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
| profile_id | int | FK -> profiles |
| name | varchar(100) | not null |
| proficiency | enum | `basic`, `conversational`, `professional`, `native` |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `volunteer_experience`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| profile_id | int | FK -> profiles |
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

Represents a job post captured from a LinkedIn listing. The exact ingestion method is TBD -- options include browser extension capture, page scraping, or manual paste. Regardless of method, the backend accepts either a raw job description (text) or structured fields. When raw text is provided, the backend uses LLM-assisted extraction (Claude API) to parse it into structured fields and populate `job_post_skills`.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| profile_id | int | FK -> profiles |
| source_url | varchar(500) | LinkedIn URL |
| raw_input | text | original pasted/scraped text before LLM extraction |
| title | varchar(300) | null until parsed |
| company | varchar(200) | |
| location | varchar(200) | |
| is_remote | boolean | |
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

---

### Tailored Resume Tables

#### `tailored_resumes`

A resume generated from the master profile, customized for a specific job post.

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| profile_id | int | FK -> profiles |
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
| experience_id | int | FK -> experiences |
| tailored_title | varchar(200) | override title if needed |
| tailored_description | text | override description |
| sort_order | int | |
| included | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_bullets`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_experience_id | int | FK -> tailored_resume_experiences |
| experience_bullet_id | int | FK -> experience_bullets, nullable (null = new bullet) |
| content | text | possibly reworded bullet |
| sort_order | int | |
| included | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_skills`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| skill_id | int | FK -> skills, nullable |
| name | varchar(100) | |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_education`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| education_id | int | FK -> education |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_certifications`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| certification_id | int | FK -> certifications |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_achievements`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| achievement_id | int | FK -> achievements |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tailored_resume_projects`

| Column | Type | Notes |
|---|---|---|
| id | serial | PK, auto-increment |
| tailored_resume_id | int | FK -> tailored_resumes |
| project_id | int | FK -> projects |
| included | boolean | default true |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> **Note:** Volunteer experience, languages, and references do not have tailored resume join tables. These sections rarely appear on resumes and are excluded by design. They can be added later if needed.

---

## API Structure

```
/api
├── /profiles
│   ├── GET    /                              # list all profiles (for profile picker)
│   ├── POST   /                              # create a new profile
│   ├── GET    /:profileId                    # get profile details
│   ├── PUT    /:profileId                    # update profile info
│   ├── DELETE /:profileId                    # delete a profile
│   │
│   ├── CRUD   /:profileId/experiences
│   ├── CRUD   /:profileId/experiences/:id/bullets
│   ├── CRUD   /:profileId/skills
│   ├── CRUD   /:profileId/education
│   ├── CRUD   /:profileId/certifications
│   ├── CRUD   /:profileId/achievements
│   ├── CRUD   /:profileId/projects
│   ├── CRUD   /:profileId/references
│   ├── CRUD   /:profileId/languages
│   ├── CRUD   /:profileId/volunteer
│   │
│   ├── CRUD   /:profileId/jobs
│   ├── CRUD   /:profileId/jobs/:id/skills   # view/correct extracted skills
│   ├── PATCH  /:profileId/jobs/:id/status   # update application status
│   │
│   ├── GET    /:profileId/resumes           # list tailored resumes
│   ├── POST   /:profileId/resumes/generate  # generate a tailored resume for a job post
│   ├── GET    /:profileId/resumes/:id
│   ├── PUT    /:profileId/resumes/:id       # manually adjust selections
│   ├── DELETE /:profileId/resumes/:id
│   ├── CRUD   /:profileId/resumes/:id/experiences
│   ├── CRUD   /:profileId/resumes/:id/experiences/:expId/bullets
│   ├── CRUD   /:profileId/resumes/:id/skills
│   ├── CRUD   /:profileId/resumes/:id/education
│   ├── CRUD   /:profileId/resumes/:id/certifications
│   ├── CRUD   /:profileId/resumes/:id/achievements
│   ├── CRUD   /:profileId/resumes/:id/projects
│   ├── PATCH  /:profileId/resumes/:id/selections  # bulk toggle included/excluded items
│   │
│   └── POST   /:profileId/jobs/:id/analyze  # returns match score, matched skills, gaps, and suggestions
```

---

## Key Design Decisions

1. **Bullets as separate rows** -- Allows granular include/exclude per tailored resume without duplicating text. Users can toggle individual accomplishments on or off for each application.

2. **Tailored resume tables reference master profile via FK** -- Changes to the master profile can optionally propagate. The `tailored_*` tables store overrides only when the user customizes wording for a specific application.

3. **Job post ingestion & skill extraction** -- Job ingestion method is TBD (browser extension, scraping, or manual paste). The backend accepts raw job description text or structured fields. When raw text is provided, LLM-assisted extraction parses it into structured fields and populates `job_post_skills` for matching.

4. **Match score** -- `POST /:profileId/jobs/:id/analyze` compares the job's extracted skills and requirements against the user's profile and returns: match score (0-100), matched skills, skill gaps, and improvement suggestions. The score is also stored on tailored resumes for quick display in listings.

5. **Application tracking built in** -- The `status` field on `job_posts` lets users track where they are in the pipeline without needing a separate tool.

6. **Cascade deletes** -- All foreign keys use `ON DELETE CASCADE`. Deleting a profile removes all child records (experiences, jobs, resumes, etc.), keeping the demo database clean without manual cleanup.

7. **No authentication** -- This is a demo application. Profiles are openly accessible and selected by ID via the URL path (`/api/profiles/:profileId/...`). Not suitable for production deployment without adding an auth layer.

8. **Bulk selections** -- `PATCH /:profileId/resumes/:id/selections` accepts an array of `{ type, id, included }` toggles (where `type` is `experience`, `bullet`, `skill`, `education`, `certification`, `achievement`, or `project`). This avoids N individual requests when customizing which items appear on a tailored resume.
