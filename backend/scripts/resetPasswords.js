const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function resetPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-learning');
    console.log('✅ Connected to MongoDB\n');

    // Reset admin password
    const admin = await User.findOne({ email: 'admin@email.com' });
    if (admin) {
      admin.password = 'admin123';
      await admin.save();
      console.log('✅ Reset admin@email.com password to: admin123');
    }

    // Reset teacher password
    const teacher = await User.findOne({ email: 'bhavya@gmail.com' });
    if (teacher) {
      teacher.password = 'admin123';
      await teacher.save();
      console.log('✅ Reset bhavya@gmail.com password to: admin123');
    }

    // Reset student password
    const student = await User.findOne({ email: 'kenil@gmail.com' });
    if (student) {
      student.password = 'admin123';
      await student.save();
      console.log('✅ Reset kenil@gmail.com password to: admin123');
    }

    console.log('\n✅ All passwords reset successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPasswords();
