const express = require('express');
const { query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

// Import leaderboard controller
const { 
  getLeaderboard,
  getUserRanking,
  getTopPerformers,
  updateUserPoints,
  awardBadge,
  unlockAchievement,
  getAchievements,
  getBadges,
  getStatistics
} = require('../controllers/leaderboardController');

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

// @desc    Get leaderboard rankings
// @route   GET /api/leaderboard
// @access  Public
router.get('/', [
  query('category')
    .optional()
    .isIn(['overall', 'programming', 'design', 'business', 'marketing', 'photography', 'music', 'health', 'fitness', 'language', 'mathematics', 'science', 'other'])
    .withMessage('Invalid category'),
  query('period')
    .optional()
    .isIn(['all_time', 'monthly', 'weekly', 'daily'])
    .withMessage('Invalid period'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], handleValidationErrors, getLeaderboard);

// @desc    Get top performers
// @route   GET /api/leaderboard/top
// @access  Public
router.get('/top', [
  query('category')
    .optional()
    .isIn(['overall', 'programming', 'design', 'business', 'marketing', 'photography', 'music', 'health', 'fitness', 'language', 'mathematics', 'science', 'other'])
    .withMessage('Invalid category'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], handleValidationErrors, getTopPerformers);

// @desc    Get user ranking
// @route   GET /api/leaderboard/me
// @access  Private
router.get('/me', auth, [
  query('category')
    .optional()
    .isIn(['overall', 'programming', 'design', 'business', 'marketing', 'photography', 'music', 'health', 'fitness', 'language', 'mathematics', 'science', 'other'])
    .withMessage('Invalid category'),
  query('period')
    .optional()
    .isIn(['all_time', 'monthly', 'weekly', 'daily'])
    .withMessage('Invalid period')
], handleValidationErrors, getUserRanking);

// @desc    Get user statistics
// @route   GET /api/leaderboard/stats/:userId?
// @access  Private
router.get('/stats/:userId?', auth, getStatistics);

// @desc    Get achievements
// @route   GET /api/leaderboard/achievements
// @access  Private
router.get('/achievements', auth, getAchievements);

// @desc    Get badges
// @route   GET /api/leaderboard/badges
// @access  Private
router.get('/badges', auth, getBadges);

// @desc    Update user points (internal use)
// @route   POST /api/leaderboard/points
// @access  Private (Admin or system)
router.post('/points', auth, updateUserPoints);

// @desc    Award badge (internal use)
// @route   POST /api/leaderboard/badge
// @access  Private (Admin or system)
router.post('/badge', auth, awardBadge);

// @desc    Unlock achievement (internal use)
// @route   POST /api/leaderboard/achievement
// @access  Private (Admin or system)
router.post('/achievement', auth, unlockAchievement);

// @desc    Initialize leaderboard for all users (Admin only)
// @route   POST /api/leaderboard/initialize
// @access  Private (Admin only)
router.post('/initialize', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { initializeLeaderboardForAllUsers } = require('../utils/leaderboardUpdater');
    const count = await initializeLeaderboardForAllUsers();

    res.json({
      success: true,
      message: `Leaderboard initialized successfully for ${count} students`,
      data: { count }
    });
  } catch (error) {
    console.error('Error initializing leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
