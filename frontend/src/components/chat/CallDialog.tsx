import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Avatar,
  Typography,
  IconButton,
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
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

const ACCENT = '#d97534';

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
  onToggleMute?: (muted: boolean) => void;
  onToggleVideo?: (videoOff: boolean) => void;
  duration?: number;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement>;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
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
  onToggleMute,
  onToggleVideo,
  duration = 0,
  localVideoRef: externalLocalRef,
  remoteVideoRef: externalRemoteRef,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === 'video');

  const internalLocalRef = useRef<HTMLVideoElement>(null);
  const internalRemoteRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = externalLocalRef || internalLocalRef;
  const remoteVideoRef = externalRemoteRef || internalRemoteRef;

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    onToggleMute?.(next);
  };

  const handleToggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    onToggleVideo?.(next);
  };

  const participantData = participant || { _id: 'unknown', firstName: 'Unknown', lastName: 'User', avatar: undefined };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStateText = (): string => {
    switch (callState) {
      case 'idle': return 'Ready to call';
      case 'outgoing': return 'Calling...';
      case 'incoming': return 'Incoming call';
      case 'connected': return formatDuration(duration);
      case 'ended': return 'Call ended';
      default: return '';
    }
  };

  const getCallStateColor = (): string => {
    switch (callState) {
      case 'idle': return '#aaa';
      case 'outgoing': return '#4facfe';
      case 'incoming': return '#51cf66';
      case 'connected': return '#51cf66';
      case 'ended': return '#ff6b6b';
      default: return '#aaa';
    }
  };

  const ctrlBtnSx = (active: boolean, danger?: boolean) => ({
    width: 60, height: 60,
    bgcolor: danger ? '#e53935' : active ? `${ACCENT}cc` : 'rgba(255,255,255,0.12)',
    color: '#fff',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${danger ? '#e5393588' : active ? `${ACCENT}66` : 'rgba(255,255,255,0.18)'}`,
    '&:hover': {
      bgcolor: danger ? '#c62828' : active ? ACCENT : 'rgba(255,255,255,0.22)',
      transform: 'scale(1.08)',
    },
    transition: 'all 0.2s',
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          background: callType === 'video' && callState === 'connected'
            ? 'linear-gradient(160deg, #0a0f1e 0%, #111827 60%, #1a2332 100%)'
            : 'linear-gradient(160deg, #0a0f1e 0%, #111827 50%, #1d2a42 100%)',
          color: '#e8dcc4',
        }
      }}
    >
      <DialogContent sx={{ p: 0, height: '100vh', position: 'relative', overflow: 'hidden' }}>

        {/* Ambient glow blobs */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          <Box sx={{ position: 'absolute', top: '-20%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}18 0%, transparent 70%)` }} />
          <Box sx={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,172,254,0.1) 0%, transparent 70%)' }} />
        </Box>

        {/* Video Call Layout */}
        {callType === 'video' && callState === 'connected' && (
          <Box sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
            />
            <Box
              onClick={() => setIsFullscreen(!isFullscreen)}
              sx={{ position: 'absolute', top: 20, right: 20, width: isFullscreen ? 120 : 180, height: isFullscreen ? 90 : 135, bgcolor: '#000', borderRadius: 2, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${ACCENT}55` }}
            >
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
            <Box sx={{ position: 'absolute', top: 20, left: 20, bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 2, border: `1px solid rgba(255,255,255,0.1)` }}>
              <Avatar src={participantData.avatar} sx={{ width: 40, height: 40, border: `2px solid ${ACCENT}` }}>
                {participantData.firstName?.[0]}{participantData.lastName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#e8dcc4', fontWeight: 600 }}>
                  {participantData.firstName} {participantData.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: getCallStateColor() }}>{getCallStateText()}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Voice / Non-connected Layout */}
        {(callType === 'voice' || callState !== 'connected') && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 4, position: 'relative', zIndex: 1 }}>
            {/* Pulse ring behind avatar */}
            <Box sx={{ position: 'relative', mb: 4 }}>
              {(callState === 'incoming' || callState === 'outgoing') && (
                <>
                  <Box sx={{ position: 'absolute', inset: -16, borderRadius: '50%', border: `2px solid ${ACCENT}44`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <Box sx={{ position: 'absolute', inset: -32, borderRadius: '50%', border: `2px solid ${ACCENT}22`, animation: 'pulse 1.5s ease-in-out 0.4s infinite' }} />
                  <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.06);opacity:0.6} }`}</style>
                </>
              )}
              <Avatar
                src={participantData.avatar}
                sx={{ width: 160, height: 160, bgcolor: `${ACCENT}33`, border: `4px solid ${ACCENT}66`, fontSize: '4rem' }}
              >
                {participantData.firstName?.[0]}{participantData.lastName?.[0]}
              </Avatar>
            </Box>

            <Typography variant="h4" sx={{ color: '#e8dcc4', fontWeight: 300, mb: 1 }}>
              {participantData.firstName} {participantData.lastName}
            </Typography>
            <Typography variant="h6" sx={{ color: getCallStateColor(), mb: 5, display: 'flex', alignItems: 'center', gap: 1 }}>
              {callState === 'outgoing' && <CircularProgress size={18} sx={{ color: getCallStateColor() }} />}
              {getCallStateText()}
            </Typography>

            {/* Incoming call action buttons */}
            {callState === 'incoming' && (
              <Box sx={{ display: 'flex', gap: 5, mb: 5 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <IconButton onClick={onDecline} sx={{ width: 70, height: 70, bgcolor: '#e53935', color: '#fff', '&:hover': { bgcolor: '#c62828', transform: 'scale(1.08)' }, transition: 'all 0.2s' }}>
                    <CallEnd sx={{ fontSize: 30 }} />
                  </IconButton>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(232,220,196,0.6)' }}>Decline</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <IconButton onClick={onAnswer} sx={{ width: 70, height: 70, bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20', transform: 'scale(1.08)' }, transition: 'all 0.2s' }}>
                    {callType === 'video' ? <Videocam sx={{ fontSize: 30 }} /> : <VolumeUp sx={{ fontSize: 30 }} />}
                  </IconButton>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(232,220,196,0.6)' }}>Answer</Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Call Controls Bar */}
        {(callState === 'connected' || callState === 'outgoing') && (
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', p: 3, display: 'flex', justifyContent: 'center', gap: 2.5, zIndex: 10 }}>
            <Box sx={{ textAlign: 'center' }}>
              <IconButton onClick={handleToggleMute} sx={ctrlBtnSx(isMuted, isMuted)}>
                {isMuted ? <MicOff /> : <Mic />}
              </IconButton>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(232,220,196,0.6)' }}>{isMuted ? 'Unmute' : 'Mute'}</Typography>
            </Box>

            {callType === 'video' && (
              <Box sx={{ textAlign: 'center' }}>
                <IconButton onClick={handleToggleVideo} sx={ctrlBtnSx(isVideoOff, isVideoOff)}>
                  {isVideoOff ? <VideocamOff /> : <Videocam />}
                </IconButton>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(232,220,196,0.6)' }}>{isVideoOff ? 'Start Video' : 'Stop Video'}</Typography>
              </Box>
            )}

            {callType === 'voice' && (
              <Box sx={{ textAlign: 'center' }}>
                <IconButton onClick={() => setIsSpeakerOn(!isSpeakerOn)} sx={ctrlBtnSx(isSpeakerOn)}>
                  {isSpeakerOn ? <VolumeUp /> : <VolumeOff />}
                </IconButton>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(232,220,196,0.6)' }}>Speaker</Typography>
              </Box>
            )}

            <Box sx={{ textAlign: 'center' }}>
              <IconButton onClick={onEndCall} sx={{ width: 60, height: 60, bgcolor: '#e53935', color: '#fff', '&:hover': { bgcolor: '#c62828', transform: 'scale(1.08)' }, transition: 'all 0.2s' }}>
                <CallEnd />
              </IconButton>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(232,220,196,0.6)' }}>End</Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CallDialog;
