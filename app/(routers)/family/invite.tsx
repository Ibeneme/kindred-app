import React, { useEffect, useState } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronLeft,
  MailPlus,
  Info,
  Search,
  UserCheck,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  replaceFamilyMembers,
  getFamilyById,
} from "@/src/redux/slices/familySlice";
import { fetchAllUsers } from "@/src/redux/slices/userSlice";

const InviteMembersPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId, isOwner } = useLocalSearchParams();
  const userIsOwner = isOwner === "true";

  const { users, loading: usersLoading } = useSelector(
    (state: RootState) => state.users // assuming your user slice is called "users"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [foundUser, setFoundUser] = useState<any | null>(null);

  useEffect(() => {
    if (!users || users.length === 0) {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, users]);

  // Search logic: by email or phone
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFoundUser(null);
      return;
    }

    // Try to find user by email or phone
    const match = users.find((u: any) => {
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || u.phoneNumber || "")
        .toLowerCase()
        .replace(/[\s\-\+]/g, ""); // normalize
      const queryNoSpace = q.replace(/[\s\-\+]/g, "");

      return email === q || phone === queryNoSpace;
    });

    setFoundUser(match || null);
  }, [searchQuery, users]);

  const isValidInput = (input: string) => {
    const trimmed = input.trim();
    // Rough validation: either looks like email or like phone
    const looksLikeEmail =
      trimmed.includes("@") && trimmed.includes(".") && trimmed.length > 5;
    const looksLikePhone = /^\+?\d{8,15}$/.test(
      trimmed.replace(/[\s\-\(\)]/g, "")
    );
    return looksLikeEmail || looksLikePhone;
  };

  const getInviteEmail = () => {
    if (foundUser) {
      return foundUser.email; // prefer email of found user
    }
    // otherwise use whatever was typed (hopefully email)
    return searchQuery.trim();
  };

  const handleInvite = () => {
    if (!familyId || !userIsOwner) return;

    const emailToInvite = getInviteEmail();

    if (!emailToInvite || !emailToInvite.includes("@")) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid email address to send invitation."
      );
      return;
    }

    setIsSaving(true);

    dispatch(
      replaceFamilyMembers({
        familyId: familyId as string,
        emails: [emailToInvite],
      })
    )
      .unwrap()
      .then(() => {
        dispatch(getFamilyById(familyId as string));
        Alert.alert("Success", `Invitation sent to ${emailToInvite}`);
        router.back();
      })
      .catch((error) => {
        Alert.alert(
          "Invite Failed",
          typeof error === "string" ? error : error?.message || "Server error"
        );
      })
      .finally(() => setIsSaving(false));
  };

  const placeholderText = searchQuery.includes("@")
    ? "Enter email address..."
    : "Enter phone number or email...";

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
            Invite Member
          </AppText>
          <AppText style={styles.headerSubtitle}>By email or phone</AppText>
        </View>

        <View style={{ width: 80 }} />
      </View>

      <View style={styles.guideContainer}>
        <Info size={18} color="#64748B" />
        <AppText style={styles.guideText}>
          Enter email or phone number. If they're already on the app, we'll
          still send the invite link to their email.
        </AppText>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder={placeholderText}
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            keyboardType={
              searchQuery.includes("@") ? "email-address" : "phone-pad"
            }
            autoCorrect={false}
            autoFocus
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {usersLoading ? (
          <ActivityIndicator
            size="large"
            color="#EAB308"
            style={{ marginTop: 80 }}
          />
        ) : isValidInput(searchQuery) ? (
          <TouchableOpacity
            style={styles.inviteCard}
            onPress={handleInvite}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#EAB308" />
            ) : (
              <>
                <MailPlus size={28} color="#EAB308" />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <AppText type="bold" style={styles.inviteTitle}>
                    Invite{" "}
                    {foundUser
                      ? `"${foundUser.firstName || "User"}"`
                      : `"${searchQuery.trim()}"`}
                  </AppText>

                  <AppText style={styles.inviteSubtitle}>
                    Send invitation link to{" "}
                    {foundUser ? foundUser.email : "this email"}
                  </AppText>

                  {foundUser && (
                    <View style={styles.alreadyOnAppRow}>
                      <UserCheck size={16} color="#16A34A" />
                      <AppText style={styles.alreadyOnAppText}>
                        This user is already on the app
                      </AppText>
                    </View>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : searchQuery.trim() ? (
          <AppText style={styles.hintText}>
            Enter a valid email or phone number (min 8 digits) to continue
          </AppText>
        ) : (
          <AppText style={styles.hintText}>
            Type email or phone number above to invite someone
          </AppText>
        )}
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
  headerSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },

  guideContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F9FF",
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
    marginLeft: 10,
  },

  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    height: 52,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
  },

  listContainer: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 100,
  },

  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#EAB308",
    borderStyle: "dashed",
    width: "100%",
    marginTop: 20,
  },
  inviteTitle: { fontSize: 16, color: "#111827" },
  inviteSubtitle: { fontSize: 13, color: "#64748B", marginTop: 4 },

  alreadyOnAppRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  alreadyOnAppText: {
    fontSize: 13,
    color: "#16A34A",
    marginLeft: 6,
    fontWeight: "500",
  },

  hintText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 60,
    paddingHorizontal: 30,
  },
});

export default InviteMembersPage;
