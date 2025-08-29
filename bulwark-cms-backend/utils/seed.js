import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users, products, contentCategories, goals } from '../models/schema.js';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Create default products
    console.log('📦 Creating default products...');
    const defaultProducts = [
      {
        name: 'Health Insurance',
        description: 'Comprehensive health insurance coverage',
        category: 'Health Insurance',
        isActive: true
      },
      {
        name: 'Guards Income Protection',
        description: 'Income protection and disability insurance',
        category: 'Income Protection',
        isActive: true
      },
      {
        name: 'Individual Life Products',
        description: 'Individual life insurance products',
        category: 'Life Insurance',
        isActive: true
      },
      {
        name: 'Employer Benefits Products',
        description: 'Group benefits and employer-sponsored insurance',
        category: 'Group Benefits',
        isActive: true
      }
    ];

    for (const product of defaultProducts) {
      await db.insert(products).values({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    console.log('✅ Products created successfully');

    // Create default content categories
    console.log('📚 Creating default content categories...');
    const defaultCategories = [
      {
        name: 'Policy Updates',
        description: 'Updates and changes to insurance policies',
        isActive: true
      },
      {
        name: 'Training Materials',
        description: 'Training and educational materials for agents',
        isActive: true
      },
      {
        name: 'Company News',
        description: 'Company announcements and news',
        isActive: true
      },
      {
        name: 'Industry Updates',
        description: 'Insurance industry news and updates',
        isActive: true
      },
      {
        name: 'Best Practices',
        description: 'Best practices and guidelines for agents',
        isActive: true
      }
    ];

    for (const category of defaultCategories) {
      await db.insert(contentCategories).values({
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    console.log('✅ Content categories created successfully');

    // Create default manager user
    console.log('👤 Creating default manager user...');
    
    // Check if manager already exists
    let managerUser = await db.select().from(users).where(eq(users.email, 'manager@bulwark.com'));
    
    if (managerUser.length === 0) {
      const hashedPassword = await bcrypt.hash('manager123', 12);
      
      managerUser = await db.insert(users).values({
        email: 'manager@bulwark.com',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Manager',
        role: 'manager',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      console.log('✅ Manager user created successfully');
    } else {
      console.log('✅ Manager user already exists');
      managerUser = managerUser;
    }

    // Create default agent user
    console.log('👤 Creating default agent user...');
    
    // Check if agent already exists
    let agentUser = await db.select().from(users).where(eq(users.email, 'agent@bulwark.com'));
    
    if (agentUser.length === 0) {
      const hashedPassword = await bcrypt.hash('agent123', 12);
      
      agentUser = await db.insert(users).values({
        email: 'agent@bulwark.com',
        passwordHash: hashedPassword,
        firstName: 'Jane',
        lastName: 'Agent',
        role: 'agent',
        isActive: true,
        managerId: managerUser[0]?.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      console.log('✅ Agent user created successfully');
    } else {
      console.log('✅ Agent user already exists');
      agentUser = agentUser;
    }

    // Create sample goals for testing
    console.log('🎯 Creating sample goals...');
    
    // Check if goals already exist
    const existingGoals = await db.select().from(goals).limit(1);
    
    if (existingGoals.length === 0) {
      const sampleGoals = [
        {
          agentId: agentUser[0]?.id || 2,
          goalType: 'monthly',
          metricType: 'sales_amount',
          title: 'Monthly Sales Target',
          targetValue: 50000.00,
          currentValue: 0.00,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          isActive: true,
          notes: 'Monthly sales target for January 2024',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          agentId: agentUser[0]?.id || 2,
          goalType: 'quarterly',
          metricType: 'new_clients',
          title: 'Q1 Client Acquisition',
          targetValue: 25.00,
          currentValue: 0.00,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          isActive: true,
          notes: 'Quarterly goal for new client acquisition',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          agentId: agentUser[0]?.id || 2,
          goalType: 'annual',
          metricType: 'commission',
          title: 'Annual Commission Goal',
          targetValue: 25000.00,
          currentValue: 0.00,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          isActive: true,
          notes: 'Annual commission target for 2024',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const goal of sampleGoals) {
        await db.insert(goals).values(goal);
      }
      
      console.log('✅ Sample goals created successfully');
    } else {
      console.log('✅ Goals already exist, skipping creation');
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase();
