import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// In Prisma 7 the connection lives here rather than in schema.prisma,
// and env vars have to be loaded explicitly through dotenv.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
