const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { updateUserLeaderboard } = require('../utils/leaderboardUpdater');

// @desc    Create new assignment
// @route   POST /api/assignments/create
// @access  Private (Teachers only)
const createAssignment = async (req, res) => {
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

    const { title, description, instructions, dueDate, courseId, attachment, type } = req.body;

    // Verify that the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if the user is the instructor of this course
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create assignments for courses you teach'
      });
    }

    // Create assignment object
    const assignmentData = {
      title,
      description: description || title, // Use title as fallback for description
      instructions: instructions || description || 'Please complete this assignment as described.', // Use instructions, description, or default
      dueDate: new Date(dueDate),
      course: courseId, // Map courseId to course field
      instructor: req.user._id, // createdBy from JWT (maps to instructor field)
      type,
      createdAt: new Date(),
      isPublished: true // Always publish on creation
    };

    // Handle file attachments from multer
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      assignmentData.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: `/${file.path.replace(/\\/g, '/')}`,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      }));
    } else if (attachment) {
      // Fallback for string attachment URL
      assignmentData.attachments = [{
        filename: attachment,
        originalName: attachment,
        path: attachment,
        uploadedAt: new Date()
      }];
    }

    // Create and save assignment
    const assignment = new Assignment(assignmentData);
    const savedAssignment = await assignment.save();

    // Populate the assignment with course and instructor details for response
    const populatedAssignment = await Assignment.findById(savedAssignment._id)
      .populate('course', 'title code')
      .populate('instructor', 'firstName lastName email')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: {
        assignment: populatedAssignment
      }
    });

  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all assignments for a course
// @route   GET /api/assignments/course/:courseId
// @access  Private (Students enrolled in course, Teachers, Admins)
const getAssignmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user has access to this course
    if (req.user.role === 'student') {
      const isEnrolled = req.user.enrolledCourses.some(enrollment => {
        if (!enrollment) return false;
        const course = enrollment.course;
        // If populated, course may be an object
        if (course && typeof course === 'object' && course._id) {
          return course._id.toString() === courseId.toString();
        }
        return course.toString() === courseId.toString();
      });
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this course'
        });
      }
    } else if (req.user.role === 'teacher') {
      if (course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view assignments for courses you teach'
        });
      }
    }

    // Get assignments
    let query = { course: courseId };
    
    // Only show published assignments to students
    if (req.user.role === 'student') {
      query.isPublished = true;
    }

    const assignments = await Assignment.find(query)
      .populate('instructor', 'firstName lastName')
      .sort({ dueDate: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        assignments,
        total: assignments.length
      }
    });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get single assignment by ID
// @route   GET /api/assignments/:id
// @access  Private (Enrolled students, Teachers, Admins)
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id)
      .populate('course', 'title code')
      .populate('instructor', 'firstName lastName email')
      .populate('submissions.student', 'firstName lastName email')
      .lean();

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student') {
      // Check if student is enrolled in the course (handle populated or raw course values)
      const isEnrolled = req.user.enrolledCourses.some(enrollment => {
        if (!enrollment || !enrollment.course) return false;
        const course = enrollment.course;
        if (course && typeof course === 'object' && course._id) {
          return course._id.toString() === assignment.course._id.toString();
        }
        return course.toString() === assignment.course._id.toString();
      });
      
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this course'
        });
      }

      // Check if assignment is published
      if (!assignment.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
      }

      // For students, only show their own submission
      const userSubmission = assignment.submissions.find(
        sub => sub.student._id.toString() === req.user._id.toString()
      );
      
      assignment.userSubmission = userSubmission || null;
      assignment.submissions = []; // Hide other submissions
    }

    res.json({
      success: true,
      data: {
        assignment
      }
    });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Teachers who created the assignment, Admins)
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user can update this assignment
    if (req.user.role === 'teacher' && assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update assignments you created'
      });
    }

    // Update assignment
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('course', 'title code')
    .populate('instructor', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: {
        assignment: updatedAssignment
      }
    });

  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Teachers who created the assignment, Admins)
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user can delete this assignment
    if (req.user.role === 'teacher' && assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete assignments you created'
      });
    }

    await Assignment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all assignments created by teacher
// @route   GET /api/assignments/my-assignments
// @access  Private (Teachers only)
const getMyAssignments = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is for teachers only'
      });
    }

    // Get assignments created by the teacher
    const assignments = await Assignment.find({ instructor: req.user._id })
      .populate('course', 'title code')
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        assignments,
        total: assignments.length
      }
    });

  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all assignments for a student across all enrolled courses
// @route   GET /api/assignments/my/assignments
// @access  Private (Students only)
const getMyStudentAssignments = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is for students only'
      });
    }

    // Debug: Log enrolled courses
    console.log('Student enrolledCourses:', req.user.enrolledCourses);
    
    // Normalize enrolled course ids: support both populated course objects and raw ObjectId
    const enrolledCourseIds = (req.user.enrolledCourses || [])
      .map(enrollment => {
        if (!enrollment) return null;
        const course = enrollment.course;
        // If populated (object with _id property), extract the _id
        if (course && typeof course === 'object' && course._id) {
          return course._id.toString();
        }
        // Otherwise assume it's already an ObjectId or string
        if (course) {
          return course.toString();
        }
        return null;
      })
      .filter(Boolean);

    console.log('Extracted enrolledCourseIds:', enrolledCourseIds);

    if (enrolledCourseIds.length === 0) {
      console.log('Student is not enrolled in any courses.');
      return res.json({
        success: true,
        data: {
          assignments: [],
          total: 0
        }
      });
    }

    // Debug: Log assignment query
    console.log('Querying assignments for courses:', enrolledCourseIds);
    const assignments = await Assignment.find({ 
      course: { $in: enrolledCourseIds },
      isPublished: true 
    })
      .populate('course', 'title code')
      .populate('instructor', 'firstName lastName email')
      .sort({ dueDate: 1 })
      .lean();

    // Debug: Log found assignments
    console.log('Found assignments count:', assignments.length);

    // Add submission status for each assignment
    const assignmentsWithStatus = assignments.map(assignment => {
      const submissions = assignment.submissions || [];
      const userSubmission = submissions.find(
        sub => sub.student && sub.student.toString() === req.user._id.toString()
      );
      
      return {
        ...assignment,
        userSubmission: userSubmission || null,
        isSubmitted: !!userSubmission,
        isOverdue: new Date() > new Date(assignment.dueDate),
        submissions: [] // Hide other submissions from student view
      };
    });

    res.json({
      success: true,
      data: {
        assignments: assignmentsWithStatus,
        total: assignmentsWithStatus.length
      }
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Students only)
const submitAssignment = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit assignments'
      });
    }

    const { id } = req.params;
    const { content } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if student is enrolled in the course (handle populated or raw course values)
    const isEnrolled = req.user.enrolledCourses.some(enrollment => {
      if (!enrollment || !enrollment.course) return false;
      const course = enrollment.course;
      if (typeof course === 'object' && course._id) {
        return course._id.toString() === assignment.course.toString();
      }
      return course.toString() === assignment.course.toString();
    });

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check if assignment is still open for submissions
    if (new Date() > new Date(assignment.dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Assignment due date has passed'
      });
    }

    // Process uploaded files
    const attachments = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: `/${file.path.replace(/\\/g, '/')}`,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        });
      });
    }

    // Check if student has already submitted
    const existingSubmissionIndex = assignment.submissions.findIndex(
      sub => sub.student.toString() === req.user._id.toString()
    );

    const submission = {
      student: req.user._id,
      content: content || '',
      attachments: attachments,
      submittedAt: new Date(),
      status: 'submitted'
    };

    if (existingSubmissionIndex !== -1) {
      // Update existing submission
      assignment.submissions[existingSubmissionIndex] = submission;
    } else {
      // Add new submission
      assignment.submissions.push(submission);
    }

    await assignment.save();

    // Update leaderboard for assignment submission
    try {
      await updateUserLeaderboard(req.user._id, 'assignment_submitted', {});
    } catch (leaderboardError) {
      console.error('Error updating leaderboard:', leaderboardError);
      // Don't fail the submission if leaderboard update fails
    }

    res.json({
      success: true,
      message: 'Assignment submitted successfully',
      data: {
        submission
      }
    });

  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all submissions for an assignment (Teacher view)
// @route   GET /api/assignments/:id/submissions
// @access  Private (Teachers only)
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id)
      .populate({
        path: 'submissions.student',
        select: 'firstName lastName email avatar'
      })
      .populate('course', 'title')
      .lean();

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user is the instructor of this assignment's course
    if (req.user.role === 'teacher' && assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view submissions for your own assignments'
      });
    }

    res.json({
      success: true,
      data: {
        assignment: {
          _id: assignment._id,
          title: assignment.title,
          course: assignment.course,
          dueDate: assignment.dueDate,
          maxScore: assignment.maxScore
        },
        submissions: assignment.submissions || []
      }
    });

  } catch (error) {
    console.error('Error fetching assignment submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submissions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createAssignment,
  getAssignmentsByCourse,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getMyAssignments,
  getMyStudentAssignments,
  getAssignmentSubmissions
};
