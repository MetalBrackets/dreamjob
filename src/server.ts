import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ensureDataDirs } from "./ensure-dirs.js";
import { profileRoutes } from "./routes/profile.js";

const PORT = Number(process.env.PORT) || 3000;

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: "http://localhost:5173",
});

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});

await ensureDataDirs();

await app.register(profileRoutes);

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
