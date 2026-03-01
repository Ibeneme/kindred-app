import React, { useEffect, useState, useRef, memo } from "react";
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
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Play,
  Pause,
  AlertTriangle,
  Heart,
  MessageCircle,
  Send,
  X,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import {
  getNewsByFamily,
  deleteNews,
  likeNews,
  addComment,
} from "@/src/redux/slices/newsSlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";

const DARK = "#111827";
const PRIMARY_YELLOW = "#FBBF24";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";
const RED = "#EF4444";

// ──────────────────────────────────────────────────────────────
//                     MEMOIZED NEWS ITEM
// ──────────────────────────────────────────────────────────────
const NewsItem = memo(
  ({
    item,
    userId,
    isOwner,
    playingVoiceId,
    onPlayVoice,
    onStopVoice,
    onLike,
    onComment,
    onDelete,
    onViewComments,
    onZoomImage,
    familyId,
  }: any) => {
    const router = useRouter();
    const [commentText, setCommentText] = useState("");
    const [showInput, setShowInput] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const isLiked = item?.likes?.includes(userId) ?? false;
    const canEdit =
      isOwner === "true" || isOwner === true || item?.author?._id === userId;

    const TEXT_LIMIT = 120;
    const isLongText = (item?.content?.length ?? 0) > TEXT_LIMIT;
    const displayContent =
      isLongText && !expanded
        ? `${item.content.substring(0, TEXT_LIMIT)}...`
        : item?.content ?? "";

    const handleSend = () => {
      if (!commentText.trim()) return;
      onComment(item._id, commentText.trim());
      setCommentText("");
      setShowInput(false);
      Keyboard.dismiss();
    };

    return (
      <View style={styles.newsCard}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.authorSection}
            onPress={() =>
              item?.author?._id &&
              router.push(`/profile/profile?id=${item.author._id}`)
            }
          >
            <View style={styles.avatar}>
              <AppText style={{ color: "#FFF", fontSize: 16 }}>
                {item?.author?.firstName?.[0] ?? "?"}
              </AppText>
            </View>
            <View>
              <AppText type="bold" style={styles.authorName}>
                {(item?.author?.firstName ?? "") +
                  " " +
                  (item?.author?.lastName ?? "")}
              </AppText>
              <AppText style={styles.dateText}>
                {item?.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : "—"}
              </AppText>
            </View>
          </TouchableOpacity>

          {canEdit && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(routers)/family/news/EditNewsPage",
                    params: { newsId: item._id, familyId },
                  })
                }
              >
                <Edit size={18} color={GRAY} style={{ marginRight: 15 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item._id)}>
                <Trash2 size={18} color={RED} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* IMAGE ZOOM TRIGGER */}
        {item?.images?.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onZoomImage(item.images[0].url)}
          >
            <Image
              source={{ uri: item.images[0].url }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}

        <View style={{ padding: 16 }}>
          <AppText type="bold" style={styles.title}>
            {item?.title ?? "Untitled"}
          </AppText>
          <AppText style={styles.content}>{displayContent}</AppText>

          {isLongText && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <AppText style={styles.seeMore}>
                {expanded ? "See Less" : "See More"}
              </AppText>
            </TouchableOpacity>
          )}

          {item?.voiceNote?.url && (
            <TouchableOpacity
              style={styles.voiceBtn}
              onPress={() =>
                playingVoiceId === item._id
                  ? onStopVoice()
                  : onPlayVoice(item._id, item.voiceNote.url)
              }
            >
              <View style={styles.voiceIcon}>
                {playingVoiceId === item._id ? (
                  <Pause size={18} color={DARK} />
                ) : (
                  <Play size={18} color={DARK} />
                )}
              </View>
              <AppText type="bold" style={{ marginLeft: 8, fontSize: 13 }}>
                Listen to Audio Update
              </AppText>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <View style={styles.interactionBar}>
            <TouchableOpacity
              style={[styles.pill, isLiked && styles.pillLiked]}
              onPress={() => onLike(item._id)}
            >
              <Heart
                size={22}
                color={isLiked ? RED : DARK}
                fill={isLiked ? RED : "transparent"}
              />
              <AppText style={styles.interactionText}>
                {item?.likes?.length ?? 0}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => setShowInput((prev) => !prev)}
            >
              <MessageCircle size={22} color={DARK} />
              <AppText style={styles.interactionText}>
                {item?.comments?.length ?? 0}
              </AppText>
            </TouchableOpacity>
          </View>

          {item?.comments?.length > 0 && (
            <View style={styles.commentsPreview}>
              {item.comments.slice(-2).map((comment: any, idx: number) => (
                <View key={idx} style={styles.commentItem}>
                  <AppText type="bold" style={styles.commentAuthor}>
                    {comment?.author?.firstName ?? "User"}
                  </AppText>
                  <AppText style={styles.commentText} numberOfLines={1}>
                    {comment?.text ?? ""}
                  </AppText>
                </View>
              ))}
              {item.comments.length > 2 && (
                <TouchableOpacity onPress={() => onViewComments(item)}>
                  <AppText style={styles.viewAllText}>
                    View all {item.comments.length} comments
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showInput && (
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={300}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!commentText.trim()}
                style={[
                  styles.sendBtn,
                  { opacity: commentText.trim() ? 1 : 0.4 },
                ]}
              >
                <Send size={18} color={DARK} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }
);

// ──────────────────────────────────────────────────────────────
//                      MAIN NEWS FEED PAGE
// ──────────────────────────────────────────────────────────────
export default function NewsFeedPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { familyId, familyName, isOwner } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
    isOwner: string;
  }>();
  const { user } = useSelector((state: RootState) => state.user);
  const { news, loading } = useSelector((state: RootState) => state.news);

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const feedSoundsRef = useRef<Record<string, Audio.Sound>>({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [detailCommentText, setDetailCommentText] = useState("");

  // ZOOM STATE
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) {
      dispatch(getNewsByFamily(familyId as string));
    }
    return () => {
      Object.values(feedSoundsRef.current).forEach((sound) =>
        sound.unloadAsync()
      );
      feedSoundsRef.current = {};
    };
  }, [familyId, dispatch]);

  const playFeedVoice = async (newsId: string, url: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      if (playingVoiceId && playingVoiceId !== newsId) {
        await feedSoundsRef.current[playingVoiceId]?.pauseAsync();
      }
      let sound = feedSoundsRef.current[newsId];
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        feedSoundsRef.current[newsId] = newSound;
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) setPlayingVoiceId(null);
        });
      } else {
        await sound.replayAsync();
      }
      setPlayingVoiceId(newsId);
    } catch (err) {
      console.error("Voice playback error:", err);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await dispatch(deleteNews(itemToDelete));
    setDeleteModalVisible(false);
    setItemToDelete(null);
    if (selectedPost?._id === itemToDelete) setSelectedPost(null);
  };

  const handleAddDetailComment = () => {
    if (!detailCommentText.trim() || !selectedPost?._id) return;
    dispatch(
      addComment({ newsId: selectedPost._id, text: detailCommentText.trim() })
    );
    setDetailCommentText("");
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (selectedPost ? setSelectedPost(null) : router.back())}
        >
          <ArrowLeft color={DARK} size={24} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {selectedPost ? "Discussion" : familyName || "News Feed"}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {!selectedPost ? (
        <FlatList
          data={news ?? []}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => dispatch(getNewsByFamily(familyId as string))}
              tintColor={PRIMARY_YELLOW}
            />
          }
          renderItem={({ item }) => (
            <NewsItem
              item={item}
              userId={user?._id}
              isOwner={isOwner}
              familyId={familyId}
              playingVoiceId={playingVoiceId}
              onPlayVoice={playFeedVoice}
              onStopVoice={() => setPlayingVoiceId(null)}
              onLike={(id: string) => dispatch(likeNews(id))}
              onComment={(id: string, text: string) =>
                dispatch(addComment({ newsId: id, text }))
              }
              onDelete={(id: string) => {
                setItemToDelete(id);
                setDeleteModalVisible(true);
              }}
              onViewComments={(post: any) => setSelectedPost(post)}
              onZoomImage={(url: string) => setZoomImage(url)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyState}>
                <AppText style={styles.emptyStateText}>
                  No family news yet.
                </AppText>
              </View>
            )
          }
        />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            <NewsItem
              item={selectedPost}
              userId={user?._id}
              isOwner={isOwner}
              familyId={familyId}
              playingVoiceId={playingVoiceId}
              onPlayVoice={playFeedVoice}
              onStopVoice={() => setPlayingVoiceId(null)}
              onLike={(id: string) => dispatch(likeNews(id))}
              onComment={(id: string, text: string) =>
                dispatch(addComment({ newsId: id, text }))
              }
              onDelete={(id: string) => {
                setItemToDelete(id);
                setDeleteModalVisible(true);
              }}
              onViewComments={() => {}}
              onZoomImage={(url: string) => setZoomImage(url)}
            />
            <View style={styles.commentSectionHeader}>
              <AppText type="bold" style={{ fontSize: 16 }}>
                Comments ({selectedPost.comments?.length ?? 0})
              </AppText>
            </View>
            {selectedPost.comments?.map((c: any, i: number) => (
              <View key={i} style={styles.fullCommentItem}>
                <View>
                  <AppText type="bold" style={styles.detailCommentAuthor}>
                    {c?.author?.firstName ?? "User"}
                  </AppText>
                  <AppText style={styles.detailCommentText}>
                    {c?.text ?? ""}
                  </AppText>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.stickyCommentInput}>
            <TextInput
              style={styles.detailInput}
              placeholder="Add a comment..."
              value={detailCommentText}
              onChangeText={setDetailCommentText}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              onPress={handleAddDetailComment}
              disabled={!detailCommentText.trim()}
              style={[
                styles.sendIconBtn,
                { opacity: detailCommentText.trim() ? 1 : 0.4 },
              ]}
            >
              <Send size={20} color={DARK} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* PHOTO ZOOM MODAL */}
      <Modal visible={!!zoomImage} transparent={true} animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity
            style={styles.zoomCloseArea}
            onPress={() => setZoomImage(null)}
          />
          <Image
            source={{ uri: zoomImage || "" }}
            style={styles.zoomedImage}
            contentFit="contain"
          />
          <TouchableOpacity
            style={styles.zoomCloseButton}
            onPress={() => setZoomImage(null)}
          >
            <X color="#FFF" size={32} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <AlertTriangle
              color={RED}
              size={48}
              style={{ alignSelf: "center", marginBottom: 15 }}
            />
            <AppText type="bold" style={styles.modalTitle}>
              Confirm Delete
            </AppText>
            <AppText style={styles.modalSub}>
              Are you sure you want to remove this post? This action cannot be
              undone.
            </AppText>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <AppText type="bold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
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

      {!selectedPost && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/(routers)/family/news/CreateNewsPage",
              params: { familyId },
            })
          }
        >
          <Plus color={DARK} size={28} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GRAY,
  },
  backButton: { padding: 8, borderRadius: 12, backgroundColor: LIGHT_GRAY },
  headerTitle: { fontSize: 18, color: DARK },
  newsCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  authorSection: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  authorName: { fontSize: 15, color: DARK },
  dateText: { fontSize: 12, color: GRAY, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  cardImage: { width: "100%", height: 250, backgroundColor: LIGHT_GRAY },
  title: { fontSize: 18, color: DARK, marginBottom: 8 },
  content: { fontSize: 15, lineHeight: 22, color: "#374151" },
  seeMore: { color: PRIMARY_YELLOW, fontWeight: "700", marginTop: 5 },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GRAY,
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
  },
  voiceIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: LIGHT_GRAY, marginVertical: 16 },
  interactionBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  interactionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: DARK,
  },
  commentsPreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  viewAllText: { fontSize: 13, color: PRIMARY_YELLOW, fontWeight: "700" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    gap: 6,
  },
  pillLiked: { backgroundColor: "#FFE4E6" },
  commentItem: { flexDirection: "row", marginBottom: 4 },
  commentAuthor: { fontSize: 13, color: DARK, marginRight: 4 },
  commentText: { fontSize: 13, color: "#4B5563", flex: 1 },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FAFAFA",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GRAY,
  },
  fullCommentItem: { flexDirection: "row", padding: 16 },
  detailCommentAuthor: { fontSize: 13, marginBottom: 2 },
  detailCommentText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  stickyCommentInput: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: LIGHT_GRAY,
  },
  detailInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  sendIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  deleteModal: { backgroundColor: "#FFF", borderRadius: 25, padding: 25 },
  modalTitle: { fontSize: 20, textAlign: "center", marginBottom: 10 },
  modalSub: {
    fontSize: 15,
    color: GRAY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: LIGHT_GRAY,
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: RED,
    alignItems: "center",
  },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyStateText: { color: GRAY, fontSize: 16, marginTop: 10 },
  // ZOOM STYLES
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomCloseArea: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  zoomedImage: { width: "100%", height: "80%" },
  zoomCloseButton: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
  },
});
