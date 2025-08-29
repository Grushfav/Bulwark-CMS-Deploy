// Export all schema definitions
export * from './schema.js';

// Export specific tables for convenience
export {
  users,
  clients,
  products,
  sales,
  goals,
  reminders,
  contentCategories,
  content,
  teams,
  teamMembers,
  clientNotes
} from './schema.js';

// Export database instance
export { db } from '../config/database.js';
