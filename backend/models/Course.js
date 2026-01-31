const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [200, 'Lesson title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Lesson description cannot exceed 1000 characters']
  },
  content: {
    type: String,
    required: [true, 'Lesson content is required']
  },
  type: {
    type: String,
    enum: ['video', 'text', 'pdf', 'interactive', 'quiz'],
    default: 'text'
  },
  videoUrl: String,
  pdfUrl: String,
  duration: {
    type: Number, // in minutes
    default: 0
  },
  order: {
    type: Number,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['link', 'file', 'video']
    }
  }],
  quiz: {
    questions: [{
      question: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['multiple_choice', 'true_false', 'short_answer'],
        default: 'multiple_choice'
      },
      options: [String],
      correctAnswer: String,
      explanation: String,
      points: {
        type: Number,
        default: 1
      }
    }],
    passingScore: {
      type: Number,
      default: 70
    },
    timeLimit: {
      type: Number, // in minutes
      default: 30
    }
  }
}, {
  timestamps: true
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Course description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: [
      'programming',
      'design',
      'business',
      'marketing',
      'photography',
      'music',
      'health',
      'fitness',
      'language',
      'mathematics',
      'science',
      'other'
    ]
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  thumbnail: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  lessons: [lessonSchema],
  prerequisites: [String],
  learningOutcomes: [String],
  tags: [String],
  language: {
    type: String,
    default: 'English'
  },
  duration: {
    type: Number, // total duration in hours
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  enrollmentLimit: {
    type: Number,
    default: null // null means unlimited
  },
  enrollmentCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Review comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  }],
  announcements: [{
    title: String,
    content: String,
    isImportant: {
      type: Boolean,
      default: false
    },
    attachments: [{
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimeType: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowDiscussions: {
      type: Boolean,
      default: true
    },
    allowDownloads: {
      type: Boolean,
      default: true
    },
    certificateEnabled: {
      type: Boolean,
      default: false
    },
    autoApproveEnrollment: {
      type: Boolean,
      default: true
    }
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageTimeSpent: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total lessons
courseSchema.virtual('totalLessons').get(function() {
  return this.lessons ? this.lessons.length : 0;
});

// Virtual for published lessons
courseSchema.virtual('publishedLessons').get(function() {
  return this.lessons ? this.lessons.filter(lesson => lesson.isPublished).length : 0;
});

// Virtual for course progress (this would be calculated per user)
courseSchema.virtual('progress').get(function() {
  // This is just a placeholder - actual progress would be calculated based on user data
  return 0;
});

// Method to calculate total duration
courseSchema.methods.calculateTotalDuration = function() {
  const totalMinutes = this.lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
  this.duration = Math.round(totalMinutes / 60 * 100) / 100; // Convert to hours and round to 2 decimal places
  // Don't save here - let the pre-save hook handle it
};

// Method to update rating
courseSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.rating.count = this.reviews.length;
  }
  return this.save({ validateBeforeSave: false });
};

// Method to add enrollment
courseSchema.methods.addEnrollment = function() {
  this.enrollmentCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Method to remove enrollment
courseSchema.methods.removeEnrollment = function() {
  if (this.enrollmentCount > 0) {
    this.enrollmentCount -= 1;
  }
  return this.save({ validateBeforeSave: false });
};

// Static method to get popular courses
courseSchema.statics.getPopularCourses = function(limit = 10) {
  return this.find({ isPublished: true })
    .sort({ enrollmentCount: -1, 'rating.average': -1 })
    .limit(limit)
    .populate('instructor', 'firstName lastName avatar')
    .select('-lessons.content -lessons.quiz')
    .lean();
};

// Static method to get courses by category
courseSchema.statics.getCoursesByCategory = function(category, limit = 10) {
  return this.find({ isPublished: true, category })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('instructor', 'firstName lastName avatar')
    .select('-lessons.content -lessons.quiz')
    .lean();
};

// Pre-save middleware to update duration
courseSchema.pre('save', function(next) {
  if (this.isModified('lessons')) {
    this.calculateTotalDuration();
  }
  next();
});

// Indexes for performance
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ enrollmentCount: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Course', courseSchema);
