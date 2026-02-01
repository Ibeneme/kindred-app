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
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { fetchTasksByFamily, deleteTask } from "@/src/redux/slices/taskSlice";

type TaskStatus = "all" | "pending" | "in-progress" | "completed";

const FamilyTasksPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId, familyName } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
  }>();

  const { tasks = [], loading } = useSelector(
    (state: RootState) => state.tasks
  );

  // Filter State
  const [activeFilter, setActiveFilter] = useState<TaskStatus>("all");

  // Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) dispatch(fetchTasksByFamily(familyId));
  }, [familyId]);

  // Memoized Filter Logic
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

  const renderTask = ({ item }: { item: any }) => (
    <View style={styles.taskCard}>
      <View style={styles.cardHeader}>
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "bold",
            color: getStatusColor(item.status),
          }}
        >
          {item.status.toUpperCase()}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Clock size={12} color="#6B7280" />
          <AppText style={styles.dateText}>
            {new Date(item.deadline).toLocaleDateString()}
          </AppText>
        </View>
      </View>
      <AppText type="bold" style={styles.taskTitle}>
        {item.title}
      </AppText>
      {item.details ? (
        <AppText numberOfLines={2} style={styles.detailsText}>
          {item.details}
        </AppText>
      ) : null}

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
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 18 }}>
          {familyName}
        </AppText>
        <View style={{ width: 24 }} />
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
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => dispatch(fetchTasksByFamily(familyId))}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <AppText style={{ color: "#6B7280" }}>
              No tasks found for this category.
            </AppText>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/family/tasks/CreateTaskPage",
            params: { familyId },
          })
        }
      >
        <Plus color="#FFF" size={30} />
      </TouchableOpacity>

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
              This action is permanent and your circle members will no longer
              see it.
            </AppText>

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setSelectedTaskId(null);
                }}
              >
                <AppText type="bold">No, Keep it</AppText>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" } as ViewStyle,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  filterWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  } as ViewStyle,
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  } as ViewStyle,
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  filterChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  } as ViewStyle,
  filterText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  } as TextStyle,
  filterTextActive: {
    color: "#FFF",
  } as TextStyle,
  taskCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  } as ViewStyle,
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  } as ViewStyle,
  dateText: { fontSize: 12, color: "#6B7280" } as TextStyle,
  taskTitle: { fontSize: 17, marginBottom: 6, color: "#111827" } as TextStyle,
  detailsText: {
    color: "#4B5563",
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  } as TextStyle,
  actions: {
    flexDirection: "row",
    gap: 20,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    paddingTop: 12,
  } as ViewStyle,
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  actionLabel: { fontSize: 13, fontWeight: "600" } as TextStyle,
  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    backgroundColor: "#111827",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 25,
  } as ViewStyle,
  confirmBox: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  alertIconBg: {
    alignSelf: "center",
    backgroundColor: "#FEF2F2",
    padding: 15,
    borderRadius: 40,
    marginBottom: 15,
  } as ViewStyle,
  modalTitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 10,
  } as TextStyle,
  modalSub: {
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 25,
    lineHeight: 22,
  } as TextStyle,
  modalRow: { flexDirection: "row", gap: 12 } as ViewStyle,
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  } as ViewStyle,
  deleteBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
  } as ViewStyle,
});

export default FamilyTasksPage;
