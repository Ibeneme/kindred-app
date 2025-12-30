import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Pressable,
  Animated,
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
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  ChevronRight,
  Share2,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  fetchReportsByFamily,
  createReport,
  updateReport,
  deleteReport,
} from "@/src/redux/slices/reportSlice";

const ReportsPage = () => {
  const router = useRouter();
  const { familyId, familyName } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
  }>();
  const dispatch = useDispatch<AppDispatch>();

  const { reports = [], loading = false } = useSelector(
    (state: RootState) => state.reports
  );

  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    reportName: "",
    expectations: "",
    workDone: "",
    status: "In Progress",
    completionPercentage: "0",
    proofLinks: [] as string[],
  });
  const [newLink, setNewLink] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(fetchReportsByFamily(familyId));
  }, [familyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchReportsByFamily(familyId)).finally(() =>
      setRefreshing(false)
    );
  }, [familyId]);

  const filteredReports = reports.filter((r) =>
    tab === "sent" ? r.isOwner : !r.isOwner
  );

  const openModal = (report?: any) => {
    if (report) {
      setEditingId(report._id);
      setForm({
        reportName: report.reportName,
        expectations: report.expectations || "",
        workDone: report.workDone,
        status: report.status,
        completionPercentage: String(report.completionPercentage),
        proofLinks: report.proofLinks || [],
      });
    } else {
      setEditingId(null);
      setForm({
        reportName: "",
        expectations: "",
        workDone: "",
        status: "In Progress",
        completionPercentage: "0",
        proofLinks: [],
      });
    }
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const handleSave = async () => {
    if (!form.reportName || !form.workDone)
      return Alert.alert("Required", "Please fill in all mandatory fields.");
    setIsSubmitting(true);
    const data = {
      ...form,
      completionPercentage: Number(form.completionPercentage),
      familyId,
    };
    const action: any = editingId
      ? await dispatch(updateReport({ id: editingId, data }))
      : await dispatch(createReport(data));
    setIsSubmitting(false);
    if (!action.error) closeModal();
  };

  const renderReportCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHighlight} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <AppText type="bold" style={styles.reportTitle}>
              {item.reportName}
            </AppText>
            <View style={styles.metaRow}>
              <Clock size={12} color="#9CA3AF" />
              <AppText style={styles.metaText}>
                {new Date(item.createdAt).toLocaleDateString()}
              </AppText>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "Completed" ? "#ECFDF5" : "#FFF7ED",
              },
            ]}
          >
            <AppText
              style={[
                styles.statusText,
                { color: item.status === "Completed" ? "#059669" : "#D97706" },
              ]}
            >
              {item.status}
            </AppText>
          </View>
        </View>

        <AppText numberOfLines={2} style={styles.workDonePreview}>
          {item.workDone}
        </AppText>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${item.completionPercentage}%` },
              ]}
            />
          </View>
          <AppText type="bold" style={styles.percentText}>
            {item.completionPercentage}%
          </AppText>
        </View>

        <View style={styles.cardActions}>
          <View style={styles.userInfo}>
            <View style={styles.avatarMini}>
              <AppText style={styles.avatarTxt}>
                {item.sender?.name?.[0]}
              </AppText>
            </View>
            <AppText style={styles.userName}>
              {item.isOwner ? "You" : item.sender?.name}
            </AppText>
          </View>

          <View style={styles.actionBtns}>
            {item.isOwner && (
              <>
                <TouchableOpacity
                  onPress={() => openModal(item)}
                  style={styles.iconBtn}
                >
                  <Edit size={18} color="#4B5563" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => dispatch(deleteReport(item._id))}
                  style={styles.iconBtn}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.viewBtn}>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {familyName} Reports
        </AppText>
        <TouchableOpacity style={styles.headerAction}>
          <Share2 size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabWrapper}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, tab === "sent" && styles.activeTabItem]}
            onPress={() => setTab("sent")}
          >
            <AppText
              type="bold"
              style={[styles.tabLabel, tab === "sent" && styles.activeTabLabel]}
            >
              Sent
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, tab === "received" && styles.activeTabItem]}
            onPress={() => setTab("received")}
          >
            <AppText
              type="bold"
              style={[
                styles.tabLabel,
                tab === "received" && styles.activeTabLabel,
              ]}
            >
              Received
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item._id}
        renderItem={renderReportCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={64} color="#E5E7EB" />
            <AppText style={styles.emptyText}>No reports found</AppText>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalFull}
        >
          <View style={styles.modalHeaderTop}>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <AppText type="bold" style={styles.modalTitle}>
              {editingId ? "Update Report" : "New Progress Report"}
            </AppText>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <AppText style={styles.inputLabel}>Report Title</AppText>
              <TextInput
                placeholder="e.g. Weekly Grocery Run"
                style={styles.input}
                value={form.reportName}
                onChangeText={(t) => setForm({ ...form, reportName: t })}
              />

              <AppText style={styles.inputLabel}>Work Done</AppText>
              <TextInput
                placeholder="Describe what you achieved..."
                style={[
                  styles.input,
                  { height: 100, textAlignVertical: "top" },
                ]}
                multiline
                value={form.workDone}
                onChangeText={(t) => setForm({ ...form, workDone: t })}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.inputLabel}>Progress (%)</AppText>
                  <TextInput
                    keyboardType="numeric"
                    style={styles.input}
                    value={form.completionPercentage}
                    onChangeText={(t) =>
                      setForm({ ...form, completionPercentage: t })
                    }
                  />
                </View>
                <View style={{ width: 15 }} />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.inputLabel}>Status</AppText>
                  <TouchableOpacity
                    style={styles.statusPickerTrigger}
                    onPress={() =>
                      setForm({
                        ...form,
                        status:
                          form.status === "Completed"
                            ? "In Progress"
                            : "Completed",
                      })
                    }
                  >
                    <AppText>{form.status}</AppText>
                  </TouchableOpacity>
                </View>
              </View>

              <AppText style={styles.inputLabel}>
                Proof Links (Optional)
              </AppText>
              <View style={styles.linkRow}>
                <TextInput
                  placeholder="Add link..."
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={newLink}
                  onChangeText={setNewLink}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (newLink) {
                      setForm({
                        ...form,
                        proofLinks: [...form.proofLinks, newLink],
                      });
                      setNewLink("");
                    }
                  }}
                  style={styles.linkAddBtn}
                >
                  <Plus size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <AppText type="bold" style={{ color: "#FFF" }}>
                    Save Report
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
  container: { flex: 1, backgroundColor: "#FDFCFB" },
  header: {
    paddingHorizontal: 20,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  backBtn: { width: 40 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17 },
  headerAction: { width: 40, alignItems: "flex-end" },
  tabWrapper: { paddingHorizontal: 20, marginTop: 15 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTabItem: {
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tabLabel: { color: "#6B7280", fontSize: 14 },
  activeTabLabel: { color: "#111827" },
  listContainer: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: "row",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHighlight: { width: 5, backgroundColor: "#EAB308" },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportTitle: { fontSize: 16, color: "#111827", marginBottom: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "800" },
  workDonePreview: {
    fontSize: 13,
    color: "#4B5563",
    marginVertical: 12,
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
  },
  progressFill: { height: "100%", backgroundColor: "#EAB308", borderRadius: 3 },
  percentText: { fontSize: 12, color: "#111827" },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#F9FAFB",
    paddingTop: 12,
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 10, fontWeight: "bold", color: "#D97706" },
  userName: { fontSize: 12, color: "#4B5563" },
  actionBtns: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { padding: 4 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  modalFull: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalHeaderTop: { alignItems: "center", marginBottom: 10 },
  closeBtn: { padding: 10 },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    height: "85%",
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: "#111827",
    marginBottom: 25,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
  },
  row: { flexDirection: "row" },
  statusPickerTrigger: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  linkRow: { flexDirection: "row", gap: 10 },
  linkAddBtn: {
    width: 50,
    backgroundColor: "#111827",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    backgroundColor: "#EAB308",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: { color: "#9CA3AF", marginTop: 10 },
});

export default ReportsPage;
