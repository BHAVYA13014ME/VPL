const Course = require('../models/Course');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { validationResult } = require('express-validator');
const { updateUserLeaderboard } = require('../utils/leaderboardUpdater');

// @desc    Create new course
// @route   POST /api/courses/create
// @access  Private (Teachers only)
const createCourse = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      shortDescription,
      category,
      level = 'beginner',
      price = 0,
      duration = 0,
      prerequisites,
      learningOutcomes,
      tags,
      language = 'English',
      thumbnail,
      coverImage,
      isPublished = false,
      isPaid = false,
      enrollmentLimit
    } = req.body;

    // Create course object
    const courseData = {
      title,
      description,
      shortDescription,
      instructor: req.user._id,
      category,
      level,
      price,
      duration,
      prerequisites: prerequisites || [],
      learningOutcomes: learningOutcomes || [],
      tags: tags || [],
      language,
      thumbnail: thumbnail || '',
      coverImage: coverImage || '',
      isPublished,
      isPaid,
      enrollmentLimit,
      createdAt: new Date()
    };

    // Create and save course
    const course = new Course(courseData);
    const savedCourse = await course.save();

    // Populate the course with instructor details for response
    const populatedCourse = await Course.findById(savedCourse._id)
      .populate('instructor', 'firstName lastName email avatar profile')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        course: populatedCourse
      }
    });

  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating course',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all courses with filters and pagination
// @route   GET /api/courses
// @access  Public
const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = { isPublished: true };
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.level) {
      query.level = req.query.level;
    }
    
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
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
      .populate('instructor', 'firstName lastName avatar profile')
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Course.countDocuments(query);

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

  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .populate('instructor', 'firstName lastName email avatar profile experience teachingSubjects')
      .populate('reviews.user', 'firstName lastName avatar')
      .populate('assignments')
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

    // Check if user is enrolled (for students)
    let isEnrolled = false;
    if (req.user && req.user.role === 'student') {
      const user = await User.findById(req.user._id);
      isEnrolled = user.enrolledCourses.some(
        enrollment => enrollment.course.toString() === course._id.toString()
      );
    }

    res.json({
      success: true,
      data: {
        course: {
          ...course,
          isEnrolled
        }
      }
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Course instructor or admin)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can update this course
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update courses you created'
      });
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('instructor', 'firstName lastName email avatar profile');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: {
        course: updatedCourse
      }
    });

  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating course',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Course instructor or admin)
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can delete this course
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete courses you created'
      });
    }

    // Remove course from enrolled students
    await User.updateMany(
      { 'enrolledCourses.course': course._id },
      { $pull: { enrolledCourses: { course: course._id } } }
    );

    // Delete related assignments
    await Assignment.deleteMany({ course: course._id });

    await Course.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting course',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get courses created by teacher
// @route   GET /api/courses/my/courses
// @access  Private (Teachers only)
const getMyCourses = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is for teachers only'
      });
    }

    // Get courses created by the teacher
    const courses = await Course.find({ instructor: req.user._id })
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Get enrollment counts and recent activity for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const enrolledStudents = await User.countDocuments({
          'enrolledCourses.course': course._id
        });

        const recentAssignments = await Assignment.find({ course: course._id })
          .sort({ createdAt: -1 })
          .limit(3)
          .select('title createdAt');

        return {
          ...course,
          stats: {
            enrolledStudents,
            totalLessons: course.lessons ? course.lessons.length : 0,
            publishedLessons: course.lessons ? course.lessons.filter(l => l.isPublished).length : 0,
            recentAssignments
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        courses: coursesWithStats,
        total: coursesWithStats.length
      }
    });

  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get enrolled courses for student
// @route   GET /api/courses/my/enrolled
// @access  Private (Students only)
const getEnrolledCourses = async (req, res) => {
  try {
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
          select: 'firstName lastName avatar profile'
        }
      });

    const enrolledCourses = user.enrolledCourses.map(enrollment => ({
      ...enrollment.course.toObject(),
      enrollmentInfo: {
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress || 0,
        completedLessons: enrollment.completedLessons || [],
        grade: enrollment.grade || null,
        lastAccessed: enrollment.lastAccessed || enrollment.enrolledAt
      }
    }));

    res.json({
      success: true,
      data: {
        courses: enrolledCourses,
        total: enrolledCourses.length
      }
    });

  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrolled courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Enroll in course
// @route   POST /api/courses/:id/enroll
// @access  Private (Students only)
const enrollInCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
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
      progress: 0,
      completedLessons: [],
      lastAccessed: new Date()
    });

    await user.save();

    // Update course enrollment count
    await course.addEnrollment();

    // Update leaderboard for course enrollment
    try {
      await updateUserLeaderboard(req.user._id, 'course_enrolled', {});
    } catch (leaderboardError) {
      console.error('Error updating leaderboard:', leaderboardError);
      // Don't fail enrollment if leaderboard update fails
    }

    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      data: {
        courseId: course._id,
        enrolledAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while enrolling in course',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Unenroll from course
// @route   DELETE /api/courses/:id/unenroll
// @access  Private (Students only)
const unenrollFromCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
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

  } catch (error) {
    console.error('Error unenrolling from course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unenrolling from course',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get popular courses
// @route   GET /api/courses/popular
// @access  Public
const getPopularCourses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const courses = await Course.getPopularCourses(limit);

    res.json({
      success: true,
      data: {
        courses
      }
    });

  } catch (error) {
    console.error('Error fetching popular courses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching popular courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get courses by category
// @route   GET /api/courses/category/:category
// @access  Public
const getCoursesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const courses = await Course.getCoursesByCategory(category, limit);

    res.json({
      success: true,
      data: {
        courses
      }
    });

  } catch (error) {
    console.error('Error fetching courses by category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses by category',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Search courses
// @route   GET /api/courses/search
// @access  Public
const searchCourses = async (req, res) => {
  try {
    const { q: query, category, level, page = 1, limit = 12 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build search query
    let searchQuery = {
      isPublished: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (category) {
      searchQuery.category = category;
    }

    if (level) {
      searchQuery.level = level;
    }

    const courses = await Course.find(searchQuery)
      .select('-lessons.content -lessons.quiz -reviews')
      .populate('instructor', 'firstName lastName avatar')
      .sort({ enrollmentCount: -1, 'rating.average': -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Course.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        courses,
        searchQuery: query,
        filters: { category, level },
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error searching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Add course review
// @route   POST /api/courses/:id/review
// @access  Private (Enrolled students only)
const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled
    const user = await User.findById(req.user._id);
    const isEnrolled = user.enrolledCourses.some(
      enrollment => enrollment.course.toString() === course._id.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to leave a review'
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
        comment,
        createdAt: new Date()
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

  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get course reviews
// @route   GET /api/courses/:id/reviews
// @access  Public
const getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const course = await Course.findById(id)
      .populate({
        path: 'reviews.user',
        select: 'firstName lastName avatar'
      })
      .select('reviews rating')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Paginate reviews
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviews = course.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        reviews: paginatedReviews,
        rating: course.rating,
        pagination: {
          current: page,
          pages: Math.ceil(course.reviews.length / limit),
          total: course.reviews.length,
          hasNext: endIndex < course.reviews.length,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get course statistics
// @route   GET /api/courses/:id/stats
// @access  Private (Course instructor or admin)
const getCourseStats = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can view stats
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get enrollment statistics
    const enrolledStudents = await User.find({
      'enrolledCourses.course': course._id
    }).select('firstName lastName email enrolledCourses');

    // Calculate progress statistics
    const progressStats = enrolledStudents.map(student => {
      const enrollment = student.enrolledCourses.find(
        e => e.course.toString() === course._id.toString()
      );
      return {
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        progress: enrollment.progress || 0,
        enrolledAt: enrollment.enrolledAt,
        completedLessons: enrollment.completedLessons ? enrollment.completedLessons.length : 0
      };
    });

    const averageProgress = progressStats.length > 0 
      ? progressStats.reduce((sum, p) => sum + p.progress, 0) / progressStats.length 
      : 0;

    // Get assignment statistics
    const assignments = await Assignment.find({ course: course._id });
    const totalAssignments = assignments.length;

    res.json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
          enrollmentCount: course.enrollmentCount,
          rating: course.rating,
          totalLessons: course.lessons ? course.lessons.length : 0,
          publishedLessons: course.lessons ? course.lessons.filter(l => l.isPublished).length : 0
        },
        enrollmentStats: {
          totalEnrolled: enrolledStudents.length,
          averageProgress: Math.round(averageProgress),
          completionRate: progressStats.filter(p => p.progress >= 100).length,
          progressDistribution: {
            notStarted: progressStats.filter(p => p.progress === 0).length,
            inProgress: progressStats.filter(p => p.progress > 0 && p.progress < 100).length,
            completed: progressStats.filter(p => p.progress >= 100).length
          }
        },
        assignmentStats: {
          totalAssignments,
          averageSubmissions: totalAssignments > 0 ? assignments.reduce((sum, a) => sum + (a.submissions ? a.submissions.length : 0), 0) / totalAssignments : 0
        },
        students: progressStats,
        recentActivity: enrolledStudents
          .sort((a, b) => {
            const aEnrollment = a.enrolledCourses.find(e => e.course.toString() === course._id.toString());
            const bEnrollment = b.enrolledCourses.find(e => e.course.toString() === course._id.toString());
            return new Date(bEnrollment.enrolledAt) - new Date(aEnrollment.enrolledAt);
          })
          .slice(0, 10)
          .map(student => {
            const enrollment = student.enrolledCourses.find(e => e.course.toString() === course._id.toString());
            return {
              studentName: `${student.firstName} ${student.lastName}`,
              action: 'enrolled',
              date: enrollment.enrolledAt
            };
          })
      }
    });

  } catch (error) {
    console.error('Error fetching course stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getMyCourses,
  getEnrolledCourses,
  enrollInCourse,
  unenrollFromCourse,
  getPopularCourses,
  getCoursesByCategory,
  searchCourses,
  addReview,
  getReviews,
  getCourseStats
};
