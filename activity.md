# DreamJob Activity Log

## Session Log

### 2026-03-28
- **POST /api/resume/upload Endpoint**: Created src/routes/resume.ts as a Fastify plugin implementing POST /api/resume/upload. Accepts multipart/form-data with a single file field, validates that the file is PDF (mimetype check) and under 10MB, saves to data/uploads/resume.pdf (overwriting if exists). Registered route in src/server.ts. Verified: non-multipart request returns 400 with descriptive error, non-PDF file returns 400, valid PDF upload returns 200 with originalFilename and storagePath, file is persisted to data/uploads/.

### 2026-03-28
- **PUT /api/profile Endpoint**: Added PUT /api/profile to src/routes/profile.ts. Validates request body against ProfileSchema (TypeBox), sets updatedAt to current ISO-8601 timestamp, writes to data/profile.json via store service, returns 200 with updated profile. Invalid bodies return 400 with descriptive errors from Fastify validation. Verified: valid PUT returns 200 with updated timestamp, invalid PUT (missing required fields) returns 400, subsequent GET returns persisted data.

### 2026-03-28
- **GET /api/profile Endpoint**: Created src/routes/profile.ts as a Fastify plugin implementing GET /api/profile. Reads data/profile.json via store service, returns 200 with profile data or 404 if no profile exists. Registered route in src/server.ts. Verified: returns 404 with `{"error":"No profile found"}` when no profile.json exists, returns 200 with full profile data after seeding.

### 2026-03-28
- **ReviewAgreement TypeBox Schema**: Created src/schemas/review-agreement.ts defining FinalStatusSchema (union enum: FINAL_APPROVED/REJECTED/NEEDS_REVISION) and ReviewAgreementSchema with id, jobPostId, cvId, cvGenerationOk, atsOk, recruiterOk, reviewAgreementOk booleans, finalStatus, rejectionReasons array, and iterationCount integer. Exported static TypeScript types FinalStatus and ReviewAgreement. Verified: tsc --noEmit passes, schema validates valid data (true), missing fields (false), invalid finalStatus (false), REJECTED with reasons (true), and NEEDS_REVISION (true).

### 2026-03-28
- **RecruiterReview TypeBox Schema**: Created src/schemas/recruiter-review.ts defining RecruiterReviewSchema with id, cvId, jobPostId, score (0-100), passed boolean, sub-scores (readabilityScore, credibilityScore, coherenceScore, evidenceScore — all 0-100), and arrays for strengths, concerns, recommendations. Exported static TypeScript type RecruiterReview. Verified: tsc --noEmit passes, schema validates valid data (true), missing fields (false), out-of-range score (false), and out-of-range sub-score (false).

### 2026-03-28
- **ATSReview TypeBox Schema**: Created src/schemas/ats-review.ts defining HardFilterStatusSchema (filter, status enum: pass/fail/unknown, evidence) and full ATSReviewSchema with id, cvId, jobPostId, score (0-100), passed boolean, hardFiltersStatus array, matchedKeywords array, missingKeywords array, formatFlags array, recommendations array. Exported static TypeScript types HardFilterStatus and ATSReview. Verified: tsc --noEmit passes, schema validates valid data (true), missing fields (false), and out-of-range score (false).

### 2026-03-28
- **GeneratedCV TypeBox Schema**: Created src/schemas/generated-cv.ts defining CvHeaderSchema (fullName, headline, contact object, optional links), ExperienceSelectedSchema (experienceId, rewrittenBullets array), and full GeneratedCVSchema with id, profileId, jobPostId, version, language, title, header, summary, skillsHighlighted array, experiencesSelected array, educationSelected array, certificationsSelected array, keywordsCovered array, omittedItems array, generationNotes array. Exported static TypeScript types CvHeader, ExperienceSelected, and GeneratedCV. Verified: tsc --noEmit passes, schema validates valid data (true) and missing fields (false).

### 2026-03-28
- **JobPost (Normalized) TypeBox Schema**: Created src/schemas/job-post.ts defining JobPostSchema with id, jobOfferRawId, title, company, description, url, salary (optional), location, remoteMode (enum: onsite/hybrid/remote), employmentType (enum: full_time/part_time/contract/internship), seniority (enum: entry/mid/senior/lead/executive), jobSummary (string), array fields (responsibilities, requirementsMustHave, requirementsNiceToHave, keywords, tools, languages), and optional fields (yearsExperienceMin, postedDate). Exported static TypeScript type JobPost and enum types. Verified: tsc --noEmit passes, schema validates valid data (true), valid without optionals (true), invalid remoteMode (false), and missing fields (false).

### 2026-03-28
- **JobOfferRaw TypeBox Schema**: Created src/schemas/job-offer-raw.ts defining JobOfferRawSchema with id, source, sourceUrl, capturedAt, htmlSnapshotRef (optional), rawText, and rawFields object (title, company, location, employment_type, salary, description, requirements, posted_date — all optional). Exported static TypeScript type JobOfferRaw. Verified: tsc --noEmit passes, schema validates valid data (true), valid with optional htmlSnapshotRef (true), and invalid/missing fields (false).

### 2026-03-28
- **ExtractionResult TypeBox Schema**: Created src/schemas/extraction-result.ts defining ConfidenceEntry (score 0-1, source enum: extracted/inferred/missing), ConfidenceMap (mirrors ProfileData sections with ConfidenceEntry leaves, Record-based for array sections), ReviewStatus (per-section boolean tracking with Record-based for array sections), CompletionStatus (markedComplete boolean, markedCompleteAt nullable string), and full ExtractionResult (id, resumeUploadId, extractedAt, rawText, data as ProfileData, confidence, reviewStatus, completionStatus). Exported all static TypeScript types. Verified: tsc --noEmit passes, schema validates valid data (true), missing fields (false), and out-of-range confidence score (false).

### 2026-03-28
- **ResumeUpload TypeBox Schema**: Created src/schemas/resume-upload.ts defining ResumeUploadSchema with id, originalFilename, storagePath, uploadedAt, status (union enum: uploaded/extracting/extracted/confirmed/failed), and optional error. Exported static TypeScript type ResumeUpload. Verified: tsc --noEmit passes, schema validates valid/invalid sample data correctly.

### 2026-03-28
- **Full Profile Schema Composition**: Composed ProfileDataSchema wrapping all sub-schemas (identity, targetRoles, professionalSummaryMaster, experiences, education, skills, certifications, languages, projects, references, constraints) and ProfileSchema with id, data, createdAt, updatedAt. Exported static TypeScript types ProfileData and Profile. Verified: tsc --noEmit passes, schema validates complete sample profile (valid returns true, invalid returns false).

### 2026-03-28
- **Supporting Profile TypeBox Schemas**: Added Education (school, degree, field, year), Skill (name, category, level, years, evidenceRefs), Certification (name, issuer, date), Language (name, level), Project (name, description, url, technologies), and Reference (name, title, company, email, phone, relationship) schemas with static TypeScript types to src/schemas/profile.ts. Verified: tsc --noEmit passes, all schemas produce correct JSON Schema output with proper required/optional fields.

### 2026-03-28
- **Experience TypeBox Schema**: Added Achievement sub-schema (text, metric, proofLevel) and Experience schema (experienceId, title, company, location, startDate, endDate, description, achievements array, skillsUsed array) to src/schemas/profile.ts. Verified: tsc --noEmit passes, schema validates sample data correctly (valid returns true, invalid returns false).

### 2026-03-28
- **Profile Core Identity TypeBox Schemas**: Created src/schemas/profile.ts defining TypeBox schemas and static TypeScript types for Identity (name, headline, email, phone, location, links with linkedin/portfolio/github), Constraints (preferredCvLanguage, maxCvPages, mustNotClaim), TargetRoles (string array), and ProfessionalSummaryMaster (string). Verified: tsc --noEmit passes, all schemas produce correct JSON Schema output.

### 2026-03-28
- **File Path Constants**: Created src/services/paths.ts defining constants for all data file paths (profile.json, resume-upload.json, extraction.json, jobs-raw.json, jobs.json, cvs.json, ats-reviews.json, recruiter-reviews.json, review-agreements.json) and UPLOADS_DIR. All paths use path.join relative to process.cwd()/data/. Verified: tsc --noEmit passes.

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
