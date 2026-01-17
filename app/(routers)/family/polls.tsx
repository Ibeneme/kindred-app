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
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  X,
  Trash2,
  BarChart3,
  Clock,
  CheckCircle2,
  Circle,
  Search,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  fetchPollsByFamily,
  createPoll,
  voteInPoll,
  deletePoll,
} from "@/src/redux/slices/pollSlice";

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

  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Create Poll Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    endDate: "",
  });

  // Optimistic votes: pollId → selected optionId
  const [optimisticVotes, setOptimisticVotes] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    dispatch(fetchPollsByFamily(familyId));
  }, [familyId, dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchPollsByFamily(familyId)).finally(() => setRefreshing(false));
  }, [familyId, dispatch]);

  const addOptionField = () => {
    if (form.options.length < 6) {
      setForm({ ...form, options: [...form.options, ""] });
    }
  };

  const removeOptionField = (index: number) => {
    const newOptions = form.options.filter((_, i) => i !== index);
    setForm({ ...form, options: newOptions });
  };

  const handleCreatePoll = async () => {
    if (!userIsOwner) return;
    const validOptions = form.options.filter((opt) => opt.trim() !== "");
    if (!form.title.trim() || validOptions.length < 2) {
      return Alert.alert("Required", "Title and at least 2 options needed.");
    }
    setIsSubmitting(true);
    const action = await dispatch(
      createPoll({
        ...form,
        options: validOptions,
        familyId,
      })
    );
    setIsSubmitting(false);
    if (createPoll.fulfilled.match(action)) {
      setModalVisible(false);
      setForm({ title: "", description: "", options: ["", ""], endDate: "" });
    } else {
      Alert.alert("Error", "Failed to create poll");
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    const poll = polls.find((p) => p._id === pollId);
    if (
      !poll ||
      poll.isExpired ||
      poll.userVotedOptionId ||
      optimisticVotes[pollId]
    ) {
      return; // already voted or expired
    }
    // Optimistic UI update
    setOptimisticVotes((prev) => ({ ...prev, [pollId]: optionId }));
    const result = await dispatch(voteInPoll({ pollId, optionId }));
    if (voteInPoll.rejected.match(result)) {
      // Rollback on failure
      setOptimisticVotes((prev) => {
        const next = { ...prev };
        delete next[pollId];
        return next;
      });
      Alert.alert("Error", "Could not record your vote");
    }
  };

  // Filter Logic for Titles and Descriptions
  const filteredPolls = polls.filter((poll) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      poll.title.toLowerCase().includes(q) ||
      (poll.description && poll.description.toLowerCase().includes(q))
    );
  });

  const renderPollCard = ({ item }: { item: any }) => {
    const totalVotes = item.totalVotes || 0;
    const hasVoted = !!item.userVotedOptionId || !!optimisticVotes[item._id];
    const selectedOptionId =
      optimisticVotes[item._id] || item.userVotedOptionId;
    const isSoloVoter = totalVotes === 1 && hasVoted;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <AppText type="bold" style={styles.pollTitle}>
              {item.title}
            </AppText>
            {item.description && (
              <AppText style={styles.pollDesc}>{item.description}</AppText>
            )}
          </View>
          {userIsOwner && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Delete Poll", "Are you sure?", [
                  { text: "Cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => dispatch(deletePoll(item._id)),
                  },
                ]);
              }}
              style={styles.deleteBtn}
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.optionsContainer}>
          {item.options.map((opt: any) => {
            const voteCount = opt.votes?.length || 0;
            let displayPercentage =
              totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            if (isSoloVoter && selectedOptionId === opt._id) {
              displayPercentage = 100;
            }
            const isSelected = selectedOptionId === opt._id;
            return (
              <TouchableOpacity
                key={opt._id}
                style={[
                  styles.optionRow,
                  isSelected && styles.selectedOption,
                  (item.isExpired || hasVoted) && styles.disabledOption,
                ]}
                onPress={() => handleVote(item._id, opt._id)}
                disabled={item.isExpired || hasVoted}
                activeOpacity={0.8}
              >
                {(hasVoted || item.userVotedOptionId) && (
                  <View
                    style={[
                      styles.progressBg,
                      { width: `${displayPercentage}%` },
                    ]}
                  />
                )}
                <View style={styles.optionContent}>
                  <View style={styles.optionTextRow}>
                    {isSelected ? (
                      <CheckCircle2 size={22} color="#EAB308" />
                    ) : (
                      <Circle size={22} color="#D1D5DB" />
                    )}
                    <AppText
                      style={[
                        styles.optionText,
                        isSelected && { fontWeight: "700", color: "#111827" },
                      ]}
                    >
                      {opt.text}
                    </AppText>
                  </View>
                  {(hasVoted || item.userVotedOptionId) && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AppText style={styles.percentageText}>
                        {displayPercentage}%
                      </AppText>
                      {isSelected && (
                        <AppText style={styles.youVotedLabel}>
                          You voted
                        </AppText>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.cardFooter}>
          <AppText style={styles.voteCountText}>
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
            {isSoloVoter && " (just you)"}
          </AppText>
          <View style={styles.footerRight}>
            <Clock size={14} color="#9CA3AF" />
            <AppText style={styles.dateText}>
              {item.isExpired ? "Closed" : "Active"}
            </AppText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Dynamic Header */}
      <View style={styles.header}>
        {!isSearching ? (
          <>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerTitleRow}>
              <BarChart3 size={20} color="#EAB308" />
              <AppText type="bold" style={styles.headerTitle}>
                Family Polls
              </AppText>
            </View>
            <TouchableOpacity onPress={() => setIsSearching(true)}>
              <Search size={24} color="#111827" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.searchHeaderWrapper}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.headerSearchInput}
              placeholder="Search polls..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setIsSearching(false);
              }}
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={filteredPolls}
        keyExtractor={(item) => item._id}
        renderItem={renderPollCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BarChart3 size={60} color="#E5E7EB" />
            <AppText type="bold" style={styles.emptyTitle}>
              {searchQuery ? "No matching polls" : "No active polls"}
            </AppText>
            <AppText style={styles.emptySubtitle}>
              {searchQuery
                ? "Try a different keyword"
                : userIsOwner
                ? "Create a poll to decide on family matters!"
                : "No polls available yet."}
            </AppText>
          </View>
        }
      />

<TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={28} color="#FFF" />
        </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText type="bold" style={styles.modalTitle}>
                Create New Poll
              </AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText style={styles.label}>Question *</AppText>
              <TextInput
                placeholder="e.g. What movie should we watch tonight?"
                style={styles.input}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />
              <AppText style={styles.label}>Options * (2–6)</AppText>
              {form.options.map((opt, index) => (
                <View key={index} style={styles.optionInputRow}>
                  <TextInput
                    placeholder={`Option ${index + 1}`}
                    style={[styles.input, { flex: 1 }]}
                    value={opt}
                    onChangeText={(t) => {
                      const newOpts = [...form.options];
                      newOpts[index] = t;
                      setForm({ ...form, options: newOpts });
                    }}
                  />
                  {form.options.length > 2 && (
                    <TouchableOpacity
                      onPress={() => removeOptionField(index)}
                      style={styles.removeOptBtn}
                    >
                      <X size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {form.options.length < 6 && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={addOptionField}
                >
                  <Plus size={18} color="#EAB308" />
                  <AppText style={styles.addOptionTxt}>Add Option</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isSubmitting && styles.submitDisabled,
                ]}
                onPress={handleCreatePoll}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <AppText type="bold" style={{ color: "#FFF" }}>
                    Create Poll
                  </AppText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    height: 70, // Fixed height for consistent transition
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  searchHeaderWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pollTitle: { fontSize: 17, color: "#111827" },
  pollDesc: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  deleteBtn: { padding: 6 },
  optionsContainer: { gap: 10, marginBottom: 16 },
  optionRow: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    justifyContent: "center",
  },
  selectedOption: {
    borderColor: "#EAB308",
    backgroundColor: "#FFFBEB",
  },
  disabledOption: {
    opacity: 0.7,
  },
  progressBg: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FEF3C7",
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  optionTextRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionText: { fontSize: 15, color: "#374151" },
  percentageText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    minWidth: 54,
    textAlign: "right",
  },
  youVotedLabel: {
    fontSize: 12,
    color: "#EAB308",
    fontWeight: "600",
    backgroundColor: "rgba(234, 179, 8, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    paddingTop: 12,
  },
  voteCountText: { fontSize: 13, color: "#6B7280" },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 13, color: "#9CA3AF" },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 120,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 19, marginTop: 16, color: "#111827" },
  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  modalContent: {
    backgroundColor: "#FFF",
    marginTop: 60,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    alignItems: "center",
  },
  modalTitle: { fontSize: 21, fontWeight: "700" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
  },
  optionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  removeOptBtn: { padding: 8 },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  addOptionTxt: { color: "#EAB308", fontWeight: "700", fontSize: 15 },
  submitBtn: {
    backgroundColor: "#EAB308",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
});

export default PollsPage;
