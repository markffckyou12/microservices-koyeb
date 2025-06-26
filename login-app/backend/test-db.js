const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📡 Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test query
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if DATABASE_URL is set in .env file');
    console.log('2. Verify the database connection string is correct');
    console.log('3. Make sure the database is running');
    console.log('4. Check if you ran: npx prisma db push');
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection(); 