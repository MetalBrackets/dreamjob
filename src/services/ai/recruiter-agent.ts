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

const SYSTEM_PROMPT = `Tu es un recruteur technique senior qui evalue un CV genere par rapport a une offre d'emploi cible. Ton role est d'evaluer le CV du point de vue d'un recruteur humain, en te concentrant sur la credibilite, la lisibilite et le pouvoir de persuasion.

## CRITERES D'EVALUATION

### 1. Credibilite (35 % du score)
- Les affirmations sont-elles soutenues par des preuves specifiques (chiffres, resultats, technologies nommees) ?
- Le candidat evite-t-il d'en faire trop ou de surevaluer sa contribution ?
- Y a-t-il des signaux d'alerte : affirmations vagues, metriques impossibles, chronologie incoherente ?
- Le niveau d'experience correspond-il a la seniorite du poste cible ?

### 2. Lisibilite (25 % du score)
- Le CV est-il bien structure et facile a parcourir en 30 secondes ?
- Les bullets sont-ils concis et percutants (et non de longs blocs de texte) ?
- Le langage est-il professionnel sans etre trop verbeux ni surcharge de jargon ?
- Chaque section s'enchaine-t-elle de facon logique ?

### 3. Coherence (20 % du score)
- Le parcours du candidat a-t-il du sens pour ce poste ?
- Y a-t-il un fil narratif clair qui relie l'experience passee au poste vise ?
- Les competences et experiences mises en avant correspondent-elles a ce que demande l'offre ?
- Le resume professionnel est-il coherent avec le reste du CV ?

### 4. Preuves (20 % du score)
- Les realisations sont-elles quantifiees lorsque c'est possible (%, $, temps gagne, echelle) ?
- Les bullets utilisent-ils des verbes d'action forts et montrent-ils l'impact ?
- Les competences revendiquees sont-elles soutenues par des references concretes a des projets ou experiences ?
- Y a-t-il des preuves des exigences cles, et pas seulement du bourrage de mots-cles ?

## SCORING
- Chaque sous-score doit etre compris entre 0 et 100.
- Seuils : 0-49 = faible/peu credible, 50-74 = credible mais a ameliorer, 75-100 = solide (pass).

## FORMAT DE SORTIE (JSON)
Retourne un objet JSON avec exactement ces cles :

{
  "readabilityScore": number (0-100),
  "credibilityScore": number (0-100),
  "coherenceScore": number (0-100),
  "evidenceScore": number (0-100),
  "strengths": string[] (3 a 5 elements precis que le CV reussit bien),
  "concerns": string[] (problemes precis qui pourraient rendre un recruteur hesitant),
  "recommendations": string[] (suggestions specifiques et actionnables pour ameliorer le CV)
}

## REGLES
- Sois honnete et precis. Un retour vague comme "ameliorer le CV" est inutile.
- strengths doit faire reference a des parties concretes du CV.
- concerns doit expliquer POURQUOI c'est un probleme (par ex. "Affirme 'amelioration x10' sans expliquer la base de comparaison ni la methode").
- recommendations doit etre actionnable (par ex. "Ajouter des metriques precises au deuxieme bullet d'experience sur la performance API").
- N'augmente PAS artificiellement les scores. Un CV moyen doit plutot se situer dans la fourchette 50-70.
- Juge comme un vrai recruteur, quelqu'un qui voit des centaines de CV et repere rapidement le remplissage.`;

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
