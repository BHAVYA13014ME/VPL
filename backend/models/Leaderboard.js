const mongoose = require('mongoose');

const leaderboardEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  rank: {
    type: Number,
    default: 1
  },
  badges: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    icon: String,
    color: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common'
    }
  }],
  achievements: [{
    type: {
      type: String,
      enum: [
        'first_course_completed',
        'first_assignment_submitted', 
        'perfect_score',
        'study_streak_7',
        'study_streak_30',
        'course_creator',
        'helpful_reviewer',
        'discussion_starter',
        'assignment_master',
        'quick_learner',
        'dedicated_student',
        'knowledge_seeker'
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    points: {
      type: Number,
      default: 0
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  statistics: {
    coursesCompleted: {
      type: Number,
      default: 0
    },
    assignmentsSubmitted: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    studyStreak: {
      current: {
        type: Number,
        default: 0
      },
      longest: {
        type: Number,
        default: 0
      },
      lastStudyDate: Date
    },
    timeSpent: {
      type: Number,
      default: 0 // in minutes
    },
    discussionPosts: {
      type: Number,
      default: 0
    },
    helpfulVotes: {
      type: Number,
      default: 0
    },
    coursesCreated: {
      type: Number,
      default: 0
    }
  },
  category: {
    type: String,
    enum: ['overall', 'programming', 'design', 'business', 'marketing', 'photography', 'music', 'health', 'fitness', 'language', 'mathematics', 'science', 'other'],
    default: 'overall'
  },
  period: {
    type: String,
    enum: ['all_time', 'monthly', 'weekly', 'daily'],
    default: 'all_time'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating level from points
leaderboardEntrySchema.virtual('calculatedLevel').get(function() {
  // Level calculation: Level = floor(sqrt(points / 100)) + 1
  // This means: Level 1: 0-99 points, Level 2: 100-399, Level 3: 400-899, etc.
  return Math.floor(Math.sqrt(this.points / 100)) + 1;
});

// Virtual for points needed for next level
leaderboardEntrySchema.virtual('pointsToNextLevel').get(function() {
  const currentLevel = this.calculatedLevel;
  const pointsForNextLevel = Math.pow(currentLevel, 2) * 100;
  return pointsForNextLevel - this.points;
});

// Virtual for progress to next level (percentage)
leaderboardEntrySchema.virtual('levelProgress').get(function() {
  const currentLevel = this.calculatedLevel;
  const pointsForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
  const pointsForNextLevel = Math.pow(currentLevel, 2) * 100;
  const pointsInCurrentLevel = this.points - pointsForCurrentLevel;
  const pointsNeededForLevel = pointsForNextLevel - pointsForCurrentLevel;
  
  return Math.min(100, Math.max(0, (pointsInCurrentLevel / pointsNeededForLevel) * 100));
});

// Method to add points and update level
leaderboardEntrySchema.methods.addPoints = function(points, reason = 'general') {
  this.points += points;
  this.level = this.calculatedLevel;
  this.lastUpdated = new Date();
  
  // Log the activity (you could extend this to store point history)
  console.log(`User ${this.user} earned ${points} points for ${reason}. Total: ${this.points}`);
  
  return this.save();
};

// Method to award badge
leaderboardEntrySchema.methods.awardBadge = function(badgeData) {
  const existingBadge = this.badges.find(badge => badge.name === badgeData.name);
  
  if (!existingBadge) {
    this.badges.push({
      ...badgeData,
      earnedAt: new Date()
    });
    this.lastUpdated = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to unlock achievement
leaderboardEntrySchema.methods.unlockAchievement = function(achievementData) {
  const existingAchievement = this.achievements.find(
    achievement => achievement.type === achievementData.type
  );
  
  if (!existingAchievement) {
    this.achievements.push({
      ...achievementData,
      unlockedAt: new Date()
    });
    
    // Add points for achievement
    if (achievementData.points) {
      this.points += achievementData.points;
      this.level = this.calculatedLevel;
    }
    
    this.lastUpdated = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to update statistics
leaderboardEntrySchema.methods.updateStatistics = function(statUpdates) {
  Object.keys(statUpdates).forEach(key => {
    if (this.statistics[key] !== undefined) {
      if (typeof this.statistics[key] === 'object' && !Array.isArray(this.statistics[key])) {
        // Handle nested objects like studyStreak
        Object.assign(this.statistics[key], statUpdates[key]);
      } else {
        this.statistics[key] = statUpdates[key];
      }
    }
  });
  
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to get leaderboard rankings
leaderboardEntrySchema.statics.getLeaderboard = function(options = {}) {
  const {
    category = 'overall',
    period = 'all_time',
    limit = 50,
    page = 1
  } = options;
  
  const skip = (page - 1) * limit;
  
  return this.find({ category, period })
    .populate('user', 'firstName lastName avatar profile role')
    .sort({ points: -1, createdAt: 1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to get user ranking
leaderboardEntrySchema.statics.getUserRanking = function(userId, category = 'overall', period = 'all_time') {
  return this.findOne({ user: userId, category, period })
    .populate('user', 'firstName lastName avatar profile role')
    .lean();
};

// Static method to get top performers
leaderboardEntrySchema.statics.getTopPerformers = function(category = 'overall', limit = 10) {
  return this.find({ category, period: 'all_time' })
    .populate('user', 'firstName lastName avatar profile role')
    .sort({ points: -1 })
    .limit(limit)
    .lean();
};

// Pre-save middleware to update rank
leaderboardEntrySchema.pre('save', async function(next) {
  if (this.isModified('points')) {
    // Update rank based on points
    const higherRankedCount = await this.constructor.countDocuments({
      category: this.category,
      period: this.period,
      points: { $gt: this.points }
    });
    
    this.rank = higherRankedCount + 1;
  }
  
  next();
});

// Indexes for performance
leaderboardEntrySchema.index({ user: 1, category: 1, period: 1 }, { unique: true });
leaderboardEntrySchema.index({ category: 1, period: 1, points: -1 });
leaderboardEntrySchema.index({ points: -1 });
leaderboardEntrySchema.index({ rank: 1 });
leaderboardEntrySchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Leaderboard', leaderboardEntrySchema);
