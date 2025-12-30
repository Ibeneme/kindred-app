import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
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
  Check,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";

import {
  getNewsByFamily,
  createNews,
  deleteNews,
  updateNews,
} from "@/src/redux/slices/newsSlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";

const NewsFeedPage = () => {
  const router = useRouter();
  const { familyId, familyName, isOwner } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
    isOwner: any;
  }>();

  console.warn(isOwner, "isOwnerisOwnerisOwner");
  const dispatch = useDispatch<AppDispatch>();
  const { news, loading } = useSelector((state: RootState) => state.news);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(getNewsByFamily(familyId));
  }, [dispatch, familyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getNewsByFamily(familyId)).finally(() => setRefreshing(false));
  }, [dispatch, familyId]);

  const openModal = (item?: any) => {
    if (item) {
      setEditingNews(item);
      setTitle(item.title);
      setContent(item.content);
      setSelectedImages([]);
    }
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
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
      resetForm();
    });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedImages([]);
    setVoiceNoteUri(null);
    setVoiceDuration(0);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.slice(0, 5 - selectedImages.length);
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    setVoiceNoteUri(uri || null);
    setVoiceDuration(Math.round((status as any).durationMillis / 1000));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required", "Title and content are required");
      return;
    }
    setIsSubmitting(true);

    const imageFiles = selectedImages.map((img) => ({
      uri: img.uri,
      name: img.fileName || "image.jpg",
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
          title: title.trim(),
          content: content.trim(),
          images: imageFiles,
          voiceNote: voiceFile,
          voiceDuration: voiceDuration || undefined,
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

    if (
      createNews.fulfilled.match(result) ||
      updateNews.fulfilled.match(result)
    ) {
      closeModal();
      dispatch(getNewsByFamily(familyId));
    }
  };

  const handleDeleteNews = (newsId: string) => {
    Alert.alert("Delete News", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => dispatch(deleteNews(newsId)),
      },
    ]);
  };

  const renderNewsItem = ({ item }: { item: any }) => (
    <View style={styles.newsCard}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <AppText type="medium" style={styles.authorName}>
            {item.author?.firstName} {item.author?.lastName}
          </AppText>
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
        <AppText style={styles.content} numberOfLines={4}>
          {item.content}
        </AppText>

        {item.images?.length > 0 && (
          <View style={styles.imagePreview}>
            {item.images.slice(0, 3).map((img: any, idx: number) => (
              <Image
                key={idx}
                source={{ uri: img.url }}
                style={styles.previewImage}
              />
            ))}
            {item.images.length > 3 && (
              <View style={styles.moreImages}>
                <AppText style={styles.moreText}>
                  +{item.images.length - 3}
                </AppText>
              </View>
            )}
          </View>
        )}

        {isOwner === true ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openModal(item)}
            >
              <Edit size={18} color="#6B7280" />
              <AppText style={styles.actionText}>Edit</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeleteNews(item._id)}
            >
              <Trash2 size={18} color="#EF4444" />
              <AppText style={[styles.actionText, { color: "#EF4444" }]}>
                Delete
              </AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Newspaper size={60} color="#CBD5E1" />
      <AppText type="medium" style={styles.emptyTitle}>
        No news yet
      </AppText>
      <AppText style={styles.emptySubtitle}>
        Be the first to share an update with your family
      </AppText>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => openModal()}>
        <Plus size={20} color="#FFF" />
        <AppText type="bold" style={styles.emptyBtnText}>
          Post News
        </AppText>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {familyName}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing && news.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#121212" />
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item._id}
          renderItem={renderNewsItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            news.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#121212"
            />
          }
        />
      )}

      {news.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
          <Plus size={28} color="#FFF" strokeWidth={3} />
        </TouchableOpacity>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} presentationStyle="pageSheet">
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText type="bold" style={styles.modalTitle}>
                  {editingNews ? "Edit Post" : "New Post"}
                </AppText>
                <TouchableOpacity onPress={closeModal}>
                  <X size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.formScroll}
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
                  <View style={styles.selectedImages}>
                    {selectedImages.map((img, idx) => (
                      <View key={idx} style={styles.selectedImageWrapper}>
                        <Image
                          source={{ uri: img.uri }}
                          style={styles.selectedThumb}
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
                  </View>
                )}
              </ScrollView>

              <View style={styles.footer}>
                {!editingNews && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      onPress={pickImages}
                    >
                      <Camera size={20} color="#121212" />
                      <AppText style={styles.mediaText}>Photos</AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.mediaBtn,
                        recording && styles.recordingBtn,
                      ]}
                      onPress={recording ? stopRecording : startRecording}
                    >
                      <Mic
                        size={20}
                        color={recording ? "#EF4444" : "#121212"}
                      />
                      <AppText
                        style={[
                          styles.mediaText,
                          recording && { color: "#EF4444" },
                        ]}
                      >
                        Voice
                      </AppText>
                    </TouchableOpacity>
                  </View>
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
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Send size={20} color="#FFF" />
                      <AppText type="bold" style={styles.submitText}>
                        {editingNews ? "Update" : "Post"}
                      </AppText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
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
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "600",
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
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  authorName: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
  },
  title: {
    fontSize: 18,
    color: "#111827",
    marginBottom: 6,
    fontWeight: "700",
  },
  content: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  imagePreview: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  moreImages: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  moreText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
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
    fontSize: 20,
    color: "#111827",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {},
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    color: "#111827",
    fontWeight: "700",
  },
  formScroll: {
    maxHeight: 300,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    color: "#111827",
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#111827",
  },
  selectedImages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 12,
  },
  selectedImageWrapper: {
    position: "relative",
  },
  selectedThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  removeImage: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 4,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 6,
  },
  recordingBtn: {
    backgroundColor: "#FEE2E2",
  },
  mediaText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  submitBtn: {
    backgroundColor: "#121212",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default NewsFeedPage;
