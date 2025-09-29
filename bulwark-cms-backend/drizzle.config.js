import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './models/schema.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_8YFobylwNZO4@ep-shiny-lake-admlldjh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  }
});
