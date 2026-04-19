import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Dimensions,
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
  Search,
  X,
  Vote,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  fetchPollsByFamily,
  voteInPoll,
  deletePoll,
} from "@/src/redux/slices/pollSlice";

const { width } = Dimensions.get("window");

// --- STYLED LOADING MODAL ---
const LoadingOverlay = ({ visible }: { visible: boolean }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#EAB308" />
        <AppText type="bold" style={styles.loaderText}>
          Updating Polls...
        </AppText>
      </View>
    </View>
  </Modal>
);

const PollsPage = () => {
  const router = useRouter();
  const { familyId, isOwner } = useLocalSearchParams<{
    familyId: string;
    isOwner: string;
  }>();

  const userIsOwner = isOwner === "true";
  const dispatch = useDispatch<AppDispatch>();
  const { polls = [], loading = false } = useSelector(
    (state: RootState) => state.polls
  );

  // Loading state managed via local state + Redux sync
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
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

  const filteredPolls = useMemo(() => {
    if (!searchQuery.trim()) return polls;
    return polls.filter(
      (poll: any) =>
        poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poll.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [polls, searchQuery]);

  const isPollClosed = (endDate: string | Date) => {
    if (!endDate) return false;
    return new Date(endDate).getTime() < Date.now();
  };

  const handleVote = async (pollId: string, optionId: string) => {
    const poll = polls.find((p) => p._id === pollId);
    if (!poll) return;

    if (isPollClosed(poll?.endDate)) {
      Alert.alert("Poll Closed", "Voting has ended for this poll.");
      return;
    }

    if (poll.userVotedOptionId || optimisticVotes[pollId]) {
      Alert.alert("Already Voted", "You have already cast your vote.");
      return;
    }

    setIsUpdating(true); // Start loading modal
    setOptimisticVotes((prev) => ({ ...prev, [pollId]: optionId }));

    try {
      await dispatch(voteInPoll({ pollId, optionId })).unwrap();
      await dispatch(fetchPollsByFamily(familyId)).unwrap();
    } catch (error) {
      setOptimisticVotes((prev) => {
        const next = { ...prev };
        delete next[pollId];
        return next;
      });
      Alert.alert("Error", "Failed to cast vote.");
    } finally {
      setIsUpdating(false); // Stop loading modal
    }
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
                  <AppText style={styles.closedBadgeText}>ARCHIVED</AppText>
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
                Alert.alert("Delete Poll", "This action cannot be undone.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      setIsUpdating(true);
                      await dispatch(deletePoll(item._id));
                      setIsUpdating(false);
                    },
                  },
                ]);
              }}
              style={styles.deleteBtn}
            >
              <Trash2 size={20} color="#FCA5A5" />
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
                disabled={closed || hasVoted}
                activeOpacity={0.8}
              >
                {(hasVoted || closed) && (
                  <View
                    style={[
                      styles.progressBg,
                      {
                        width: `${percentage}%`,
                        backgroundColor: isSelected ? "#FEF9C3" : "#F1F5F9",
                      },
                    ]}
                  />
                )}
                <View style={styles.optionContent}>
                  <View style={styles.optionTextRow}>
                    {isSelected ? (
                      <CheckCircle2 size={20} color="#EAB308" />
                    ) : (
                      <Circle size={20} color="#CBD5E1" />
                    )}
                    <AppText
                      type={isSelected ? "bold" : "regular"}
                      style={[
                        styles.optionText,
                        isSelected && { color: "#854D0E" },
                      ]}
                    >
                      {opt.text}
                    </AppText>
                  </View>
                  {(hasVoted || closed) && (
                    <AppText type="bold" style={styles.percentageText}>
                      {percentage}%
                    </AppText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.voteSummary}>
            <Vote size={14} color="#64748B" />
            <AppText style={styles.voteCountText}>
              {totalVotes} {totalVotes === 1 ? "response" : "responses"}
            </AppText>
          </View>

          <View style={styles.footerRight}>
            <Clock size={14} color={closed ? "#EF4444" : "#64748B"} />
            <AppText
              style={[
                styles.dateText,
                closed && { color: "#EF4444", fontWeight: "bold" },
              ]}
            >
              {closed
                ? "Poll Ended"
                : `Ends ${new Date(item.endDate).toLocaleDateString()}`}
            </AppText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={isUpdating || (loading && !refreshing)} />

      <View style={styles.header}>
        {!isSearchActive ? (
          <>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerIcon}
            >
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <AppText type="bold" style={styles.headerTitle}>
              Family Polls
            </AppText>
            <TouchableOpacity
              onPress={() => setIsSearchActive(true)}
              style={styles.headerIcon}
            >
              <Search size={22} color="#0F172A" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.searchBar}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search active polls..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              onPress={() => {
                setIsSearchActive(false);
                setSearchQuery("");
              }}
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={filteredPolls}
        renderItem={renderPollCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EAB308"
            colors={["#EAB308"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <BarChart3 size={40} color="#EAB308" />
            </View>
            <AppText type="bold" style={styles.emptyTitle}>
              No Polls Yet
            </AppText>
            <AppText style={styles.emptyText}>
              Decisions are better together. Start a poll to gather family
              opinions.
            </AppText>
          </View>
        }
      />

      {userIsOwner && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.fab}
          onPress={() =>
            router.push({
              pathname: "/family/polls/create-poll",
              params: { familyId },
            })
          }
        >
          <Plus size={32} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderBox: {
    backgroundColor: "#1E293B",
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  loaderText: { color: "#EAB308", marginTop: 12, fontSize: 14 },
  header: {
    height: 70,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#0F172A" },
  headerTitle: { fontSize: 20, color: "#0F172A" },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  closedCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  pollTitle: { fontSize: 17, flex: 1, color: "#1E293B", lineHeight: 24 },
  closedBadge: {
    backgroundColor: "#64748B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closedBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  pollDesc: { fontSize: 14, color: "#64748B", marginTop: 6, lineHeight: 20 },
  optionsContainer: { gap: 12 },
  optionRow: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectedOption: { borderColor: "#EAB308", backgroundColor: "#FFFBEB" },
  disabledOption: { opacity: 0.95 },
  progressBg: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 1,
  },
  optionTextRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionText: { fontSize: 15, color: "#334155" },
  percentageText: { fontSize: 15, color: "#0F172A" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  voteSummary: { flexDirection: "row", alignItems: "center", gap: 6 },
  voteCountText: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 13, color: "#94A3B8" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: "#FEF9C3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, color: "#0F172A", marginBottom: 8 },
  emptyText: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PollsPage;
