const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const ChatRoom = require('../models/ChatRoom');
const { auth, isTeacher, isAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Get user stats (for profile page)
// @route   GET /api/analytics/stats
// @access  Private
router.get('/stats', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let stats = {};

    if (user.role === 'teacher') {
      // Teacher statistics
      const courses = await Course.find({ instructor: user._id });
      const totalCourses = courses.length;
      const courseIds = courses.map(c => c._id);
      
      // Get total students enrolled in teacher's courses
      const totalStudents = courses.reduce((sum, course) => sum + (course.enrollmentCount || 0), 0);
      
      // Get total assignments created by teacher
      const totalAssignments = await Assignment.countDocuments({ 
        instructor: user._id 
      });
      
      // Get active students (students who have submitted assignments in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const assignmentsWithRecentSubmissions = await Assignment.find({
        instructor: user._id,
        'submissions.submittedAt': { $gte: thirtyDaysAgo }
      });
      
      const activeStudentIds = new Set();
      assignmentsWithRecentSubmissions.forEach(assignment => {
        assignment.submissions.forEach(submission => {
          if (submission.submittedAt >= thirtyDaysAgo) {
            activeStudentIds.add(submission.student.toString());
          }
        });
      });
      const activeStudents = activeStudentIds.size;
      
      // Calculate average rating
      const coursesWithRatings = courses.filter(c => c.rating && c.rating.count > 0);
      const avgRating = coursesWithRatings.length > 0
        ? coursesWithRatings.reduce((sum, c) => sum + c.rating.average, 0) / coursesWithRatings.length
        : 0;
      
      // Calculate completion rate (assignments submitted vs total assignments)
      const allAssignments = await Assignment.find({ instructor: user._id });
      let totalAssignmentSlots = 0;
      let submittedAssignments = 0;
      
      allAssignments.forEach(assignment => {
        const studentsInCourse = courses.find(c => c._id.toString() === assignment.course.toString())?.enrollmentCount || 0;
        totalAssignmentSlots += studentsInCourse;
        submittedAssignments += (assignment.submissions || []).length;
      });
      
      const completionRate = totalAssignmentSlots > 0 
        ? Math.round((submittedAssignments / totalAssignmentSlots) * 100) 
        : 0;
      
      stats = {
        totalCourses,
        totalStudents,
        totalAssignments,
        activeStudents,
        completionRate,
        avgRating: Math.round(avgRating * 10) / 10
      };
    } else if (user.role === 'student') {
      // Student statistics
      const enrolledCourses = user.enrolledCourses || [];
      const completedCourses = enrolledCourses.filter(ec => ec.progress === 100).length;
      
      // Get assignments
      const assignments = await Assignment.find({
        'submissions.student': user._id
      });
      
      const completedAssignments = assignments.filter(a => 
        a.submissions.some(s => 
          s.student.toString() === user._id.toString() && s.status === 'graded'
        )
      ).length;
      
      // Calculate GPA from graded assignments
      const gradedSubmissions = [];
      assignments.forEach(assignment => {
        const submission = assignment.submissions.find(
          s => s.student.toString() === user._id.toString() && s.status === 'graded'
        );
        if (submission && submission.grade && submission.grade.score) {
          const percentage = (submission.grade.score / assignment.maxScore) * 100;
          gradedSubmissions.push(percentage);
        }
      });
      
      const currentGPA = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, score) => sum + score, 0) / gradedSubmissions.length
        : 0;
      
      // Get learning streak
      const streakDays = user.gamification?.streak?.current || 0;
      const totalPoints = user.gamification?.points || 0;
      const currentLevel = user.gamification?.level || 1;
      
      stats = {
        completedCourses,
        assignmentsCompleted: completedAssignments,
        coursesCompleted: completedCourses,
        currentGPA: Math.round(currentGPA * 10) / 10,
        averageGrade: Math.round(currentGPA * 10) / 10,
        streakDays,
        streak: streakDays,
        totalAssignments: completedAssignments,
        totalPoints,
        currentLevel,
        studyTime: 0, // TODO: implement study time tracking
        rank: 0 // TODO: implement ranking system
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats'
    });
  }
}));

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

// @desc    Get platform overview analytics (Admin only)
// @route   GET /api/analytics/overview
// @access  Private (Admin)
router.get('/overview', auth, isAdmin, asyncHandler(async (req, res) => {
  // Get basic counts
  const [totalUsers, totalCourses, totalAssignments, totalChatRooms] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Assignment.countDocuments(),
    ChatRoom.countDocuments()
  ]);

  // Get user distribution by role
  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  // Get course distribution by category
  const coursesByCategory = await Course.aggregate([
    { $match: { isPublished: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  // Get recent registrations (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentRegistrations = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });

  // Get active users (logged in within last 7 days)
  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: sevenDaysAgo }
  });

  // Get total enrollments
  const totalEnrollments = await User.aggregate([
    { $unwind: '$enrolledCourses' },
    { $count: 'total' }
  ]);

  // Get course completion stats
  const completionStats = await User.aggregate([
    { $unwind: '$enrolledCourses' },
    {
      $group: {
        _id: null,
        totalEnrollments: { $sum: 1 },
        completedCourses: {
          $sum: { $cond: [{ $eq: ['$enrolledCourses.progress', 100] }, 1, 0] }
        },
        averageProgress: { $avg: '$enrolledCourses.progress' }
      }
    }
  ]);

  const stats = completionStats[0] || { totalEnrollments: 0, completedCourses: 0, averageProgress: 0 };

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalCourses,
        totalAssignments,
        totalChatRooms,
        totalEnrollments: totalEnrollments[0]?.total || 0,
        recentRegistrations,
        activeUsers,
        completionRate: stats.totalEnrollments > 0 
          ? Math.round((stats.completedCourses / stats.totalEnrollments) * 100) 
          : 0,
        averageProgress: Math.round(stats.averageProgress || 0)
      },
      distribution: {
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        coursesByCategory: coursesByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    }
  });
}));

// @desc    Get user engagement analytics
// @route   GET /api/analytics/engagement
// @access  Private (Admin/Teacher)
router.get('/engagement', auth, isTeacher, [
  query('timeframe')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Invalid timeframe. Use 7d, 30d, 90d, or 1y')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || '30d';
  
  // Calculate date range
  const now = new Date();
  const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysMap[timeframe]);

  // Get daily active users
  const dailyActiveUsers = await User.aggregate([
    {
      $match: {
        lastLogin: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Get user streaks distribution
  const streakDistribution = await User.aggregate([
    {
      $match: { role: 'student' }
    },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $eq: ['$gamification.streak.current', 0] }, then: '0 days' },
              { case: { $lte: ['$gamification.streak.current', 7] }, then: '1-7 days' },
              { case: { $lte: ['$gamification.streak.current', 30] }, then: '8-30 days' },
              { case: { $lte: ['$gamification.streak.current', 90] }, then: '31-90 days' }
            ],
            default: '90+ days'
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  // Get points distribution
  const pointsDistribution = await User.aggregate([
    {
      $match: { role: 'student' }
    },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $lt: ['$gamification.points', 100] }, then: '0-99' },
              { case: { $lt: ['$gamification.points', 500] }, then: '100-499' },
              { case: { $lt: ['$gamification.points', 1000] }, then: '500-999' },
              { case: { $lt: ['$gamification.points', 2500] }, then: '1000-2499' }
            ],
            default: '2500+'
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  // Get course engagement
  const courseEngagement = await Course.aggregate([
    {
      $match: { isPublished: true }
    },
    {
      $project: {
        title: 1,
        enrollmentCount: 1,
        'rating.average': 1,
        'analytics.views': 1,
        'analytics.completionRate': 1
      }
    },
    { $sort: { enrollmentCount: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    success: true,
    data: {
      timeframe,
      dailyActiveUsers,
      distributions: {
        streaks: streakDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        points: pointsDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      topCourses: courseEngagement
    }
  });
}));

// @desc    Get course analytics for instructor
// @route   GET /api/analytics/courses/:courseId
// @access  Private (Teacher/Admin)
router.get('/courses/:courseId', auth, isTeacher, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  const course = await Course.findById(courseId)
    .populate('instructor', 'firstName lastName');

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor or admin
  if (course.instructor._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Get enrolled students
  const enrolledStudents = await User.find({
    'enrolledCourses.course': courseId
  }).select('firstName lastName avatar enrolledCourses.$');

  // Calculate progress distribution
  const progressDistribution = {};
  enrolledStudents.forEach(student => {
    const enrollment = student.enrolledCourses[0];
    const progress = enrollment.progress;
    
    if (progress === 100) progressDistribution['Completed'] = (progressDistribution['Completed'] || 0) + 1;
    else if (progress >= 75) progressDistribution['75-99%'] = (progressDistribution['75-99%'] || 0) + 1;
    else if (progress >= 50) progressDistribution['50-74%'] = (progressDistribution['50-74%'] || 0) + 1;
    else if (progress >= 25) progressDistribution['25-49%'] = (progressDistribution['25-49%'] || 0) + 1;
    else progressDistribution['0-24%'] = (progressDistribution['0-24%'] || 0) + 1;
  });

  // Get assignments for this course
  const assignments = await Assignment.find({ course: courseId });
  
  // Calculate assignment completion stats
  const assignmentStats = assignments.map(assignment => ({
    id: assignment._id,
    title: assignment.title,
    totalSubmissions: assignment.submissions.length,
    submissionRate: enrolledStudents.length > 0 
      ? Math.round((assignment.submissions.length / enrolledStudents.length) * 100)
      : 0,
    averageScore: assignment.analytics.averageScore,
    dueDate: assignment.dueDate
  }));

  // Get recent activity (enrollments in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentEnrollments = enrolledStudents.filter(student => 
    student.enrolledCourses[0].enrolledAt >= thirtyDaysAgo
  );

  // Get chat room activity if exists
  const chatRoom = await ChatRoom.findOne({ course: courseId });
  const chatStats = chatRoom ? {
    totalMessages: chatRoom.messages.length,
    activeParticipants: chatRoom.participants.length,
    lastActivity: chatRoom.lastActivity
  } : null;

  res.json({
    success: true,
    data: {
      course: {
        id: course._id,
        title: course.title,
        enrollmentCount: course.enrollmentCount,
        rating: course.rating,
        analytics: course.analytics
      },
      students: {
        total: enrolledStudents.length,
        recentEnrollments: recentEnrollments.length,
        progressDistribution,
        topPerformers: enrolledStudents
          .sort((a, b) => b.enrolledCourses[0].progress - a.enrolledCourses[0].progress)
          .slice(0, 5)
          .map(student => ({
            id: student._id,
            name: student.fullName,
            avatar: student.avatar,
            progress: student.enrolledCourses[0].progress,
            grade: student.enrolledCourses[0].grade
          }))
      },
      assignments: {
        total: assignments.length,
        stats: assignmentStats
      },
      chat: chatStats
    }
  });
}));

// @desc    Get student performance analytics
// @route   GET /api/analytics/students/:studentId
// @access  Private (Admin/Teacher or own data)
router.get('/students/:studentId', auth, asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Check if user can access this data
  if (req.user._id.toString() !== studentId && req.user.role === 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const student = await User.findById(studentId)
    .populate('enrolledCourses.course', 'title category')
    .select('-password');

  if (!student || student.role !== 'student') {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Get assignment submissions for this student
  const assignments = await Assignment.find({
    'submissions.student': studentId
  }).populate('course', 'title');

  const submissionStats = assignments.map(assignment => {
    const submission = assignment.submissions.find(
      sub => sub.student.toString() === studentId
    );
    
    return {
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      courseTitle: assignment.course.title,
      submittedAt: submission.submittedAt,
      status: submission.status,
      score: submission.grade?.score,
      maxScore: assignment.maxScore,
      percentage: submission.grade?.score 
        ? Math.round((submission.grade.score / assignment.maxScore) * 100)
        : null,
      feedback: submission.grade?.feedback
    };
  });

  // Calculate performance metrics
  const gradedAssignments = submissionStats.filter(sub => sub.score !== undefined);
  const averageGrade = gradedAssignments.length > 0
    ? gradedAssignments.reduce((sum, sub) => sum + sub.percentage, 0) / gradedAssignments.length
    : 0;

  // Get course progress overview
  const courseProgress = student.enrolledCourses.map(enrollment => ({
    courseId: enrollment.course._id,
    courseTitle: enrollment.course.title,
    category: enrollment.course.category,
    progress: enrollment.progress,
    grade: enrollment.grade,
    enrolledAt: enrollment.enrolledAt,
    completedLessons: enrollment.completedLessons.length
  }));

  // Calculate learning streak and activity
  const activityStats = {
    currentStreak: student.gamification.streak.current,
    longestStreak: student.gamification.streak.longest,
    totalPoints: student.gamification.points,
    currentLevel: student.gamification.level,
    badgesEarned: student.gamification.badges.length,
    lastActivity: student.gamification.streak.lastActivity
  };

  // Get performance trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentSubmissions = submissionStats.filter(
    sub => new Date(sub.submittedAt) >= thirtyDaysAgo
  );

  res.json({
    success: true,
    data: {
      student: {
        id: student._id,
        name: student.fullName,
        email: student.email,
        avatar: student.avatar,
        joinedAt: student.createdAt
      },
      performance: {
        averageGrade: Math.round(averageGrade),
        totalAssignments: submissionStats.length,
        completedAssignments: gradedAssignments.length,
        pendingAssignments: submissionStats.filter(sub => sub.status === 'submitted').length,
        gradeDistribution: {
          'A (90-100)': gradedAssignments.filter(sub => sub.percentage >= 90).length,
          'B (80-89)': gradedAssignments.filter(sub => sub.percentage >= 80 && sub.percentage < 90).length,
          'C (70-79)': gradedAssignments.filter(sub => sub.percentage >= 70 && sub.percentage < 80).length,
          'D (60-69)': gradedAssignments.filter(sub => sub.percentage >= 60 && sub.percentage < 70).length,
          'F (0-59)': gradedAssignments.filter(sub => sub.percentage < 60).length
        }
      },
      courses: {
        enrolled: courseProgress.length,
        completed: courseProgress.filter(course => course.progress === 100).length,
        inProgress: courseProgress.filter(course => course.progress > 0 && course.progress < 100).length,
        averageProgress: courseProgress.length > 0
          ? Math.round(courseProgress.reduce((sum, course) => sum + course.progress, 0) / courseProgress.length)
          : 0,
        details: courseProgress
      },
      activity: activityStats,
      recentActivity: {
        submissions: recentSubmissions.length,
        details: recentSubmissions.slice(0, 10)
      }
    }
  });
}));

// @desc    Get assignment analytics
// @route   GET /api/analytics/assignments/:assignmentId
// @access  Private (Teacher/Admin)
router.get('/assignments/:assignmentId', auth, isTeacher, asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  
  const assignment = await Assignment.findById(assignmentId)
    .populate('instructor', 'firstName lastName')
    .populate('course', 'title enrollmentCount')
    .populate('submissions.student', 'firstName lastName avatar');

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check if user is the instructor or admin
  if (assignment.instructor._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Calculate detailed analytics
  const submissions = assignment.submissions;
  const gradedSubmissions = submissions.filter(sub => sub.status === 'graded');
  
  // Grade distribution
  const gradeDistribution = {
    'A (90-100)': 0, 'B (80-89)': 0, 'C (70-79)': 0, 'D (60-69)': 0, 'F (0-59)': 0
  };
  
  gradedSubmissions.forEach(submission => {
    const percentage = (submission.grade.score / assignment.maxScore) * 100;
    if (percentage >= 90) gradeDistribution['A (90-100)']++;
    else if (percentage >= 80) gradeDistribution['B (80-89)']++;
    else if (percentage >= 70) gradeDistribution['C (70-79)']++;
    else if (percentage >= 60) gradeDistribution['D (60-69)']++;
    else gradeDistribution['F (0-59)']++;
  });

  // Submission timeline
  const submissionTimeline = {};
  submissions.forEach(submission => {
    const date = submission.submittedAt.toISOString().split('T')[0];
    submissionTimeline[date] = (submissionTimeline[date] || 0) + 1;
  });

  // Late submissions
  const lateSubmissions = submissions.filter(
    sub => new Date(sub.submittedAt) > new Date(assignment.dueDate)
  );

  res.json({
    success: true,
    data: {
      assignment: {
        id: assignment._id,
        title: assignment.title,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate,
        type: assignment.type
      },
      statistics: {
        totalEnrolled: assignment.course.enrollmentCount,
        totalSubmissions: submissions.length,
        submissionRate: assignment.course.enrollmentCount > 0 
          ? Math.round((submissions.length / assignment.course.enrollmentCount) * 100)
          : 0,
        gradedSubmissions: gradedSubmissions.length,
        pendingGrading: submissions.filter(sub => sub.status === 'submitted').length,
        lateSubmissions: lateSubmissions.length,
        averageScore: assignment.analytics.averageScore,
        passRate: assignment.analytics.passRate
      },
      gradeDistribution,
      submissionTimeline,
      topPerformers: gradedSubmissions
        .sort((a, b) => b.grade.score - a.grade.score)
        .slice(0, 5)
        .map(sub => ({
          studentId: sub.student._id,
          studentName: sub.student.firstName + ' ' + sub.student.lastName,
          avatar: sub.student.avatar,
          score: sub.grade.score,
          percentage: Math.round((sub.grade.score / assignment.maxScore) * 100),
          submittedAt: sub.submittedAt
        }))
    }
  });
}));

// @desc    Get platform activity analytics
// @route   GET /api/analytics/activity
// @access  Private (Admin)
router.get('/activity', auth, isAdmin, [
  query('timeframe')
    .optional()
    .isIn(['24h', '7d', '30d'])
    .withMessage('Invalid timeframe. Use 24h, 7d, or 30d')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || '7d';
  
  // Calculate date range
  const now = new Date();
  const timeMap = { '24h': 1, '7d': 7, '30d': 30 };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeMap[timeframe]);

  // Get user registrations over time
  const registrations = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { 
            format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d', 
            date: '$createdAt' 
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Get course enrollments over time
  const enrollments = await User.aggregate([
    { $unwind: '$enrolledCourses' },
    {
      $match: {
        'enrolledCourses.enrolledAt': { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { 
            format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d', 
            date: '$enrolledCourses.enrolledAt' 
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Get assignment submissions over time
  const assignmentSubmissions = await Assignment.aggregate([
    { $unwind: '$submissions' },
    {
      $match: {
        'submissions.submittedAt': { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { 
            format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d', 
            date: '$submissions.submittedAt' 
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      timeframe,
      activity: {
        registrations: registrations.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        enrollments: enrollments.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        submissions: assignmentSubmissions.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    }
  });
}));

module.exports = router;
