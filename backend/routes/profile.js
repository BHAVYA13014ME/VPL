const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/profiles/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/profile
// @desc    Get current user's profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // req.user is already populated by auth middleware, just return it
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      bio,
      location,
      department,
      specialization,
      experience,
      socialLinks,
      preferences,
      skills,
      achievements
    } = req.body;

    // Find and update user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update top-level fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    // Update profile fields
    if (!user.profile) user.profile = {};
    
    if (phone !== undefined) user.profile.phone = phone;
    if (bio !== undefined) user.profile.bio = bio;
    if (location !== undefined) user.profile.location = location;
    if (department !== undefined) user.profile.department = department;
    if (specialization !== undefined) user.profile.specialization = specialization;
    if (experience !== undefined) user.profile.experience = experience;
    if (skills !== undefined) user.profile.skills = skills;
    if (achievements !== undefined) user.profile.achievements = achievements;
    
    if (socialLinks !== undefined) {
      if (!user.profile.socialLinks) user.profile.socialLinks = {};
      user.profile.socialLinks = { ...user.profile.socialLinks, ...socialLinks };
    }

    // Update preferences
    if (preferences !== undefined) {
      if (!user.preferences) user.preferences = {};
      user.preferences = { ...user.preferences, ...preferences };
    }

    // Mark nested objects as modified
    user.markModified('profile');
    user.markModified('preferences');

    await user.save();

    // Return user without password
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .lean();

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/profile/upload-picture
// @desc    Upload profile picture
// @access  Private
router.post('/upload-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile picture if it exists
    if (user.profile?.profilePicture) {
      const oldPath = path.join(__dirname, '..', user.profile.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Initialize profile if it doesn't exist
    if (!user.profile) user.profile = {};

    // Update user with new profile picture path
    user.profile.profilePicture = `/uploads/profiles/${req.file.filename}`;
    user.markModified('profile');
    await user.save();

    res.json({ 
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profile.profilePicture 
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/profile/stats
// @desc    Get user profile statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let stats = {};

    if (user.role === 'teacher') {
      // Teacher statistics
      const totalCourses = await Course.countDocuments({ instructor: user._id });
      const courses = await Course.find({ instructor: user._id }).populate('students');
      const totalStudents = courses.reduce((sum, course) => sum + course.students.length, 0);
      
      // Calculate average rating (placeholder - you'll need to implement ratings)
      const avgRating = 4.5; // Placeholder
      
      stats = {
        totalCourses,
        totalStudents,
        avgRating
      };
    } else if (user.role === 'student') {
      // Student statistics
      const enrolledCourses = await Course.countDocuments({ students: user._id });
      const completedAssignments = await Assignment.countDocuments({ 
        student: user._id, 
        status: 'submitted' 
      });
      
      // Calculate GPA (placeholder - you'll need to implement grades)
      const currentGPA = 3.8; // Placeholder
      
      // Get learning streak from gamification stats
      const streakDays = user.gamificationStats?.streak || 0;
      
      stats = {
        completedCourses: enrolledCourses,
        currentGPA,
        streakDays
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/profile/:userId
// @desc    Get public profile of a user
// @access  Private (logged in users only)
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -email') // Don't expose sensitive info
      .populate('achievements')
      .populate('gamificationStats');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if profile is public or if viewer has permission
    if (user.preferences?.profileVisibility === 'private' && 
        user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Profile is private' });
    }

    // If students-only visibility, check if requester is student or same user
    if (user.preferences?.profileVisibility === 'students-only' && 
        user._id.toString() !== req.user._id.toString()) {
      const requester = await User.findById(req.user._id);
      if (requester.role !== 'student') {
        return res.status(403).json({ message: 'Profile is private' });
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/profile/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/profile
// @desc    Delete user account
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete profile picture if it exists
    if (user.profilePicture) {
      const picturePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(picturePath)) {
        fs.unlinkSync(picturePath);
      }
    }

    // Remove user from courses
    await Course.updateMany(
      { students: user._id },
      { $pull: { students: user._id } }
    );

    // Delete user's courses if they're a teacher
    if (user.role === 'teacher') {
      await Course.deleteMany({ instructor: user._id });
    }

    // Delete assignments
    await Assignment.deleteMany({ student: user._id });

    // Delete user
    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
