import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Box,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Call,
  Videocam,
  CallMade,
  CallReceived,
  CallMissed,
  MoreVert,
  Delete,
  Info,
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import axios from 'axios';
import { API_ENDPOINTS, buildApiUrl, getAuthHeaders } from '../../utils/api';

interface CallHistoryItem {
  _id: string;
  type: 'voice' | 'video';
  direction: 'outgoing' | 'incoming';
  status: 'completed' | 'missed' | 'declined';
  participant: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  duration?: number; // in seconds
  startTime: string;
  endTime?: string;
  chatRoomId: string;
}

interface CallHistoryProps {
  onCallParticipant: (participant: any, type: 'voice' | 'video') => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({
  onCallParticipant,
}) => {
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallHistoryItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);

  // Fetch call history
  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const response = await axios.get(buildApiUrl(API_ENDPOINTS.CALL_HISTORY), {
        headers: getAuthHeaders(),
      });
      
      if (response.data.success) {
        setCallHistory(response.data.data.calls);
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call: CallHistoryItem) => {
    const iconColor = call.status === 'missed' ? '#f44336' : 
                     call.status === 'declined' ? '#ff9800' : '#4caf50';
    
    const CallIcon = call.type === 'video' ? Videocam : Call;
    const DirectionIcon = call.direction === 'outgoing' ? CallMade : 
                         call.status === 'missed' ? CallMissed : CallReceived;
    
    return (
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <CallIcon sx={{ color: iconColor, mr: 0.5 }} />
        <DirectionIcon sx={{ fontSize: 16, color: iconColor }} />
      </Box>
    );
  };

  const getStatusText = (call: CallHistoryItem) => {
    switch (call.status) {
      case 'completed':
        return call.duration ? formatDuration(call.duration) : 'Completed';
      case 'missed':
        return 'Missed';
      case 'declined':
        return 'Declined';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'missed':
        return 'error';
      case 'declined':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleCallBack = (call: CallHistoryItem) => {
    onCallParticipant(call.participant, call.type);
    setMenuAnchor(null);
  };

  const handleDeleteCall = async (callId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/chat/calls/${callId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setCallHistory(prev => prev.filter(call => call._id !== callId));
      setMenuAnchor(null);
    } catch (error) {
      console.error('Error deleting call:', error);
    }
  };

  const handleShowDetails = (call: CallHistoryItem) => {
    setSelectedCall(call);
    setDetailsDialog(true);
    setMenuAnchor(null);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 600 }}>
        Call History
      </Typography>
      
      {loading ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">Loading call history...</Typography>
        </Box>
      ) : callHistory.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No calls yet. Start a conversation to make your first call!
          </Typography>
        </Box>
      ) : (
        <List>
          {callHistory.map((call, index) => (
            <React.Fragment key={call._id}>
              <ListItem
                sx={{ 
                  py: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                  cursor: 'pointer',
                }}
                secondaryAction={
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCall(call);
                      setMenuAnchor(e.currentTarget);
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                }
                onClick={() => handleCallBack(call)}
              >
                <ListItemAvatar>
                  <Avatar src={call.participant.avatar}>
                    {call.participant.firstName?.[0]}{call.participant.lastName?.[0]}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        {call.participant.firstName} {call.participant.lastName}
                      </Typography>
                      {getCallIcon(call)}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDistanceToNow(new Date(call.startTime), { addSuffix: true })}
                      </Typography>
                      <Chip
                        label={getStatusText(call)}
                        size="small"
                        color={getStatusColor(call.status) as any}
                        variant="outlined"
                      />
                    </Box>
                  }
                />
              </ListItem>
              
              {index < callHistory.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => selectedCall && handleCallBack(selectedCall)}>
          <Call sx={{ mr: 1 }} />
          Call Back
        </MenuItem>
        <MenuItem onClick={() => selectedCall && handleShowDetails(selectedCall)}>
          <Info sx={{ mr: 1 }} />
          Details
        </MenuItem>
        <MenuItem 
          onClick={() => selectedCall && handleDeleteCall(selectedCall._id)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Call Details Dialog */}
      <Dialog
        open={detailsDialog}
        onClose={() => setDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Call Details
        </DialogTitle>
        
        {selectedCall && (
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar 
                src={selectedCall.participant.avatar}
                sx={{ width: 60, height: 60 }}
              >
                {selectedCall.participant.firstName?.[0]}{selectedCall.participant.lastName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedCall.participant.firstName} {selectedCall.participant.lastName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getCallIcon(selectedCall)}
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {selectedCall.type === 'video' ? 'Video Call' : 'Voice Call'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusText(selectedCall)}
                  color={getStatusColor(selectedCall.status) as any}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Started
                </Typography>
                <Typography>
                  {format(new Date(selectedCall.startTime), 'PPp')}
                </Typography>
              </Box>

              {selectedCall.endTime && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ended
                  </Typography>
                  <Typography>
                    {format(new Date(selectedCall.endTime), 'PPp')}
                  </Typography>
                </Box>
              )}

              {selectedCall.duration && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography>
                    {formatDuration(selectedCall.duration)}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Direction
                </Typography>
                <Typography sx={{ textTransform: 'capitalize' }}>
                  {selectedCall.direction}
                </Typography>
              </Box>
            </Box>
          </DialogContent>
        )}

        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>
            Close
          </Button>
          {selectedCall && (
            <Button 
              variant="contained" 
              onClick={() => {
                handleCallBack(selectedCall);
                setDetailsDialog(false);
              }}
            >
              Call Back
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CallHistory;