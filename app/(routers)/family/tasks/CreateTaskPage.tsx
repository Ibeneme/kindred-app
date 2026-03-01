import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  User,
  ChevronDown,
  Clock,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { createTask } from "@/src/redux/slices/taskSlice";
import { getFamilyById } from "@/src/redux/slices/familySlice";

const CreateTaskPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.tasks || {});
  const { familyId } = useLocalSearchParams<{ familyId: string }>();

  // Form States
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(new Date());

  // Selection States
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<"date" | "time">("date");

  useEffect(() => {
    const fetchFamily = async () => {
      if (familyId) {
        try {
          const response: any = await dispatch(
            getFamilyById(familyId)
          ).unwrap();
          // Fixed path based on your console log
          if (response?.family?.members) {
            setFamilyMembers(response.family.members);
          }
        } catch (err) {
          console.error("Failed to fetch members:", err);
        }
      }
    };
    fetchFamily();
  }, [familyId]);

  const handleSave = async () => {
    if (!title.trim())
      return Alert.alert("Required", "Please enter a task title.");
    try {
      await dispatch(
        createTask({
          familyId,
          title: title.trim(),
          details: details.trim(),
          deadline: date.toISOString(),
          assignedTo: assignedTo?.id,
        })
      ).unwrap();
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error || "Failed to create task.");
    }
  };

  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(Platform.OS === "ios"); // iOS keeps it open, Android closes it
    setDate(currentDate);
  };

  const showMode = (currentMode: "date" | "time") => {
    setMode(currentMode);
    setShowPicker(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 18 }}>
          New Task
        </AppText>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FBBF24" />
          ) : (
            <Check color="#FBBF24" size={28} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <AppText style={styles.label}>TASK TITLE</AppText>
        <TextInput
          style={styles.input}
          placeholder="What needs to be done?"
          value={title}
          onChangeText={setTitle}
        />

        <AppText style={styles.label}>ASSIGNED TO</AppText>
        <TouchableOpacity
          style={styles.selectorBtn}
          onPress={() => setIsMemberModalVisible(true)}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <User size={18} color="#FBBF24" />
            <AppText
              style={{
                marginLeft: 10,
                color: assignedTo ? "#111827" : "#9CA3AF",
              }}
            >
              {assignedTo ? assignedTo.name : "Select someone..."}
            </AppText>
          </View>
          <ChevronDown size={18} color="#6B7280" />
        </TouchableOpacity>

        <AppText style={styles.label}>DEADLINE</AppText>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.selectorBtn, { flex: 1, marginRight: 10 }]}
            onPress={() => showMode("date")}
          >
            <Calendar size={18} color="#FBBF24" />
            <AppText style={{ marginLeft: 10 }}>
              {date.toLocaleDateString()}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectorBtn, { flex: 1 }]}
            onPress={() => showMode("time")}
          >
            <Clock size={18} color="#FBBF24" />
            <AppText style={{ marginLeft: 10 }}>
              {date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </AppText>
          </TouchableOpacity>
        </View>

        {showPicker && (
          <View
            style={Platform.OS === "ios" ? styles.iosPickerContainer : null}
          >
            <DateTimePicker
              value={date}
              mode={mode}
              is24Hour={true}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onChange}
              textColor="#111827"
            />
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setShowPicker(false)}
              >
                <AppText type="bold" style={{ color: "#FBBF24" }}>
                  Done
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        <AppText style={styles.label}>REPORT / DETAILS</AppText>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Add a long report here..."
          value={details}
          onChangeText={setDetails}
          multiline
        />
      </ScrollView>

      {/* Member Selector Modal */}
      <Modal visible={isMemberModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText type="bold" style={styles.modalTitle}>
              Assign to Member
            </AppText>
            <FlatList
              data={familyMembers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberItem}
                  onPress={() => {
                    setAssignedTo({
                      id: item._id,
                      name: `${item.firstName} ${item.lastName}`,
                    });
                    setIsMemberModalVisible(false);
                  }}
                >
                  <View style={styles.avatarCircle}>
                    <AppText style={{ color: "#FFF" }}>
                      {item.firstName[0]}
                    </AppText>
                  </View>
                  <AppText style={{ marginLeft: 12, fontSize: 16 }}>
                    {item.firstName} {item.lastName}
                  </AppText>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsMemberModalVisible(false)}
            >
              <AppText type="bold">Cancel</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  label: {
    fontSize: 11,
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 24,
    fontWeight: "800",
  },
  input: {
    borderBottomWidth: 1.5,
    borderColor: "#F3F4F6",
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  textarea: {
    height: 120,
    textAlignVertical: "top",
    borderBottomWidth: 0,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  dateTimeRow: { flexDirection: "row", justifyContent: "space-between" },
  iosPickerContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginTop: 10,
    paddingBottom: 10,
  },
  doneBtn: { alignItems: "center", padding: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
  modalTitle: { fontSize: 18, marginBottom: 20, textAlign: "center" },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#FBBF24",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: { marginTop: 15, padding: 15, alignItems: "center" },
});

export default CreateTaskPage;
