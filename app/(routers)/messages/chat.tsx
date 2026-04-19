import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Keyboard,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as FileSystemLegacy from "expo-file-system/legacy";

import { AppText } from "@/src/ui/AppText";
import {
  Send,
  ChevronLeft,
  Mic,
  Square,
  Play,
  User as UserIcon,
  Trash2,
  Pause,
  Plus,
  Image as ImageIcon,
  X,
  Check,
  CheckCheck,
  Clock,
  Edit,
  Video,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSocket } from "@/src/contexts/SocketProvider";

interface Message {
  uuid: string;
  message: string;
  senderName: string;
  senderId: string;
  timestamp: string;
  messageType?: "text" | "voice" | "image";
  imageuri?: string;
  audioUri?: string;
  duration?: number;
  status?: "pending" | "sent" | "failed" | "delivered";
  isRead?: boolean;
  canEdit?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EDIT_DELETE_WINDOW_MINUTES = 5;

const PRIMARY_YELLOW = "#FBBF24";
const PRIMARY_YELLOW_DARK = "#D97706";
const BG_COLOR = "#F8FAFC";
const GRAY = "#94A3B8";

const ChatScreen = () => {
  const router = useRouter();
  const { socket } = useSocket();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const prevMsgCount = useRef(0);

  const {
    uuid,
    senderId,
    senderName,
    receiverId,
    receiverName,
    receiverProfilePicture,
  } = useLocalSearchParams<{
    uuid: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    receiverProfilePicture?: string;
  }>();

  // Storage Keys
  const CHAT_STORAGE_KEY = `messages_${uuid}`;
  const INBOX_KEY = `last_msg_${receiverId}`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingName, setTypingName] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  // Audio/Media States
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isAudioBusy, setIsAudioBusy] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string>("");

  // Edit/Options States
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- PERSISTENCE HELPERS ---

  const saveToLocal = async (msgs: Message[]) => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs));
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        const summary = {
          receiverId,
          receiverName,
          receiverProfilePicture,
          lastMessage:
            last.messageType === "text"
              ? last.message
              : `[${last.messageType}]`,
          timestamp: last.timestamp,
        };
        await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(summary));
      }
    } catch (e) {
      console.error("Local save failed", e);
    }
  };

  const updateAndPersist = (updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      saveToLocal(next);
      return next;
    });
  };

  // --- INITIAL LOAD (AUTO-FOCUS LAST MESSAGE) ---

  useEffect(() => {
    (async () => {
      const cached = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        prevMsgCount.current = parsed.length;
        setMessages(parsed);
      }

      // Audio Permissions
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status === "granted") {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 2,
            playThroughEarpieceAndroid: false,
          });
        }
      } catch (err) {
        console.error("Audio setup error:", err);
      }
    })();
  }, [uuid]);

  // Handle scrolling ONLY on new messages
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      // It's a new message, scroll with animation
      flatListRef.current?.scrollToEnd({ animated: true });
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  // --- SOCKET LOGIC ---

  useEffect(() => {
    if (!socket || !uuid) return;

    socket.emit("join_room", { uuid, fullName: senderName, userId: senderId });

    socket.on("load_messages", (history: any[]) => {
      const now = Date.now();
      const processed: Message[] = history.map((m) => ({
        ...m,
        uuid: m.messageUuid || m.uuid,
        imageuri:
          m.messageType === "image" ? m.imageuri || m.mediaUri : undefined,
        audioUri:
          m.messageType === "voice" ? m.audioUri || m.mediaUri : undefined,
        status: "sent",
        canEdit:
          m.senderId === senderId &&
          (now - new Date(m.timestamp).getTime()) / 60000 <=
            EDIT_DELETE_WINDOW_MINUTES,
      }));
      updateAndPersist(() => processed);
    });

    socket.on("receive_message", (data: any) => {
      updateAndPersist((prev) => {
        const targetUuid = data.messageUuid || data.uuid;
        const exists = prev.some((m) => m.uuid === targetUuid);
        if (exists) {
          return prev.map((m) =>
            m.uuid === targetUuid ? { ...m, ...data, status: "sent" } : m
          );
        }
        return [...prev, { ...data, uuid: targetUuid, status: "sent" }];
      });
    });

    socket.on("message_deleted", ({ uuid: msgUuid }: any) => {
      updateAndPersist((prev) => prev.filter((m) => m.uuid !== msgUuid));
    });

    socket.on("user_typing", (data: any) => {
      if (data.roomUuid !== uuid) return;
      setIsOtherUserTyping(data.isTyping);
      setTypingName(data.name || "Someone");
    });

    return () => {
      socket.off("load_messages");
      socket.off("receive_message");
      socket.off("message_deleted");
      socket.off("user_typing");
    };
  }, [socket, uuid]);

  // --- ACTION HANDLERS ---

  const handleSendOrEditMessage = () => {
    if (!socket) return;
    if (editingMessageId) {
      if (!editText.trim()) return;
      socket.emit("edit_message", {
        uuid,
        messageUuid: editingMessageId,
        newMessage: editText.trim(),
        userId: senderId,
      });
      updateAndPersist((prev) =>
        prev.map((m) =>
          m.uuid === editingMessageId ? { ...m, message: editText.trim() } : m
        )
      );
      setEditingMessageId(null);
      setEditText("");
    } else {
      if (!inputText.trim()) return;
      const msgUuid = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const optimisticMsg: Message = {
        uuid: msgUuid,
        message: inputText.trim(),
        senderName: senderName || "You",
        senderId: senderId!,
        timestamp: new Date().toISOString(),
        messageType: "text",
        status: "pending",
        canEdit: true,
      };
      updateAndPersist((prev) => [...prev, optimisticMsg]);
      socket.emit("send_message", {
        uuid,
        message: inputText.trim(),
        fullName: senderName,
        userId: senderId,
        receiverId,
        messageUuid: msgUuid,
        messageType: "text",
        receiverProfilePicture: receiverProfilePicture || "",
      });
      setInputText("");
    }
  };

  const fileToBase64 = async (uri: string): Promise<string> => {
    return await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;
      setRecording(null);
      setPreviewUri(null);
      setRecordDuration(0);
      const newRec = new Audio.Recording();
      await newRec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRec.startAsync();
      setRecording(newRec);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(
        () => setRecordDuration((p) => p + 1),
        1000
      );
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) setPreviewUri(uri);
    } catch (err) {
      console.error(err);
    }
  };

  const sendVoiceNote = async () => {
    if (!previewUri || !socket) return;
    const msgUuid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticMsg: Message = {
      uuid: msgUuid,
      message: "",
      senderName: senderName || "You",
      senderId: senderId!,
      timestamp: new Date().toISOString(),
      messageType: "voice",
      audioUri: previewUri,
      duration: recordDuration,
      status: "pending",
    };
    updateAndPersist((p) => [...p, optimisticMsg]);
    try {
      const base64 = await fileToBase64(previewUri);
      socket.emit("send_message", {
        uuid,
        fullName: senderName,
        userId: senderId,
        receiverId,
        messageUuid: msgUuid,
        messageType: "voice",
        mediaUri: `data:audio/m4a;base64,${base64}`,
        duration: recordDuration,
      });
      setPreviewUri(null);
    } catch (err) {
      updateAndPersist((p) =>
        p.map((m) => (m.uuid === msgUuid ? { ...m, status: "failed" } : m))
      );
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const { uri, base64 } = result.assets[0];
    const msgUuid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticMsg: Message = {
      uuid: msgUuid,
      message: "",
      senderName: senderName || "You",
      senderId: senderId!,
      timestamp: new Date().toISOString(),
      messageType: "image",
      imageuri: uri,
      status: "pending",
    };
    updateAndPersist((p) => [...p, optimisticMsg]);
    setShowOptions(false);
    socket?.emit("send_message", {
      uuid,
      fullName: senderName,
      userId: senderId,
      receiverId,
      messageUuid: msgUuid,
      messageType: "image",
      mediaUri: `data:image/jpeg;base64,${base64}`,
    });
  };

  const handleToggleAudioPlayback = async (
    uri: string,
    messageUuid: string
  ) => {
    if (isAudioBusy) return;
    try {
      setIsAudioBusy(true);
      if (playingId === messageUuid) {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingId(null);
        return;
      }
      if (soundRef.current)
        await soundRef.current.unloadAsync().catch(() => {});
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (s) => {
          if (s.isLoaded && s.didJustFinish) setPlayingId(null);
        }
      );
      soundRef.current = sound;
      setPlayingId(messageUuid);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAudioBusy(false);
    }
  };

  // --- RENDER ITEM ---

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
            styles.msgWrapper,
            isMe ? styles.myMsgWrapper : styles.theirMsgWrapper,
          ]}
        >
          <Pressable
            onLongPress={() =>
              isMe && (setSelectedMessage(item), setMessageOptionsVisible(true))
            }
            style={[
              styles.bubble,
              isMe ? styles.myBubble : styles.theirBubble,
              item.messageType === "image" && styles.imageBubble,
            ]}
          >
            {item.messageType === "image" && item.imageuri && (
              <TouchableOpacity
                onPress={() => {
                  setCurrentImageUri(item.imageuri!);
                  setImageViewerVisible(true);
                }}
              >
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: item.imageuri }}
                    style={styles.messageImage}
                    contentFit="cover"
                  />
                  {item.status === "pending" && (
                    <View style={styles.pendingOverlay}>
                      <ActivityIndicator color="#FFF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            {item.messageType === "voice" &&
              (item.audioUri || item.status === "pending") && (
                <TouchableOpacity
                  style={styles.voiceRow}
                  disabled={item.status === "pending"}
                  onPress={() =>
                    handleToggleAudioPlayback(item.audioUri!, item.uuid)
                  }
                >
                  <View
                    style={[
                      styles.playBtnCircle,
                      {
                        backgroundColor: isMe
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(0,0,0,0.05)",
                      },
                    ]}
                  >
                    {playingId === item.uuid ? (
                      <Pause
                        size={20}
                        color={isMe ? "#FFF" : PRIMARY_YELLOW_DARK}
                        fill={isMe ? "#FFF" : PRIMARY_YELLOW_DARK}
                      />
                    ) : (
                      <Play
                        size={20}
                        color={isMe ? "#FFF" : PRIMARY_YELLOW_DARK}
                        fill={isMe ? "#FFF" : PRIMARY_YELLOW_DARK}
                      />
                    )}
                  </View>
                  <View style={styles.voiceMeta}>
                    <AppText
                      style={[
                        styles.voiceLabel,
                        { color: isMe ? "#FFF" : "#1E293B" },
                      ]}
                    >
                      {item.status === "pending"
                        ? "Uploading..."
                        : "Voice Note"}
                    </AppText>
                    <AppText
                      style={[
                        styles.voiceDuration,
                        { color: isMe ? "rgba(255,255,255,0.7)" : "#64748B" },
                      ]}
                    >
                      {Math.floor((item.duration || 0) / 60)}:
                      {(item.duration || 0) % 60}
                    </AppText>
                  </View>
                </TouchableOpacity>
              )}
            {item.messageType === "text" && (
              <AppText
                style={[
                  styles.messageText,
                  isMe ? styles.myText : styles.theirText,
                ]}
              >
                {item.message}
              </AppText>
            )}
            <View style={styles.bubbleFooter}>
              <AppText
                style={[
                  styles.msgTime,
                  { color: isMe ? "rgba(255,255,255,0.7)" : "#94A3B8" },
                ]}
              >
                {time}
              </AppText>
              {isMe && (
                <View style={styles.statusIcon}>
                  {item.status === "pending" ? (
                    <Clock size={12} color="rgba(255,255,255,0.7)" />
                  ) : item.isRead ? (
                    <CheckCheck size={14} color="#FFF" />
                  ) : (
                    <Check size={14} color="rgba(255,255,255,0.7)" />
                  )}
                </View>
              )}
            </View>
          </Pressable>
        </View>
      );
    },
    [senderId, playingId, isAudioBusy]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
        >
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() =>
            router.push({
              pathname: "/profile/profile",
              params: { id: receiverId },
            })
          }
        >
          <View style={styles.avatarBox}>
            {receiverProfilePicture ? (
              <Image
                source={{ uri: receiverProfilePicture }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <UserIcon size={18} color={GRAY} />
              </View>
            )}
            <View style={styles.onlineStatus} />
          </View>
          <View style={styles.nameContainer}>
            <AppText type="bold" style={styles.receiverName}>
              {receiverName || "Chat"}
            </AppText>
            {isOtherUserTyping ? (
              <AppText style={styles.typingText}>
                {typingName} is typing...
              </AppText>
            ) : (
              <AppText style={styles.onlineSub}>Online</AppText>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Video size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 60 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(m) => m.uuid}
          contentContainerStyle={styles.messagesList}
          // FIX: In-built scroll focus
          initialNumToRender={messages.length > 0 ? messages.length : 15}
          onContentSizeChange={() => {
            // No auto-scroll on change, we handle it via the useEffect
          }}
          // Ensures the screen starts at bottom without animation
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.bottomWrapper}>
          {showOptions && (
            <View style={styles.optionsPopup}>
              <TouchableOpacity
                style={styles.optionPill}
                onPress={handlePickImage}
              >
                <View
                  style={[styles.optionRound, { backgroundColor: "#EFF6FF" }]}
                >
                  <ImageIcon color="#3B82F6" size={20} />
                </View>
                <AppText style={styles.optionLabel}>Gallery</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionPill}
                onPress={startRecording}
              >
                <View
                  style={[styles.optionRound, { backgroundColor: "#ECFDF5" }]}
                >
                  <Mic color="#10B981" size={20} />
                </View>
                <AppText style={styles.optionLabel}>Voice</AppText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBarWrapper}>
            {isRecording ? (
              <View style={styles.recordingPanel}>
                <View style={styles.recLeft}>
                  <View style={styles.pulseDot} />
                  <AppText style={styles.recTime}>{recordDuration}s</AppText>
                </View>
                <AppText style={styles.recHint}>Recording...</AppText>
                <TouchableOpacity
                  onPress={stopRecording}
                  style={styles.stopRecCircle}
                >
                  <Square size={16} color="#FFF" fill="#FFF" />
                </TouchableOpacity>
              </View>
            ) : previewUri ? (
              <View style={styles.previewPanel}>
                <TouchableOpacity onPress={() => setPreviewUri(null)}>
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
                <AppText style={styles.previewText}>Voice Note Ready</AppText>
                <TouchableOpacity
                  onPress={sendVoiceNote}
                  style={styles.sendFab}
                >
                  <Send size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.textInputRow}>
                <TouchableOpacity
                  onPress={() => {
                    setShowOptions(!showOptions);
                    Keyboard.dismiss();
                  }}
                  style={styles.attachBtn}
                >
                  <Plus
                    size={24}
                    color={showOptions ? PRIMARY_YELLOW_DARK : GRAY}
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.mainInput}
                  placeholder="Type something..."
                  value={editingMessageId ? editText : inputText}
                  onChangeText={(t) =>
                    editingMessageId ? setEditText(t) : setInputText(t)
                  }
                  multiline
                />
                <TouchableOpacity
                  onPress={handleSendOrEditMessage}
                  style={styles.sendFab}
                >
                  <Send size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <Modal visible={imageViewerVisible} transparent animationType="fade">
        <View style={styles.fullScreenImg}>
          <TouchableOpacity
            style={styles.fullScreenClose}
            onPress={() => setImageViewerVisible(false)}
          >
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: currentImageUri }}
            style={styles.fullImage}
            contentFit="contain"
          />
        </View>
      </Modal>

      <Modal visible={messageOptionsVisible} transparent animationType="slide">
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setMessageOptionsVisible(false)}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                updateAndPersist((p) =>
                  p.filter((m) => m.uuid !== selectedMessage?.uuid)
                );
                setMessageOptionsVisible(false);
              }}
            >
              <Trash2 size={20} color="#EF4444" />
              <AppText style={{ color: "#EF4444", marginLeft: 10 }}>
                Delete Message
              </AppText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG_COLOR },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIconBtn: { padding: 8, borderRadius: 12, backgroundColor: "#F8FAFC" },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  avatarBox: { position: "relative" },
  avatar: { width: 40, height: 40, borderRadius: 14 },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  onlineStatus: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  nameContainer: { marginLeft: 10 },
  receiverName: { fontSize: 16, color: "#1E293B" },
  onlineSub: { fontSize: 11, color: "#10B981" },
  typingText: { fontSize: 11, color: PRIMARY_YELLOW_DARK },
  messagesList: { paddingHorizontal: 16, paddingVertical: 20 },
  msgWrapper: { marginBottom: 12, maxWidth: "80%" },
  myMsgWrapper: { alignSelf: "flex-end" },
  theirMsgWrapper: { alignSelf: "flex-start" },
  bubble: { padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: PRIMARY_YELLOW, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#FFF", borderBottomLeftRadius: 4 },
  imageBubble: { padding: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  myText: { color: "#FFF" },
  theirText: { color: "#1E293B" },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  msgTime: { fontSize: 10 },
  statusIcon: { marginLeft: 2 },
  imageWrapper: { borderRadius: 16, overflow: "hidden" },
  messageImage: { width: SCREEN_WIDTH * 0.65, height: 200 },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceRow: { flexDirection: "row", alignItems: "center", minWidth: 150 },
  playBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceMeta: { marginLeft: 10, flex: 1 },
  voiceLabel: { fontSize: 14, fontWeight: "600" },
  voiceDuration: { fontSize: 11 },
  bottomWrapper: { backgroundColor: "#FFF" },
  optionsPopup: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 15,
    position: "absolute",
    top: -85,
    left: 10,
    right: 10,
    borderRadius: 20,
    elevation: 10,
    justifyContent: "space-around",
  },
  optionPill: { alignItems: "center" },
  optionRound: {
    width: 45,
    height: 45,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  optionLabel: { fontSize: 11, color: "#64748B" },
  inputBarWrapper: { padding: 10, paddingHorizontal: 16 },
  textInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachBtn: { padding: 10 },
  mainInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  sendFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_YELLOW_DARK,
    justifyContent: "center",
    alignItems: "center",
    margin: 4,
  },
  recordingPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderRadius: 25,
    padding: 6,
    paddingHorizontal: 15,
  },
  recLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  recTime: { color: "#EF4444", fontWeight: "700" },
  recHint: { color: "#EF4444", fontSize: 12 },
  stopRecCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  previewPanel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 25,
    padding: 6,
    paddingHorizontal: 15,
    gap: 15,
  },
  previewText: { color: "#166534", fontWeight: "700", flex: 1 },
  fullScreenImg: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  fullScreenClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 20,
  },
  fullImage: { width: SCREEN_WIDTH, height: "80%" },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
});

export default ChatScreen;
