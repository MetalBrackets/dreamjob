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

const SYSTEM_PROMPT = `Tu es un agent d'evaluation ATS (Applicant Tracking System). Ton role est de noter un CV genere par rapport a une offre d'emploi cible selon sa compatibilite machine/ATS.

## CRITERES D'EVALUATION

### 1. Presence des mots-cles (50 % du score)
- Verifie chaque mot-cle, outil et langue de l'offre par rapport au contenu du CV.
- Les correspondances exactes valent le plus de points ; les synonymes proches valent partiellement.
- Liste tous les mots-cles trouves et manquants.

### 2. Couverture des filtres bloquants (30 % du score)
- Evalue chaque exigence indispensable comme un filtre bloquant.
- Pour chaque filtre, determine : pass (clairement rempli), fail (non traite) ou unknown (ambigu).
- Exemples courants de filtres bloquants : nombre d'annees d'experience, diplomes requis, certifications specifiques, competences obligatoires.
- Donne une preuve pour chaque statut (citation du CV ou mention de l'absence).

### 3. Structure et formatage (20 % du score)
- Verifie que les intitules de poste sont clairs (pas vagues comme "Divers postes").
- Verifie la coherence des formats de date.
- Verifie la presence de realisations quantifiees (chiffres, pourcentages, metriques).
- Verifie la bonne organisation des sections.
- Signale les problemes de formatage susceptibles de perturber les parseurs ATS.

## SCORING
- Calcule un score final de 0 a 100 a partir des criteres ponderes.
- Formule du score : (keyword_score * 0.5) + (hard_filter_score * 0.3) + (structure_score * 0.2)
- Chaque sous-score doit etre sur 100 avant ponderation.
- Seuils : 0-49 = faible correspondance, 50-74 = correspondance partielle, 75-100 = forte correspondance (pass).

## FORMAT DE SORTIE (JSON)
Retourne un objet JSON avec exactement ces cles :

{
  "score": number (0-100, score final pondere),
  "hardFiltersStatus": [
    {
      "filter": string (exigence en cours de verification),
      "status": "pass" | "fail" | "unknown",
      "evidence": string (citation du CV ou explication de l'absence)
    }
  ],
  "matchedKeywords": string[] (mots-cles de l'offre trouves dans le CV),
  "missingKeywords": string[] (mots-cles de l'offre NON trouves dans le CV),
  "formatFlags": string[] (problemes de structure/format trouves, tableau vide s'il n'y en a pas),
  "recommendations": string[] (suggestions specifiques et actionnables pour ameliorer le score ATS)
}

## REGLES
- Sois strict mais juste. Ne marque un mot-cle comme trouve que s'il apparait reellement dans le contenu du CV.
- Pour les filtres bloquants, exige une preuve claire. "5+ ans de Python" doit pouvoir se deduire des dates d'experience et des competences.
- formatFlags ne doit contenir que de vrais problemes, pas des details insignifiants.
- recommendations doit etre specifique et actionnable (par ex. "Ajouter 'Docker' dans la section competences" et non "Ameliorer les mots-cles").
- N'augmente PAS artificiellement les scores. Un CV auquel il manque des exigences critiques doit obtenir un score bas.`;

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
