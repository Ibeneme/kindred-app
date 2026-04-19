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
  Volume2,
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

const DARK = "#0F172A";
const PRIMARY_YELLOW = "#FFE66D";
const GRAY = "#64748B";
const LIGHT_GRAY = "#F8FAFC";
const BORDER = "#E2E8F0";
const RED = "#F43F5E";

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
        {/* AUTHOR HEADER */}
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.authorSection}
            onPress={() =>
              item?.author?._id &&
              router.push(`/profile/profile?id=${item.author._id}`)
            }
          >
            <View style={styles.avatar}>
              <AppText type="bold" style={{ color: DARK, fontSize: 16 }}>
                {item?.author?.firstName?.[0] ?? "?"}
              </AppText>
            </View>
            <View>
              <AppText type="bold" style={styles.authorName}>
                {`${item?.author?.firstName ?? ""} ${
                  item?.author?.lastName ?? ""
                }`}
              </AppText>
              <AppText style={styles.dateText}>
                {item?.createdAt
                  ? new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
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
                style={styles.editBtn}
              >
                <Edit size={16} color={GRAY} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(item._id)}
                style={styles.trashBtn}
              >
                <Trash2 size={16} color={RED} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* MEDIA */}
        {item?.images?.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onZoomImage(item.images[0].url)}
          >
            <Image
              source={{ uri: item.images[0].url }}
              style={styles.cardImage}
              contentFit="cover"
              transition={300}
            />
          </TouchableOpacity>
        )}

        <View style={styles.cardContentBody}>
          <AppText type="bold" style={styles.title}>
            {item?.title ?? "Untitled Update"}
          </AppText>
          <AppText style={styles.content}>{displayContent}</AppText>

          {isLongText && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <AppText style={styles.seeMore}>
                {expanded ? "Read Less" : "Read More"}
              </AppText>
            </TouchableOpacity>
          )}

          {item?.voiceNote?.url && (
            <TouchableOpacity
              style={[
                styles.voiceBtn,
                playingVoiceId === item._id && styles.voiceBtnActive,
              ]}
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
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText type="bold" style={{ fontSize: 13, color: DARK }}>
                  Voice Update
                </AppText>
                <AppText style={{ fontSize: 11, color: GRAY }}>
                  {playingVoiceId === item._id ? "Playing..." : "Tap to listen"}
                </AppText>
              </View>
              <Volume2 size={18} color={GRAY} />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          {/* INTERACTIONS */}
          <View style={styles.interactionBar}>
            <TouchableOpacity
              style={[styles.pill, isLiked && styles.pillLiked]}
              onPress={() => onLike(item._id)}
            >
              <Heart
                size={20}
                color={isLiked ? RED : DARK}
                fill={isLiked ? RED : "transparent"}
              />
              <AppText type="bold" style={styles.interactionText}>
                {item?.likes?.length ?? 0}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => setShowInput((prev) => !prev)}
            >
              <MessageCircle size={20} color={DARK} />
              <AppText type="bold" style={styles.interactionText}>
                {item?.comments?.length ?? 0}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* COMMENTS PREVIEW */}
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
                    View all {item.comments.length} responses
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showInput && (
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Say something to the family..."
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
                <Send size={16} color={DARK} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }
);

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
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) dispatch(getNewsByFamily(familyId as string));
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
      if (playingVoiceId && playingVoiceId !== newsId)
        await feedSoundsRef.current[playingVoiceId]?.pauseAsync();
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
      console.error("Voice error:", err);
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
          <ArrowLeft color={DARK} size={22} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AppText type="bold" style={styles.headerTitle}>
            {selectedPost ? "Discussion" : familyName || "News Feed"}
          </AppText>
          {!selectedPost && (
            <AppText style={styles.headerSub}>Latest Circle Updates</AppText>
          )}
        </View>
        <View style={{ width: 44 }} />
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
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyState}>
                <MessageCircle size={48} color={BORDER} />
                <AppText style={styles.emptyStateText}>
                  Silence in the circle. Start a conversation!
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
              <AppText type="bold" style={{ fontSize: 16, color: DARK }}>
                Comments ({selectedPost.comments?.length ?? 0})
              </AppText>
            </View>
            {selectedPost.comments?.map((c: any, i: number) => (
              <View key={i} style={styles.fullCommentItem}>
                <View style={styles.detailCommentBubble}>
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
              placeholder="Write a response..."
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

      {/* ZOOM & DELETE MODALS (UNTOUCHED LOGIC, UPDATED STYLES) */}
      <Modal visible={!!zoomImage} transparent animationType="fade">
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
            <X color="#FFF" size={28} />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <AlertTriangle
              color={RED}
              size={40}
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <AppText type="bold" style={styles.modalTitle}>
              Delete Post?
            </AppText>
            <AppText style={styles.modalSub}>
              This will remove the update from the family sanctuary forever.
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
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: "/(routers)/family/news/CreateNewsPage",
              params: { familyId },
            })
          }
        >
          <Plus color={DARK} size={32} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitleContainer: { alignItems: "center" },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: LIGHT_GRAY,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, color: DARK },
  headerSub: { fontSize: 11, color: GRAY, marginTop: 1 },
  newsCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  authorSection: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  authorName: { fontSize: 15, color: DARK },
  dateText: { fontSize: 11, color: GRAY, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  editBtn: { padding: 8 },
  trashBtn: { padding: 8 },
  cardImage: { width: "100%", height: 280, backgroundColor: LIGHT_GRAY },
  cardContentBody: { padding: 16 },
  title: { fontSize: 18, color: DARK, marginBottom: 8, lineHeight: 24 },
  content: { fontSize: 15, lineHeight: 24, color: "#334155" },
  seeMore: { color: "#854D0E", fontWeight: "800", marginTop: 8 },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFCE8",
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FEF9C3",
  },
  voiceBtnActive: {
    backgroundColor: PRIMARY_YELLOW,
    borderColor: PRIMARY_YELLOW,
  },
  voiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 20 },
  interactionBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  interactionText: { marginLeft: 6, fontSize: 14, color: DARK },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GRAY,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 100,
    gap: 4,
  },
  pillLiked: { backgroundColor: "#FFE4E6" },
  commentsPreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  viewAllText: { fontSize: 13, color: DARK, fontWeight: "800", marginTop: 10 },
  commentItem: { flexDirection: "row", marginBottom: 6 },
  commentAuthor: { fontSize: 13, color: DARK, marginRight: 6 },
  commentText: { fontSize: 13, color: "#475569", flex: 1 },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  commentInput: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 40,
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  commentSectionHeader: { paddingHorizontal: 20, paddingVertical: 20 },
  fullCommentItem: { paddingHorizontal: 20, marginBottom: 12 },
  detailCommentBubble: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailCommentAuthor: { fontSize: 13, marginBottom: 4, color: DARK },
  detailCommentText: { fontSize: 14, color: "#334155", lineHeight: 20 },
  stickyCommentInput: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  detailInput: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  sendIconBtn: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 24,
  },
  deleteModal: {
    backgroundColor: "#FFF",
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, color: DARK, marginBottom: 8 },
  modalSub: {
    fontSize: 14,
    color: GRAY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: LIGHT_GRAY,
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: RED,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    color: GRAY,
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
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
    width: 50,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});
