import OpenAI from "openai";
import type { ProfileData } from "../../schemas/profile.js";
import type { ConfidenceMap, ConfidenceEntry } from "../../schemas/extraction-result.js";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Cannot perform AI extraction.",
    );
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export interface ExtractionOutput {
  data: ProfileData;
  confidence: ConfidenceMap;
}

const SYSTEM_PROMPT = `You are a resume data extraction engine. Given raw text from a PDF resume, extract structured profile data and confidence scores.

Return a JSON object with exactly two top-level keys: "data" and "confidence".

## "data" shape (ProfileData)

{
  "identity": {
    "name": string (required),
    "headline": string (required — job title or professional headline),
    "email": string (required),
    "phone": string (optional),
    "location": string (optional),
    "links": { "linkedin": string?, "portfolio": string?, "github": string? } (optional)
  },
  "targetRoles": string[] (roles the candidate is targeting — infer from headline/summary if not explicit),
  "professionalSummaryMaster": string (optional — professional summary or objective),
  "experiences": [
    {
      "experienceId": string (generate as "exp_01", "exp_02", ...),
      "title": string,
      "company": string,
      "location": string (optional),
      "startDate": string (ISO partial: "YYYY-MM" or "YYYY"),
      "endDate": string (optional, "YYYY-MM" or "YYYY", omit if current),
      "description": string (optional),
      "achievements": [{ "text": string, "metric": string?, "proofLevel": string? }],
      "skillsUsed": string[]
    }
  ],
  "education": [
    { "school": string, "degree": string, "field": string?, "year": number? }
  ],
  "skills": [
    { "name": string, "category": string?, "level": string?, "years": number?, "evidenceRefs": string[]? }
  ],
  "certifications": [{ "name": string, "issuer": string?, "date": string? }] (optional),
  "languages": [{ "name": string, "level": string? }] (optional),
  "projects": [{ "name": string, "description": string?, "url": string?, "technologies": string[]? }] (optional),
  "references": [{ "name": string, "title": string?, "company": string?, "email": string?, "phone": string?, "relationship": string? }] (optional),
  "constraints": { "preferredCvLanguage": string?, "maxCvPages": number?, "mustNotClaim": string[]? } (optional)
}

## "confidence" shape (ConfidenceMap)

For each section in ProfileData, provide a confidence entry:
- Scalar sections (identity, targetRoles, professionalSummaryMaster, constraints): a single { "score": 0.0-1.0, "source": "extracted"|"inferred"|"missing" }
- Array sections (experiences, education, skills, certifications, languages, projects, references): a Record keyed by item identifier (e.g. "exp_01", skill name, school name) where each value is { "score": 0.0-1.0, "source": "extracted"|"inferred"|"missing" }

source meanings:
- "extracted": data was directly found in the resume text
- "inferred": data was reasonably inferred from context
- "missing": section had no data in the resume

Rules:
- Only extract what is actually present or strongly inferable from the text.
- Do not invent or fabricate data. If a section is empty, use empty arrays.
- Use "YYYY-MM" format for dates when month is available, "YYYY" otherwise.
- Generate sequential experienceId values: exp_01, exp_02, etc.
- For skills, try to categorize them (e.g. "Programming Languages", "Frameworks", "Tools").
- If the resume language is not English, still extract in the original language.`;

export async function extractProfileFromText(
  text: string,
): Promise<ExtractionOutput> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract structured profile data from the following resume text:\n\n${text}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  let parsed: { data: ProfileData; confidence: ConfidenceMap };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse OpenAI response as JSON: ${content.slice(0, 200)}`);
  }

  if (!parsed.data || !parsed.confidence) {
    throw new Error(
      'OpenAI response missing required "data" or "confidence" keys',
    );
  }

  // Ensure required fields have defaults
  const data = parsed.data;
  if (!data.identity) {
    data.identity = { name: "", headline: "", email: "" };
  }
  if (!data.targetRoles) data.targetRoles = [];
  if (!data.experiences) data.experiences = [];
  if (!data.education) data.education = [];
  if (!data.skills) data.skills = [];

  return { data, confidence: parsed.confidence };
}
