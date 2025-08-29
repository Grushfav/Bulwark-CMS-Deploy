import { pgTable, serial, varchar, text, boolean, timestamp, integer, decimal, date, json, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('agent'), // 'manager', 'agent'
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLogin: timestamp('last_login'),
  createdBy: integer('created_by').references(() => users.id),
  
  // Enhanced Profile Fields
  bio: text('bio'),
  avatarPath: varchar('avatar_path', { length: 500 }),
  phone: varchar('phone', { length: 20 }),
  dateOfBirth: date('date_of_birth'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  zipCode: varchar('zip_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  
  // Social Links
  linkedinUrl: varchar('linkedin_url', { length: 255 }),
  twitterUrl: varchar('twitter_url', { length: 255 }),
  facebookUrl: varchar('facebook_url', { length: 255 }),
  websiteUrl: varchar('website_url', { length: 255 }),
  
  // Professional Information
  employeeId: varchar('employee_id', { length: 50 }),
  department: varchar('department', { length: 100 }),
  position: varchar('position', { length: 100 }),
  hireDate: date('hire_date'),
  managerId: integer('manager_id').references(() => users.id),
  
  // Preferences
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  language: varchar('language', { length: 10 }).default('en'),
  dateFormat: varchar('date_format', { length: 20 }).default('MM/DD/YYYY'),
  timeFormat: varchar('time_format', { length: 10 }).default('12h'),
  
  // Notification Settings
  emailNotifications: boolean('email_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(false),
  pushNotifications: boolean('push_notifications').default(true),
  notifySalesUpdates: boolean('notify_sales_updates').default(true),
  notifyClientActivities: boolean('notify_client_activities').default(true),
  notifyGoalProgress: boolean('notify_goal_progress').default(true),
  notifyReminders: boolean('notify_reminders').default(true),
  notifyTeamUpdates: boolean('notify_team_updates').default(true),
  
  // Privacy Settings
  profileVisibility: varchar('profile_visibility', { length: 20 }).default('team'), // 'public', 'team', 'private'
  showContactInfo: boolean('show_contact_info').default(true),
  showPerformanceStats: boolean('show_performance_stats').default(true),
  
  // Account Settings
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  passwordChangedAt: timestamp('password_changed_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  accountLockedUntil: timestamp('account_locked_until'),
  
  // User Status Tracking
  deletedAt: timestamp('deleted_at') // NULL = active/suspended, timestamp = deleted
}, (table) => ({
  emailIdx: uniqueIndex('email_idx').on(table.email),
  roleIdx: index('role_idx').on(table.role),
  managerIdx: index('manager_idx').on(table.managerId)
}));

// Clients table
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => users.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  dateOfBirth: date('date_of_birth'),
  employer: varchar('employer', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('prospect'), // 'client' or 'prospect'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  notes: text('notes')
}, (table) => ({
  agentIdx: index('client_agent_idx').on(table.agentId),
  statusIdx: index('client_status_idx').on(table.status),
  emailIdx: index('client_email_idx').on(table.email)
}));

// Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Sales table
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => users.id),
  clientId: integer('client_id').notNull().references(() => clients.id),
  productId: integer('product_id').notNull().references(() => products.id),
  premiumAmount: decimal('premium_amount', { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
  saleDate: date('sale_date').notNull(),
  policyNumber: varchar('policy_number', { length: 100 }),
  status: varchar('status', { length: 20 }).default('active'), // 'active', 'cancelled', 'expired'
  productName: varchar('product_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  notes: text('notes')
}, (table) => ({
  agentIdx: index('sale_agent_idx').on(table.agentId),
  clientIdx: index('sale_client_idx').on(table.clientId),
  productIdx: index('sale_product_idx').on(table.productId),
  dateIdx: index('sale_date_idx').on(table.saleDate),
  statusIdx: index('sale_status_idx').on(table.status)
}));

// Goals table
export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => users.id),
  goalType: varchar('goal_type', { length: 20 }).notNull(), // 'weekly', 'monthly', 'half_yearly', 'annual'
  metricType: varchar('metric_type', { length: 30 }).notNull(), // 'sales_amount', 'client_count', 'commission', 'policies_sold'
  title: varchar('title', { length: 100 }),
  targetValue: decimal('target_value', { precision: 12, scale: 2 }).notNull(),
  currentValue: decimal('current_value', { precision: 12, scale: 2 }).default('0'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  notes: text('notes')
}, (table) => ({
  agentIdx: index('goal_agent_idx').on(table.agentId),
  typeIdx: index('goal_type_idx').on(table.goalType),
  activeIdx: index('goal_active_idx').on(table.isActive)
}));

// Reminders table
export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull().references(() => users.id),
  clientId: integer('client_id').references(() => clients.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  reminderDate: timestamp('reminder_date').notNull(),
  isCompleted: boolean('is_completed').default(false),
  priority: varchar('priority', { length: 20 }).default('medium'), // 'low', 'medium', 'high', 'urgent'
  type: varchar('type', { length: 50 }), // 'call_back', 'outstanding_documents', 'delayed_start_date', 'follow_up', 'policy_renewal'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  agentIdx: index('reminder_agent_idx').on(table.agentId),
  clientIdx: index('reminder_client_idx').on(table.clientId),
  dateIdx: index('reminder_date_idx').on(table.reminderDate),
  completedIdx: index('reminder_completed_idx').on(table.isCompleted)
}));

// Content categories table
export const contentCategories = pgTable('content_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentId: integer('parent_id').references(() => contentCategories.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Content table
export const content = pgTable('content', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(), // knowledge_base, policy_update, event, announcement, training
  contentText: text('content_text'),
  description: text('description'),
  contentUrl: varchar('content_url', { length: 500 }),
  
  // File management
  filePath: varchar('file_path', { length: 500 }),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  fileType: varchar('file_type', { length: 100 }),
  fileExtension: varchar('file_extension', { length: 20 }),
  mimeType: varchar('mime_type', { length: 100 }),
  
  // Metadata
  authorId: integer('author_id').notNull().references(() => users.id),
  categoryId: integer('category_id').references(() => contentCategories.id),
  tags: json('tags'),
  
  // Content settings
  isFeatured: boolean('is_featured').default(false),
  isActive: boolean('is_active').default(true),
  isPublished: boolean('is_published').default(false),
  isPublic: boolean('is_public').default(true),
  status: varchar('status', { length: 50 }).default('draft'), // draft, published, archived
  publishedAt: timestamp('published_at'),
  
  // SEO and display
  slug: varchar('slug', { length: 255 }).unique(),
  metaDescription: text('meta_description'),
  metaKeywords: text('meta_keywords'),
  
  // Statistics
  viewCount: integer('view_count').default(0),
  downloadCount: integer('download_count').default(0),
  shareCount: integer('share_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  authorIdx: index('content_author_idx').on(table.authorId),
  categoryIdx: index('content_category_idx').on(table.categoryId),
  typeIdx: index('content_type_idx').on(table.contentType),
  statusIdx: index('content_status_idx').on(table.status),
  slugIdx: uniqueIndex('content_slug_idx').on(table.slug)
}));

// Teams table
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  managerId: integer('manager_id').notNull().references(() => users.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Team members table
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 50 }).default('member'), // 'member', 'lead', 'specialist'
  joinedAt: timestamp('joined_at').defaultNow(),
  isActive: boolean('is_active').default(true)
}, (table) => ({
  teamIdx: index('team_member_team_idx').on(table.teamId),
  userIdx: index('team_member_user_idx').on(table.userId),
  uniqueTeamUser: uniqueIndex('unique_team_user').on(table.teamId, table.userId)
}));

// Client notes table
export const clientNotes = pgTable('client_notes', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull().references(() => clients.id),
  agentId: integer('agent_id').notNull().references(() => users.id),
  note: text('note').notNull(),
  noteType: varchar('note_type', { length: 50 }).default('general'), // 'general', 'follow_up', 'policy', 'important'
  isPrivate: boolean('is_private').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  clientIdx: index('note_client_idx').on(table.clientId),
  agentIdx: index('note_agent_idx').on(table.agentId),
  typeIdx: index('note_type_idx').on(table.noteType)
}));

// Define relationships
export const usersRelations = relations(users, ({ many, one }) => ({
  clients: many(clients),
  sales: many(sales),
  goals: many(goals),
  reminders: many(reminders),
  content: many(content),
  teams: many(teams),
  teamMembers: many(teamMembers),
  clientNotes: many(clientNotes),
  manager: one(users, { fields: [users.managerId], references: [users.id] }),
  createdUsers: many(users, { relationName: 'createdBy' })
}));

export const clientsRelations = relations(clients, ({ many, one }) => ({
  sales: many(sales),
  reminders: many(reminders),
  notes: many(clientNotes),
  agent: one(users, { fields: [clients.agentId], references: [users.id] })
}));

export const salesRelations = relations(sales, ({ one }) => ({
  agent: one(users, { fields: [sales.agentId], references: [users.id] }),
  client: one(clients, { fields: [sales.clientId], references: [clients.id] }),
  product: one(products, { fields: [sales.productId], references: [products.id] })
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  agent: one(users, { fields: [goals.agentId], references: [users.id] })
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  agent: one(users, { fields: [reminders.agentId], references: [users.id] }),
  client: one(clients, { fields: [reminders.clientId], references: [clients.id] })
}));

export const contentRelations = relations(content, ({ one }) => ({
  author: one(users, { fields: [content.authorId], references: [users.id] }),
  category: one(contentCategories, { fields: [content.categoryId], references: [contentCategories.id] })
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
  members: many(teamMembers),
  manager: one(users, { fields: [teams.managerId], references: [users.id] })
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] })
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(clients, { fields: [clientNotes.clientId], references: [clients.id] }),
  agent: one(users, { fields: [clientNotes.agentId], references: [users.id] })
}));
