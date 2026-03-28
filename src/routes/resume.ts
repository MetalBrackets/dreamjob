import type { FastifyInstance } from "fastify";
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { UPLOADS_DIR, RESUME_UPLOAD_PATH, EXTRACTION_PATH } from "../services/paths.js";
import { readJSON, writeJSON } from "../services/store.js";
import type { ResumeUpload } from "../schemas/resume-upload.js";
import type { ExtractionResult } from "../schemas/extraction-result.js";
import { runExtractionPipeline } from "../services/extraction-pipeline.js";

export async function resumeRoutes(app: FastifyInstance) {
  app.get("/api/resume/extraction", async (_request, reply) => {
    const extraction = await readJSON<ExtractionResult>(EXTRACTION_PATH);
    if (!extraction) {
      return reply.code(404).send({ error: "No extraction exists" });
    }
    return reply.code(200).send(extraction);
  });

  app.get("/api/resume/status", async (_request, reply) => {
    const resumeUpload = await readJSON<ResumeUpload>(RESUME_UPLOAD_PATH);
    if (!resumeUpload) {
      return reply.code(404).send({ error: "No resume has been uploaded" });
    }
    return reply.code(200).send(resumeUpload);
  });

  app.post("/api/resume/upload", async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.code(400).send({ error: "Request must be multipart/form-data" });
    }

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    if (data.mimetype !== "application/pdf") {
      return reply.code(400).send({ error: "Only PDF files are accepted" });
    }

    const buffer = await data.toBuffer();

    if (buffer.length > 10 * 1024 * 1024) {
      return reply.code(400).send({ error: "File size exceeds 10MB limit" });
    }

    await mkdir(UPLOADS_DIR, { recursive: true });
    const savePath = join(UPLOADS_DIR, "resume.pdf");
    await writeFile(savePath, buffer);

    const resumeUpload: ResumeUpload = {
      id: randomUUID(),
      originalFilename: data.filename,
      storagePath: savePath,
      uploadedAt: new Date().toISOString(),
      status: "uploaded",
    };

    await writeJSON<ResumeUpload>(RESUME_UPLOAD_PATH, resumeUpload);

    // Trigger extraction pipeline
    try {
      const extractionResult = await runExtractionPipeline(resumeUpload);
      return reply.code(200).send({
        id: resumeUpload.id,
        status: "extracted",
        extractedData: extractionResult,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Extraction failed";
      const failed: ResumeUpload = { ...resumeUpload, status: "failed", error: errorMessage };
      await writeJSON<ResumeUpload>(RESUME_UPLOAD_PATH, failed);
      return reply.code(500).send({
        id: resumeUpload.id,
        status: "failed",
        error: errorMessage,
      });
    }
  });
}
