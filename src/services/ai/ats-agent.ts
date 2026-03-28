import { randomUUID } from "node:crypto";
import { chatCompletionJSON } from "./openai.js";
import type { JobPost } from "../../schemas/job-post.js";
import type { GeneratedCV } from "../../schemas/generated-cv.js";
import type { ATSReview } from "../../schemas/ats-review.js";

export interface ATSScoringRules {
  passingScore?: number;
  weightKeywords?: number;
  weightHardFilters?: number;
  weightStructure?: number;
}

const DEFAULT_SCORING_RULES: Required<ATSScoringRules> = {
  passingScore: 75,
  weightKeywords: 0.5,
  weightHardFilters: 0.3,
  weightStructure: 0.2,
};

interface ATSAgentOutput {
  score: number;
  hardFiltersStatus: Array<{
    filter: string;
    status: "pass" | "fail" | "unknown";
    evidence: string;
  }>;
  matchedKeywords: string[];
  missingKeywords: string[];
  formatFlags: string[];
  recommendations: string[];
}

const SYSTEM_PROMPT = `Tu es l'agent ATS.
Analyse le CV par rapport a l'offre.
Concentre-toi sur 3 points: mots-cles, filtres bloquants, structure.
Sois strict, rapide et synthetique.
Toutes les phrases doivent etre tres courtes, en francais.
formatFlags et recommendations: 3 elements max.
L'evidence doit etre breve.
Retourne uniquement un JSON valide avec exactement les cles demandees.`;

export async function reviewCVAsATS(
  jobPost: JobPost,
  cv: GeneratedCV,
  scoringRules?: ATSScoringRules,
): Promise<ATSReview> {
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
Tools: ${jobPost.tools.join(", ")}
Languages: ${jobPost.languages.join(", ")}
${jobPost.yearsExperienceMin ? `Minimum Years Experience: ${jobPost.yearsExperienceMin}` : ""}

## GENERATED CV TO REVIEW
Title: ${cv.title}
Summary: ${cv.summary}

Skills Highlighted: ${cv.skillsHighlighted.join(", ")}

Experiences:
${cv.experiencesSelected
  .map(
    (exp) =>
      `- Experience ${exp.experienceId}:\n${exp.rewrittenBullets.map((b) => `  â€¢ ${b}`).join("\n")}`,
  )
  .join("\n")}

Education: ${cv.educationSelected.join("; ")}
Certifications: ${cv.certificationsSelected.join("; ")}
Keywords Covered: ${cv.keywordsCovered.join(", ")}

## SCORING RULES
- Passing score: ${rules.passingScore}
- Weight: Keywords ${rules.weightKeywords * 100}%, Hard Filters ${rules.weightHardFilters * 100}%, Structure ${rules.weightStructure * 100}%

Evaluate this CV against the job posting now.`;

  const output = await chatCompletionJSON<ATSAgentOutput>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
  });

  const score = Math.max(0, Math.min(100, Math.round(output.score ?? 0)));
  const passed = score >= rules.passingScore;

  return {
    id: `ats_${randomUUID().slice(0, 8)}`,
    cvId: cv.id,
    jobPostId: jobPost.id,
    score,
    passed,
    hardFiltersStatus: output.hardFiltersStatus || [],
    matchedKeywords: output.matchedKeywords || [],
    missingKeywords: output.missingKeywords || [],
    formatFlags: output.formatFlags || [],
    recommendations: output.recommendations || [],
  };
}
