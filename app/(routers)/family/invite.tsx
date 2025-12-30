import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { ChevronLeft, Check, User, Search, Users2 } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch } from "@/src/redux/store";
import {
  replaceFamilyMembers,
  getFamilyById,
} from "@/src/redux/slices/familySlice";
import { fetchAllUsers } from "@/src/redux/slices/userSlice";

const InviteMembersPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId, currentMembers, isOwner } = useLocalSearchParams();
  const userIsOwner = isOwner === "true";

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentMembers) {
      try {
        const members = JSON.parse(currentMembers as string);
        setSelectedIds(members.map((m: any) => m._id));
      } catch (e) {
        console.error(e);
      }
    }
    setIsFetching(true);
    dispatch(fetchAllUsers())
      .unwrap()
      .then((data: any) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => Alert.alert("Error", "Failed to load directory"))
      .finally(() => setIsFetching(false));
  }, [dispatch, currentMembers]);

  const toggleUser = (userId: string) => {
    if (!userIsOwner) return; // Non-owners cannot select/deselect
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    if (!familyId || !userIsOwner) return;
    setIsSaving(true);
    dispatch(
      replaceFamilyMembers({
        familyId: familyId as string,
        userIds: selectedIds,
      })
    )
      .unwrap()
      .then(() => {
        dispatch(getFamilyById(familyId as string));
        router.back();
      })
      .catch(() => Alert.alert("Update Failed", "Something went wrong"))
      .finally(() => setIsSaving(false));
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const full = `${u?.firstName || ""} ${u?.lastName || ""}`.toLowerCase();
      return full.includes(searchQuery.toLowerCase());
    });
  }, [allUsers, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconCircle}
        >
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AppText type="bold" style={styles.headerTitle}>
            {userIsOwner ? "Manage Members" : "Members"}
          </AppText>
          <AppText style={styles.headerSubtitle}>
            {selectedIds.length} members
          </AppText>
        </View>
        {userIsOwner ? (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveBtn}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <AppText type="bold">Done</AppText>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search users..."
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredUsers.map((item) => {
          const isSelected = selectedIds.includes(item._id);
          return (
            <TouchableOpacity
              key={item._id}
              onPress={() => toggleUser(item._id)}
              activeOpacity={userIsOwner ? 0.7 : 1}
              style={[
                styles.card,
                isSelected && userIsOwner && styles.cardActive,
              ]}
            >
              <View style={styles.cardInfo}>
                <View
                  style={[
                    styles.avatar,
                    isSelected && userIsOwner && styles.avatarActive,
                  ]}
                >
                  <User
                    size={20}
                    color={isSelected && userIsOwner ? "#EAB308" : "#64748B"}
                  />
                </View>
                <View>
                  <AppText type="bold">
                    {item.firstName} {item.lastName}
                  </AppText>
                  <AppText style={styles.emailText}>{item.email}</AppText>
                </View>
              </View>
              {userIsOwner && (
                <View
                  style={[
                    styles.checkCircle,
                    isSelected && styles.checkCircleActive,
                  ]}
                >
                  {isSelected && (
                    <Check size={12} color="#000" strokeWidth={4} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 18, color: "#111827" },
  headerSubtitle: {
    fontSize: 11,
    color: "#EAB308",
    marginTop: 2,
    textTransform: "uppercase",
  },
  saveBtn: {
    backgroundColor: "#EAB308",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  searchWrapper: { padding: 16, backgroundColor: "#FFF" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  input: { flex: 1, height: 48, marginLeft: 10, color: "#1E293B" },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardActive: { borderColor: "#EAB308", backgroundColor: "#FEFCE8" },
  cardInfo: { flexDirection: "row", alignItems: "center", gap: 15 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarActive: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EAB308",
  },
  emailText: { fontSize: 12, color: "#64748B" },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleActive: { backgroundColor: "#EAB308", borderColor: "#EAB308" },
});

export default InviteMembersPage;
