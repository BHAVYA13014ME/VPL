const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: String, originalName: String, path: String,
  size: Number, mimeType: String, uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 5000 },
  type:    { type: String, enum: ['text','image','file','video','audio','system','announcement'], default: 'text' },
  attachments: [attachmentSchema],
  status:      { type: String, enum: ['sending','sent','delivered','read'], default: 'sending' },
  deliveredTo: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, deliveredAt: { type: Date, default: Date.now } }],
  readBy:      [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: { type: Date, default: Date.now } }],
  editedAt:    Date,
  deletedAt:   Date,
  isDeleted:   { type: Boolean, default: false },
  deletedFor:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isStarred:   [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, starredAt: { type: Date, default: Date.now } }],
  reactions:   [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String, createdAt: { type: Date, default: Date.now } }],
  replyTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  forwardedFrom: { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, roomName: String },
  mentions:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const participantSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:      { type: String, enum: ['admin','moderator','member'], default: 'member' },
  joinedAt:  { type: Date, default: Date.now },
  lastSeen:  { type: Date, default: Date.now },
  notifications: { type: Boolean, default: true },
  isTyping:  { type: Boolean, default: false },
  customNotificationSound: String,
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
}, { _id: false });

const chatRoomSchema = new mongoose.Schema({
  name:        { type: String, required: [true, 'Chat room name is required'], trim: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  type:        { type: String, enum: ['direct','group','course','announcement'], required: true },
  course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [participantSchema],
  messages:    [messageSchema],
  isActive:    { type: Boolean, default: true },
  isArchived:  { type: Boolean, default: false },
  archivedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  settings: {
    maxParticipants:   { type: Number, default: 100 },
    allowFileSharing:  { type: Boolean, default: true },
    allowVoiceMessages:{ type: Boolean, default: true },
  },
}, { timestamps: true });

// Instance: update the lastSeen timestamp for a participant
chatRoomSchema.methods.updateLastSeen = async function (userId) {
  const userIdStr = userId.toString();
  const participant = this.participants.find(
    (p) => p.user && p.user.toString() === userIdStr
  );
  if (participant) {
    participant.lastSeen = new Date();
    await this.save();
  }
};

// Instance: add a new participant (skip if already present)
chatRoomSchema.methods.addParticipant = async function (userId, role = 'member') {
  const userIdStr = userId.toString();
  const alreadyIn = this.participants.some(
    (p) => p.user && p.user.toString() === userIdStr
  );
  if (alreadyIn) return;
  this.participants.push({ user: userId, role });
  await this.save();
};

// Instance: remove a participant by userId
chatRoomSchema.methods.removeParticipant = async function (userId) {
  const userIdStr = userId.toString();
  this.participants = this.participants.filter(
    (p) => !p.user || p.user.toString() !== userIdStr
  );
  await this.save();
};

// Instance: append a message to the messages array
chatRoomSchema.methods.addMessage = async function (messageData) {
  this.messages.push(messageData);
  await this.save();
};

// Instance: mark messages as read by userId
// If messageIds array is provided, only those messages are marked; otherwise all unread.
chatRoomSchema.methods.markAsRead = async function (userId, messageIds) {
  const userIdStr = userId.toString();
  const now = new Date();

  this.messages.forEach((msg) => {
    if (msg.isDeleted) return;

    // If specific IDs given, only mark those
    if (messageIds && messageIds.length > 0) {
      if (!messageIds.includes(msg._id.toString())) return;
    }

    // Skip messages sent by the user themselves
    const senderId = msg.sender ? msg.sender.toString() : '';
    if (senderId === userIdStr) return;

    const alreadyRead = msg.readBy.some((r) => {
      const rid = r.user ? r.user.toString() : '';
      return rid === userIdStr;
    });
    if (!alreadyRead) {
      msg.readBy.push({ user: userId, readAt: now });
    }
  });

  await this.save();
};

// Static: return all active chat rooms a user participates in
chatRoomSchema.statics.getUserChatRooms = async function (userId) {
  return this.find({
    'participants.user': userId,
    isActive: true,
  })
    .populate('participants.user', 'firstName lastName avatar email')
    .populate('messages.sender', 'firstName lastName avatar')
    .populate('course', 'title')
    .sort({ updatedAt: -1 })
    .lean();
};

// Static: find or create a 1-to-1 direct chat between two users
chatRoomSchema.statics.createDirectChat = async function (userId1, userId2) {
  // Look for an existing direct chat that contains exactly these two participants
  const existing = await this.findOne({
    type: 'direct',
    isActive: true,
    'participants.user': { $all: [userId1, userId2] },
    $expr: { $eq: [{ $size: '$participants' }, 2] },
  });
  if (existing) return existing;

  const room = await this.create({
    name: 'Direct Chat',
    type: 'direct',
    participants: [
      { user: userId1, role: 'admin' },
      { user: userId2, role: 'admin' },
    ],
    createdBy: userId1,
  });
  return room;
};

// Instance: return messages not yet read by userId
chatRoomSchema.methods.getUnreadMessages = function (userId) {
  const userIdStr = userId.toString();
  return this.messages.filter((msg) => {
    if (msg.isDeleted) return false;
    if (!msg.sender) return false;
    const senderId = msg.sender._id
      ? msg.sender._id.toString()
      : msg.sender.toString();
    if (senderId === userIdStr) return false; // own messages are not "unread"
    const hasRead =
      Array.isArray(msg.readBy) &&
      msg.readBy.some((r) => {
        const rid = r.user && r.user._id
          ? r.user._id.toString()
          : (r.user ? r.user.toString() : '');
        return rid === userIdStr;
      });
    return !hasRead;
  });
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
