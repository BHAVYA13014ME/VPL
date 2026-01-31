const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const upgradeUserToTeacher = async () => {
  try {
    await connectDB();

    // Get the email from command line argument
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node scripts/upgradeToTeacher.js <email>');
      console.log('Example: node scripts/upgradeToTeacher.js bhavyabutani1234@gmail.com');
      process.exit(1);
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Current user: ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);

    if (user.role === 'teacher') {
      console.log('User is already a teacher!');
      process.exit(0);
    }

    // Update role to teacher
    user.role = 'teacher';
    await user.save();

    console.log(`✅ Successfully upgraded ${user.firstName} ${user.lastName} to teacher role!`);
    console.log('They can now create courses.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

upgradeUserToTeacher();
