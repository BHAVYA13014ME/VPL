const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callType: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'rejected'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  callId: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Calculate duration before saving
callHistorySchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

// Instance methods
callHistorySchema.methods.formatDuration = function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Static methods
callHistorySchema.statics.getCallHistoryForUser = async function(userId, page = 1, limit = 50) {
  try {
    const skip = (page - 1) * limit;
    
    const calls = await this.find({
      $or: [
        { caller: userId },
        { receiver: userId }
      ]
    })
    .populate('caller', 'firstName lastName fullName avatar')
    .populate('receiver', 'firstName lastName fullName avatar')
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(limit);

    const total = await this.countDocuments({
      $or: [
        { caller: userId },
        { receiver: userId }
      ]
    });

    return {
      calls: calls.map(call => {
        const isIncoming = call.receiver._id.toString() === userId;
        const otherUser = isIncoming ? call.caller : call.receiver;
        
        return {
          _id: call._id,
          callId: call.callId,
          type: call.callType,
          status: call.status,
          direction: isIncoming ? 'incoming' : 'outgoing',
          otherUser: {
            _id: otherUser._id,
            name: otherUser.fullName,
            avatar: otherUser.avatar
          },
          startTime: call.startTime,
          endTime: call.endTime,
          duration: call.duration,
          formattedDuration: call.formatDuration(),
          createdAt: call.createdAt
        };
      }),
      total,
      hasMore: skip + calls.length < total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error('Failed to fetch call history: ' + error.message);
  }
};

callHistorySchema.statics.recordCall = async function(callData) {
  try {
    const call = new this(callData);
    await call.save();
    return call;
  } catch (error) {
    throw new Error('Failed to record call: ' + error.message);
  }
};

module.exports = mongoose.model('CallHistory', callHistorySchema);