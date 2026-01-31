const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const { validationResult } = require('express-validator');

// @desc    Get leaderboard rankings
// @route   GET /api/leaderboard
// @access  Public
const getLeaderboard = async (req, res) => {
  try {
    const {
      category = 'overall',
      period = 'all_time',
      limit = 50,
      page = 1
    } = req.query;

    const options = {
      category,
      period,
      limit: parseInt(limit),
      page: parseInt(page)
    };

    const leaderboard = await Leaderboard.getLeaderboard(options);
    
    // Filter out entries with null users (deleted users)
    const validLeaderboard = leaderboard.filter(entry => entry.user != null);
    
    const total = await Leaderboard.countDocuments({ category, period });

    // Add position numbers
    const startPosition = (parseInt(page) - 1) * parseInt(limit);
    const leaderboardWithPositions = validLeaderboard.map((entry, index) => ({
      ...entry,
      position: startPosition + index + 1
    }));

    res.json({
      success: true,
      data: {
        leaderboard: leaderboardWithPositions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        filters: {
          category,
          period
        }
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get top performers
// @route   GET /api/leaderboard/top
// @access  Public
const getTopPerformers = async (req, res) => {
  try {
    const {
      category = 'overall',
      limit = 10
    } = req.query;

    const topPerformers = await Leaderboard.getTopPerformers(category, parseInt(limit));

    // Filter out entries with null users (deleted users)
    const validTopPerformers = topPerformers.filter(entry => entry.user != null);

    // Add position numbers
    const topPerformersWithPositions = validTopPerformers.map((entry, index) => ({
      ...entry,
      position: index + 1
    }));

    res.json({
      success: true,
      data: {
        topPerformers: topPerformersWithPositions,
        category
      }
    });

  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top performers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get user ranking
// @route   GET /api/leaderboard/me
// @access  Private
const getUserRanking = async (req, res) => {
  try {
    const {
      category = 'overall',
      period = 'all_time'
    } = req.query;

    let userRanking = await Leaderboard.getUserRanking(req.user._id, category, period);

    // If user doesn't have a leaderboard entry, create one
    if (!userRanking) {
      const newEntry = new Leaderboard({
        user: req.user._id,
        category,
        period,
        points: 0,
        level: 1,
        rank: 1
      });

      await newEntry.save();
      userRanking = await Leaderboard.getUserRanking(req.user._id, category, period);
    }

    // Get surrounding users for context
    const surroundingUsers = await Leaderboard.find({
      category,
      period,
      rank: {
        $gte: Math.max(1, userRanking.rank - 2),
        $lte: userRanking.rank + 2
      }
    })
    .populate('user', 'firstName lastName avatar profile')
    .sort({ rank: 1 })
    .lean();

    res.json({
      success: true,
      data: {
        userRanking,
        surroundingUsers,
        category,
        period
      }
    });

  } catch (error) {
    console.error('Error fetching user ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user ranking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/leaderboard/stats/:userId?
// @access  Private
const getStatistics = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    // Check if user can view these stats
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get or create leaderboard entry
    let leaderboardEntry = await Leaderboard.findOne({
      user: userId,
      category: 'overall',
      period: 'all_time'
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new Leaderboard({
        user: userId,
        category: 'overall',
        period: 'all_time'
      });
      await leaderboardEntry.save();
    }

    // Get additional statistics from other collections
    const enrolledCourses = await User.findById(userId)
      .populate('enrolledCourses.course')
      .select('enrolledCourses');

    const coursesCompleted = enrolledCourses.enrolledCourses.filter(
      ec => ec.progress >= 100
    ).length;

    const assignmentsSubmitted = await Assignment.countDocuments({
      'submissions.student': userId
    });

    // Calculate average score
    const assignments = await Assignment.find({
      'submissions.student': userId
    }).select('submissions');

    let totalScore = 0;
    let scoredAssignments = 0;
    
    assignments.forEach(assignment => {
      const userSubmission = assignment.submissions.find(
        sub => sub.student.toString() === userId
      );
      if (userSubmission && userSubmission.grade !== undefined) {
        totalScore += userSubmission.grade;
        scoredAssignments++;
      }
    });

    const averageScore = scoredAssignments > 0 ? Math.round(totalScore / scoredAssignments) : 0;

    // Update statistics
    await leaderboardEntry.updateStatistics({
      coursesCompleted,
      assignmentsSubmitted,
      averageScore
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        },
        ranking: {
          points: leaderboardEntry.points,
          level: leaderboardEntry.level,
          rank: leaderboardEntry.rank,
          pointsToNextLevel: leaderboardEntry.pointsToNextLevel,
          levelProgress: leaderboardEntry.levelProgress
        },
        statistics: leaderboardEntry.statistics,
        achievements: leaderboardEntry.achievements,
        badges: leaderboardEntry.badges,
        lastUpdated: leaderboardEntry.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get achievements
// @route   GET /api/leaderboard/achievements
// @access  Private
const getAchievements = async (req, res) => {
  try {
    const leaderboardEntry = await Leaderboard.findOne({
      user: req.user._id,
      category: 'overall',
      period: 'all_time'
    });

    if (!leaderboardEntry) {
      return res.json({
        success: true,
        data: {
          achievements: [],
          availableAchievements: getAvailableAchievements()
        }
      });
    }

    const availableAchievements = getAvailableAchievements();
    const unlockedAchievements = leaderboardEntry.achievements;
    
    // Mark which achievements are unlocked
    const achievementsWithStatus = availableAchievements.map(achievement => {
      const unlocked = unlockedAchievements.find(ua => ua.type === achievement.type);
      return {
        ...achievement,
        unlocked: !!unlocked,
        unlockedAt: unlocked ? unlocked.unlockedAt : null
      };
    });

    res.json({
      success: true,
      data: {
        achievements: achievementsWithStatus,
        totalUnlocked: unlockedAchievements.length,
        totalAvailable: availableAchievements.length
      }
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching achievements',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get badges
// @route   GET /api/leaderboard/badges
// @access  Private
const getBadges = async (req, res) => {
  try {
    const leaderboardEntry = await Leaderboard.findOne({
      user: req.user._id,
      category: 'overall',
      period: 'all_time'
    });

    const badges = leaderboardEntry ? leaderboardEntry.badges : [];

    res.json({
      success: true,
      data: {
        badges,
        total: badges.length
      }
    });

  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching badges',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update user points
// @route   POST /api/leaderboard/points
// @access  Private (Admin or system)
const updateUserPoints = async (req, res) => {
  try {
    const { userId, points, reason, category = 'overall', period = 'all_time' } = req.body;

    if (!userId || points === undefined) {
      return res.status(400).json({
        success: false,
        message: 'User ID and points are required'
      });
    }

    // Find or create leaderboard entry
    let leaderboardEntry = await Leaderboard.findOne({
      user: userId,
      category,
      period
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new Leaderboard({
        user: userId,
        category,
        period
      });
    }

    await leaderboardEntry.addPoints(points, reason);

    res.json({
      success: true,
      message: 'Points updated successfully',
      data: {
        userId,
        pointsAdded: points,
        totalPoints: leaderboardEntry.points,
        level: leaderboardEntry.level,
        reason
      }
    });

  } catch (error) {
    console.error('Error updating user points:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating points',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Award badge
// @route   POST /api/leaderboard/badge
// @access  Private (Admin or system)
const awardBadge = async (req, res) => {
  try {
    const { userId, badgeData, category = 'overall', period = 'all_time' } = req.body;

    if (!userId || !badgeData) {
      return res.status(400).json({
        success: false,
        message: 'User ID and badge data are required'
      });
    }

    let leaderboardEntry = await Leaderboard.findOne({
      user: userId,
      category,
      period
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new Leaderboard({
        user: userId,
        category,
        period
      });
      await leaderboardEntry.save();
    }

    await leaderboardEntry.awardBadge(badgeData);

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      data: {
        userId,
        badge: badgeData
      }
    });

  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while awarding badge',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Unlock achievement
// @route   POST /api/leaderboard/achievement
// @access  Private (Admin or system)
const unlockAchievement = async (req, res) => {
  try {
    const { userId, achievementData, category = 'overall', period = 'all_time' } = req.body;

    if (!userId || !achievementData) {
      return res.status(400).json({
        success: false,
        message: 'User ID and achievement data are required'
      });
    }

    let leaderboardEntry = await Leaderboard.findOne({
      user: userId,
      category,
      period
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new Leaderboard({
        user: userId,
        category,
        period
      });
      await leaderboardEntry.save();
    }

    await leaderboardEntry.unlockAchievement(achievementData);

    res.json({
      success: true,
      message: 'Achievement unlocked successfully',
      data: {
        userId,
        achievement: achievementData,
        pointsAwarded: achievementData.points || 0
      }
    });

  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unlocking achievement',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to get available achievements
const getAvailableAchievements = () => [
  {
    type: 'first_course_completed',
    title: 'First Steps',
    description: 'Complete your first course',
    points: 100,
    icon: '🎓',
    color: '#4CAF50'
  },
  {
    type: 'first_assignment_submitted',
    title: 'Getting Started',
    description: 'Submit your first assignment',
    points: 50,
    icon: '📝',
    color: '#2196F3'
  },
  {
    type: 'perfect_score',
    title: 'Perfectionist',
    description: 'Score 100% on an assignment',
    points: 200,
    icon: '⭐',
    color: '#FFD700'
  },
  {
    type: 'study_streak_7',
    title: 'Week Warrior',
    description: 'Study for 7 consecutive days',
    points: 150,
    icon: '🔥',
    color: '#FF5722'
  },
  {
    type: 'study_streak_30',
    title: 'Month Master',
    description: 'Study for 30 consecutive days',
    points: 500,
    icon: '🏆',
    color: '#9C27B0'
  },
  {
    type: 'course_creator',
    title: 'Knowledge Sharer',
    description: 'Create your first course',
    points: 300,
    icon: '👨‍🏫',
    color: '#607D8B'
  },
  {
    type: 'helpful_reviewer',
    title: 'Helpful Hand',
    description: 'Leave 10 helpful course reviews',
    points: 250,
    icon: '💡',
    color: '#FF9800'
  },
  {
    type: 'discussion_starter',
    title: 'Conversation Catalyst',
    description: 'Start 5 discussion threads',
    points: 100,
    icon: '💬',
    color: '#00BCD4'
  },
  {
    type: 'assignment_master',
    title: 'Assignment Ace',
    description: 'Complete 50 assignments',
    points: 400,
    icon: '📋',
    color: '#8BC34A'
  },
  {
    type: 'quick_learner',
    title: 'Speed Demon',
    description: 'Complete a course in under a week',
    points: 300,
    icon: '⚡',
    color: '#FFEB3B'
  },
  {
    type: 'dedicated_student',
    title: 'Dedicated Learner',
    description: 'Complete 10 courses',
    points: 1000,
    icon: '🎯',
    color: '#E91E63'
  },
  {
    type: 'knowledge_seeker',
    title: 'Knowledge Seeker',
    description: 'Enroll in courses from 5 different categories',
    points: 350,
    icon: '🔍',
    color: '#3F51B5'
  }
];

module.exports = {
  getLeaderboard,
  getUserRanking,
  getTopPerformers,
  updateUserPoints,
  awardBadge,
  unlockAchievement,
  getAchievements,
  getBadges,
  getStatistics
};
