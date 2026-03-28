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

const SYSTEM_PROMPT = `You are an Applicant Tracking System (ATS) evaluation agent. Your job is to score a generated CV against a target job posting for machine/ATS compatibility.

## EVALUATION CRITERIA

### 1. Keyword Presence (50% of score)
- Check every keyword, tool, and language from the job post against the CV content.
- Exact matches score highest; close synonyms score partially.
- List all matched and missing keywords.

### 2. Hard Filter Coverage (30% of score)
- Evaluate each must-have requirement as a hard filter.
- For each filter, determine: pass (clearly met), fail (not addressed), or unknown (ambiguous).
- Common hard filters: years of experience, required degrees, specific certifications, mandatory skills.
- Provide evidence for each status (quote from CV or note absence).

### 3. Structure & Formatting (20% of score)
- Check for clear job titles (not vague like "Various roles").
- Check for consistent date formats.
- Check for quantified achievements (numbers, percentages, metrics).
- Check for proper section organization.
- Flag any formatting issues that could trip up ATS parsers.

## SCORING
- Calculate a final score from 0-100 based on the weighted criteria.
- Score formula: (keyword_score * 0.5) + (hard_filter_score * 0.3) + (structure_score * 0.2)
- Each sub-score should be 0-100 before weighting.
- Thresholds: 0-49 = low match, 50-74 = partial match, 75-100 = strong match (pass).

## OUTPUT FORMAT (JSON)
Return a JSON object with these exact keys:

{
  "score": number (0-100, the weighted final score),
  "hardFiltersStatus": [
    {
      "filter": string (the requirement being checked),
      "status": "pass" | "fail" | "unknown",
      "evidence": string (quote from CV or explanation of absence)
    }
  ],
  "matchedKeywords": string[] (job keywords found in the CV),
  "missingKeywords": string[] (job keywords NOT found in the CV),
  "formatFlags": string[] (any formatting/structure issues found, empty if none),
  "recommendations": string[] (specific, actionable suggestions to improve the ATS score)
}

## RULES
- Be strict but fair. Only mark a keyword as matched if it genuinely appears in the CV content.
- For hard filters, require clear evidence. "5+ years of Python" needs to be demonstrable from the experience dates and skills.
- formatFlags should only contain real issues, not nitpicks.
- recommendations should be specific and actionable (e.g., "Add 'Docker' to skills section" not "Improve keywords").
- Do NOT inflate scores. A CV missing critical requirements should score low.`;

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
      `- Experience ${exp.experienceId}:\n${exp.rewrittenBullets.map((b) => `  • ${b}`).join("\n")}`,
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
