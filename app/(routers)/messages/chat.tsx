import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";

import { AppText } from "@/src/ui/AppText";
import { Send, ChevronLeft, Phone } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSocket } from "@/src/contexts/SocketProvider";

interface Message {
  uuid: string;
  message: string;
  senderName: string;
  senderId: string;
  timestamp: string;
}

const ChatScreen = () => {
  const router = useRouter();
  const { socket } = useSocket();
  const flatListRef = useRef<FlatList>(null);

  const { uuid, senderId, senderName, receiverId, receiverName } =
    useLocalSearchParams<{
      uuid: string;
      senderId: string;
      senderName: string;
      receiverId: string;
      receiverName: string;
    }>();

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Fixed useEffect to handle Room Join, History Loading, and Real-time Receive
  useEffect(() => {
    if (!socket || !uuid) return;

    // 1. Join the specific chat room
    socket.emit("join_room", {
      uuid,
      fullName: senderName,
      userId: senderId,
    });

    // 2. Listen for the historical messages emitted by backend upon joining
    socket.on("load_messages", (history: Message[]) => {
      setMessages(history);
    });

    // 3. Listen for incoming real-time messages
    const handleReceiveMessage = (data: Message) => {
      setMessages((prev) => {
        // Deduplicate: Don't add if the message already exists (from optimistic update)
        if (prev.find((m) => m.uuid === data.uuid)) return prev;
        return [...prev, data];
      });
    };

    socket.on("receive_message", handleReceiveMessage);

    // Cleanup listeners on unmount
    return () => {
      socket.off("load_messages");
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, uuid]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !socket) return;

    // Generate a temporary unique ID for the optimistic update
    const messageId = Math.random().toString(36).substring(7);
    const messageData: Message = {
      uuid: messageId,
      message: inputText.trim(),
      senderName: senderName || "Me",
      senderId: senderId || "sender",
      timestamp: new Date().toISOString(),
    };

    // Optimistic Update: Add to UI immediately
    setMessages((prev) => [...prev, messageData]);

    // Emit message to backend
    socket.emit("send_message", {
      uuid: uuid, // The Room ID
      message: messageData.message,
      fullName: senderName,
      userId: senderId,
      receiverId: receiverId, // Used by backend for inbox logging
      messageUuid: messageId, // Send our unique ID to the backend
    });

    setInputText("");
  };

  const renderMessageItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = item.senderId === senderId;
      const time = new Date(item.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <View
          style={[
            styles.messageContainer,
            isMe ? styles.rightContainer : styles.leftContainer,
          ]}
        >
          <View
            style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}
          >
            <AppText
              style={[
                styles.messageText,
                isMe ? styles.myText : styles.theirText,
              ]}
            >
              {item.message}
            </AppText>
            <AppText
              style={[
                styles.timestamp,
                isMe ? styles.myTimestamp : styles.theirTimestamp,
              ]}
            >
              {time}
            </AppText>
          </View>
        </View>
      );
    },
    [senderId]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>

        <TouchableWithoutFeedback
          onPress={() => {
            if (receiverId) {
              router.push({
                pathname: "/(routers)/profile/profile",
                params: { id: receiverId }, // <-- Pass as param
              });
            }
          }}
        >
          <View style={styles.headerContent}>
            <AppText type="bold" style={styles.receiverName}>
              {receiverName || "Chat"}
            </AppText>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <AppText style={styles.statusText}>Active now</AppText>
            </View>
          </View>
        </TouchableWithoutFeedback>

        <TouchableOpacity
          onPress={() => console.log("Initiating call...")}
          style={styles.callButton}
        >
          <Phone size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.uuid}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
          >
            <Send size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: { padding: 4 },
  headerContent: { flex: 1, marginLeft: 12 },
  receiverName: { fontSize: 17, color: "#111827" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  statusText: { fontSize: 12, color: "#64748B" },
  callButton: { padding: 8 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 20 },
  messageContainer: { marginVertical: 4, maxWidth: "80%" },
  leftContainer: { alignSelf: "flex-start" },
  rightContainer: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myBubble: { backgroundColor: "#111827", borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#E2E8F0", borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  myText: { color: "#FFFFFF" },
  theirText: { color: "#1E293B" },
  timestamp: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  myTimestamp: { color: "rgba(255,255,255,0.6)" },
  theirTimestamp: { color: "#94A3B8" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginBottom: Platform.OS === "ios" ? 20 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    color: "#111827",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendBtnDisabled: { backgroundColor: "#CBD5E1" },
});

export default ChatScreen;
