import type { JobOfferRaw } from "../schemas/job-offer-raw.js";
import type { JobPost } from "../schemas/job-post.js";
import { readCollection, writeCollection } from "./store.js";
import { JOBS_PATH } from "./paths.js";

export async function normalizeJobOffer(raw: JobOfferRaw): Promise<JobPost> {
  const existing = await readCollection<JobPost>(JOBS_PATH);
  const nextNum = existing.length + 1;
  const id = `job_${String(nextNum).padStart(2, "0")}`;

  const rf = raw.rawFields;

  const jobPost: JobPost = {
    id,
    jobOfferRawId: raw.id,
    title: rf.title ?? "Untitled",
    company: rf.company ?? "Unknown",
    description: rf.description ?? raw.rawText,
    url: raw.sourceUrl,
    salary: rf.salary,
    location: rf.location ?? "Unknown",
    remoteMode: "onsite",
    employmentType: inferEmploymentType(rf.employment_type),
    seniority: "mid",
    jobSummary: rf.description ?? raw.rawText.slice(0, 500),
    responsibilities: [],
    requirementsMustHave: rf.requirements ? [rf.requirements] : [],
    requirementsNiceToHave: [],
    keywords: [],
    tools: [],
    languages: [],
    postedDate: rf.posted_date,
  };

  existing.push(jobPost);
  await writeCollection(JOBS_PATH, existing);

  return jobPost;
}

function inferEmploymentType(
  value: string | undefined,
): "full_time" | "part_time" | "contract" | "internship" {
  if (!value) return "full_time";
  const v = value.toLowerCase().replace(/[\s-]/g, "_");
  if (v.includes("part_time") || v.includes("part")) return "part_time";
  if (v.includes("contract")) return "contract";
  if (v.includes("internship") || v.includes("intern")) return "internship";
  return "full_time";
}
