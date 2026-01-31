const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Create test data
router.post('/create-test-data', async (req, res) => {
  try {
    // Create test teacher
    let teacher = await User.findOne({ email: 'teacher@test.com' });
    if (!teacher) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      teacher = await User.create({
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'teacher@test.com',
        password: hashedPassword,
        role: 'teacher'
      });
      console.log('Created test teacher');
    }

    // Create test student
    let student = await User.findOne({ email: 'student@test.com' });
    if (!student) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      student = await User.create({
        firstName: 'Test',
        lastName: 'Student',
        email: 'student@test.com',
        password: hashedPassword,
        role: 'student'
      });
      console.log('Created test student');
    }

    // Create test course
    let course = await Course.findOne({ title: 'Test Course' });
    if (!course) {
      course = await Course.create({
        title: 'Test Course',
        description: 'A test course for assignment testing',
        shortDescription: 'Test course',
        instructor: teacher._id,
        category: 'programming',
        level: 'beginner',
        price: 0,
        duration: 10,
        isPublished: true,
        isPaid: false
      });
      console.log('Created test course');
    }

    // Enroll student in course
    if (!student.enrolledCourses.some(enrollment => enrollment.course.toString() === course._id.toString())) {
      student.enrolledCourses.push({
        course: course._id,
        enrolledAt: new Date(),
        progress: 0
      });
      await student.save();
      console.log('Enrolled student in course');
    }

    // Create test assignment
    let assignment = await Assignment.findOne({ title: 'Test Assignment' });
    if (!assignment) {
      assignment = await Assignment.create({
        title: 'Test Assignment',
        description: 'A test assignment for testing purposes',
        instructions: 'Complete this test assignment',
        course: course._id,
        instructor: teacher._id,
        type: 'project',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isPublished: true,
        maxScore: 100
      });
      console.log('Created test assignment');
    }

    res.json({
      success: true,
      message: 'Test data created successfully',
      data: {
        teacher: { id: teacher._id, email: teacher.email },
        student: { id: student._id, email: student.email },
        course: { id: course._id, title: course.title },
        assignment: { id: assignment._id, title: assignment.title }
      }
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test data',
      error: error.message
    });
  }
});

// Get user enrollments
router.get('/user-enrollments/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('enrolledCourses.course', 'title code instructor')
      .populate('enrolledCourses.course.instructor', 'firstName lastName');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.fullName,
          role: user.role,
          enrolledCourses: user.enrolledCourses
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all assignments for debugging
router.get('/all-assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('course', 'title code')
      .populate('instructor', 'firstName lastName')
      .lean();

    res.json({
      success: true,
      data: {
        assignments,
        total: assignments.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually enroll student in course
router.post('/enroll-student', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    const student = await User.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
      return res.status(404).json({
        success: false,
        message: 'Student or course not found'
      });
    }

    // Check if already enrolled
    const isEnrolled = student.enrolledCourses.some(
      enrollment => enrollment.course.toString() === courseId
    );

    if (isEnrolled) {
      return res.json({
        success: true,
        message: 'Student already enrolled'
      });
    }

    // Enroll student
    student.enrolledCourses.push({
      course: courseId,
      enrolledAt: new Date(),
      progress: 0
    });

    await student.save();

    res.json({
      success: true,
      message: 'Student enrolled successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
