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
  MessageCircle,
  Clock,
  Send,
  Users,
  ShieldCheck,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  fetchSuggestionsByFamily,
  createSuggestion,
  toggleUpvote,
  deleteSuggestion,
  addSuggestionComment,
} from "@/src/redux/slices/suggestionSlice";
import { formatDistanceToNow } from "date-fns"; // Recommended for "2 days ago" labels

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

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    visibility: "all" as "all" | "admins",
  });
  const [image, setImage] = useState<string | null>(null);

  // Comment State
  const [activeCommentBox, setActiveCommentBox] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (familyId) dispatch(fetchSuggestionsByFamily(familyId));
  }, [familyId, dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchSuggestionsByFamily(familyId)).finally(() =>
      setRefreshing(false)
    );
  }, [familyId, dispatch]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert("Missing Fields", "Please provide a title and description.");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("description", form.description.trim());
    formData.append("visibility", form.visibility);
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
      setForm({ title: "", description: "", visibility: "all" });
      setImage(null);
    }
  };

  const handleSendComment = (suggestionId: string) => {
    if (!commentText.trim()) return;
    dispatch(
      addSuggestionComment({ suggestionId, message: commentText.trim() })
    );
    setCommentText("");
  };

  const renderSuggestion: ListRenderItem<any> = ({ item }) => (
    <View style={styles.card}>
      {/* Visibility Badge */}
      <View
        style={[
          styles.badge,
          item.visibility === "admins" ? styles.adminBadge : styles.allBadge,
        ]}
      >
        {item.visibility === "admins" ? (
          <ShieldCheck size={12} color="#7C3AED" />
        ) : (
          <Users size={12} color="#059669" />
        )}
        <AppText
          style={
            item.visibility === "admins"
              ? styles.adminBadgeText
              : styles.allBadgeText
          }
        >
          {item.visibility === "admins" ? "Admins Only" : "Everyone"}
        </AppText>
      </View>

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <AppText type="bold" style={styles.cardTitle}>
            {item.title}
          </AppText>
          {item.isOwner && (
            <TouchableOpacity
              onPress={() => dispatch(deleteSuggestion(item._id))}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        <AppText style={styles.cardDescription}>{item.description}</AppText>

        <View style={styles.metaRow}>
          <Clock size={14} color="#9CA3AF" />
          <AppText style={styles.dateText}>
            {item.createdAt
              ? formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })
              : "Just now"}
          </AppText>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.authorInfo}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>
                {item.sender?.firstName?.[0] || "U"}
              </AppText>
            </View>
            <AppText style={styles.authorName}>
              {item.sender?.firstName} {item.sender?.lastName}
            </AppText>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.iconButton, item.hasUpvoted && styles.activeIcon]}
              onPress={() => dispatch(toggleUpvote(item._id))}
            >
              <ThumbsUp
                size={18}
                color={item.hasUpvoted ? "#FFF" : "#6B7280"}
              />
              <AppText
                style={[
                  styles.actionCount,
                  item.hasUpvoted && { color: "#FFF" },
                ]}
              >
                {item.upvoteCount}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() =>
                setActiveCommentBox(
                  activeCommentBox === item._id ? null : item._id
                )
              }
            >
              <MessageCircle size={18} color="#6B7280" />
              <AppText style={styles.actionCount}>
                {item.comments?.length || 0}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comment Section */}
        {activeCommentBox === item._id && (
          <View style={styles.commentSection}>
            {item.comments?.map((c: any) => (
              <View key={c._id} style={styles.commentItem}>
                <AppText type="bold" style={styles.commentUser}>
                  {c.user?.firstName}:{" "}
                </AppText>
                <AppText style={styles.commentText}>{c.message}</AppText>
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity onPress={() => handleSendComment(item._id)}>
                <Send size={20} color="#EAB308" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ... Header remains the same ... */}

      <FlatList
        data={suggestions.filter(
          (s: any) =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderSuggestion}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={styles.modalContent}>
            <AppText type="bold" style={styles.modalTitle}>
              New Suggestion
            </AppText>

            <AppText style={styles.label}>Who can see this?</AppText>
            <View style={styles.visibilityToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  form.visibility === "all" && styles.toggleBtnActive,
                ]}
                onPress={() => setForm({ ...form, visibility: "all" })}
              >
                <AppText style={form.visibility === "all" && { color: "#FFF" }}>
                  Everyone
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  form.visibility === "admins" && styles.toggleBtnActive,
                ]}
                onPress={() => setForm({ ...form, visibility: "admins" })}
              >
                <AppText
                  style={form.visibility === "admins" && { color: "#FFF" }}
                >
                  Admins Only
                </AppText>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Title"
              onChangeText={(t) => setForm({ ...form, title: t })}
            />
            <TextInput
              style={[styles.input, { height: 100 }]}
              multiline
              placeholder="Description"
              onChangeText={(t) => setForm({ ...form, description: t })}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <AppText type="bold" style={{ color: "#FFF" }}>
                Post Idea
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ marginTop: 15, alignItems: "center" }}
            >
              <AppText>Cancel</AppText>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    margin: 16,
    overflow: "hidden",
    elevation: 2,
  },
  cardImage: { width: "100%", height: 150 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { fontSize: 18, flex: 1 },
  cardDescription: { color: "#4B5563", marginVertical: 8 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  dateText: { fontSize: 12, color: "#9CA3AF" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  authorInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  authorName: { fontSize: 13, color: "#374151" },
  actionButtons: { flexDirection: "row", gap: 15 },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 12,
  },
  activeIcon: { backgroundColor: "#EAB308" },
  actionCount: { fontSize: 12, fontWeight: "bold", color: "#6B7280" },
  commentSection: {
    marginTop: 15,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12,
  },
  commentItem: { flexDirection: "row", marginBottom: 5 },
  commentUser: { fontSize: 12 },
  commentText: { fontSize: 12, color: "#4B5563" },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allBadge: { backgroundColor: "#D1FAE5" },
  adminBadge: { backgroundColor: "#EDE9FE" },
  allBadgeText: { color: "#059669", fontSize: 10, fontWeight: "bold" },
  adminBadgeText: { color: "#7C3AED", fontSize: 10, fontWeight: "bold" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#FFF", borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, marginBottom: 20 },
  label: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  visibilityToggle: { flexDirection: "row", gap: 10, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: "#EAB308",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
});

export default SuggestionBox;
