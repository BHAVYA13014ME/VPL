const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  type:     { type: String, enum: ['multiple_choice','true_false','short_answer','fill_blank'], default: 'multiple_choice' },
  options:  [{ text: String, isCorrect: Boolean }],
  correctAnswer: String,
  explanation:   String,
  points:   { type: Number, default: 1, min: 1 },
  order:    { type: Number, default: 0 },
});

const attemptSchema = new mongoose.Schema({
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{
    questionId:     mongoose.Schema.Types.ObjectId,
    selectedOption: Number,
    textAnswer:     String,
    isCorrect:      Boolean,
    pointsEarned:   Number,
  }],
  score:         { type: Number, default: 0 },
  percentage:    { type: Number, default: 0 },
  passed:        { type: Boolean, default: false },
  timeSpent:     { type: Number, default: 0 },
  startedAt:     { type: Date, default: Date.now },
  completedAt:   Date,
  attemptNumber: { type: Number, default: 1 },
}, { timestamps: true });

const quizSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Quiz title is required'], trim: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  instructions:{ type: String, maxlength: 2000 },
  course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: [true, 'Course is required'] },
  instructor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: [true, 'Instructor is required'] },
  questions:   [questionSchema],
  settings: {
    timeLimit:          { type: Number, default: 30 },
    passingScore:       { type: Number, default: 70, min: 0, max: 100 },
    maxAttempts:        { type: Number, default: 3, min: 1 },
    shuffleQuestions:   { type: Boolean, default: false },
    shuffleOptions:     { type: Boolean, default: false },
    showCorrectAnswers: { type: Boolean, default: true },
    showExplanations:   { type: Boolean, default: true },
    allowReview:        { type: Boolean, default: true },
  },
  totalPoints: { type: Number, default: 0 },
  startDate:   { type: Date, default: Date.now },
  endDate:     Date,
  isPublished: { type: Boolean, default: false },
  attempts:    [attemptSchema],
  analytics: {
    totalAttempts:    { type: Number, default: 0 },
    averageScore:     { type: Number, default: 0 },
    passRate:         { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 },
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

quizSchema.virtual('questionCount').get(function () {
  return (this.questions || []).length;
});

quizSchema.methods.updateAnalytics = async function () {
  const completed = (this.attempts || []).filter(a => a.completedAt);
  this.analytics = {
    totalAttempts:    completed.length,
    averageScore:     completed.length ? completed.reduce((s, a) => s + a.percentage, 0) / completed.length : 0,
    passRate:         completed.length ? (completed.filter(a => a.passed).length / completed.length) * 100 : 0,
    averageTimeSpent: completed.length ? completed.reduce((s, a) => s + a.timeSpent, 0) / completed.length : 0,
  };
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Quiz', quizSchema);
