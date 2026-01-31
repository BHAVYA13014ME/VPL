const express = require('express');
const { body, validationResult } = require('express-validator');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const { auth, isTeacher } = require('../middleware/auth');
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

// @desc    Create quiz
// @route   POST /api/quizzes
// @access  Private (Teachers only)
router.post('/', auth, isTeacher, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Quiz title is required and cannot exceed 200 characters'),
  body('courseId')
    .isMongoId()
    .withMessage('Valid course ID is required'),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { title, description, instructions, courseId, questions, settings, startDate, endDate } = req.body;

  // Verify course exists and user is instructor
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to create quiz for this course'
    });
  }

  // Process questions
  const processedQuestions = questions.map((q, index) => ({
    question: q.question,
    type: q.type || 'multiple_choice',
    options: q.options || [],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    points: q.points || 1,
    order: index + 1
  }));

  const quiz = await Quiz.create({
    title,
    description,
    instructions,
    course: courseId,
    instructor: req.user._id,
    questions: processedQuestions,
    settings: settings || {},
    startDate: startDate || new Date(),
    endDate,
    isPublished: false
  });

  await quiz.populate('course', 'title');
  await quiz.populate('instructor', 'firstName lastName');

  res.status(201).json({
    success: true,
    message: 'Quiz created successfully',
    data: { quiz }
  });
}));

// @desc    Get quizzes by course
// @route   GET /api/quizzes/course/:courseId
// @access  Private
router.get('/course/:courseId', auth, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  let query = { course: req.params.courseId };
  
  // Students can only see published quizzes
  if (req.user.role === 'student') {
    query.isPublished = true;
  }

  const quizzes = await Quiz.find(query)
    .populate('instructor', 'firstName lastName')
    .select('-questions.correctAnswer -questions.explanation -attempts')
    .sort({ createdAt: -1 });

  // Add attempt info for students
  if (req.user.role === 'student') {
    const quizzesWithAttempts = await Promise.all(quizzes.map(async (quiz) => {
      const fullQuiz = await Quiz.findById(quiz._id).select('attempts');
      const userAttempts = fullQuiz.attempts.filter(a => a.student.toString() === req.user._id.toString());
      return {
        ...quiz.toObject(),
        userAttempts: userAttempts.length,
        lastAttempt: userAttempts.length > 0 ? userAttempts[userAttempts.length - 1] : null
      };
    }));
    return res.json({
      success: true,
      data: { quizzes: quizzesWithAttempts }
    });
  }

  res.json({
    success: true,
    data: { quizzes }
  });
}));

// @desc    Get my quizzes (teacher)
// @route   GET /api/quizzes/my-quizzes
// @access  Private (Teachers)
router.get('/my-quizzes', auth, isTeacher, asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ instructor: req.user._id })
    .populate('course', 'title')
    .select('-questions.correctAnswer -attempts')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { quizzes }
  });
}));

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Private
router.get('/:id', auth, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id)
    .populate('course', 'title instructor')
    .populate('instructor', 'firstName lastName avatar');

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  // For students, hide correct answers and filter their attempts
  if (req.user.role === 'student') {
    const quizObject = quiz.toObject();
    
    // Remove correct answers unless showCorrectAnswers is enabled and quiz is completed
    quizObject.questions = quizObject.questions.map(q => ({
      _id: q._id,
      question: q.question,
      type: q.type,
      options: q.options.map(o => ({ _id: o._id, text: o.text })),
      points: q.points,
      order: q.order
    }));

    // Only show user's own attempts
    quizObject.attempts = quizObject.attempts.filter(a => a.student.toString() === req.user._id.toString());

    return res.json({
      success: true,
      data: { quiz: quizObject }
    });
  }

  res.json({
    success: true,
    data: { quiz }
  });
}));

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Teachers)
router.put('/:id', auth, isTeacher, asyncHandler(async (req, res) => {
  let quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this quiz'
    });
  }

  const updateFields = ['title', 'description', 'instructions', 'questions', 'settings', 'startDate', 'endDate', 'isPublished'];
  const updateData = {};
  
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  quiz = await Quiz.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('course', 'title').populate('instructor', 'firstName lastName');

  res.json({
    success: true,
    message: 'Quiz updated successfully',
    data: { quiz }
  });
}));

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Teachers)
router.delete('/:id', auth, isTeacher, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this quiz'
    });
  }

  await Quiz.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Quiz deleted successfully'
  });
}));

// @desc    Start quiz attempt
// @route   POST /api/quizzes/:id/start
// @access  Private (Students)
router.post('/:id/start', auth, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  if (!quiz.isPublished) {
    return res.status(400).json({
      success: false,
      message: 'Quiz is not published yet'
    });
  }

  // Check if quiz is within date range
  const now = new Date();
  if (quiz.startDate && now < quiz.startDate) {
    return res.status(400).json({
      success: false,
      message: 'Quiz has not started yet'
    });
  }
  if (quiz.endDate && now > quiz.endDate) {
    return res.status(400).json({
      success: false,
      message: 'Quiz has ended'
    });
  }

  // Check max attempts
  const userAttempts = quiz.attempts.filter(a => a.student.toString() === req.user._id.toString());
  if (userAttempts.length >= quiz.settings.maxAttempts) {
    return res.status(400).json({
      success: false,
      message: `Maximum attempts (${quiz.settings.maxAttempts}) reached`
    });
  }

  // Check for incomplete attempt
  const incompleteAttempt = userAttempts.find(a => !a.completedAt);
  if (incompleteAttempt) {
    return res.json({
      success: true,
      message: 'Resuming existing attempt',
      data: {
        attemptId: incompleteAttempt._id,
        startedAt: incompleteAttempt.startedAt,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          question: q.question,
          type: q.type,
          options: quiz.settings.shuffleOptions 
            ? q.options.sort(() => Math.random() - 0.5).map(o => ({ _id: o._id, text: o.text }))
            : q.options.map(o => ({ _id: o._id, text: o.text })),
          points: q.points
        })),
        timeLimit: quiz.settings.timeLimit
      }
    });
  }

  // Create new attempt
  const newAttempt = {
    student: req.user._id,
    answers: [],
    startedAt: new Date(),
    attemptNumber: userAttempts.length + 1
  };

  quiz.attempts.push(newAttempt);
  await quiz.save();

  const attempt = quiz.attempts[quiz.attempts.length - 1];

  // Prepare questions (optionally shuffled)
  let questions = quiz.questions.map(q => ({
    _id: q._id,
    question: q.question,
    type: q.type,
    options: quiz.settings.shuffleOptions 
      ? q.options.sort(() => Math.random() - 0.5).map(o => ({ _id: o._id, text: o.text }))
      : q.options.map(o => ({ _id: o._id, text: o.text })),
    points: q.points
  }));

  if (quiz.settings.shuffleQuestions) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  res.json({
    success: true,
    message: 'Quiz attempt started',
    data: {
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      questions,
      timeLimit: quiz.settings.timeLimit,
      totalPoints: quiz.totalPoints
    }
  });
}));

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/submit
// @access  Private (Students)
router.post('/:id/submit', auth, [
  body('attemptId')
    .isMongoId()
    .withMessage('Valid attempt ID is required'),
  body('answers')
    .isArray()
    .withMessage('Answers must be an array')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { attemptId, answers, timeSpent } = req.body;
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  const attemptIndex = quiz.attempts.findIndex(
    a => a._id.toString() === attemptId && a.student.toString() === req.user._id.toString()
  );

  if (attemptIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Attempt not found'
    });
  }

  if (quiz.attempts[attemptIndex].completedAt) {
    return res.status(400).json({
      success: false,
      message: 'This attempt has already been submitted'
    });
  }

  // Grade answers
  let totalScore = 0;
  const gradedAnswers = answers.map(answer => {
    const question = quiz.questions.find(q => q._id.toString() === answer.questionId);
    if (!question) return null;

    let isCorrect = false;
    let pointsEarned = 0;

    if (question.type === 'multiple_choice') {
      const selectedOption = question.options[answer.selectedOption];
      isCorrect = selectedOption && selectedOption.isCorrect;
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.type === 'true_false') {
      isCorrect = answer.textAnswer?.toLowerCase() === question.correctAnswer?.toLowerCase();
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.type === 'short_answer' || question.type === 'fill_blank') {
      isCorrect = answer.textAnswer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      pointsEarned = isCorrect ? question.points : 0;
    }

    totalScore += pointsEarned;

    return {
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      textAnswer: answer.textAnswer,
      isCorrect,
      pointsEarned
    };
  }).filter(a => a !== null);

  const percentage = quiz.totalPoints > 0 ? (totalScore / quiz.totalPoints) * 100 : 0;
  const passed = percentage >= quiz.settings.passingScore;

  quiz.attempts[attemptIndex].answers = gradedAnswers;
  quiz.attempts[attemptIndex].score = totalScore;
  quiz.attempts[attemptIndex].percentage = Math.round(percentage * 100) / 100;
  quiz.attempts[attemptIndex].passed = passed;
  quiz.attempts[attemptIndex].timeSpent = timeSpent || 0;
  quiz.attempts[attemptIndex].completedAt = new Date();

  await quiz.save();
  await quiz.updateAnalytics();

  // Prepare response with correct answers if allowed
  let result = {
    score: totalScore,
    totalPoints: quiz.totalPoints,
    percentage: Math.round(percentage * 100) / 100,
    passed,
    passingScore: quiz.settings.passingScore
  };

  if (quiz.settings.showCorrectAnswers) {
    result.answers = gradedAnswers.map((answer, index) => {
      const question = quiz.questions.find(q => q._id.toString() === answer.questionId);
      return {
        ...answer,
        correctAnswer: question.type === 'multiple_choice' 
          ? question.options.findIndex(o => o.isCorrect)
          : question.correctAnswer,
        explanation: quiz.settings.showExplanations ? question.explanation : undefined
      };
    });
  }

  res.json({
    success: true,
    message: passed ? 'Congratulations! You passed the quiz!' : 'Quiz submitted. Better luck next time!',
    data: result
  });
}));

// @desc    Get quiz results/attempts
// @route   GET /api/quizzes/:id/results
// @access  Private
router.get('/:id/results', auth, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id)
    .populate('attempts.student', 'firstName lastName email avatar');

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  // Teachers see all results
  if (req.user.role === 'teacher' || req.user.role === 'admin') {
    if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view results'
      });
    }

    const results = quiz.attempts.filter(a => a.completedAt).map(attempt => ({
      student: attempt.student,
      score: attempt.score,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      attemptNumber: attempt.attemptNumber,
      completedAt: attempt.completedAt
    }));

    return res.json({
      success: true,
      data: {
        results,
        analytics: quiz.analytics
      }
    });
  }

  // Students see only their results
  const userAttempts = quiz.attempts.filter(
    a => a.student._id.toString() === req.user._id.toString() && a.completedAt
  );

  res.json({
    success: true,
    data: {
      attempts: userAttempts.map(a => ({
        score: a.score,
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.timeSpent,
        attemptNumber: a.attemptNumber,
        completedAt: a.completedAt
      }))
    }
  });
}));

module.exports = router;
