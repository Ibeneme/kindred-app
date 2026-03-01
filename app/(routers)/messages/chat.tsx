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

  // Voice recording & preview states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Chat message playback & Race Condition prevention
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isAudioBusy, setIsAudioBusy] = useState(false);

  // Image viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string>("");

  // Editing & message options
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, []);

  // Audio mode setup
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

  // ── Socket logic ─────────────────────────────────────────────────────────────
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
          uuid: m.messageUuid || m.uuid,
          imageuri: m.messageType === "image" ? m.mediaUri : undefined,
          audioUri: m.messageType === "voice" ? m.mediaUri : undefined,
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
        Animated.loop(
          Animated.sequence([
            Animated.timing(typingAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(typingAnim, {
              toValue: 0.3,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        setIsOtherUserTyping(false);
        setTypingName("");
        typingAnim.setValue(0);
      }
    });

    socket.on("receive_message", (data: any) => {
      setMessages((prev) => {
        const targetUuid = data.messageUuid || data.uuid;
        const exists = prev.some((m) => m.uuid === targetUuid);

        const formattedMsg: Message = {
          ...data,
          uuid: targetUuid,
          imageuri:
            data.messageType === "image"
              ? data.mediaUri || data.imageuri
              : undefined,
          audioUri:
            data.messageType === "voice"
              ? data.mediaUri || data.audioUri
              : undefined,
          status: "sent",
          canEdit: false,
        };

        if (exists) {
          return prev.map((m) => (m.uuid === targetUuid ? formattedMsg : m));
        }
        return [...prev, formattedMsg];
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

  // ── FIXED AUDIO HANDLER (Race Condition Fix) ────────────────────────────────
  const handleToggleAudioPlayback = async (
    uri: string,
    messageUuid: string
  ) => {
    if (isAudioBusy) return;

    try {
      setIsAudioBusy(true);

      // 1. If tapping the same audio that is playing -> Stop it
      if (playingId === messageUuid) {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingId(null);
        return;
      }

      // 2. If something else is playing -> Stop and Unload it first
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      // 3. Load and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null);
          }
        }
      );

      soundRef.current = sound;
      setPlayingId(messageUuid);
    } catch (error) {
      console.error("Audio playback error:", error);
    } finally {
      setIsAudioBusy(false);
    }
  };

  // ── Voice Recording Functions ───────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Microphone access is required.");
        return;
      }

      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        setPlayingId(null);
      }

      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => {});
      }

      setRecording(null);
      setPreviewSound(null);
      setPreviewUri(null);
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
      setRecordDuration(0);

      const newRec = new Audio.Recording();
      await newRec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRec.startAsync();

      setRecording(newRec);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Start recording error:", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("No recording URI");

      setPreviewUri(uri);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );
      setPreviewSound(sound);

      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setRecordDuration(Math.round(status.durationMillis! / 1000));
      }
    } catch (err) {
      console.error("Stop recording failed:", err);
    } finally {
      setRecording(null);
    }
  };

  const togglePreviewPlayback = async () => {
    if (!previewSound || !previewUri) return;
    try {
      if (isPreviewPlaying) {
        await previewSound.pauseAsync();
        setIsPreviewPlaying(false);
        return;
      }
      await previewSound.setPositionAsync(0);
      await previewSound.playAsync();
      setIsPreviewPlaying(true);

      previewSound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (playbackStatus.isLoaded) {
          setPreviewCurrentTime(
            Math.floor(playbackStatus.positionMillis / 1000)
          );
          if (playbackStatus.didJustFinish) {
            setIsPreviewPlaying(false);
            setPreviewCurrentTime(0);
          }
        }
      });
    } catch (error) {
      console.error("Preview playback failed:", error);
    }
  };

  const cancelPreview = async () => {
    if (previewSound) await previewSound.unloadAsync().catch(() => {});
    setPreviewSound(null);
    setPreviewUri(null);
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
    setRecordDuration(0);
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
      canEdit: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

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
        receiverProfilePicture: receiverProfilePicture || "",
      });
      cancelPreview();
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.uuid === msgUuid ? { ...m, status: "failed" } : m))
      );
    }
  };

  // ── Image Handling (FIXED BUG) ──────────────────────────────────────────────

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Gallery access is needed.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const { uri, base64 } = result.assets[0];
      const msgUuid = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      // 1. Optimistic UI update
      const optimisticMsg: Message = {
        uuid: msgUuid,
        message: "",
        senderName: senderName || "You",
        senderId: senderId!,
        timestamp: new Date().toISOString(),
        messageType: "image",
        imageuri: uri,
        status: "pending",
        canEdit: false,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setShowOptions(false);
      scrollToBottom();

      // 2. Emit to socket
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
      console.error("Image pick error:", err);
    }
  };

  // ── Text Messaging Logic ─────────────────────────────────────────────────────

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
    socket?.emit("delete_message", {
      uuid,
      messageUuid: selectedMessage.uuid,
      userId: senderId,
      forEveryone,
    });
    setMessages((prev) => prev.filter((m) => m.uuid !== selectedMessage.uuid));
    setMessageOptionsVisible(false);
  };

  const startEditMessage = () => {
    if (!selectedMessage || selectedMessage.messageType !== "text") return;
    setEditingMessageId(selectedMessage.uuid);
    setEditText(selectedMessage.message);
    setMessageOptionsVisible(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ── RENDER ITEM ─────────────────────────────────────────────────────────────
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

            {item.messageType === "voice" &&
              (item.audioUri || item.status === "pending") && (
                <TouchableOpacity
                  style={styles.voiceRow}
                  disabled={item.status === "pending"}
                  onPress={() =>
                    handleToggleAudioPlayback(item.audioUri!, item.uuid)
                  }
                >
                  {playingId === item.uuid ? (
                    <Pause size={26} color={isMe ? "#FFF" : "#111827"} />
                  ) : (
                    <Play size={26} color={isMe ? "#FFF" : "#111827"} />
                  )}
                  <AppText
                    style={[
                      styles.voiceLabel,
                      { color: isMe ? "#FFF" : "#111827" },
                    ]}
                  >
                    {item.status === "pending"
                      ? "Uploading..."
                      : `Voice • ${formatDuration(item.duration || 0)}`}
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
                {item.status === "pending" ? (
                  <Clock size={14} color={GRAY} />
                ) : item.isRead ? (
                  <CheckCheck size={16} color="#60A5FA" />
                ) : (
                  <Check size={16} color={GRAY} />
                )}
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [senderId, playingId, isAudioBusy]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <View style={{ marginLeft: 12 }}>
            <AppText
              type="bold"
              style={[styles.receiverName, { color: PRIMARY_YELLOW }]}
            >
              {receiverName || "Chat"}
            </AppText>
            {isOtherUserTyping && (
              <AppText style={styles.statusText}>
                <Animated.Text style={{ opacity: typingAnim }}>
                  {typingName} is typing...
                </Animated.Text>
              </AppText>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert("Coming Soon")}
          style={{ padding: 8 }}
        >
          <Video size={26} color="#111827" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 10 : 0}
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
                onPress={startRecording}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: "#10B981" }]}
                >
                  <Mic color="#FFF" size={28} />
                </View>
                <AppText style={styles.optionLabel}>Voice</AppText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBar}>
            {isRecording ? (
              <View style={styles.recordingActiveContainer}>
                <View style={styles.recordingInfo}>
                  <View style={styles.liveDot} />
                  <AppText style={styles.recordingLabel}>
                    Recording... {formatDuration(recordDuration)}
                  </AppText>
                </View>
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <Square size={36} color="#FFF" fill="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : previewUri ? (
              <View style={styles.voicePreviewContainer}>
                <TouchableOpacity onPress={cancelPreview}>
                  <Trash2 size={26} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={togglePreviewPlayback}
                  style={styles.playPauseBtn}
                >
                  {isPreviewPlaying ? (
                    <Pause size={28} color="#111827" />
                  ) : (
                    <Play size={28} color="#111827" />
                  )}
                  <AppText>
                    {isPreviewPlaying ? "Playing..." : "Voice Note"}
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sendFinalBtn}
                  onPress={sendVoiceNote}
                >
                  <Send size={26} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
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
                  placeholder={editingMessageId ? "Edit..." : "Message..."}
                  value={editingMessageId ? editText : inputText}
                  onChangeText={(t) =>
                    editingMessageId
                      ? setEditText(t)
                      : (setInputText(t),
                        t.trim() ? emitTyping() : stopTyping())
                  }
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
            {selectedMessage?.messageType === "text" &&
              selectedMessage.canEdit && (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={startEditMessage}
                >
                  <Edit size={22} color="#111827" />
                  <AppText style={styles.optionText}>Edit</AppText>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: { padding: 8 },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  receiverName: { fontSize: 17, fontWeight: "700" },
  statusText: { fontSize: 12, color: "#10B981" },
  messagesList: { paddingHorizontal: 16, paddingBottom: 20 },
  messageContainer: { marginVertical: 6, maxWidth: "85%" },
  leftContainer: { alignSelf: "flex-start" },
  rightContainer: { alignSelf: "flex-end" },
  bubble: { padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: PRIMARY_YELLOW },
  theirBubble: { backgroundColor: "#E2E8F0" },
  messageText: { fontSize: 16, color: "#111827" },
  myText: { color: "#111827" },
  theirText: { color: "#1E293B" },
  messageImage: { width: 220, height: 220, borderRadius: 16 },
  imageWrapper: { borderRadius: 16, overflow: "hidden" },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  voiceLabel: { fontSize: 15, marginLeft: 8 },
  statusRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  bottomContainer: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputBar: { padding: 12 },
  textInputContainer: { flexDirection: "row", alignItems: "center" },
  addBtn: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_YELLOW_DARK,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  optionsContainer: {
    flexDirection: "row",
    paddingVertical: 15,
    justifyContent: "space-around",
  },
  optionItem: { alignItems: "center" },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  optionLabel: { fontSize: 12, color: GRAY },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  closeImageBtn: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullImage: { width: SCREEN_WIDTH, height: "80%" },
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionText: { fontSize: 16, marginLeft: 15 },
  recordingActiveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 25,
  },
  recordingInfo: { flexDirection: "row", alignItems: "center" },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginRight: 10,
  },
  recordingLabel: { color: "#EF4444", fontWeight: "600" },
  stopButton: { backgroundColor: "#EF4444", borderRadius: 20, padding: 8 },
  voicePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 25,
  },
  playPauseBtn: { flexDirection: "row", alignItems: "center" },
  sendFinalBtn: {
    backgroundColor: PRIMARY_YELLOW_DARK,
    borderRadius: 20,
    padding: 10,
  },
});

export default ChatScreen;
