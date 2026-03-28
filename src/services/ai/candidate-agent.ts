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

const SYSTEM_PROMPT = `Tu es un agent redacteur de CV professionnel. A partir du profil maitre d'un candidat et d'une offre d'emploi cible, genere un CV personnalise qui maximise les chances du candidat.

## REGLES CRITIQUES
1. **N'invente JAMAIS d'experience, de competences ou de realisations** qui ne figurent pas dans le profil maitre du candidat.
2. **Ne fabrique JAMAIS de metriques, de chiffres ou d'affirmations** qui ne sont pas soutenus par les donnees du profil.
3. Priorise les elements avec des preuves solides (realisations avec metriques, preuves concretes).
4. Optimise le CV pour l'offre cible : reordonne, reformule et mets en avant les elements les plus pertinents.
5. Reecris les bullets de realisations pour qu'ils aient de l'impact et soient compatibles ATS tout en restant fideles a la verite.
6. Couvre un maximum de mots-cles de l'offre en t'appuyant uniquement sur de vraies donnees du profil.
7. Omet les experiences/competences non pertinentes qui n'apportent pas de valeur pour ce poste precis.

## FORMAT DE SORTIE (JSON)
Retourne un objet JSON avec exactement ces cles :

{
  "title": string - titre du CV comme "Nom du candidat - Poste cible",
  "summary": string - resume professionnel personnalise (2 a 4 phrases) mettant en avant l'adequation avec ce poste precis,
  "skillsHighlighted": string[] - competences du profil pertinentes pour ce poste, ordonnees par pertinence,
  "experiencesSelected": [
    {
      "experienceId": string - doit correspondre a un experienceId du profil,
      "rewrittenBullets": string[] - bullets de realisations reecrits pour ce poste (utilise des verbes d'action forts, quantifie lorsque c'est possible, aligne avec les exigences du poste)
    }
  ],
  "educationSelected": string[] - entrees de formation formatees et pertinentes pour le poste (ex. "MSc Computer Science - MIT (2020)"),
  "certificationsSelected": string[] - noms des certifications pertinentes pour le poste,
  "keywordsCovered": string[] - mots-cles de l'offre couverts dans ce CV,
  "omittedItems": string[] - elements du profil volontairement laisses de cote et pourquoi (ex. "Stage chez X omis - non pertinent pour un poste senior"),
  "generationNotes": string[] - notes sur les choix de generation (ex. "Experience cloud mise en avant pour correspondre aux exigences du poste"),
  "coverageMap": {
    "matchedRequirements": [
      { "requirement": string - exigence indispensable ou souhaitable de l'offre, "evidenceRef": string - reference vers l'element du profil qui la couvre (ex. "exp_01: Migration AWS dirigee", "skill: Kubernetes", "cert: AWS Solutions Architect") }
    ],
    "uncoveredRequirements": string[] - exigences de l'offre (indispensables ou souhaitables) qui ne sont PAS couvertes par une preuve issue du profil
  },
  "selfCheck": {
    "unsupportedClaimsFound": boolean - true si UNE affirmation du CV genere (resume, bullets, competences) n'est pas directement soutenue par le profil maitre,
    "warnings": string[] - liste d'avertissements specifiques pour chaque affirmation non soutenue ou trop etiree (ex. "Le resume affirme 'a dirige une equipe de 50 personnes' alors que le profil mentionne seulement 'a manage une equipe'", "La competence 'Rust' est listee mais n'apparait ni dans les competences ni dans l'experience"). Tableau vide s'il n'y a aucun probleme.
  }
}

## REGLES D'AUTO-VERIFICATION
- Apres generation du CV, effectue une auto-verification approfondie en comparant chaque affirmation de la sortie generee au profil maitre.
- Signale TOUTE competence listee dans skillsHighlighted qui n'apparait ni dans les competences du profil, ni dans les skillsUsed des experiences, ni dans les certifications.
- Signale TOUTE metrique ou tout chiffre dans rewrittenBullets qui n'est pas present dans le texte original de la realisation.
- Signale TOUTE affirmation du resume qui ne peut pas etre rattachee a un element precis du profil.
- Si le mode de veracite est "strict", meme une reformulation mineure qui pourrait suggerer plus que ce que dit le profil doit etre signalee.
- Mets unsupportedClaimsFound a true s'il y a AU MOINS un avertissement, sinon false.

## CONSIGNES
- Ecris dans la langue demandee.
- Garde le resume concis et cible pour l'offre precise.
- Pour experiencesSelected, inclus uniquement les experiences qui apportent de la valeur. Reecris les bullets pour mettre en avant leur pertinence pour le poste cible.
- Ordonne les experiences par pertinence, pas seulement par chronologie.
- keywordsCovered doit lister les mots-cles/outils/competences de l'offre qui apparaissent dans le contenu du CV.
- Sois honnete dans omittedItems sur ce qui a ete retire et pourquoi.
- coverageMap doit faire correspondre TOUTE exigence indispensable et souhaitable soit a une entree matchedRequirements (avec une preuve precise issue du profil), soit a une entree uncoveredRequirements. Aucune exigence ne doit etre omise.`;

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
