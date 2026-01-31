const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/dashboard/student
// @desc    Get student dashboard data
// @access  Private (Student)
router.get('/student', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('enrolledCourses.course', 'title instructor duration')
      .populate({
        path: 'enrolledCourses.course',
        populate: {
          path: 'instructor',
          select: 'firstName lastName'
        }
      });

    if (!user || user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Student only.' });
    }

    // Get enrolled courses
    const enrolledCourses = user.enrolledCourses || [];
    const courseIds = enrolledCourses
      .filter(ec => ec.course && ec.course._id)
      .map(ec => ec.course._id);

    // Get announcements from enrolled courses
    const coursesWithAnnouncements = await Course.find({
      _id: { $in: courseIds }
    })
    .select('title announcements')
    .lean();

    const allAnnouncements = [];
    coursesWithAnnouncements.forEach(course => {
      if (course.announcements && course.announcements.length > 0) {
        course.announcements.forEach(announcement => {
          allAnnouncements.push({
            ...announcement,
            courseTitle: course.title,
            courseId: course._id
          });
        });
      }
    });

    // Sort announcements by date (newest first) and get last 5
    const recentAnnouncements = allAnnouncements
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Get assignments for enrolled courses
    const assignments = await Assignment.find({ 
      course: { $in: courseIds }
    }).populate('course', 'title');

    // Calculate statistics
    const totalCourses = enrolledCourses.length;
    const completedAssignments = assignments.filter(a => 
      user.completedAssignments?.includes(a._id)
    ).length;
    const pendingAssignments = assignments.length - completedAssignments;

    // Get recent activity (last 5 assignments)
    const recentAssignments = assignments
      .filter(assignment => assignment.course && assignment.course._id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(assignment => ({
        id: assignment._id,
        title: assignment.title,
        course: assignment.course.title,
        dueDate: assignment.dueDate,
        status: user.completedAssignments?.includes(assignment._id) ? 'completed' : 'pending'
      }));

    // Calculate overall progress
    const totalProgress = enrolledCourses.reduce((sum, ec) => sum + (ec.progress || 0), 0);
    const averageProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: user.profile?.profilePicture,
          gamification: user.gamification
        },
        stats: {
          totalCourses,
          completedAssignments,
          pendingAssignments,
          totalPoints: user.gamification?.points || 0,
          currentLevel: user.gamification?.level || 1,
          averageProgress,
          rank: user.gamification?.rank || 0,
          streak: user.gamification?.streak || 0
        },
        enrolledCourses: enrolledCourses
          .filter(ec => ec.course && ec.course._id && ec.course.instructor) // Filter out null courses and instructors
          .map(ec => ({
            id: ec.course._id,
            title: ec.course.title,
            instructor: `${ec.course.instructor.firstName} ${ec.course.instructor.lastName}`,
            progress: ec.progress || 0,
            enrolledAt: ec.enrolledAt
          })),
        recentActivity: recentAssignments,
        announcements: recentAnnouncements,
        achievements: user.gamification?.badges || []
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
}));

// @route   GET /api/dashboard/teacher
// @desc    Get teacher dashboard data
// @access  Private (Teacher)
router.get('/teacher', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Teacher only.' });
    }

    // Get courses taught by this teacher
    const courses = await Course.find({ instructor: user._id })
      .sort({ createdAt: -1 });

    // Get students enrolled in this teacher's courses
    const courseIds = courses.map(c => c._id);
    const enrolledStudents = await User.find({
      'enrolledCourses.course': { $in: courseIds }
    }).select('enrolledCourses');

    // Get assignments for teacher's courses
    const assignments = await Assignment.find({ 
      course: { $in: courseIds }
    }).populate('course', 'title');

    // Calculate statistics
    const totalCourses = courses.length;
    const totalStudents = enrolledStudents.length;
    const totalAssignments = assignments.length;

    // Calculate students per course
    const courseStudentCounts = {};
    enrolledStudents.forEach(student => {
      student.enrolledCourses.forEach(enrollment => {
        if (!enrollment.course) return; // Skip if course is null
        const courseId = enrollment.course.toString();
        if (courseIds.map(id => id.toString()).includes(courseId)) {
          courseStudentCounts[courseId] = (courseStudentCounts[courseId] || 0) + 1;
        }
      });
    });

    // Get recent activity
    const recentCourses = courses.slice(0, 5).map(course => ({
      id: course._id,
      title: course.title,
      studentsCount: courseStudentCounts[course._id.toString()] || 0,
      createdAt: course.createdAt,
      status: course.status || 'active'
    }));

    const recentAssignments = assignments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(assignment => ({
        id: assignment._id,
        title: assignment.title,
        course: assignment.course?.title || 'Unknown Course',
        dueDate: assignment.dueDate,
        createdAt: assignment.createdAt,
        type: 'assignment'
      }));

    // Combine recent activities and ensure it's always an array
    const combinedRecentActivity = [
      ...recentCourses.map(course => ({ ...course, type: 'course' })),
      ...recentAssignments
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: user.profile?.profilePicture,
          department: user.profile?.department,
          specialization: user.profile?.specialization
        },
        stats: {
          totalCourses,
          totalStudents,
          totalAssignments,
          avgRating: 4.5 // Placeholder - implement rating system
        },
        courses: courses.map(course => ({
          id: course._id,
          title: course.title,
          description: course.description,
          studentsCount: courseStudentCounts[course._id.toString()] || 0,
          createdAt: course.createdAt,
          status: course.status || 'active'
        })),
        recentActivity: combinedRecentActivity || [],
        recentCourses: recentCourses || [],
        recentAssignments: recentAssignments || []
      }
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

// @route   GET /api/dashboard/admin
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get('/admin', auth, asyncHandler(async (req, res) => {
  try {
    console.log('👨‍💼 Admin Dashboard API called for user:', req.user.id);
    const user = await User.findById(req.user.id);
    console.log('✅ User found:', user?.firstName, user?.lastName, '| Role:', user?.role);
    
    if (!user || user.role !== 'admin') {
      console.log('❌ Access denied - not admin');
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Get system-wide statistics
    console.log('📊 Fetching admin statistics...');
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalCourses = await Course.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    console.log('✅ Counts:', { totalUsers, totalStudents, totalTeachers, totalCourses, totalAssignments });

    // Get users created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailySignups = await User.countDocuments({
      createdAt: { $gte: today }
    });

    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });

    // Get recent activity
    const recentCourses = await Course.find()
      .populate('instructor', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email createdAt');

    const responseData = {
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: user.profile?.profilePicture
        },
        stats: {
          totalUsers,
          totalStudents,
          totalTeachers,
          totalCourses,
          totalAssignments,
          recentUsers,
          activeUsers,
          dailySignups
        },
        recentActivity: {
          courses: recentCourses
            .filter(course => course.instructor && course.instructor._id)
            .map(course => ({
              id: course._id,
              title: course.title,
              instructor: `${course.instructor.firstName} ${course.instructor.lastName}`,
              createdAt: course.createdAt
            })),
          students: recentStudents
            .filter(student => student && student._id)
            .map(student => ({
              id: student._id,
              name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            joinedAt: student.createdAt
          }))
        }
      }
    };
    console.log('📤 Admin Dashboard Stats:', JSON.stringify(responseData.data.stats, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching admin dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
}));

// @route   GET /api/dashboard/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // This is a placeholder - implement proper notification system
    const notifications = [
      {
        id: 1,
        type: 'assignment',
        title: 'New Assignment Available',
        message: 'A new assignment has been posted in Mathematics Course',
        createdAt: new Date(),
        read: false
      },
      {
        id: 2,
        type: 'grade',
        title: 'Grade Posted',
        message: 'Your assignment has been graded',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        read: false
      }
    ];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
}));

module.exports = router;
