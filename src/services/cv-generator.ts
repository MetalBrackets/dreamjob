import { randomUUID } from "node:crypto";
import type { Profile } from "../schemas/profile.js";
import type { JobPost } from "../schemas/job-post.js";
import type { GeneratedCV } from "../schemas/generated-cv.js";
import type { ATSReview } from "../schemas/ats-review.js";
import type { RecruiterReview } from "../schemas/recruiter-review.js";
import type { ReviewAgreement } from "../schemas/review-agreement.js";
import { readCollection, writeCollection } from "./store.js";
import {
  CVS_PATH,
  ATS_REVIEWS_PATH,
  RECRUITER_REVIEWS_PATH,
  REVIEW_AGREEMENTS_PATH,
} from "./paths.js";

export interface OrchestratorResult {
  cv: GeneratedCV;
  atsReview: ATSReview;
  recruiterReview: RecruiterReview;
  reviewAgreement: ReviewAgreement;
}

export async function orchestrate(
  profile: Profile,
  jobPost: JobPost,
  language: string
): Promise<OrchestratorResult> {
  const cvId = `cv_${randomUUID().slice(0, 8)}`;
  const identity = profile.data.identity;

  const cv: GeneratedCV = {
    id: cvId,
    profileId: profile.id,
    jobPostId: jobPost.id,
    version: 1,
    language,
    title: `${identity.name} - ${jobPost.title}`,
    header: {
      fullName: identity.name,
      headline: identity.headline,
      contact: {
        email: identity.email,
        phone: identity.phone,
        location: identity.location,
      },
      links: identity.links,
    },
    summary: profile.data.professionalSummaryMaster || "",
    skillsHighlighted: profile.data.skills.map((s) => s.name),
    experiencesSelected: profile.data.experiences.map((exp) => ({
      experienceId: exp.experienceId,
      rewrittenBullets: exp.achievements.map((a) => a.text),
    })),
    educationSelected: profile.data.education.map(
      (e) => `${e.degree} in ${e.field} - ${e.school}`
    ),
    certificationsSelected: (profile.data.certifications || []).map((c) => c.name),
    keywordsCovered: jobPost.keywords || [],
    omittedItems: [],
    generationNotes: [
      "Scaffold generation — AI agents not yet connected",
    ],
  };

  const atsReview: ATSReview = {
    id: `ats_${randomUUID().slice(0, 8)}`,
    cvId,
    jobPostId: jobPost.id,
    score: 0,
    passed: false,
    hardFiltersStatus: [],
    matchedKeywords: [],
    missingKeywords: [],
    formatFlags: [],
    recommendations: [
      "AI ATS agent not yet connected — placeholder review",
    ],
  };

  const recruiterReview: RecruiterReview = {
    id: `rec_${randomUUID().slice(0, 8)}`,
    cvId,
    jobPostId: jobPost.id,
    score: 0,
    passed: false,
    readabilityScore: 0,
    credibilityScore: 0,
    coherenceScore: 0,
    evidenceScore: 0,
    strengths: [],
    concerns: [],
    recommendations: [
      "AI Recruiter agent not yet connected — placeholder review",
    ],
  };

  const reviewAgreement: ReviewAgreement = {
    id: `ra_${randomUUID().slice(0, 8)}`,
    jobPostId: jobPost.id,
    cvId,
    cvGenerationOk: true,
    atsOk: atsReview.passed,
    recruiterOk: recruiterReview.passed,
    reviewAgreementOk: false,
    finalStatus: "NEEDS_REVISION",
    rejectionReasons: [
      "AI agents not yet connected — scaffold only",
    ],
    iterationCount: 1,
  };

  // Store all artifacts
  const cvs = await readCollection<GeneratedCV>(CVS_PATH);
  cvs.push(cv);
  await writeCollection(CVS_PATH, cvs);

  const atsReviews = await readCollection<ATSReview>(ATS_REVIEWS_PATH);
  atsReviews.push(atsReview);
  await writeCollection(ATS_REVIEWS_PATH, atsReviews);

  const recruiterReviews = await readCollection<RecruiterReview>(
    RECRUITER_REVIEWS_PATH
  );
  recruiterReviews.push(recruiterReview);
  await writeCollection(RECRUITER_REVIEWS_PATH, recruiterReviews);

  const agreements = await readCollection<ReviewAgreement>(
    REVIEW_AGREEMENTS_PATH
  );
  agreements.push(reviewAgreement);
  await writeCollection(REVIEW_AGREEMENTS_PATH, agreements);

  return { cv, atsReview, recruiterReview, reviewAgreement };
}
