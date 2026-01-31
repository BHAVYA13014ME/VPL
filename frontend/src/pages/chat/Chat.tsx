import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Typography,
  Badge,
  Divider,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
  Fab,
} from '@mui/material';
import {
  Send,
  AttachFile,
  Search,
  MoreVert,
  EmojiEmotions,
  Image as ImageIcon,
  Close,
  Check,
  Delete,
  Reply as ReplyIcon,
  Group,
  Person,
  CheckCircle,
  Add,
  DoneAll,
  Done,
  Schedule,
  Mic,
  Videocam,
  Call,
  Star,
  Archive,
  Block,
  PersonAdd,
  ExitToApp,
  Edit,
  Forward,
  PushPin,
  VolumeOff,
  VolumeUp,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import CreateChatDialog from '../../components/chat/CreateChatDialog';
import CreateGroupChatDialog from '../../components/chat/CreateGroupChatDialog';
import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatRoom {
  _id: string;
  name: string;
  type: 'direct' | 'group' | 'course' | 'announcement';
  participants: Array<{
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: string;
  }>;
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  };
  unreadCount?: number;
  course?: {
    title: string;
  };
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  content: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'system' | 'announcement';
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: Array<{
    filename: string;
    originalName: string;
    path: string;
    mimeType: string;
  }>;
  deliveredTo?: Array<{
    user: string;
    deliveredAt: string;
  }>;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  reactions?: Array<{
    user: string;
    emoji: string;
  }>;
  isStarred?: Array<{
    user: string;
  }>;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  };
  forwardedFrom?: {
    _id: string;
  };
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [createGroupChatOpen, setCreateGroupChatOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewInfoOpen, setViewInfoOpen] = useState(false);
  const [mutedRooms, setMutedRooms] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentMenuAnchor, setAttachmentMenuAnchor] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat rooms
  const fetchChatRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/chat/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setChatRooms(response.data.data.chatRooms);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected room
  const fetchMessages = async (roomId: string) => {
    try {
      console.log('📥 Fetching messages for room:', roomId);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/chat/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const messageCount = response.data.data.chatRoom.messages.length;
        console.log(`✅ Loaded ${messageCount} messages`);
        setMessages(response.data.data.chatRoom.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  // Handle room selection
  const handleSelectRoom = async (room: ChatRoom) => {
    console.log('🚪 Selecting chat room:', room.name);
    setSelectedRoom(room);
    await fetchMessages(room._id);
    
    // Join socket room
    if (socket) {
      console.log('🔗 Joining socket room:', room._id);
      socket.emit('join_room', { roomId: room._id });
    }
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || sendingMessage) return;

    setSendingMessage(true);
    try {
      const messageData = {
        roomId: selectedRoom._id,
        content: newMessage.trim(),
        type: 'text',
        replyTo: replyingTo?._id,
      };

      console.log('📤 Sending message:', {
        room: selectedRoom.name,
        content: messageData.content.substring(0, 50),
        hasReply: !!replyingTo
      });

      // Emit via socket
      if (socket) {
        socket.emit('send_message', messageData);
        console.log('✅ Message sent via socket');
      }

      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle typing indicator
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!selectedRoom || !socket) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit('typing_start', { roomId: selectedRoom._id });

    // Set timeout to emit typing stop
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { roomId: selectedRoom._id });
    }, 2000);
  };

  // Handle View Info
  const handleViewInfo = () => {
    setAnchorEl(null);
    setViewInfoOpen(true);
  };

  // Handle Mute/Unmute Notifications
  const handleMuteToggle = () => {
    setAnchorEl(null);
    if (selectedRoom) {
      const newMutedRooms = new Set(mutedRooms);
      if (newMutedRooms.has(selectedRoom._id)) {
        newMutedRooms.delete(selectedRoom._id);
        console.log(`Notifications unmuted for: ${selectedRoom.name}`);
      } else {
        newMutedRooms.add(selectedRoom._id);
        console.log(`Notifications muted for: ${selectedRoom.name}`);
      }
      setMutedRooms(newMutedRooms);
      // Save to localStorage
      localStorage.setItem('mutedChatRooms', JSON.stringify(Array.from(newMutedRooms)));
    }
  };

  // Handle Clear Chat
  const handleClearChat = async () => {
    setAnchorEl(null);
    if (!selectedRoom) return;
    
    if (window.confirm(`Are you sure you want to clear all messages in "${selectedRoom.name}"? This cannot be undone.`)) {
      try {
        const token = localStorage.getItem('token');
        console.log(`Clearing chat for room: ${selectedRoom._id}`);
        
        await axios.delete(`/api/chat/rooms/${selectedRoom._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setMessages([]);
        console.log('Chat cleared successfully');
      } catch (error) {
        console.error('Error clearing chat:', error);
        alert('Failed to clear chat. Please try again.');
      }
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  // Get other participant in direct chat
  const getOtherParticipant = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const other = room.participants.find(p => p.user && p.user._id !== user?._id);
      return other?.user || null;
    }
    return null;
  };

  // Check if user is online
  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  // Initialize
  useEffect(() => {
    fetchChatRooms();
    
    // Load muted rooms from localStorage
    const savedMutedRooms = localStorage.getItem('mutedChatRooms');
    if (savedMutedRooms) {
      try {
        const parsed = JSON.parse(savedMutedRooms);
        setMutedRooms(new Set(parsed));
        console.log('Loaded muted rooms:', parsed);
      } catch (error) {
        console.error('Error loading muted rooms:', error);
      }
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Chat socket listeners initialized');

    // Listen for new messages
    socket.on('new_message', (data: { roomId: string; message: Message }) => {
      console.log('📨 New message received:', {
        roomId: data.roomId,
        from: data.message.sender.firstName,
        content: data.message.content.substring(0, 50)
      });
      
      if (selectedRoom && data.roomId === selectedRoom._id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
        console.log('✅ Message added to current chat');
      }
      
      // Update last message in room list
      setChatRooms(prev => prev.map(room => 
        room._id === data.roomId 
          ? { ...room, lastMessage: { 
              content: data.message.content, 
              createdAt: data.message.createdAt,
              sender: data.message.sender 
            }}
          : room
      ));
    });

    // Listen for typing indicators
    socket.on('user_typing', (data: { roomId: string; userId: string; userName: string }) => {
      console.log('⌨️ User typing:', data.userName);
      if (selectedRoom && data.roomId === selectedRoom._id && data.userId !== user?._id) {
        setTypingUsers(prev => new Set([...prev, data.userName]));
      }
    });

    socket.on('user_stopped_typing', (data: { roomId: string; userId: string }) => {
      if (selectedRoom && data.roomId === selectedRoom._id) {
        // Remove by userId - we need to find the username
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          // This is a simplified approach; in production, you'd track user IDs
          newSet.clear();
          return newSet;
        });
      }
    });

    // Listen for online users
    socket.on('online_users_count', (count: number) => {
      console.log('👥 Online users:', count);
    });

    // Listen for user online/offline status
    socket.on('user_online', (userId: string) => {
      console.log('✅ User online:', userId);
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socket.on('user_offline', (userId: string) => {
      console.log('❌ User offline:', userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    return () => {
      console.log('🔌 Chat socket listeners cleaned up');
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('online_users_count');
      socket.off('user_online');
      socket.off('user_offline');
    };
  }, [socket, selectedRoom]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Filter chat rooms based on search
  const filteredRooms = chatRooms.filter(room => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (room.type === 'direct') {
      const other = getOtherParticipant(room);
      return other && `${other.firstName} ${other.lastName}`.toLowerCase().includes(query);
    }
    return room.name.toLowerCase().includes(query) || 
           room.course?.title.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', bgcolor: 'background.default', position: 'relative' }}>
      <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
        {/* Chat Rooms List */}
        <Box sx={{ width: { xs: '100%', md: '33.33%', lg: '25%' }, borderRight: 1, borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Messages
              </Typography>
              <Tooltip title="New Chat">
                <IconButton 
                  color="primary" 
                  onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                  sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  <Add />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Add Menu */}
            <Menu
              anchorEl={addMenuAnchor}
              open={Boolean(addMenuAnchor)}
              onClose={() => setAddMenuAnchor(null)}
            >
              <MenuItem 
                onClick={() => {
                  setAddMenuAnchor(null);
                  setCreateChatOpen(true);
                }}
              >
                <Person sx={{ mr: 1 }} />
                New Chat (Direct)
              </MenuItem>
              <MenuItem 
                onClick={() => {
                  setAddMenuAnchor(null);
                  setCreateGroupChatOpen(true);
                }}
              >
                <Group sx={{ mr: 1 }} />
                New Group
              </MenuItem>
            </Menu>
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
            {!isConnected && (
              <Chip 
                label="Connecting..." 
                size="small" 
                color="warning" 
                sx={{ mt: 1 }}
              />
            )}
            {isConnected && (
              <Chip 
                label="Connected" 
                size="small" 
                color="success" 
                icon={<CheckCircle />}
                sx={{ mt: 1 }}
              />
            )}
          </Paper>

          <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
            {filteredRooms.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No conversations found
                </Typography>
              </Box>
            ) : (
              filteredRooms.map((room) => {
                const otherUser = getOtherParticipant(room);
                const isOnline = otherUser ? isUserOnline(otherUser._id) : false;
                
                return (
                  <React.Fragment key={room._id}>
                    <ListItem
                      disablePadding
                    >
                      <ListItemButton
                        onClick={() => handleSelectRoom(room)}
                        selected={selectedRoom?._id === room._id}
                        sx={{
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Badge
                            overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          invisible={!isOnline}
                          sx={{
                            '& .MuiBadge-badge': {
                              backgroundColor: '#44b700',
                              color: '#44b700',
                            },
                          }}
                        >
                          <Avatar
                            src={otherUser?.avatar}
                            sx={{ bgcolor: room.type === 'group' ? '#f093fb' : '#4facfe' }}
                          >
                            {room.type === 'direct' && otherUser
                              ? `${otherUser.firstName[0]}${otherUser.lastName[0]}`
                              : room.type === 'group'
                              ? <Group />
                              : room.name[0].toUpperCase()}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {room.type === 'direct' && otherUser
                                ? `${otherUser.firstName} ${otherUser.lastName}`
                                : room.name}
                            </Typography>
                            {room.unreadCount && room.unreadCount > 0 && (
                              <Badge badgeContent={room.unreadCount} color="primary" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {room.lastMessage?.content || 'No messages yet'}
                          </Typography>
                        }
                      />
                      </ListItemButton>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
              })
            )}
          </List>
        </Box>

        {/* Chat Messages Area */}
        <Box sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <Paper elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {selectedRoom.type === 'direct' && (() => {
                      const otherUser = getOtherParticipant(selectedRoom);
                      const isOnline = otherUser ? isUserOnline(otherUser._id) : false;
                      return (
                        <>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            variant="dot"
                            invisible={!isOnline}
                            sx={{
                              '& .MuiBadge-badge': {
                                backgroundColor: '#44b700',
                                color: '#44b700',
                              },
                            }}
                          >
                            <Avatar src={otherUser?.avatar}>
                              {otherUser && `${otherUser.firstName[0]}${otherUser.lastName[0]}`}
                            </Avatar>
                          </Badge>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {otherUser && `${otherUser.firstName} ${otherUser.lastName}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {isOnline ? 'Online' : 'Offline'}
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}
                    {selectedRoom.type !== 'direct' && (
                      <>
                        <Avatar sx={{ bgcolor: '#f093fb' }}>
                          <Group />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {selectedRoom.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {selectedRoom.participants.length} participants
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <MoreVert />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                  >
                    <MenuItem onClick={handleViewInfo}>View Info</MenuItem>
                    <MenuItem onClick={handleMuteToggle}>
                      {mutedRooms.has(selectedRoom?._id || '') ? 'Unmute' : 'Mute'} Notifications
                    </MenuItem>
                    <MenuItem onClick={handleClearChat}>Clear Chat</MenuItem>
                  </Menu>
                </Box>
              </Paper>

              {/* Messages List */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
                {messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      No messages yet. Start the conversation!
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender._id === user?._id;
                    const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;

                    return (
                      <Box
                        key={message._id}
                        sx={{
                          display: 'flex',
                          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                          mb: 2,
                          alignItems: 'flex-end',
                        }}
                      >
                        {!isOwnMessage && showAvatar && (
                          <Avatar
                            src={message.sender.avatar}
                            sx={{ width: 32, height: 32, mr: 1 }}
                          >
                            {message.sender.firstName[0]}
                          </Avatar>
                        )}
                        {!isOwnMessage && !showAvatar && (
                          <Box sx={{ width: 32, mr: 1 }} />
                        )}

                        <Box sx={{ maxWidth: '70%' }}>
                          {!isOwnMessage && showAvatar && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.5 }}>
                              {message.sender.firstName} {message.sender.lastName}
                            </Typography>
                          )}
                          
                          {message.replyTo && (
                            <Paper
                              sx={{
                                p: 1,
                                mb: 0.5,
                                bgcolor: 'action.hover',
                                borderLeft: 3,
                                borderColor: 'primary.main',
                              }}
                            >
                              <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                                Replying to {message.replyTo.sender.firstName}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {message.replyTo.content}
                              </Typography>
                            </Paper>
                          )}

                          <Paper
                            elevation={1}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelectedMessage(message);
                              setMessageMenuAnchor(e.currentTarget as HTMLElement);
                            }}
                            sx={{
                              p: 1.5,
                              bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
                              color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                              borderRadius: 2,
                              position: 'relative',
                              cursor: 'context-menu',
                            }}
                          >
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              {message.content}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, gap: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  opacity: 0.7,
                                  fontSize: '0.7rem',
                                }}
                              >
                                {formatMessageTime(message.createdAt)}
                              </Typography>
                              {isOwnMessage && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {message.status === 'sending' && (
                                    <Schedule sx={{ fontSize: 14, opacity: 0.6 }} />
                                  )}
                                  {message.status === 'sent' && (
                                    <Done sx={{ fontSize: 14, opacity: 0.6 }} />
                                  )}
                                  {message.status === 'delivered' && (
                                    <DoneAll sx={{ fontSize: 14, opacity: 0.6 }} />
                                  )}
                                  {message.status === 'read' && (
                                    <DoneAll sx={{ fontSize: 14, color: '#4fc3f7' }} />
                                  )}
                                  {message.editedAt && (
                                    <Typography variant="caption" sx={{ ml: 0.5, opacity: 0.6, fontSize: '0.65rem' }}>
                                      edited
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Paper>
                        </Box>

                        {isOwnMessage && (
                          <IconButton
                            size="small"
                            sx={{ ml: 0.5, visibility: 'hidden', '&:hover': { visibility: 'visible' } }}
                            onClick={() => setReplyingTo(message)}
                          >
                            <ReplyIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Reply Bar */}
              {replyingTo && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                      Replying to {replyingTo.sender.firstName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {replyingTo.content}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    <Close fontSize="small" />
                  </IconButton>
                </Paper>
              )}

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: 'background.paper',
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </Typography>
                </Box>
              )}

              {/* Message Input */}
              <Paper elevation={0} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <IconButton size="small">
                    <AttachFile />
                  </IconButton>
                  <IconButton size="small">
                    <ImageIcon />
                  </IconButton>
                  <IconButton size="small">
                    <EmojiEmotions />
                  </IconButton>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                      },
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '&:disabled': {
                        bgcolor: 'action.disabledBackground',
                      },
                    }}
                  >
                    {sendingMessage ? <CircularProgress size={24} /> : <Send />}
                  </IconButton>
                </Box>
              </Paper>

              {/* Message Context Menu */}
              <Menu
                anchorEl={messageMenuAnchor}
                open={Boolean(messageMenuAnchor)}
                onClose={() => {
                  setMessageMenuAnchor(null);
                  setSelectedMessage(null);
                }}
              >
                <MenuItem 
                  onClick={() => {
                    if (selectedMessage) {
                      setReplyingTo(selectedMessage);
                    }
                    setMessageMenuAnchor(null);
                    setSelectedMessage(null);
                  }}
                >
                  <ReplyIcon sx={{ mr: 1 }} fontSize="small" />
                  Reply
                </MenuItem>
                <MenuItem 
                  onClick={() => {
                    if (selectedMessage) {
                      // TODO: Implement forward functionality
                      console.log('Forward message:', selectedMessage._id);
                    }
                    setMessageMenuAnchor(null);
                    setSelectedMessage(null);
                  }}
                >
                  <Forward sx={{ mr: 1 }} fontSize="small" />
                  Forward
                </MenuItem>
                <MenuItem 
                  onClick={() => {
                    if (selectedMessage) {
                      // TODO: Implement star/unstar functionality
                      console.log('Star message:', selectedMessage._id);
                    }
                    setMessageMenuAnchor(null);
                    setSelectedMessage(null);
                  }}
                >
                  <Star sx={{ mr: 1 }} fontSize="small" />
                  {selectedMessage?.isStarred?.some(s => s.user === user?._id) ? 'Unstar' : 'Star'}
                </MenuItem>
                {selectedMessage?.sender._id === user?._id && (
                  <MenuItem 
                    onClick={() => {
                      if (selectedMessage) {
                        // TODO: Implement edit functionality
                        console.log('Edit message:', selectedMessage._id);
                      }
                      setMessageMenuAnchor(null);
                      setSelectedMessage(null);
                    }}
                  >
                    <Edit sx={{ mr: 1 }} fontSize="small" />
                    Edit
                  </MenuItem>
                )}
                <MenuItem 
                  onClick={() => {
                    if (selectedMessage && window.confirm('Delete this message?')) {
                      // TODO: Implement delete functionality
                      console.log('Delete message:', selectedMessage._id);
                    }
                    setMessageMenuAnchor(null);
                    setSelectedMessage(null);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <Delete sx={{ mr: 1 }} fontSize="small" />
                  Delete
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
                <Person sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary">
                Select a conversation to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Create Chat Dialog */}
      <CreateChatDialog
        open={createChatOpen}
        onClose={() => setCreateChatOpen(false)}
        onChatCreated={fetchChatRooms}
      />

      {/* Create Group Chat Dialog */}
      <CreateGroupChatDialog
        open={createGroupChatOpen}
        onClose={() => setCreateGroupChatOpen(false)}
        onGroupCreated={fetchChatRooms}
      />

      {/* View Info Dialog */}
      <Dialog
        open={viewInfoOpen}
        onClose={() => setViewInfoOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Chat Information</Typography>
            <IconButton onClick={() => setViewInfoOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRoom && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Room Name */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Room Name
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedRoom.name}
                </Typography>
              </Box>

              {/* Room Type */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Type
                </Typography>
                <Chip 
                  label={selectedRoom.type.charAt(0).toUpperCase() + selectedRoom.type.slice(1)}
                  size="small"
                  color="primary"
                />
              </Box>

              {/* Course Info */}
              {selectedRoom.course && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Course
                  </Typography>
                  <Typography variant="body1">
                    {selectedRoom.course.title}
                  </Typography>
                </Box>
              )}

              {/* Participants */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Participants ({selectedRoom.participants.length})
                </Typography>
                <List dense>
                  {selectedRoom.participants.map((participant) => (
                    <ListItem key={participant.user._id}>
                      <ListItemAvatar>
                        <Badge
                          variant="dot"
                          color="success"
                          invisible={!isUserOnline(participant.user._id)}
                        >
                          <Avatar src={participant.user.avatar}>
                            {participant.user.firstName[0]}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${participant.user.firstName} ${participant.user.lastName}`}
                        secondary={participant.role}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Notification Status */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Notifications
                </Typography>
                <Chip
                  label={mutedRooms.has(selectedRoom._id) ? 'Muted' : 'Active'}
                  color={mutedRooms.has(selectedRoom._id) ? 'default' : 'success'}
                  size="small"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewInfoOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Chat;
