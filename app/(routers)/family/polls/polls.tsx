import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  BarChart3,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  fetchPollsByFamily,
  voteInPoll,
  deletePoll,
} from "@/src/redux/slices/pollSlice";

const PollsPage = () => {
  const router = useRouter();
  const { familyId, isOwner } = useLocalSearchParams<{
    familyId: string;
    isOwner: string;
  }>();

  // (B) Logic: Only admins/moderators can launch polls.
  // userIsOwner acts as our admin/moderator check here.
  const userIsOwner = isOwner === "true";

  const dispatch = useDispatch<AppDispatch>();
  const { polls = [], loading = false } = useSelector(
    (state: RootState) => state.polls
  );

  const [refreshing, setRefreshing] = useState(false);
  // (A) State to track local selection to prevent double-tap before server response
  const [optimisticVotes, setOptimisticVotes] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (familyId) {
      dispatch(fetchPollsByFamily(familyId));
    }
  }, [familyId, dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchPollsByFamily(familyId)).finally(() => setRefreshing(false));
  }, [familyId, dispatch]);

  // (C) Helper to check if the window for voting has closed
  const isPollClosed = (endDate: string | Date) => {
    if (!endDate) return false;
    return new Date(endDate).getTime() < Date.now();
  };

  const handleVote = async (pollId: string, optionId: string) => {
    const poll = polls.find((p) => p._id === pollId);
    if (!poll) return;

    // (C) Restriction: Check if window has passed
    if (isPollClosed(poll?.endDate)) {
      Alert.alert("Poll Closed", "Voting has ended for this poll.");
      return;
    }

    // (A) Restriction: Prevent voting twice or changing choice if logic forbids it
    if (poll.userVotedOptionId || optimisticVotes[pollId]) {
      Alert.alert("Already Voted", "You have already cast your vote.");
      return;
    }

    setOptimisticVotes((prev) => ({ ...prev, [pollId]: optionId }));

    const result = await dispatch(voteInPoll({ pollId, optionId }));

    if (voteInPoll.rejected.match(result)) {
      // Rollback optimistic vote on error
      setOptimisticVotes((prev) => {
        const next = { ...prev };
        delete next[pollId];
        return next;
      });
      Alert.alert("Error", "Failed to cast vote. Please try again.");
    }
  };

  const navigateToCreate = () => {
    // (B) Double check even if FAB is hidden
    if (!userIsOwner) {
      Alert.alert("Restricted", "Only admins/moderators can launch polls.");
      return;
    }
    router.push({
      pathname: "/family/polls/create-poll",
      params: { familyId },
    });
  };

  const renderPollCard = ({ item }: { item: any }) => {
    const totalVotes = item.totalVotes || 0;
    const closed = isPollClosed(item.endDate);
    const hasVoted = !!item.userVotedOptionId || !!optimisticVotes[item._id];
    const selectedOptionId =
      optimisticVotes[item._id] || item.userVotedOptionId;

    return (
      <View style={[styles.card, closed && styles.closedCard]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <AppText type="bold" style={styles.pollTitle}>
                {item.title}
              </AppText>
              {closed && (
                <View style={styles.closedBadge}>
                  <AppText style={styles.closedBadgeText}>Closed</AppText>
                </View>
              )}
            </View>
            {item.description && (
              <AppText style={styles.pollDesc}>{item.description}</AppText>
            )}
          </View>
          {userIsOwner && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Delete Poll",
                  "Are you sure? Results will be lost.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => dispatch(deletePoll(item._id)),
                    },
                  ]
                );
              }}
              style={styles.deleteBtn}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.optionsContainer}>
          {item.options.map((opt: any) => {
            const voteCount = opt.votes?.length || 0;
            const percentage =
              totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = selectedOptionId === opt._id;

            return (
              <TouchableOpacity
                key={opt._id}
                style={[
                  styles.optionRow,
                  isSelected && styles.selectedOption,
                  (closed || hasVoted) && styles.disabledOption,
                ]}
                onPress={() => handleVote(item._id, opt._id)}
                // (C) Disable interaction if closed or (A) already voted
                disabled={closed || hasVoted}
                activeOpacity={0.7}
              >
                {(hasVoted || closed) && (
                  <View
                    style={[styles.progressBg, { width: `${percentage}%` }]}
                  />
                )}
                <View style={styles.optionContent}>
                  <View style={styles.optionTextRow}>
                    {isSelected ? (
                      <CheckCircle2 size={20} color="#EAB308" />
                    ) : (
                      <Circle size={20} color="#D1D5DB" />
                    )}
                    <AppText
                      style={[styles.optionText, isSelected && styles.boldText]}
                    >
                      {opt.text}
                    </AppText>
                  </View>
                  {(hasVoted || closed) && (
                    <AppText style={styles.percentageText}>
                      {percentage}%
                    </AppText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.cardFooter}>
          <AppText style={styles.voteCountText}>
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </AppText>
          <View style={styles.footerRight}>
            <Clock size={14} color={closed ? "#EF4444" : "#9CA3AF"} />
            <AppText style={[styles.dateText, closed && { color: "#EF4444" }]}>
              {closed
                ? "Voting Closed"
                : `Ends ${new Date(item.endDate).toLocaleDateString()}`}
            </AppText>
          </View>
        </View>
      </View>
    );
  };

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
          Family Polls
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading && polls.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#EAB308" size="large" />
        </View>
      ) : (
        <FlatList
          data={polls}
          renderItem={renderPollCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EAB308"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BarChart3 size={48} color="#D1D5DB" />
              <AppText style={styles.emptyText}>
                No polls active right now.
              </AppText>
              {userIsOwner && (
                <AppText style={{ color: "#9CA3AF", marginTop: 5 }}>
                  Launch one to get family feedback!
                </AppText>
              )}
            </View>
          }
        />
      )}

      {/* (B) Security: Only show FAB to Admin/Moderator */}
      {userIsOwner && (
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToCreate}
          activeOpacity={0.8}
        >
          <Plus size={30} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    height: 64,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, color: "#111827" },
  list: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  closedCard: {
    backgroundColor: "#F9FAFB",
    opacity: 0.95,
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  pollTitle: { fontSize: 16, flex: 1, color: "#111827" },
  closedBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closedBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  pollDesc: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  optionsContainer: { gap: 10 },
  optionRow: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectedOption: { borderColor: "#EAB308", backgroundColor: "#FFFBEB" },
  disabledOption: { opacity: 0.9 },
  progressBg: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#FEF3C7",
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    alignItems: "center",
  },
  optionTextRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  optionText: { fontSize: 14, color: "#374151" },
  boldText: { fontWeight: "700", color: "#111827" },
  percentageText: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  voteCountText: { fontSize: 12, color: "#6B7280" },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, color: "#9CA3AF" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 100,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyText: { color: "#9CA3AF", fontSize: 16, textAlign: "center" },
  deleteBtn: { padding: 5 },
});

export default PollsPage;
