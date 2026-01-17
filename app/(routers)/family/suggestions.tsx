import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Plus,
  X,
  Camera,
  ThumbsUp,
  Trash2,
  Lightbulb,
  Search,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  fetchSuggestionsByFamily,
  createSuggestion,
  toggleUpvote,
  deleteSuggestion,
} from "@/src/redux/slices/suggestionSlice";

interface Suggestion {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  upvoteCount: number;
  hasUpvoted: boolean;
  isOwner: boolean;
  sender?: { name?: string };
}

const SuggestionBox = () => {
  const router = useRouter();
  const { familyId, familyName } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
  }>();

  const dispatch = useDispatch<AppDispatch>();
  const { suggestions = [], loading } = useSelector(
    (state: RootState) => state.suggestions || {}
  );

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) {
      dispatch(fetchSuggestionsByFamily(familyId));
    }
  }, [familyId, dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchSuggestionsByFamily(familyId)).finally(() =>
      setRefreshing(false)
    );
  }, [familyId, dispatch]);

  // Search Logic: Filters both title and description
  const filteredSuggestions = suggestions.filter((item: Suggestion) => {
    const query = searchQuery.toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(query) ||
      (item.description || "").toLowerCase().includes(query)
    );
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please allow access to your library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert("Missing Fields", "Please provide a title and description.");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("description", form.description.trim());
    formData.append("familyId", familyId as string);

    if (image) {
      const filename = image.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("image", { uri: image, name: filename, type } as any);
    }

    const result = await dispatch(createSuggestion(formData));
    setIsSubmitting(false);
    if (createSuggestion.fulfilled.match(result)) {
      setModalVisible(false);
      setForm({ title: "", description: "" });
      setImage(null);
    } else {
      Alert.alert("Error", "Failed to submit. Please try again.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Remove this idea?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => dispatch(deleteSuggestion(id)),
      },
    ]);
  };

  const renderSuggestion: ListRenderItem<Suggestion> = ({ item }) => (
    <View style={styles.card}>
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <AppText type="bold" style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </AppText>
          {item.isOwner && (
            <TouchableOpacity
              onPress={() => handleDelete(item._id)}
              style={styles.deleteButton}
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        <AppText style={styles.cardDescription} numberOfLines={4}>
          {item.description}
        </AppText>
        <View style={styles.cardFooter}>
          <View style={styles.authorInfo}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>
                {item.sender?.name?.[0]?.toUpperCase() || "?"}
              </AppText>
            </View>
            <AppText style={styles.authorName}>
              {item.sender?.name || "Family Member"}
            </AppText>
          </View>
          <TouchableOpacity
            style={[
              styles.upvoteButton,
              item.hasUpvoted && styles.upvoteButtonActive,
            ]}
            onPress={() => dispatch(toggleUpvote(item._id))}
          >
            <ThumbsUp
              size={16}
              color={item.hasUpvoted ? "#FFFFFF" : "#6B7280"}
            />
            <AppText
              style={[
                styles.upvoteCount,
                { color: item.hasUpvoted ? "#FFFFFF" : "#6B7280" },
              ]}
            >
              {item.upvoteCount || 0}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Toggleable Search */}
      <View style={styles.header}>
        {!isSearchVisible ? (
          <>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Lightbulb size={22} color="#EAB308" />
              <AppText type="bold" style={styles.headerText}>
                {familyName || "Family"} Box
              </AppText>
            </View>

            <TouchableOpacity
              onPress={() => setIsSearchVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Search size={22} color="#111827" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.searchHeader}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ideas..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={() => {
                setIsSearchVisible(false);
                setSearchQuery("");
              }}
            >
              <X size={22} color="#111827" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && suggestions.length === 0 && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      ) : (
        <FlatList
          data={filteredSuggestions}
          renderItem={renderSuggestion}
          keyExtractor={(item) => item._id}
          contentContainerStyle={
            suggestions.length === 0 ? styles.emptyList : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EAB308"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Lightbulb size={48} color="#9CA3AF" />
              </View>
              <AppText type="bold" style={styles.emptyTitle}>
                {searchQuery ? "No matches found" : "No suggestions yet"}
              </AppText>
              <AppText style={styles.emptySubtitle}>
                {searchQuery
                  ? "Try a different keyword"
                  : "Be the first to share an idea!"}
              </AppText>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ── Refactored Modal ── centered dialog style ── */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardWrapper}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText type="bold" style={styles.modalTitle}>
                  New Suggestion
                </AppText>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <AppText style={styles.label}>Title *</AppText>
                <TextInput
                  style={styles.input}
                  placeholder="Idea title"
                  value={form.title}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, title: text }))
                  }
                />

                <AppText style={styles.label}>Description *</AppText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Explain your idea..."
                  value={form.description}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, description: text }))
                  }
                  multiline
                  textAlignVertical="top"
                />

                <AppText style={styles.label}>Photo (Optional)</AppText>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={pickImage}
                >
                  {image ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: image }}
                        style={styles.previewImage}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setImage(null)}
                      >
                        <X size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Camera size={28} color="#9CA3AF" />
                      <AppText style={styles.placeholderText}>
                        Add a photo
                      </AppText>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <AppText type="bold" style={styles.cancelText}>
                      Cancel
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      isSubmitting && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <AppText type="bold" style={styles.submitText}>
                        Post Idea
                      </AppText>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Extra bottom padding for keyboard */}
                <View style={{ height: Platform.OS === "ios" ? 120 : 80 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    height: 60,
  },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerText: { fontSize: 18, color: "#111827" },

  // Search Bar Styles
  searchHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#111827" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 100 },
  emptyList: { flex: 1, justifyContent: "center" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardImage: { width: "100%", height: 200 },
  cardContent: { padding: 18 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 17, color: "#111827", flex: 1, marginRight: 12 },
  deleteButton: { padding: 6 },
  cardDescription: {
    fontSize: 14.5,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },

  authorInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  avatarText: { fontSize: 14, fontWeight: "bold", color: "#D97706" },
  authorName: { fontSize: 14, color: "#4B5563", fontWeight: "600" },

  upvoteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  upvoteButtonActive: { backgroundColor: "#EAB308" },
  upvoteCount: { fontSize: 14, fontWeight: "bold" },

  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },

  emptyState: { alignItems: "center", paddingHorizontal: 40 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 19, color: "#111827", marginBottom: 8 },
  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Centered Modal Styles ───────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalKeyboardWrapper: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxHeight: "92%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 22, color: "#111827" },
  closeButton: { padding: 4 },
  modalScrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 140 : 100,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#111827",
    marginBottom: 20,
  },
  textArea: { height: 140 },
  imagePicker: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 28,
  },
  imagePreviewContainer: { position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    padding: 6,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  placeholderText: { color: "#9CA3AF", fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: { color: "#4B5563", fontWeight: "bold" },
  submitButton: {
    flex: 2,
    backgroundColor: "#EAB308",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: "#FFFFFF", fontWeight: "bold" },
});

export default SuggestionBox;
