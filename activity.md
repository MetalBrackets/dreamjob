# DreamJob Activity Log

## Session Log

### 2026-03-28
- **POST /api/cvs/generate Endpoint**: Created src/routes/cvs.ts as a Fastify plugin implementing POST /api/cvs/generate. Accepts JSON body with jobPostId and language (required). Loads Profile from data/profile.json and finds JobPost by id in data/jobs.json. Returns 400 if required fields missing, 404 if profile or job post not found. Calls cv-generator orchestrator service (src/services/cv-generator.ts) which generates scaffold GeneratedCV, ATSReview, RecruiterReview, and ReviewAgreement artifacts and stores them in data/cvs.json, data/ats-reviews.json, data/recruiter-reviews.json, and data/review-agreements.json respectively. Returns 200 with all four artifacts. Registered route in src/server.ts. Verified: missing fields returns 400, missing profile returns 404, missing job returns 404, valid request returns 200 with correct CV/review structure, all artifacts persisted to JSON files, tsc --noEmit passes.

### 2026-03-28
- **Job Normalization Service via OpenAI**: Rewrote src/services/normalize.ts to use OpenAI GPT-4o for intelligent job post normalization. The normalizeJobOffer(raw) function now sends raw text and structured fields to OpenAI with a detailed system prompt to extract all JobPost fields (title, company, description, location, remoteMode, employmentType, seniority, jobSummary, responsibilities, requirementsMustHave, requirementsNiceToHave, keywords, tools, languages, yearsExperienceMin, postedDate). Validates enum values with fallbacks. Falls back to basic field mapping when OPENAI_API_KEY is not set (graceful degradation). Uses lazy OpenAI client initialization matching the pattern in ai/openai.ts. Verified: POST /api/jobs/raw returns 201 with correctly structured normalized job post, fallback works without API key, all fields populated from rawFields, tsc --noEmit passes.

### 2026-03-28
- **DELETE /api/jobs/:id Endpoint**: Added DELETE /api/jobs/:id to src/routes/jobs.ts. Finds the job by id in data/jobs.json, removes it from the collection, writes back. Returns 204 on success, 404 with `{"error":"Job post not found"}` if not found. Verified: DELETE /api/jobs/job_01 returns 204 and job no longer appears in GET /api/jobs, DELETE /api/jobs/job_99 returns 404, tsc --noEmit passes.

### 2026-03-28
- **PUT /api/jobs/:id Endpoint**: Added PUT /api/jobs/:id to src/routes/jobs.ts. Accepts JSON body with partial JobPost fields, finds the job by id in data/jobs.json, merges updates (preserving the original id), writes back to collection. Returns 200 with the updated job post, or 404 with `{"error":"Job post not found"}` if not found. Verified: PUT /api/jobs/job_01 with updated title/company returns 200 with merged fields, PUT /api/jobs/job_99 returns 404, persistence confirmed via subsequent GET, tsc --noEmit passes.

### 2026-03-28
- **GET /api/jobs and GET /api/jobs/:id Endpoints**: Added two GET endpoints to src/routes/jobs.ts for normalized job posts. GET /api/jobs reads data/jobs.json via readCollection and returns the full array. GET /api/jobs/:id finds a specific normalized job post by id in the collection, returns 200 with the item or 404 with `{"error":"Job post not found"}` if not found. Verified: GET /api/jobs returns populated array with existing normalized jobs, GET /api/jobs/job_01 returns correct entry with 200, GET /api/jobs/job_99 returns 404, tsc --noEmit passes.

### 2026-03-28
- **GET /api/jobs/raw and GET /api/jobs/raw/:id Endpoints**: Added two GET endpoints to src/routes/jobs.ts. GET /api/jobs/raw reads data/jobs-raw.json via readCollection and returns the full array. GET /api/jobs/raw/:id finds a specific raw job offer by id in the collection, returns 200 with the item or 404 with `{"error":"Raw job offer not found"}` if not found. Verified: GET /api/jobs/raw returns empty array when no data, returns populated array after POST, GET /api/jobs/raw/raw_01 returns correct entry, GET /api/jobs/raw/raw_99 returns 404, tsc --noEmit passes.

### 2026-03-28
- **POST /api/jobs/raw Endpoint**: Created src/routes/jobs.ts as a Fastify plugin implementing POST /api/jobs/raw. Accepts JSON body with source, sourceUrl, rawText (required), and optional rawFields/htmlSnapshotRef. Assigns auto-generated sequential IDs (raw_01, raw_02...), sets capturedAt to current ISO-8601 timestamp, appends to data/jobs-raw.json collection. Auto-triggers normalization via new src/services/normalize.ts which maps raw fields to a JobPost (job_01, job_02...) and appends to data/jobs.json. Returns 201 with both the created JobOfferRaw and normalized JobPost. Returns 400 if required fields are missing. Registered route in src/server.ts. Verified: valid POST returns 201 with correct raw and normalized entries, sequential IDs increment correctly, missing fields return 400, tsc --noEmit passes.

### 2026-03-28
- **Completeness Scoring Pure Function Verification**: Verified src/services/completeness.ts implements all required functionality: (1) progress calculation (reviewed/total * 100), (2) strengthScore with exact point allocation (identity 15, 1+ exp 15, 2+ exp 25, exp with 2+ achievements 5 each max 15, 1+ education 10, 5+ skills 10, 10+ skills 15, certifications 5, projects 5, languages 5, summary 5), (3) missingSections listing sections with no data, (4) unresolvedSections listing sections with unreviewed items, (5) checklist array with label/met pairs, (6) canMarkComplete logic (identity + all experiences + all education + all skills reviewed). Verified: empty profile returns 0 progress, 0 strength, canMarkComplete false, 11 missing sections; complete profile with all reviewed returns 100 progress, 120 strength, canMarkComplete true, no missing/unresolved sections; tsc --noEmit passes.

### 2026-03-28
- **Extraction Post-Processing (ID assignment, review status init, date normalization)**: Updated src/services/extraction-pipeline.ts to call AI extraction (extractProfileFromText) after PDF text extraction, then apply three post-processing steps: (1) assignExperienceIds — overwrites experience IDs with sequential exp_01, exp_02, ... format, (2) normalizeDates — converts date strings (e.g., "January 2020", "01/2020", "2020-01-15") to ISO partial format (YYYY-MM or YYYY) for experiences and certifications, (3) initReviewStatus — initializes all reviewStatus entries to false for every section and item (scalar sections like identity get a boolean false, array sections like experiences/skills get a Record keyed by ID/name with false values). Falls back to empty scaffold if AI extraction fails (e.g., missing API key). Verified: module loads correctly, tsc --noEmit passes, server starts without errors, all post-processing functions present and integrated into pipeline.

### 2026-03-28
- **AI Structured Extraction (extractProfileFromText)**: Created src/services/ai/openai.ts implementing extractProfileFromText(text) which sends resume text to OpenAI GPT-4o with JSON mode, using a detailed system prompt that maps output to the exact ProfileData and ConfidenceMap schemas. Returns { data: ProfileData, confidence: ConfidenceMap }. Uses lazy client initialization so the module loads without OPENAI_API_KEY (throws descriptive error only when called). Handles API errors: missing API key throws "OPENAI_API_KEY is not set", empty response throws "OpenAI returned an empty response", malformed JSON throws parse error, missing keys throws descriptive error. Ensures required ProfileData fields have defaults (empty identity, empty arrays). Verified: function exports correctly, missing API key throws correct error, tsc --noEmit passes.

### 2026-03-28
- **PDF Text Extraction Service**: Created src/services/extraction.ts implementing extractTextFromPDF(filePath) which reads a PDF file, validates it's non-empty, uses pdf-parse to extract plain text, and validates text is non-empty. Handles errors gracefully: empty PDFs throw "PDF file is empty (0 bytes)", corrupt/invalid PDFs throw "Failed to parse PDF: <reason>", and empty-text PDFs throw "PDF contains no extractable text". Updated src/services/extraction-pipeline.ts to use the new dedicated extraction function instead of inline pdf-parse calls. Verified: valid PDF extracts text correctly, empty PDF throws descriptive error, corrupt PDF throws descriptive error, missing file throws ENOENT, tsc --noEmit passes, upload endpoint still works end-to-end.

### 2026-03-28
- **GET /api/resume/completeness Endpoint**: Added GET /api/resume/completeness to src/routes/resume.ts and created src/services/completeness.ts with pure function computeCompleteness(). Reads data/extraction.json, computes progress (reviewed/total items * 100), strengthScore (point-based: identity 15, 1+ exp 15, 2+ exp 25, exp with 2+ achievements 5 each max 15, 1+ education 10, 5+ skills 10, 10+ skills 15, certifications 5, projects 5, languages 5, summary 5), missingSections (sections with no data), unresolvedSections (sections with unreviewed items), checklist (label/met pairs), and canMarkComplete (identity + all experiences + all education + all skills reviewed). Returns 200 with computed result, 404 if no extraction exists. Verified: returns 404 when no extraction.json, returns correct 0% progress with all unreviewed, returns 100% progress and canMarkComplete true after marking all reviewed, tsc --noEmit passes.

### 2026-03-28
- **PUT /api/resume/extraction/review Endpoint**: Added PUT /api/resume/extraction/review to src/routes/resume.ts. Accepts JSON body with section (string, required), itemId (string, optional for array sections), and reviewed (boolean, required). Reads data/extraction.json, updates the matching reviewStatus entry — scalar sections (identity, targetRoles, professionalSummaryMaster, constraints) set directly, array sections (experiences, education, skills, certifications, languages, projects, references) require itemId to identify the item. Returns 200 with updated reviewStatus, 404 if no extraction exists, 400 if section/item not found or missing required fields. Verified: returns 404 when no extraction.json, marks identity as reviewed (scalar), marks experience exp_01 as reviewed (array), rejects unknown sections, rejects missing itemId for array sections, persistence confirmed via GET, tsc --noEmit passes.

### 2026-03-28
- **POST /api/resume/extraction/confirm Endpoint**: Added POST /api/resume/extraction/confirm to src/routes/resume.ts. Reads data/extraction.json, copies ExtractionResult.data into data/profile.json as a new Profile document (with generated id, createdAt, updatedAt). Updates resume-upload.json status to 'confirmed'. Returns 200 with the new Profile, 404 if no extraction exists, 409 if already confirmed. Verified: returns 404 when no extraction.json, returns 200 with correct Profile after confirm, GET /api/profile returns the confirmed data, re-confirm returns 409, resume status shows 'confirmed', tsc --noEmit passes.

### 2026-03-28
- **GET /api/resume/extraction Endpoint**: Added GET /api/resume/extraction to src/routes/resume.ts. Reads data/extraction.json via store service, returns 200 with the full ExtractionResult document (extracted data, confidence map, review status), or 404 if no extraction exists. Verified: returns 404 with `{"error":"No extraction exists"}` when no extraction.json exists, returns 200 with correct ExtractionResult after upload+extraction, tsc --noEmit passes.

### 2026-03-28
- **GET /api/resume/status Endpoint**: Added GET /api/resume/status to src/routes/resume.ts. Reads data/resume-upload.json via store service, returns 200 with the full ResumeUpload document (id, originalFilename, storagePath, uploadedAt, status, and error if any), or 404 if no resume has been uploaded. Verified: returns 404 with `{"error":"No resume has been uploaded"}` when no resume-upload.json exists, returns 200 with correct document after upload, shows error field when extraction failed, tsc --noEmit passes.

### 2026-03-28
- **Extraction Pipeline Trigger in POST /api/resume/upload**: Created src/services/extraction-pipeline.ts implementing runExtractionPipeline() which reads the uploaded PDF via pdf-parse, extracts raw text, builds a scaffold ExtractionResult (with empty ProfileData, empty confidence/reviewStatus, and completionStatus), persists to data/extraction.json, and updates resume-upload.json status through uploaded→extracting→extracted transitions. Updated src/routes/resume.ts to call the pipeline after file save: on success returns { id, status: 'extracted', extractedData }, on failure updates status to 'failed' with error message and returns 500. Added src/pdf-parse.d.ts type declarations. Verified: valid PDF upload returns 200 with extracted rawText and scaffold data, corrupt PDF returns 500 with status 'failed' and error, resume-upload.json and extraction.json persist correctly, tsc --noEmit passes.

### 2026-03-28
- **ResumeUpload Document Management**: Updated src/routes/resume.ts to create/update a ResumeUpload document in data/resume-upload.json after each file upload. Generates a UUID id, records originalFilename, storagePath, uploadedAt (ISO-8601), and sets status to 'uploaded'. The response now returns the full ResumeUpload document instead of a plain message. Re-uploads overwrite the previous document. Verified: upload creates resume-upload.json with correct fields and status 'uploaded', re-upload overwrites with new id and filename, tsc --noEmit passes.

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
