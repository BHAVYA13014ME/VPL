const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function resetAllPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get ALL users from the database
    const allUsers = await User.find({});
    console.log(`📋 Found ${allUsers.length} users in the database\n`);

    if (allUsers.length === 0) {
      console.log('❌ No users found in the database');
      mongoose.connection.close();
      return;
    }

    // Set default password for all users
    const defaultPassword = '123456';
    
    console.log('🔄 Resetting passwords for all users...\n');
    
    let resetCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        // Set the password directly - the User model will hash it automatically
        user.password = defaultPassword;
        await user.save();
        console.log(`✅ ${user.email} (${user.role}) - Password reset successfully`);
        resetCount++;
      } catch (error) {
        console.log(`❌ ${user.email} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n🎉 Password reset operation completed!');
    console.log(`✅ Successfully reset: ${resetCount} users`);
    if (errorCount > 0) {
      console.log(`❌ Failed to reset: ${errorCount} users`);
    }

    console.log('\n📋 Updated Login Credentials for ALL Users:');
    console.log('┌─────────────────────────────────┬──────────┬────────────┐');
    console.log('│ Email                           │ Password │ Role       │');
    console.log('├─────────────────────────────────┼──────────┼────────────┤');
    
    // Fetch fresh user data to display
    const updatedUsers = await User.find({}).select('email role');
    updatedUsers.forEach(user => {
      console.log(`│ ${user.email.padEnd(31)} │ ${defaultPassword.padEnd(8)} │ ${user.role.padEnd(10)} │`);
    });
    console.log('└─────────────────────────────────┴──────────┴────────────┘');

    console.log(`\n🔑 All users can now login with password: ${defaultPassword}`);
    console.log('💡 Tip: Users should change their passwords after first login');

    mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAllPasswords();
