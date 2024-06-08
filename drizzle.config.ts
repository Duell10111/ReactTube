import type {Config} from "drizzle-kit";

export default {
  schema: "./src/downloader/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
