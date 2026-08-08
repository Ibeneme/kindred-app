import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Audio } from "expo-av";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  User as UserIcon,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react-native";

import { AppText } from "@/src/ui/AppText";
import { useSocket } from "@/src/contexts/SocketProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PRIMARY_YELLOW = "#FBBF24";
const PRIMARY_YELLOW_DARK = "#D97706";
const BG_DARK = "#0F172A"; // Dark slate for immersive calling
const CARD_DARK = "#1E293B";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function AudioCallScreen() {
  const router = useRouter();
  const { socket } = useSocket();
  const insets = useSafeAreaInsets();

  const {
    roomId,
    callerId,
    receiverId,
    receiverName,
    receiverProfilePicture,
    isCaller: isCallerParam,
  } = useLocalSearchParams<{
    roomId: string;
    callerId: string;
    receiverId: string;
    receiverName: string;
    receiverProfilePicture?: string;
    isCaller?: string;
  }>();

  const isCaller = isCallerParam === "true";

  // Call States
  const [callStatus, setCallStatus] = useState<
    "connecting" | "ringing" | "connected" | "ended"
  >("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // WebRTC & Audio Refs
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation Pulse for Ringing state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation controller
  useEffect(() => {
    if (callStatus === "ringing" || callStatus === "connecting") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [callStatus]);

  // Timer for active call duration
  useEffect(() => {
    if (callStatus === "connected") {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callStatus]);

  // --- WEBRTC & SOCKET SETUP ---

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
  }, []);

  const handleEndCall = useCallback(() => {
    setCallStatus("ended");
    socket?.emit("kookohor-end-call", { roomId, callerId, receiverId });
    cleanupCall();
    setTimeout(() => {
      if (router.canGoBack()) router.back();
    }, 1200);
  }, [socket, roomId, callerId, receiverId, cleanupCall, router]);

  useEffect(() => {
    if (!socket || !roomId) return;

    let isMounted = true;

    const initWebRTC = async () => {
      try {
        // Configure native audio mode for call
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true, // Default to earpiece
        });

        pc.current = new RTCPeerConnection(RTC_CONFIG);

        // Get Local Audio Stream
        const stream = (await mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })) as MediaStream;

        localStreamRef.current = stream;

        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.current?.addTrack(track, stream);
        });

        // Handle ICE Candidates
        pc.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("kookohor-ice-candidate", {
              candidate: event.candidate,
              roomId,
            });
          }
        };

        // Handle Connection State Change
        pc.current.onconnectionstatechange = () => {
          if (!pc.current) return;
          if (pc.current.connectionState === "connected") {
            if (isMounted) setCallStatus("connected");
          } else if (
            pc.current.connectionState === "failed" ||
            pc.current.connectionState === "disconnected"
          ) {
            handleEndCall();
          }
        };

        // Join room
        socket.emit("kookohor-join-room", { roomId, callerId, receiverId });
        if (isMounted) setCallStatus(isCaller ? "ringing" : "connecting");
      } catch (err) {
        console.error("WebRTC Initialization error:", err);
        handleEndCall();
      }
    };

    initWebRTC();

    // --- SOCKET EVENT HANDLERS ---

    const handleUserConnected = async () => {
      if (!isCaller || !pc.current) return;
      try {
        const offer = await pc.current.createOffer({});
        await pc.current.setLocalDescription(offer);
        socket.emit("kookohor-offer", { offer, roomId });
      } catch (err) {
        console.error("Error creating WebRTC offer:", err);
      }
    };

    const handleOffer = async ({
      offer,
    }: {
      offer: RTCSessionDescriptionInit;
    }) => {
      if (!pc.current) return;
      try {
        await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        socket.emit("kookohor-answer", { answer, roomId });
        setCallStatus("connected");
      } catch (err) {
        console.error("Error answering WebRTC offer:", err);
      }
    };

    const handleAnswer = async ({
      answer,
    }: {
      answer: RTCSessionDescriptionInit;
    }) => {
      if (!pc.current) return;
      try {
        await pc.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        setCallStatus("connected");
      } catch (err) {
        console.error("Error setting remote answer:", err);
      }
    };

    const handleIceCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      if (!pc.current || !candidate) return;
      try {
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE Candidate:", err);
      }
    };

    const handleCallEnded = () => {
      setCallStatus("ended");
      cleanupCall();
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 1000);
    };

    socket.on("kookohor-user-connected", handleUserConnected);
    socket.on("kookohor-offer", handleOffer);
    socket.on("kookohor-answer", handleAnswer);
    socket.on("kookohor-ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);

    return () => {
      isMounted = false;
      socket.off("kookohor-user-connected", handleUserConnected);
      socket.off("kookohor-offer", handleOffer);
      socket.off("kookohor-answer", handleAnswer);
      socket.off("kookohor-ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      cleanupCall();
    };
  }, [socket, roomId, isCaller, handleEndCall, cleanupCall]);

  // --- CONTROLS ---

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = async () => {
    try {
      const nextSpeakerState = !isSpeakerOn;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !nextSpeakerState,
      });
      setIsSpeakerOn(nextSpeakerState);
    } catch (err) {
      console.error("Speaker toggle failed:", err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          onPress={handleEndCall}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.encryptionPill}>
          <ShieldCheck size={14} color={PRIMARY_YELLOW} />
          <AppText style={styles.encryptionText}>End-to-End Encrypted</AppText>
        </View>
      </View>

      {/* Main Avatar & Status Section */}
      <View style={styles.centerContent}>
        <View style={styles.avatarWrapper}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.25],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
          <View style={styles.avatarBorder}>
            {receiverProfilePicture ? (
              <Image
                source={{ uri: receiverProfilePicture }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <UserIcon size={56} color="#94A3B8" />
              </View>
            )}
          </View>
        </View>

        <AppText type="bold" style={styles.receiverName}>
          {receiverName || "User"}
        </AppText>

        <AppText style={styles.statusText}>
          {callStatus === "connecting" && "Connecting..."}
          {callStatus === "ringing" && "Ringing..."}
          {callStatus === "connected" && formatDuration(callDuration)}
          {callStatus === "ended" && "Call Ended"}
        </AppText>
      </View>

      {/* Bottom Call Controls */}
      <View
        style={[
          styles.controlsContainer,
          { paddingBottom: Math.max(insets.bottom + 20, 30) },
        ]}
      >
        <View style={styles.controlsRow}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={toggleMute}
            activeOpacity={0.8}
            disabled={callStatus === "ended"}
          >
            {isMuted ? (
              <MicOff size={26} color="#EF4444" />
            ) : (
              <Mic size={26} color="#FFF" />
            )}
            <AppText style={styles.btnLabel}>
              {isMuted ? "Muted" : "Mute"}
            </AppText>
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={styles.endCallBtn}
            onPress={handleEndCall}
            activeOpacity={0.85}
          >
            <PhoneOff size={32} color="#FFF" />
          </TouchableOpacity>

          {/* Speaker Button */}
          <TouchableOpacity
            style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
            onPress={toggleSpeaker}
            activeOpacity={0.8}
            disabled={callStatus === "ended"}
          >
            {isSpeakerOn ? (
              <Volume2 size={26} color={PRIMARY_YELLOW} />
            ) : (
              <VolumeX size={26} color="#FFF" />
            )}
            <AppText style={styles.btnLabel}>
              {isSpeakerOn ? "Speaker" : "Earpiece"}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  encryptionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  encryptionText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "DMSansMedium",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  pulseRing: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: PRIMARY_YELLOW,
  },
  avatarBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: PRIMARY_YELLOW,
    overflow: "hidden",
    backgroundColor: CARD_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: CARD_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  receiverName: {
    fontSize: 24,
    color: "#FFF",
    marginBottom: 8,
    textAlign: "center",
  },
  statusText: {
    fontSize: 16,
    color: PRIMARY_YELLOW,
    fontFamily: "DMSansMedium",
  },
  controlsContainer: {
    paddingHorizontal: 30,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: CARD_DARK,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 40,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 65,
  },
  controlBtnActive: {
    opacity: 0.8,
  },
  btnLabel: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 6,
    fontFamily: "DMSansRegular",
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
