const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user to request
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided, authorization denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database with enrolled courses populated
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('enrolledCourses.course', '_id title code');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid, user not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired' 
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error in authentication' 
    });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied, please login' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Check if user is admin
const isAdmin = authorize('admin');

// Check if user is teacher or admin
const isTeacher = authorize('teacher', 'admin');

// Check if user is student, teacher, or admin (basically any authenticated user)
const isAuthenticated = authorize('student', 'teacher', 'admin');

// Optional authentication - don't fail if no token, but attach user if valid token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next(); // Continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Just continue without user if token is invalid
    next();
  }
};

// Check if user owns resource or is admin/teacher
const checkOwnership = (resourceUserField = 'user') => {
  return (req, res, next) => {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resource = req.resource || req.body || req.params;
    const resourceUserId = resource[resourceUserField];

    if (!resourceUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resource user information not found' 
      });
    }

    if (resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only access your own resources.' 
      });
    }

    next();
  };
};

// Check if user is enrolled in course
const checkCourseEnrollment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
    
    if (!courseId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Course ID is required' 
      });
    }

    // Admin and teachers can access any course
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      return next();
    }

    // Check if student is enrolled in the course
    const isEnrolled = req.user.enrolledCourses.some(enrollment => {
      if (!enrollment) return false;
      const course = enrollment.course;
      if (course && typeof course === 'object' && course._id) {
        return course._id.toString() === courseId.toString();
      }
      return course.toString() === courseId.toString();
    });

    if (!isEnrolled) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You are not enrolled in this course.' 
      });
    }

    next();
  } catch (error) {
    console.error('Course enrollment check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error checking course enrollment' 
    });
  }
};

module.exports = {
  auth,
  authorize,
  isAdmin,
  isTeacher,
  isAuthenticated,
  optionalAuth,
  checkOwnership,
  checkCourseEnrollment
};
