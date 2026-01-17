import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Plus,
  Trash2,
  Edit,
  X,
  Mic,
  Send,
  Camera,
  Newspaper,
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Search,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import {
  getNewsByFamily,
  createNews,
  deleteNews,
  updateNews,
} from "@/src/redux/slices/newsSlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MAX_VOICE_DURATION_SEC = 300;
const PRIMARY_YELLOW = "#FBBF24";
const PRIMARY_YELLOW_DARK = "#F59E0B";
const PRIMARY_YELLOW_LIGHT = "#FEF3C7";
const GRAY = "#6B7280";
const DARK = "#111827";

// Helper to safely format duration → prevents NaN:NaN
const formatDuration = (duration?: number | null): string => {
  if (typeof duration !== "number" || isNaN(duration) || duration < 0) {
    return "--:--";
  }
  const min = Math.floor(duration / 60);
  const sec = Math.floor(duration % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

const NewsFeedPage = () => {
  const router = useRouter();
  const { familyId, familyName, isOwner } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
    isOwner: any;
  }>();

  const dispatch = useDispatch<AppDispatch>();
  const { news, loading } = useSelector((state: RootState) => state.news);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<any[]>([]);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);

  const [isPlayingNew, setIsPlayingNew] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const feedSoundsRef = useRef<Record<string, Audio.Sound>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<any[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(getNewsByFamily(familyId));
  }, [dispatch, familyId]);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed to record voice notes."
        );
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  const safeUnloadRecording = async () => {
    if (!recording) return;
    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording || !status.isDoneRecording) {
        await recording.stopAndUnloadAsync();
      }
    } catch (err: any) {
      if (!err.message?.includes("already been unloaded")) {
        console.warn("Safe unload failed:", err);
      }
    } finally {
      setRecording(null);
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const startRecording = async () => {
    try {
      await safeUnloadRecording();
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      setVoiceDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setVoiceDuration((prev) => {
          const next = prev + 1;
          if (next >= MAX_VOICE_DURATION_SEC) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Start recording error:", err);
      Alert.alert("Error", "Cannot start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setVoiceNoteUri(uri);
      }
    } catch (err) {
      console.warn("Stop recording failed:", err);
    }
    setRecording(null);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const togglePlayNewAudio = async () => {
    if (!voiceNoteUri) return;

    if (isPlayingNew && soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlayingNew(false);
      return;
    }

    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: voiceNoteUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingNew(false);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });
      } else {
        await soundRef.current.playAsync();
      }
      setIsPlayingNew(true);
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const clearAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setVoiceNoteUri(null);
    setVoiceDuration(0);
    setIsPlayingNew(false);
  };

  useEffect(() => {
    return () => {
      if (recording) safeUnloadRecording();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      Object.values(feedSoundsRef.current).forEach((s) =>
        s.unloadAsync().catch(() => {})
      );
      feedSoundsRef.current = {};
    };
  }, [recording]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getNewsByFamily(familyId)).finally(() => setRefreshing(false));
  }, [dispatch, familyId]);

  const openModal = (item?: any) => {
    if (item) {
      setEditingNews(item);
      setTitle(item.title || "");
      setContent(item.content || "");
      setSelectedImages([]);
      setVoiceNoteUri(null);
      setVoiceDuration(0);
    } else {
      setEditingNews(null);
      setTitle("");
      setContent("");
      setSelectedImages([]);
      setVoiceNoteUri(null);
      setVoiceDuration(0);
    }
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setEditingNews(null);
      setTitle("");
      setContent("");
      setSelectedImages([]);
      setVoiceNoteUri(null);
      setVoiceDuration(0);
      setIsPlayingNew(false);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    });
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.82,
    });
    if (!result.canceled) {
      const canAdd = 5 - selectedImages.length;
      if (canAdd <= 0) return;
      const newImages = result.assets.slice(0, canAdd);
      setSelectedImages((prev) => [...prev, ...newImages]);
    }
  };

  const playFeedVoice = async (newsId: string, url: string) => {
    if (playingVoiceId && playingVoiceId !== newsId) {
      feedSoundsRef.current[playingVoiceId]?.pauseAsync().catch(() => {});
    }
    try {
      let sound = feedSoundsRef.current[newsId];
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        sound = newSound;
        feedSoundsRef.current[newsId] = sound;
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.isLoaded && st.didJustFinish) {
            setPlayingVoiceId(null);
          }
        });
      } else {
        await sound.playAsync();
      }
      setPlayingVoiceId(newsId);
    } catch (err) {
      console.error("Play feed voice failed:", err);
      Alert.alert("Error", "Could not play voice note");
    }
  };

  const pauseFeedVoice = async (newsId: string) => {
    const sound = feedSoundsRef.current[newsId];
    if (sound) {
      await sound.pauseAsync().catch(() => {});
      setPlayingVoiceId(null);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required", "Title and content are required");
      return;
    }
    setIsSubmitting(true);
    const imageFiles = selectedImages.map((img) => ({
      uri: img.uri,
      name: img.fileName || `image-${Date.now()}.jpg`,
      type: img.mimeType || "image/jpeg",
    }));
    const voiceFile = voiceNoteUri
      ? { uri: voiceNoteUri, name: "voice.m4a", type: "audio/m4a" }
      : undefined;

    let result;
    if (editingNews) {
      result = await dispatch(
        updateNews({
          newsId: editingNews._id,
          data: {
            title: title.trim(),
            content: content.trim(),
            images: imageFiles,
            voiceNote: voiceFile,
            voiceDuration: voiceDuration || undefined,
          },
        })
      );
    } else {
      result = await dispatch(
        createNews({
          familyId,
          title: title.trim(),
          content: content.trim(),
          images: imageFiles,
          voiceNote: voiceFile,
          voiceDuration: voiceDuration || undefined,
        })
      );
    }
    setIsSubmitting(false);
    if (result.meta.requestStatus === "fulfilled") {
      closeModal();
      dispatch(getNewsByFamily(familyId));
    } else {
      Alert.alert("Error", "Failed to post/update news");
    }
  };

  const handleDelete = (newsId: string) => {
    Alert.alert("Delete News", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => dispatch(deleteNews(newsId)),
      },
    ]);
  };

  const filteredNews = news.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.content?.toLowerCase().includes(q)
    );
  });

  const openImageViewer = (images: any[], startIndex: number = 0) => {
    setViewerImages(images);
    setViewerIndex(startIndex);
    setViewerVisible(true);
  };

  const toggleExpand = (newsId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(newsId)) {
        next.delete(newsId);
      } else {
        next.add(newsId);
      }
      return next;
    });
  };

  const renderNewsItem = ({ item }: { item: any }) => {
    const hasVoice = !!item.voiceNote?.url;
    const isThisPlaying = playingVoiceId === item._id;
    const isExpanded = expandedPosts.has(item._id);
    const MAX_LINES = 5;
    const showSeeMore =
      !isExpanded && item.content.split("\n").length > MAX_LINES;

    const isPlayingThis = playingVoiceId === item._id;
    const MAX_CONTENT_LINES = 5;
    // ←─────── FIXED HERE ────────→
    const voiceDurationStr = formatDuration(item.voiceNote?.duration);

    return (
      <View style={styles.newsCard}>
        {item.images?.length > 0 && (
          <View style={styles.imageGrid}>
            {item.images.slice(0, 4).map((img: any, idx: number) => (
              <TouchableOpacity
                key={img.url || idx}
                style={[
                  styles.gridImageWrapper,
                  item.images.length === 1 && styles.gridImageSingle,
                ]}
                activeOpacity={0.85}
                onPress={() => openImageViewer(item.images, idx)}
              >
                <Image
                  source={{ uri: img.url }}
                  style={styles.gridImage}
                  contentFit="cover"
                  transition={180}
                />
                {idx === 3 && item.images.length > 4 && (
                  <View style={styles.moreOverlay}>
                    <AppText style={styles.moreOverlayText}>
                      +{item.images.length - 3}
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <TouchableOpacity
              onPress={() =>
                item.author?._id &&
                router.push(`/profile/profile?id=${item.author._id}`)
              }
              style={styles.authorContainer}
            >
              <AppText type="medium" style={styles.authorName}>
                {item.author?.firstName} {item.author?.lastName}
              </AppText>
              <AppText style={styles.postedByLabel}>Posted by</AppText>
            </TouchableOpacity>
            <AppText style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </AppText>
          </View>

          <AppText type="bold" style={styles.title}>
            {item.title}
          </AppText>

          <AppText
            style={styles.content}
            numberOfLines={isExpanded ? undefined : MAX_LINES}
            ellipsizeMode="tail"
          >
            {item.content}
          </AppText>

          {showSeeMore && (
            <TouchableOpacity
              onPress={() => toggleExpand(item._id)}
              style={styles.seeMoreContainer}
            >
              <AppText style={styles.seeMoreText}>See more</AppText>
            </TouchableOpacity>
          )}

          {isExpanded && item.content.length > 350 && (
            <TouchableOpacity
              onPress={() => toggleExpand(item._id)}
              style={styles.seeMoreContainer}
            >
              <AppText style={styles.seeMoreText}>See less</AppText>
            </TouchableOpacity>
          )}

          {hasVoice && (
            <TouchableOpacity
              style={styles.voiceFeedRow}
              onPress={() =>
                isPlayingThis
                  ? pauseFeedVoice(item._id)
                  : playFeedVoice(item._id, item.voiceNote.url)
              }
            >
              {isPlayingThis ? (
                <Pause size={26} color={PRIMARY_YELLOW_DARK} />
              ) : (
                <Play size={26} color={PRIMARY_YELLOW_DARK} />
              )}
              <AppText style={styles.voiceTime}>Voice Recording</AppText>
              <AppText style={styles.voiceLabel}>Voice note</AppText>
            </TouchableOpacity>
          )}

          {(isOwner === true || isOwner === "true") && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openModal(item)}
              >
                <Edit size={18} color={GRAY} />
                <AppText style={styles.actionText}>Edit</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(item._id)}
              >
                <Trash2 size={18} color="#EF4444" />
                <AppText style={[styles.actionText, { color: "#EF4444" }]}>
                  Delete
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Newspaper size={64} color="#CBD5E1" />
      <AppText type="medium" style={styles.emptyTitle}>
        {searchQuery.trim() ? "No matching news found" : "No news yet"}
      </AppText>
      <AppText style={styles.emptySubtitle}>
        {searchQuery.trim()
          ? "Try a different search term"
          : "Be the first to share an update with your family"}
      </AppText>
      {!searchQuery.trim() && (
        <TouchableOpacity style={styles.emptyBtn} onPress={() => openModal()}>
          <Plus size={20} color="#FFF" />
          <AppText type="bold" style={styles.emptyBtnText}>
            Post News
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={26} color={DARK} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {familyName || "Family Feed"}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={GRAY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or content..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <X size={20} color={GRAY} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing && news.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY_YELLOW} />
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => item._id}
          renderItem={renderNewsItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            filteredNews.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY_YELLOW}
            />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Plus size={28} color="#FFF" strokeWidth={3} />
      </TouchableOpacity>

      <Modal
        visible={viewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.closeViewerButton}
            onPress={() => setViewerVisible(false)}
          >
            <X size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <FlatList
            data={viewerImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: "100%" }}>
                <Image
                  source={{ uri: item.url }}
                  style={styles.fullImage}
                  contentFit="contain"
                />
              </View>
            )}
            keyExtractor={(_, index) => `viewer-${index}`}
          />
        </View>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboardWrapper}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalContentTop}>
                <View style={styles.modalHeader}>
                  <AppText type="bold" style={styles.modalTitle}>
                    {editingNews ? "Edit Post" : "New Post"}
                  </AppText>
                  <TouchableOpacity onPress={closeModal}>
                    <X size={26} color="#374151" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.formScrollContent}
                >
                  <TextInput
                    placeholder="Post Title"
                    style={styles.titleInput}
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor="#9CA3AF"
                  />

                  <TextInput
                    placeholder="Write your update..."
                    style={styles.contentInput}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    placeholderTextColor="#9CA3AF"
                  />

                  {selectedImages.length > 0 && (
                    <ScrollView horizontal style={styles.selectedImagesScroll}>
                      {selectedImages.map((img, idx) => (
                        <View key={idx} style={styles.selectedImageWrapper}>
                          <Image
                            source={{ uri: img.uri }}
                            style={styles.selectedThumb}
                            contentFit="cover"
                          />
                          <TouchableOpacity
                            style={styles.removeImage}
                            onPress={() =>
                              setSelectedImages(
                                selectedImages.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <X size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  <View style={styles.voiceSection}>
                    {voiceNoteUri ? (
                      <View style={styles.voicePreviewContainer}>
                        <TouchableOpacity
                          style={styles.playPauseBtn}
                          onPress={togglePlayNewAudio}
                        >
                          {isPlayingNew ? (
                            <Pause size={28} color="#FFF" />
                          ) : (
                            <Play size={28} color="#FFF" />
                          )}
                        </TouchableOpacity>
                        <AppText style={styles.voiceDuration}>
                          {Math.floor(voiceDuration / 60)}:
                          {(voiceDuration % 60).toString().padStart(2, "0")}
                        </AppText>
                        <TouchableOpacity
                          style={styles.reRecordBtn}
                          onPress={clearAudio}
                        >
                          <RefreshCw size={20} color={PRIMARY_YELLOW_DARK} />
                          <AppText
                            style={{
                              color: PRIMARY_YELLOW_DARK,
                              marginLeft: 8,
                              fontWeight: "500",
                            }}
                          >
                            Re-record
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.recordButton,
                          isRecording && styles.recordingActive,
                        ]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        activeOpacity={0.8}
                      >
                        <Mic
                          size={26}
                          color={isRecording ? PRIMARY_YELLOW_DARK : DARK}
                        />
                        <AppText
                          style={[
                            styles.recordText,
                            isRecording && { color: PRIMARY_YELLOW_DARK },
                          ]}
                        >
                          {isRecording
                            ? "Recording... (release to stop)"
                            : "Hold to Record Voice (max 5 min)"}
                        </AppText>
                      </TouchableOpacity>
                    )}

                    {isRecording && (
                      <AppText style={styles.recordingTimer}>
                        {Math.floor(voiceDuration / 60)}:
                        {(voiceDuration % 60).toString().padStart(2, "0")} /
                        5:00
                      </AppText>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.footer}>
                  {!editingNews && (
                    <TouchableOpacity
                      style={[
                        styles.mediaBtn,
                        selectedImages.length >= 5 && { opacity: 0.5 },
                      ]}
                      onPress={pickImages}
                      disabled={selectedImages.length >= 5}
                    >
                      <Camera size={20} color={DARK} />
                      <AppText style={styles.mediaText}>Add Photos</AppText>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      isSubmitting && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={DARK} />
                    ) : (
                      <>
                        <Send size={20} color={DARK} />
                        <AppText type="bold" style={styles.submitText}>
                          {editingNews ? "Update" : "Post"}
                        </AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 19,
    color: "#111827",
    fontWeight: "700",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  newsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridImageWrapper: {
    width: "50%",
    aspectRatio: 1,
    padding: 1,
  },
  gridImageSingle: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  gridImage: {
    flex: 1,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreOverlayText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  postedByLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
  },
  title: {
    fontSize: 18,
    color: "#111827",
    marginBottom: 8,
    fontWeight: "700",
  },
  content: {
    fontSize: 15.5,
    color: "#4B5563",
    lineHeight: 23,
  },
  seeMoreContainer: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  seeMoreText: {
    color: PRIMARY_YELLOW_DARK,
    fontSize: 15,
    fontWeight: "600",
  },
  voiceNoteFeedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_YELLOW_LIGHT,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  voiceNoteDurationFeed: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY_YELLOW_DARK,
  },
  voiceNoteLabel: {
    fontSize: 13,
    color: "#4B5563",
    marginLeft: "auto",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginTop: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: "#6B7280",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 21,
    color: "#111827",
    marginTop: 20,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_YELLOW,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 28,
    gap: 8,
  },
  emptyBtnText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY_YELLOW,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY_YELLOW,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKeyboardWrapper: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalContentTop: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : 40,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    color: "#111827",
    fontWeight: "700",
  },
  formScrollContent: {
    paddingBottom: 120,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    borderBottomWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    color: "#111827",
    marginBottom: 20,
  },
  contentInput: {
    fontSize: 16,
    minHeight: 110,
    textAlignVertical: "top",
    color: "#111827",
    marginBottom: 20,
  },
  selectedImagesScroll: {
    marginVertical: 16,
  },
  selectedImageWrapper: {
    position: "relative",
    marginRight: 12,
  },
  selectedThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImage: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 4,
  },
  voiceSection: {
    marginTop: 24,
    alignItems: "center",
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    width: "100%",
  },
  recordingActive: {
    backgroundColor: PRIMARY_YELLOW_LIGHT,
    borderWidth: 2,
    borderColor: PRIMARY_YELLOW_DARK,
  },
  recordText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  recordingTimer: {
    marginTop: 12,
    color: PRIMARY_YELLOW_DARK,
    fontWeight: "600",
    fontSize: 14,
  },
  voicePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_YELLOW_LIGHT,
    padding: 16,
    borderRadius: 16,
    width: "100%",
    justifyContent: "space-between",
  },
  playPauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_YELLOW_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceDuration: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 20,
  },
  reRecordBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitBtn: {
    flex: 1.4,
    backgroundColor: PRIMARY_YELLOW,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "#000000",
  },
  closeViewerButton: {
    position: "absolute",
    top: 50,
    right: 24,
    zIndex: 10,
    padding: 12,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  voiceTime: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY_YELLOW_DARK,
  },
  durationText: {
    fontSize: 16,
    fontWeight: "700",
    color: DARK,
  },
  voiceFeedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_YELLOW_LIGHT, // very light yellow background
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 4,
    gap: 12,
    borderWidth: 1,
    borderColor: PRIMARY_YELLOW, // subtle border to make it pop
    // Optional: slight shadow for depth
    shadowColor: PRIMARY_YELLOW_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2, // Android shadow
  },

  voicePlayPauseIcon: {
    // if you want to separate the icon style
    // optional - can override inside TouchableOpacity if needed
  },

  voiceLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563", // cool gray
    marginLeft: "auto", // pushes to right
    opacity: 0.9,
  },
});

export default NewsFeedPage;
