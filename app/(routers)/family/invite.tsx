import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import {
  ChevronLeft,
  MailPlus,
  Info,
  Search,
  Share2,
  Copy,
  Hash,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch } from "@/src/redux/store";
import {
  replaceFamilyMembers,
  getFamilyById,
} from "@/src/redux/slices/familySlice";

const InviteMembersPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // (Edit 17) Extract familyCode from params
  const { familyId, isOwner, familyName, familyCode } = useLocalSearchParams();
  const userIsOwner = isOwner === "true";

  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // The instruction message telling them to download Kindred and use the specific code
  const inviteMessage = `Hey! I'm inviting you to join our family group "${
    familyName || "Family"
  }" on the Kindred App. 

1. Search for "Kindred" on the App Store or Play Store and download it.
2. Sign up and select "Join Family".
3. Enter this Family Code to join: ${familyCode || familyId}

See you there!`;

  const handleShareInvite = async () => {
    try {
      await Share.share({ message: inviteMessage });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(inviteMessage);
    Alert.alert("Copied!", "Invite instructions and code copied to clipboard.");
  };

  const handleInvite = () => {
    if (!familyId || !userIsOwner) return;
    const email = searchQuery.trim();
    if (!email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    dispatch(
      replaceFamilyMembers({ familyId: familyId as string, emails: [email] })
    )
      .unwrap()
      .then(() => {
        dispatch(getFamilyById(familyId as string));
        Alert.alert("Success", `Official email invite sent to ${email}`);
        router.back();
      })
      .catch((err) => Alert.alert("Invite Failed", err?.message || "Error"))
      .finally(() => setIsSaving(false));
  };

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
          <AppText style={styles.headerSubtitle}>{familyName}</AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.guideContainer}>
          <Info size={18} color="#1E40AF" />
          <AppText style={styles.guideText}>
            Share the family code below with your relatives so they can join
            this group.
          </AppText>
        </View>

        {/* Display the Code for the Admin */}
        <View style={styles.codeDisplayBox}>
          <Hash size={16} color="#64748B" />
          <AppText style={styles.codeLabel}>FAMILY CODE: </AppText>
          <AppText type="bold" style={styles.codeValue}>
            {familyCode || familyId}
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText type="bold" style={styles.sectionLabel}>
            Invite via Social Apps
          </AppText>

          <View style={styles.shareActionsRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#111827" }]}
              onPress={handleShareInvite}
            >
              <Share2 size={24} color="#FFF" />
              <AppText style={styles.actionCardText}>Share Code & Link</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#EAB308" }]}
              onPress={copyToClipboard}
            >
              <Copy size={24} color="#FFF" />
              <AppText style={styles.actionCardText}>Copy Instructions</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <AppText style={styles.dividerText}>OR INVITE BY EMAIL</AppText>
          <View style={styles.line} />
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder="Enter email address..."
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {searchQuery.includes("@") && (
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
                    Invite "{searchQuery.trim()}"
                  </AppText>
                  <AppText style={styles.inviteSubtitle}>
                    Send via email
                  </AppText>
                </View>
              </>
            )}
          </TouchableOpacity>
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
  scrollBody: { padding: 16 },
  guideContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
  },
  guideText: { flex: 1, fontSize: 13, color: "#1E40AF", marginLeft: 10 },
  codeDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 25,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  codeLabel: { fontSize: 12, color: "#64748B", marginLeft: 6 },
  codeValue: { fontSize: 16, color: "#111827", letterSpacing: 1 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  shareActionsRow: { flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  actionCardText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 11,
    fontWeight: "bold",
    color: "#94A3B8",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 54,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: "#1E293B" },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#EAB308",
    borderStyle: "dashed",
    marginTop: 15,
  },
  inviteTitle: { fontSize: 15, color: "#111827" },
  inviteSubtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
});

export default InviteMembersPage;
