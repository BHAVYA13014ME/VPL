const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const { auth, isTeacher, isAdmin, checkCourseEnrollment } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadConfigs, getFilesInfo } = require('../middleware/upload');

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

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level'),
  query('sort').optional().isIn(['newest', 'oldest', 'popular', 'rating', 'price']).withMessage('Invalid sort option'),
  query('search').optional().isString().withMessage('Search must be a string')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  console.log('\n=== GET /api/courses ===');
  console.log('Query params:', req.query);
  console.log('Page:', page, 'Limit:', limit);
  
  // Build query - only filter published courses
  let query = { isPublished: true };
  
  if (req.query.category && req.query.category !== 'all') {
    query.category = req.query.category;
  }
  
  if (req.query.level && req.query.level !== 'all') {
    query.level = req.query.level;
  }
  
  if (req.query.search && req.query.search.trim()) {
    query.$text = { $search: req.query.search };
  }
  
  console.log('MongoDB query:', JSON.stringify(query));
  
  // Build sort
  let sort = {};
  switch (req.query.sort) {
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'oldest':
      sort = { createdAt: 1 };
      break;
    case 'popular':
      sort = { enrollmentCount: -1, 'rating.average': -1 };
      break;
    case 'rating':
      sort = { 'rating.average': -1, 'rating.count': -1 };
      break;
    case 'price':
      sort = { price: 1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  const courses = await Course.find(query)
    .select('-lessons.content -lessons.quiz -reviews')
    .populate('instructor', 'firstName lastName avatar')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Course.countDocuments(query);
  
  console.log('Found courses:', courses.length, 'Total:', total);
  console.log('Course IDs:', courses.map(c => c._id));

  res.json({
    success: true,
    data: {
      courses,
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

// @desc    Get popular courses
// @route   GET /api/courses/popular
// @access  Public
router.get('/popular', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const courses = await Course.getPopularCourses(limit);

  res.json({
    success: true,
    data: {
      courses
    }
  });
}));

// @desc    Get courses by category
// @route   GET /api/courses/category/:category
// @access  Public
router.get('/category/:category', asyncHandler(async (req, res) => {
  const { category } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  
  const courses = await Course.getCoursesByCategory(category, limit);

  res.json({
    success: true,
    data: {
      courses
    }
  });
}));

// @desc    Get my enrolled courses (for students)
// @route   GET /api/courses/my/enrolled
// @access  Private (Students)
router.get('/my/enrolled', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is for students only'
    });
  }

  const user = await User.findById(req.user._id)
    .populate({
      path: 'enrolledCourses.course',
      populate: {
        path: 'instructor',
        select: 'firstName lastName avatar'
      }
    });

  // Filter out null courses and map to proper format
  const courses = user.enrolledCourses
    .filter(enrollment => enrollment && enrollment.course)
    .map(enrollment => ({
      ...enrollment.course.toObject(),
      enrollmentInfo: {
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress,
        completedLessons: enrollment.completedLessons,
        grade: enrollment.grade
      }
    }));

  res.json({
    success: true,
    data: {
      courses
    }
  });
}));

// @desc    Get my courses (enrolled courses for students, created courses for teachers, all courses for admin)
// @route   GET /api/courses/my/courses  
// @access  Private
router.get('/my/courses', auth, asyncHandler(async (req, res) => {
  let courses;

  if (req.user.role === 'admin') {
    // Get all courses for admin with additional statistics
    courses = await Course.find()
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      data: {
        courses,
        totalCourses: courses.length,
        publishedCourses: courses.filter(course => course.isPublished).length,
        unpublishedCourses: courses.filter(course => !course.isPublished).length
      }
    });
  } else if (req.user.role === 'student') {
    // Get enrolled courses for students
    const user = await User.findById(req.user._id)
      .populate({
        path: 'enrolledCourses.course',
        populate: {
          path: 'instructor',
          select: 'firstName lastName avatar'
        }
      });

    // Filter out null courses and map to proper format
    courses = user.enrolledCourses
      .filter(enrollment => enrollment && enrollment.course)
      .map(enrollment => ({
        ...enrollment.course.toObject(),
        enrollmentInfo: {
          enrolledAt: enrollment.enrolledAt,
          progress: enrollment.progress,
          completedLessons: enrollment.completedLessons,
          grade: enrollment.grade
        }
      }));
  } else {
    // Get created courses for teachers
    courses = await Course.find({ instructor: req.user._id })
      .populate('instructor', 'firstName lastName avatar')
      .sort({ createdAt: -1 });
  }

  res.json({
    success: true,
    data: {
      courses
    }
  });
}));

// @desc    Bulk actions for courses (Admin only)
// @route   PUT /api/courses/bulk-action
// @access  Private (Admin only)
router.put('/bulk-action', auth, isAdmin, [
  body('action').isIn(['publish', 'unpublish', 'delete']).withMessage('Invalid action'),
  body('courseIds').isArray().withMessage('Course IDs must be an array')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { action, courseIds } = req.body;
  
  let updateOperation = {};
  let successMessage = '';
  
  switch (action) {
    case 'publish':
      updateOperation = { isPublished: true };
      successMessage = 'Courses published successfully';
      break;
    case 'unpublish':
      updateOperation = { isPublished: false };
      successMessage = 'Courses unpublished successfully';
      break;
    case 'delete':
      await Course.deleteMany({ _id: { $in: courseIds } });
      return res.json({
        success: true,
        message: 'Courses deleted successfully'
      });
  }
  
  const result = await Course.updateMany(
    { _id: { $in: courseIds } },
    updateOperation
  );
  
  res.json({
    success: true,
    message: successMessage,
    data: { modifiedCount: result.modifiedCount }
  });
}));

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('instructor', 'firstName lastName avatar profile experience teachingSubjects')
    .populate('reviews.user', 'firstName lastName avatar')
    .lean();

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // If course is not published and user is not the instructor or admin
  if (!course.isPublished && (!req.user || 
      (req.user._id.toString() !== course.instructor._id.toString() && req.user.role !== 'admin'))) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Hide quiz answers for students
  if (req.user && req.user.role === 'student') {
    course.lessons.forEach(lesson => {
      if (lesson.quiz && lesson.quiz.questions) {
        lesson.quiz.questions.forEach(question => {
          delete question.correctAnswer;
        });
      }
    });
  }

  res.json({
    success: true,
    data: {
      course
    }
  });
}));

// @desc    Create course
// @route   POST /api/courses/create
// @access  Private (Teacher/Admin)
router.post('/create', auth, isTeacher, uploadConfigs.courseMaterials, [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Course title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Course description must be between 20 and 2000 characters'),
  body('category')
    .isIn(['programming', 'design', 'business', 'marketing', 'photography', 'music', 'health', 'fitness', 'language', 'mathematics', 'science', 'other'])
    .withMessage('Invalid category'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid level'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const courseData = {
    ...req.body,
    instructor: req.user._id
  };

  // Handle file uploads
  if (req.files) {
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      courseData.thumbnail = `/uploads/${req.files.thumbnail[0].path.replace('uploads/', '')}`;
    }
    if (req.files.coverImage && req.files.coverImage[0]) {
      courseData.coverImage = `/uploads/${req.files.coverImage[0].path.replace('uploads/', '')}`;
    }
  }

  const course = await Course.create(courseData);
  
  await course.populate('instructor', 'firstName lastName avatar');

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: {
      course
    }
  });
}));

// @desc    Create course
// @route   POST /api/courses
// @access  Private (Teacher/Admin)
router.post('/', auth, isTeacher, uploadConfigs.courseMaterials, [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Course title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Course description must be between 20 and 2000 characters'),
  body('category')
    .isIn(['programming', 'design', 'business', 'marketing', 'photography', 'music', 'health', 'fitness', 'language', 'mathematics', 'science', 'other'])
    .withMessage('Invalid category'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid level'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const courseData = {
    ...req.body,
    instructor: req.user._id
  };

  // Handle file uploads
  if (req.files) {
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      courseData.thumbnail = `/uploads/${req.files.thumbnail[0].path.replace('uploads/', '')}`;
    }
    if (req.files.coverImage && req.files.coverImage[0]) {
      courseData.coverImage = `/uploads/${req.files.coverImage[0].path.replace('uploads/', '')}`;
    }
  }

  const course = await Course.create(courseData);
  
  await course.populate('instructor', 'firstName lastName avatar');

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: {
      course
    }
  });
}));

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Teacher/Admin - own courses only)
router.put('/:id', auth, isTeacher, uploadConfigs.courseMaterials, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Course title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Course description must be between 20 and 2000 characters')
], handleValidationErrors, asyncHandler(async (req, res) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor or admin
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this course'
    });
  }

  // Handle file uploads
  const updateData = { ...req.body };
  if (req.files) {
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      updateData.thumbnail = `/uploads/${req.files.thumbnail[0].path.replace('uploads/', '')}`;
    }
    if (req.files.coverImage && req.files.coverImage[0]) {
      updateData.coverImage = `/uploads/${req.files.coverImage[0].path.replace('uploads/', '')}`;
    }
  }

  course = await Course.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('instructor', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Course updated successfully',
    data: {
      course
    }
  });
}));

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Teacher/Admin - own courses only)
router.delete('/:id', auth, isTeacher, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor or admin
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this course'
    });
  }

  // Remove course from enrolled students
  await User.updateMany(
    { 'enrolledCourses.course': course._id },
    { $pull: { enrolledCourses: { course: course._id } } }
  );

  await Course.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
}));

// @desc    Enroll in course
// @route   POST /api/courses/:id/enroll
// @access  Private (Student)
router.post('/:id/enroll', auth, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (!course.isPublished) {
    return res.status(400).json({
      success: false,
      message: 'Course is not published yet'
    });
  }

  // Check enrollment limit
  if (course.enrollmentLimit && course.enrollmentCount >= course.enrollmentLimit) {
    return res.status(400).json({
      success: false,
      message: 'Course enrollment limit reached'
    });
  }

  const user = await User.findById(req.user._id);

  // Check if already enrolled
  const isAlreadyEnrolled = user.enrolledCourses.some(
    enrollment => enrollment.course.toString() === course._id.toString()
  );

  if (isAlreadyEnrolled) {
    return res.status(400).json({
      success: false,
      message: 'Already enrolled in this course'
    });
  }

  // Add course to user's enrolled courses
  user.enrolledCourses.push({
    course: course._id,
    enrolledAt: new Date(),
    progress: 0
  });

  await user.save();

  // Update course enrollment count
  await course.addEnrollment();

  res.json({
    success: true,
    message: 'Successfully enrolled in course',
    data: {
      courseId: course._id,
      enrolledAt: new Date()
    }
  });
}));

// @desc    Unenroll from course
// @route   DELETE /api/courses/:id/enroll
// @access  Private (Student)
router.delete('/:id/enroll', auth, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  const user = await User.findById(req.user._id);

  // Check if enrolled
  const enrollmentIndex = user.enrolledCourses.findIndex(
    enrollment => enrollment.course.toString() === course._id.toString()
  );

  if (enrollmentIndex === -1) {
    return res.status(400).json({
      success: false,
      message: 'Not enrolled in this course'
    });
  }

  // Remove course from user's enrolled courses
  user.enrolledCourses.splice(enrollmentIndex, 1);
  await user.save();

  // Update course enrollment count
  await course.removeEnrollment();

  res.json({
    success: true,
    message: 'Successfully unenrolled from course'
  });
}));

// @desc    Add/Update course review
// @route   POST /api/courses/:id/review
// @access  Private (Enrolled students only)
router.post('/:id/review', auth, checkCourseEnrollment, [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user already reviewed
  const existingReviewIndex = course.reviews.findIndex(
    review => review.user.toString() === req.user._id.toString()
  );

  if (existingReviewIndex !== -1) {
    // Update existing review
    course.reviews[existingReviewIndex].rating = rating;
    course.reviews[existingReviewIndex].comment = comment;
    course.reviews[existingReviewIndex].createdAt = new Date();
  } else {
    // Add new review
    course.reviews.push({
      user: req.user._id,
      rating,
      comment
    });
  }

  // Update course rating
  await course.updateRating();

  res.json({
    success: true,
    message: existingReviewIndex !== -1 ? 'Review updated successfully' : 'Review added successfully',
    data: {
      rating: course.rating
    }
  });
}));

// @desc    Get students enrolled in a course
// @route   GET /api/courses/:id/students
// @access  Private (Teacher/Instructor, Admin, or Enrolled Student)
router.get('/:id/students', auth, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user has permission to view students
  const isInstructor = course.instructor.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isTeacher = req.user.role === 'teacher';
  
  // Check if user is enrolled in this course (for students)
  const isEnrolledStudent = req.user.role === 'student' && 
    req.user.enrolledCourses.some(enrollment => 
      enrollment.course.toString() === req.params.id
    );
  
  if (!isInstructor && !isAdmin && !isTeacher && !isEnrolledStudent) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You must be enrolled in this course to view students.'
    });
  }

  // Find all students enrolled in this course
  const students = await User.find({
    'enrolledCourses.course': course._id,
    role: 'student'
  }).select('firstName lastName email avatar profile');

  res.json({
    success: true,
    data: students
  });
}));

// @desc    Add module/lesson to course
// @route   POST /api/courses/:id/lessons
// @access  Private (Teacher/Instructor only)
router.post('/:id/lessons', auth, isTeacher, uploadConfigs.courseMaterials, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Lesson title is required and cannot exceed 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Lesson content is required'),
  body('type')
    .optional()
    .isIn(['video', 'text', 'pdf', 'interactive', 'quiz'])
    .withMessage('Invalid lesson type')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to add lessons to this course'
    });
  }

  const lessonData = {
    title: req.body.title,
    description: req.body.description || '',
    content: req.body.content,
    type: req.body.type || 'text',
    duration: parseInt(req.body.duration) || 0,
    order: course.lessons.length + 1,
    isPublished: req.body.isPublished === 'true' || req.body.isPublished === true
  };

  // Handle file uploads
  if (req.files) {
    if (req.files.video && req.files.video[0]) {
      lessonData.videoUrl = `/uploads/${req.files.video[0].path.replace(/\\/g, '/').replace('uploads/', '')}`;
    }
    if (req.files.pdf && req.files.pdf[0]) {
      lessonData.pdfUrl = `/uploads/${req.files.pdf[0].path.replace(/\\/g, '/').replace('uploads/', '')}`;
    }
  }

  // Handle resources
  if (req.body.resources) {
    try {
      lessonData.resources = JSON.parse(req.body.resources);
    } catch (e) {
      lessonData.resources = [];
    }
  }

  // Handle quiz if type is quiz
  if (req.body.type === 'quiz' && req.body.quiz) {
    try {
      lessonData.quiz = JSON.parse(req.body.quiz);
    } catch (e) {
      lessonData.quiz = { questions: [], passingScore: 70, timeLimit: 30 };
    }
  }

  course.lessons.push(lessonData);
  await course.save();

  res.status(201).json({
    success: true,
    message: 'Lesson added successfully',
    data: {
      lesson: course.lessons[course.lessons.length - 1]
    }
  });
}));

// @desc    Update module/lesson in course
// @route   PUT /api/courses/:id/lessons/:lessonId
// @access  Private (Teacher/Instructor only)
router.put('/:id/lessons/:lessonId', auth, isTeacher, uploadConfigs.courseMaterials, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update lessons in this course'
    });
  }

  const lessonIndex = course.lessons.findIndex(l => l._id.toString() === req.params.lessonId);
  if (lessonIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Update lesson fields
  const updateFields = ['title', 'description', 'content', 'type', 'duration', 'order', 'isPublished'];
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'isPublished') {
        course.lessons[lessonIndex][field] = req.body[field] === 'true' || req.body[field] === true;
      } else if (field === 'duration' || field === 'order') {
        course.lessons[lessonIndex][field] = parseInt(req.body[field]) || course.lessons[lessonIndex][field];
      } else {
        course.lessons[lessonIndex][field] = req.body[field];
      }
    }
  });

  // Handle file uploads
  if (req.files) {
    if (req.files.video && req.files.video[0]) {
      course.lessons[lessonIndex].videoUrl = `/uploads/${req.files.video[0].path.replace(/\\/g, '/').replace('uploads/', '')}`;
    }
    if (req.files.pdf && req.files.pdf[0]) {
      course.lessons[lessonIndex].pdfUrl = `/uploads/${req.files.pdf[0].path.replace(/\\/g, '/').replace('uploads/', '')}`;
    }
  }

  // Handle resources
  if (req.body.resources) {
    try {
      course.lessons[lessonIndex].resources = JSON.parse(req.body.resources);
    } catch (e) {}
  }

  // Handle quiz
  if (req.body.quiz) {
    try {
      course.lessons[lessonIndex].quiz = JSON.parse(req.body.quiz);
    } catch (e) {}
  }

  await course.save();

  res.json({
    success: true,
    message: 'Lesson updated successfully',
    data: {
      lesson: course.lessons[lessonIndex]
    }
  });
}));

// @desc    Delete module/lesson from course
// @route   DELETE /api/courses/:id/lessons/:lessonId
// @access  Private (Teacher/Instructor only)
router.delete('/:id/lessons/:lessonId', auth, isTeacher, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete lessons from this course'
    });
  }

  const lessonIndex = course.lessons.findIndex(l => l._id.toString() === req.params.lessonId);
  if (lessonIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  course.lessons.splice(lessonIndex, 1);
  
  // Re-order remaining lessons
  course.lessons.forEach((lesson, index) => {
    lesson.order = index + 1;
  });

  await course.save();

  res.json({
    success: true,
    message: 'Lesson deleted successfully'
  });
}));

// @desc    Reorder lessons in course
// @route   PUT /api/courses/:id/lessons/reorder
// @access  Private (Teacher/Instructor only)
router.put('/:id/lessons/reorder', auth, isTeacher, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to reorder lessons in this course'
    });
  }

  const { lessonOrder } = req.body; // Array of lesson IDs in new order

  if (!Array.isArray(lessonOrder)) {
    return res.status(400).json({
      success: false,
      message: 'lessonOrder must be an array of lesson IDs'
    });
  }

  // Reorder lessons
  const reorderedLessons = [];
  lessonOrder.forEach((lessonId, index) => {
    const lesson = course.lessons.find(l => l._id.toString() === lessonId);
    if (lesson) {
      lesson.order = index + 1;
      reorderedLessons.push(lesson);
    }
  });

  course.lessons = reorderedLessons;
  await course.save();

  res.json({
    success: true,
    message: 'Lessons reordered successfully',
    data: {
      lessons: course.lessons
    }
  });
}));

// @desc    Mark lesson as complete
// @route   POST /api/courses/:id/lessons/:lessonId/complete
// @access  Private (Enrolled students only)
router.post('/:id/lessons/:lessonId/complete', auth, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is enrolled in the course
  const user = await User.findById(req.user._id);
  const enrollment = user.enrolledCourses.find(
    ec => ec.course.toString() === course._id.toString()
  );

  if (!enrollment) {
    return res.status(403).json({
      success: false,
      message: 'You must be enrolled in this course to mark lessons as complete'
    });
  }

  // Check if lesson exists
  const lesson = course.lessons.find(l => l._id.toString() === req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Initialize completedLessons array if it doesn't exist
  if (!enrollment.completedLessons) {
    enrollment.completedLessons = [];
  }

  // Check if already completed
  if (enrollment.completedLessons.includes(req.params.lessonId)) {
    return res.json({
      success: true,
      message: 'Lesson already marked as complete',
      data: {
        progress: enrollment.progress,
        completedLessons: enrollment.completedLessons
      }
    });
  }

  // Mark lesson as complete
  enrollment.completedLessons.push(req.params.lessonId);

  // Calculate progress
  const totalLessons = course.lessons.length;
  const completedCount = enrollment.completedLessons.length;
  enrollment.progress = Math.round((completedCount / totalLessons) * 100);

  await user.save();

  // Award points for completing a lesson (gamification)
  if (user.gamification) {
    user.gamification.points = (user.gamification.points || 0) + 10;
    await user.save();
  }

  res.json({
    success: true,
    message: 'Lesson marked as complete',
    data: {
      progress: enrollment.progress,
      completedLessons: enrollment.completedLessons,
      pointsEarned: 10
    }
  });
}));

// @desc    Add announcement to course
// @route   POST /api/courses/:id/announcements
// @access  Private (Teacher/Instructor only)
router.post('/:id/announcements', auth, isTeacher, uploadConfigs.courseMaterials, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Announcement title is required'),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Announcement content is required')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to add announcements to this course'
    });
  }

  const announcementData = {
    title: req.body.title,
    content: req.body.content,
    isImportant: req.body.isImportant === 'true' || req.body.isImportant === true,
    createdAt: new Date()
  };

  // Handle file attachments
  if (req.files && req.files.attachments) {
    announcementData.attachments = req.files.attachments.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.path.replace(/\\/g, '/').replace('uploads/', '')}`,
      size: file.size,
      mimeType: file.mimetype
    }));
  }

  course.announcements.push(announcementData);
  await course.save();

  res.status(201).json({
    success: true,
    message: 'Announcement created successfully',
    data: {
      announcement: course.announcements[course.announcements.length - 1]
    }
  });
}));

// @desc    Get course announcements
// @route   GET /api/courses/:id/announcements
// @access  Private (Enrolled users)
router.get('/:id/announcements', auth, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).select('announcements instructor');

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  res.json({
    success: true,
    data: {
      announcements: course.announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  });
}));

// @desc    Delete announcement from course
// @route   DELETE /api/courses/:id/announcements/:announcementId
// @access  Private (Teacher/Instructor only)
router.delete('/:id/announcements/:announcementId', auth, isTeacher, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is the instructor
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete announcements from this course'
    });
  }

  const announcementIndex = course.announcements.findIndex(a => a._id.toString() === req.params.announcementId);
  if (announcementIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found'
    });
  }

  course.announcements.splice(announcementIndex, 1);
  await course.save();

  res.json({
    success: true,
    message: 'Announcement deleted successfully'
  });
}));

// @desc    Toggle course publish status (Admin only)
// @route   PUT /api/courses/:id/toggle-publish
// @access  Private (Admin only)
router.put('/:id/toggle-publish', auth, isAdmin, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  course.isPublished = !course.isPublished;
  await course.save();

  res.json({
    success: true,
    message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`,
    data: { course }
  });
}));

// @desc    Get course analytics (Admin/Teacher)
// @route   GET /api/courses/:id/analytics
// @access  Private (Admin/Teacher)
router.get('/:id/analytics', auth, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('enrolledStudents', 'firstName lastName email enrolledAt')
    .populate('instructor', 'firstName lastName email');

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is instructor or admin
  if (req.user.role !== 'admin' && course.instructor._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Calculate analytics
  const totalEnrollments = course.enrolledStudents.length;
  const completionRate = course.enrolledStudents.filter(student => 
    student.progress && student.progress.completedLessons.length === course.lessons.length
  ).length;
  
  const averageRating = course.reviews.length > 0 
    ? course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length 
    : 0;

  res.json({
    success: true,
    data: {
      totalEnrollments,
      completionRate: Math.round((completionRate / totalEnrollments) * 100) || 0,
      averageRating: Math.round(averageRating * 10) / 10,
      totalLessons: course.lessons.length,
      totalReviews: course.reviews.length
    }
  });
}));

module.exports = router;
