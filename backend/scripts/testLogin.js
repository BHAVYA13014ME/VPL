const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function testLogin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test credentials
    const testEmail = 'bhavya@gmail.com';
    const testPassword = '123456';

    // Find user
    const user = await User.findOne({ email: testEmail }).select('+password');
    
    if (!user) {
      console.log('❌ User not found:', testEmail);
      console.log('\n📋 Creating test user...');
      
      const newUser = await User.create({
        firstName: 'Bhavya',
        lastName: 'Butani',
        email: testEmail,
        password: testPassword,
        role: 'teacher',
        isActive: true
      });
      
      console.log('✅ Test user created:', {
        email: newUser.email,
        role: newUser.role,
        password: testPassword
      });
    } else {
      console.log('✅ User found:', {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password
      });

      // Test password
      const isMatch = await user.comparePassword(testPassword);
      console.log('\n🔐 Password test with "123456":', isMatch ? '✅ MATCH' : '❌ NO MATCH');
      
      if (!isMatch) {
        console.log('\n🔄 Resetting password to "123456"...');
        user.password = testPassword;
        await user.save();
        console.log('✅ Password reset complete');
      }
    }

    // Check for other users
    const allUsers = await User.find({}, 'email role isActive').limit(10);
    console.log('\n👥 Available users:');
    allUsers.forEach(u => {
      console.log(`   - ${u.email} (${u.role}) ${u.isActive ? '✅' : '❌ INACTIVE'}`);
    });

    mongoose.connection.close();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();
