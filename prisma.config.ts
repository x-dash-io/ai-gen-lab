import "dotenv/config";
import { defineConfig } from "prisma/config";

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? DEFAULT_DATABASE_URL,
  },
});
