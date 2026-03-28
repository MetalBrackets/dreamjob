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

Single-user, locally-run backend for a resume-tailoring application. The user builds a master profile containing all career information, then generates targeted resumes matched to LinkedIn job posts. No authentication is needed -- each instance is used by one person on their own machine.

---

## Database Schema

**Database:** PostgreSQL
**ORM:** Prisma

---

### Master Profile Tables

#### `profiles`

Top-level personal/contact info. One profile per instance.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| first_name | varchar(100) | |
| last_name | varchar(100) | |
| headline | varchar(300) | professional headline |
| summary | text | career summary / bio |
| email_contact | varchar(255) | may differ from login email |
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
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
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
| id | uuid | PK |
| experience_id | uuid | FK -> experiences |
| content | text | single accomplishment/responsibility |
| sort_order | int | |
| created_at | timestamptz | |

#### `skills`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| name | varchar(100) | not null |
| category | varchar(100) | e.g. "Languages", "Frameworks", "Soft Skills" |
| proficiency | enum | `beginner`, `intermediate`, `advanced`, `expert` |
| years_experience | smallint | |
| sort_order | int | |

Unique constraint on `(profile_id, name)`.

#### `education`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| institution | varchar(200) | not null |
| degree | varchar(200) | e.g. "B.S. Computer Science" |
| field_of_study | varchar(200) | |
| start_date | date | |
| end_date | date | null = in progress |
| gpa | varchar(10) | optional |
| description | text | honors, activities, thesis |
| sort_order | int | |

#### `certifications`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| name | varchar(200) | not null |
| issuing_org | varchar(200) | |
| issue_date | date | |
| expiry_date | date | null = no expiry |
| credential_url | varchar(500) | |
| sort_order | int | |

#### `achievements`

Awards, publications, patents, talks, or anything notable.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| title | varchar(300) | not null |
| category | enum | `award`, `publication`, `patent`, `talk`, `open_source`, `other` |
| description | text | |
| date | date | |
| url | varchar(500) | |
| sort_order | int | |

#### `projects`

Portfolio / side projects.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| name | varchar(200) | not null |
| description | text | |
| url | varchar(500) | live link |
| repo_url | varchar(500) | source code |
| tech_stack | text[] | array of techs used |
| start_date | date | |
| end_date | date | |
| sort_order | int | |

#### `references`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| name | varchar(200) | not null |
| relationship | varchar(200) | e.g. "Former Manager at Acme" |
| email | varchar(255) | |
| phone | varchar(30) | |
| linkedin_url | varchar(500) | |
| sort_order | int | |

#### `languages`

Spoken/written languages.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| name | varchar(100) | not null |
| proficiency | enum | `basic`, `conversational`, `professional`, `native` |

#### `volunteer_experience`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| organization | varchar(200) | not null |
| role | varchar(200) | |
| description | text | |
| start_date | date | |
| end_date | date | |
| sort_order | int | |

---

### Job Post Tables

#### `job_posts`

Represents a scraped or manually entered LinkedIn job post.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| source_url | varchar(500) | LinkedIn URL |
| title | varchar(300) | not null |
| company | varchar(200) | |
| location | varchar(200) | |
| is_remote | boolean | |
| contract_type | enum | `full_time`, `part_time`, `contract`, `freelance`, `internship` |
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
| id | uuid | PK |
| job_post_id | uuid | FK -> job_posts |
| skill_name | varchar(100) | |
| is_required | boolean | required vs nice-to-have |

---

### Tailored Resume Tables

#### `tailored_resumes`

A resume generated from the master profile, customized for a specific job post.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | FK -> profiles |
| job_post_id | uuid | FK -> job_posts, nullable |
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
| id | uuid | PK |
| tailored_resume_id | uuid | FK -> tailored_resumes |
| experience_id | uuid | FK -> experiences |
| tailored_title | varchar(200) | override title if needed |
| tailored_description | text | override description |
| sort_order | int | |
| included | boolean | default true |

#### `tailored_resume_bullets`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tailored_resume_experience_id | uuid | FK -> tailored_resume_experiences |
| experience_bullet_id | uuid | FK -> experience_bullets, nullable (null = new bullet) |
| content | text | possibly reworded bullet |
| sort_order | int | |
| included | boolean | default true |

#### `tailored_resume_skills`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tailored_resume_id | uuid | FK -> tailored_resumes |
| skill_id | uuid | FK -> skills, nullable |
| name | varchar(100) | |
| included | boolean | default true |
| sort_order | int | |

#### `tailored_resume_education`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tailored_resume_id | uuid | FK -> tailored_resumes |
| education_id | uuid | FK -> education |
| included | boolean | default true |
| sort_order | int | |

---

## API Structure

```
/api
├── /profile
│   ├── GET    /                    # get master profile
│   ├── PUT    /                    # update profile info
│   ├── CRUD   /experiences
│   ├── CRUD   /experiences/:id/bullets
│   ├── CRUD   /skills
│   ├── CRUD   /education
│   ├── CRUD   /certifications
│   ├── CRUD   /achievements
│   ├── CRUD   /projects
│   ├── CRUD   /references
│   ├── CRUD   /languages
│   └── CRUD   /volunteer
│
├── /jobs
│   ├── GET    /                    # list saved jobs (filter by status, type, etc.)
│   ├── POST   /                    # save a job post (manual or from URL)
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── PATCH  /:id/status          # update application status
│
├── /resumes
│   ├── GET    /                    # list tailored resumes
│   ├── POST   /generate            # generate a tailored resume for a job post
│   ├── GET    /:id
│   ├── PUT    /:id                 # manually adjust selections
│   ├── DELETE /:id
│
└── /match
    └── POST   /analyze             # compare profile against a job post, return match score + gaps
```

---

## Key Design Decisions

1. **Bullets as separate rows** -- Allows granular include/exclude per tailored resume without duplicating text. Users can toggle individual accomplishments on or off for each application.

2. **Tailored resume tables reference master profile via FK** -- Changes to the master profile can optionally propagate. The `tailored_*` tables store overrides only when the user customizes wording for a specific application.

3. **Job post skill extraction** -- Skills are parsed out of the job description (via LLM) and stored in `job_post_skills` to enable automated matching against the user's `skills` table.

4. **Match score** -- Computed by comparing `job_post_skills` + requirements against the user's profile. Stored on the tailored resume for quick display in listings.

5. **Application tracking built in** -- The `status` field on `job_posts` lets users track where they are in the pipeline without needing a separate tool.
