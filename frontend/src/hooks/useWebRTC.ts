import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface CallParticipant {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface UseWebRTCProps {
  roomId: string;
  userId: string;
  onCallStateChange: (state: 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended') => void;
}

export const useWebRTC = ({ roomId, userId, onCallStateChange }: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended'>('idle');
  const [currentCall, setCurrentCall] = useState<{
    type: 'voice' | 'video';
    participant: CallParticipant;
    isInitiator: boolean;
  } | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useSocket();

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = peerConnection;

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'connected') {
        setCallState('connected');
        onCallStateChange('connected');
        startCallTimer();
      } else if (state === 'disconnected' || state === 'failed') {
        endCall();
      }
    };

    return peerConnection;
  }, [roomId, socket, onCallStateChange]);

  // Get user media
  const getUserMedia = useCallback(async (video: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Start call timer
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Stop call timer
  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  // Initiate call
  const initiateCall = useCallback(async (
    participant: CallParticipant, 
    type: 'voice' | 'video'
  ) => {
    try {
      setCallState('outgoing');
      onCallStateChange('outgoing');
      setCurrentCall({ type, participant, isInitiator: true });

      const stream = await getUserMedia(type === 'video');
      const peerConnection = initializePeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send call offer via socket
      if (socket) {
        socket.emit('call:initiate', {
          roomId,
          type,
          offer,
          participant: participant._id,
        });
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      setCallState('ended');
      onCallStateChange('ended');
    }
  }, [roomId, socket, getUserMedia, initializePeerConnection, onCallStateChange]);

  // Answer call
  const answerCall = useCallback(async () => {
    if (!currentCall || !peerConnectionRef.current) return;

    try {
      const stream = await getUserMedia(currentCall.type === 'video');
      const peerConnection = peerConnectionRef.current;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer via socket
      if (socket) {
        socket.emit('call:answer', {
          roomId,
          answer,
        });
      }

      setCallState('connected');
      onCallStateChange('connected');
    } catch (error) {
      console.error('Error answering call:', error);
      endCall();
    }
  }, [currentCall, getUserMedia, roomId, socket, onCallStateChange]);

  // Decline call
  const declineCall = useCallback(() => {
    if (socket) {
      socket.emit('call:decline', { roomId });
    }
    endCall();
  }, [roomId, socket]);

  // End call
  const endCall = useCallback(() => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Clear remote stream
    setRemoteStream(null);

    // Stop call timer
    stopCallTimer();

    // Reset state
    setCallState('ended');
    onCallStateChange('ended');
    setCurrentCall(null);
    setCallDuration(0);

    // Notify via socket
    if (socket) {
      socket.emit('call:end', { roomId });
    }

    // Auto-close after a delay
    setTimeout(() => {
      setCallState('idle');
      onCallStateChange('idle');
    }, 2000);
  }, [localStream, roomId, socket, stopCallTimer, onCallStateChange]);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleCallReceive = (data: {
      type: 'voice' | 'video';
      offer: RTCSessionDescriptionInit;
      participant: CallParticipant;
    }) => {
      setCallState('incoming');
      onCallStateChange('incoming');
      setCurrentCall({ 
        type: data.type, 
        participant: data.participant, 
        isInitiator: false 
      });

      const peerConnection = initializePeerConnection();
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    };

    const handleCallAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    };

    const handleIceCandidate = (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    const handleCallDecline = () => {
      endCall();
    };

    const handleCallEnd = () => {
      endCall();
    };

    socket.on('call:receive', handleCallReceive);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:decline', handleCallDecline);
    socket.on('call:end', handleCallEnd);

    return () => {
      socket.off('call:receive', handleCallReceive);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:decline', handleCallDecline);
      socket.off('call:end', handleCallEnd);
    };
  }, [socket, initializePeerConnection, endCall, onCallStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    callState,
    currentCall,
    callDuration,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    initiateCall,
    answerCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
};