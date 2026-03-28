import type { FastifyInstance } from "fastify";
import type { Profile } from "../schemas/profile.js";
import type { JobPost } from "../schemas/job-post.js";
import { readJSON, readCollection } from "../services/store.js";
import { PROFILE_PATH, JOBS_PATH } from "../services/paths.js";
import { orchestrate } from "../services/cv-generator.js";

export async function cvsRoutes(app: FastifyInstance) {
  app.post("/api/cvs/generate", async (request, reply) => {
    const body = request.body as { jobPostId?: string; language?: string };

    if (!body || !body.jobPostId || !body.language) {
      return reply.code(400).send({
        error: "Missing required fields: jobPostId and language are required",
      });
    }

    const profile = await readJSON<Profile>(PROFILE_PATH);
    if (!profile) {
      return reply.code(404).send({ error: "No profile found" });
    }

    const jobs = await readCollection<JobPost>(JOBS_PATH);
    const jobPost = jobs.find((j) => j.id === body.jobPostId);
    if (!jobPost) {
      return reply.code(404).send({ error: "Job post not found" });
    }

    const result = await orchestrate(profile, jobPost, body.language!);

    return reply.code(200).send(result);
  });
}
