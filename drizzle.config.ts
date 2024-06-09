import type {Config} from "drizzle-kit";

export default {
  schema: "./src/downloader/schema.ts",
  out: "./src/downloader/drizzle",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
