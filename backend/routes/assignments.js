const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, isTeacher, isAdmin } = require('../middleware/auth');
const { uploadConfigs } = require('../middleware/upload');
const router = express.Router();

// Debug route: Enroll a student in a course (for testing)
// Usage: POST /api/assignments/enroll-student
// Body: { "studentEmail": "student@example.com", "courseTitle": "Business Administration" }
router.post('/enroll-student', async (req, res) => {
  try {
    const { studentEmail, courseTitle } = req.body;
    if (!studentEmail || !courseTitle) {
      return res.status(400).json({ success: false, message: 'studentEmail and courseTitle required' });
    }
    const User = require('../models/User');
    const Course = require('../models/Course');
    const student = await User.findOne({ email: studentEmail });
    const course = await Course.findOne({ title: courseTitle });
    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or course not found' });
    }
    // Check if already enrolled
    const alreadyEnrolled = student.enrolledCourses.some(ec => ec.course.toString() === course._id.toString());
    if (!alreadyEnrolled) {
      student.enrolledCourses.push({ course: course._id });
      await student.save();
    }
    res.json({ success: true, message: 'Student enrolled in course', studentId: student._id, courseId: course._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import assignment controller
const { 
  createAssignment, 
  getAssignmentsByCourse, 
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getMyAssignments,
  getMyStudentAssignments,
  getAssignmentSubmissions
} = require('../controllers/assignmentController');

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

// @desc    Create assignment
// @route   POST /api/assignments/create
// @access  Private (Teachers only)
router.post('/create', auth, isTeacher, uploadConfigs.assignmentFiles, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Assignment title is required and cannot exceed 200 characters'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required (ISO 8601 format)'),
  body('courseId')
    .isMongoId()
    .withMessage('Valid course ID is required'),
  body('type')
    .isIn(['essay', 'project', 'quiz', 'code'])
    .withMessage('Type must be one of: essay, project, quiz, code')
], handleValidationErrors, createAssignment);

// @desc    Get assignments by course
// @route   GET /api/assignments/course/:courseId
// @access  Private (Enrolled students, teachers, admins)
router.get('/course/:courseId', auth, getAssignmentsByCourse);

// @desc    Get all assignments (admin view)
// @route   GET /api/assignments
// @access  Private (Admins only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const Assignment = require('../models/Assignment');
    const assignments = await Assignment.find()
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        assignments,
        total: assignments.length
      }
    });
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching assignments',
      error: error.message 
    });
  }
});

// @desc    Get my assignments (teacher view)
// @route   GET /api/assignments/my-assignments
// @access  Private (Teachers only)
router.get('/my-assignments', auth, isTeacher, getMyAssignments);

// @desc    Get my assignments (student view)
// @route   GET /api/assignments/my/assignments
// @access  Private (Students only)
router.get('/my/assignments', auth, getMyStudentAssignments);

// @desc    Get single assignment by ID
// @route   GET /api/assignments/:id
// @access  Private (Enrolled students, teachers, admins)
router.get('/:id', auth, getAssignmentById);

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Teachers who created it, admins)
router.put('/:id', auth, isTeacher, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Valid due date required (ISO 8601 format)'),
  body('type')
    .optional()
    .isIn(['essay', 'project', 'quiz', 'code'])
    .withMessage('Type must be one of: essay, project, quiz, code')
], handleValidationErrors, updateAssignment);

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Teachers who created it, admins)
router.delete('/:id', auth, isTeacher, deleteAssignment);

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Students only)
router.post('/:id/submit', auth, uploadConfigs.assignmentFiles, submitAssignment);

// @desc    Get all submissions for an assignment
// @route   GET /api/assignments/:id/submissions
// @access  Private (Teachers only)
router.get('/:id/submissions', auth, isTeacher, getAssignmentSubmissions);

module.exports = router;
