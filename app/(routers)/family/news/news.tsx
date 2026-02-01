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
const RED = "#EF4444";

// --- MEMOIZED NEWS ITEM COMPONENT ---
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
    familyId,
  }: any) => {
    const router = useRouter();
    const [commentText, setCommentText] = useState("");
    const [showInput, setShowInput] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const isLiked = item.likes?.includes(userId);
    const canEdit =
      isOwner === "true" || isOwner === true || item.author?._id === userId;

    // Truncate logic
    const TEXT_LIMIT = 120;
    const isLongText = item.content?.length > TEXT_LIMIT;
    const displayContent =
      isLongText && !expanded
        ? `${item.content.substring(0, TEXT_LIMIT)}...`
        : item.content;

    const handleSend = () => {
      if (!commentText.trim()) return;
      onComment(item._id, commentText);
      setCommentText("");
      setShowInput(false);
    };

    return (
      <View style={styles.newsCard}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.authorSection}
            onPress={() =>
              item.author?._id &&
              router.push(`/profile/profile?id=${item.author._id}`)
            }
          >
            <View style={styles.avatar}>
              <AppText style={{ color: "#FFF" }}>
                {item.author?.firstName ? item.author.firstName[0] : "?"}
              </AppText>
            </View>
            <View>
              <AppText type="bold">
                {item.author?.firstName} {item.author?.lastName}
              </AppText>
              <AppText style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString()}
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

        {item.images?.length > 0 && (
          <Image
            source={{ uri: item.images[0].url }}
            style={styles.cardImage}
            contentFit="cover"
          />
        )}

        <View style={{ padding: 15 }}>
          <AppText type="bold" style={styles.title}>
            {item.title}
          </AppText>
          <AppText style={styles.content}>{displayContent}</AppText>

          {isLongText && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <AppText style={styles.seeMore}>
                {expanded ? "See Less" : "See More"}
              </AppText>
            </TouchableOpacity>
          )}

          {item.voiceNote?.url && (
            <TouchableOpacity
              style={styles.voiceBtn}
              onPress={() =>
                playingVoiceId === item._id
                  ? onStopVoice()
                  : onPlayVoice(item._id, item.voiceNote.url)
              }
            >
              {playingVoiceId === item._id ? (
                <Pause size={20} color={DARK} />
              ) : (
                <Play size={20} color={DARK} />
              )}
              <AppText>Listen to Update</AppText>
            </TouchableOpacity>
          )}

          <View style={styles.interactionBar}>
            <TouchableOpacity
              style={styles.interactionBtn}
              onPress={() => onLike(item._id)}
            >
              <Heart
                size={22}
                color={isLiked ? RED : DARK}
                fill={isLiked ? RED : "transparent"}
              />
              <AppText style={styles.interactionText}>
                {item.likes?.length || 0}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.interactionBtn}
              onPress={() => setShowInput(!showInput)}
            >
              <MessageCircle size={22} color={DARK} />
              <AppText style={styles.interactionText}>
                {item.comments?.length || 0}
              </AppText>
            </TouchableOpacity>
          </View>

          {item.comments?.length > 0 && (
            <View style={styles.commentsPreview}>
              {item.comments.slice(-2).map((comment: any, idx: number) => (
                <View key={idx} style={styles.commentItem}>
                  <AppText type="bold" style={styles.commentAuthor}>
                    {comment.author?.firstName}:{" "}
                  </AppText>
                  <AppText style={styles.commentText}>{comment.text}</AppText>
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
                placeholder="Write a comment..."
                value={commentText}
                onChangeText={setCommentText}
                autoFocus
              />
              <TouchableOpacity onPress={handleSend}>
                <Send size={20} color={PRIMARY_YELLOW} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }
);

// --- MAIN FEED PAGE ---
const NewsFeedPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId, familyName, isOwner } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
    isOwner: string;
  }>();

  const { user } = useSelector((state: RootState) => state.auth);
  const { news, loading } = useSelector((state: RootState) => state.news);

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const feedSoundsRef = useRef<Record<string, Audio.Sound>>({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // State for Viewing Single Post/All Comments
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [detailCommentText, setDetailCommentText] = useState("");

  useEffect(() => {
    dispatch(getNewsByFamily(familyId));
    return () => {
      Object.values(feedSoundsRef.current).forEach((s) => s.unloadAsync());
    };
  }, [familyId]);

  // Sync selectedPost if news updates (for real-time comment updates)
  useEffect(() => {
    if (selectedPost) {
      const updatedPost = news.find((n) => n._id === selectedPost._id);
      if (updatedPost) setSelectedPost(updatedPost);
    }
  }, [news]);

  const playFeedVoice = async (newsId: string, url: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      if (playingVoiceId)
        await feedSoundsRef.current[playingVoiceId]?.pauseAsync();
      let sound = feedSoundsRef.current[newsId];
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        feedSoundsRef.current[newsId] = newSound;
        newSound.setOnPlaybackStatusUpdate((st: any) => {
          if (st.didJustFinish) setPlayingVoiceId(null);
        });
      } else {
        await sound.replayAsync();
      }
      setPlayingVoiceId(newsId);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await dispatch(deleteNews(itemToDelete));
      setDeleteModalVisible(false);
      setItemToDelete(null);
      if (selectedPost?._id === itemToDelete) setSelectedPost(null);
    }
  };

  const handleAddDetailComment = () => {
    if (!detailCommentText.trim() || !selectedPost) return;
    dispatch(addComment({ newsId: selectedPost._id, text: detailCommentText }));
    setDetailCommentText("");
  };

  // If a user clicks "View All Comments", show this View instead of the FlatList
  if (selectedPost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedPost(null)}>
            <ArrowLeft color={DARK} />
          </TouchableOpacity>
          <AppText type="bold" style={{ fontSize: 18 }}>
            Post Discussion
          </AppText>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <ScrollView contentContainerStyle={{ padding: 16 }}>
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
              onViewComments={() => {}} // Already in detail view
            />

            <AppText type="bold" style={{ marginBottom: 15, fontSize: 16 }}>
              All Comments
            </AppText>
            {selectedPost.comments?.map((c: any, i: number) => (
              <View key={i} style={styles.fullCommentItem}>
                <View style={styles.commentAvatar}>
                  <AppText style={{ color: "#FFF", fontSize: 10 }}>
                    {c.author?.firstName?.[0]}
                  </AppText>
                </View>
                <View style={styles.commentBubble}>
                  <AppText type="bold" style={{ fontSize: 13 }}>
                    {c.author?.firstName} {c.author?.lastName}
                  </AppText>
                  <AppText style={{ fontSize: 14 }}>{c.text}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.stickyCommentInput}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={detailCommentText}
              onChangeText={setDetailCommentText}
            />
            <TouchableOpacity onPress={handleAddDetailComment}>
              <Send size={24} color={PRIMARY_YELLOW} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color={DARK} />
          </TouchableOpacity>
          <AppText type="bold" style={{ fontSize: 18 }}>
            {familyName}
          </AppText>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={news}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => dispatch(getNewsByFamily(familyId))}
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
            />
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      </KeyboardAvoidingView>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <AlertTriangle
              color={RED}
              size={48}
              style={{ alignSelf: "center", marginBottom: 10 }}
            />
            <AppText type="bold" style={styles.modalTitle}>
              Confirm Delete
            </AppText>
            <AppText style={styles.modalSub}>
              This action cannot be undone.
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/(routers)/family/news/CreateNewsPage",
            params: { familyId },
          })
        }
      >
        <Plus color="#FFF" size={30} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  newsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
  },
  cardHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorSection: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_YELLOW,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardImage: { width: "100%", height: 220 },
  title: { fontSize: 18, marginBottom: 5 },
  content: { color: "#4B5563", lineHeight: 20 },
  seeMore: { color: PRIMARY_YELLOW, fontWeight: "bold", marginTop: 5 },
  dateText: { fontSize: 11, color: GRAY },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 8,
  },
  interactionBar: {
    flexDirection: "row",
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  interactionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  interactionText: {
    marginLeft: 6,
    fontSize: 14,
    color: DARK,
    fontWeight: "600",
  },
  commentsPreview: {
    marginTop: 10,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
  },
  viewAllText: { color: GRAY, fontSize: 13, marginTop: 8, fontWeight: "600" },
  commentItem: { flexDirection: "row", marginBottom: 4 },
  commentAuthor: { fontSize: 13, color: DARK },
  commentText: { fontSize: 13, color: "#4B5563" },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  commentInput: { flex: 1, height: 40, fontSize: 14 },
  fullCommentItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GRAY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 4,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 12,
  },
  stickyCommentInput: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderColor: "#EEE",
    gap: 10,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    backgroundColor: PRIMARY_YELLOW,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  headerActions: { flexDirection: "row", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModal: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: { fontSize: 20, textAlign: "center", marginBottom: 10 },
  modalSub: { textAlign: "center", color: GRAY, marginBottom: 25 },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: "center",
  },
});

export default NewsFeedPage;
