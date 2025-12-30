import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  HelpCircle,
  Shield,
  Users,
  Lock,
  MessageSquare,
  Settings,
  ChevronRight,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";

// Color palette matching your current design
const COLORS = {
  black: "#000000",
  yellow: "#FFE66D",
  primary: "#FF6B6B",
  secondary: "#4ECDC4",
  mint: "#95E1BF",
  background: "#FFFFFF",
  surface: "#F8FAFC",
  text: "#1E293B",
  textLight: "#64748B",
  icon: "#64748B",
};

const SupportPage = () => {
  const router = useRouter();

  const openEmail = () => {
    Linking.openURL("mailto:support@kindred.family");
  };

  const openPhone = () => {
    Linking.openURL("tel:18005463733"); // 1-800-KINDRED
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          Support & Help
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support Section */}
        <View style={styles.section}>
          <AppText type="bold" style={styles.sectionTitle}>
            Contact Support
          </AppText>
          <AppText style={styles.sectionSubtitle}>
            Get help with your Kindred experience
          </AppText>

          <TouchableOpacity style={styles.contactCard} onPress={openEmail}>
            <View style={styles.contactIconCircle}>
              <Mail size={22} color={COLORS.yellow} />
            </View>
            <View style={styles.contactInfo}>
              <AppText type="bold" style={styles.contactLabel}>
                Email
              </AppText>
              <AppText style={styles.contactValue}>
                support@kindred.family
              </AppText>
            </View>
            <ChevronRight size={22} color={COLORS.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={openPhone}>
            <View style={styles.contactIconCircle}>
              <Phone size={22} color={COLORS.yellow} />
            </View>
            <View style={styles.contactInfo}>
              <AppText type="bold" style={styles.contactLabel}>
                Phone
              </AppText>
              <AppText style={styles.contactValue}>1-800-KINDRED</AppText>
            </View>
            <ChevronRight size={22} color={COLORS.icon} />
          </TouchableOpacity>

          <AppText style={styles.responseTime}>
            We typically respond within 24 hours during business days.
          </AppText>
        </View>

        {/* Help Articles Section */}
        <View style={styles.section}>
          <AppText type="bold" style={styles.sectionTitle}>
            Help Articles
          </AppText>
          <AppText style={styles.sectionSubtitle}>
            Common questions and guides
          </AppText>

          <TouchableOpacity style={styles.articleCard}>
            <View
              style={[
                styles.articleIconCircle,
                { backgroundColor: COLORS.primary },
              ]}
            >
              <HelpCircle size={20} color={COLORS.black} />
            </View>
            <View style={styles.articleText}>
              <AppText type="bold" style={styles.articleTitle}>
                Getting Started with Kindred
              </AppText>
              <AppText style={styles.articleDesc}>
                Learn the basics of family management
              </AppText>
            </View>
            <ChevronRight size={22} color={COLORS.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.articleCard}>
            <View
              style={[
                styles.articleIconCircle,
                { backgroundColor: COLORS.secondary },
              ]}
            >
              <Users size={20} color={COLORS.black} />
            </View>
            <View style={styles.articleText}>
              <AppText type="bold" style={styles.articleTitle}>
                Managing Family Donations
              </AppText>
              <AppText style={styles.articleDesc}>
                How to create and manage donation campaigns
              </AppText>
            </View>
            <ChevronRight size={22} color={COLORS.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.articleCard}>
            <View
              style={[
                styles.articleIconCircle,
                { backgroundColor: COLORS.mint },
              ]}
            >
              <Shield size={20} color={COLORS.black} />
            </View>
            <View style={styles.articleText}>
              <AppText type="bold" style={styles.articleTitle}>
                Privacy & Security
              </AppText>
              <AppText style={styles.articleDesc}>
                Understanding your data protection
              </AppText>
            </View>
            <ChevronRight size={22} color={COLORS.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.articleCard}>
            <View
              style={[
                styles.articleIconCircle,
                { backgroundColor: COLORS.yellow },
              ]}
            >
              <Lock size={20} color={COLORS.black} />
            </View>
            <View style={styles.articleText}>
              <AppText type="bold" style={styles.articleTitle}>
                Family Roles & Permissions
              </AppText>
              <AppText style={styles.articleDesc}>
                Learn about admin and member roles
              </AppText>
            </View>
            <ChevronRight size={22} color={COLORS.icon} />
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <AppText type="bold" style={styles.sectionTitle}>
            Frequently Asked Questions
          </AppText>

          <View style={styles.faqItem}>
            <AppText type="bold" style={styles.faqQuestion}>
              How secure are family donations?
            </AppText>
            <AppText style={styles.faqAnswer}>
              All donations are held in secure escrow accounts with bank-level
              security. Funds can only be released with proper family admin
              approval through our secure withdrawal process.
            </AppText>
          </View>

          <View style={styles.faqItem}>
            <AppText type="bold" style={styles.faqQuestion}>
              Can I change my privacy settings?
            </AppText>
            <AppText style={styles.faqAnswer}>
              Yes! Go to Settings → Privacy to control what information is
              shared with family members and which notifications you receive.
            </AppText>
          </View>

          <View style={styles.faqItem}>
            <AppText type="bold" style={styles.faqQuestion}>
              How do I invite new family members?
            </AppText>
            <AppText style={styles.faqAnswer}>
              Family admins can invite new members by going to the Members tab
              in your family dashboard and clicking "Invite Member". You can
              invite by email or phone number.
            </AppText>
          </View>

          <View style={styles.faqItem}>
            <AppText type="bold" style={styles.faqQuestion}>
              What happens if I forget my password?
            </AppText>
            <AppText style={styles.faqAnswer}>
              You can reset your password from the login page by clicking
              "Forgot Password" or change it in Settings → Security when logged
              in.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, color: COLORS.text },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },

  section: { marginTop: 32 },
  sectionTitle: { fontSize: 20, color: COLORS.text, marginBottom: 8 },
  sectionSubtitle: { fontSize: 15, color: COLORS.textLight, marginBottom: 20 },

  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    gap: 16,
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 14, color: COLORS.textLight },
  contactValue: { fontSize: 16, color: COLORS.text },

  responseTime: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 12,
  },

  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    gap: 16,
  },
  articleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  articleText: { flex: 1 },
  articleTitle: { fontSize: 16, color: COLORS.text },
  articleDesc: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },

  faqItem: { marginBottom: 20 },
  faqQuestion: { fontSize: 16, color: COLORS.text, marginBottom: 8 },
  faqAnswer: { fontSize: 15, color: COLORS.textLight, lineHeight: 22 },

  bottomSection: { marginTop: 40, alignItems: "center" },
  bottomCard: {
    backgroundColor: COLORS.surface,
    padding: 28,
    borderRadius: 28,
    alignItems: "center",
    gap: 16,
  },
  bottomText: { fontSize: 16, color: COLORS.text, textAlign: "center" },
  settingsBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 28,
  },
  settingsBtnText: { fontSize: 16, color: COLORS.yellow },
});

export default SupportPage;
