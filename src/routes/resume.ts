import type { FastifyInstance } from "fastify";
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { UPLOADS_DIR } from "../services/paths.js";

export async function resumeRoutes(app: FastifyInstance) {
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

    return reply.code(200).send({
      message: "Resume uploaded successfully",
      originalFilename: data.filename,
      storagePath: savePath,
    });
  });
}
