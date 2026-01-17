import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  X,
  Edit3,
  ChevronLeft,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react-native";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker, {
  DateTimePickerAndroid,
  AndroidEvent,
} from "@react-native-community/datetimepicker";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  fetchFamilyContent,
  createFamilyContent,
  updateFamilyContent,
} from "@/src/redux/slices/familyContentSlice";

const KeyDatesPage = () => {
  const { familyId, isOwner } = useLocalSearchParams<{
    familyId: string;
    isOwner: string;
  }>();
  const canEdit = isOwner === "true";
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { contents, status } = useSelector(
    (state: RootState) => state.familyContent
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<"upcoming" | "past">("upcoming");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [place, setPlace] = useState("");
  const [visibility, setVisibility] = useState("public");

  const [openDropdown, setOpenDropdown] = useState(false);
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  useEffect(() => {
    if (familyId) {
      dispatch(fetchFamilyContent({ familyId, type: "Key Date" }));
    }
  }, [familyId]);

  const resetForm = (item: any = null) => {
    if (item) {
      setSelectedItem(item);
      setTitle(item.title || "");
      setDescription(item.description || "");
      setEventDate(new Date(item.metadata?.eventDate || new Date()));
      setPlace(item.metadata?.place || "");
      setVisibility(item.metadata?.visibility || "public");
    } else {
      setSelectedItem(null);
      setTitle("");
      setDescription("");
      setEventDate(new Date());
      setPlace("");
      setVisibility("public");
    }
  };

  const openAndroidDateTimePicker = () => {
    DateTimePickerAndroid.open({
      value: eventDate,
      mode: "date",
      is24Hour: true,
      onChange: (event: AndroidEvent, selectedDate?: Date) => {
        if (event.type !== "set" || !selectedDate) return;

        const updated = new Date(eventDate);
        updated.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );

        DateTimePickerAndroid.open({
          value: updated,
          mode: "time",
          is24Hour: true,
          onChange: (e, selectedTime) => {
            if (e.type !== "set" || !selectedTime) return;
            updated.setHours(
              selectedTime.getHours(),
              selectedTime.getMinutes(),
              0,
              0
            );
            setEventDate(updated);
          },
        });
      },
    });
  };

  const filteredData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contents
      .filter((item) => {
        const d = new Date(item.metadata?.eventDate);
        return filterMode === "upcoming" ? d >= today : d < today;
      })
      .sort((a, b) => {
        const aTime = new Date(a.metadata?.eventDate).getTime();
        const bTime = new Date(b.metadata?.eventDate).getTime();
        return filterMode === "upcoming" ? aTime - bTime : bTime - aTime;
      });
  }, [contents, filterMode]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    setIsSaving(true);

    const payload = {
      familyId: familyId!,
      contentType: "Key Date",
      title,
      description,
      metadata: {
        eventDate: eventDate.toISOString(),
        place,
        visibility,
      },
    };

    try {
      if (selectedItem) {
        await dispatch(
          updateFamilyContent({ id: selectedItem._id, ...payload })
        ).unwrap();
      } else {
        await dispatch(createFamilyContent(payload)).unwrap();
      }
      setModalVisible(false);
      resetForm();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save event");
    } finally {
      setIsSaving(false);
    }
  };

  const renderEventCard = ({ item }: { item: any }) => {
    const date = new Date(item.metadata?.eventDate);
    const isPast = date < new Date();

    return (
      <View style={[styles.eventCard, isPast && styles.eventCardPast]}>
        <View style={styles.dateBox}>
          <AppText style={styles.dateBoxMonth} type="bold">
            {date.toLocaleString("en-GB", { month: "short" }).toUpperCase()}
          </AppText>
          <AppText style={styles.dateBoxDay} type="bold">
            {date.getDate()}
          </AppText>
        </View>

        <View style={styles.eventInfo}>
          <AppText type="semibold" style={styles.eventTitle}>
            {item.title}
          </AppText>

          <View style={styles.metaRow}>
            <Clock size={16} color="#6B7280" />
            <AppText style={styles.metaText}>
              {date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </AppText>
          </View>

          {item.metadata?.place ? (
            <View style={styles.metaRow}>
              <MapPin size={16} color="#6B7280" />
              <AppText style={styles.metaText} numberOfLines={1}>
                {item.metadata.place}
              </AppText>
            </View>
          ) : null}

          {item.description ? (
            <AppText style={styles.eventDescription} numberOfLines={2}>
              {item.description}
            </AppText>
          ) : null}
        </View>

        {canEdit && (
          <TouchableOpacity
            hitSlop={12}
            onPress={() => {
              resetForm(item);
              setModalVisible(true);
            }}
          >
            <Edit3 size={20} color="#EAB308" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          Family Events
        </AppText>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterMode === "upcoming" && styles.filterTabActive,
          ]}
          onPress={() => setFilterMode("upcoming")}
        >
          <AppText
            style={[
              styles.filterTabText,
              filterMode === "upcoming" && styles.filterTabTextActive,
            ]}
          >
            Upcoming
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filterMode === "past" && styles.filterTabActive,
          ]}
          onPress={() => setFilterMode("past")}
        >
          <AppText
            style={[
              styles.filterTabText,
              filterMode === "past" && styles.filterTabTextActive,
            ]}
          >
            Past
          </AppText>
        </TouchableOpacity>
      </View>

      {status === "loading" ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>No {filterMode} events yet</AppText>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(i) => i._id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {canEdit && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Plus size={32} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* ── MODAL ──────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText type="bold" style={styles.modalTitle}>
                  {selectedItem ? "Edit Event" : "New Event"}
                </AppText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={28} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
              >
                <AppText style={styles.formLabel}>Event Title *</AppText>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Birthday, Anniversary, etc."
                  placeholderTextColor="#9CA3AF"
                />

                <AppText style={styles.formLabel}>Date & Time</AppText>
                <Pressable
                  style={styles.datePickerTrigger}
                  onPress={() =>
                    Platform.OS === "android"
                      ? openAndroidDateTimePicker()
                      : setShowIOSPicker(true)
                  }
                >
                  <Calendar size={20} color="#4B5563" />
                  <AppText style={styles.dateText}>
                    {eventDate.toLocaleString([], {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </AppText>
                </Pressable>

                {Platform.OS === "ios" && showIOSPicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="datetime"
                    display="inline"
                    onChange={(_, d) => d && setEventDate(d)}
                  />
                )}

                <AppText style={styles.formLabel}>Location</AppText>
                <TextInput
                  style={styles.input}
                  value={place}
                  onChangeText={setPlace}
                  placeholder="City, venue or online"
                  placeholderTextColor="#9CA3AF"
                />

                <AppText style={styles.formLabel}>Description</AppText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Any additional notes..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <AppText style={styles.formLabel}>Visibility</AppText>
                <DropDownPicker
                  open={openDropdown}
                  value={visibility}
                  items={[
                    { label: "Public (all family)", value: "public" },
                    { label: "Private (only admins)", value: "private" },
                  ]}
                  setOpen={setOpenDropdown}
                  setValue={setVisibility}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownList}
                  textStyle={{ fontSize: 16 }}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <AppText type="bold" style={styles.saveBtnText}>
                      {selectedItem ? "Update Event" : "Create Event"}
                    </AppText>
                  )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 20,
    color: "#111827",
  },

  // Filter
  filterContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  filterTabText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "#1E293B",
    fontWeight: "600",
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eventCardPast: {
    opacity: 0.75,
  },
  dateBox: {
    width: 64,
    height: 64,
    backgroundColor: "#EAB308",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  dateBoxMonth: {
    fontSize: 13,
    color: "#FFF",
    letterSpacing: 0.5,
  },
  dateBoxDay: {
    fontSize: 26,
    color: "#FFF",
    lineHeight: 28,
  },
  eventInfo: {
    flex: 1,
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 17,
    color: "#111827",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: "#64748B",
  },
  eventDescription: {
    fontSize: 14,
    color: "#475569",
    marginTop: 8,
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 20,
    color: "#111827",
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    minHeight: 96,
    paddingTop: 14,
  },
  datePickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  dropdown: {
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  dropdownList: {
    borderColor: "#E2E8F0",
    borderRadius: 12,
  },
  saveBtn: {
    marginTop: 32,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "#6B7280",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Empty & Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
  },
});

export default KeyDatesPage;
