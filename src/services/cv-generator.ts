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
import { generateTargetedCV } from "./ai/candidate-agent.js";
import { reviewCVAsATS } from "./ai/ats-agent.js";
import { reviewCVAsRecruiter } from "./ai/recruiter-agent.js";

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
  // Step 1: Call Candidate Agent to generate initial CV
  const cv = await generateTargetedCV(profile, jobPost, {
    language,
    truthfulnessMode: "strict",
  });

  // Step 2: Call ATS Agent to review the generated CV
  const atsReview = await reviewCVAsATS(jobPost, cv);

  // Step 3: Call Recruiter Agent to review the generated CV
  const recruiterReview = await reviewCVAsRecruiter(jobPost, cv);

  // Build ReviewAgreement
  const cvGenerationOk = true;
  const atsOk = atsReview.passed;
  const recruiterOk = recruiterReview.passed;
  const reviewAgreementOk = cvGenerationOk && atsOk && recruiterOk;

  const rejectionReasons: string[] = [];
  if (!atsOk) {
    rejectionReasons.push(
      `ATS review failed (score: ${atsReview.score}). ${atsReview.recommendations.join("; ")}`
    );
  }
  if (!recruiterOk) {
    rejectionReasons.push(
      `Recruiter review failed (score: ${recruiterReview.score}). ${recruiterReview.recommendations.join("; ")}`
    );
  }

  let finalStatus: "FINAL_APPROVED" | "REJECTED" | "NEEDS_REVISION";
  if (reviewAgreementOk) {
    finalStatus = "FINAL_APPROVED";
  } else {
    finalStatus = "NEEDS_REVISION";
  }

  const reviewAgreement: ReviewAgreement = {
    id: `ra_${randomUUID().slice(0, 8)}`,
    jobPostId: jobPost.id,
    cvId: cv.id,
    cvGenerationOk,
    atsOk,
    recruiterOk,
    reviewAgreementOk,
    finalStatus,
    rejectionReasons,
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
