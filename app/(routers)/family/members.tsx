import React from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, MessageCircle } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";

const FamilyMembersPage = () => {
  const { members, familyName } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.user);

  const membersList = members ? JSON.parse(members as string) : [];

  // Helper: Get initials from name
  const getInitials = (firstName: string, lastName: string) => {
    return (
      `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "??"
    );
  };

  const handleMemberPress = (member: any) => {
    if (!user) return;

    // Prevent messaging yourself
    if (user._id === member._id) {
      // Optionally: navigate to own profile or do nothing
      return;
    }

    router.push({
      pathname: "/(routers)/messages/chat",
      params: {
        uuid: member?.uuid,
        senderId: user._id,
        senderName: `${user.firstName} ${user.lastName}`,
        receiverId: member._id,
        receiverName: `${member.firstName} ${member.lastName}`,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {familyName || "Family"} Members
        </AppText>
        <View style={{ width: 48 }} /> {/* Spacer for centering title */}
      </View>

      {/* Members List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {membersList.length > 0 ? (
          membersList.map((member: any) => {
            const isMe = user?._id === member._id;
            const initials = getInitials(member.firstName, member.lastName);

            return (
              <TouchableOpacity
                key={member._id}
                onPress={() => handleMemberPress(member)}
                activeOpacity={isMe ? 1 : 0.8}
                style={[styles.memberCard, isMe && styles.disabledCard]}
              >
                {/* Avatar with Initials */}
                <View style={styles.avatar}>
                  <AppText type="bold" style={styles.initials}>
                    {initials}
                  </AppText>
                </View>

                {/* Member Info */}
                <View style={styles.infoContainer}>
                  <AppText type="bold" style={styles.memberName}>
                    {member.firstName} {member.lastName}
                    {isMe && <AppText style={styles.youTag}> (You)</AppText>}
                  </AppText>
                  <AppText style={styles.memberEmail}>{member.email}</AppText>
                </View>

                {/* Message Icon - only for others */}
                {!isMe && (
                  <View style={styles.messageButton}>
                    <MessageCircle size={22} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <AppText style={styles.emptyText}>No family members found.</AppText>
          </View>
        )}
      </ScrollView>
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    color: "#111827",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    zIndex: -1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.7,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  infoContainer: {
    flex: 1,
    marginLeft: 14,
  },
  memberName: {
    fontSize: 16.5,
    color: "#111827",
  },
  youTag: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "600",
  },
  memberEmail: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },

  messageButton: {
    width: 44,
    height: 44,
    backgroundColor: "#EAB308", // Nice amber/yellow
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#94A3B8",
  },
});

export default FamilyMembersPage;
