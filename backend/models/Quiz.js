/* ── Quiz model (PostgreSQL / Neon) ── */
const { BaseModel, registerModel } = require('./base');

const SCALAR_COLS = {
  course     : 'course_id',
  instructor : 'instructor_id',
};
const DEFAULTS = {
  questions   : [],
  attempts    : [],
  isPublished : false,
  totalPoints : 0,
  settings    : { timeLimit:30, passingScore:70, maxAttempts:3, shuffleQuestions:false, shuffleOptions:false, showCorrectAnswers:true, showExplanations:true, allowReview:true },
  analytics   : { totalAttempts:0, averageScore:0, passRate:0, averageTimeSpent:0 },
};

function onAfterLoad(doc) {
  Object.defineProperty(doc, 'questionCount', { get: () => (doc.questions||[]).length, enumerable:true, configurable:true });
  doc.updateAnalytics = async () => {
    const completed = (doc.attempts||[]).filter(a => a.completedAt);
    doc.analytics = {
      totalAttempts   : completed.length,
      averageScore    : completed.length ? completed.reduce((s,a)=>s+a.percentage,0)/completed.length : 0,
      passRate        : completed.length ? (completed.filter(a=>a.passed).length/completed.length)*100 : 0,
      averageTimeSpent: completed.length ? completed.reduce((s,a)=>s+a.timeSpent,0)/completed.length : 0,
    };
    return doc.save({ validateBeforeSave:false });
  };
}

class QuizModel extends BaseModel {
  constructor() { super('quizzes', SCALAR_COLS, DEFAULTS, onAfterLoad); }
}

const Quiz = new QuizModel();
registerModel('Quiz', Quiz);

const QuizProxy = new Proxy(Quiz, {
  construct(t, args) { return t.new(args[0]||{}); },
  get(t, prop)       { return t[prop]; },
});

module.exports = QuizProxy;
/* ======= OLD MONGOOSE SCHEMA =======
_ds4 = { question: {
    trim: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer', 'fill_blank'],
    default: 'multiple_choice'
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: String,
    required: function() {
      return this.type !== 'multiple_choice';
    }
  },
  explanation: String,
  points: {
    type: Number,
    default: 1,
    min: [1, 'Points must be at least 1']
  },
  order: {
    type: Number,
    default: 0
  }
});

const attemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedOption: Number,
    textAnswer: String,
    isCorrect: Boolean,
    pointsEarned: Number
  }],
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  attemptNumber: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [200, 'Quiz title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  instructions: {
    type: String,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
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
  questions: [questionSchema],
  settings: {
    timeLimit: {
      type: Number, // in minutes
      default: 30
    },
    passingScore: {
      type: Number,
      default: 70,
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100']
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: [1, 'Must allow at least 1 attempt']
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    showExplanations: {
      type: Boolean,
      default: true
    },
    allowReview: {
      type: Boolean,
      default: true
    }
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  isPublished: {
    type: Boolean,
    default: false
  },
  attempts: [attemptSchema],
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    passRate: {
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

// Virtual for question count
quizSchema.virtual('questionCount').get(function() {
  return this.questions ? this.questions.length : 0;
});

// Calculate total points before save
quizSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((total, q) => total + (q.points || 1), 0);
  }
  next();
});

// Method to update analytics
quizSchema.methods.updateAnalytics = async function() {
  if (this.attempts && this.attempts.length > 0) {
    const completedAttempts = this.attempts.filter(a => a.completedAt);
    this.analytics.totalAttempts = completedAttempts.length;
    
    if (completedAttempts.length > 0) {
      this.analytics.averageScore = completedAttempts.reduce((sum, a) => sum + a.percentage, 0) / completedAttempts.length;
      this.analytics.passRate = (completedAttempts.filter(a => a.passed).length / completedAttempts.length) * 100;
      this.analytics.averageTimeSpent = completedAttempts.reduce((sum, a) => sum + a.timeSpent, 0) / completedAttempts.length;
    }
  }
  return this.save({ validateBeforeSave: false });
};

// Indexes
quizSchema.index({ course: 1 });
quizSchema.index({ instructor: 1 });
quizSchema.index({ isPublished: 1 });
quizSchema.index({ startDate: 1 });

======= END OLD SCHEMA */ 
