const express = require('express');
const { body, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, isAdmin, authorize } = require('../middleware/auth');
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

// @desc    Get users for chat (Teachers and Admins)
// @route   GET /api/users/chat-participants
// @access  Private (Teacher, Admin)
router.get('/chat-participants', auth, asyncHandler(async (req, res) => {
  // Allow teachers and admins to get users for chat
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teachers and admins only.'
    });
  }

  const { search, role } = req.query;
  
  let query = { _id: { $ne: req.user._id } }; // Exclude current user
  
  if (role) {
    query.role = role;
  }
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('firstName lastName email role avatar')
    .sort({ firstName: 1, lastName: 1 })
    .limit(50);

  res.json({
    success: true,
    data: users
  });
}));

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', auth, isAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('role').optional().isIn(['student', 'teacher', 'admin']).withMessage('Invalid role'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sort').optional().isIn(['newest', 'oldest', 'name', 'points']).withMessage('Invalid sort option')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  let query = {};
  
  if (req.query.role) {
    query.role = req.query.role;
  }
  
  if (req.query.search) {
    query.$or = [
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Build sort
  let sort = {};
  switch (req.query.sort) {
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'oldest':
      sort = { createdAt: 1 };
      break;
    case 'name':
      sort = { firstName: 1, lastName: 1 };
      break;
    case 'points':
      sort = { 'gamification.points': -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  const users = await User.find(query)
    .select('-password')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
}));

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin or own profile)
router.get('/:id', auth, asyncHandler(async (req, res) => {
  // Allow users to view their own profile or admin to view any profile
  if (req.params.id !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('enrolledCourses.course', 'title thumbnail instructor')
    .populate('enrolledCourses.course.instructor', 'firstName lastName');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      user
    }
  });
}));

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (Admin)
router.put('/:id', auth, isAdmin, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified must be a boolean')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select('-password');

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', auth, isAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent admin from deleting themselves
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete your own account'
    });
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private (Admin or own stats)
router.get('/:id/stats', auth, asyncHandler(async (req, res) => {
  // Allow users to view their own stats or admin to view any stats
  if (req.params.id !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const user = await User.findById(req.params.id)
    .populate('enrolledCourses.course', 'title category')
    .select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  let stats = {
    gamification: user.gamification,
    joinedDate: user.createdAt,
    lastActivity: user.lastLogin,
    profile: {
      completionRate: 0,
      totalPoints: user.gamification.points,
      currentLevel: user.gamification.level,
      badgesCount: user.gamification.badges.length,
      currentStreak: user.gamification.streak.current,
      longestStreak: user.gamification.streak.longest
    }
  };

  if (user.role === 'student') {
    const totalCourses = user.enrolledCourses.length;
    const completedCourses = user.enrolledCourses.filter(course => course.progress === 100).length;
    const averageProgress = totalCourses > 0 
      ? user.enrolledCourses.reduce((sum, course) => sum + course.progress, 0) / totalCourses
      : 0;
    
    // Get category distribution
    const categoryStats = {};
    user.enrolledCourses.forEach(enrollment => {
      const category = enrollment.course.category;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    stats.student = {
      totalCourses,
      completedCourses,
      inProgressCourses: totalCourses - completedCourses,
      averageProgress: Math.round(averageProgress),
      completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0,
      categoryDistribution: categoryStats
    };
  }

  res.json({
    success: true,
    data: {
      stats
    }
  });
}));

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Private
router.get('/leaderboard/top', auth, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const leaderboard = await User.getLeaderboard(limit);

  // Get current user's position if they're a student
  let currentUserPosition = null;
  if (req.user.role === 'student') {
    const allStudents = await User.find({ role: 'student', isActive: true })
      .sort({ 'gamification.points': -1 })
      .select('_id gamification.points')
      .lean();

    const userIndex = allStudents.findIndex(student => 
      student._id.toString() === req.user._id.toString()
    );
    
    if (userIndex !== -1) {
      currentUserPosition = {
        position: userIndex + 1,
        points: allStudents[userIndex].gamification.points,
        totalStudents: allStudents.length
      };
    }
  }

  res.json({
    success: true,
    data: {
      leaderboard,
      currentUserPosition
    }
  });
}));

// @desc    Add points to user (Admin/Teacher only)
// @route   POST /api/users/:id/points
// @access  Private (Admin/Teacher)
router.post('/:id/points', auth, authorize('admin', 'teacher'), [
  body('points')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points must be between 1 and 1000'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { points, reason } = req.body;
  
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role !== 'student') {
    return res.status(400).json({
      success: false,
      message: 'Points can only be added to students'
    });
  }

  const oldLevel = user.gamification.level;
  await user.addPoints(points);
  const newLevel = user.gamification.level;

  // Check for level up
  const leveledUp = newLevel > oldLevel;

  res.json({
    success: true,
    message: `${points} points added successfully`,
    data: {
      points: user.gamification.points,
      level: user.gamification.level,
      leveledUp,
      reason: reason || 'Points added by admin/teacher'
    }
  });
}));

// @desc    Award badge to user (Admin/Teacher only)
// @route   POST /api/users/:id/badges
// @access  Private (Admin/Teacher)
router.post('/:id/badges', auth, authorize('admin', 'teacher'), [
  body('name')
    .notEmpty()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Badge name is required and cannot exceed 100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;
  
  const user = await User.findById(req.params.id);

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

  // Check if badge already exists
  const existingBadge = user.gamification.badges.find(badge => badge.name === name);
  if (existingBadge) {
    return res.status(400).json({
      success: false,
      message: 'User already has this badge'
    });
  }

  // Add badge
  user.gamification.badges.push({
    name,
    description: description || '',
    icon: icon || '🏆',
    earnedAt: new Date()
  });

  await user.save();

  res.json({
    success: true,
    message: 'Badge awarded successfully',
    data: {
      badge: user.gamification.badges[user.gamification.badges.length - 1],
      totalBadges: user.gamification.badges.length
    }
  });
}));

// @desc    Get teachers list
// @route   GET /api/users/teachers
// @access  Public
router.get('/teachers/list', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('subject').optional().isString().withMessage('Subject must be a string')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  let query = { role: 'teacher', isActive: true };
  
  if (req.query.subject) {
    query.teachingSubjects = { $in: [req.query.subject] };
  }

  const teachers = await User.find(query)
    .select('firstName lastName avatar profile.bio teachingSubjects qualifications experience')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      teachers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
}));

// @desc    Change user password
// @route   POST /api/users/change-password
// @access  Private
router.post('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  body('confirmPassword').notEmpty().withMessage('Confirm password is required')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Check if new password and confirm password match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password and confirm password do not match'
    });
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @desc    Delete current user account
// @route   DELETE /api/users/delete
// @access  Private
router.delete('/delete', auth, [
  body('password').notEmpty().withMessage('Password is required to delete account')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { password } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Incorrect password'
    });
  }

  // Delete user
  await User.findByIdAndDelete(req.user.id);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

// @desc    Update user settings
// @route   PATCH /api/users/settings
// @access  Private
router.patch('/settings', auth, [
  body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be a boolean'),
  body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be a boolean'),
  body('marketingEmails').optional().isBoolean().withMessage('Marketing emails must be a boolean'),
  body('profileVisibility').optional().isIn(['public', 'private', 'friends']).withMessage('Invalid profile visibility')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { emailNotifications, pushNotifications, marketingEmails, profileVisibility } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update settings
  if (emailNotifications !== undefined) {
    user.profile.preferences.emailNotifications = emailNotifications;
  }
  if (pushNotifications !== undefined) {
    user.profile.preferences.pushNotifications = pushNotifications;
  }
  if (marketingEmails !== undefined) {
    user.profile.preferences.marketingEmails = marketingEmails;
  }
  if (profileVisibility !== undefined) {
    user.profile.preferences.profileVisibility = profileVisibility;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      preferences: user.profile.preferences
    }
  });
}));

module.exports = router;
