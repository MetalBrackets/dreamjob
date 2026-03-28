import type { FastifyInstance } from "fastify";
import type { JobOfferRaw } from "../schemas/job-offer-raw.js";
import type { JobPost } from "../schemas/job-post.js";
import { readCollection, writeCollection } from "../services/store.js";
import { JOBS_RAW_PATH, JOBS_PATH } from "../services/paths.js";
import { normalizeJobOffer } from "../services/normalize.js";

export async function jobsRoutes(app: FastifyInstance) {
  app.post("/api/jobs/raw", async (request, reply) => {
    const body = request.body as {
      source: string;
      sourceUrl: string;
      rawText: string;
      htmlSnapshotRef?: string;
      rawFields?: Record<string, string | undefined>;
    };

    if (!body || !body.source || !body.sourceUrl || !body.rawText) {
      return reply.code(400).send({
        error:
          "Missing required fields: source, sourceUrl, and rawText are required",
      });
    }

    const existing = await readCollection<JobOfferRaw>(JOBS_RAW_PATH);
    const nextNum = existing.length + 1;
    const id = `raw_${String(nextNum).padStart(2, "0")}`;

    const rawEntry: JobOfferRaw = {
      id,
      source: body.source,
      sourceUrl: body.sourceUrl,
      capturedAt: new Date().toISOString(),
      htmlSnapshotRef: body.htmlSnapshotRef,
      rawText: body.rawText,
      rawFields: body.rawFields ?? {},
    };

    existing.push(rawEntry);
    await writeCollection(JOBS_RAW_PATH, existing);

    const normalizedJob = await normalizeJobOffer(rawEntry);

    return reply.code(201).send({
      raw: rawEntry,
      normalized: normalizedJob,
    });
  });

  app.get("/api/jobs", async (_request, reply) => {
    const collection = await readCollection<JobPost>(JOBS_PATH);
    return reply.send(collection);
  });

  app.get("/api/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const collection = await readCollection<JobPost>(JOBS_PATH);
    const item = collection.find((entry) => entry.id === id);
    if (!item) {
      return reply.code(404).send({ error: "Job post not found" });
    }
    return reply.send(item);
  });

  app.put("/api/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const collection = await readCollection<JobPost>(JOBS_PATH);
    const index = collection.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return reply.code(404).send({ error: "Job post not found" });
    }
    const updates = request.body as Partial<JobPost>;
    collection[index] = { ...collection[index], ...updates, id };
    await writeCollection(JOBS_PATH, collection);
    return reply.send(collection[index]);
  });

  app.delete("/api/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const collection = await readCollection<JobPost>(JOBS_PATH);
    const index = collection.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return reply.code(404).send({ error: "Job post not found" });
    }
    collection.splice(index, 1);
    await writeCollection(JOBS_PATH, collection);
    return reply.code(204).send();
  });

  app.get("/api/jobs/raw", async (_request, reply) => {
    const collection = await readCollection<JobOfferRaw>(JOBS_RAW_PATH);
    return reply.send(collection);
  });

  app.get("/api/jobs/raw/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const collection = await readCollection<JobOfferRaw>(JOBS_RAW_PATH);
    const item = collection.find((entry) => entry.id === id);
    if (!item) {
      return reply.code(404).send({ error: "Raw job offer not found" });
    }
    return reply.send(item);
  });
}
