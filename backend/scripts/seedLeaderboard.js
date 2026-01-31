const mongoose = require('mongoose');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');
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

const seedLeaderboard = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get all users
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log('No users found. Please create some users first.');
      process.exit(1);
    }

    // Clear existing leaderboard entries
    await Leaderboard.deleteMany({});
    console.log('Cleared existing leaderboard entries');

    // Create sample leaderboard entries
    const sampleBadges = [
      {
        name: 'Assignment Master',
        description: 'Completed 10 assignments with high scores',
        icon: 'assignment',
        color: '#ffd700',
        rarity: 'rare'
      },
      {
        name: 'Course Explorer',
        description: 'Enrolled in multiple courses',
        icon: 'school',
        color: '#c0c0c0',
        rarity: 'common'
      }
    ];

    const sampleAchievements = [
      {
        type: 'first_course_completed',
        title: 'Getting Started',
        description: 'Completed your first course',
        rarity: 'common',
        pointsAwarded: 50
      },
      {
        type: 'perfect_score',
        title: 'Perfectionist',
        description: 'Achieved 100% on an assignment',
        rarity: 'rare',
        pointsAwarded: 100
      }
    ];

    const leaderboardEntries = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const points = Math.floor(Math.random() * 5000) + 100;
      const level = Math.floor(points / 200) + 1;
      const currentXP = points % 200;
      const nextLevelXP = 200;

      const entry = new Leaderboard({
        user: user._id,
        category: 'overall',
        period: 'all_time',
        points: points,
        level: level,
        rank: i + 1,
        currentLevelXP: currentXP,
        nextLevelXP: nextLevelXP,
        badges: sampleBadges.slice(0, Math.floor(Math.random() * 2) + 1),
        achievements: sampleAchievements.map(achievement => ({
          ...achievement,
          earnedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        })),
        statistics: {
          coursesCompleted: Math.floor(Math.random() * 10) + 1,
          assignmentsCompleted: Math.floor(Math.random() * 25) + 5,
          totalStudyTime: Math.floor(Math.random() * 1000) + 100,
          averageGrade: Math.floor(Math.random() * 30) + 70,
          streakDays: Math.floor(Math.random() * 15) + 1,
          skillsLearned: ['JavaScript', 'React', 'Node.js'].slice(0, Math.floor(Math.random() * 3) + 1),
          milestonesReached: Math.floor(Math.random() * 5) + 1
        }
      });

      leaderboardEntries.push(entry);
    }

    // Sort by points (descending) and update ranks
    leaderboardEntries.sort((a, b) => b.points - a.points);
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Save all entries
    await Leaderboard.insertMany(leaderboardEntries);
    console.log(`Created ${leaderboardEntries.length} leaderboard entries`);

    console.log('Leaderboard seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding leaderboard:', error);
    process.exit(1);
  }
};

seedLeaderboard();
