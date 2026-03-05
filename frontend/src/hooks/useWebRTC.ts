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
  const callRoomIdRef = useRef<string>('');   // room used for the active call's signaling
  const callIdRef = useRef<string>('');        // callId from backend, needed for call:answer
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]); // ICE candidates buffered before remoteDescription is set
  const { socket } = useSocket();

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    // Build ICE servers — STUN for peer-to-peer, TURN for NAT traversal
    const iceServerList: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
    ];

    // Use custom TURN server from env vars if provided (required for most production scenarios)
    const turnUrl = process.env.REACT_APP_TURN_URL;
    const turnUser = process.env.REACT_APP_TURN_USERNAME;
    const turnCred = process.env.REACT_APP_TURN_CREDENTIAL;
    if (turnUrl && turnUser && turnCred) {
      iceServerList.push({
        urls: [turnUrl, turnUrl.replace('turn:', 'turns:')],
        username: turnUser,
        credential: turnCred,
      });
    }

    const iceServers = { iceServers: iceServerList };

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

    // Handle ICE candidates — use callRoomIdRef.current so both caller and callee
    // always signal on the same room regardless of which chat room is selected
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          roomId: callRoomIdRef.current || roomId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('WebRTC connection state:', state);
      if (state === 'connected') {
        setCallState('connected');
        onCallStateChange('connected');
      } else if (state === 'failed' || state === 'closed') {
        setCallState('ended');
        onCallStateChange('ended');
        setTimeout(() => { setCallState('idle'); onCallStateChange('idle'); }, 2000);
      }
    };

    return peerConnection;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Auto-start/stop timer based on call state
  useEffect(() => {
    if (callState === 'connected') {
      startCallTimer();
    } else if (callState === 'ended' || callState === 'idle') {
      stopCallTimer();
    }
  }, [callState, startCallTimer, stopCallTimer]);

  // Initiate call
  const initiateCall = useCallback(async (
    participant: CallParticipant, 
    type: 'voice' | 'video'
  ) => {
    try {
      callRoomIdRef.current = roomId;
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

      // Use the room from the incoming call's signaling channel
      const signalingRoomId = callRoomIdRef.current || roomId;

      // Send answer via socket — include callId so backend can update call history
      if (socket) {
        socket.emit('call:answer', {
          roomId: signalingRoomId,
          answer,
          callId: callIdRef.current || undefined,
        });
      }

      // NOTE: do NOT set 'connected' here — wait for onconnectionstatechange
      // to fire so the UI reflects the actual peer connection state.
    } catch (error) {
      console.error('Error answering call:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCall, getUserMedia, roomId, socket]);

  // Decline call
  const declineCall = useCallback(() => {
    if (socket) {
      socket.emit('call:decline', { roomId: callRoomIdRef.current || roomId });
    }
    // endCall will be called separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      socket.emit('call:end', {
        roomId: callRoomIdRef.current || roomId,
        callId: callIdRef.current || undefined,
      });
    }

    // Reset call refs
    callRoomIdRef.current = '';
    callIdRef.current = '';
    pendingCandidatesRef.current = [];

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

    const handleCallReceive = async (data: {
      type: 'voice' | 'video';
      offer: RTCSessionDescriptionInit;
      from?: string;
      fromName?: string;
      fromAvatar?: string;
      participant?: CallParticipant;
      roomId?: string;
      callId?: string;
    }) => {
      // Normalise participant from backend shape
      const participant: CallParticipant = data.participant || {
        _id: data.from || 'unknown',
        firstName: data.fromName?.split(' ')[0] || 'Unknown',
        lastName: data.fromName?.split(' ').slice(1).join(' ') || '',
        avatar: data.fromAvatar,
      };

      // Store signaling room & callId for use in answer/ICE/decline/end
      if (data.roomId) {
        callRoomIdRef.current = data.roomId;
        // CRITICAL: callee must join the signaling room so ICE candidates
        // emitted by the caller (socket.to(roomId)) reach the callee.
        socket.emit('join_room', { roomId: data.roomId });
      }
      if (data.callId) {
        callIdRef.current = data.callId;
      }

      // Clear any stale buffered candidates from a previous call
      pendingCandidatesRef.current = [];

      setCallState('incoming');
      onCallStateChange('incoming');
      setCurrentCall({
        type: data.type,
        participant,
        isInitiator: false,
      });

      const peerConnection = initializePeerConnection();
      // MUST await before adding ICE candidates
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      // Flush any ICE candidates that arrived during the join_room / setRemoteDescription gap
      for (const c of pendingCandidatesRef.current) {
        try { await peerConnection.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
      }
      pendingCandidatesRef.current = [];
    };

    const handleCallAnswer = async (data: { answer: RTCSessionDescriptionInit; callId?: string }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      // MUST await before adding ICE candidates
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      // Flush buffered ICE candidates from callee that arrived before answer
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
      }
      pendingCandidatesRef.current = [];
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      // Buffer candidates until remoteDescription is set to avoid InvalidStateError
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
      } else {
        pendingCandidatesRef.current.push(data.candidate);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, initializePeerConnection, onCallStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup logic
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
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