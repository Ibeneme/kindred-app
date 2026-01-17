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
} from "react-native";
import { Image } from "expo-image";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";

// Use legacy filesystem API
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
const MAX_IMAGE_SIZE_MB = 25;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const EDIT_DELETE_WINDOW_MINUTES = 5;

const PRIMARY_YELLOW = "#FBBF24";
const PRIMARY_YELLOW_DARK = "#F59E0B";
const GRAY = "#6B7280";

const ChatScreen = () => {
  const router = useRouter();
  const { socket } = useSocket();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingName, setTypingName] = useState("");

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

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  // Voice states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Chat playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Image viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string>("");

  // Editing
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Options modal
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, []);

  // Configure Audio
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") return;
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: 1,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 2,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.error("Audio mode setup failed:", err);
      }
    })();
  }, []);

  const fileToBase64 = async (uri: string): Promise<string> => {
    return await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
  };

  // Socket logic
  useEffect(() => {
    if (!socket || !uuid) return;

    socket.emit("join_room", {
      uuid,
      fullName: senderName,
      userId: senderId,
    });

    socket.on("load_messages", (history: any[]) => {
      const now = Date.now();
      const processed = history.map((m) => {
        const msgTime = new Date(m.timestamp).getTime();
        const minutesDiff = (now - msgTime) / 60000;
        return {
          ...m,
          status: "sent",
          canEdit:
            m.senderId === senderId &&
            minutesDiff <= EDIT_DELETE_WINDOW_MINUTES,
        };
      });
      setMessages(processed);
      scrollToBottom();
    });

    socket.on("user_typing", (data: any) => {
      if (data.roomUuid !== uuid) return;
      if (data.isTyping) {
        setIsOtherUserTyping(true);
        setTypingName(data.name || "Someone");
      } else {
        setIsOtherUserTyping(false);
        setTypingName("");
      }
    });

    socket.on("receive_message", (data: any) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.uuid === data.uuid);
        if (exists) {
          return prev.map((m) =>
            m.uuid === data.uuid ? { ...m, ...data, status: "sent" } : m
          );
        }
        return [...prev, { ...data, status: "sent", canEdit: false }];
      });
      scrollToBottom();
    });

    socket.on("message_edited", ({ uuid: msgUuid, newMessage }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.uuid === msgUuid ? { ...m, message: newMessage } : m
        )
      );
    });

    socket.on("message_deleted", ({ uuid: msgUuid }: any) => {
      setMessages((prev) => prev.filter((m) => m.uuid !== msgUuid));
    });

    return () => {
      socket.off("load_messages");
      socket.off("receive_message");
      socket.off("message_edited");
      socket.off("message_deleted");
      socket.off("user_typing");
    };
  }, [socket, uuid, senderId, scrollToBottom]);

  const emitTyping = useCallback(() => {
    if (!socket || !uuid) return;
    socket.emit("typing", { uuid, fullName: senderName });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { uuid });
    }, 3000);
  }, [socket, uuid, senderName]);

  const stopTyping = useCallback(() => {
    if (!socket || !uuid) return;
    socket.emit("stop_typing", { uuid });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [socket, uuid]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopTyping();
      timerRef.current && clearInterval(timerRef.current);
      recording?.stopAndUnloadAsync().catch(() => {});
      previewSound?.unloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, [recording, previewSound, stopTyping]);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;
      const newRec = new Audio.Recording();
      await newRec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRec.startAsync();
      setRecording(newRec);
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(
        () => setRecordDuration((prev) => prev + 1),
        1000
      );
    } catch (err) {
      console.error(err);
    }
  };

  const stopAndPreview = async () => {
    if (!recording) return;
    setIsRecording(false);
    clearInterval(timerRef.current!);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setPreviewUri(uri);
        const { sound } = await Audio.Sound.createAsync({ uri });
        setPreviewSound(sound);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecording(null);
    }
  };

  const togglePreviewPlayback = async () => {
    if (!previewSound) return;
    if (isPreviewPlaying) {
      await previewSound.pauseAsync();
      setIsPreviewPlaying(false);
    } else {
      await previewSound.replayAsync();
      setIsPreviewPlaying(true);
      previewSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) setIsPreviewPlaying(false);
      });
    }
  };

  const cancelVoicePreview = () => {
    previewSound?.unloadAsync().catch(() => {});
    setPreviewSound(null);
    setPreviewUri(null);
    setRecordDuration(0);
    setIsPreviewPlaying(false);
  };

  const handleSendVoice = async () => {
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
      isRead: false,
      canEdit: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    try {
      const base64 = await fileToBase64(previewUri);
      socket.emit("send_message", {
        uuid,
        message: "",
        fullName: senderName,
        userId: senderId,
        receiverId,
        messageUuid: msgUuid,
        messageType: "voice",
        mediaUri: `data:audio/m4a;base64,${base64}`,
        duration: recordDuration,
        receiverProfilePicture: receiverProfilePicture || "",
      });
      cancelVoicePreview();
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.uuid === msgUuid ? { ...m, status: "failed" } : m))
      );
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.82,
      });
      if (result.canceled || !result.assets?.length) return;
      const uri = result.assets[0].uri;
      const info = await FileSystemLegacy.getInfoAsync(uri);
      if ("size" in info && info.size > MAX_IMAGE_SIZE_BYTES) {
        Alert.alert("Too Large", `Max size: ${MAX_IMAGE_SIZE_MB}MB`);
        return;
      }
      const msgUuid = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const optimisticMsg: Message = {
        uuid: msgUuid,
        message: "",
        senderName: senderName || "You",
        senderId: senderId!,
        timestamp: new Date().toISOString(),
        messageType: "image",
        imageuri: uri,
        status: "pending",
        isRead: false,
        canEdit: false,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      scrollToBottom();
      setShowOptions(false);
      const base64 = await fileToBase64(uri);
      socket?.emit("send_message", {
        uuid,
        message: "",
        fullName: senderName,
        userId: senderId,
        receiverId,
        messageUuid: msgUuid,
        messageType: "image",
        mediaUri: `data:image/jpeg;base64,${base64}`,
        receiverProfilePicture: receiverProfilePicture || "",
      });
    } catch (err) {
      Alert.alert("Error", "Could not pick image");
    }
  };

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
      setMessages((prev) =>
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
        isRead: false,
        canEdit: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      scrollToBottom();
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

  const showMessageOptions = (msg: Message) => {
    if (msg.senderId !== senderId) return;
    setSelectedMessage(msg);
    setMessageOptionsVisible(true);
  };

  const handleDeleteMessage = (forEveryone = false) => {
    if (!selectedMessage) return;
    Alert.alert(
      forEveryone ? "Delete for Everyone?" : "Delete for Me?",
      forEveryone
        ? "This removes the message for both sides."
        : "This removes it only from your view.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            socket?.emit("delete_message", {
              uuid,
              messageUuid: selectedMessage.uuid,
              userId: senderId,
              forEveryone,
            });
            setMessages((prev) =>
              prev.filter((m) => m.uuid !== selectedMessage.uuid)
            );
            setMessageOptionsVisible(false);
            setSelectedMessage(null);
          },
        },
      ]
    );
  };

  const startEditMessage = () => {
    if (!selectedMessage || !selectedMessage.canEdit) return;
    setEditingMessageId(selectedMessage.uuid);
    setEditText(selectedMessage.message);
    setMessageOptionsVisible(false);
    setSelectedMessage(null);
  };

  const renderMessageItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = item.senderId === senderId;
      return (
        <Pressable
          style={[
            styles.messageContainer,
            isMe ? styles.rightContainer : styles.leftContainer,
          ]}
          onLongPress={() => isMe && showMessageOptions(item)}
        >
          <View
            style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}
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
            {item.messageType === "voice" && item.audioUri && (
              <TouchableOpacity
                style={styles.voiceRow}
                onPress={() => {
                  if (item.status === "pending") return;
                  if (playingId === item.uuid) {
                    soundRef.current?.pauseAsync();
                    setPlayingId(null);
                  } else {
                    soundRef.current?.unloadAsync().catch(() => {});
                    Audio.Sound.createAsync({ uri: item.audioUri! }).then(
                      ({ sound }) => {
                        soundRef.current = sound;
                        setPlayingId(item.uuid);
                        sound.playAsync();
                        sound.setOnPlaybackStatusUpdate((st: any) => {
                          if (st.didJustFinish) setPlayingId(null);
                        });
                      }
                    );
                  }
                }}
              >
                {playingId === item.uuid ? (
                  <Pause size={26} color={isMe ? "#FFF" : "#111827"} />
                ) : (
                  <Play size={26} color={isMe ? "#FFF" : "#111827"} />
                )}
                <AppText
                  style={[
                    styles.voiceLabel,
                    isMe ? { color: "#FFF" } : { color: "#111827" },
                  ]}
                >
                  Voice • {item.duration || 0}s
                </AppText>
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
            {isMe && (
              <View style={styles.statusRow}>
                {item.status === "pending" && <Clock size={14} color={GRAY} />}
                {item.status === "sent" && item.isRead ? (
                  <CheckCheck size={16} color="#60A5FA" />
                ) : item.status === "sent" ? (
                  <Check size={16} color={GRAY} />
                ) : null}
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [senderId, playingId]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - Outside KeyboardAvoidingView to remain at top */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileContainer}
          onPress={() =>
            router.push({
              pathname: "/profile/profile",
              params: { id: receiverId },
            })
          }
        >
          {receiverProfilePicture ? (
            <Image
              source={{ uri: receiverProfilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <UserIcon size={20} color="#64748B" />
            </View>
          )}
          <View style={{ marginLeft: 8 }}>
            <AppText type="bold" style={styles.receiverName}>
              {receiverName || "Chat"}
            </AppText>
            <AppText style={styles.statusText}>
              {isOtherUserTyping ? `${typingName} is typing...` : ""}
            </AppText>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />

        {/* Input area combined with Options */}
        <View style={styles.bottomContainer}>
          {showOptions && (
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handlePickImage}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: "#3B82F6" }]}
                >
                  <ImageIcon color="#FFF" size={28} />
                </View>
                <AppText style={styles.optionLabel}>Photo</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItem}
                onPressIn={startRecording}
                onPressOut={stopAndPreview}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: isRecording ? "#EF4444" : "#10B981" },
                  ]}
                >
                  <Mic color="#FFF" size={28} />
                </View>
                <AppText style={styles.optionLabel}>Voice</AppText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBar}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.redDot} />
                <AppText style={styles.recordingText}>
                  Recording {recordDuration}s
                </AppText>
                <TouchableOpacity onPress={stopAndPreview}>
                  <Square size={26} color="#EF4444" fill="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {previewUri && !isRecording && (
              <View style={styles.previewContainer}>
                <TouchableOpacity onPress={cancelVoicePreview}>
                  <Trash2 size={24} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.previewPlayBtn}
                  onPress={togglePreviewPlayback}
                >
                  {isPreviewPlaying ? (
                    <Pause size={22} color="#111827" />
                  ) : (
                    <Play size={22} color="#111827" />
                  )}
                  <AppText style={{ marginLeft: 10, fontWeight: "600" }}>
                    Voice Note • {recordDuration}s
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleSendVoice}
                >
                  <Send size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            {!isRecording && !previewUri && (
              <View style={styles.textInputContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setShowOptions(!showOptions);
                    Keyboard.dismiss();
                  }}
                  style={styles.addBtn}
                >
                  {showOptions ? (
                    <X size={24} color={GRAY} />
                  ) : (
                    <Plus size={24} color={GRAY} />
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder={
                    editingMessageId ? "Edit message..." : "Type a message..."
                  }
                  value={editingMessageId ? editText : inputText}
                  onChangeText={(text) => {
                    if (editingMessageId) setEditText(text);
                    else {
                      setInputText(text);
                      text.trim().length > 0 ? emitTyping() : stopTyping();
                    }
                  }}
                  onFocus={() => {
                    setShowOptions(false);
                    if (!editingMessageId && inputText.trim().length > 0)
                      emitTyping();
                  }}
                  onBlur={stopTyping}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleSendOrEditMessage}
                  style={styles.sendBtn}
                  disabled={
                    !(editingMessageId ? editText.trim() : inputText.trim())
                  }
                >
                  <Send size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals remain the same */}
      <Modal
        visible={imageViewerVisible}
        transparent
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.closeImageBtn}
            onPress={() => setImageViewerVisible(false)}
          >
            <X size={32} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: currentImageUri }}
            style={styles.fullImage}
            contentFit="contain"
          />
        </View>
      </Modal>

      <Modal
        visible={messageOptionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMessageOptionsVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMessageOptionsVisible(false)}
        >
          <View style={styles.messageOptionsModal}>
            {selectedMessage?.canEdit &&
              selectedMessage.messageType === "text" && (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={startEditMessage}
                >
                  <Edit size={22} color="#111827" />
                  <AppText style={styles.optionText}>Edit Message</AppText>
                </TouchableOpacity>
              )}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleDeleteMessage(false)}
            >
              <Trash2 size={22} color="#EF4444" />
              <AppText style={[styles.optionText, { color: "#EF4444" }]}>
                Delete for Me
              </AppText>
            </TouchableOpacity>
            {selectedMessage?.canEdit && (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handleDeleteMessage(true)}
              >
                <Trash2 size={22} color="#EF4444" />
                <AppText style={[styles.optionText, { color: "#EF4444" }]}>
                  Delete for Everyone
                </AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelRow}
              onPress={() => setMessageOptionsVisible(false)}
            >
              <AppText style={styles.cancelText}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    zIndex: 10,
  },
  backButton: { padding: 4 },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  receiverName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  statusText: { fontSize: 12, color: "#10B981" },
  messagesList: { padding: 16, paddingBottom: 20 },
  messageContainer: { marginVertical: 4, maxWidth: "80%" },
  leftContainer: { alignSelf: "flex-start" },
  rightContainer: { alignSelf: "flex-end" },
  bubble: { padding: 12, borderRadius: 18, overflow: "hidden" },
  myBubble: { backgroundColor: PRIMARY_YELLOW },
  theirBubble: { backgroundColor: "#E2E8F0" },
  messageText: { fontSize: 16 },
  myText: { color: "#111827" },
  theirText: { color: "#1E293B" },
  messageImage: { width: 240, height: 240, borderRadius: 14 },
  imageWrapper: { borderRadius: 14, overflow: "hidden" },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  voiceLabel: { fontSize: 15, fontWeight: "500" },
  statusRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  bottomContainer: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputBar: { padding: 12 },
  addBtn: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_YELLOW_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsContainer: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  optionItem: { alignItems: "center" },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  optionLabel: { fontSize: 13, color: "#374151" },
  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 24,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginRight: 10,
  },
  recordingText: { flex: 1, color: "#DC2626", fontWeight: "700" },
  previewContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 24,
  },
  previewPlayBtn: { flexDirection: "row", alignItems: "center", flex: 1 },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  closeImageBtn: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullImage: { width: SCREEN_WIDTH, height: "80%" },
  textInputContainer: { flexDirection: "row", alignItems: "center" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  messageOptionsModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelRow: { paddingVertical: 16, alignItems: "center" },
  optionText: { fontSize: 16, marginLeft: 16 },
  cancelText: { color: "#EF4444", fontWeight: "600" },
});

export default ChatScreen;
