import { randomUUID } from "node:crypto";
import { chatCompletionJSON } from "./openai.js";
import type { JobPost } from "../../schemas/job-post.js";
import type { GeneratedCV } from "../../schemas/generated-cv.js";
import type { RecruiterReview } from "../../schemas/recruiter-review.js";

export interface RecruiterScoringRules {
  passingScore?: number;
  weightReadability?: number;
  weightCredibility?: number;
  weightCoherence?: number;
  weightEvidence?: number;
}

const DEFAULT_SCORING_RULES: Required<RecruiterScoringRules> = {
  passingScore: 75,
  weightReadability: 0.25,
  weightCredibility: 0.35,
  weightCoherence: 0.2,
  weightEvidence: 0.2,
};

interface RecruiterAgentOutput {
  readabilityScore: number;
  credibilityScore: number;
  coherenceScore: number;
  evidenceScore: number;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

const SYSTEM_PROMPT = `You are a senior technical recruiter evaluating a generated CV against a target job posting. Your job is to assess the CV from a human recruiter's perspective — focusing on credibility, readability, and persuasiveness.

## EVALUATION CRITERIA

### 1. Credibility (35% of score)
- Are claims backed by specific evidence (numbers, outcomes, named technologies)?
- Does the candidate avoid over-promising or inflating their contributions?
- Are there any red flags: vague claims, impossible metrics, inconsistent timelines?
- Does the experience level match the seniority of the target role?

### 2. Readability (25% of score)
- Is the CV well-organized and easy to scan in 30 seconds?
- Are bullet points concise and impactful (not walls of text)?
- Is language professional without being overly verbose or jargon-heavy?
- Does each section flow logically?

### 3. Coherence (20% of score)
- Does the candidate's career trajectory make sense for this role?
- Is there a clear narrative connecting past experience to the target position?
- Do the highlighted skills and experiences align with what the job requires?
- Is the professional summary consistent with the rest of the CV?

### 4. Evidence (20% of score)
- Are achievements quantified where possible (%, $, time saved, scale)?
- Do bullet points use strong action verbs and show impact?
- Are skills claims supported by concrete project/experience references?
- Is there proof of the key requirements, not just keyword-stuffing?

## SCORING
- Each sub-score should be 0-100.
- Thresholds: 0-49 = low credibility/weak, 50-74 = credible but needs improvement, 75-100 = strong (pass).

## OUTPUT FORMAT (JSON)
Return a JSON object with these exact keys:

{
  "readabilityScore": number (0-100),
  "credibilityScore": number (0-100),
  "coherenceScore": number (0-100),
  "evidenceScore": number (0-100),
  "strengths": string[] (3-5 specific things the CV does well),
  "concerns": string[] (specific issues that would make a recruiter hesitant),
  "recommendations": string[] (specific, actionable suggestions to improve the CV)
}

## RULES
- Be honest and specific. Vague feedback like "improve the CV" is useless.
- Strengths should reference specific parts of the CV.
- Concerns should explain WHY something is a problem (e.g., "Claims '10x improvement' without explaining the baseline or methodology").
- Recommendations should be actionable (e.g., "Add specific metrics to the second experience bullet about API performance").
- Do NOT inflate scores. A mediocre CV should score in the 50-70 range.
- Judge as a real recruiter would — someone who sees hundreds of CVs and can spot filler quickly.`;

export async function reviewCVAsRecruiter(
  jobPost: JobPost,
  cv: GeneratedCV,
  scoringRules?: RecruiterScoringRules,
): Promise<RecruiterReview> {
  const rules = { ...DEFAULT_SCORING_RULES, ...scoringRules };

  const userPrompt = `## TARGET JOB POSTING
Title: ${jobPost.title}
Company: ${jobPost.company}
Seniority: ${jobPost.seniority}
Location: ${jobPost.location} (${jobPost.remoteMode})
Employment: ${jobPost.employmentType}

Job Summary: ${jobPost.jobSummary}

Responsibilities:
${jobPost.responsibilities.map((r) => `- ${r}`).join("\n")}

Must-Have Requirements:
${jobPost.requirementsMustHave.map((r) => `- ${r}`).join("\n")}

Nice-to-Have Requirements:
${jobPost.requirementsNiceToHave.map((r) => `- ${r}`).join("\n")}

Keywords: ${jobPost.keywords.join(", ")}

## GENERATED CV TO REVIEW
Title: ${cv.title}
Summary: ${cv.summary}

Skills Highlighted: ${cv.skillsHighlighted.join(", ")}

Experiences:
${cv.experiencesSelected
  .map(
    (exp) =>
      `- Experience ${exp.experienceId}:\n${exp.rewrittenBullets.map((b) => `  • ${b}`).join("\n")}`,
  )
  .join("\n")}

Education: ${cv.educationSelected.join("; ")}
Certifications: ${cv.certificationsSelected.join("; ")}
Keywords Covered: ${cv.keywordsCovered.join(", ")}

## SCORING RULES
- Passing score: ${rules.passingScore}
- Weights: Credibility ${rules.weightCredibility * 100}%, Readability ${rules.weightReadability * 100}%, Coherence ${rules.weightCoherence * 100}%, Evidence ${rules.weightEvidence * 100}%

Evaluate this CV from a recruiter's perspective now.`;

  const output = await chatCompletionJSON<RecruiterAgentOutput>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
  });

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n ?? 0)));

  const readabilityScore = clamp(output.readabilityScore);
  const credibilityScore = clamp(output.credibilityScore);
  const coherenceScore = clamp(output.coherenceScore);
  const evidenceScore = clamp(output.evidenceScore);

  const score = clamp(
    credibilityScore * rules.weightCredibility +
      readabilityScore * rules.weightReadability +
      coherenceScore * rules.weightCoherence +
      evidenceScore * rules.weightEvidence,
  );

  const passed = score >= rules.passingScore;

  return {
    id: `rec_${randomUUID().slice(0, 8)}`,
    cvId: cv.id,
    jobPostId: jobPost.id,
    score,
    passed,
    readabilityScore,
    credibilityScore,
    coherenceScore,
    evidenceScore,
    strengths: output.strengths || [],
    concerns: output.concerns || [],
    recommendations: output.recommendations || [],
  };
}
