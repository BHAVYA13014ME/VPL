const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  profile: {
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    phone: {
      type: String,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    dateOfBirth: {
      type: Date
    },
    profilePicture: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      maxlength: [100, 'Department cannot exceed 100 characters']
    },
    specialization: {
      type: String,
      maxlength: [200, 'Specialization cannot exceed 200 characters']
    },
    experience: {
      type: String,
      maxlength: [1000, 'Experience cannot exceed 1000 characters']
    },
    skills: [{
      type: String,
      maxlength: [50, 'Skill name cannot exceed 50 characters']
    }],
    achievements: [{
      type: String,
      maxlength: [100, 'Achievement cannot exceed 100 characters']
    }],
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    socialLinks: {
      linkedin: {
        type: String,
        match: [/^https?:\/\/(www\.)?linkedin\.com\/.*$/, 'Please enter a valid LinkedIn URL']
      },
      twitter: {
        type: String,
        match: [/^https?:\/\/(www\.)?twitter\.com\/.*$/, 'Please enter a valid Twitter URL']
      },
      github: {
        type: String,
        match: [/^https?:\/\/(www\.)?github\.com\/.*$/, 'Please enter a valid GitHub URL']
      },
      website: String
    }
  },
  // Student-specific fields
  enrolledCourses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedLessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    grade: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  // Gamification fields
  gamification: {
    points: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    badges: [{
      name: String,
      description: String,
      icon: String,
      earnedAt: {
        type: Date,
        default: Date.now
      }
    }],
    streak: {
      current: {
        type: Number,
        default: 0
      },
      longest: {
        type: Number,
        default: 0
      },
      lastActivity: Date
    }
  },
  // Teacher-specific fields
  teachingSubjects: [String],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  experience: {
    type: Number, // years of experience
    default: 0
  },
  // Preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      assignments: {
        type: Boolean,
        default: true
      },
      announcements: {
        type: Boolean,
        default: true
      }
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'students-only'],
      default: 'public'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for total courses (for students)
userSchema.virtual('totalCourses').get(function() {
  return this.enrolledCourses ? this.enrolledCourses.length : 0;
});

// Virtual getters for easier access to profile fields

userSchema.virtual('bio').get(function() {
  return this.profile?.bio || '';
});

userSchema.virtual('phone').get(function() {
  return this.profile?.phone || '';
});

userSchema.virtual('location').get(function() {
  return this.profile?.location || '';
});

userSchema.virtual('profilePicture').get(function() {
  return this.profile?.profilePicture || '';
});

userSchema.virtual('department').get(function() {
  return this.profile?.department || '';
});

userSchema.virtual('specialization').get(function() {
  return this.profile?.specialization || '';
});

userSchema.virtual('experienceText').get(function() {
  return this.profile?.experience || '';
});

userSchema.virtual('skills').get(function() {
  return this.profile?.skills || [];
});

userSchema.virtual('achievements').get(function() {
  return this.profile?.achievements || [];
});

userSchema.virtual('socialLinks').get(function() {
  return this.profile?.socialLinks || {};
});

userSchema.virtual('gamificationStats').get(function() {
  return {
    totalPoints: this.gamification?.points || 0,
    level: this.gamification?.level || 1,
    badges: this.gamification?.badges || [],
    streak: this.gamification?.streak?.current || 0
  };
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Method to add points and update level
userSchema.methods.addPoints = function(points) {
  this.gamification.points += points;
  
  // Level calculation (every 1000 points = 1 level)
  const newLevel = Math.floor(this.gamification.points / 1000) + 1;
  if (newLevel > this.gamification.level) {
    this.gamification.level = newLevel;
    // Could trigger badge or achievement here
  }
  
  return this.save({ validateBeforeSave: false });
};

// Method to update streak
userSchema.methods.updateStreak = function() {
  const today = new Date();
  const lastActivity = this.gamification.streak.lastActivity;
  
  if (!lastActivity) {
    // First activity
    this.gamification.streak.current = 1;
    this.gamification.streak.lastActivity = today;
  } else {
    const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      this.gamification.streak.current += 1;
      if (this.gamification.streak.current > this.gamification.streak.longest) {
        this.gamification.streak.longest = this.gamification.streak.current;
      }
    } else if (daysDiff > 1) {
      // Streak broken
      this.gamification.streak.current = 1;
    }
    // If daysDiff === 0, same day, no change needed
    
    this.gamification.streak.lastActivity = today;
  }
  
  return this.save({ validateBeforeSave: false });
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({ role: 'student', isActive: true })
    .sort({ 'gamification.points': -1 })
    .limit(limit)
    .select('firstName lastName avatar gamification.points gamification.level')
    .lean();
};

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ 'gamification.points': -1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
