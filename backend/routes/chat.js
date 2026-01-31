const express = require('express');
const { body, validationResult } = require('express-validator');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadConfigs, getFilesInfo } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @desc    Get user's chat rooms
// @route   GET /api/chat/rooms
// @access  Private
router.get('/rooms', auth, asyncHandler(async (req, res) => {
  const chatRooms = await ChatRoom.getUserChatRooms(req.user._id);

  // Add unread count for each room and filter out rooms with invalid data
  const roomsWithUnreadCount = await Promise.all(
    chatRooms.map(async (room) => {
      try {
        const chatRoom = await ChatRoom.findById(room._id);
        if (!chatRoom) return null;
        
        const unreadMessages = chatRoom.getUnreadMessages(req.user._id);
        
        // Filter out null participants
        const validParticipants = room.participants.filter(p => p.user !== null);
        
        return {
          ...room,
          participants: validParticipants,
          unreadCount: unreadMessages.length,
          lastMessage: room.messages && room.messages.length > 0 
            ? room.messages[room.messages.length - 1] 
            : null
        };
      } catch (err) {
        console.error('Error processing room:', room._id, err.message);
        return null;
      }
    })
  );

  // Filter out null/invalid rooms
  const validRooms = roomsWithUnreadCount.filter(room => room !== null);

  res.json({
    success: true,
    data: {
      chatRooms: validRooms
    }
  });
}));

// @desc    Get single chat room with messages
// @route   GET /api/chat/rooms/:id
// @access  Private
router.get('/rooms/:id', auth, asyncHandler(async (req, res) => {
  const chatRoom = await ChatRoom.findById(req.params.id)
    .populate('participants.user', 'firstName lastName avatar')
    .populate('messages.sender', 'firstName lastName avatar')
    .populate('course', 'title');

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user has access to this chat room (filter out null participants)
  const isParticipant = chatRoom.participants.some(
    p => p.user && p.user._id && p.user._id.toString() === req.user._id.toString()
  );

  if (!isParticipant && chatRoom.type !== 'announcement') {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  // Filter out deleted messages and messages with null senders
  const activeMessages = chatRoom.messages.filter(msg => !msg.isDeleted && msg.sender);

  // Filter out null participants
  const validParticipants = chatRoom.participants.filter(p => p.user !== null);

  // Update last seen for this user
  await chatRoom.updateLastSeen(req.user._id);

  res.json({
    success: true,
    data: {
      chatRoom: {
        ...chatRoom.toObject(),
        participants: validParticipants,
        messages: activeMessages
      }
    }
  });
}));

// @desc    Create group chat room
// @route   POST /api/chat/rooms
// @access  Private
router.post('/rooms', auth, uploadConfigs.avatar, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Chat room name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .isIn(['group', 'course', 'direct'])
    .withMessage('Type must be group, course, or direct'),
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { name, description, type, courseId } = req.body;
  // Accept both 'participants' and 'participantIds' for compatibility
  let participantIds = req.body.participants || req.body.participantIds;

  // Parse participants if it's a JSON string
  if (typeof participantIds === 'string') {
    try {
      participantIds = JSON.parse(participantIds);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid participants format'
      });
    }
  }

  // Validate participants exist
  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one participant is required'
    });
  }

  const participants = await User.find({ _id: { $in: participantIds } });
  
  if (participants.length !== participantIds.length) {
    return res.status(400).json({
      success: false,
      message: 'One or more participants not found'
    });
  }

  // Create chat room data
  const chatRoomData = {
    name,
    description,
    type,
    createdBy: req.user._id,
    participants: [
      { user: req.user._id, role: 'admin' }, // Creator is admin
      ...participantIds
        .filter(id => id !== req.user._id.toString()) // Don't duplicate creator
        .map(id => ({ user: id, role: 'member' }))
    ]
  };

  // Handle avatar upload
  if (req.file) {
    chatRoomData.avatar = `/uploads/avatars/${req.file.filename}`;
  }

  if (type === 'course' && courseId) {
    chatRoomData.course = courseId;
  }

  const chatRoom = await ChatRoom.create(chatRoomData);
  
  await chatRoom.populate('participants.user', 'firstName lastName avatar');
  await chatRoom.populate('course', 'title');

  res.status(201).json({
    success: true,
    message: 'Chat room created successfully',
    data: {
      chatRoom
    }
  });
}));

// @desc    Create or get direct chat
// @route   POST /api/chat/direct
// @access  Private
router.post('/direct', auth, [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (userId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot create direct chat with yourself'
    });
  }

  // Check if target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Create or get existing direct chat
  const chatRoom = await ChatRoom.createDirectChat(req.user._id, userId);
  
  await chatRoom.populate('participants.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Direct chat ready',
    data: {
      chatRoom
    }
  });
}));

// @desc    Add participants to chat room
// @route   POST /api/chat/rooms/:id/participants
// @access  Private (Admin or Moderator of the room)
router.post('/rooms/:id/participants', auth, [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('At least one user ID is required')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user has permission to add participants
  const userParticipant = chatRoom.participants.find(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!userParticipant || (userParticipant.role !== 'admin' && userParticipant.role !== 'moderator')) {
    return res.status(403).json({
      success: false,
      message: 'Only admins and moderators can add participants'
    });
  }

  // Validate users exist
  const users = await User.find({ _id: { $in: userIds } });
  
  if (users.length !== userIds.length) {
    return res.status(400).json({
      success: false,
      message: 'One or more users not found'
    });
  }

  // Add participants
  const addedUsers = [];
  for (const userId of userIds) {
    try {
      await chatRoom.addParticipant(userId);
      const user = users.find(u => u._id.toString() === userId);
      addedUsers.push(user);
    } catch (error) {
      // User might already be a participant, continue
    }
  }

  res.json({
    success: true,
    message: `${addedUsers.length} participants added successfully`,
    data: {
      addedUsers: addedUsers.map(user => ({
        id: user._id,
        name: user.fullName,
        avatar: user.avatar
      }))
    }
  });
}));

// @desc    Remove participant from chat room
// @route   DELETE /api/chat/rooms/:id/participants/:userId
// @access  Private (Admin/Moderator or self)
router.delete('/rooms/:id/participants/:userId', auth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user has permission to remove participants
  const userParticipant = chatRoom.participants.find(
    p => p.user.toString() === req.user._id.toString()
  );

  const canRemove = userParticipant && (
    userParticipant.role === 'admin' || 
    userParticipant.role === 'moderator' ||
    userId === req.user._id.toString() // User can remove themselves
  );

  if (!canRemove) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to remove this participant'
    });
  }

  await chatRoom.removeParticipant(userId);

  res.json({
    success: true,
    message: 'Participant removed successfully'
  });
}));

// @desc    Update chat room settings
// @route   PUT /api/chat/rooms/:id/settings
// @access  Private (Admin or Moderator)
router.put('/rooms/:id/settings', auth, [
  body('allowFileSharing')
    .optional()
    .isBoolean()
    .withMessage('allowFileSharing must be a boolean'),
  body('allowOnlyAdmins')
    .optional()
    .isBoolean()
    .withMessage('allowOnlyAdmins must be a boolean'),
  body('maxFileSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('maxFileSize must be between 1 and 100 MB')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user has permission to update settings
  const userParticipant = chatRoom.participants.find(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!userParticipant || (userParticipant.role !== 'admin' && userParticipant.role !== 'moderator')) {
    return res.status(403).json({
      success: false,
      message: 'Only admins and moderators can update settings'
    });
  }

  // Update settings
  chatRoom.settings = { ...chatRoom.settings, ...req.body };
  await chatRoom.save();

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      settings: chatRoom.settings
    }
  });
}));

// @desc    Send message with file attachments
// @route   POST /api/chat/rooms/:id/message
// @access  Private
router.post('/rooms/:id/message', auth, uploadConfigs.chatAttachments, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Invalid message type'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('replyTo must be a valid message ID')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { content, type = 'text', replyTo } = req.body;
  
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user is participant
  const isParticipant = chatRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant && chatRoom.type !== 'announcement') {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  const messageData = {
    sender: req.user._id,
    content,
    type,
    replyTo: replyTo || undefined
  };

  // Handle file attachments
  if (req.files && req.files.length > 0) {
    messageData.attachments = getFilesInfo(req.files);
    messageData.type = 'file';
  }

  await chatRoom.addMessage(messageData);

  // Get the newly added message with populated data
  const updatedChatRoom = await ChatRoom.findById(req.params.id)
    .populate('messages.sender', 'firstName lastName avatar');
  
  const newMessage = updatedChatRoom.messages[updatedChatRoom.messages.length - 1];

  res.json({
    success: true,
    message: 'Message sent successfully',
    data: {
      message: newMessage
    }
  });
}));

// @desc    Get chat room messages with pagination
// @route   GET /api/chat/rooms/:id/messages
// @access  Private
router.get('/rooms/:id/messages', auth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user has access
  const isParticipant = chatRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant && chatRoom.type !== 'announcement') {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  // Get messages with pagination (newest first, then reverse for chronological order)
  const totalMessages = chatRoom.messages.filter(msg => !msg.isDeleted).length;
  const messages = chatRoom.messages
    .filter(msg => !msg.isDeleted)
    .reverse() // Get newest first
    .slice(skip, skip + limit)
    .reverse(); // Reverse back for chronological order

  // Populate sender information
  await ChatRoom.populate(messages, {
    path: 'sender',
    select: 'firstName lastName avatar'
  });

  res.json({
    success: true,
    data: {
      messages,
      pagination: {
        current: page,
        pages: Math.ceil(totalMessages / limit),
        total: totalMessages,
        hasNext: page < Math.ceil(totalMessages / limit),
        hasPrev: page > 1
      }
    }
  });
}));

// @desc    Mark messages as read
// @route   POST /api/chat/rooms/:id/read
// @access  Private
router.post('/rooms/:id/read', auth, [
  body('messageIds')
    .optional()
    .isArray()
    .withMessage('messageIds must be an array')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { messageIds } = req.body;
  
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  await chatRoom.markAsRead(req.user._id, messageIds);

  res.json({
    success: true,
    message: 'Messages marked as read'
  });
}));

// @desc    Search messages in chat room
// @route   GET /api/chat/rooms/:id/search
// @access  Private
router.get('/rooms/:id/search', auth, asyncHandler(async (req, res) => {
  const { q: searchQuery } = req.query;

  if (!searchQuery) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user has access
  const isParticipant = chatRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant && chatRoom.type !== 'announcement') {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  // Search messages
  const searchResults = chatRoom.messages.filter(msg => 
    !msg.isDeleted && 
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Populate sender information
  await ChatRoom.populate(searchResults, {
    path: 'sender',
    select: 'firstName lastName avatar'
  });

  res.json({
    success: true,
    data: {
      messages: searchResults,
      count: searchResults.length,
      query: searchQuery
    }
  });
}));

// @desc    Clear all messages in a chat room
// @route   DELETE /api/chat/rooms/:id/messages
// @access  Private
router.delete('/rooms/:id/messages', auth, asyncHandler(async (req, res) => {
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  // Check if user is participant
  const isParticipant = chatRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  // Clear all messages (mark as deleted)
  chatRoom.messages.forEach(msg => {
    msg.isDeleted = true;
    msg.deletedAt = new Date();
  });

  await chatRoom.save();

  res.json({
    success: true,
    message: 'Chat cleared successfully'
  });
}));

// @desc    Edit a message
// @route   PUT /api/chat/rooms/:id/messages/:messageId
// @access  Private (message sender only)
router.put('/rooms/:id/messages/:messageId', auth, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  const message = chatRoom.messages.id(req.params.messageId);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Only message sender can edit
  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit your own messages'
    });
  }

  // Check if editing is allowed in this room
  if (!chatRoom.settings?.allowEditMessages) {
    return res.status(403).json({
      success: false,
      message: 'Editing messages is not allowed in this chat'
    });
  }

  message.content = content;
  message.editedAt = new Date();

  await chatRoom.save();

  res.json({
    success: true,
    message: 'Message updated successfully',
    data: {
      message: {
        _id: message._id,
        content: message.content,
        editedAt: message.editedAt
      }
    }
  });
}));

// @desc    Delete a message
// @route   DELETE /api/chat/rooms/:id/messages/:messageId
// @access  Private
router.delete('/rooms/:id/messages/:messageId', auth, asyncHandler(async (req, res) => {
  const { deleteForEveryone } = req.body;
  
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  const message = chatRoom.messages.id(req.params.messageId);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Check if user is participant
  const isParticipant = chatRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  const isSender = message.sender.toString() === req.user._id.toString();

  if (deleteForEveryone) {
    // Only sender can delete for everyone
    if (!isSender) {
      return res.status(403).json({
        success: false,
        message: 'Only the message sender can delete for everyone'
      });
    }

    // Check if delete for everyone is allowed
    if (!chatRoom.settings?.allowDeleteMessages) {
      return res.status(403).json({
        success: false,
        message: 'Deleting messages for everyone is not allowed in this chat'
      });
    }

    message.isDeleted = true;
    message.content = 'This message was deleted';
    message.deletedAt = new Date();
  } else {
    // Delete only for this user
    if (!message.deletedFor) {
      message.deletedFor = [];
    }
    message.deletedFor.push(req.user._id);
  }

  await chatRoom.save();

  res.json({
    success: true,
    message: deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted for you'
  });
}));

// @desc    Star/Unstar a message
// @route   POST /api/chat/rooms/:id/messages/:messageId/star
// @access  Private
router.post('/rooms/:id/messages/:messageId/star', auth, asyncHandler(async (req, res) => {
  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  const message = chatRoom.messages.id(req.params.messageId);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Check if user is participant
  const isParticipant = chatRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  // Initialize isStarred array if not exists
  if (!message.isStarred) {
    message.isStarred = [];
  }

  // Check if already starred
  const existingStarIndex = message.isStarred.findIndex(
    s => s.user.toString() === req.user._id.toString()
  );

  let isStarred;
  if (existingStarIndex > -1) {
    // Unstar
    message.isStarred.splice(existingStarIndex, 1);
    isStarred = false;
  } else {
    // Star
    message.isStarred.push({
      user: req.user._id,
      starredAt: new Date()
    });
    isStarred = true;
  }

  await chatRoom.save();

  res.json({
    success: true,
    message: isStarred ? 'Message starred' : 'Message unstarred',
    data: {
      isStarred,
      messageId: message._id
    }
  });
}));

// @desc    Get starred messages
// @route   GET /api/chat/starred
// @access  Private
router.get('/starred', auth, asyncHandler(async (req, res) => {
  const chatRooms = await ChatRoom.find({
    'participants.user': req.user._id,
    'messages.isStarred.user': req.user._id
  }).populate('messages.sender', 'firstName lastName avatar');

  const starredMessages = [];
  
  chatRooms.forEach(room => {
    room.messages.forEach(msg => {
      if (msg.isStarred && msg.isStarred.some(s => s.user.toString() === req.user._id.toString())) {
        starredMessages.push({
          ...msg.toObject(),
          roomId: room._id,
          roomName: room.name,
          roomType: room.type
        });
      }
    });
  });

  // Sort by starred date
  starredMessages.sort((a, b) => {
    const aDate = a.isStarred.find(s => s.user.toString() === req.user._id.toString())?.starredAt;
    const bDate = b.isStarred.find(s => s.user.toString() === req.user._id.toString())?.starredAt;
    return new Date(bDate) - new Date(aDate);
  });

  res.json({
    success: true,
    data: {
      messages: starredMessages
    }
  });
}));

// @desc    Forward a message to another chat
// @route   POST /api/chat/rooms/:id/forward
// @access  Private
router.post('/rooms/:id/forward', auth, [
  body('messageId')
    .isMongoId()
    .withMessage('Valid message ID is required'),
  body('fromRoomId')
    .isMongoId()
    .withMessage('Valid source room ID is required')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { messageId, fromRoomId } = req.body;
  const targetRoomId = req.params.id;

  // Get source room and message
  const sourceRoom = await ChatRoom.findById(fromRoomId);
  if (!sourceRoom) {
    return res.status(404).json({
      success: false,
      message: 'Source chat room not found'
    });
  }

  const originalMessage = sourceRoom.messages.id(messageId);
  if (!originalMessage) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Get target room
  const targetRoom = await ChatRoom.findById(targetRoomId);
  if (!targetRoom) {
    return res.status(404).json({
      success: false,
      message: 'Target chat room not found'
    });
  }

  // Check if user has access to both rooms
  const hasAccessToSource = sourceRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );
  const hasAccessToTarget = targetRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!hasAccessToSource || !hasAccessToTarget) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to one or both chat rooms'
    });
  }

  // Create forwarded message
  const forwardedMessage = {
    sender: req.user._id,
    content: originalMessage.content,
    type: originalMessage.type,
    attachments: originalMessage.attachments,
    forwardedFrom: {
      _id: originalMessage._id,
      roomName: sourceRoom.name
    }
  };

  await targetRoom.addMessage(forwardedMessage);

  // Get the newly added message
  const newMessage = targetRoom.messages[targetRoom.messages.length - 1];

  await ChatRoom.populate(newMessage, {
    path: 'sender',
    select: 'firstName lastName avatar'
  });

  res.json({
    success: true,
    message: 'Message forwarded successfully',
    data: {
      message: newMessage
    }
  });
}));

// @desc    Add reaction to message
// @route   POST /api/chat/rooms/:id/messages/:messageId/react
// @access  Private
router.post('/rooms/:id/messages/:messageId/react', auth, [
  body('emoji')
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji is required')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { emoji } = req.body;

  const chatRoom = await ChatRoom.findById(req.params.id);

  if (!chatRoom) {
    return res.status(404).json({
      success: false,
      message: 'Chat room not found'
    });
  }

  const message = chatRoom.messages.id(req.params.messageId);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Check if user is participant
  const isParticipant = chatRoom.participants.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this chat room'
    });
  }

  // Initialize reactions array if not exists
  if (!message.reactions) {
    message.reactions = [];
  }

  // Check if user already reacted with this emoji
  const existingReactionIndex = message.reactions.findIndex(
    r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
  );

  if (existingReactionIndex > -1) {
    // Remove reaction
    message.reactions.splice(existingReactionIndex, 1);
  } else {
    // Add reaction
    message.reactions.push({
      user: req.user._id,
      emoji,
      createdAt: new Date()
    });
  }

  await chatRoom.save();

  res.json({
    success: true,
    message: 'Reaction updated',
    data: {
      reactions: message.reactions
    }
  });
}));

module.exports = router;
