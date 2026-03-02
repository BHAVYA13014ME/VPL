const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const profileSchema = new mongoose.Schema({
  bio:            { type: String, maxlength: 500, default: '' },
  phone:          { type: String, default: '' },
  location:       { type: String, maxlength: 100, default: '' },
  dateOfBirth:    { type: Date },
  profilePicture: { type: String, default: '' },
  department:     { type: String, maxlength: 100, default: '' },
  specialization: { type: String, maxlength: 200, default: '' },
  experience:     { type: String, maxlength: 1000, default: '' },
  skills:         [{ type: String, maxlength: 50 }],
  achievements:   [{ type: String, maxlength: 100 }],
  address: {
    street:  String,
    city:    String,
    state:   String,
    country: String,
    zipCode: String,
  },
  socialLinks: {
    website:   String,
    linkedin:  String,
    github:    String,
    twitter:   String,
    instagram: String,
  },
}, { _id: false });

const gamificationSchema = new mongoose.Schema({
  points:  { type: Number, default: 0 },
  level:   { type: Number, default: 1 },
  badges:  [mongoose.Schema.Types.Mixed],
  streak:  {
    current:      { type: Number, default: 0 },
    longest:      { type: Number, default: 0 },
    lastActivity: { type: Date, default: null },
  },
}, { _id: false });

const enrolledCourseSchema = new mongoose.Schema({
  course:           { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  enrolledAt:       { type: Date, default: Date.now },
  progress:         { type: Number, default: 0 },
  completed:        { type: Boolean, default: false },
  completedAt:      { type: Date },
  completedLessons: { type: [String], default: [] },
  grade:            { type: Number, default: null },
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName: { type: String, trim: true, maxlength: 50 },
  lastName:  { type: String, trim: true, maxlength: 50 },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  password: { type: String, minlength: 6, select: false },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  avatar:           { type: String, default: '' },
  isActive:         { type: Boolean, default: true },
  isEmailVerified:  { type: Boolean, default: false },
  lastLogin:        { type: Date },
  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpires: { type: Date,   select: false },
  profile:          { type: profileSchema, default: () => ({}) },
  gamification:     { type: gamificationSchema, default: () => ({ points: 0, level: 1, badges: [], streak: { current: 0, longest: 0, lastActivity: null } }) },
  enrolledCourses:  { type: [enrolledCourseSchema], default: [] },
  teachingSubjects: [String],
  qualifications:   [String],
  preferences: {
    notifications: {
      email:         { type: Boolean, default: true },
      push:          { type: Boolean, default: true },
      assignments:   { type: Boolean, default: true },
      announcements: { type: Boolean, default: true },
    },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications:  { type: Boolean, default: true },
    marketingEmails:    { type: Boolean, default: false },
    profileVisibility:  { type: String, default: 'public' },
    language:           { type: String, default: 'en' },
    timezone:           { type: String, default: 'UTC' },
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtuals
userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});
userSchema.virtual('totalCourses').get(function () {
  return (this.enrolledCourses || []).length;
});
userSchema.virtual('bio').get(function () { return this.profile?.bio || ''; });
userSchema.virtual('phone').get(function () { return this.profile?.phone || ''; });
userSchema.virtual('location').get(function () { return this.profile?.location || ''; });
userSchema.virtual('profilePicture').get(function () { return this.profile?.profilePicture || this.avatar || ''; });
userSchema.virtual('department').get(function () { return this.profile?.department || ''; });
userSchema.virtual('specialization').get(function () { return this.profile?.specialization || ''; });
userSchema.virtual('skills').get(function () { return this.profile?.skills || []; });
userSchema.virtual('achievements').get(function () { return this.profile?.achievements || []; });
userSchema.virtual('socialLinks').get(function () { return this.profile?.socialLinks || {}; });
userSchema.virtual('gamificationStats').get(function () {
  return {
    totalPoints: this.gamification?.points || 0,
    level:       this.gamification?.level  || 1,
    badges:      this.gamification?.badges || [],
    streak:      this.gamification?.streak?.current || 0,
  };
});

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  if (/^\$2[ab]\$/.test(this.password)) return; // already hashed
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance methods
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};
userSchema.methods.updateStreak = async function () {
  if (!this.gamification) this.gamification = { points: 0, level: 1, badges: [], streak: { current: 0, longest: 0, lastActivity: null } };
  const s = this.gamification.streak || { current: 0, longest: 0, lastActivity: null };
  const today = new Date();
  if (!s.lastActivity) { s.current = 1; }
  else {
    const diff = Math.floor((today - new Date(s.lastActivity)) / 86400000);
    if (diff === 1) { s.current += 1; if (s.current > s.longest) s.longest = s.current; }
    else if (diff > 1) s.current = 1;
  }
  s.lastActivity = today;
  this.gamification.streak = s;
  return this.save({ validateBeforeSave: false });
};
userSchema.methods.addPoints = async function (pts) {
  if (!this.gamification) this.gamification = { points: 0, level: 1, badges: [], streak: {} };
  this.gamification.points = (this.gamification.points || 0) + pts;
  this.gamification.level  = Math.floor(this.gamification.points / 1000) + 1;
  return this.save({ validateBeforeSave: false });
};

// Static methods
userSchema.statics.getLeaderboard = async function (limit = 10) {
  return this.find({ role: 'student', isActive: true })
    .sort({ 'gamification.points': -1 }).limit(limit).lean();
};

module.exports = mongoose.model('User', userSchema);
