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

const SYSTEM_PROMPT = `Tu es l'agent Recruteur.
Analyse le CV comme un recruteur humain.
Concentre-toi sur 4 points: lisibilite, credibilite, coherence, preuve.
Sois direct et tres synthetique.
strengths, concerns et recommendations: 3 elements max.
Chaque phrase doit etre courte, concrete et en francais.
N'ajoute aucune explication hors schema.
Retourne uniquement un JSON valide avec exactement les cles demandees.`;

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
      `- Experience ${exp.experienceId}:\n${exp.rewrittenBullets.map((b) => `  â€¢ ${b}`).join("\n")}`,
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
