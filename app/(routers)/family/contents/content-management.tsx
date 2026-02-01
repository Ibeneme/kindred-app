import React, { useEffect, useState, useMemo, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  Calendar,
  CheckCircle2,
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

type FilterMode = "all" | "upcoming" | "past" | "pending" | "completed";

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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Animation refs for filter toggles
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(0.95)).current;

  const isKeyDate = contentType === "Key Date";
  const isTask = contentType === "Task";
  const showPhotos =
    contentType !== "Patriarch" &&
    contentType !== "Key Date" &&
    contentType !== "Task";

  const hasSocial = [
    "Village Tradition",
    "Family History",
    "Family Tree",
    "Suggestion Box",
  ].includes(contentType);

  useEffect(() => {
    if (familyId && contentType) {
      console.log(
        `Fetching content for family: ${familyId}, type: ${contentType}`
      );
      dispatch(fetchFamilyContent({ familyId, type: contentType }));
    }
  }, [familyId, contentType, dispatch]);

  // Animate filter toggle appearance
  useEffect(() => {
    dispatch(fetchUserProfile());
    if (isKeyDate || isTask) {
      Animated.parallel([
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(animScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [filterMode]);

  const filteredContents = useMemo(() => {
    let result = [...(contents || [])];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item?.title?.toLowerCase().includes(q) ||
          item?.description?.toLowerCase().includes(q)
      );
    }

    // Type-specific filters
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isKeyDate) {
      if (filterMode === "upcoming") {
        result = result.filter((item) => {
          const eventDate = new Date(item?.metadata?.eventDate);
          return !isNaN(eventDate.getTime()) && eventDate >= today;
        });
      } else if (filterMode === "past") {
        result = result.filter((item) => {
          const eventDate = new Date(item?.metadata?.eventDate);
          return !isNaN(eventDate.getTime()) && eventDate < today;
        });
      }
    }

    if (isTask) {
      if (filterMode === "pending") {
        result = result.filter((item) => !item?.metadata?.completed);
      } else if (filterMode === "completed") {
        result = result.filter((item) => !!item?.metadata?.completed);
      }
    }

    return result;
  }, [contents, searchQuery, filterMode, isKeyDate, isTask]);

  const handleLike = (id: string) => {
    if (!user?._id) {
      console.warn("User not logged in - cannot like");
      return;
    }
    console.log(`Toggling like on content ${id}`);
    dispatch(toggleLikeOptimistic({ id, userId: user._id }));
    dispatch(likeFamilyContent(id));
  };

  const handleSendComment = (id: string) => {
    if (!commentText.trim()) return;
    console.log(`Adding comment to ${id}: ${commentText}`);
    dispatch(addFamilyContentComment({ id, text: commentText.trim() }));
    setCommentText("");
    setActiveCommentId(null);
    setExpandedComments((prev) => ({ ...prev, [id]: true }));
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      console.log(`Deleting content ${itemToDelete}`);
      dispatch(deleteFamilyContent(itemToDelete));
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  };

  const renderFilterToggle = () => {
    if (!isKeyDate && !isTask) return null;

    return (
      <Animated.View
        style={[
          styles.filterRow,
          { opacity: animOpacity, transform: [{ scale: animScale }] },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterMode === (isKeyDate ? "upcoming" : "pending") &&
              styles.filterBtnActive,
          ]}
          onPress={() => setFilterMode(isKeyDate ? "upcoming" : "pending")}
        >
          <AppText style={styles.filterText}>
            {isKeyDate ? "Upcoming" : "Pending"}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterMode === (isKeyDate ? "past" : "completed") &&
              styles.filterBtnActive,
          ]}
          onPress={() => setFilterMode(isKeyDate ? "past" : "completed")}
        >
          <AppText style={styles.filterText}>
            {isKeyDate ? "Past" : "Completed"}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterMode === "all" && styles.filterBtnActive,
          ]}
          onPress={() => setFilterMode("all")}
        >
          <AppText style={styles.filterText}>All</AppText>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isLiked =
      Array.isArray(item?.likes) && item.likes.includes(user?._id);
    const isExpanded = expandedComments[item._id];
    const displayComments = isExpanded
      ? item?.comments || []
      : (item?.comments || []).slice(-2);

    const firstImg = item?.images?.[0]?.url;
    const showThumbnail = showPhotos && firstImg;

    let extraBadge = null;
    if (isKeyDate && item?.metadata?.eventDate) {
      const eventDate = new Date(item.metadata.eventDate);
      extraBadge = (
        <View style={[styles.badge, { backgroundColor: "#E0F2FE" }]}>
          <Calendar size={14} color="#0369A1" />
          <AppText style={[styles.badgeText, { color: "#0369A1" }]}>
            {eventDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </AppText>
        </View>
      );
    } else if (isTask) {
      const isDone = !!item?.metadata?.completed;
      extraBadge = (
        <View
          style={[
            styles.badge,
            { backgroundColor: isDone ? "#DCFCE7" : "#FEF3C7" },
          ]}
        >
          <CheckCircle2 size={14} color={isDone ? "#16A34A" : "#D97706"} />
          <AppText
            style={[
              styles.badgeText,
              { color: isDone ? "#166534" : "#92400E" },
            ]}
          >
            {isDone ? "Completed" : "Pending"}
          </AppText>
        </View>
      );
    } else if (contentType === "Suggestion Box") {
      const status = item?.metadata?.status || "pending";
      const statusColors = {
        pending: { bg: "#FEF3C7", text: "#92400E" },
        reviewed: { bg: "#DBEAFE", text: "#1E40AF" },
        implemented: { bg: "#DCFCE7", text: "#166534" },
      };
      const colors = statusColors[status as keyof typeof statusColors];

      extraBadge = (
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <AppText
            style={[
              styles.badgeText,
              { color: colors.text, textTransform: "capitalize" },
            ]}
          >
            {status}
          </AppText>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/family/contents/content-form",
              params: { familyId, contentType, mode: "view", itemId: item._id },
            })
          }
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <AppText type="bold" style={styles.cardTitle}>
                {item?.title || "Untitled Entry"}
              </AppText>
              {extraBadge}
            </View>

            {canEdit && (
              <View style={styles.actionIcons}>
                <TouchableOpacity
                  hitSlop={12}
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
                  <Edit3 size={20} color={GRAY} style={{ marginRight: 16 }} />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={12}
                  onPress={() => {
                    setItemToDelete(item._id);
                    setDeleteModalVisible(true);
                  }}
                >
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <AppText numberOfLines={4} style={styles.cardDesc}>
            {item?.description || "No description provided."}
          </AppText>

          {showThumbnail && (
            <Image
              source={{ uri: firstImg }}
              style={
                contentType === "Village Tradition"
                  ? styles.traditionImage
                  : styles.thumbnail
              }
              contentFit={
                contentType === "Village Tradition" ? "contain" : "cover"
              }
              transition={200}
            />
          )}
        </TouchableOpacity>

        {hasSocial && (
          <>
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
                <AppText style={styles.socialCount}>
                  {item?.comments?.length || 0}
                </AppText>
              </TouchableOpacity>
            </View>

            {item?.comments?.length > 0 && (
              <View style={styles.commentContainer}>
                {displayComments.map((comm: any, i: number) => (
                  <View key={i} style={styles.commentRow}>
                    <AppText type="bold" style={styles.commentUser}>
                      {comm?.user?.firstName || "User"}:
                    </AppText>
                    <AppText style={styles.commentText}>{comm?.text}</AppText>
                  </View>
                ))}

                {item.comments.length > 2 && (
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedComments((prev) => ({
                        ...prev,
                        [item._id]: !isExpanded,
                      }))
                    }
                  >
                    <AppText style={styles.viewAllText}>
                      {isExpanded
                        ? "Show fewer comments"
                        : `View all ${item.comments.length} comments`}
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeCommentId === item._id && (
              <View style={styles.commentInputWrapper}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  autoFocus
                  multiline
                  maxLength={300}
                />
                <TouchableOpacity onPress={() => handleSendComment(item._id)}>
                  <Send size={22} color={BRAND_YELLOW} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          {!isSearchActive ? (
            <>
              <TouchableOpacity onPress={() => router.back()}>
                <ChevronLeft size={26} color={TEXT_DARK} />
              </TouchableOpacity>
              <AppText type="bold" style={styles.headerTitle}>
                {contentType.replace(/([A-Z])/g, " $1").trim()}
              </AppText>
              <TouchableOpacity onPress={() => setIsSearchActive(true)}>
                <Search size={24} color={TEXT_DARK} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.searchWrapper}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search entries..."
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
                <X size={24} color={GRAY} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {renderFilterToggle()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_YELLOW} />
            <AppText style={styles.loadingText}>
              Loading family content...
            </AppText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertTriangle size={40} color="#EF4444" />
            <AppText style={styles.errorText}>Failed to load content</AppText>
            <AppText style={styles.errorSubText}>{error}</AppText>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() =>
                dispatch(fetchFamilyContent({ familyId, type: contentType }))
              }
            >
              <AppText type="bold" style={{ color: "#FFF" }}>
                Try Again
              </AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredContents}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
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
              <View style={styles.emptyContainer}>
                <AppText style={styles.emptyText}>No entries found</AppText>
                <AppText style={styles.emptySubText}>
                  {canEdit
                    ? "Tap + to create your first entry"
                    : "Check back later"}
                </AppText>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>

      {canEdit && (
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
      )}

      {/* Delete Confirmation */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <AlertTriangle
              color="#EF4444"
              size={48}
              style={{ marginBottom: 16 }}
            />
            <AppText type="bold" style={styles.modalTitle}>
              Delete this entry?
            </AppText>
            <AppText style={styles.modalSubtitle}>
              This action cannot be undone.
            </AppText>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <AppText type="bold" style={{ color: TEXT_DARK }}>
                  Cancel
                </AppText>
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

// ── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 20,
    color: TEXT_DARK,
    textTransform: "capitalize",
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT_DARK,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    gap: 12,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterBtnActive: {
    backgroundColor: BRAND_YELLOW,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  cardDesc: {
    color: TEXT_GRAY,
    lineHeight: 22,
    fontSize: 15,
    marginBottom: 12,
  },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 8,
  },
  traditionImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginTop: 10,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  socialBar: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 32,
  },
  socialCount: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: GRAY,
  },
  commentContainer: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  commentRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 6,
  },
  commentUser: {
    fontSize: 14,
    color: TEXT_DARK,
  },
  commentText: {
    fontSize: 14,
    color: TEXT_GRAY,
    flex: 1,
  },
  viewAllText: {
    color: GRAY,
    fontSize: 13,
    marginTop: 8,
    fontWeight: "600",
  },
  commentInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 40,
    maxHeight: 100,
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    backgroundColor: BRAND_YELLOW,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  confirmBox: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    color: TEXT_DARK,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: GRAY,
    textAlign: "center",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: GRAY,
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  errorSubText: {
    fontSize: 15,
    color: GRAY,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: BRAND_YELLOW,
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  emptySubText: {
    fontSize: 15,
    color: GRAY,
    textAlign: "center",
  },
});
