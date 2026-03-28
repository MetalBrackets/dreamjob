import { randomUUID } from "node:crypto";
import { chatCompletionJSON } from "./openai.js";
import type { Profile } from "../../schemas/profile.js";
import type { JobPost } from "../../schemas/job-post.js";
import type { GeneratedCV } from "../../schemas/generated-cv.js";
import type { ATSReview } from "../../schemas/ats-review.js";
import type { RecruiterReview } from "../../schemas/recruiter-review.js";

export interface GenerationRules {
  language: string;
  maxPages?: number;
  tone?: string;
  truthfulnessMode?: "strict" | "flexible";
}

export interface RevisionContext {
  previousAtsReview?: ATSReview;
  previousRecruiterReview?: RecruiterReview;
}

interface CandidateAgentOutput {
  title: string;
  summary: string;
  skillsHighlighted: string[];
  experiencesSelected: Array<{
    experienceId: string;
    rewrittenBullets: string[];
  }>;
  educationSelected: string[];
  certificationsSelected: string[];
  keywordsCovered: string[];
  omittedItems: string[];
  generationNotes: string[];
  coverageMap: {
    matchedRequirements: Array<{ requirement: string; evidenceRef: string }>;
    uncoveredRequirements: string[];
  };
  selfCheck: {
    unsupportedClaimsFound: boolean;
    warnings: string[];
  };
}

const SYSTEM_PROMPT = `You are a professional CV writer agent. Given a candidate's master profile and a target job posting, generate a tailored CV that maximizes the candidate's chances.

## CRITICAL RULES
1. **NEVER invent experience, skills, or achievements** that are not present in the candidate's master profile.
2. **NEVER fabricate metrics, numbers, or claims** not supported by the profile data.
3. Prioritize items with strong evidence (achievements with metrics, concrete proof).
4. Optimize the CV for the target job: reorder, rephrase, and highlight the most relevant items.
5. Rewrite achievement bullets to be impactful and ATS-friendly while staying truthful.
6. Cover as many job keywords as possible using real profile data.
7. Omit irrelevant experiences/skills that don't add value for this specific role.

## OUTPUT FORMAT (JSON)
Return a JSON object with these exact keys:

{
  "title": string — CV title like "Candidate Name - Target Role",
  "summary": string — a tailored professional summary (2-4 sentences) highlighting fit for this specific role,
  "skillsHighlighted": string[] — skills from the profile relevant to this job, ordered by relevance,
  "experiencesSelected": [
    {
      "experienceId": string — must match an experienceId from the profile,
      "rewrittenBullets": string[] — achievement bullets rewritten for this job (use strong action verbs, quantify where possible, align with job requirements)
    }
  ],
  "educationSelected": string[] — formatted education entries relevant to the role (e.g. "MSc Computer Science - MIT (2020)"),
  "certificationsSelected": string[] — certification names relevant to the role,
  "keywordsCovered": string[] — job keywords that are addressed in this CV,
  "omittedItems": string[] — profile items intentionally left out and why (e.g. "Omitted internship at X — not relevant to senior role"),
  "generationNotes": string[] — notes about generation decisions (e.g. "Emphasized cloud experience to match job requirements"),
  "coverageMap": {
    "matchedRequirements": [
      { "requirement": string — a must-have or nice-to-have requirement from the job post, "evidenceRef": string — reference to the profile item that covers it (e.g. "exp_01: Led migration to AWS", "skill: Kubernetes", "cert: AWS Solutions Architect") }
    ],
    "uncoveredRequirements": string[] — job requirements (must-have or nice-to-have) that are NOT addressed by any profile evidence
  },
  "selfCheck": {
    "unsupportedClaimsFound": boolean — true if ANY claim in the generated CV (summary, bullets, skills) is not directly backed by evidence in the master profile,
    "warnings": string[] — list of specific warnings for each unsupported or stretched claim found (e.g. "Summary claims 'led a team of 50' but profile only mentions 'managed a team'", "Skill 'Rust' listed but not present in profile skills or experience"). Empty array if no issues found.
  }
}

## SELF-CHECK RULES
- After generating the CV, perform a thorough self-check by comparing every claim in the generated output against the master profile.
- Flag ANY skill listed in skillsHighlighted that does not appear in the profile's skills, experience skillsUsed, or certifications.
- Flag ANY metric or number in rewrittenBullets that is not present in the original achievement text.
- Flag ANY claim in the summary that cannot be traced back to a specific profile item.
- If truthfulness mode is "strict", even minor rephrasing that could imply more than what the profile states should be flagged.
- Set unsupportedClaimsFound to true if there are ANY warnings, false otherwise.

## GUIDELINES
- Write in the specified language.
- Keep the summary concise and targeted to the specific job.
- For experiencesSelected, only include experiences that add value. Rewrite bullets to emphasize relevance to the target role.
- Order experiences by relevance, not just chronology.
- keywordsCovered should list job keywords/tools/skills that appear in the CV content.
- Be honest in omittedItems about what was left out and why.
- coverageMap must map EVERY must-have and nice-to-have requirement to either a matchedRequirements entry (with specific profile evidence) or an uncoveredRequirements entry. No requirement should be left unaccounted for.`;

export async function generateTargetedCV(
  profile: Profile,
  jobPost: JobPost,
  rules: GenerationRules,
  revisionContext?: RevisionContext,
): Promise<GeneratedCV> {
  const { language, maxPages, tone, truthfulnessMode } = rules;

  let revisionSection = "";
  if (revisionContext) {
    const parts: string[] = [];

    if (revisionContext.previousAtsReview) {
      const ats = revisionContext.previousAtsReview;
      parts.push(`### Previous ATS Review (Score: ${ats.score}/100, Passed: ${ats.passed})
Hard Filters:
${ats.hardFiltersStatus.map((h) => `- ${h.filter}: ${h.status} — ${h.evidence}`).join("\n")}

Missing Keywords: ${ats.missingKeywords.join(", ") || "none"}
Format Flags: ${ats.formatFlags.join(", ") || "none"}
Recommendations:
${ats.recommendations.map((r) => `- ${r}`).join("\n")}`);
    }

    if (revisionContext.previousRecruiterReview) {
      const rec = revisionContext.previousRecruiterReview;
      parts.push(`### Previous Recruiter Review (Score: ${rec.score}/100, Passed: ${rec.passed})
Sub-scores: Readability ${rec.readabilityScore}, Credibility ${rec.credibilityScore}, Coherence ${rec.coherenceScore}, Evidence ${rec.evidenceScore}

Concerns:
${rec.concerns.map((c) => `- ${c}`).join("\n")}

Recommendations:
${rec.recommendations.map((r) => `- ${r}`).join("\n")}`);
    }

    if (parts.length > 0) {
      revisionSection = `

## REVISION CONTEXT
This is a revision attempt. The previous CV was reviewed and did NOT pass. You MUST address the specific feedback below. Focus on fixing the blocking issues while maintaining truthfulness.

${parts.join("\n\n")}

**IMPORTANT**: Address each recommendation and concern listed above. Incorporate missing keywords where truthfully possible. Fix any format flags. Do NOT ignore this feedback.`;
    }
  }

  const userPrompt = `## CANDIDATE MASTER PROFILE
${JSON.stringify(profile.data, null, 2)}

## TARGET JOB POSTING
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
Tools: ${jobPost.tools.join(", ")}
Languages: ${jobPost.languages.join(", ")}
${jobPost.yearsExperienceMin ? `Minimum Years Experience: ${jobPost.yearsExperienceMin}` : ""}

## GENERATION RULES
- Language: ${language}
- Max pages: ${maxPages ?? "no limit"}
- Tone: ${tone ?? "professional"}
- Truthfulness mode: ${truthfulnessMode ?? "strict"} (strict = never stretch the truth, flexible = allow minor rephrasing for impact)
${revisionSection}

Generate the tailored CV now.`;

  const output = await chatCompletionJSON<CandidateAgentOutput>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.4,
  });

  const cvId = `cv_${randomUUID().slice(0, 8)}`;
  const identity = profile.data.identity;

  const cv: GeneratedCV = {
    id: cvId,
    profileId: profile.id,
    jobPostId: jobPost.id,
    version: 1,
    language,
    title: output.title || `${identity.name} - ${jobPost.title}`,
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
    summary: output.summary || "",
    skillsHighlighted: output.skillsHighlighted || [],
    experiencesSelected: output.experiencesSelected || [],
    educationSelected: output.educationSelected || [],
    certificationsSelected: output.certificationsSelected || [],
    keywordsCovered: output.keywordsCovered || [],
    omittedItems: output.omittedItems || [],
    generationNotes: output.generationNotes || [],
    coverageMap: output.coverageMap ?? {
      matchedRequirements: [],
      uncoveredRequirements: [],
    },
    selfCheck: output.selfCheck ?? {
      unsupportedClaimsFound: false,
      warnings: [],
    },
  };

  return cv;
}
