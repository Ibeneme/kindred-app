import React, { useEffect, useState, useRef } from "react";
import { View, TouchableOpacity, Alert } from "react-native";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from "react-native-webrtc";
import { Phone, PhoneOff } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import socket from "@/src/utils/socket"; // Your socket instance

const AudioCall = ({ receiverId, userId, userName }: any) => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [isCalling, setIsCalling] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);

  // Configuration for Google STUN servers (allows connection through firewalls)
  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    // Listen for incoming signals
    socket.on(`incoming_call_${userId}`, async (data) => {
      Alert.alert("Incoming Call", `Call from ${data.fromName}`, [
        {
          text: "Decline",
          onPress: () => socket.emit("end_call", { to: data.from }),
        },
        { text: "Answer", onPress: () => handleAnswer(data) },
      ]);
    });

    socket.on(`call_accepted_${userId}`, async (data) => {
      await pc.current?.setRemoteDescription(
        new RTCSessionDescription(data.signal)
      );
    });

    socket.on(`ice_candidate_${userId}`, async (data) => {
      if (data.candidate) {
        await pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      socket.off(`incoming_call_${userId}`);
      socket.off(`call_accepted_${userId}`);
      socket.off(`ice_candidate_${userId}`);
    };
  }, []);

  const startLocalStream = async () => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    setLocalStream(stream);
    return stream;
  };

  const setupPeerConnection = async (stream: any) => {
    pc.current = new RTCPeerConnection(configuration);

    stream
      .getTracks()
      .forEach((track: any) => pc.current?.addTrack(track, stream));

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", {
          to: receiverId,
          candidate: event.candidate,
        });
      }
    };
  };

  const handleStartCall = async () => {
    setIsCalling(true);
    const stream = await startLocalStream();
    await setupPeerConnection(stream);

    const offer = await pc.current?.createOffer({});
    await pc.current?.setLocalDescription(offer);

    socket.emit("call_user", {
      userToCall: receiverId,
      signalData: offer,
      from: userId,
      fromName: userName,
    });
  };

  const handleAnswer = async (data: any) => {
    const stream = await startLocalStream();
    await setupPeerConnection(stream);

    await pc.current?.setRemoteDescription(
      new RTCSessionDescription(data.signal)
    );
    const answer = await pc.current?.createAnswer();
    await pc.current?.setLocalDescription(answer);

    socket.emit("answer_call", { to: data.from, signal: answer });
  };

  return (
    <View style={{ alignItems: "center", padding: 20 }}>
      {!isCalling ? (
        <TouchableOpacity
          onPress={handleStartCall}
          style={{ backgroundColor: "#10B981", padding: 15, borderRadius: 50 }}
        >
          <Phone color="#FFF" size={30} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => setIsCalling(false)}
          style={{ backgroundColor: "#EF4444", padding: 15, borderRadius: 50 }}
        >
          <PhoneOff color="#FFF" size={30} />
        </TouchableOpacity>
      )}
      <AppText style={{ marginTop: 10 }}>
        {isCalling ? "In Call..." : "Call Family Member"}
      </AppText>
    </View>
  );
};

export default AudioCall;
