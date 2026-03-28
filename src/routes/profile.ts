import type { FastifyInstance } from "fastify";
import { readJSON } from "../services/store.js";
import { PROFILE_PATH } from "../services/paths.js";
import type { Profile } from "../schemas/profile.js";

export async function profileRoutes(app: FastifyInstance) {
  app.get("/api/profile", async (_request, reply) => {
    const profile = await readJSON<Profile>(PROFILE_PATH);
    if (!profile) {
      return reply.code(404).send({ error: "No profile found" });
    }
    return reply.send(profile);
  });
}
