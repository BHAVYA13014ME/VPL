const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @desc    Get leaderboard
// @route   GET /api/gamification/leaderboard
// @access  Private
router.get('/leaderboard', auth, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('timeframe')
    .optional()
    .isIn(['all', 'month', 'week'])
    .withMessage('Timeframe must be all, month, or week')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const timeframe = req.query.timeframe || 'all';

  let query = { role: 'student', isActive: true };

  // Apply timeframe filter
  if (timeframe !== 'all') {
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    }

    // For monthly/weekly leaderboards, we'd need to track points earned in time periods
    // For now, we'll use overall points but could be enhanced with time-based tracking
  }

  const leaderboard = await User.find(query)
    .sort({ 
      'gamification.points': -1, 
      'gamification.level': -1,
      'gamification.streak.current': -1 
    })
    .limit(limit)
    .select('firstName lastName avatar gamification createdAt')
    .lean();

  // Get current user's position if they're a student
  let currentUserPosition = null;
  if (req.user.role === 'student') {
    const allStudents = await User.find(query)
      .sort({ 'gamification.points': -1 })
      .select('_id')
      .lean();

    const userIndex = allStudents.findIndex(student => 
      student._id.toString() === req.user._id.toString()
    );
    
    if (userIndex !== -1) {
      currentUserPosition = {
        position: userIndex + 1,
        totalStudents: allStudents.length
      };
    }
  }

  // Add rank to leaderboard entries
  const rankedLeaderboard = leaderboard.map((user, index) => ({
    rank: index + 1,
    id: user._id,
    name: `${user.firstName} ${user.lastName}`,
    avatar: user.avatar,
    points: user.gamification.points,
    level: user.gamification.level,
    streak: user.gamification.streak.current,
    badges: user.gamification.badges.length,
    joinedAt: user.createdAt
  }));

  res.json({
    success: true,
    data: {
      leaderboard: rankedLeaderboard,
      currentUserPosition,
      timeframe,
      totalEntries: rankedLeaderboard.length
    }
  });
}));

// @desc    Get achievements/badges list
// @route   GET /api/gamification/achievements
// @access  Private
router.get('/achievements', auth, asyncHandler(async (req, res) => {
  // Predefined achievements that can be earned
  const availableAchievements = [
    {
      id: 'first_course',
      name: 'Getting Started',
      description: 'Complete your first course',
      icon: '🎓',
      points: 100,
      type: 'course_completion'
    },
    {
      id: 'speed_learner',
      name: 'Speed Learner',
      description: 'Complete a course in less than a week',
      icon: '⚡',
      points: 200,
      type: 'course_completion'
    },
    {
      id: 'perfect_score',
      name: 'Perfect Score',
      description: 'Get 100% on an assignment',
      icon: '💯',
      points: 150,
      type: 'assignment'
    },
    {
      id: 'week_streak',
      name: 'Weekly Warrior',
      description: 'Maintain a 7-day learning streak',
      icon: '🔥',
      points: 100,
      type: 'streak'
    },
    {
      id: 'month_streak',
      name: 'Monthly Master',
      description: 'Maintain a 30-day learning streak',
      icon: '🏆',
      points: 500,
      type: 'streak'
    },
    {
      id: 'helpful_student',
      name: 'Helpful Student',
      description: 'Help 10 classmates in discussions',
      icon: '🤝',
      points: 200,
      type: 'social'
    },
    {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Submit 5 assignments before deadline',
      icon: '🌅',
      points: 150,
      type: 'assignment'
    },
    {
      id: 'knowledge_seeker',
      name: 'Knowledge Seeker',
      description: 'Complete courses in 3 different categories',
      icon: '📚',
      points: 300,
      type: 'course_completion'
    },
    {
      id: 'top_performer',
      name: 'Top Performer',
      description: 'Reach top 10 in leaderboard',
      icon: '🥇',
      points: 500,
      type: 'leaderboard'
    },
    {
      id: 'level_up',
      name: 'Level Up',
      description: 'Reach level 5',
      icon: '⬆️',
      points: 250,
      type: 'level'
    }
  ];

  // Get user's earned badges if they're a student
  let userBadges = [];
  if (req.user.role === 'student') {
    const user = await User.findById(req.user._id).select('gamification.badges');
    userBadges = user.gamification.badges;
  }

  // Mark which achievements are earned
  const achievementsWithStatus = availableAchievements.map(achievement => ({
    ...achievement,
    earned: userBadges.some(badge => badge.name === achievement.name),
    earnedAt: userBadges.find(badge => badge.name === achievement.name)?.earnedAt || null
  }));

  res.json({
    success: true,
    data: {
      achievements: achievementsWithStatus,
      totalAvailable: availableAchievements.length,
      totalEarned: userBadges.length
    }
  });
}));

// @desc    Get user's gamification profile
// @route   GET /api/gamification/profile/:userId?
// @access  Private
router.get('/profile/:userId?', auth, asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;

  // Check if user can view this profile
  if (userId !== req.user._id.toString() && req.user.role === 'student') {
    return res.status(403).json({
      success: false,
      message: 'You can only view your own gamification profile'
    });
  }

  const user = await User.findById(userId).select(
    'firstName lastName avatar gamification enrolledCourses createdAt'
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role !== 'student') {
    return res.status(400).json({
      success: false,
      message: 'Gamification is only available for students'
    });
  }

  // Calculate additional stats
  const totalCourses = user.enrolledCourses.length;
  const completedCourses = user.enrolledCourses.filter(
    course => course.progress === 100
  ).length;

  // Get user's rank
  const allStudents = await User.find({ role: 'student', isActive: true })
    .sort({ 'gamification.points': -1 })
    .select('_id')
    .lean();

  const userRank = allStudents.findIndex(student => 
    student._id.toString() === userId
  ) + 1;

  // Calculate points needed for next level
  const currentLevel = user.gamification.level;
  const pointsForNextLevel = currentLevel * 1000; // Each level requires 1000 more points
  const pointsNeeded = pointsForNextLevel - user.gamification.points;

  // Get recent badges (last 5)
  const recentBadges = user.gamification.badges
    .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
    .slice(0, 5);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        joinedAt: user.createdAt
      },
      gamification: {
        points: user.gamification.points,
        level: user.gamification.level,
        pointsNeeded: Math.max(0, pointsNeeded),
        streak: {
          current: user.gamification.streak.current,
          longest: user.gamification.streak.longest,
          lastActivity: user.gamification.streak.lastActivity
        },
        badges: {
          total: user.gamification.badges.length,
          recent: recentBadges,
          all: user.gamification.badges
        },
        rank: {
          current: userRank,
          total: allStudents.length,
          percentile: Math.round(((allStudents.length - userRank + 1) / allStudents.length) * 100)
        }
      },
      progress: {
        totalCourses,
        completedCourses,
        completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
      }
    }
  });
}));

// @desc    Get current user's gamification profile
// @route   GET /api/gamification/profile
// @access  Private
router.get('/profile', auth, asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('gamificationStats firstName lastName avatar');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user's badges
  const userBadges = user.gamificationStats.badges || [];

  // Get available achievements
  const achievements = await getAllAchievements();

  // Mark which achievements the user has earned
  const achievementsWithStatus = achievements.map(achievement => ({
    ...achievement,
    earned: userBadges.some(badge => badge.name === achievement.name),
    earnedAt: userBadges.find(badge => badge.name === achievement.name)?.earnedAt || null
  }));

  // Get user's recent activity and stats
  const enrolledCourses = req.user.enrolledCourses || [];
  const totalCourses = enrolledCourses.length;
  const completedCourses = enrolledCourses.filter(course => course.progress >= 100).length;

  res.json({
    success: true,
    data: {
      profile: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        },
        stats: user.gamificationStats,
        achievements: achievementsWithStatus,
        progress: {
          totalCourses,
          completedCourses,
          completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
        }
      }
    }
  });
}));

// @desc    Award points to user (Admin/Teacher only)
// @route   POST /api/gamification/award-points
// @access  Private (Admin/Teacher)
router.post('/award-points', auth, authorize('admin', 'teacher'), [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('points')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points must be between 1 and 1000'),
  body('reason')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Reason must be between 5 and 200 characters')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { userId, points, reason } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role !== 'student') {
    return res.status(400).json({
      success: false,
      message: 'Points can only be awarded to students'
    });
  }

  const oldLevel = user.gamification.level;
  const oldPoints = user.gamification.points;

  await user.addPoints(points);

  const leveledUp = user.gamification.level > oldLevel;

  // Create activity log entry (you might want to create a separate model for this)
  const activityLog = {
    type: 'points_awarded',
    points,
    reason,
    awardedBy: req.user._id,
    awardedAt: new Date(),
    leveledUp
  };

  res.json({
    success: true,
    message: 'Points awarded successfully',
    data: {
      user: {
        id: user._id,
        name: user.fullName,
        oldPoints,
        newPoints: user.gamification.points,
        pointsAwarded: points,
        oldLevel,
        newLevel: user.gamification.level,
        leveledUp
      },
      activity: activityLog
    }
  });
}));

// @desc    Award badge to user (Admin/Teacher only)
// @route   POST /api/gamification/award-badge
// @access  Private (Admin/Teacher)
router.post('/award-badge', auth, authorize('admin', 'teacher'), [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('badgeName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Badge name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Icon cannot exceed 10 characters')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { userId, badgeName, description, icon } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role !== 'student') {
    return res.status(400).json({
      success: false,
      message: 'Badges can only be awarded to students'
    });
  }

  // Check if user already has this badge
  const existingBadge = user.gamification.badges.find(
    badge => badge.name.toLowerCase() === badgeName.toLowerCase()
  );

  if (existingBadge) {
    return res.status(400).json({
      success: false,
      message: 'User already has this badge'
    });
  }

  // Add badge
  const newBadge = {
    name: badgeName,
    description: description || '',
    icon: icon || '🏆',
    earnedAt: new Date()
  };

  user.gamification.badges.push(newBadge);
  await user.save();

  // Award points for earning badge
  await user.addPoints(50); // 50 points for earning a badge

  res.json({
    success: true,
    message: 'Badge awarded successfully',
    data: {
      badge: newBadge,
      totalBadges: user.gamification.badges.length,
      pointsEarned: 50,
      totalPoints: user.gamification.points
    }
  });
}));

// @desc    Get points history for user
// @route   GET /api/gamification/points-history/:userId
// @route   GET /api/gamification/points-history
// @access  Private
router.get('/points-history/:userId', auth, asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  // Check if user can view this history
  if (userId !== req.user._id.toString() && req.user.role === 'student') {
    return res.status(403).json({
      success: false,
      message: 'You can only view your own points history'
    });
  }

  // For now, we'll return a placeholder response
  // In a real implementation, you'd want to store points history in a separate collection
  const user = await User.findById(userId).select('gamification');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Mock points history - in production, this would come from a separate tracking system
  const pointsHistory = [
    {
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      points: 50,
      reason: 'Assignment submitted',
      type: 'assignment'
    },
    {
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      points: 100,
      reason: 'Course completed',
      type: 'course'
    },
    {
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      points: 25,
      reason: 'Daily login bonus',
      type: 'login'
    },
    {
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      points: 75,
      reason: 'High score on quiz',
      type: 'quiz'
    }
  ];

  res.json({
    success: true,
    data: {
      currentPoints: user.gamification.points,
      history: pointsHistory,
      totalEntries: pointsHistory.length
    }
  });
}));

// @desc    Get current user's points history
// @route   GET /api/gamification/points-history
// @access  Private
router.get('/points-history', auth, asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('gamificationStats');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Mock points history data - in a real app, this would be stored in a separate collection
  const pointsHistory = [
    {
      date: new Date(),
      points: 30,
      reason: 'Daily login bonus',
      type: 'login'
    },
    {
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      points: 50,
      reason: 'Assignment submitted',
      type: 'assignment'
    },
    {
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      points: 100,
      reason: 'Course completed',
      type: 'course'
    },
    {
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      points: 25,
      reason: 'Daily login bonus',
      type: 'login'
    },
    {
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      points: 75,
      reason: 'High score on quiz',
      type: 'quiz'
    }
  ];

  res.json({
    success: true,
    data: {
      currentPoints: user.gamificationStats.totalPoints,
      history: pointsHistory,
      totalEntries: pointsHistory.length
    }
  });
}));

// @desc    Get level requirements and rewards
// @route   GET /api/gamification/levels
// @access  Private
router.get('/levels', auth, asyncHandler(async (req, res) => {
  // Define level requirements and rewards
  const levels = [
    { level: 1, pointsRequired: 0, title: 'Beginner', rewards: ['Welcome badge'] },
    { level: 2, pointsRequired: 1000, title: 'Learner', rewards: ['Profile customization'] },
    { level: 3, pointsRequired: 2000, title: 'Student', rewards: ['Special avatar frames'] },
    { level: 4, pointsRequired: 3000, title: 'Scholar', rewards: ['Priority support'] },
    { level: 5, pointsRequired: 4000, title: 'Expert', rewards: ['Mentor badge', 'Course discounts'] },
    { level: 6, pointsRequired: 5000, title: 'Master', rewards: ['Exclusive content access'] },
    { level: 7, pointsRequired: 6000, title: 'Guru', rewards: ['Beta feature access'] },
    { level: 8, pointsRequired: 7000, title: 'Legend', rewards: ['VIP status'] },
    { level: 9, pointsRequired: 8000, title: 'Champion', rewards: ['Custom badge design'] },
    { level: 10, pointsRequired: 9000, title: 'Grandmaster', rewards: ['Hall of Fame entry'] }
  ];

  let userLevel = 1;
  let userPoints = 0;

  if (req.user.role === 'student') {
    const user = await User.findById(req.user._id).select('gamification');
    userLevel = user.gamification.level;
    userPoints = user.gamification.points;
  }

  // Mark current level and progress
  const levelsWithProgress = levels.map(level => ({
    ...level,
    isCurrentLevel: level.level === userLevel,
    isUnlocked: level.level <= userLevel,
    progressToNext: level.level === userLevel + 1 
      ? Math.max(0, Math.min(100, ((userPoints - levels[userLevel - 1].pointsRequired) / (level.pointsRequired - levels[userLevel - 1].pointsRequired)) * 100))
      : level.level <= userLevel ? 100 : 0
  }));

  res.json({
    success: true,
    data: {
      levels: levelsWithProgress,
      currentLevel: userLevel,
      currentPoints: userPoints,
      nextLevel: userLevel < levels.length ? levels[userLevel] : null
    }
  });
}));

// @desc    Get streak information and tips
// @route   GET /api/gamification/streak
// @access  Private (Students only)
router.get('/streak', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Streak information is only available for students'
    });
  }

  const user = await User.findById(req.user._id).select('gamification');

  const streak = user.gamification.streak;
  const today = new Date();
  const lastActivity = streak.lastActivity ? new Date(streak.lastActivity) : null;

  // Check if streak is at risk (last activity more than 23 hours ago)
  const hoursInactive = lastActivity 
    ? Math.floor((today - lastActivity) / (1000 * 60 * 60))
    : 0;

  const streakStatus = {
    current: streak.current,
    longest: streak.longest,
    lastActivity: lastActivity,
    hoursInactive,
    isAtRisk: hoursInactive > 23 && hoursInactive < 48,
    isBroken: hoursInactive >= 48,
    nextMilestone: getNextStreakMilestone(streak.current)
  };

  // Tips for maintaining streak
  const tips = [
    "Log in daily to maintain your streak",
    "Complete at least one lesson per day",
    "Submit assignments on time for bonus points",
    "Participate in course discussions",
    "Take quizzes to test your knowledge"
  ];

  res.json({
    success: true,
    data: {
      streak: streakStatus,
      tips: tips.slice(0, 3), // Return 3 random tips
      rewards: {
        daily: 10, // Points for daily login
        weekly: 50, // Bonus for 7-day streak
        monthly: 200 // Bonus for 30-day streak
      }
    }
  });
}));

// Helper function to get next streak milestone
function getNextStreakMilestone(currentStreak) {
  const milestones = [7, 14, 30, 60, 100, 365];
  const nextMilestone = milestones.find(milestone => milestone > currentStreak);
  return nextMilestone || null;
}

module.exports = router;
