// src/components/IncomingCallModal.tsx
import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { AppText } from "@/src/ui/AppText";
import { useSocket } from "@/src/contexts/SocketProvider";
import Svg, { Path } from "react-native-svg";

const PhoneIcon = ({ color = "#FFF", size = 28 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
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
  >
    <Path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
    <Path d="m2 2 20 20" />
  </Svg>
);

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall } = useSocket();

  if (!incomingCall) return null;

  return (
    <Modal visible={!!incomingCall} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.callerInfo}>
          {incomingCall.callerProfilePicture ? (
            <Image
              source={{ uri: incomingCall.callerProfilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText style={styles.avatarInitials} type="bold">
                {incomingCall.callerName?.charAt(0) || "U"}
              </AppText>
            </View>
          )}
          <AppText type="bold" style={styles.callerName}>
            {incomingCall.callerName}
          </AppText>
          <AppText style={styles.callType}>Incoming Audio Call...</AppText>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.declineBtn]}
            onPress={declineCall}
          >
            <PhoneOffIcon size={28} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn]}
            onPress={acceptCall}
          >
            <PhoneIcon size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 80,
  },
  callerInfo: {
    alignItems: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  avatarFallback: {
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 48,
    color: "#F8FAFC",
  },
  callerName: {
    fontSize: 26,
    color: "#FFF",
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    color: "#94A3B8",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: width * 0.7,
  },
  btn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  declineBtn: {
    backgroundColor: "#EF4444",
  },
  acceptBtn: {
    backgroundColor: "#10B981",
  },
});
