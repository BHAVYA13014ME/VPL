const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@email.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      
      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Updated user to admin role');
      }
      
      // Reset password to 'admin123'
      existingAdmin.password = 'admin123';
      await existingAdmin.save();
      console.log('✅ Password reset to: admin123');
      
      process.exit(0);
      return;
    }

    // Create new admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@email.com',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      profile: {
        bio: 'System Administrator',
        profilePicture: ''
      }
    });

    await adminUser.save();
    
    console.log('\n✅ Admin user created successfully!');
    console.log('-----------------------------------');
    console.log('📧 Email: admin@email.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('-----------------------------------');
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
