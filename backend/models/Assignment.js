const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned', 'late'],
    default: 'submitted'
  },
  grade: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    feedback: String,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gradedAt: Date
  },
  attempt: {
    type: Number,
    default: 1
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  }
}, {
  timestamps: true
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Assignment title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    maxlength: [2000, 'Assignment description cannot exceed 2000 characters']
  },
  instructions: {
    type: String,
    required: [true, 'Assignment instructions are required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  type: {
    type: String,
    enum: ['essay', 'project', 'quiz', 'presentation', 'code', 'other'],
    default: 'essay'
  },
  maxScore: {
    type: Number,
    required: [true, 'Maximum score is required'],
    min: [1, 'Maximum score must be at least 1'],
    default: 100
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number, // percentage penalty per day
    default: 0,
    min: 0,
    max: 100
  },
  maxAttempts: {
    type: Number,
    default: 1,
    min: 1
  },
  timeLimit: {
    type: Number, // in minutes, null means no limit
    default: null
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  rubric: [{
    criteria: {
      type: String,
      required: true
    },
    description: String,
    maxPoints: {
      type: Number,
      required: true,
      min: 0
    },
    levels: [{
      name: String,
      description: String,
      points: Number
    }]
  }],
  submissions: [submissionSchema],
  settings: {
    allowFileUpload: {
      type: Boolean,
      default: true
    },
    allowedFileTypes: [{
      type: String,
      enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar']
    }],
    maxFileSize: {
      type: Number, // in MB
      default: 10
    },
    showGradeToStudent: {
      type: Boolean,
      default: true
    },
    showSubmissionsToStudents: {
      type: Boolean,
      default: false
    },
    autoGrade: {
      type: Boolean,
      default: false
    },
    plagiarismCheck: {
      type: Boolean,
      default: false
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  analytics: {
    totalSubmissions: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    submissionRate: {
      type: Number,
      default: 0
    },
    averageTimeSpent: {
      type: Number,
      default: 0
    },
    passRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total submissions
assignmentSchema.virtual('totalSubmissions').get(function() {
  return this.submissions ? this.submissions.length : 0;
});

// Virtual for graded submissions
assignmentSchema.virtual('gradedSubmissions').get(function() {
  return this.submissions ? this.submissions.filter(sub => sub.status === 'graded').length : 0;
});

// Virtual for pending submissions
assignmentSchema.virtual('pendingSubmissions').get(function() {
  return this.submissions ? this.submissions.filter(sub => sub.status === 'submitted').length : 0;
});

// Virtual for late submissions
assignmentSchema.virtual('lateSubmissions').get(function() {
  return this.submissions ? this.submissions.filter(sub => 
    new Date(sub.submittedAt) > new Date(this.dueDate)
  ).length : 0;
});

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > new Date(this.dueDate);
});

// Virtual for checking if assignment is active
assignmentSchema.virtual('isActive').get(function() {
  const now = new Date();
  return now >= new Date(this.startDate) && now <= new Date(this.dueDate);
});

// Method to get student's submission
assignmentSchema.methods.getStudentSubmission = function(studentId) {
  return this.submissions.find(sub => sub.student.toString() === studentId.toString());
};

// Method to add submission
assignmentSchema.methods.addSubmission = function(submissionData) {
  const existingSubmission = this.getStudentSubmission(submissionData.student);
  
  if (existingSubmission) {
    // Check if multiple attempts are allowed
    if (existingSubmission.attempt >= this.maxAttempts) {
      throw new Error('Maximum attempts exceeded');
    }
    submissionData.attempt = existingSubmission.attempt + 1;
  }
  
  // Check if late submission
  if (new Date() > new Date(this.dueDate)) {
    submissionData.status = 'late';
  }
  
  this.submissions.push(submissionData);
  this.analytics.totalSubmissions = this.submissions.length;
  
  return this.save();
};

// Method to grade submission
assignmentSchema.methods.gradeSubmission = function(studentId, gradeData) {
  const submission = this.getStudentSubmission(studentId);
  
  if (!submission) {
    throw new Error('Submission not found');
  }
  
  submission.grade = {
    ...gradeData,
    gradedAt: new Date()
  };
  submission.status = 'graded';
  
  this.updateAnalytics();
  return this.save();
};

// Method to update analytics
assignmentSchema.methods.updateAnalytics = function() {
  const gradedSubmissions = this.submissions.filter(sub => sub.status === 'graded');
  
  if (gradedSubmissions.length > 0) {
    const totalScore = gradedSubmissions.reduce((sum, sub) => sum + (sub.grade.score || 0), 0);
    this.analytics.averageScore = Math.round((totalScore / gradedSubmissions.length) * 100) / 100;
    
    const passCount = gradedSubmissions.filter(sub => (sub.grade.score || 0) >= (this.maxScore * 0.6)).length;
    this.analytics.passRate = Math.round((passCount / gradedSubmissions.length) * 100);
    
    const totalTime = gradedSubmissions.reduce((sum, sub) => sum + (sub.timeSpent || 0), 0);
    this.analytics.averageTimeSpent = Math.round(totalTime / gradedSubmissions.length);
  }
  
  this.analytics.totalSubmissions = this.submissions.length;
  // Submission rate would need course enrollment data to calculate properly
  
  return this;
};

// Static method to get upcoming assignments for a student
assignmentSchema.statics.getUpcomingAssignments = function(studentId, limit = 5) {
  return this.find({
    isPublished: true,
    dueDate: { $gte: new Date() },
    'submissions.student': { $ne: studentId }
  })
  .sort({ dueDate: 1 })
  .limit(limit)
  .populate('course', 'title')
  .populate('instructor', 'firstName lastName')
  .select('-submissions -rubric')
  .lean();
};

// Static method to get overdue assignments for a student
assignmentSchema.statics.getOverdueAssignments = function(studentId) {
  return this.find({
    isPublished: true,
    dueDate: { $lt: new Date() },
    'submissions.student': { $ne: studentId }
  })
  .sort({ dueDate: -1 })
  .populate('course', 'title')
  .populate('instructor', 'firstName lastName')
  .select('-submissions -rubric')
  .lean();
};

// Pre-save middleware to update analytics
assignmentSchema.pre('save', function(next) {
  if (this.isModified('submissions')) {
    this.updateAnalytics();
  }
  next();
});

// Indexes for performance
assignmentSchema.index({ course: 1 });
assignmentSchema.index({ instructor: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ isPublished: 1 });
assignmentSchema.index({ 'submissions.student': 1 });
assignmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
