import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ViewStyle,
  TextStyle,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { fetchTasksByFamily, deleteTask } from "@/src/redux/slices/taskSlice";

type TaskStatus = "all" | "pending" | "in-progress" | "completed";

// ──────────────────────────────────────────────────────────────
//             SUB-COMPONENT: EXPANDABLE DETAILS (Read More)
// ──────────────────────────────────────────────────────────────
const ExpandableDetails = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const TEXT_LIMIT = 150;

  if (!text) return null;
  if (text.length <= TEXT_LIMIT) {
    return <AppText style={styles.detailsText}>{text}</AppText>;
  }

  return (
    <View style={styles.detailsContainer}>
      <AppText style={styles.detailsText}>
        {expanded ? text : `${text.substring(0, TEXT_LIMIT)}...`}
      </AppText>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.readMoreBtn}
      >
        <AppText style={styles.readMoreText}>
          {expanded ? "Show Less" : "Read More"}
        </AppText>
        {expanded ? (
          <ChevronUp size={14} color="#3B82F6" />
        ) : (
          <ChevronDown size={14} color="#3B82F6" />
        )}
      </TouchableOpacity>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────
//                     MAIN COMPONENT
// ──────────────────────────────────────────────────────────────
const FamilyTasksPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId, familyName } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
  }>();

  // Requirements Check: Accessing current user for permission logic
  const { user: currentUser } = useSelector((state: RootState) => state.user);
  const { tasks = [], loading } = useSelector(
    (state: RootState) => state.tasks
  );

  const [activeFilter, setActiveFilter] = useState<TaskStatus>("all");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  console.warn(tasks, "taskstasks");

  useEffect(() => {
    if (familyId) dispatch(fetchTasksByFamily(familyId));
  }, [familyId]);

  const filteredTasks = useMemo(() => {
    if (activeFilter === "all") return tasks;
    return tasks.filter((task: any) => task.status === activeFilter);
  }, [tasks, activeFilter]);

  const onConfirmDelete = async () => {
    if (selectedTaskId) {
      await dispatch(deleteTask(selectedTaskId));
      setDeleteModalVisible(false);
      setSelectedTaskId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "in-progress":
        return "#3B82F6";
      default:
        return "#F59E0B";
    }
  };

  const renderTask = ({ item }: { item: any }) => {
    console.warn(item.createdBy?._id, currentUser?._id, "itemitemitem");
    // Requirements (III): Only the creator can edit or delete
    const isCreator = item.createdBy?._id === currentUser?._id;

    return (
      <View style={styles.taskCard}>
        {/* Card Header: Status and Posted Date */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "15" },
            ]}
          >
            <AppText
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.toUpperCase()}
            </AppText>
          </View>
          <View style={styles.headerDateRow}>
            <Calendar size={12} color="#6B7280" />
            <AppText style={styles.dateText}>
              Posted: {new Date(item.createdAt).toLocaleDateString()}
            </AppText>
          </View>
        </View>

        {/* Task Title */}
        <AppText type="bold" style={styles.taskTitle}>
          {item.title}
        </AppText>

        {/* Requirements (IV): Assigned To Section */}
        <View style={styles.assignedToBox}>
          <User size={14} color="#4B5563" />
          <AppText style={styles.assignedLabel}>
            Assigned to:{" "}
            <AppText type="bold" style={{ color: "#111827" }}>
              {item.assignedTo
                ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
                : "Everyone"}
            </AppText>
          </AppText>
        </View>

        {/* Requirements (I): Posted By Section */}
        <View style={styles.createdByRow}>
          <AppText style={styles.creatorLabel}>
            Created by:{" "}
            <AppText type="bold" style={{ color: "#4B5563" }}>
              {item.createdBy?.firstName} {item.createdBy?.lastName}
            </AppText>
          </AppText>
        </View>

        {/* Requirements (III): Details with Read More */}
        <ExpandableDetails text={item.details} />

        {/* Deadline Footer */}
        <View style={styles.deadlineRow}>
          <Clock size={12} color="#EF4444" />
          <AppText style={styles.deadlineText}>
            Due: {new Date(item.deadline).toLocaleDateString()}
          </AppText>
        </View>

        {/* Requirements (III): Action Guard */}
        {isCreator && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.push({
                  pathname: "/family/tasks/EditTaskPage",
                  params: {
                    taskId: item._id,
                    title: item.title,
                    details: item.details,
                    deadline: item.deadline,
                    status: item.status,
                  },
                })
              }
            >
              <Edit size={16} color="#111827" />
              <AppText style={styles.actionLabel}>Edit</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setSelectedTaskId(item._id);
                setDeleteModalVisible(true);
              }}
            >
              <Trash2 size={16} color="#EF4444" />
              <AppText style={[styles.actionLabel, { color: "#EF4444" }]}>
                Delete
              </AppText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtnCircle}
        >
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {familyName || "Family"} Tasks
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Toggles */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(["all", "pending", "in-progress", "completed"] as TaskStatus[]).map(
            (status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setActiveFilter(status)}
                style={[
                  styles.filterChip,
                  activeFilter === status && styles.filterChipActive,
                ]}
              >
                <AppText
                  style={[
                    styles.filterText,
                    activeFilter === status && styles.filterTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() +
                    status.slice(1).replace("-", " ")}
                </AppText>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => dispatch(fetchTasksByFamily(familyId))}
            tintColor="#111827"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AppText style={styles.emptyText}>
              No tasks found in this category.
            </AppText>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/family/tasks/CreateTaskPage",
            params: { familyId },
          })
        }
      >
        <Plus color="#FFF" size={30} />
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.alertIconBg}>
              <AlertTriangle color="#EF4444" size={32} />
            </View>
            <AppText type="bold" style={styles.modalTitle}>
              Delete this task?
            </AppText>
            <AppText style={styles.modalSub}>
              Only the person who posted this task can delete it. This action
              cannot be undone.
            </AppText>

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setSelectedTaskId(null);
                }}
              >
                <AppText type="bold" style={{ color: "#4B5563" }}>
                  Cancel
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={onConfirmDelete}
              >
                <AppText type="bold" style={{ color: "#FFF" }}>
                  Yes, Delete
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────────────────────
//                            STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: "#111827" },
  filterWrapper: { backgroundColor: "#FFF", paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { fontSize: 13, color: "#4B5563", fontWeight: "600" },
  filterTextActive: { color: "#FFF" },
  taskCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "800" },
  headerDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 11, color: "#6B7280" },
  taskTitle: { fontSize: 18, color: "#111827", marginBottom: 10 },
  assignedToBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  assignedLabel: { fontSize: 13, color: "#4B5563" },
  createdByRow: { marginBottom: 12 },
  creatorLabel: { fontSize: 12, color: "#9CA3AF" },
  detailsContainer: { marginBottom: 12 },
  detailsText: { color: "#4B5563", fontSize: 14, lineHeight: 22 },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 2,
  },
  readMoreText: { color: "#3B82F6", fontWeight: "700", fontSize: 13 },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  deadlineText: { fontSize: 12, color: "#EF4444", fontWeight: "700" },
  actions: {
    flexDirection: "row",
    gap: 25,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    paddingTop: 15,
    marginTop: 15,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionLabel: { fontSize: 13, fontWeight: "700" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    backgroundColor: "#111827",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyText: { color: "#9CA3AF", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    padding: 24,
  },
  confirmBox: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  alertIconBg: {
    backgroundColor: "#FEF2F2",
    padding: 20,
    borderRadius: 50,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 22, color: "#111827", marginBottom: 8 },
  modalSub: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalRow: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  deleteBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
});

export default FamilyTasksPage;
