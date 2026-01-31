import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Avatar,
  Typography,
  IconButton,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Slide,
  CircularProgress,
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  FullscreenExit,
  SwitchCamera,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';

interface CallDialogProps {
  open: boolean;
  onClose: () => void;
  callType: 'voice' | 'video';
  callState: CallState;
  participant?: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  onAnswer?: () => void;
  onDecline?: () => void;
  onEndCall?: () => void;
  duration?: number;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const CallDialog: React.FC<CallDialogProps> = ({
  open,
  onClose,
  callType,
  callState,
  participant,
  onAnswer,
  onDecline,
  onEndCall,
  duration = 0,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === 'video');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Default participant data if not provided
  const defaultParticipant = {
    _id: 'unknown',
    firstName: 'Unknown',
    lastName: 'User',
    avatar: undefined
  };
  
  const participantData = participant || defaultParticipant;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute functionality
  };

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    // TODO: Implement actual video toggle functionality
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // TODO: Implement actual speaker toggle functionality
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getCallStateText = (): string => {
    switch (callState) {
      case 'idle':
        return 'Ready to call';
      case 'outgoing':
        return 'Calling...';
      case 'incoming':
        return 'Incoming call';
      case 'connected':
        return formatDuration(duration);
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  const getCallStateColor = (): string => {
    switch (callState) {
      case 'idle':
        return '#757575';
      case 'outgoing':
        return '#2196f3';
      case 'incoming':
        return '#4caf50';
      case 'connected':
        return '#4caf50';
      case 'ended':
        return '#f44336';
      default:
        return '#666';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          background: callType === 'video' && callState === 'connected' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
          color: 'white',
        }
      }}
    >
      <DialogContent sx={{ p: 0, height: '100vh', position: 'relative' }}>
        {/* Video Call Layout */}
        {callType === 'video' && callState === 'connected' && (
          <Box sx={{ height: '100%', position: 'relative' }}>
            {/* Remote Video (Main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                background: '#000',
              }}
            />
            
            {/* Local Video (Picture in Picture) */}
            <Card
              sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: isFullscreen ? 120 : 180,
                height: isFullscreen ? 90 : 135,
                background: '#000',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={handleToggleFullscreen}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Card>

            {/* Call Info Overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 2,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar src={participantData.avatar} sx={{ width: 40, height: 40 }}>
                {participantData.firstName?.[0]}{participantData.lastName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {participantData.firstName} {participantData.lastName}
                </Typography>
                <Typography variant="body2" sx={{ color: getCallStateColor() }}>
                  {getCallStateText()}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Voice Call or Non-Connected Video Call Layout */}
        {(callType === 'voice' || callState !== 'connected') && (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              px: 4,
            }}
          >
            {/* Participant Avatar */}
            <Avatar
              src={participantData.avatar}
              sx={{
                width: 200,
                height: 200,
                mb: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <Typography variant="h1" sx={{ fontSize: '80px', fontWeight: 300 }}>
                {participantData.firstName?.[0]}{participantData.lastName?.[0]}
              </Typography>
            </Avatar>

            {/* Participant Name */}
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 300 }}>
              {participantData.firstName} {participantData.lastName}
            </Typography>

            {/* Call State */}
            <Typography
              variant="h6"
              sx={{ 
                color: getCallStateColor(),
                mb: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {callState === 'outgoing' && <CircularProgress size={20} color="inherit" />}
              {getCallStateText()}
            </Typography>

            {/* Incoming Call Buttons */}
            {callState === 'incoming' && (
              <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
                <IconButton
                  onClick={onDecline}
                  sx={{
                    width: 70,
                    height: 70,
                    bgcolor: '#f44336',
                    color: 'white',
                    '&:hover': { bgcolor: '#d32f2f' },
                  }}
                >
                  <CallEnd sx={{ fontSize: 30 }} />
                </IconButton>
                <IconButton
                  onClick={onAnswer}
                  sx={{
                    width: 70,
                    height: 70,
                    bgcolor: '#4caf50',
                    color: 'white',
                    '&:hover': { bgcolor: '#388e3c' },
                  }}
                >
                  {callType === 'video' ? (
                    <Videocam sx={{ fontSize: 30 }} />
                  ) : (
                    <VolumeUp sx={{ fontSize: 30 }} />
                  )}
                </IconButton>
              </Box>
            )}
          </Box>
        )}

        {/* Call Controls */}
        {(callState === 'connected' || callState === 'outgoing') && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.8)',
              p: 3,
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            {/* Mute Button */}
            <IconButton
              onClick={handleToggleMute}
              sx={{
                width: 60,
                height: 60,
                bgcolor: isMuted ? '#f44336' : 'rgba(255,255,255,0.2)',
                color: 'white',
                '&:hover': { 
                  bgcolor: isMuted ? '#d32f2f' : 'rgba(255,255,255,0.3)' 
                },
              }}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </IconButton>

            {/* Video Toggle (for video calls) */}
            {callType === 'video' && (
              <IconButton
                onClick={handleToggleVideo}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: isVideoOff ? '#f44336' : 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { 
                    bgcolor: isVideoOff ? '#d32f2f' : 'rgba(255,255,255,0.3)' 
                  },
                }}
              >
                {isVideoOff ? <VideocamOff /> : <Videocam />}
              </IconButton>
            )}

            {/* Speaker Toggle (for voice calls) */}
            {callType === 'voice' && (
              <IconButton
                onClick={handleToggleSpeaker}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: isSpeakerOn ? 'rgba(33,150,243,0.8)' : 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { 
                    bgcolor: isSpeakerOn ? 'rgba(30,136,229,0.9)' : 'rgba(255,255,255,0.3)' 
                  },
                }}
              >
                {isSpeakerOn ? <VolumeUp /> : <VolumeOff />}
              </IconButton>
            )}

            {/* End Call Button */}
            <IconButton
              onClick={onEndCall}
              sx={{
                width: 60,
                height: 60,
                bgcolor: '#f44336',
                color: 'white',
                '&:hover': { bgcolor: '#d32f2f' },
              }}
            >
              <CallEnd />
            </IconButton>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CallDialog;