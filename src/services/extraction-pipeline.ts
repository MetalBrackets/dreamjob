import { randomUUID } from "node:crypto";
import type { ExtractionResult } from "../schemas/extraction-result.js";
import type { ProfileData } from "../schemas/profile.js";
import { writeJSON } from "./store.js";
import { EXTRACTION_PATH, RESUME_UPLOAD_PATH } from "./paths.js";
import type { ResumeUpload } from "../schemas/resume-upload.js";
import { extractTextFromPDF } from "./extraction.js";

/**
 * Run the extraction pipeline: read PDF, extract text, build an ExtractionResult,
 * persist it, and update resume-upload status.
 */
export async function runExtractionPipeline(
  resumeUpload: ResumeUpload,
): Promise<ExtractionResult> {
  // Update status to extracting
  const extracting: ResumeUpload = { ...resumeUpload, status: "extracting" };
  await writeJSON<ResumeUpload>(RESUME_UPLOAD_PATH, extracting);

  // Extract text from PDF
  const rawText = await extractTextFromPDF(resumeUpload.storagePath);

  // Build empty profile data scaffold — AI parsing will populate this in a later step
  const data: ProfileData = {
    identity: { name: "", headline: "", email: "" },
    targetRoles: [],
    experiences: [],
    education: [],
    skills: [],
  };

  const result: ExtractionResult = {
    id: randomUUID(),
    resumeUploadId: resumeUpload.id,
    extractedAt: new Date().toISOString(),
    rawText,
    data,
    confidence: {},
    reviewStatus: {},
    completionStatus: {
      markedComplete: false,
      markedCompleteAt: null,
    },
  };

  // Persist extraction result
  await writeJSON<ExtractionResult>(EXTRACTION_PATH, result);

  // Update resume-upload status to extracted
  const extracted: ResumeUpload = { ...resumeUpload, status: "extracted" };
  await writeJSON<ResumeUpload>(RESUME_UPLOAD_PATH, extracted);

  return result;
}
