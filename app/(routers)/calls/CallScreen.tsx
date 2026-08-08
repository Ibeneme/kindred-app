import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import InCallManager from "react-native-incall-manager";
import Svg, { Path, Circle } from "react-native-svg";
import { AppText } from "@/src/ui/AppText";
import { Socket } from "socket.io-client";
import { useSocket } from "@/src/contexts/SocketProvider";

// --- SVG ICONS ---

const MicIcon = ({ color = "#FFF", size = 24 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Path d="M12 19v3" />
  </Svg>
);

const MicOffIcon = ({ color = "#FFF", size = 24 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="m2 2 20 20" />
    <Path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <Path d="M5 10v2a7 7 0 0 0 12 5.29" />
    <Path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <Path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <Path d="M12 19v3" />
  </Svg>
);

const Volume2Icon = ({ color = "#FFF", size = 24 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M11 5 L6 9 H2 v6 h4 l5 4 V5 z" />
    <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </Svg>
);

const PhoneOffIcon = ({ color = "#FFF", size = 28 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
    <Path d="m2 2 20 20" />
  </Svg>
);

const UserIcon = ({ color = "#94A3B8", size = 48 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <Circle cx={12} cy={7} r={4} />
  </Svg>
);

// --- WEBRTC CONFIG ---

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface AudioCallScreenProps {
  socket?: Socket | null;
  roomId: string;
  callerId: string;
  receiverId: string;
  receiverName: string;
  receiverProfilePicture?: string;
  isIncomingCall?: boolean;
  incomingOffer?: any;
  onCallEnd: () => void;
}

export default function AudioCallScreen({
  socket: propSocket,
  roomId,
  callerId,
  receiverId,
  receiverName,
  receiverProfilePicture,
  isIncomingCall = false,
  incomingOffer = null,
  onCallEnd,
}: AudioCallScreenProps) {
  // Extract socket from context hook (fallback to propSocket if provided)
  const { socket: contextSocket } = useSocket();
  const socket = propSocket || contextSocket;

  const [callStatus, setCallStatus] = useState<
    "connecting" | "connected" | "ended"
  >("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. CLEANUP UTILITY ---
  const terminateCall = useCallback(() => {
    console.log(
      "[AudioCallScreen] Terminating call setup & cleaning resources"
    );

    InCallManager.stop();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setCallStatus("ended");
    onCallEnd();
  }, [onCallEnd]);

  // --- 2. HANG UP ACTION ---
  const handleHangUp = useCallback(() => {
    console.log(
      `[AudioCallScreen] User explicitly ended call in room: ${roomId}`
    );
    if (socket) {
      socket.emit("kookohor-end-call", {
        roomId,
        callerId,
        receiverId,
      });
    }
    terminateCall();
  }, [socket, roomId, callerId, receiverId, terminateCall]);

  // --- 3. INIT AUDIO MEDIA & PEER CONNECTION ---
  const initAudioMedia = useCallback(async () => {
    console.log("[AudioCallScreen] Initializing audio-only WebRTC session...");

    // Stop any leftover ringtone and start ringback (for outgoing caller)
    InCallManager.stopRingtone();
    if (!isIncomingCall) {
      InCallManager.start({ media: "audio", ringback: "_BUNDLE_" });
    } else {
      InCallManager.start({ media: "audio" });
    }

    InCallManager.setKeepScreenOn(true);
    InCallManager.setSpeakerphoneOn(false);

    // Get Audio Stream Only
    const stream = (await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })) as MediaStream;

    localStreamRef.current = stream;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;

    // Add local audio track
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log("[AudioCallScreen] Remote stream track received");
      // Stop the caller's outgoing ringback sound
      InCallManager.stopRingback();
      setCallStatus("connected");

      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("kookohor-ice-candidate", event.candidate, roomId);
      }
    };

    return pc;
  }, [socket, roomId, isIncomingCall]);

  // --- 4. LIFECYCLE & SOCKET SIGNALLING ---
  useEffect(() => {
    if (!socket || !roomId) {
      console.error("[AudioCallScreen] Missing socket or roomId setup!");
      return;
    }

    let isMounted = true;

    const startCallPipeline = async () => {
      console.log(`[AudioCallScreen] Joining call room payload:`, {
        roomId,
        callerId,
        receiverId,
      });

      socket.emit("kookohor-join-room", {
        roomId,
        callerId,
        receiverId,
      });

      const pc = await initAudioMedia();

      if (isIncomingCall && incomingOffer) {
        console.log("[AudioCallScreen] Handling incoming offer call flow");
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("kookohor-answer", answer, roomId);
      }
    };

    startCallPipeline();

    // SOCKET LISTENERS
    const handleUserConnected = async (data: any) => {
      console.log("[AudioCallScreen] Socket user-connected received:", data);
      const pc = peerConnection.current;
      if (pc) {
        console.log("[AudioCallScreen] Creating outgoing call offer...");
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        const targetId = typeof data === "string" ? data : roomId;
        socket.emit("kookohor-offer", offer, targetId);
      }
    };

    const handleOffer = async (offer: any) => {
      console.log("[AudioCallScreen] Received offer event");
      const pc = peerConnection.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("kookohor-answer", answer, roomId);
      }
    };

    const handleAnswer = async (answer: any) => {
      console.log("[AudioCallScreen] Received answer event");
      const pc = peerConnection.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async (candidate: any) => {
      console.log("[AudioCallScreen] Received remote ICE candidate");
      const pc = peerConnection.current;
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleCallEnded = () => {
      console.log("[AudioCallScreen] Remote user ended the call");
      terminateCall();
    };

    socket.on("user-connected", handleUserConnected);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("user-disconnected", handleCallEnded);

    return () => {
      isMounted = false;
      socket.off("user-connected", handleUserConnected);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("user-disconnected", handleCallEnded);
    };
  }, [
    socket,
    roomId,
    callerId,
    receiverId,
    isIncomingCall,
    incomingOffer,
    initAudioMedia,
    terminateCall,
  ]);

  // --- CONTROLS ---
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log(
          `[AudioCallScreen] Audio track state: muted=${!audioTrack.enabled}`
        );
      }
    }
  };

  const toggleSpeaker = () => {
    const nextState = !isSpeakerOn;
    setIsSpeakerOn(nextState);
    InCallManager.setSpeakerphoneOn(nextState);
    console.log(`[AudioCallScreen] Speakerphone set to: ${nextState}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* CALL HEADER & METADATA */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {receiverProfilePicture ? (
            <Image
              source={{ uri: receiverProfilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <UserIcon color="#94A3B8" size={56} />
            </View>
          )}
        </View>

        <AppText type="bold" style={styles.name}>
          {receiverName || "User"}
        </AppText>

        <View style={styles.statusRow}>
          {callStatus === "connecting" ? (
            <View style={styles.connectingBox}>
              <ActivityIndicator
                color="#D97706"
                size="small"
                style={{ marginRight: 8 }}
              />
              <AppText style={styles.statusText}>Calling...</AppText>
            </View>
          ) : (
            <AppText style={styles.timerText}>
              {formatDuration(callDuration)}
            </AppText>
          )}
        </View>
      </View>

      {/* CONTROLS */}
      <View style={styles.controlsContainer}>
        {/* Mute Button */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={toggleMute}
        >
          {isMuted ? (
            <MicOffIcon size={24} color="#FFF" />
          ) : (
            <MicIcon size={24} color="#FFF" />
          )}
        </TouchableOpacity>

        {/* End Call Button */}
        <TouchableOpacity style={styles.endCallBtn} onPress={handleHangUp}>
          <PhoneOffIcon size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Speaker Button */}
        <TouchableOpacity
          style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
          onPress={toggleSpeaker}
        >
          <Volume2Icon size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  avatarContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "#D97706",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  statusRow: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  connectingBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    color: "#94A3B8",
  },
  timerText: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "600",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    width: width * 0.8,
    marginBottom: 30,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlBtnActive: {
    backgroundColor: "#EF4444",
  },
  endCallBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
