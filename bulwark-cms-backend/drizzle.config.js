const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './models/schema.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://neondb_owner:npg_8YFobylwNZO4@ep-shiny-lake-admlldjh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  }
});
