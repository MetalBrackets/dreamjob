import { randomUUID } from "node:crypto";
import { chatCompletionJSON } from "./openai.js";
import type { Profile } from "../../schemas/profile.js";
import type { JobPost } from "../../schemas/job-post.js";
import type { GeneratedCV } from "../../schemas/generated-cv.js";

export interface GenerationRules {
  language: string;
  maxPages?: number;
  tone?: string;
  truthfulnessMode?: "strict" | "flexible";
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
  "generationNotes": string[] — notes about generation decisions (e.g. "Emphasized cloud experience to match job requirements")
}

## GUIDELINES
- Write in the specified language.
- Keep the summary concise and targeted to the specific job.
- For experiencesSelected, only include experiences that add value. Rewrite bullets to emphasize relevance to the target role.
- Order experiences by relevance, not just chronology.
- keywordsCovered should list job keywords/tools/skills that appear in the CV content.
- Be honest in omittedItems about what was left out and why.`;

export async function generateTargetedCV(
  profile: Profile,
  jobPost: JobPost,
  rules: GenerationRules,
): Promise<GeneratedCV> {
  const { language, maxPages, tone, truthfulnessMode } = rules;

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
  };

  return cv;
}
