// import React, { useEffect, useRef, useState } from "react";
// import {
//   RTCPeerConnection,
//   RTCSessionDescription,
//   RTCIceCandidate,
//   mediaDevices,
//   RTCView,
// } from "react-native-webrtc";
// import { useSocket } from "@/src/contexts/SocketProvider";

// const configuration = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

// export default function AudioCall({
//   remoteUserId,
//   isCaller,
// }: {
//   remoteUserId: string;
//   isCaller: boolean;
// }) {
//   const { socket } = useSocket();
//   const pc = useRef<RTCPeerConnection>(new RTCPeerConnection(configuration));
//   const [localStream, setLocalStream] = useState<any>(null);
//   const [remoteStream, setRemoteStream] = useState<any>(null);

//   useEffect(() => {
//     setupCall();

//     // Listen for signaling from server
//     socket.on("incoming_call", async ({ offer }) => {
//       await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
//       const answer = await pc.current.createAnswer();
//       await pc.current.setLocalDescription(answer);
//       socket.emit("answer_call", { to: remoteUserId, answer });
//     });

//     socket.on("call_answered", async ({ answer }) => {
//       await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
//     });

//     socket.on("ice_candidate", async ({ candidate }) => {
//       await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
//     });

//     return () => {
//       pc.current.close();
//       socket.off("incoming_call");
//     };
//   }, []);

//   const setupCall = async () => {
//     // 1. Get Microphone Access
//     const stream = await mediaDevices.getUserMedia({
//       audio: true,
//       video: false,
//     });
//     setLocalStream(stream);
//     stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));

//     // 2. Handle Remote Stream
//     pc.current.ontrack = (event) => {
//       setRemoteStream(event.streams[0]);
//     };

//     // 3. Handle ICE Candidates
//     pc.current.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.emit("ice_candidate", {
//           to: remoteUserId,
//           candidate: event.candidate,
//         });
//       }
//     };

//     // 4. If I am the one starting the call
//     if (isCaller) {
//       const offer = await pc.current.createOffer({});
//       await pc.current.setLocalDescription(offer);
//       socket.emit("start_call", { to: remoteUserId, offer });
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <AppText type="bold">{isCaller ? "Calling..." : "In Call"}</AppText>
//       {/* WebRTC handles the audio routing automatically once the streams are connected. 
//          You don't need a <Video> tag for audio-only.
//        */}
//       <TouchableOpacity
//         onPress={() => socket.emit("end_call", { to: remoteUserId })}
//       >
//         <View style={styles.hangupBtn}>
//           <PhoneOff color="white" />
//         </View>
//       </TouchableOpacity>
//     </View>
//   );
// }
