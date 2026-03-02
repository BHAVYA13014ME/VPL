const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points:  { type: Number, default: 0, min: 0 },
  level:   { type: Number, default: 1, min: 1 },
  rank:    { type: Number, default: 1 },
  badges: [{
    name:        { type: String, required: true },
    description: String,
    icon:        String,
    color:       String,
    rarity:      { type: String, enum: ['common','rare','epic','legendary'], default: 'common' },
    earnedAt:    { type: Date, default: Date.now },
  }],
  achievements: [{
    type:        { type: String },
    title:       { type: String, required: true },
    description: String,
    points:      { type: Number, default: 0 },
    unlockedAt:  { type: Date, default: Date.now },
  }],
  statistics: {
    coursesCompleted:    { type: Number, default: 0 },
    assignmentsSubmitted:{ type: Number, default: 0 },
    averageScore:        { type: Number, default: 0, min: 0, max: 100 },
    studyStreak: {
      current:       { type: Number, default: 0 },
      longest:       { type: Number, default: 0 },
      lastStudyDate: Date,
    },
    timeSpent:      { type: Number, default: 0 },
    discussionPosts:{ type: Number, default: 0 },
    helpfulVotes:   { type: Number, default: 0 },
    coursesCreated: { type: Number, default: 0 },
  },
  category: {
    type: String,
    enum: ['overall','programming','design','business','marketing','photography','music','health','fitness','language','mathematics','science','other'],
    default: 'overall',
  },
  period: {
    type: String,
    enum: ['all_time','monthly','weekly','daily'],
    default: 'all_time',
  },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

leaderboardSchema.index({ user: 1, category: 1, period: 1 }, { unique: true });
leaderboardSchema.index({ category: 1, period: 1, points: -1 });

leaderboardSchema.virtual('calculatedLevel').get(function () {
  return Math.floor(Math.sqrt(this.points / 100)) + 1;
});
leaderboardSchema.virtual('pointsToNextLevel').get(function () {
  const cl = this.calculatedLevel;
  return Math.pow(cl, 2) * 100 - this.points;
});
leaderboardSchema.virtual('levelProgress').get(function () {
  const cl = this.calculatedLevel;
  const p0 = Math.pow(cl - 1, 2) * 100;
  const p1 = Math.pow(cl, 2) * 100;
  return Math.min(100, Math.max(0, ((this.points - p0) / (p1 - p0)) * 100));
});

leaderboardSchema.methods.addPoints = async function (p) {
  this.points = (this.points || 0) + p;
  this.level  = this.calculatedLevel;
  this.lastUpdated = new Date();
  return this.save();
};
leaderboardSchema.methods.awardBadge = async function (badgeData) {
  if (!(this.badges || []).find(b => b.name === badgeData.name)) {
    this.badges.push({ ...badgeData, earnedAt: new Date() });
    this.lastUpdated = new Date();
    return this.save();
  }
  return this;
};
leaderboardSchema.methods.unlockAchievement = async function (ach) {
  if (!(this.achievements || []).find(a => a.type === ach.type)) {
    this.achievements.push({ ...ach, unlockedAt: new Date() });
    if (ach.points) { this.points = (this.points || 0) + ach.points; this.level = this.calculatedLevel; }
    this.lastUpdated = new Date();
    return this.save();
  }
  return this;
};
leaderboardSchema.methods.updateStatistics = async function (upd) {
  Object.assign(this.statistics, upd);
  this.lastUpdated = new Date();
  return this.save();
};

leaderboardSchema.statics.getLeaderboard = function (opts = {}) {
  const { category = 'overall', period = 'all_time', limit = 50, page = 1 } = opts;
  return this.find({ category, period }).sort({ points: -1 }).limit(limit).skip((page - 1) * limit)
    .populate('user', 'firstName lastName email avatar role')
    .lean();
};
leaderboardSchema.statics.getUserRanking = function (userId, category = 'overall', period = 'all_time') {
  return this.findOne({ user: userId, category, period })
    .populate('user', 'firstName lastName email avatar role')
    .lean();
};
leaderboardSchema.statics.getTopPerformers = function (category = 'overall', limit = 10) {
  return this.find({ category, period: 'all_time' }).sort({ points: -1 }).limit(limit)
    .populate('user', 'firstName lastName email avatar role')
    .lean();
};

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
