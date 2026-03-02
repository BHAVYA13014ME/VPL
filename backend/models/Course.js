const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: String, url: String,
  type: { type: String, enum: ['link', 'file', 'video'] },
}, { _id: false });

const lessonSchema = new mongoose.Schema({
  title:       { type: String, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  content:     { type: String },
  type:        { type: String, enum: ['video', 'text', 'pdf', 'interactive', 'quiz'], default: 'text' },
  videoUrl:    String,
  pdfUrl:      String,
  duration:    { type: Number, default: 0 },
  order:       { type: Number, required: true },
  isPublished: { type: Boolean, default: false },
  resources:   [resourceSchema],
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating:    { type: Number, min: 1, max: 5 },
  comment:   String,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const courseSchema = new mongoose.Schema({
  title:            { type: String, required: [true, 'Course title is required'], trim: true, maxlength: 200 },
  description:      { type: String, required: [true, 'Course description is required'], maxlength: 2000 },
  shortDescription: { type: String, maxlength: 500 },
  instructor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Instructor is required'] },
  category: {
    type: String, required: [true, 'Course category is required'],
    enum: ['programming','design','business','marketing','photography','music','health','fitness','language','mathematics','science','other'],
  },
  level:           { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  price:           { type: Number, default: 0, min: 0 },
  currency:        { type: String, default: 'USD' },
  thumbnail:       { type: String, default: '' },
  coverImage:      { type: String, default: '' },
  lessons:         [lessonSchema],
  prerequisites:   [String],
  learningOutcomes:[String],
  tags:            [String],
  language:        { type: String, default: 'English' },
  duration:        { type: Number, default: 0 },
  isPublished:     { type: Boolean, default: false },
  isPaid:          { type: Boolean, default: false },
  enrollmentCount: { type: Number, default: 0 },
  rating:          { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  reviews:         [reviewSchema],
  assignments:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' }],
  announcements:   [mongoose.Schema.Types.Mixed],
  enrollmentLimit:  { type: Number, default: 0 }, // 0 = unlimited
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Instance: increment enrollment count
courseSchema.methods.addEnrollment = async function () {
  this.enrollmentCount = (this.enrollmentCount || 0) + 1;
  await this.save();
};

// Instance: decrement enrollment count (floor at 0)
courseSchema.methods.removeEnrollment = async function () {
  this.enrollmentCount = Math.max(0, (this.enrollmentCount || 1) - 1);
  await this.save();
};

// Instance: recalculate average rating from reviews array
courseSchema.methods.updateRating = async function () {
  if (!this.reviews || this.reviews.length === 0) {
    this.rating = { average: 0, count: 0 };
  } else {
    const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    this.rating = {
      average: Math.round((sum / this.reviews.length) * 10) / 10,
      count: this.reviews.length,
    };
  }
  await this.save();
};

courseSchema.statics.getPopularCourses = function (limit = 10) {
  return this.find({ isPublished: true }).sort({ enrollmentCount: -1 }).limit(limit).lean();
};
courseSchema.statics.getCoursesByCategory = function (category, limit = 10) {
  return this.find({ isPublished: true, category }).limit(limit).lean();
};

module.exports = mongoose.model('Course', courseSchema);
