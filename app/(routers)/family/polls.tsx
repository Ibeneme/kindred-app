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

  // Convert isOwner param to boolean
  const userIsOwner = isOwner === "true";

  const dispatch = useDispatch<AppDispatch>();
  const { polls = [], loading = false } = useSelector(
    (state: RootState) => state.polls
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create Poll Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    endDate: "",
  });

  useEffect(() => {
    dispatch(fetchPollsByFamily(familyId));
  }, [familyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchPollsByFamily(familyId)).finally(() => setRefreshing(false));
  }, [familyId]);

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
    // Safety check
    if (!userIsOwner) return;

    const validOptions = form.options.filter((opt) => opt.trim() !== "");
    if (!form.title.trim() || validOptions.length < 2) {
      return Alert.alert(
        "Required",
        "Please provide a title and at least 2 options."
      );
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
    }
  };

  const renderPollCard = ({ item }: { item: any }) => {
    const totalVotes = item.totalVotes || 0;

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

          {/* ONLY SHOW DELETE IF OWNER */}
          {userIsOwner && (
            <TouchableOpacity
              onPress={() => dispatch(deletePoll(item._id))}
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
            const isSelected = item.userVotedOptionId === opt._id;

            return (
              <TouchableOpacity
                key={opt._id}
                style={[styles.optionRow, isSelected && styles.selectedOption]}
                onPress={() =>
                  dispatch(voteInPoll({ pollId: item._id, optionId: opt._id }))
                }
                disabled={item.isExpired}
              >
                {item.userVotedOptionId && (
                  <View
                    style={[styles.progressBg, { width: `${percentage}%` }]}
                  />
                )}

                <View style={styles.optionContent}>
                  <View style={styles.optionTextRow}>
                    {isSelected ? (
                      <CheckCircle2 size={18} color="#EAB308" />
                    ) : (
                      <Circle size={18} color="#D1D5DB" />
                    )}
                    <AppText
                      style={[
                        styles.optionText,
                        isSelected && { fontWeight: "bold" },
                      ]}
                    >
                      {opt.text}
                    </AppText>
                  </View>
                  {item.userVotedOptionId && (
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
            <Clock size={12} color="#9CA3AF" />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <BarChart3 size={20} color="#EAB308" />
          <AppText type="bold" style={styles.headerTitle}>
            Family Polls
          </AppText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={polls}
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
              No active polls
            </AppText>
            <AppText style={styles.emptySubtitle}>
              {userIsOwner
                ? "Create a poll to decide on family activities!"
                : "Wait for the owner to create a poll."}
            </AppText>
          </View>
        }
      />

      {/* ONLY SHOW CREATE BUTTON IF OWNER */}
      {userIsOwner && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* CREATE MODAL */}
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
                placeholder="e.g. Where should we go for dinner?"
                style={styles.input}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />

              <AppText style={styles.label}>Options *</AppText>
              {form.options.map((opt, index) => (
                <View key={index} style={styles.optionInputRow}>
                  <TextInput
                    placeholder={`Option ${index + 1}`}
                    style={[styles.input, { flex: 1, marginBottom: 8 }]}
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

              <TouchableOpacity
                style={styles.addOptionBtn}
                onPress={addOptionField}
              >
                <Plus size={18} color="#EAB308" />
                <AppText style={styles.addOptionTxt}>Add Option</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
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

// ... Styles remain identical to your original code
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
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  pollTitle: { fontSize: 17, color: "#111827" },
  pollDesc: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  deleteBtn: { padding: 4 },
  optionsContainer: { gap: 10, marginBottom: 15 },
  optionRow: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    justifyContent: "center",
  },
  selectedOption: { borderColor: "#EAB308", backgroundColor: "#FFFBEB" },
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
    paddingHorizontal: 12,
  },
  optionTextRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  optionText: { fontSize: 14, color: "#374151" },
  percentageText: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#F9FAFB",
    paddingTop: 12,
  },
  voteCountText: { fontSize: 12, color: "#6B7280" },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11, color: "#9CA3AF" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyTitle: { fontSize: 18, marginTop: 15, color: "#111827" },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 5,
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  optionInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  removeOptBtn: { marginBottom: 8 },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 20,
  },
  addOptionTxt: { color: "#EAB308", fontWeight: "bold" },
  submitBtn: {
    backgroundColor: "#EAB308",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
});

export default PollsPage;
