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
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Plus,
  Trash2,
  Edit,
  X,
  Clock,
  Calendar as CalendarIcon,
  ArrowLeft,
  ClipboardList,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  fetchTasksByFamily,
  createTask,
  updateTask,
  deleteTask,
} from "@/src/redux/slices/taskSlice";

const FamilyTasksPage = () => {
  const router = useRouter();
  const { familyId, familyName } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
  }>();

  const dispatch = useDispatch<AppDispatch>();

  // FIX: Safety selector to prevent 'undefined' crashes
  const { tasks = [], loading = false } = useSelector(
    (state: RootState) => state.tasks || {}
  );

  // Form & UI State
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input States
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<any>("pending");

  // Date Picker States
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (familyId) {
      dispatch(fetchTasksByFamily(familyId));
    }
  }, [dispatch, familyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchTasksByFamily(familyId)).finally(() => setRefreshing(false));
  }, [dispatch, familyId]);

  const formatDate = (date: Date) => {
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(Platform.OS === "ios");
    setDate(currentDate);
  };

  const openModal = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDetails(task.details || "");
      setStatus(task.status);
      setDate(task.deadline ? new Date(task.deadline) : new Date());
    } else {
      setEditingTask(null);
      resetForm();
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
    }).start(() => {
      setModalVisible(false);
    });
  };

  const resetForm = () => {
    setTitle("");
    setDetails("");
    setStatus("pending");
    setDate(new Date());
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Task title is required");
      return;
    }
    setIsSubmitting(true);

    const payload = {
      title,
      details,
      deadline: date.toISOString(),
      status,
    };

    let result;
    if (editingTask) {
      result = await dispatch(
        updateTask({ taskId: editingTask._id, ...payload })
      );
    } else {
      result = await dispatch(createTask({ familyId, ...payload }));
    }

    setIsSubmitting(false);
    if (
      updateTask.fulfilled.match(result) ||
      createTask.fulfilled.match(result)
    ) {
      closeModal();
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "completed":
        return "#10B981";
      case "in-progress":
        return "#3B82F6";
      default:
        return "#F59E0B";
    }
  };

  const renderTaskItem = ({ item }: { item: any }) => (
    <View style={styles.taskCard}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <AppText
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status.toUpperCase()}
          </AppText>
        </View>
        {item.deadline && (
          <View style={styles.deadlineWrap}>
            <Clock size={12} color="#6B7280" />
            <AppText style={styles.deadlineText}>
              {new Date(item.deadline).toLocaleDateString()}
            </AppText>
          </View>
        )}
      </View>

      <AppText
        type="bold"
        style={[
          styles.taskTitle,
          item.status === "completed" && styles.completedText,
        ]}
      >
        {item.title}
      </AppText>

      {item.details && (
        <AppText numberOfLines={2} style={styles.taskDetails}>
          {item.details}
        </AppText>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openModal(item)}
        >
          <Edit size={16} color="#6B7280" />
          <AppText style={styles.actionLabel}>Edit</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            Alert.alert("Delete", "Delete this task?", [
              { text: "No" },
              { text: "Yes", onPress: () => dispatch(deleteTask(item._id)) },
            ]);
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {familyName} Tasks
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing && tasks.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id}
          renderItem={renderTaskItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ClipboardList size={48} color="#9CA3AF" />
              <AppText type="bold" style={styles.emptyTitle}>
                No tasks yet
              </AppText>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => openModal()}
              >
                <Plus size={20} color="#000" />
                <AppText type="bold">Add Task</AppText>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            tasks.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Plus size={28} color="#000" strokeWidth={3} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet" // iOS specific card style
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText type="bold" style={styles.modalTitle}>
                  {editingTask ? "Update Task" : "New Task"}
                </AppText>
                <TouchableOpacity onPress={closeModal}>
                  <X size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  placeholder="Task Title"
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  placeholder="Details"
                  style={[
                    styles.input,
                    { height: 80, textAlignVertical: "top" },
                  ]}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                />

                <AppText style={styles.label}>Deadline</AppText>
                <TouchableOpacity
                  style={styles.dateTrigger}
                  onPress={() => setShowPicker(true)}
                >
                  <CalendarIcon size={18} color="#6B7280" />
                  <AppText style={styles.dateText}>{formatDate(date)}</AppText>
                </TouchableOpacity>

                {showPicker && (
                  <DateTimePicker
                    value={date}
                    mode="datetime"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}

                {editingTask && (
                  <View style={styles.statusPicker}>
                    {["pending", "in-progress", "completed"].map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setStatus(s)}
                        style={[
                          styles.statusOpt,
                          status === s && {
                            backgroundColor: getStatusColor(s),
                            borderColor: getStatusColor(s),
                          },
                        ]}
                      >
                        <AppText
                          style={[
                            styles.statusOptText,
                            status === s && { color: "#FFF" },
                          ]}
                        >
                          {s}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <AppText type="bold">
                      {editingTask ? "Save Changes" : "Create Task"}
                    </AppText>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, color: "#111827", textAlign: "center", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 100 },
  taskCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "800" },
  deadlineText: { fontSize: 12, color: "#6B7280" },
  deadlineWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  taskTitle: { fontSize: 16, color: "#111827" },
  completedText: { textDecorationLine: "line-through", color: "#9CA3AF" },
  taskDetails: { fontSize: 14, color: "#4B5563", marginVertical: 8 },
  actions: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    paddingTop: 12,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionLabel: { fontSize: 13, color: "#6B7280" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    paddingTop: 64,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContainer: {},
  modalContent: { backgroundColor: "#FFF", padding: 20 },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  label: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  dateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 15,
  },
  dateText: { fontSize: 15, color: "#111827" },
  statusPicker: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statusOpt: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  statusOptText: { fontSize: 12 },
  submitBtn: {
    backgroundColor: "#EAB308",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyTitle: { fontSize: 18, marginVertical: 10 },
  emptyBtn: {
    flexDirection: "row",
    backgroundColor: "#EAB308",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, color: "#111827" },
});

export default FamilyTasksPage;
