import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Zoom,
  Collapse,
  LinearProgress,
  Snackbar,
  Alert,
  ListItemIcon,
  Popover,
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
  Add,
  DoneAll,
  Done,
  Schedule,
  Mic,
  Videocam,
  Call,
  Star,
  StarBorder,
  Archive,
  Unarchive,
  Edit,
  Forward,
  PushPin,
  VolumeOff,
  VolumeUp,
  InsertDriveFile,
  VideoLibrary,
  Download,
  KeyboardVoice,
  ArrowBack,
  Info,
  ContentCopy,
  Report,
  DeleteForever,
  Refresh,
  CameraAlt,
  Clear,
  ArrowDownward,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import CreateChatDialog from '../../components/chat/CreateChatDialog';
import CreateGroupChatDialog from '../../components/chat/CreateGroupChatDialog';
import CallDialog from '../../components/chat/CallDialog';
import CallHistory from '../../components/chat/CallHistory';
import { useWebRTC } from '../../hooks/useWebRTC';
import axios from 'axios';
import { API_ENDPOINTS, buildApiUrl, getAuthHeaders, API_BASE_URL } from '../../utils/api';
import { format, isToday, isYesterday } from 'date-fns';

// ==================== INTERFACES ====================
interface Participant {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email?: string;
  };
  role: 'admin' | 'moderator' | 'member';
  joinedAt?: string;
  notifications?: boolean;
}

interface ChatRoom {
  _id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group' | 'course' | 'announcement';
  avatar?: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    type: string;
  };
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  course?: {
    _id: string;
    title: string;
  };
  createdAt?: string;
}

interface Attachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  duration?: number; // For audio/video
  thumbnail?: string; // For video
}

interface Reaction {
  user: string;
  emoji: string;
  createdAt: string;
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
  type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'voice' | 'system' | 'announcement' | 'sticker' | 'gif' | 'location' | 'contact';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: Attachment[];
  deliveredTo?: Array<{ user: string; deliveredAt: string }>;
  readBy: Array<{ user: string; readAt: string }>;
  reactions?: Reaction[];
  isStarred?: Array<{ user: string; starredAt: string }>;
  replyTo?: {
    _id: string;
    content: string;
    type: string;
    sender: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  };
  forwardedFrom?: {
    _id: string;
    roomName: string;
  };
  editedAt?: string;
  deletedFor?: string[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== EMOJI DATA ====================
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '👏', '🤝', '💅', '🤳'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objects': ['📱', '💻', '🖥️', '📷', '📹', '🎥', '📞', '☎️', '📺', '📻', '🎵', '🎶', '🎤', '🎧', '📚', '📖', '📝', '✏️', '📁', '📂', '📅', '📆', '🔒', '🔓', '🔑', '💡', '🔦', '🧲'],
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// ==================== MAIN COMPONENT ====================
const WhatsAppChat: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // Chat state
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  
  // Feature state
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [createGroupChatOpen, setCreateGroupChatOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewInfoOpen, setViewInfoOpen] = useState(false);
  const [mutedRooms, setMutedRooms] = useState<Set<string>>(new Set());
  const [pinnedRooms, setPinnedRooms] = useState<Set<string>>(new Set());
  const [archivedRooms, setArchivedRooms] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  
  // Emoji & Attachments
  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const [attachmentMenuAnchor, setAttachmentMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string } | null>(null);
  
  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Refs
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<null | HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // Scroll state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Calling state
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [currentCallType, setCurrentCallType] = useState<'voice' | 'video'>('voice');
  const [currentCallParticipant, setCurrentCallParticipant] = useState<any>(null);
  const [showCallHistory, setShowCallHistory] = useState(false);

  // WebRTC hook
  const {
    callState,
    currentCall,
    callDuration,
    initiateCall,
    answerCall,
    declineCall,
    endCall,
  } = useWebRTC({
    roomId: selectedRoom?._id || '',
    userId: user?._id || '',
    onCallStateChange: (state) => {
      if (state === 'incoming' || state === 'outgoing' || state === 'connected') {
        setCallDialogOpen(true);
      } else if (state === 'ended' || state === 'idle') {
        setCallDialogOpen(false);
      }
    },
  });

  // ==================== UTILITY FUNCTIONS ====================
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setNewMessageCount(0);
  }, []);

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

  const getOtherParticipant = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const other = room.participants.find(p => p.user && p.user._id !== user?._id);
      return other?.user || null;
    }
    return null;
  };

  const isUserOnline = (userId: string) => onlineUsers.has(userId);

  const getMessageStatusIcon = (message: Message, isOwn: boolean) => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case 'sending':
        return <Schedule sx={{ fontSize: 14, opacity: 0.6 }} />;
      case 'sent':
        return <Done sx={{ fontSize: 14, opacity: 0.6 }} />;
      case 'delivered':
        return <DoneAll sx={{ fontSize: 14, opacity: 0.6 }} />;
      case 'read':
        return <DoneAll sx={{ fontSize: 14, color: '#53bdeb' }} />;
      case 'failed':
        return <Report sx={{ fontSize: 14, color: 'error.main' }} />;
      default:
        return <Done sx={{ fontSize: 14, opacity: 0.6 }} />;
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // ==================== API FUNCTIONS ====================
  const fetchChatRooms = async () => {
    try {
      const response = await axios.get(buildApiUrl(API_ENDPOINTS.CHAT_ROOMS), {
        headers: getAuthHeaders(),
      });
      if (response.data.success) {
        setChatRooms(response.data.data.chatRooms);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      showNotification('Failed to load chats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const response = await axios.get(buildApiUrl(API_ENDPOINTS.CHAT_ROOM_BY_ID(roomId)), {
        headers: getAuthHeaders(),
      });
      if (response.data.success) {
        setMessages(response.data.data.chatRoom.messages);
        setTimeout(() => scrollToBottom(false), 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showNotification('Failed to load messages', 'error');
    }
  };

  // ==================== MESSAGE ACTIONS ====================
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0 && !audioBlob) || !selectedRoom || sendingMessage) return;

    setSendingMessage(true);
    try {
      
      // If there are files or voice note, use FormData
      if (selectedFiles.length > 0 || audioBlob) {
        const formData = new FormData();
        formData.append('content', newMessage.trim() || (audioBlob ? 'Voice message' : 'File attachment'));
        formData.append('type', audioBlob ? 'voice' : 'file');
        
        if (replyingTo) {
          formData.append('replyTo', replyingTo._id);
        }
        
        if (audioBlob) {
          formData.append('files', audioBlob, 'voice-message.webm');
        } else {
          selectedFiles.forEach(file => {
            formData.append('files', file);
          });
        }

        const response = await axios.post(
          buildApiUrl(API_ENDPOINTS.CHAT_MESSAGES(selectedRoom._id)),
          formData,
          {
            headers: { 
              ...getAuthHeaders(),
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const progress = progressEvent.total 
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0;
              setUploadProgress(progress);
            }
          }
        );

        if (response.data.success) {
          // Socket will handle the message broadcast
          socket?.emit('send_message', {
            roomId: selectedRoom._id,
            content: newMessage.trim() || 'File attachment',
            type: audioBlob ? 'voice' : 'file',
            replyTo: replyingTo?._id,
          });
        }
      } else {
        // Text message via socket
        socket?.emit('send_message', {
          roomId: selectedRoom._id,
          content: newMessage.trim(),
          type: 'text',
          replyTo: replyingTo?._id,
        });
      }

      setNewMessage('');
      setReplyingTo(null);
      setSelectedFiles([]);
      setAudioBlob(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editContent.trim() || !selectedRoom) return;

    try {
      await axios.put(
        buildApiUrl(`/chat/rooms/${selectedRoom._id}/messages/${editingMessage._id}`),
        { content: editContent.trim() },
        { headers: getAuthHeaders() }
      );

      socket?.emit('edit_message', {
        roomId: selectedRoom._id,
        messageId: editingMessage._id,
        content: editContent.trim(),
      });

      setEditingMessage(null);
      setEditContent('');
      showNotification('Message edited', 'success');
    } catch (error) {
      console.error('Error editing message:', error);
      showNotification('Failed to edit message', 'error');
    }
  };

  const handleDeleteMessage = async (deleteForEveryone: boolean = false) => {
    if (!selectedMessage || !selectedRoom) return;

    try {
      await axios.delete(
        buildApiUrl(`/chat/rooms/${selectedRoom._id}/messages/${selectedMessage._id}`),
        { 
          headers: getAuthHeaders(),
          data: { deleteForEveryone }
        }
      );

      socket?.emit('delete_message', {
        roomId: selectedRoom._id,
        messageId: selectedMessage._id,
        deleteForEveryone,
      });

      setSelectedMessage(null);
      setMessageMenuAnchor(null);
      showNotification(deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      showNotification('Failed to delete message', 'error');
    }
  };

  const handleStarMessage = async () => {
    if (!selectedMessage || !selectedRoom) return;

    try {
      await axios.post(
        buildApiUrl(`/chat/rooms/${selectedRoom._id}/messages/${selectedMessage._id}/star`),
        {},
        { headers: getAuthHeaders() }
      );

      socket?.emit('star_message', {
        roomId: selectedRoom._id,
        messageId: selectedMessage._id,
      });

      setSelectedMessage(null);
      setMessageMenuAnchor(null);
      showNotification('Message starred', 'success');
    } catch (error) {
      console.error('Error starring message:', error);
      showNotification('Failed to star message', 'error');
    }
  };

  const handleForwardMessage = async (targetRoomId: string) => {
    if (!forwardingMessage) return;

    try {
      await axios.post(
        buildApiUrl(`/chat/rooms/${targetRoomId}/forward`),
        { 
          messageId: forwardingMessage._id,
          fromRoomId: selectedRoom?._id
        },
        { headers: getAuthHeaders() }
      );

      socket?.emit('forward_message', {
        targetRoomId,
        messageId: forwardingMessage._id,
        fromRoomId: selectedRoom?._id,
      });

      setForwardingMessage(null);
      showNotification('Message forwarded', 'success');
    } catch (error) {
      console.error('Error forwarding message:', error);
      showNotification('Failed to forward message', 'error');
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!selectedMessage || !selectedRoom) return;

    socket?.emit('react_to_message', {
      roomId: selectedRoom._id,
      messageId: selectedMessage._id,
      emoji,
    });

    setMessageMenuAnchor(null);
    setSelectedMessage(null);
  };

  // ==================== ROOM ACTIONS ====================
  const handleSelectRoom = async (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessages([]);
    await fetchMessages(room._id);
    
    if (socket) {
      socket.emit('join_room', { roomId: room._id });
    }

    // Mark messages as read
    socket?.emit('mark_as_read', { roomId: room._id });
  };

  const handleMuteToggle = () => {
    if (!selectedRoom) return;
    
    const newMutedRooms = new Set(mutedRooms);
    if (newMutedRooms.has(selectedRoom._id)) {
      newMutedRooms.delete(selectedRoom._id);
      showNotification('Notifications unmuted', 'info');
    } else {
      newMutedRooms.add(selectedRoom._id);
      showNotification('Notifications muted', 'info');
    }
    setMutedRooms(newMutedRooms);
    localStorage.setItem('mutedChatRooms', JSON.stringify(Array.from(newMutedRooms)));
    setAnchorEl(null);
  };

  const handlePinToggle = () => {
    if (!selectedRoom) return;
    
    const newPinnedRooms = new Set(pinnedRooms);
    if (newPinnedRooms.has(selectedRoom._id)) {
      newPinnedRooms.delete(selectedRoom._id);
      showNotification('Chat unpinned', 'info');
    } else {
      newPinnedRooms.add(selectedRoom._id);
      showNotification('Chat pinned', 'info');
    }
    setPinnedRooms(newPinnedRooms);
    localStorage.setItem('pinnedChatRooms', JSON.stringify(Array.from(newPinnedRooms)));
    setAnchorEl(null);
  };

  const handleArchiveToggle = () => {
    if (!selectedRoom) return;
    
    const newArchivedRooms = new Set(archivedRooms);
    if (newArchivedRooms.has(selectedRoom._id)) {
      newArchivedRooms.delete(selectedRoom._id);
      showNotification('Chat unarchived', 'info');
    } else {
      newArchivedRooms.add(selectedRoom._id);
      showNotification('Chat archived', 'info');
    }
    setArchivedRooms(newArchivedRooms);
    localStorage.setItem('archivedChatRooms', JSON.stringify(Array.from(newArchivedRooms)));
    setAnchorEl(null);
  };

  const handleClearChat = async () => {
    if (!selectedRoom) return;
    
    if (window.confirm(`Are you sure you want to clear all messages in "${selectedRoom.name}"?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/chat/rooms/${selectedRoom._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages([]);
        showNotification('Chat cleared', 'success');
      } catch (error) {
        console.error('Error clearing chat:', error);
        showNotification('Failed to clear chat', 'error');
      }
    }
    setAnchorEl(null);
  };

  // ==================== CALL API FUNCTIONS ====================
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchCallHistory = async () => {
    try {
      const response = await axios.get(buildApiUrl(API_ENDPOINTS.CALL_HISTORY), {
        headers: getAuthHeaders(),
      });
      if (response.data.success) {
        return response.data.data.calls;
      }
      return [];
    } catch (error) {
      console.error('Error fetching call history:', error);
      showNotification('Failed to load call history', 'error');
      return [];
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recordCall = async (callData: {
    receiverId: string;
    callType: 'voice' | 'video';
    status: 'completed' | 'missed' | 'rejected';
    startTime: Date;
    endTime?: Date;
    callId: string;
  }) => {
    try {
      await axios.post(buildApiUrl(API_ENDPOINTS.CALL_RECORD), callData, {
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error recording call:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateCall = async (callId: string, updates: { endTime?: Date; status?: string }) => {
    try {
      await axios.put(buildApiUrl(API_ENDPOINTS.CALL_BY_ID(callId)), updates, {
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error updating call:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteCallFromHistory = async (callId: string) => {
    try {
      await axios.delete(buildApiUrl(API_ENDPOINTS.CALL_DELETE(callId)), {
        headers: getAuthHeaders(),
      });
      showNotification('Call deleted from history', 'success');
    } catch (error) {
      console.error('Error deleting call:', error);
      showNotification('Failed to delete call', 'error');
    }
  };

  // ==================== CALL HANDLERS ====================
  const handleVoiceCall = () => {
    if (!selectedRoom) return;
    
    if (selectedRoom.type === 'direct') {
      const otherUser = getOtherParticipant(selectedRoom);
      if (otherUser) {
        setCurrentCallType('voice');
        setCurrentCallParticipant(otherUser);
        initiateCall(otherUser, 'voice');
      }
    } else {
      showNotification('Group calls not supported yet', 'info');
    }
  };

  const handleVideoCall = () => {
    if (!selectedRoom) return;
    
    if (selectedRoom.type === 'direct') {
      const otherUser = getOtherParticipant(selectedRoom);
      if (otherUser) {
        setCurrentCallType('video');
        setCurrentCallParticipant(otherUser);
        initiateCall(otherUser, 'video');
      }
    } else {
      showNotification('Group calls not supported yet', 'info');
    }
  };

  const handleAnswerCall = () => {
    answerCall();
  };

  const handleDeclineCall = () => {
    declineCall();
  };

  const handleEndCall = () => {
    endCall();
    setCallDialogOpen(false);
  };

  const handleCallFromHistory = (participant: any, type: 'voice' | 'video') => {
    // Find or create chat room with this participant
    const existingRoom = chatRooms.find(room => 
      room.type === 'direct' && 
      room.participants.some(p => p.user._id === participant._id)
    );
    
    if (existingRoom) {
      setSelectedRoom(existingRoom);
      setCurrentCallType(type);
      setCurrentCallParticipant(participant);
      initiateCall(participant, type);
    } else {
      showNotification('Chat room not found', 'error');
    }
    setShowCallHistory(false);
  };

  // ==================== VOICE RECORDING ====================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      showNotification('Could not access microphone', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // ==================== TYPING INDICATOR ====================
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    if (!selectedRoom || !socket) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('typing_start', { roomId: selectedRoom._id });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { roomId: selectedRoom._id });
    }, 2000);
  };

  // ==================== FILE HANDLING ====================
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'video') => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
    setAttachmentMenuAnchor(null);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== SCROLL HANDLING ====================
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isNearBottom);
    
    if (isNearBottom) {
      setNewMessageCount(0);
    }
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchChatRooms();
    
    // Load saved preferences
    const savedMuted = localStorage.getItem('mutedChatRooms');
    const savedPinned = localStorage.getItem('pinnedChatRooms');
    const savedArchived = localStorage.getItem('archivedChatRooms');
    
    if (savedMuted) setMutedRooms(new Set(JSON.parse(savedMuted)));
    if (savedPinned) setPinnedRooms(new Set(JSON.parse(savedPinned)));
    if (savedArchived) setArchivedRooms(new Set(JSON.parse(savedArchived)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;

    // New message
    socket.on('new_message', (data: { roomId: string; message: Message }) => {
      if (selectedRoom && data.roomId === selectedRoom._id) {
        setMessages(prev => [...prev, data.message]);
        
        // Check if user is at bottom
        if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
          
          if (isNearBottom) {
            setTimeout(() => scrollToBottom(), 100);
          } else {
            setNewMessageCount(prev => prev + 1);
          }
        }
      }
      
      // Update room list
      setChatRooms(prev => prev.map(room => 
        room._id === data.roomId 
          ? { 
              ...room, 
              lastMessage: { 
                content: data.message.content, 
                createdAt: data.message.createdAt,
                sender: data.message.sender,
                type: data.message.type
              },
              unreadCount: room._id === selectedRoom?._id ? 0 : (room.unreadCount || 0) + 1
            }
          : room
      ));
    });

    // Message edited
    socket.on('message_edited', (data: { roomId: string; messageId: string; content: string; editedAt: string }) => {
      if (selectedRoom && data.roomId === selectedRoom._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, content: data.content, editedAt: data.editedAt }
            : msg
        ));
      }
    });

    // Message deleted
    socket.on('message_deleted', (data: { roomId: string; messageId: string; deleteForEveryone: boolean }) => {
      if (selectedRoom && data.roomId === selectedRoom._id) {
        if (data.deleteForEveryone) {
          setMessages(prev => prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, content: 'This message was deleted', isDeleted: true }
              : msg
          ));
        } else {
          setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
        }
      }
    });

    // Message reaction
    socket.on('message_reaction', (data: { roomId: string; messageId: string; reactions: Reaction[] }) => {
      if (selectedRoom && data.roomId === selectedRoom._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      }
    });

    // Typing indicators
    socket.on('user_typing', (data: { roomId: string; userId: string; userName: string }) => {
      if (selectedRoom && data.roomId === selectedRoom._id && data.userId !== user?._id) {
        setTypingUsers(prev => new Map(prev).set(data.userId, data.userName));
      }
    });

    socket.on('user_stopped_typing', (data: { roomId: string; userId: string }) => {
      if (selectedRoom && data.roomId === selectedRoom._id) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      }
    });

    // Online status
    socket.on('user_online', (userId: string) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socket.on('user_offline', (userId: string) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Read receipts
    socket.on('messages_read', (data: { roomId: string; userId: string }) => {
      if (selectedRoom && data.roomId === selectedRoom._id) {
        setMessages(prev => prev.map(msg => ({
          ...msg,
          status: msg.sender._id === user?._id ? 'read' : msg.status,
          readBy: [...(msg.readBy || []), { user: data.userId, readAt: new Date().toISOString() }]
        })));
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('message_reaction');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('messages_read');
    };
  }, [socket, selectedRoom, user?._id, scrollToBottom]);

  // ==================== FILTERED ROOMS ====================
  const filteredRooms = chatRooms
    .filter(room => {
      // Filter by archived status
      const isArchived = archivedRooms.has(room._id);
      if (showArchived !== isArchived) return false;

      // Filter by search
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      if (room.type === 'direct') {
        const other = getOtherParticipant(room);
        return other && other.firstName && other.lastName && `${other.firstName} ${other.lastName}`.toLowerCase().includes(query);
      }
      return room.name.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      // Pinned rooms first
      const aIsPinned = pinnedRooms.has(a._id);
      const bIsPinned = pinnedRooms.has(b._id);
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
      
      // Then by last message time
      const aTime = a.lastMessage?.createdAt || a.createdAt || '';
      const bTime = b.lastMessage?.createdAt || b.createdAt || '';
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  // ==================== RENDER HELPERS ====================
  const renderMessageContent = (message: Message) => {
    if (message.isDeleted) {
      return (
        <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.6 }}>
          🚫 This message was deleted
        </Typography>
      );
    }

    switch (message.type) {
      case 'image':
        return (
          <Box>
            {message.attachments?.map((attachment, index) => (
              <Box 
                key={index} 
                sx={{ cursor: 'pointer', maxWidth: 300 }}
                onClick={() => setPreviewMedia({ url: `${API_BASE_URL}${attachment.path}`, type: 'image' })}
              >
                <img 
                  src={`${API_BASE_URL}${attachment.path}`} 
                  alt={attachment.originalName}
                  style={{ maxWidth: '100%', borderRadius: 8 }}
                />
              </Box>
            ))}
            {message.content && message.content !== 'File attachment' && (
              <Typography variant="body2" sx={{ mt: 1 }}>{message.content}</Typography>
            )}
          </Box>
        );

      case 'video':
        return (
          <Box>
            {message.attachments?.map((attachment, index) => (
              <video 
                key={index}
                controls 
                style={{ maxWidth: 300, borderRadius: 8 }}
                src={`${API_BASE_URL}${attachment.path}`}
              />
            ))}
          </Box>
        );

      case 'voice':
      case 'audio':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
            <KeyboardVoice sx={{ color: '#25D366' }} />
            <audio 
              controls 
              style={{ height: 40 }}
              src={message.attachments?.[0] ? `${API_BASE_URL}${message.attachments[0].path}` : ''}
            />
          </Box>
        );

      case 'file':
        return (
          <Box>
            {message.attachments?.map((attachment, index) => (
              <Paper 
                key={index}
                sx={{ 
                  p: 1.5, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  bgcolor: 'action.hover',
                  cursor: 'pointer'
                }}
                onClick={() => window.open(`${API_BASE_URL}${attachment.path}`, '_blank')}
              >
                <InsertDriveFile color="primary" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{attachment.originalName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
                <IconButton size="small">
                  <Download />
                </IconButton>
              </Paper>
            ))}
          </Box>
        );

      default:
        return (
          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
        );
    }
  };

  const renderReactions = (message: Message) => {
    if (!message.reactions || message.reactions.length === 0) return null;

    const groupedReactions = message.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
        {Object.entries(groupedReactions).map(([emoji, count]) => (
          <Chip
            key={emoji}
            label={`${emoji} ${count}`}
            size="small"
            sx={{ 
              height: 22, 
              fontSize: '0.75rem',
              bgcolor: 'action.selected',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => {
              setSelectedMessage(message);
              handleReaction(emoji);
            }}
          />
        ))}
      </Box>
    );
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress sx={{ color: '#25D366' }} />
      </Box>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      display: 'flex', 
      bgcolor: '#111b21',
      position: 'relative'
    }}>
      {/* ==================== LEFT PANEL: CHAT LIST ==================== */}
      <Box sx={{ 
        width: { xs: selectedRoom ? 0 : '100%', md: 400 }, 
        borderRight: '1px solid #222d34',
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: '#111b21',
        transition: 'width 0.3s'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          bgcolor: '#202c33',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={(user as any)?.avatar} sx={{ bgcolor: '#25D366' }}>
              {user?.firstName?.[0]}
            </Avatar>
            <Typography variant="h6" sx={{ color: '#e9edef', fontWeight: 500 }}>
              Chats
            </Typography>
          </Box>
          <Box>
            <Tooltip title="New Chat">
              <IconButton 
                sx={{ color: '#aebac1' }}
                onClick={(e) => setAddMenuAnchor(e.currentTarget)}
              >
                <Add />
              </IconButton>
            </Tooltip>
            <Tooltip title="More options">
              <IconButton sx={{ color: '#aebac1' }}>
                <MoreVert />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Add Menu */}
        <Menu
          anchorEl={addMenuAnchor}
          open={Boolean(addMenuAnchor)}
          onClose={() => setAddMenuAnchor(null)}
          PaperProps={{ sx: { bgcolor: '#233138', color: '#e9edef' } }}
        >
          <MenuItem onClick={() => { setAddMenuAnchor(null); setCreateChatOpen(true); }}>
            <ListItemIcon><Person sx={{ color: '#aebac1' }} /></ListItemIcon>
            New Chat
          </MenuItem>
          <MenuItem onClick={() => { setAddMenuAnchor(null); setCreateGroupChatOpen(true); }}>
            <ListItemIcon><Group sx={{ color: '#aebac1' }} /></ListItemIcon>
            New Group
          </MenuItem>
        </Menu>

        {/* Search */}
        <Box sx={{ p: 1, bgcolor: '#111b21' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: '#aebac1' }} /></InputAdornment>,
              sx: { 
                bgcolor: '#202c33', 
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                color: '#e9edef',
                '& input::placeholder': { color: '#8696a0' }
              }
            }}
          />
        </Box>

        {/* Filter Tabs */}
        <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
          <Chip 
            label="All" 
            size="small"
            onClick={() => setShowArchived(false)}
            sx={{ 
              bgcolor: !showArchived ? '#00a884' : '#202c33', 
              color: !showArchived ? '#111b21' : '#e9edef',
              '&:hover': { bgcolor: !showArchived ? '#00a884' : '#2a3942' }
            }}
          />
          <Chip 
            label="Unread" 
            size="small"
            sx={{ bgcolor: '#202c33', color: '#e9edef', '&:hover': { bgcolor: '#2a3942' } }}
          />
          <Chip 
            label="Groups" 
            size="small"
            sx={{ bgcolor: '#202c33', color: '#e9edef', '&:hover': { bgcolor: '#2a3942' } }}
          />
          <Chip 
            label={`Archived (${archivedRooms.size})`}
            size="small"
            onClick={() => setShowArchived(true)}
            sx={{ 
              bgcolor: showArchived ? '#00a884' : '#202c33', 
              color: showArchived ? '#111b21' : '#e9edef',
              '&:hover': { bgcolor: showArchived ? '#00a884' : '#2a3942' }
            }}
          />
        </Box>

        {/* Connection Status */}
        {!isConnected && (
          <Box sx={{ px: 2, py: 1 }}>
            <Chip 
              label="Connecting..." 
              size="small" 
              color="warning" 
              icon={<Refresh sx={{ animation: 'spin 1s linear infinite' }} />}
            />
          </Box>
        )}

        {/* Chat List */}
        <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {filteredRooms.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#8696a0' }}>
                {showArchived ? 'No archived chats' : 'No conversations yet'}
              </Typography>
            </Box>
          ) : (
            filteredRooms.map((room) => {
              const otherUser = getOtherParticipant(room);
              const isOnline = otherUser ? isUserOnline(otherUser._id) : false;
              const isPinned = pinnedRooms.has(room._id);
              const isMuted = mutedRooms.has(room._id);
              
              return (
                <ListItem key={room._id} disablePadding sx={{ borderBottom: '1px solid #222d34' }}>
                  <ListItemButton
                    onClick={() => handleSelectRoom(room)}
                    selected={selectedRoom?._id === room._id}
                    sx={{
                      py: 1.5,
                      '&:hover': { bgcolor: '#202c33' },
                      '&.Mui-selected': { bgcolor: '#2a3942' },
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
                            backgroundColor: '#25D366',
                            boxShadow: '0 0 0 2px #111b21',
                          },
                        }}
                      >
                        <Avatar
                          src={room.type === 'direct' ? otherUser?.avatar : room.avatar}
                          sx={{ 
                            bgcolor: room.type === 'group' ? '#00a884' : '#6b7b8a',
                            width: 48,
                            height: 48
                          }}
                        >
                          {room.type === 'direct' && otherUser && otherUser.firstName && otherUser.lastName
                            ? `${otherUser.firstName[0]}${otherUser.lastName[0]}`
                            : room.type === 'group'
                            ? <Group />
                            : room.name?.[0]?.toUpperCase() || 'R'}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography component="div" variant="subtitle1" sx={{ color: '#e9edef', fontWeight: 500 }}>
                            {room.type === 'direct' && otherUser && otherUser.firstName && otherUser.lastName
                              ? `${otherUser.firstName} ${otherUser.lastName}`
                              : room.name || 'Unknown'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {isPinned && <PushPin sx={{ fontSize: 14, color: '#8696a0' }} />}
                            {isMuted && <VolumeOff sx={{ fontSize: 14, color: '#8696a0' }} />}
                            <Typography component="div" variant="caption" sx={{ color: '#8696a0' }}>
                              {room.lastMessage?.createdAt && formatMessageTime(room.lastMessage.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography
                            component="div"
                            variant="body2"
                            sx={{
                              color: '#8696a0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 200,
                            }}
                          >
                            {room.lastMessage?.type === 'image' ? '📷 Photo' :
                             room.lastMessage?.type === 'video' ? '🎥 Video' :
                             room.lastMessage?.type === 'voice' ? '🎤 Voice message' :
                             room.lastMessage?.type === 'file' ? '📎 Document' :
                             room.lastMessage?.content || 'No messages yet'}
                          </Typography>
                          {room.unreadCount && room.unreadCount > 0 && (
                            <Badge 
                              badgeContent={room.unreadCount} 
                              sx={{
                                '& .MuiBadge-badge': {
                                  bgcolor: '#00a884',
                                  color: '#111b21',
                                  fontWeight: 600
                                }
                              }}
                            />
                          )}
                        </Box>
                      }
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
        </List>
      </Box>

      {/* ==================== RIGHT PANEL: CHAT AREA ==================== */}
      <Box sx={{ 
        flex: 1, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: '#0b141a',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23222d34\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
      }}>
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 1.5, 
                bgcolor: '#202c33',
                borderBottom: '1px solid #222d34',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Back button for mobile */}
                <IconButton 
                  sx={{ display: { md: 'none' }, color: '#aebac1' }}
                  onClick={() => setSelectedRoom(null)}
                >
                  <ArrowBack />
                </IconButton>

                {selectedRoom.type === 'direct' ? (() => {
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
                            backgroundColor: '#25D366',
                            boxShadow: '0 0 0 2px #202c33',
                          },
                        }}
                      >
                        <Avatar src={otherUser?.avatar} sx={{ bgcolor: '#6b7b8a' }}>
                          {otherUser && otherUser.firstName && otherUser.lastName && `${otherUser.firstName[0]}${otherUser.lastName[0]}`}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="subtitle1" sx={{ color: '#e9edef', fontWeight: 500 }}>
                          {otherUser && otherUser.firstName && otherUser.lastName && `${otherUser.firstName} ${otherUser.lastName}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8696a0' }}>
                          {isOnline ? 'online' : 'offline'}
                        </Typography>
                      </Box>
                    </>
                  );
                })() : (
                  <>
                    <Avatar src={selectedRoom.avatar} sx={{ bgcolor: '#00a884' }}>
                      <Group />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: '#e9edef', fontWeight: 500 }}>
                        {selectedRoom.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8696a0' }}>
                        {selectedRoom.participants.length} participants
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>

              <Box>
                <Tooltip title="Video call">
                  <IconButton 
                    sx={{ color: '#aebac1' }}
                    onClick={handleVideoCall}
                    disabled={selectedRoom?.type !== 'direct'}
                  >
                    <Videocam />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Voice call">
                  <IconButton 
                    sx={{ color: '#aebac1' }}
                    onClick={handleVoiceCall}
                    disabled={selectedRoom?.type !== 'direct'}
                  >
                    <Call />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Search">
                  <IconButton 
                    sx={{ color: '#aebac1' }}
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                  >
                    <Search />
                  </IconButton>
                </Tooltip>
                <Tooltip title="More">
                  <IconButton 
                    sx={{ color: '#aebac1' }}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                  >
                    <MoreVert />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Room Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { bgcolor: '#233138', color: '#e9edef', minWidth: 200 } }}
              >
                <MenuItem onClick={() => { setAnchorEl(null); setViewInfoOpen(true); }}>
                  <ListItemIcon><Info sx={{ color: '#aebac1' }} /></ListItemIcon>
                  Contact info
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); setShowCallHistory(true); }}>
                  <ListItemIcon><Call sx={{ color: '#aebac1' }} /></ListItemIcon>
                  Call history
                </MenuItem>
                <MenuItem onClick={handleMuteToggle}>
                  <ListItemIcon>
                    {mutedRooms.has(selectedRoom._id) ? 
                      <VolumeUp sx={{ color: '#aebac1' }} /> : 
                      <VolumeOff sx={{ color: '#aebac1' }} />
                    }
                  </ListItemIcon>
                  {mutedRooms.has(selectedRoom._id) ? 'Unmute' : 'Mute'} notifications
                </MenuItem>
                <MenuItem onClick={handlePinToggle}>
                  <ListItemIcon><PushPin sx={{ color: '#aebac1' }} /></ListItemIcon>
                  {pinnedRooms.has(selectedRoom._id) ? 'Unpin' : 'Pin'} chat
                </MenuItem>
                <MenuItem onClick={handleArchiveToggle}>
                  <ListItemIcon>
                    {archivedRooms.has(selectedRoom._id) ? 
                      <Unarchive sx={{ color: '#aebac1' }} /> : 
                      <Archive sx={{ color: '#aebac1' }} />
                    }
                  </ListItemIcon>
                  {archivedRooms.has(selectedRoom._id) ? 'Unarchive' : 'Archive'} chat
                </MenuItem>
                <Divider sx={{ borderColor: '#222d34' }} />
                <MenuItem onClick={handleClearChat}>
                  <ListItemIcon><Delete sx={{ color: '#aebac1' }} /></ListItemIcon>
                  Clear chat
                </MenuItem>
              </Menu>
            </Paper>

            {/* Message Search Bar */}
            <Collapse in={showMessageSearch}>
              <Box sx={{ p: 1, bgcolor: '#202c33', borderBottom: '1px solid #222d34' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ color: '#aebac1' }} /></InputAdornment>,
                    endAdornment: messageSearchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setMessageSearchQuery('')}>
                          <Clear sx={{ color: '#aebac1' }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { 
                      bgcolor: '#2a3942', 
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      color: '#e9edef'
                    }
                  }}
                />
              </Box>
            </Collapse>

            {/* Messages Area */}
            <Box 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              sx={{ 
                flex: 1, 
                overflow: 'auto', 
                p: 2,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {messages.length === 0 ? (
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <Box sx={{ 
                    bgcolor: '#182229', 
                    p: 3, 
                    borderRadius: 2,
                    textAlign: 'center',
                    maxWidth: 400
                  }}>
                    <Typography variant="body1" sx={{ color: '#e9edef' }}>
                      🔒 Messages are secured with end-to-end education
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8696a0', display: 'block', mt: 1 }}>
                      Start the conversation!
                    </Typography>
                  </Box>
                </Box>
              ) : (
                messages
                  .filter(msg => !messageSearchQuery || msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                  .map((message, index) => {
                    const isOwnMessage = message.sender._id === user?._id;
                    const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].sender._id !== message.sender._id);
                    const showDate = index === 0 || 
                      new Date(message.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

                    return (
                      <React.Fragment key={message._id}>
                        {/* Date Separator */}
                        {showDate && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <Chip 
                              label={isToday(new Date(message.createdAt)) ? 'Today' : 
                                     isYesterday(new Date(message.createdAt)) ? 'Yesterday' :
                                     format(new Date(message.createdAt), 'MMMM d, yyyy')}
                              size="small"
                              sx={{ bgcolor: '#182229', color: '#8696a0' }}
                            />
                          </Box>
                        )}

                        {/* Message Bubble */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                            mb: 0.5,
                            alignItems: 'flex-end',
                          }}
                        >
                          {!isOwnMessage && showAvatar && selectedRoom.type !== 'direct' && (
                            <Avatar
                              src={message.sender.avatar}
                              sx={{ width: 28, height: 28, mr: 1, mb: 0.5 }}
                            >
                              {message.sender?.firstName?.[0] || 'U'}
                            </Avatar>
                          )}
                          {!isOwnMessage && !showAvatar && selectedRoom.type !== 'direct' && (
                            <Box sx={{ width: 36 }} />
                          )}

                          <Box sx={{ maxWidth: '65%' }}>
                            {/* Sender name for groups */}
                            {!isOwnMessage && showAvatar && selectedRoom.type !== 'direct' && (
                              <Typography variant="caption" sx={{ color: '#00a884', ml: 1, fontWeight: 500 }}>
                                {message.sender?.firstName || 'Unknown'} {message.sender?.lastName || ''}
                              </Typography>
                            )}

                            {/* Reply preview */}
                            {message.replyTo && (
                              <Paper
                                sx={{
                                  p: 1,
                                  mb: 0.5,
                                  bgcolor: isOwnMessage ? 'rgba(0, 168, 132, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                  borderLeft: '4px solid #00a884',
                                  borderRadius: 1,
                                }}
                              >
                                <Typography variant="caption" sx={{ color: '#00a884', fontWeight: 600 }}>
                                  {message.replyTo?.sender?.firstName || 'Unknown'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#8696a0', display: 'block' }} noWrap>
                                  {message.replyTo.content}
                                </Typography>
                              </Paper>
                            )}

                            {/* Forwarded label */}
                            {message.forwardedFrom && (
                              <Typography variant="caption" sx={{ color: '#8696a0', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <Forward sx={{ fontSize: 12 }} /> Forwarded
                              </Typography>
                            )}

                            {/* Message bubble */}
                            <Paper
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setSelectedMessage(message);
                                setMessageMenuAnchor(e.currentTarget as HTMLElement);
                              }}
                              sx={{
                                p: 1,
                                px: 1.5,
                                bgcolor: isOwnMessage ? '#005c4b' : '#202c33',
                                color: '#e9edef',
                                borderRadius: 2,
                                borderTopLeftRadius: !isOwnMessage && showAvatar ? 0 : 8,
                                borderTopRightRadius: isOwnMessage ? 0 : 8,
                                position: 'relative',
                                cursor: 'context-menu',
                                minWidth: 80,
                                '&:hover': {
                                  '& .message-actions': { opacity: 1 }
                                }
                              }}
                            >
                              {/* Message content */}
                              {renderMessageContent(message)}

                              {/* Message footer */}
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                alignItems: 'center', 
                                mt: 0.5, 
                                gap: 0.5 
                              }}>
                                {message.editedAt && (
                                  <Typography variant="caption" sx={{ color: '#8696a0', fontSize: '0.65rem' }}>
                                    edited
                                  </Typography>
                                )}
                                <Typography variant="caption" sx={{ color: '#8696a0', fontSize: '0.7rem' }}>
                                  {formatMessageTime(message.createdAt)}
                                </Typography>
                                {getMessageStatusIcon(message, isOwnMessage)}
                              </Box>

                              {/* Quick reactions button */}
                              <Box 
                                className="message-actions"
                                sx={{ 
                                  position: 'absolute',
                                  top: -10,
                                  right: isOwnMessage ? 'auto' : -10,
                                  left: isOwnMessage ? -10 : 'auto',
                                  opacity: 0,
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    setSelectedMessage(message);
                                    setEmojiAnchor(e.currentTarget);
                                  }}
                                  sx={{ 
                                    bgcolor: '#2a3942', 
                                    '&:hover': { bgcolor: '#3b4a54' },
                                    width: 24,
                                    height: 24
                                  }}
                                >
                                  <EmojiEmotions sx={{ fontSize: 14, color: '#8696a0' }} />
                                </IconButton>
                              </Box>
                            </Paper>

                            {/* Reactions */}
                            {renderReactions(message)}
                          </Box>
                        </Box>
                      </React.Fragment>
                    );
                  })
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Scroll to bottom button */}
            <Zoom in={showScrollButton || newMessageCount > 0}>
              <Fab
                size="small"
                onClick={() => scrollToBottom()}
                sx={{
                  position: 'absolute',
                  bottom: 100,
                  right: 20,
                  bgcolor: '#202c33',
                  color: '#8696a0',
                  '&:hover': { bgcolor: '#2a3942' }
                }}
              >
                <Badge badgeContent={newMessageCount} color="primary">
                  <ArrowDownward />
                </Badge>
              </Fab>
            </Zoom>

            {/* Typing Indicator */}
            <Collapse in={typingUsers.size > 0}>
              <Box sx={{ px: 2, py: 1, bgcolor: '#0b141a' }}>
                <Typography variant="caption" sx={{ color: '#00a884' }}>
                  {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </Typography>
              </Box>
            </Collapse>

            {/* Reply Preview */}
            {replyingTo && (
              <Paper sx={{ 
                mx: 2, 
                p: 1.5, 
                bgcolor: '#202c33',
                borderLeft: '4px solid #00a884',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#00a884', fontWeight: 600 }}>
                    Replying to {replyingTo.sender?.firstName || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8696a0' }} noWrap>
                    {replyingTo.content}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setReplyingTo(null)}>
                  <Close sx={{ color: '#8696a0' }} />
                </IconButton>
              </Paper>
            )}

            {/* Edit Mode */}
            {editingMessage && (
              <Paper sx={{ 
                mx: 2, 
                p: 1.5, 
                bgcolor: '#202c33',
                borderLeft: '4px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 600 }}>
                    Editing message
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditMessage()}
                    sx={{ 
                      mt: 1,
                      '& .MuiOutlinedInput-root': { color: '#e9edef', bgcolor: '#2a3942' }
                    }}
                  />
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => { setEditingMessage(null); setEditContent(''); }}>
                    <Close sx={{ color: '#8696a0' }} />
                  </IconButton>
                  <IconButton size="small" color="primary" onClick={handleEditMessage}>
                    <Check />
                  </IconButton>
                </Box>
              </Paper>
            )}

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <Paper sx={{ mx: 2, p: 1.5, bgcolor: '#202c33' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeSelectedFile(index)}
                      sx={{ bgcolor: '#2a3942', color: '#e9edef' }}
                      icon={
                        file.type.startsWith('image/') ? <ImageIcon /> :
                        file.type.startsWith('video/') ? <VideoLibrary /> :
                        <InsertDriveFile />
                      }
                    />
                  ))}
                </Box>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />
                )}
              </Paper>
            )}

            {/* Voice Recording Preview */}
            {audioBlob && !isRecording && (
              <Paper sx={{ mx: 2, p: 1.5, bgcolor: '#202c33', display: 'flex', alignItems: 'center', gap: 2 }}>
                <KeyboardVoice sx={{ color: '#00a884' }} />
                <audio controls src={URL.createObjectURL(audioBlob)} style={{ flex: 1, height: 40 }} />
                <IconButton size="small" onClick={() => setAudioBlob(null)}>
                  <Delete sx={{ color: '#ef4444' }} />
                </IconButton>
              </Paper>
            )}

            {/* Message Input */}
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#202c33', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              {isRecording ? (
                // Recording UI
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton onClick={cancelRecording} sx={{ color: '#ef4444' }}>
                    <Delete />
                  </IconButton>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: '#ef4444',
                      animation: 'pulse 1s infinite'
                    }} />
                    <Typography sx={{ color: '#e9edef' }}>
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </Typography>
                  </Box>
                  <IconButton onClick={stopRecording} sx={{ bgcolor: '#00a884', color: '#fff', '&:hover': { bgcolor: '#008f6c' } }}>
                    <Send />
                  </IconButton>
                </Box>
              ) : (
                // Normal input UI
                <>
                  <IconButton 
                    sx={{ color: '#8696a0' }}
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                  >
                    <EmojiEmotions />
                  </IconButton>
                  <IconButton 
                    sx={{ color: '#8696a0' }}
                    onClick={(e) => setAttachmentMenuAnchor(e.currentTarget)}
                  >
                    <AttachFile />
                  </IconButton>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message"
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#2a3942',
                        borderRadius: 2,
                        color: '#e9edef',
                        '& fieldset': { border: 'none' },
                        '& input::placeholder, & textarea::placeholder': { color: '#8696a0' }
                      },
                    }}
                  />
                  {newMessage.trim() || selectedFiles.length > 0 || audioBlob ? (
                    <IconButton
                      onClick={handleSendMessage}
                      disabled={sendingMessage}
                      sx={{
                        bgcolor: '#00a884',
                        color: '#fff',
                        '&:hover': { bgcolor: '#008f6c' },
                        '&:disabled': { bgcolor: '#2a3942' }
                      }}
                    >
                      {sendingMessage ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : <Send />}
                    </IconButton>
                  ) : (
                    <IconButton
                      onClick={startRecording}
                      sx={{ color: '#8696a0' }}
                    >
                      <Mic />
                    </IconButton>
                  )}
                </>
              )}
            </Paper>
          </>
        ) : (
          // No chat selected
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 3,
            bgcolor: '#222e35'
          }}>
            <img 
              src="https://web.whatsapp.com/img/intro-connection-light_c98cc75f2aa905314d74f46c2c3f0e17.jpg" 
              alt="WhatsApp Web"
              style={{ width: 320, opacity: 0.8 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <Typography variant="h4" sx={{ color: '#e9edef', fontWeight: 300 }}>
              EduVerse Chat
            </Typography>
            <Typography sx={{ color: '#8696a0', textAlign: 'center', maxWidth: 400 }}>
              Send and receive messages securely. Start a conversation with your teachers or classmates.
            </Typography>
          </Box>
        )}
      </Box>

      {/* ==================== DIALOGS & MENUS ==================== */}

      {/* Message Context Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={() => { setMessageMenuAnchor(null); setSelectedMessage(null); }}
        PaperProps={{ sx: { bgcolor: '#233138', color: '#e9edef', minWidth: 180 } }}
      >
        <MenuItem onClick={() => { setReplyingTo(selectedMessage); setMessageMenuAnchor(null); setSelectedMessage(null); }}>
          <ListItemIcon><ReplyIcon sx={{ color: '#aebac1' }} /></ListItemIcon>
          Reply
        </MenuItem>
        <MenuItem onClick={() => { 
          if (selectedMessage) {
            setForwardingMessage(selectedMessage);
          }
          setMessageMenuAnchor(null); 
          setSelectedMessage(null); 
        }}>
          <ListItemIcon><Forward sx={{ color: '#aebac1' }} /></ListItemIcon>
          Forward
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedMessage) {
            navigator.clipboard.writeText(selectedMessage.content);
            showNotification('Copied to clipboard', 'success');
          }
          setMessageMenuAnchor(null);
          setSelectedMessage(null);
        }}>
          <ListItemIcon><ContentCopy sx={{ color: '#aebac1' }} /></ListItemIcon>
          Copy
        </MenuItem>
        <MenuItem onClick={handleStarMessage}>
          <ListItemIcon>
            {selectedMessage?.isStarred?.some(s => s.user === user?._id) ? 
              <Star sx={{ color: '#f59e0b' }} /> : 
              <StarBorder sx={{ color: '#aebac1' }} />
            }
          </ListItemIcon>
          {selectedMessage?.isStarred?.some(s => s.user === user?._id) ? 'Unstar' : 'Star'}
        </MenuItem>
        {selectedMessage?.sender._id === user?._id && (
          <MenuItem onClick={() => {
            if (selectedMessage) {
              setEditingMessage(selectedMessage);
              setEditContent(selectedMessage.content);
            }
            setMessageMenuAnchor(null);
            setSelectedMessage(null);
          }}>
            <ListItemIcon><Edit sx={{ color: '#aebac1' }} /></ListItemIcon>
            Edit
          </MenuItem>
        )}
        <Divider sx={{ borderColor: '#222d34' }} />
        {selectedMessage?.sender._id === user?._id ? (
          <>
            <MenuItem onClick={() => handleDeleteMessage(false)} sx={{ color: '#ef4444' }}>
              <ListItemIcon><Delete sx={{ color: '#ef4444' }} /></ListItemIcon>
              Delete for me
            </MenuItem>
            <MenuItem onClick={() => handleDeleteMessage(true)} sx={{ color: '#ef4444' }}>
              <ListItemIcon><DeleteForever sx={{ color: '#ef4444' }} /></ListItemIcon>
              Delete for everyone
            </MenuItem>
          </>
        ) : (
          <MenuItem onClick={() => handleDeleteMessage(false)} sx={{ color: '#ef4444' }}>
            <ListItemIcon><Delete sx={{ color: '#ef4444' }} /></ListItemIcon>
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        PaperProps={{ sx: { bgcolor: '#233138', p: 2, maxWidth: 320 } }}
      >
        {selectedMessage ? (
          // Quick reactions for message
          <Box sx={{ display: 'flex', gap: 1 }}>
            {QUICK_REACTIONS.map(emoji => (
              <IconButton 
                key={emoji} 
                onClick={() => { handleReaction(emoji); setEmojiAnchor(null); }}
                sx={{ fontSize: 24 }}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        ) : (
          // Full emoji picker for input
          <Box>
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <Box key={category} sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#8696a0', mb: 1, display: 'block' }}>
                  {category}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {emojis.slice(0, 20).map(emoji => (
                    <IconButton 
                      key={emoji}
                      size="small"
                      onClick={() => { setNewMessage(prev => prev + emoji); setEmojiAnchor(null); }}
                      sx={{ fontSize: 20, p: 0.5 }}
                    >
                      {emoji}
                    </IconButton>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Popover>

      {/* Attachment Menu */}
      <Menu
        anchorEl={attachmentMenuAnchor}
        open={Boolean(attachmentMenuAnchor)}
        onClose={() => setAttachmentMenuAnchor(null)}
        PaperProps={{ sx: { bgcolor: '#233138', color: '#e9edef' } }}
      >
        <MenuItem onClick={() => imageInputRef.current?.click()}>
          <ListItemIcon><ImageIcon sx={{ color: '#bf59cf' }} /></ListItemIcon>
          Photos & Videos
        </MenuItem>
        <MenuItem onClick={() => fileInputRef.current?.click()}>
          <ListItemIcon><InsertDriveFile sx={{ color: '#5157ae' }} /></ListItemIcon>
          Document
        </MenuItem>
        <MenuItem onClick={() => videoInputRef.current?.click()}>
          <ListItemIcon><CameraAlt sx={{ color: '#d3396d' }} /></ListItemIcon>
          Camera
        </MenuItem>
      </Menu>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleFileSelect(e, 'file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => handleFileSelect(e, 'video')}
      />

      {/* Forward Message Dialog */}
      <Dialog
        open={Boolean(forwardingMessage)}
        onClose={() => setForwardingMessage(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#111b21', color: '#e9edef' } }}
      >
        <DialogTitle sx={{ bgcolor: '#202c33' }}>
          Forward message to
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List>
            {chatRooms.filter(r => r._id !== selectedRoom?._id).map(room => {
              const otherUser = getOtherParticipant(room);
              return (
                <ListItem key={room._id} disablePadding>
                  <ListItemButton onClick={() => handleForwardMessage(room._id)}>
                    <ListItemAvatar>
                      <Avatar src={room.type === 'direct' ? otherUser?.avatar : room.avatar}>
                        {room.type === 'direct' && otherUser && otherUser.firstName
                          ? `${otherUser.firstName[0]}`
                          : <Group />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={room.type === 'direct' && otherUser && otherUser.firstName && otherUser.lastName
                        ? `${otherUser.firstName} ${otherUser.lastName}`
                        : room.name || 'Unknown'}
                      sx={{ color: '#e9edef' }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#202c33' }}>
          <Button onClick={() => setForwardingMessage(null)} sx={{ color: '#8696a0' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Info Dialog */}
      <Dialog
        open={viewInfoOpen}
        onClose={() => setViewInfoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#111b21', color: '#e9edef' } }}
      >
        <DialogTitle sx={{ bgcolor: '#202c33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography component="div" variant="h6">Contact Info</Typography>
          <IconButton onClick={() => setViewInfoOpen(false)}>
            <Close sx={{ color: '#aebac1' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedRoom && (
            <Box>
              {/* Header */}
              <Box sx={{ bgcolor: '#202c33', p: 4, textAlign: 'center' }}>
                <Avatar
                  src={selectedRoom.type === 'direct' ? getOtherParticipant(selectedRoom)?.avatar : selectedRoom.avatar}
                  sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                >
                  {selectedRoom.type === 'group' ? <Group sx={{ fontSize: 60 }} /> : null}
                </Avatar>
                <Typography variant="h5">
                  {selectedRoom.type === 'direct' && getOtherParticipant(selectedRoom)
                    ? `${getOtherParticipant(selectedRoom)?.firstName || 'Unknown'} ${getOtherParticipant(selectedRoom)?.lastName || ''}`
                    : selectedRoom.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8696a0' }}>
                  {selectedRoom.type === 'group' 
                    ? `Group · ${selectedRoom.participants.length} participants`
                    : selectedRoom.type}
                </Typography>
              </Box>

              {/* Description */}
              {selectedRoom.description && (
                <Box sx={{ p: 2, bgcolor: '#111b21' }}>
                  <Typography variant="caption" sx={{ color: '#8696a0' }}>About</Typography>
                  <Typography>{selectedRoom.description}</Typography>
                </Box>
              )}

              {/* Participants */}
              {selectedRoom.type !== 'direct' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#8696a0', px: 2, py: 1 }}>
                    {selectedRoom.participants.length} participants
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
                              {participant.user?.firstName?.[0] || 'U'}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${participant.user?.firstName || 'Unknown'} ${participant.user?.lastName || ''}`}
                          secondary={participant.role}
                          sx={{ '& .MuiListItemText-secondary': { color: '#8696a0' } }}
                        />
                        {participant.role === 'admin' && (
                          <Chip label="Admin" size="small" sx={{ bgcolor: '#00a88433', color: '#00a884' }} />
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Media Preview Dialog */}
      <Dialog
        open={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {previewMedia?.type === 'image' && (
            <img src={previewMedia.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh' }} />
          )}
          {previewMedia?.type === 'video' && (
            <video src={previewMedia.url} controls style={{ maxWidth: '100%', maxHeight: '90vh' }} />
          )}
          <IconButton
            onClick={() => setPreviewMedia(null)}
            sx={{ position: 'absolute', top: 10, right: 10, bgcolor: '#00000080', color: '#fff' }}
          >
            <Close />
          </IconButton>
        </DialogContent>
      </Dialog>

      {/* Create Chat Dialogs */}
      <CreateChatDialog
        open={createChatOpen}
        onClose={() => setCreateChatOpen(false)}
        onChatCreated={fetchChatRooms}
      />
      <CreateGroupChatDialog
        open={createGroupChatOpen}
        onClose={() => setCreateGroupChatOpen(false)}
        onGroupCreated={fetchChatRooms}
      />

      {/* Call Dialog */}
      <CallDialog
        open={callDialogOpen}
        onClose={() => setCallDialogOpen(false)}
        callType={currentCall?.type || currentCallType}
        callState={callState}
        participant={currentCall?.participant || currentCallParticipant}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
        onEndCall={handleEndCall}
        duration={callDuration}
      />

      {/* Call History Dialog */}
      <Dialog
        open={showCallHistory}
        onClose={() => setShowCallHistory(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            bgcolor: '#111b21', 
            color: 'white',
            minHeight: '60vh',
          }
        }}
      >
        <CallHistory
          onCallParticipant={handleCallFromHistory}
        />
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default WhatsAppChat;
