const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/virtual-learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function checkDatabaseData() {
  try {
    console.log('\n📊 DATABASE STATUS CHECK\n');
    console.log('='.repeat(50));

    // Count documents
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalCourses = await Course.countDocuments();
    const totalAssignments = await Assignment.countDocuments();

    console.log('\n📈 TOTAL COUNTS:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   - Students: ${totalStudents}`);
    console.log(`   - Teachers: ${totalTeachers}`);
    console.log(`   - Admins: ${totalAdmins}`);
    console.log(`   Total Courses: ${totalCourses}`);
    console.log(`   Total Assignments: ${totalAssignments}`);

    // Check active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });
    console.log(`\n👥 Active Users (last 7 days): ${activeUsers}`);

    // Check users with lastLogin set
    const usersWithLastLogin = await User.countDocuments({ lastLogin: { $exists: true, $ne: null } });
    console.log(`   Users with lastLogin: ${usersWithLastLogin}`);
    console.log(`   Users without lastLogin: ${totalUsers - usersWithLastLogin}`);

    // Recent signups
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    console.log(`\n📅 Recent Signups (last 30 days): ${recentSignups}`);

    // Daily signups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailySignups = await User.countDocuments({
      createdAt: { $gte: today }
    });
    console.log(`   Today's Signups: ${dailySignups}`);

    // List all users
    const users = await User.find().select('firstName lastName email role lastLogin createdAt');
    console.log('\n👤 ALL USERS:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Created: ${user.createdAt?.toLocaleDateString() || 'N/A'}`);
      console.log(`      Last Login: ${user.lastLogin ? user.lastLogin.toLocaleString() : 'Never'}`);
    });

    // Update all users' lastLogin to now if they don't have one
    console.log('\n🔄 Updating lastLogin for users without it...');
    const usersToUpdate = await User.find({ 
      $or: [
        { lastLogin: { $exists: false } },
        { lastLogin: null }
      ]
    });

    if (usersToUpdate.length > 0) {
      for (const user of usersToUpdate) {
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
      }
      console.log(`   ✅ Updated ${usersToUpdate.length} users' lastLogin`);
    } else {
      console.log(`   ℹ️  All users already have lastLogin set`);
    }

    // Check again after update
    const activeUsersAfter = await User.countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });
    console.log(`\n✅ Active Users after update: ${activeUsersAfter}`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Database check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkDatabaseData();
