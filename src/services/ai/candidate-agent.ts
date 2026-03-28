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

const SYSTEM_PROMPT = `Tu es l'agent Candidat.
Genere un CV cible, tres synthetique, uniquement a partir du profil fourni.
N'invente rien.
Tous les textes doivent etre en francais.
Resume: 2 phrases max.
Chaque experience: 3 bullets max, phrases tres courtes.
omittedItems, generationNotes, warnings: 3 elements max.
Si une preuve manque, laisse l'element de cote.
Retourne uniquement un JSON valide avec exactement les cles demandees.`;

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
${ats.hardFiltersStatus.map((h) => `- ${h.filter}: ${h.status} â€” ${h.evidence}`).join("\n")}

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

  const userPrompt = `Profil:
${JSON.stringify(profile.data)}

Offre:
${JSON.stringify({
  title: jobPost.title,
  company: jobPost.company,
  seniority: jobPost.seniority,
  location: jobPost.location,
  remoteMode: jobPost.remoteMode,
  employmentType: jobPost.employmentType,
  jobSummary: jobPost.jobSummary,
  responsibilities: jobPost.responsibilities,
  requirementsMustHave: jobPost.requirementsMustHave,
  requirementsNiceToHave: jobPost.requirementsNiceToHave,
  keywords: jobPost.keywords,
  tools: jobPost.tools,
  languages: jobPost.languages,
  yearsExperienceMin: jobPost.yearsExperienceMin ?? null,
})}

Regles:
${JSON.stringify({
  language,
  maxPages: maxPages ?? null,
  tone: tone ?? "professional",
  truthfulnessMode: truthfulnessMode ?? "strict",
})}
${revisionSection ? `\n\nRevision:\n${revisionSection}` : ""}

Retourne le JSON maintenant.`;

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
