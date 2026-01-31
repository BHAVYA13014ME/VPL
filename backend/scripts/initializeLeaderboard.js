const mongoose = require('mongoose');
const { initializeLeaderboardForAllUsers } = require('../utils/leaderboardUpdater');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/learningplatform';

async function initializeLeaderboard() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✓ Connected to MongoDB');
    console.log('\n=== Initializing Leaderboard with Real Student Data ===\n');

    const count = await initializeLeaderboardForAllUsers();

    console.log(`\n✓ Successfully initialized leaderboard for ${count} students`);
    console.log('\nLeaderboard Features:');
    console.log('- Points calculated from real course completions and assignment submissions');
    console.log('- Badges awarded based on actual achievements');
    console.log('- Rankings updated based on performance');
    console.log('- Statistics synced with real student activity');

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error initializing leaderboard:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the initialization
initializeLeaderboard();
