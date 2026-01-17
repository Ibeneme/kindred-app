import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Plus,
  Trash2,
  Edit,
  X,
  FileText,
  ArrowLeft,
  Clock,
  MessageSquare,
  Send,
  AlertTriangle,
  Search,
  CheckCheck,
  CheckCircle2,
  Ban,
  PauseCircle,
  PlayCircle,
  UserPlus,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  fetchReportsByFamily,
  createReport,
  updateReport,
  deleteReport,
  addReportComment,
} from "@/src/redux/slices/reportSlice";

// Status Options Mapping
const STATUS_OPTIONS = [
  { label: "In Progress", icon: PlayCircle, color: "#F59E0B" },
  { label: "Completed", icon: CheckCircle2, color: "#10B981" },
  { label: "Blocked", icon: Ban, color: "#EF4444" },
  { label: "On Hold", icon: PauseCircle, color: "#6B7280" },
  { label: "Under Review", icon: Clock, color: "#6366F1" },
];

const ReportsPage = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    familyId?: string;
    members?: string;
    userId?: string;
    familyName?: string;
  }>();

  const familyId = params.familyId || "";
  const currentUserId = params.userId || "";
  const familyName = params.familyName || "";

  const members = (() => {
    try {
      return params.members ? JSON.parse(params.members) : [];
    } catch {
      return [];
    }
  })();

  const dispatch = useDispatch<AppDispatch>();
  const { reports = [] } = useSelector((state: RootState) => state.reports);

  // UI States
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [modalVisible, setModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Target States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Form State
  const [form, setForm] = useState({
    reportName: "",
    workDone: "",
    status: "In Progress",
    completionPercentage: "0",
    sharedWith: [] as string[],
  });

  useEffect(() => {
    if (familyId) {
      dispatch(fetchReportsByFamily(familyId));
    }
  }, [familyId, dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchReportsByFamily(familyId)).finally(() =>
      setRefreshing(false)
    );
  }, [familyId, dispatch]);

  useEffect(() => {
    if (activeReport) {
      const updated = reports.find((r) => r._id === activeReport._id);
      if (updated) setActiveReport(updated);
    }
  }, [reports]);

  const filteredReports = reports.filter((report: any) => {
    const isSender = report.sender?._id === currentUserId;
    const isSharedWithMe =
      report.sharedWith?.some((p: any) => p._id === currentUserId) ?? false;
    const matchesSearch =
      report.reportName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.workDone.toLowerCase().includes(searchQuery.toLowerCase());
    const isCorrectTab =
      tab === "sent" ? isSender : isSharedWithMe && !isSender;
    return isCorrectTab && matchesSearch;
  });

  const openEditModal = (report?: any) => {
    if (report) {
      setEditingId(report._id);
      setForm({
        reportName: report.reportName || "",
        workDone: report.workDone || "",
        status: report.status || "In Progress",
        completionPercentage: String(report.completionPercentage ?? 0),
        sharedWith: report.sharedWith?.map((u: any) => u._id) || [],
      });
    } else {
      setEditingId(null);
      setForm({
        reportName: "",
        workDone: "",
        status: "In Progress",
        completionPercentage: "0",
        sharedWith: [],
      });
    }
    setModalVisible(true);
  };

  const handleSaveReport = async () => {
    if (!form.reportName.trim() || !form.workDone.trim()) {
      return Alert.alert("Missing Info", "Title and details are required.");
    }
    setIsSubmitting(true);
    const payload = {
      ...form,
      completionPercentage: Number(form.completionPercentage),
      familyId,
    };
    try {
      if (editingId) {
        await dispatch(updateReport({ id: editingId, data: payload })).unwrap();
      } else {
        await dispatch(createReport(payload)).unwrap();
      }
      setModalVisible(false);
      onRefresh();
    } catch (err) {
      Alert.alert("Error", "Failed to save report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      await dispatch(deleteReport(reportToDelete)).unwrap();
      setDeleteModalVisible(false);
      setReportToDelete(null);
      onRefresh();
    } catch (err) {
      Alert.alert("Error", "Could not delete.");
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !activeReport) return;
    setIsSendingComment(true);
    try {
      await dispatch(
        addReportComment({ reportId: activeReport._id, message: commentText })
      ).unwrap();
      setCommentText("");
    } catch (err) {
      Alert.alert("Error", "Failed to add comment.");
    } finally {
      setIsSendingComment(false);
    }
  };

  const toggleMemberSelection = (id: string) => {
    setForm((prev) => ({
      ...prev,
      sharedWith: prev.sharedWith.includes(id)
        ? prev.sharedWith.filter((x) => x !== id)
        : [...prev.sharedWith, id],
    }));
  };

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case "Completed":
        return { color: "#10B981", bg: "#D1FAE5" };
      case "Blocked":
        return { color: "#EF4444", bg: "#FEE2E2" };
      case "On Hold":
        return { color: "#6B7280", bg: "#F3F4F6" };
      case "Under Review":
        return { color: "#6366F1", bg: "#E0E7FF" };
      default:
        return { color: "#F59E0B", bg: "#FEF3C7" };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* NAVBAR */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navIcon}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        {!isSearchVisible ? (
          <>
            <AppText type="bold" style={styles.navTitle}>
              {familyName} Reports
            </AppText>
            <TouchableOpacity
              onPress={() => setIsSearchVisible(true)}
              style={styles.navIcon}
            >
              <Search size={22} color="#111827" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search reports..."
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={() => {
                setIsSearchVisible(false);
                setSearchQuery("");
              }}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TABS */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabBackground}>
          {["sent", "received"].map((t: any) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <AppText
                type="bold"
                style={
                  tab === t ? styles.tabTextActive : styles.tabTextInactive
                }
              >
                {t.toUpperCase()}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const visuals = getStatusVisuals(item.status);
          return (
            <View style={styles.card}>
              <View
                style={[styles.cardAccent, { backgroundColor: visuals.color }]}
              />
              <View style={styles.cardBody}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <AppText type="bold" style={styles.reportTitle}>
                      {item.reportName}
                    </AppText>
                    <View style={styles.dateRow}>
                      <Clock size={12} color="#9CA3AF" />
                      <AppText style={styles.dateLabel}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </AppText>
                    </View>
                  </View>
                  <View
                    style={[styles.statusPill, { backgroundColor: visuals.bg }]}
                  >
                    <AppText
                      style={[styles.statusPillText, { color: visuals.color }]}
                    >
                      {item.status}
                    </AppText>
                  </View>
                </View>
                <AppText numberOfLines={2} style={styles.reportPreview}>
                  {item.workDone}
                </AppText>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressIndicator,
                        {
                          width: `${item.completionPercentage}%`,
                          backgroundColor: visuals.color,
                        },
                      ]}
                    />
                  </View>
                  <AppText style={styles.progressValue}>
                    {item.completionPercentage}%
                  </AppText>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.commentTrigger}
                    onPress={() => {
                      setActiveReport(item);
                      setCommentModalVisible(true);
                    }}
                  >
                    <MessageSquare size={18} color="#6B7280" />
                    <AppText style={styles.commentStats}>
                      {item.comments?.length || 0}
                    </AppText>
                  </TouchableOpacity>
                  {item.sender?._id === currentUserId && (
                    <View style={styles.ownerControls}>
                      <TouchableOpacity
                        onPress={() => openEditModal(item)}
                        style={styles.iconButton}
                      >
                        <Edit size={18} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setReportToDelete(item._id);
                          setDeleteModalVisible(true);
                        }}
                        style={styles.iconButton}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.scrollList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <FileText size={64} color="#F3F4F6" />
            <AppText style={styles.emptyLabel}>No reports found.</AppText>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => openEditModal()}
      >
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.fullOverlay}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
              <AppText type="bold" style={styles.sheetTitle}>
                {editingId ? "Update Report" : "New Report"}
              </AppText>
              <TouchableOpacity onPress={handleSaveReport}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <AppText type="bold" style={{ color: "#F59E0B" }}>
                    Save
                  </AppText>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              <AppText style={styles.inputLabel}>Report Title *</AppText>
              <TextInput
                style={styles.textInput}
                value={form.reportName}
                onChangeText={(t) => setForm({ ...form, reportName: t })}
                placeholder="Enter report title..."
              />

              <AppText style={styles.inputLabel}>Work Details *</AppText>
              <TextInput
                style={[styles.textInput, styles.longInput]}
                value={form.workDone}
                onChangeText={(t) => setForm({ ...form, workDone: t })}
                multiline
                placeholder="What did you achieve?"
              />

              {/* STATUS GRID MAPPING */}
              <AppText style={styles.inputLabel}>Select Status</AppText>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => setForm({ ...form, status: opt.label })}
                    style={[
                      styles.statusItem,
                      form.status === opt.label && {
                        borderColor: opt.color,
                        backgroundColor: opt.color + "15",
                      },
                    ]}
                  >
                    <opt.icon
                      size={20}
                      color={form.status === opt.label ? opt.color : "#9CA3AF"}
                    />
                    <AppText
                      style={[
                        styles.statusItemText,
                        form.status === opt.label && {
                          color: opt.color,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {opt.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <AppText style={styles.inputLabel}>
                Completion Percentage ({form.completionPercentage}%)
              </AppText>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={form.completionPercentage}
                onChangeText={(t) =>
                  setForm({ ...form, completionPercentage: t })
                }
                placeholder="0"
              />

              {/* SHARED WITH MAPPING */}
              <View style={styles.sharedSection}>
                <View style={styles.sharedHeader}>
                  <UserPlus size={18} color="#4B5563" />
                  <AppText style={styles.inputLabel}> Shared With</AppText>
                </View>
                <View style={styles.memberSelectionBox}>
                  {members
                    .filter((m: any) => m._id !== currentUserId)
                    .map((m: any) => {
                      const isSelected = form.sharedWith.includes(m._id);
                      return (
                        <TouchableOpacity
                          key={m._id}
                          onPress={() => toggleMemberSelection(m._id)}
                          style={[
                            styles.memberChip,
                            isSelected && styles.memberChipSelected,
                          ]}
                        >
                          <AppText
                            style={[
                              styles.memberChipText,
                              isSelected && styles.memberChipTextSelected,
                            ]}
                          >
                            {m.firstName} {m.lastName}
                          </AppText>
                          {isSelected && (
                            <CheckCircle2 size={14} color="#FFF" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* COMMENTS MODAL */}
      <Modal visible={commentModalVisible} transparent animationType="slide">
        <View style={styles.fullOverlay}>
          <View style={[styles.bottomSheet, { height: "75%" }]}>
            <View style={styles.sheetHeader}>
              <AppText type="bold">Feedback</AppText>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeReport?.comments || []}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => {
                const isMine = item.userId === currentUserId;
                return (
                  <View
                    style={[
                      styles.commentBubble,
                      isMine && styles.commentBubbleSent,
                    ]}
                  >
                    <View style={styles.commentHeader}>
                      <AppText style={styles.commentAuthor}>
                        {isMine ? "You" : item.userName}
                      </AppText>
                      <View style={styles.commentStatusRow}>
                        <AppText style={styles.commentDate}>
                          11th Jan 2026
                        </AppText>
                        <View style={{ marginLeft: 4 }}>
                          {isSendingComment && !item._id ? (
                            <Clock size={12} color="#9CA3AF" />
                          ) : (
                            <CheckCheck size={14} color="#10B981" />
                          )}
                        </View>
                      </View>
                    </View>
                    <AppText style={styles.commentMessage}>
                      {item.message}
                    </AppText>
                  </View>
                );
              }}
            />
            <View style={styles.commentComposer}>
              <TextInput
                style={styles.composerInput}
                placeholder="Add feedback..."
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={styles.composerSend}
                onPress={handlePostComment}
                disabled={isSendingComment}
              >
                {isSendingComment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.centeredDim}>
          <View style={styles.confirmBox}>
            <AlertTriangle
              size={40}
              color="#EF4444"
              style={{ alignSelf: "center", marginBottom: 15 }}
            />
            <AppText type="bold" style={styles.confirmTitle}>
              Delete Report?
            </AppText>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelAction}
                onPress={() => setDeleteModalVisible(false)}
              >
                <AppText>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteAction}
                onPress={confirmDelete}
              >
                <AppText style={{ color: "#FFF", fontWeight: "bold" }}>
                  Delete
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFDFD" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  navTitle: { flex: 1, fontSize: 18, textAlign: "center", color: "#111827" },
  navIcon: { padding: 8 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  tabWrapper: { padding: 16 },
  tabBackground: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: { backgroundColor: "#FFF", elevation: 2 },
  tabTextInactive: { color: "#9CA3AF", fontSize: 13 },
  tabTextActive: { color: "#111827", fontSize: 13 },
  scrollList: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    elevation: 1,
  },
  cardAccent: { height: 4 },
  cardBody: { padding: 16 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reportTitle: { fontSize: 16, color: "#111827" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  dateLabel: { fontSize: 12, color: "#9CA3AF" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  reportPreview: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 15,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressIndicator: { height: "100%" },
  progressValue: { fontSize: 12, fontWeight: "bold", color: "#111827" },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  commentTrigger: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentStats: { fontSize: 14, color: "#6B7280" },
  ownerControls: { flexDirection: "row", gap: 16 },
  iconButton: { padding: 2 },
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  fullOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  centeredDim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: { fontSize: 18, color: "#111827" },
  sheetBody: { padding: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  longInput: { height: 100, textAlignVertical: "top" },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    backgroundColor: "#FDFDFD",
  },
  statusItemText: { fontSize: 13, color: "#6B7280" },
  sharedSection: { marginTop: 10, marginBottom: 20 },
  sharedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  memberSelectionBox: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  memberChipSelected: { backgroundColor: "#111827" },
  memberChipText: { fontSize: 13, color: "#4B5563" },
  memberChipTextSelected: { color: "#FFF", fontWeight: "bold" },
  confirmBox: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
  },
  confirmTitle: { fontSize: 18, textAlign: "center", marginBottom: 20 },
  confirmButtons: { flexDirection: "row", gap: 12 },
  cancelAction: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteAction: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  commentBubble: { marginBottom: 16, maxWidth: "85%", alignSelf: "flex-start" },
  commentBubbleSent: { alignSelf: "flex-end", alignItems: "flex-end" },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    width: "100%",
  },
  commentAuthor: { fontSize: 11, color: "#9CA3AF", fontWeight: "bold" },
  commentStatusRow: { flexDirection: "row", alignItems: "center" },
  commentDate: { fontSize: 10, color: "#9CA3AF" },
  commentMessage: {
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 16,
    color: "#111827",
  },
  commentComposer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  composerInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 48,
  },
  composerSend: {
    backgroundColor: "#111827",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  noCommentsText: { textAlign: "center", marginTop: 40, color: "#9CA3AF" },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyLabel: { marginTop: 15, color: "#9CA3AF" },
});

export default ReportsPage;
