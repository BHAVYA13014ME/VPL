const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  caller:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  callType: { type: String, enum: ['voice', 'video'], required: true },
  status:   { type: String, enum: ['completed', 'missed', 'rejected'], required: true },
  startTime:{ type: Date, required: true },
  endTime:  { type: Date },
  duration: { type: Number, default: 0 },
  callId:   { type: String, required: true, unique: true },
}, { timestamps: true });

callHistorySchema.pre('save', function () {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
});

callHistorySchema.methods.formatDuration = function () {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

callHistorySchema.statics.getCallHistoryForUser = async function (userId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const calls = await this.find({ $or: [{ caller: userId }, { receiver: userId }] })
    .populate('caller', 'firstName lastName avatar')
    .populate('receiver', 'firstName lastName avatar')
    .sort({ startTime: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments({ $or: [{ caller: userId }, { receiver: userId }] });
  return {
    calls: calls.map(call => {
      const isIncoming = call.receiver._id.toString() === userId.toString();
      const otherUser  = isIncoming ? call.caller : call.receiver;
      return {
        _id: call._id, callId: call.callId, type: call.callType, status: call.status,
        direction: isIncoming ? 'incoming' : 'outgoing',
        otherUser: { _id: otherUser?._id, name: `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim(), avatar: otherUser?.avatar },
        startTime: call.startTime, endTime: call.endTime,
        duration: call.duration, formattedDuration: call.formatDuration(),
        createdAt: call.createdAt,
      };
    }),
    total, hasMore: skip + calls.length < total, page, totalPages: Math.ceil(total / limit),
  };
};

callHistorySchema.statics.recordCall = async function (callData) {
  const call = new this(callData);
  await call.save();
  return call;
};

module.exports = mongoose.model('CallHistory', callHistorySchema);
