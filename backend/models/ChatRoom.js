const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'video', 'audio', 'system', 'announcement'],
    default: 'text'
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
  // WhatsApp-like delivery status
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read'],
    default: 'sending'
  },
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: Date,
  deletedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isStarred: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    starredAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  forwardedFrom: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    roomName: String
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Chat room name is required'],
    trim: true,
    maxlength: [100, 'Chat room name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Chat room description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'course', 'announcement'],
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    notifications: {
      type: Boolean,
      default: true
    },
    isTyping: {
      type: Boolean,
      default: false
    },
    customNotificationSound: String,
    pinnedMessages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }]
  }],
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    blockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowOnlyAdmins: {
      type: Boolean,
      default: false
    },
    allowEditMessages: {
      type: Boolean,
      default: true
    },
    allowDeleteMessages: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number, // in MB
      default: 10
    },
    allowedFileTypes: [String],
    messageRetention: {
      type: Number, // in days, 0 means forever
      default: 0
    },
    disappearingMessages: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: {
        type: Number, // in seconds
        default: 0
      }
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: ''
  },
  wallpaper: {
    type: String,
    default: ''
  },
  pinnedBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    pinnedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total messages
chatRoomSchema.virtual('totalMessages').get(function() {
  return this.messages ? this.messages.filter(msg => !msg.isDeleted).length : 0;
});

// Virtual for unread messages count (would need user context)
chatRoomSchema.virtual('unreadCount').get(function() {
  // This would be calculated per user in the application logic
  return 0;
});

// Virtual for online participants count
chatRoomSchema.virtual('onlineCount').get(function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.participants ? this.participants.filter(p => p.lastSeen > fiveMinutesAgo).length : 0;
});

// Method to add participant
chatRoomSchema.methods.addParticipant = function(userId, role = 'member') {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (existingParticipant) {
    throw new Error('User is already a participant');
  }
  
  this.participants.push({
    user: userId,
    role: role
  });
  
  return this.save();
};

// Method to remove participant
chatRoomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

// Method to add message
chatRoomSchema.methods.addMessage = function(messageData) {
  // Check if user is participant
  const isParticipant = this.participants.some(p => p.user.toString() === messageData.sender.toString());
  
  if (!isParticipant && this.type !== 'announcement') {
    throw new Error('User is not a participant in this chat room');
  }
  
  // Check if only admins can send messages
  if (this.settings.allowOnlyAdmins) {
    const participant = this.participants.find(p => p.user.toString() === messageData.sender.toString());
    if (!participant || (participant.role !== 'admin' && participant.role !== 'moderator')) {
      throw new Error('Only admins and moderators can send messages in this room');
    }
  }
  
  this.messages.push(messageData);
  this.lastActivity = new Date();
  
  return this.save();
};

// Method to update last seen for a user
chatRoomSchema.methods.updateLastSeen = function(userId) {
  if (!userId) {
    return Promise.resolve(this);
  }
  
  const participant = this.participants.find(p => p.user && p.user.toString() === userId.toString());
  
  if (participant) {
    participant.lastSeen = new Date();
    return this.save({ validateBeforeSave: false });
  }
  
  return Promise.resolve(this);
};

// Method to mark messages as read
chatRoomSchema.methods.markAsRead = function(userId, messageIds = []) {
  const messagesToUpdate = messageIds.length > 0 
    ? this.messages.filter(msg => messageIds.includes(msg._id.toString()))
    : this.messages;
  
  messagesToUpdate.forEach(message => {
    const alreadyRead = message.readBy.some(read => read.user.toString() === userId.toString());
    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
    }
  });
  
  return this.save({ validateBeforeSave: false });
};

// Method to get unread messages for a user
chatRoomSchema.methods.getUnreadMessages = function(userId) {
  return this.messages.filter(message => 
    !message.isDeleted && 
    message.sender.toString() !== userId.toString() &&
    !message.readBy.some(read => read.user.toString() === userId.toString())
  );
};

// Static method to get user's chat rooms
chatRoomSchema.statics.getUserChatRooms = function(userId) {
  return this.find({
    'participants.user': userId,
    isActive: true
  })
  .populate('participants.user', 'firstName lastName avatar')
  .populate('course', 'title')
  .sort({ lastActivity: -1 })
  .select('-messages')
  .lean();
};

// Static method to create direct chat between two users
chatRoomSchema.statics.createDirectChat = function(user1Id, user2Id) {
  // Check if direct chat already exists
  return this.findOne({
    type: 'direct',
    $and: [
      { 'participants.user': user1Id },
      { 'participants.user': user2Id }
    ]
  }).then(existingChat => {
    if (existingChat) {
      return existingChat;
    }
    
    // Create new direct chat
    return this.create({
      name: 'Direct Chat',
      type: 'direct',
      participants: [
        { user: user1Id, role: 'member' },
        { user: user2Id, role: 'member' }
      ]
    });
  });
};

// Static method to create course chat room
chatRoomSchema.statics.createCourseChat = function(courseId, name, description) {
  return this.create({
    name: name || 'Course Discussion',
    description,
    type: 'course',
    course: courseId,
    participants: [], // Will be populated when users join the course
    settings: {
      allowFileSharing: true,
      allowOnlyAdmins: false
    }
  });
};

// Pre-save middleware to update last activity
chatRoomSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
  }
  next();
});

// Indexes for performance
chatRoomSchema.index({ 'participants.user': 1 });
chatRoomSchema.index({ course: 1 });
chatRoomSchema.index({ type: 1 });
chatRoomSchema.index({ lastActivity: -1 });
chatRoomSchema.index({ isActive: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
