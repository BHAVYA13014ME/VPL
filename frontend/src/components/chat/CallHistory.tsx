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
  useTheme,
  alpha,
  CircularProgress
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
  AccessTime,
  Event
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

const CallHistory: React.FC<CallHistoryProps> = ({
  onCallParticipant,
}) => {
  const theme = useTheme();
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
      setLoading(true);
      const response = await axios.get(buildApiUrl(API_ENDPOINTS.CALL_HISTORY), {
        headers: getAuthHeaders(),
      });
      
      if (response.data.success) {
        setCallHistory(response.data.data.calls || []);
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call: CallHistoryItem) => {
    let iconColor = theme.palette.text.secondary;
    
    if (call.status === 'missed') iconColor = theme.palette.error.main;
    else if (call.status === 'declined') iconColor = theme.palette.warning.main;
    else iconColor = theme.palette.success.main;
    
    const CallTypeIcon = call.type === 'video' ? Videocam : Call;
    const DirectionIcon = call.direction === 'outgoing' ? CallMade : 
                         call.status === 'missed' ? CallMissed : CallReceived;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <CallTypeIcon sx={{ color: iconColor, fontSize: 18 }} />
        <DirectionIcon sx={{ fontSize: 14, color: iconColor }} />
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
      await axios.delete(buildApiUrl(`${API_ENDPOINTS.CALL_HISTORY}/${callId}`), {
        headers: getAuthHeaders(),
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" fontWeight={600}>
          Call History
        </Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={30} />
        </Box>
      ) : callHistory.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', opacity: 0.7 }}>
          <Typography color="text.secondary">
            No calls yet. Start a conversation to make your first call!
          </Typography>
        </Box>
      ) : (
        <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
          {callHistory.map((call, index) => (
            <React.Fragment key={call._id}>
              <ListItem
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCall(call);
                      setMenuAnchor(e.currentTarget);
                    }}
                    size="small"
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                }
                disablePadding
              >
                 <Box 
                    onClick={() => handleShowDetails(call)}
                    sx={{ 
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      }
                    }}
                 >
                  <ListItemAvatar>
                    <Avatar 
                      src={call.participant.avatar} 
                      alt={call.participant.firstName}
                      sx={{ bgcolor: theme.palette.primary.main }}
                    >
                      {call.participant.firstName?.[0]}{call.participant.lastName?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={500}>
                          {call.participant.firstName} {call.participant.lastName}
                        </Typography>
                        {getCallIcon(call)}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {formatDistanceToNow(new Date(call.startTime), { addSuffix: true })}
                        </Typography>
                        <Chip
                          label={getStatusText(call)}
                          size="small"
                          color={getStatusColor(call.status) as any}
                          variant="outlined"
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      </Box>
                    }
                  />
                 </Box>
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
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => selectedCall && handleCallBack(selectedCall)}>
          <Call fontSize="small" sx={{ mr: 1.5 }} />
          Call Back
        </MenuItem>
        <MenuItem onClick={() => selectedCall && handleShowDetails(selectedCall)}>
          <Info fontSize="small" sx={{ mr: 1.5 }} />
          Details
        </MenuItem>
        <MenuItem 
          onClick={() => selectedCall && handleDeleteCall(selectedCall._id)}
          sx={{ color: theme.palette.error.main }}
        >
          <Delete fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Call Details Dialog */}
      <Dialog
        open={detailsDialog}
        onClose={() => setDetailsDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundImage: 'none',
            bgcolor: theme.palette.background.paper
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Call Details
        </DialogTitle>
        
        {selectedCall && (
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pt: 1 }}>
              <Avatar 
                src={selectedCall.participant.avatar}
                sx={{ width: 64, height: 64, bgcolor: theme.palette.primary.main }}
              >
                {selectedCall.participant.firstName?.[0]}{selectedCall.participant.lastName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {selectedCall.participant.firstName} {selectedCall.participant.lastName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  {getCallIcon(selectedCall)}
                  <Typography variant="body2" color="text.secondary">
                    {selectedCall.type === 'video' ? 'Video Call' : 'Voice Call'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Info color="action" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedCall.status}
                    color={getStatusColor(selectedCall.status) as any}
                    size="small"
                    sx={{ mt: 0.5, textTransform: 'capitalize' }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Event color="action" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedCall.startTime), 'PP p')}
                  </Typography>
                </Box>
              </Box>

              {selectedCall.duration && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <AccessTime color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Duration</Typography>
                    <Typography variant="body1">
                      {formatDuration(selectedCall.duration)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
        )}

        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDetailsDialog(false)} color="inherit">
            Close
          </Button>
          {selectedCall && (
            <Button 
              variant="contained" 
              startIcon={selectedCall.type === 'video' ? <Videocam /> : <Call />}
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
