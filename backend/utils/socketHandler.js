const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const CallHistory = require('../models/CallHistory');

// Store connected users
const connectedUsers = new Map();

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

// Main socket handler
const socketHandler = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`🔗 User ${socket.user.fullName} connected (${socket.userId})`);
    console.log(`📊 Total online users: ${connectedUsers.size + 1}`);

    // Store connected user
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      joinedAt: new Date()
    });

    // Emit online users count to all clients
    io.emit('online_users_count', connectedUsers.size);
    
    // Broadcast user online status
    socket.broadcast.emit('user_online', socket.userId);

    // Join user to their personal room for direct messages
    socket.join(`user_${socket.userId}`);

    // Send user their chat rooms
    socket.emit('user_rooms', Array.from(socket.rooms));

    // Handle joining chat rooms
    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;
        console.log(`🚪 ${socket.user.fullName} joining room: ${roomId}`);
        
        // Verify user has access to this room
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          console.log(`❌ Room not found: ${roomId}`);
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        // Check if user is a participant (handle null users)
        const isParticipant = chatRoom.participants.some(
          p => p.user && p.user.toString() === socket.userId
        );

        if (!isParticipant && chatRoom.type !== 'announcement') {
          console.log(`🚫 Access denied for ${socket.user.fullName} to room: ${chatRoom.name}`);
          socket.emit('error', { message: 'Access denied to this chat room' });
          return;
        }

        // Join the room
        socket.join(roomId);
        console.log(`✅ ${socket.user.fullName} joined room: ${chatRoom.name}`);
        
        // Update user's last seen in the room
        await chatRoom.updateLastSeen(socket.userId);

        // Notify others in the room
        socket.to(roomId).emit('user_joined', {
          userId: socket.userId,
          userName: socket.user.fullName,
          avatar: socket.user.avatar
        });

        socket.emit('joined_room', { roomId, roomName: chatRoom.name });
      } catch (error) {
        console.error('❌ Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving chat rooms
    socket.on('leave_room', (data) => {
      const { roomId } = data;
      socket.leave(roomId);
      
      socket.to(roomId).emit('user_left', {
        userId: socket.userId,
        userName: socket.user.fullName
      });

      socket.emit('left_room', { roomId });
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'text', replyTo } = data;
        console.log(`📨 Message from ${socket.user.fullName}:`, content.substring(0, 50));
        
        // Find the chat room
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          console.log(`❌ Chat room not found: ${roomId}`);
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        // Create message object
        const messageData = {
          sender: socket.userId,
          content,
          type,
          replyTo: replyTo || undefined
        };

        // Add message to chat room
        await chatRoom.addMessage(messageData);
        console.log(`✅ Message added to room: ${chatRoom.name}`);
        
        // Get the newly added message (with populated sender info)
        const updatedChatRoom = await ChatRoom.findById(roomId)
          .populate('messages.sender', 'firstName lastName avatar');
        
        const newMessage = updatedChatRoom.messages[updatedChatRoom.messages.length - 1];

        // Emit message to all users in the room
        io.to(roomId).emit('new_message', {
          roomId,
          message: newMessage
        });
        console.log(`📤 Message broadcast to room: ${chatRoom.name}`);

        // Send push notification to offline users (implement based on your notification system)
        // notifyOfflineUsers(chatRoom, newMessage);

      } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message reactions
    socket.on('react_to_message', async (data) => {
      try {
        const { roomId, messageId, emoji } = data;
        
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        const message = chatRoom.messages.id(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
          r => r.user.toString() === socket.userId && r.emoji === emoji
        );

        if (existingReaction) {
          // Remove reaction
          message.reactions.pull(existingReaction._id);
        } else {
          // Add reaction
          message.reactions.push({
            user: socket.userId,
            emoji
          });
        }

        await chatRoom.save();

        // Emit reaction update to all users in the room
        io.to(roomId).emit('message_reaction', {
          roomId,
          messageId,
          reactions: message.reactions
        });

      } catch (error) {
        console.error('Error reacting to message:', error);
        socket.emit('error', { message: 'Failed to react to message' });
      }
    });

    // Handle edit message
    socket.on('edit_message', async (data) => {
      try {
        const { roomId, messageId, content } = data;
        
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        const message = chatRoom.messages.id(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Only sender can edit
        if (message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'You can only edit your own messages' });
          return;
        }

        message.content = content;
        message.editedAt = new Date();
        await chatRoom.save();

        // Broadcast edit to all users in the room
        io.to(roomId).emit('message_edited', {
          roomId,
          messageId,
          content,
          editedAt: message.editedAt
        });

        console.log(`📝 Message edited in room: ${chatRoom.name}`);

      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle delete message
    socket.on('delete_message', async (data) => {
      try {
        const { roomId, messageId, deleteForEveryone } = data;
        
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        const message = chatRoom.messages.id(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        const isSender = message.sender.toString() === socket.userId;

        if (deleteForEveryone) {
          if (!isSender) {
            socket.emit('error', { message: 'Only the sender can delete for everyone' });
            return;
          }
          message.isDeleted = true;
          message.content = 'This message was deleted';
          message.deletedAt = new Date();
        } else {
          if (!message.deletedFor) {
            message.deletedFor = [];
          }
          message.deletedFor.push(socket.userId);
        }

        await chatRoom.save();

        // Broadcast delete to all users in the room
        io.to(roomId).emit('message_deleted', {
          roomId,
          messageId,
          deleteForEveryone,
          deletedBy: socket.userId
        });

        console.log(`🗑️ Message deleted in room: ${chatRoom.name}`);

      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle star message
    socket.on('star_message', async (data) => {
      try {
        const { roomId, messageId } = data;
        
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        const message = chatRoom.messages.id(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        if (!message.isStarred) {
          message.isStarred = [];
        }

        const existingStarIndex = message.isStarred.findIndex(
          s => s.user.toString() === socket.userId
        );

        let isStarred;
        if (existingStarIndex > -1) {
          message.isStarred.splice(existingStarIndex, 1);
          isStarred = false;
        } else {
          message.isStarred.push({
            user: socket.userId,
            starredAt: new Date()
          });
          isStarred = true;
        }

        await chatRoom.save();

        // Send star update to the user
        socket.emit('message_starred', {
          roomId,
          messageId,
          isStarred
        });

        console.log(`⭐ Message ${isStarred ? 'starred' : 'unstarred'} in room: ${chatRoom.name}`);

      } catch (error) {
        console.error('Error starring message:', error);
        socket.emit('error', { message: 'Failed to star message' });
      }
    });

    // Handle forward message
    socket.on('forward_message', async (data) => {
      try {
        const { targetRoomId, messageId, fromRoomId } = data;
        
        // Get source room and message
        const sourceRoom = await ChatRoom.findById(fromRoomId);
        if (!sourceRoom) {
          socket.emit('error', { message: 'Source room not found' });
          return;
        }

        const originalMessage = sourceRoom.messages.id(messageId);
        if (!originalMessage) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Get target room
        const targetRoom = await ChatRoom.findById(targetRoomId);
        if (!targetRoom) {
          socket.emit('error', { message: 'Target room not found' });
          return;
        }

        // Create forwarded message
        const forwardedMessage = {
          sender: socket.userId,
          content: originalMessage.content,
          type: originalMessage.type,
          attachments: originalMessage.attachments,
          forwardedFrom: {
            _id: originalMessage._id,
            roomName: sourceRoom.name
          }
        };

        await targetRoom.addMessage(forwardedMessage);

        // Get the newly added message with populated sender
        const updatedTargetRoom = await ChatRoom.findById(targetRoomId)
          .populate('messages.sender', 'firstName lastName avatar');
        
        const newMessage = updatedTargetRoom.messages[updatedTargetRoom.messages.length - 1];

        // Emit to target room
        io.to(targetRoomId).emit('new_message', {
          roomId: targetRoomId,
          message: newMessage
        });

        // Confirm to sender
        socket.emit('message_forwarded', {
          targetRoomId,
          messageId: newMessage._id
        });

        console.log(`↪️ Message forwarded to room: ${targetRoom.name}`);

      } catch (error) {
        console.error('Error forwarding message:', error);
        socket.emit('error', { message: 'Failed to forward message' });
      }
    });

    // Handle marking messages as read
    socket.on('mark_as_read', async (data) => {
      try {
        const { roomId, messageIds } = data;
        
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) return;

        await chatRoom.markAsRead(socket.userId, messageIds);

        // Emit read status to other users in the room
        socket.to(roomId).emit('messages_read', {
          roomId,
          userId: socket.userId,
          messageIds: messageIds || 'all'
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.fullName,
        roomId
      });
    });

    socket.on('typing_stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_stopped_typing', {
        userId: socket.userId,
        roomId
      });
    });

    // Handle video call signaling (basic WebRTC signaling)
    socket.on('call_user', async (data) => {
      try {
        const { targetUserId, offer, callType = 'video' } = data;
        const callId = `${socket.userId}_${targetUserId}_${Date.now()}`;
        
        // Record call start
        await CallHistory.recordCall({
          caller: socket.userId,
          receiver: targetUserId,
          callType,
          status: 'missed', // Will be updated if answered
          startTime: new Date(),
          callId
        });
        
        // Send call offer to target user
        socket.to(`user_${targetUserId}`).emit('incoming_call', {
          from: socket.userId,
          fromName: socket.user.fullName,
          fromAvatar: socket.user.avatar,
          offer,
          callType,
          callId
        });
      } catch (error) {
        console.error('Error initiating call:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('answer_call', async (data) => {
      try {
        const { targetUserId, answer, callId } = data;
        
        // Update call status to completed
        await CallHistory.findOneAndUpdate(
          { callId },
          { status: 'completed' }
        );
        
        socket.to(`user_${targetUserId}`).emit('call_answered', {
          from: socket.userId,
          answer,
          callId
        });
      } catch (error) {
        console.error('Error answering call:', error);
        socket.emit('error', { message: 'Failed to answer call' });
      }
    });

    socket.on('reject_call', async (data) => {
      try {
        const { targetUserId, callId } = data;
        
        // Update call status to rejected
        await CallHistory.findOneAndUpdate(
          { callId },
          { status: 'rejected', endTime: new Date() }
        );
        
        socket.to(`user_${targetUserId}`).emit('call_rejected', {
          from: socket.userId,
          callId
        });
      } catch (error) {
        console.error('Error rejecting call:', error);
        socket.emit('error', { message: 'Failed to reject call' });
      }
    });

    socket.on('end_call', async (data) => {
      try {
        const { targetUserId, callId } = data;
        
        // Update call with end time
        await CallHistory.findOneAndUpdate(
          { callId },
          { endTime: new Date() }
        );
        
        socket.to(`user_${targetUserId}`).emit('call_ended', {
          from: socket.userId,
          callId
        });
      } catch (error) {
        console.error('Error ending call:', error);
        socket.emit('error', { message: 'Failed to end call' });
      }
    });

    // Handle ICE candidates for WebRTC
    socket.on('ice_candidate', (data) => {
      const { targetUserId, candidate, callId } = data;
      
      socket.to(`user_${targetUserId}`).emit('ice_candidate', {
        from: socket.userId,
        candidate,
        callId
      });
    });

    // WebRTC Call Handlers (matching frontend event names)
    socket.on('call:initiate', async (data) => {
      try {
        const { roomId, type, offer, participant } = data;
        const callId = `${socket.userId}_${participant}_${Date.now()}`;
        
        console.log(`📞 Call initiated from ${socket.userId} to ${participant}, type: ${type}`);
        
        // Record call start
        await CallHistory.create({
          caller: socket.userId,
          receiver: participant,
          callType: type,
          status: 'initiated',
          startTime: new Date(),
          callId
        });
        
        // Send call offer to target user
        socket.to(`user_${participant}`).emit('call:receive', {
          from: socket.userId,
          fromName: socket.user.fullName,
          fromAvatar: socket.user.avatar,
          offer,
          type,
          callId,
          roomId
        });
      } catch (error) {
        console.error('Error initiating call:', error);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call:answer', async (data) => {
      try {
        const { roomId, answer, callId } = data;
        
        console.log(`📞 Call answered by ${socket.userId}`);
        
        // Update call history
        if (callId) {
          await CallHistory.findOneAndUpdate(
            { callId },
            { status: 'active', answerTime: new Date() }
          );
        }
        
        // Send answer back to caller (broadcast to room)
        socket.to(roomId).emit('call:answer', {
          from: socket.userId,
          answer,
          callId
        });
      } catch (error) {
        console.error('Error answering call:', error);
      }
    });

    socket.on('call:ice-candidate', (data) => {
      const { roomId, candidate } = data;
      
      // Broadcast ICE candidate to other peers in the room
      socket.to(roomId).emit('call:ice-candidate', {
        from: socket.userId,
        candidate
      });
    });

    socket.on('call:decline', async (data) => {
      try {
        const { roomId, callId } = data;
        
        console.log(`📞 Call declined by ${socket.userId}`);
        
        // Update call history
        if (callId) {
          await CallHistory.findOneAndUpdate(
            { callId },
            { status: 'declined', endTime: new Date() }
          );
        }
        
        // Notify caller
        socket.to(roomId).emit('call:decline', {
          from: socket.userId
        });
      } catch (error) {
        console.error('Error declining call:', error);
      }
    });

    socket.on('call:end', async (data) => {
      try {
        const { roomId, callId, duration } = data;
        
        console.log(`📞 Call ended by ${socket.userId}`);
        
        // Update call history
        if (callId) {
          await CallHistory.findOneAndUpdate(
            { callId },
            { 
              status: 'completed', 
              endTime: new Date(),
              duration: duration || 0
            }
          );
        }
        
        // Notify other participant
        socket.to(roomId).emit('call:end', {
          from: socket.userId
        });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    });

    // Handle course-related real-time events
    socket.on('join_course', (data) => {
      const { courseId } = data;
      socket.join(`course_${courseId}`);
      
      socket.emit('joined_course', { courseId });
    });

    socket.on('leave_course', (data) => {
      const { courseId } = data;
      socket.leave(`course_${courseId}`);
      
      socket.emit('left_course', { courseId });
    });

    // Handle global announcements
    socket.on('send_announcement', async (data) => {
      try {
        // Only teachers and admins can send announcements
        if (socket.user.role !== 'teacher' && socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Unauthorized to send announcements' });
          return;
        }

        const { title, content, targetAudience = 'all', courseId } = data;

        const announcement = {
          id: Date.now().toString(),
          title,
          content,
          sender: {
            id: socket.userId,
            name: socket.user.fullName,
            avatar: socket.user.avatar,
            role: socket.user.role
          },
          timestamp: new Date(),
          targetAudience,
          courseId
        };

        if (courseId) {
          // Course-specific announcement
          io.to(`course_${courseId}`).emit('new_announcement', announcement);
        } else {
          // Global announcement
          io.emit('new_announcement', announcement);
        }

      } catch (error) {
        console.error('Error sending announcement:', error);
        socket.emit('error', { message: 'Failed to send announcement' });
      }
    });

    // Handle live session events
    socket.on('start_live_session', (data) => {
      const { courseId, sessionTitle, sessionDescription } = data;
      
      // Only teachers can start live sessions
      if (socket.user.role !== 'teacher' && socket.user.role !== 'admin') {
        socket.emit('error', { message: 'Unauthorized to start live session' });
        return;
      }

      const liveSession = {
        id: `live_${Date.now()}`,
        courseId,
        title: sessionTitle,
        description: sessionDescription,
        instructor: {
          id: socket.userId,
          name: socket.user.fullName,
          avatar: socket.user.avatar
        },
        startedAt: new Date(),
        participants: []
      };

      // Join instructor to live session room
      socket.join(`live_${liveSession.id}`);

      // Notify course participants
      socket.to(`course_${courseId}`).emit('live_session_started', liveSession);
      
      socket.emit('live_session_created', liveSession);
    });

    socket.on('join_live_session', (data) => {
      const { sessionId } = data;
      
      socket.join(`live_${sessionId}`);
      
      // Notify others about new participant
      socket.to(`live_${sessionId}`).emit('participant_joined', {
        userId: socket.userId,
        userName: socket.user.fullName,
        avatar: socket.user.avatar
      });

      socket.emit('joined_live_session', { sessionId });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ User ${socket.user.fullName} disconnected: ${reason}`);
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      console.log(`📊 Remaining online users: ${connectedUsers.size}`);
      
      // Emit updated online users count
      io.emit('online_users_count', connectedUsers.size);
      
      // Broadcast user offline status
      socket.broadcast.emit('user_offline', socket.userId);
      
      // Notify rooms about user going offline
      Array.from(socket.rooms).forEach(room => {
        if (room !== socket.id) {
          console.log(`🚪 ${socket.user.fullName} left room: ${room}`);
          socket.to(room).emit('user_offline', {
            userId: socket.userId,
            userName: socket.user.fullName
          });
        }
      });
    });

    // Send initial data to newly connected user
    socket.emit('connection_established', {
      userId: socket.userId,
      user: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        fullName: socket.user.fullName,
        avatar: socket.user.avatar,
        role: socket.user.role
      },
      onlineCount: connectedUsers.size
    });
  });

  // Helper function to get online users in a room
  const getOnlineUsersInRoom = async (roomId) => {
    try {
      const sockets = await io.in(roomId).fetchSockets();
      return sockets.map(socket => ({
        userId: socket.userId,
        userName: socket.user.fullName,
        avatar: socket.user.avatar,
        role: socket.user.role
      }));
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  };

  // Export helper functions for use in other parts of the application
  io.getOnlineUsersInRoom = getOnlineUsersInRoom;
  io.getConnectedUsers = () => Array.from(connectedUsers.values());
  
  // Function to send notification to specific user
  io.sendToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  // Function to send notification to course participants
  io.sendToCourse = (courseId, event, data) => {
    io.to(`course_${courseId}`).emit(event, data);
  };

  return io;
};

module.exports = socketHandler;
