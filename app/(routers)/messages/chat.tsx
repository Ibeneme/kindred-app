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

  // Audio setup
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

  // ── Voice Recording Functions ───────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Microphone access is required.");
        return;
      }

      // Clean up previous states
      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => {});
      }
      if (previewSound) {
        await previewSound.unloadAsync().catch(() => {});
      }
      setRecording(null);
      setPreviewSound(null);
      setPreviewUri(null);
      setIsPreviewPlaying(false);
      setRecordDuration(0);

      const newRec = new Audio.Recording();
      await newRec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRec.startAsync();

      setRecording(newRec);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Start recording error:", err);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setPreviewUri(uri);
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false }
        );
        setPreviewSound(sound);
      }
    } catch (err) {
      console.error("Stop recording error:", err);
    } finally {
      setRecording(null);
    }
  };

  const reRecord = () => {
    cancelPreview();
    startRecording();
  };

  const togglePreviewPlayback = async () => {
    if (!previewSound) return;

    try {
      if (isPreviewPlaying) {
        await previewSound.pauseAsync();
        setIsPreviewPlaying(false);
      } else {
        await previewSound.replayAsync();
        setIsPreviewPlaying(true);

        previewSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsPreviewPlaying(false);
          }
        });
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const cancelPreview = async () => {
    if (previewSound) {
      await previewSound.unloadAsync().catch(() => {});
    }
    setPreviewSound(null);
    setPreviewUri(null);
    setIsPreviewPlaying(false);
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

      cancelPreview();
    } catch (err) {
      console.error("Send voice failed:", err);
      setMessages((prev) =>
        prev.map((m) => (m.uuid === msgUuid ? { ...m, status: "failed" } : m))
      );
      Alert.alert("Error", "Could not send voice note");
    }
  };

  // ── Other functions (image, send text, edit, delete) remain unchanged ──────

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
    if (
      !selectedMessage ||
      !selectedMessage.canEdit ||
      selectedMessage.messageType !== "text"
    )
      return;
    setEditingMessageId(selectedMessage.uuid);
    setEditText(selectedMessage.message);
    setMessageOptionsVisible(false);
    setSelectedMessage(null);
  };

  // ── Render single message ────────────────────────────────────────────────────
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
      {/* Header */}
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
              style={[
                styles.receiverName,
                { textDecorationLine: "underline", color: PRIMARY_YELLOW },
              ]}
            >
              {receiverName || "Chat"}
            </AppText>
            <AppText style={styles.statusText}>
              {isOtherUserTyping ? (
                <Animated.Text style={{ opacity: typingAnim }}>
                  {typingName} is typing...
                </Animated.Text>
              ) : null}
            </AppText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Alert.alert("Video Call", "Video call feature is Coming Soon!")
          }
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

        {/* Bottom input area */}
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
            {/* LIVE RECORDING */}
            {isRecording && (
              <View style={styles.recordingActiveContainer}>
                <View style={styles.recordingInfo}>
                  <View style={styles.liveDot} />
                  <AppText style={styles.recordingLabel}>Recording...</AppText>
                </View>

                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <Square size={36} color="#FFF" fill="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* VOICE PREVIEW */}
            {previewUri && !isRecording && (
              <View style={styles.voicePreviewContainer}>
                <TouchableOpacity
                  onPress={cancelPreview}
                  style={styles.cancelIcon}
                >
                  <Trash2 size={26} color="#EF4444" />
                </TouchableOpacity>

                <View style={styles.previewCenter}>
                  <TouchableOpacity
                    onPress={togglePreviewPlayback}
                    style={styles.playPauseBtn}
                  >
                    {isPreviewPlaying ? (
                      <>
                        <Pause size={28} color="#111827" />
                        <AppText style={styles.previewStatus}>
                          Playing...
                        </AppText>
                      </>
                    ) : (
                      <>
                        <Play size={28} color="#111827" />
                        <AppText style={styles.previewStatus}>
                          Voice Note
                        </AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.previewActions}>
                  <TouchableOpacity onPress={reRecord}>
                    <AppText style={styles.reRecordText}>Re-record</AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sendFinalBtn}
                    onPress={sendVoiceNote}
                  >
                    <Send size={26} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Normal text input */}
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
                      if (text.trim().length > 0) emitTyping();
                      else stopTyping();
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

      {/* Image Viewer Modal */}
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

      {/* Message Options Modal */}
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

// ── Styles ─────────────────────────────────────────────────────────────────────
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
  receiverName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  statusText: { fontSize: 13, color: "#10B981", marginTop: 2 },
  messagesList: { paddingHorizontal: 16, paddingBottom: 20 },
  messageContainer: { marginVertical: 6, maxWidth: "80%" },
  leftContainer: { alignSelf: "flex-start" },
  rightContainer: { alignSelf: "flex-end" },
  bubble: { padding: 12, borderRadius: 20, overflow: "hidden" },
  myBubble: { backgroundColor: PRIMARY_YELLOW },
  theirBubble: { backgroundColor: "#E2E8F0" },
  messageText: { fontSize: 16 },
  myText: { color: "#111827" },
  theirText: { color: "#1E293B" },
  messageImage: { width: 240, height: 240, borderRadius: 16 },
  imageWrapper: { borderRadius: 16, overflow: "hidden" },
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
  voiceLabel: { fontSize: 15, fontWeight: "500", marginLeft: 12 },
  statusRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  bottomContainer: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputBar: { padding: 12 },
  recordingActiveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    marginBottom: 12,
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  recordingLabel: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 15,
  },
  durationText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "600",
  },
  stopButton: {
    backgroundColor: "#EF4444",
    borderRadius: 30,
    padding: 14,
  },
  voicePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 28,
    marginBottom: 12,
  },
  cancelIcon: {
    padding: 8,
  },
  previewCenter: {
    flex: 1,
    alignItems: "center",
  },
  playPauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewStatus: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  previewActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  reRecordText: {
    color: PRIMARY_YELLOW_DARK,
    fontWeight: "600",
    fontSize: 14,
  },
  sendFinalBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_YELLOW_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  textInputContainer: { flexDirection: "row", alignItems: "center" },
  addBtn: { padding: 12 },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
    marginHorizontal: 8,
    fontSize: 16,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  optionLabel: { fontSize: 13, color: "#374151" },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelRow: { paddingVertical: 16, alignItems: "center" },
  optionText: { fontSize: 16, marginLeft: 16 },
  cancelText: { color: "#EF4444", fontWeight: "700", fontSize: 16 },
});

export default ChatScreen;
