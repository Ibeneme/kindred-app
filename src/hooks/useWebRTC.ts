// src/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from "react";
import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    mediaDevices,
    MediaStream,
} from "react-native-webrtc";
import InCallManager from "react-native-incall-manager";
import { useSocket } from "@/src/contexts/SocketProvider";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

export const useWebRTC = (roomId: string) => {
    const { socket } = useSocket();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    const pc = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (!socket || !roomId) return;

        let isMounted = true;

        const setupCall = async () => {
            InCallManager.start({ media: "video" });
            InCallManager.setKeepScreenOn(true);

            // Get local stream
            const stream = (await mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: "user" },
            })) as MediaStream;

            if (!isMounted) return;
            setLocalStream(stream);
            localStreamRef.current = stream;

            // Join room via existing socket connection
            socket.emit("kookohor-join-room", roomId);

            // Initialize RTCPeerConnection
            pc.current = new RTCPeerConnection(ICE_SERVERS);

            // Add local tracks to peer connection
            stream.getTracks().forEach((track) => {
                pc.current?.addTrack(track, stream);
            });

            // Handle remote media stream
            pc.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            // Handle ICE Candidate generation
            pc.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("kookohor-ice-candidate", event.candidate, roomId);
                }
            };
        };

        setupCall();

        // Socket Event Handlers matching server
        socket.on("user-connected", async (targetId: string) => {
            if (!pc.current) return;
            const offer = await pc.current.createOffer({});
            await pc.current.setLocalDescription(offer);
            socket.emit("kookohor-offer", offer, targetId);
        });

        socket.on("offer", async (offer: any, targetId: string) => {
            if (!pc.current) return;
            await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            socket.emit("kookohor-answer", answer, targetId);
        });

        socket.on("answer", async (answer: any) => {
            if (!pc.current) return;
            await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on("ice-candidate", async (candidate: any) => {
            if (!pc.current || !candidate) return;
            await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on("user-disconnected", () => {
            setRemoteStream(null);
        });

        return () => {
            isMounted = false;
            socket.emit("kookohor-disconnect");
            socket.off("user-connected");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("user-disconnected");

            if (pc.current) {
                pc.current.close();
                pc.current = null;
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            InCallManager.stop();
        };
    }, [socket, roomId]);

    const toggleMuteAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleMuteVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoMuted(!videoTrack.enabled);
            }
        }
    };

    return {
        localStream,
        remoteStream,
        isAudioMuted,
        isVideoMuted,
        toggleMuteAudio,
        toggleMuteVideo,
    };
};