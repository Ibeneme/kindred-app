import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronLeft,
  Plus,
  Edit3,
  Trash2,
  Heart,
  MessageCircle,
  AlertTriangle,
  Search,
  X,
  Send,
  UserCircle2,
  CheckCircle,
  Clock,
  User,
} from "lucide-react-native";
import { Image } from "expo-image";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  fetchFamilyContent,
  deleteFamilyContent,
  likeFamilyContent,
  addFamilyContentComment,
  toggleLikeOptimistic,
} from "@/src/redux/slices/familyContentSlice";
import { fetchUserProfile } from "@/src/redux/slices/userSlice";

const BRAND_YELLOW = "#EAB308";
const BORDER = "#E5E7EB";
const GRAY = "#6B7280";
const LIGHT_BG = "#F9FAFB";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#111827";
const TEXT_GRAY = "#4B5563";

export default function ContentListScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const {
    familyId,
    contentType: rawType,
    isOwner,
  } = useLocalSearchParams<{
    familyId: string;
    contentType: string;
    isOwner: string;
  }>();

  const contentType = rawType as string;
  const canEdit = isOwner === "true";

  const { contents, loading, error } = useSelector(
    (s: RootState) => s.familyContent
  );
  const { user } = useSelector((state: RootState) => state.user);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(
    null
  );

  const isPatriarch = contentType === "Patriarch";
  const isResolution = contentType === "Resolution";
  const showPhotos = !["Key Date", "Task"].includes(contentType);

  useFocusEffect(
    useCallback(() => {
      if (familyId && contentType) {
        dispatch(fetchFamilyContent({ familyId, type: contentType }));
      }
    }, [familyId, contentType, dispatch])
  );

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  const filteredContents = useMemo(() => {
    let result = [...(contents || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item?.title?.toLowerCase().includes(q) ||
          item?.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [contents, searchQuery]);

  const handleLike = (id: string) => {
    if (!user?._id) return;
    dispatch(toggleLikeOptimistic({ id, userId: user._id }));
    dispatch(likeFamilyContent(id));
  };

  const handleSendComment = (id: string) => {
    if (!commentText.trim()) return;
    dispatch(addFamilyContentComment({ id, text: commentText.trim() }));
    setCommentText("");
    setActiveCommentId(null);
    setExpandedComments((prev) => ({ ...prev, [id]: true }));
    Keyboard.dismiss();
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      dispatch(deleteFamilyContent(itemToDelete));
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isLiked =
      Array.isArray(item?.likes) && item.likes.includes(user?._id);
    const isCommExpanded = expandedComments[item._id];
    const isDescExpanded = expandedDescriptions[item._id];
    const comments = item?.comments || [];
    const displayComments = isCommExpanded ? comments : comments.slice(-2);
    const firstImg = item?.images?.[0]?.url;
    const showThumbnail = showPhotos && firstImg;
    const resStatus = item?.metadata?.resolutionStatus || "Pending";

    return (
      <View style={styles.card}>
        {/* AUTHOR HEADER SECTION */}
        <View style={styles.authorContainer}>
          {/* AUTHOR HEADER SECTION */}
          <View style={{ flexDirection: "row" }}>
            <View style={styles.avatarWrapper}>
              {item.creator?.profilePicture ? (
                <Image
                  source={{ uri: item.creator.profilePicture }}
                  style={styles.authorAvatar}
                  transition={200}
                />
              ) : (
                <View style={[styles.authorAvatar, styles.placeholderCircle]}>
                  <User color={GRAY} size={20} />
                </View>
              )}
            </View>

            <View style={{}}>
              <AppText type="bold" style={styles.authorName}>
                {item.creator?.firstName} {item.creator?.lastName}
              </AppText>
              <AppText style={styles.datePosted}>
                Posted {new Date(item.createdAt).toLocaleDateString()}
              </AppText>
            </View>
          </View>

          {canEdit && (
            <View style={styles.actionIcons}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/family/contents/content-form",
                    params: {
                      familyId,
                      contentType,
                      mode: "edit",
                      itemId: item._id,
                    },
                  })
                }
              >
                <Edit3 size={18} color={GRAY} style={{ marginRight: 16 }} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setItemToDelete(item._id);
                  setDeleteModalVisible(true);
                }}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.labelSmall}>
              {isPatriarch
                ? "PATRIARCH NAME"
                : isResolution
                ? "RESOLUTION"
                : "ENTRY TITLE"}
            </AppText>
            <View style={styles.titleWithStatus}>
              <AppText type="bold" style={styles.cardTitle}>
                {item?.title || "Untitled"}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <AppText
            numberOfLines={isDescExpanded ? undefined : 3}
            style={styles.cardDesc}
          >
            {item?.description || "No description provided."}
          </AppText>
          {item?.description && item.description.length > 120 && (
            <TouchableOpacity
              onPress={() =>
                setExpandedDescriptions((prev) => ({
                  ...prev,
                  [item._id]: !isDescExpanded,
                }))
              }
            >
              <AppText style={styles.readMoreText}>
                {isDescExpanded ? "Show Less" : "Read More..."}
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {showThumbnail && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedZoomImage(firstImg)}
          >
            <Image
              source={{ uri: firstImg }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={300}
            />
          </TouchableOpacity>
        )}

        <View style={styles.socialSection}>
          <View style={styles.socialBar}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => handleLike(item._id)}
            >
              <Heart
                size={20}
                color={isLiked ? "#EF4444" : GRAY}
                fill={isLiked ? "#EF4444" : "transparent"}
              />
              <AppText
                style={[styles.socialCount, isLiked && { color: "#EF4444" }]}
              >
                {item?.likes?.length || 0}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() =>
                setActiveCommentId(
                  activeCommentId === item._id ? null : item._id
                )
              }
            >
              <MessageCircle size={20} color={GRAY} />
              <AppText style={styles.socialCount}>{comments.length}</AppText>
            </TouchableOpacity>
          </View>

          {comments.length > 0 && (
            <View style={styles.commentContainer}>
              {displayComments.map((comm: any, index: number) => (
                <View key={comm?._id || index} style={styles.commentRow}>
                  <AppText type="bold" style={styles.commentUser}>
                    {comm?.user?.firstName || "Member"}:
                  </AppText>
                  <AppText style={styles.commentText}>{comm?.text}</AppText>
                </View>
              ))}
              {comments.length > 2 && (
                <TouchableOpacity
                  onPress={() =>
                    setExpandedComments((prev) => ({
                      ...prev,
                      [item._id]: !isCommExpanded,
                    }))
                  }
                >
                  <AppText style={styles.viewAllText}>
                    {isCommExpanded
                      ? "Show fewer"
                      : `View all ${comments.length} comments`}
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeCommentId === item._id && (
            <View style={styles.commentInputWrapper}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity onPress={() => handleSendComment(item._id)}>
                <Send size={20} color={BRAND_YELLOW} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color={TEXT_DARK} />
        </TouchableOpacity>
        {!isSearchActive ? (
          <>
            <AppText type="bold" style={styles.headerTitle}>
              {contentType}
            </AppText>
            <TouchableOpacity onPress={() => setIsSearchActive(true)}>
              <Search size={24} color={TEXT_DARK} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.searchWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => {
                setIsSearchActive(false);
                setSearchQuery("");
              }}
            >
              <X size={20} color={GRAY} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && contents.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND_YELLOW} />
        </View>
      ) : (
        <FlatList
          data={filteredContents}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() =>
                dispatch(fetchFamilyContent({ familyId, type: contentType }))
              }
              tintColor={BRAND_YELLOW}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <UserCircle2 size={64} color={BORDER} />
              <AppText style={styles.emptyText}>No entries yet</AppText>
            </View>
          }
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/family/contents/content-form",
            params: { familyId, contentType, mode: "add" },
          })
        }
      >
        <Plus size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={!!selectedZoomImage}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.zoomOverlay}>
          <TouchableOpacity
            style={styles.zoomCloseArea}
            onPress={() => setSelectedZoomImage(null)}
          />
          <Image
            source={{ uri: selectedZoomImage || "" }}
            style={styles.zoomedImage}
            contentFit="contain"
          />
          <TouchableOpacity
            style={styles.zoomCloseButton}
            onPress={() => setSelectedZoomImage(null)}
          >
            <X color="#FFF" size={32} />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText type="bold" style={styles.modalTitle}>
              Delete Entry?
            </AppText>
            <AppText style={styles.modalSub}>
              This will be permanently removed.
            </AppText>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <AppText type="bold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={confirmDelete}
              >
                <AppText type="bold" style={{ color: "#FFF" }}>
                  Delete
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 18, color: TEXT_DARK },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // AUTHOR STYLES
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  authorName: { fontSize: 14, color: TEXT_DARK },
  datePosted: { fontSize: 11, color: GRAY },

  cardHeader: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  titleWithStatus: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  labelSmall: {
    fontSize: 9,
    color: BRAND_YELLOW,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardTitle: { fontSize: 18, color: TEXT_DARK },
  descriptionContainer: { marginBottom: 8 },
  cardDesc: { color: TEXT_GRAY, lineHeight: 22, fontSize: 15 },
  readMoreText: {
    color: BRAND_YELLOW,
    fontWeight: "700",
    fontSize: 14,
    marginTop: 4,
  },
  thumbnail: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: "#F3F4F6",
  },
  actionIcons: { flexDirection: "row", alignItems: "center" },
  socialSection: { marginTop: 12 },
  socialBar: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  socialBtn: { flexDirection: "row", alignItems: "center", marginRight: 24 },
  socialCount: { marginLeft: 6, fontSize: 14, color: GRAY, fontWeight: "600" },
  commentContainer: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  commentRow: { flexDirection: "row", marginBottom: 4 },
  commentUser: { fontSize: 13, marginRight: 4 },
  commentText: { fontSize: 13, color: TEXT_GRAY, flex: 1 },
  viewAllText: { color: GRAY, fontSize: 12, marginTop: 4, fontWeight: "600" },
  commentInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  commentInput: { flex: 1, paddingVertical: 8, fontSize: 14 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: BRAND_YELLOW,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: { marginTop: 10, color: GRAY, fontSize: 16 },
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomCloseArea: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  zoomedImage: { width: "100%", height: "80%" },
  zoomCloseButton: { position: "absolute", top: 60, right: 20, padding: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, marginBottom: 10 },
  modalSub: { textAlign: "center", color: GRAY, marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },
  deleteBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#EF4444",
    borderRadius: 10,
  },
  avatarWrapper: {
    marginRight: 10,
  },

  placeholderCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
});
