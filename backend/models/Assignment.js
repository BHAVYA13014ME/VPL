const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename:     String,
  originalName: String,
  path:         String,
  size:         Number,
  mimeType:     String,
  description:  String,
  uploadedAt:   { type: Date, default: Date.now },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  student:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:     { type: String, default: '' },
  attachments: [attachmentSchema],
  submittedAt: { type: Date, default: Date.now },
  status:      { type: String, enum: ['submitted','graded','returned','late'], default: 'submitted' },
  grade: {
    score:     { type: Number, min: 0, max: 100 },
    feedback:  String,
    gradedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt:  Date,
  },
  attempt:    { type: Number, default: 1 },
  timeSpent:  { type: Number, default: 0 },
}, { timestamps: true });

const rubricSchema = new mongoose.Schema({
  criteria:    { type: String, required: true },
  description: String,
  maxPoints:   { type: Number, required: true, min: 0 },
  levels: [{ name: String, description: String, points: Number }],
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Assignment title is required'], trim: true, maxlength: 200 },
  description: { type: String, required: [true, 'Assignment description is required'], maxlength: 2000 },
  instructions:{ type: String, required: [true, 'Instructions are required'] },
  course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: [true, 'Course is required'] },
  instructor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: [true, 'Instructor is required'] },
  type: {
    type: String,
    enum: ['essay','project','quiz','presentation','code','other'],
    default: 'essay',
  },
  maxScore:             { type: Number, required: true, min: 1, default: 100 },
  dueDate:              { type: Date, required: [true, 'Due date is required'] },
  startDate:            { type: Date, default: Date.now },
  allowLateSubmission:  { type: Boolean, default: false },
  latePenalty:          { type: Number, default: 0, min: 0, max: 100 },
  maxAttempts:          { type: Number, default: 1, min: 1 },
  timeLimit:            { type: Number, default: null },
  attachments:          [attachmentSchema],
  rubric:               [rubricSchema],
  submissions:          [submissionSchema],
  settings: {
    allowFileUpload:          { type: Boolean, default: true },
    allowedFileTypes:         [{ type: String, enum: ['pdf','doc','docx','txt','jpg','jpeg','png','gif','zip','rar'] }],
    maxFileSize:              { type: Number, default: 10 },
    showGradeToStudent:       { type: Boolean, default: true },
    showSubmissionsToStudents:{ type: Boolean, default: false },
  },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
