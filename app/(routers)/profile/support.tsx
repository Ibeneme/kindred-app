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
  ChevronRight,
  LifeBuoy,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";

// Updated Palette for Consistency
const COLORS = {
  primaryGold: "#EAB308",
  goldLight: "#FEF9C3",
  slateDark: "#0F172A",
  slateText: "#1E293B",
  slateLight: "#64748B",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
};

const SupportPage = () => {
  const router = useRouter();

  const openEmail = () => Linking.openURL("mailto:support@kindred.family");
  const openPhone = () => Linking.openURL("tel:18005463733");

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <ArrowLeft size={22} color={COLORS.slateText} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          Help Center
        </AppText>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support Hero Card */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconCircle}>
            <LifeBuoy size={32} color={COLORS.primaryGold} />
          </View>
          <AppText type="bold" style={styles.heroTitle}>
            How can we help?
          </AppText>
          <AppText style={styles.heroSubtitle}>
            Our team typically responds within 24 hours.
          </AppText>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.contactCard} onPress={openEmail}>
            <View style={styles.iconBox}>
              <Mail size={20} color={COLORS.primaryGold} />
            </View>
            <View style={styles.flexOne}>
              <AppText style={styles.cardLabel}>Email Support</AppText>
              <AppText type="bold" style={styles.cardValue}>
                support@kindred.family
              </AppText>
            </View>
            <ChevronRight size={18} color={COLORS.slateLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={openPhone}>
            <View style={styles.iconBox}>
              <Phone size={20} color={COLORS.primaryGold} />
            </View>
            <View style={styles.flexOne}>
              <AppText style={styles.cardLabel}>Phone Line</AppText>
              <AppText type="bold" style={styles.cardValue}>
                1-800-KINDRED
              </AppText>
            </View>
            <ChevronRight size={18} color={COLORS.slateLight} />
          </TouchableOpacity>
        </View>

        {/* Knowledge Base */}
        <View style={styles.section}>
          <AppText type="bold" style={styles.sectionHeading}>
            Help Articles
          </AppText>
          <View style={styles.articleList}>
            <ArticleLink
              icon={<HelpCircle size={18} color={COLORS.primaryGold} />}
              title="Getting Started"
              desc="Basics of family management"
            />
            <ArticleLink
              icon={<Users size={18} color={COLORS.primaryGold} />}
              title="Managing Donations"
              desc="Creating fundraiser campaigns"
            />
            <ArticleLink
              icon={<Shield size={18} color={COLORS.primaryGold} />}
              title="Privacy & Security"
              desc="Data protection explained"
            />
            <ArticleLink
              icon={<Lock size={18} color={COLORS.primaryGold} />}
              title="Roles & Permissions"
              desc="Admin vs Member roles"
              isLast
            />
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <AppText type="bold" style={styles.sectionHeading}>
            Common Questions
          </AppText>

          <FAQItem
            question="How secure are family donations?"
            answer="All donations are held in secure escrow accounts. Funds are only released with admin approval through our multi-signature withdrawal process."
          />
          <FAQItem
            question="Can I change my privacy settings?"
            answer="Yes. Navigate to Profile → Preferences to control exactly what information is shared with other family members."
          />
          <FAQItem
            question="How do I invite members?"
            answer="Family admins can use the 'Invite' button on the Members tab to send invitations via email or a secure link."
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// --- HELPER COMPONENTS ---

const ArticleLink = ({ icon, title, desc, isLast }: any) => (
  <TouchableOpacity
    style={[styles.articleRow, isLast && { borderBottomWidth: 0 }]}
  >
    <View style={styles.articleIcon}>{icon}</View>
    <View style={styles.flexOne}>
      <AppText type="bold" style={styles.articleTitle}>
        {title}
      </AppText>
      <AppText style={styles.articleDesc}>{desc}</AppText>
    </View>
    <ChevronRight size={16} color={COLORS.border} />
  </TouchableOpacity>
);

const FAQItem = ({ question, answer }: any) => (
  <View style={styles.faqCard}>
    <AppText type="bold" style={styles.faqQuestion}>
      {question}
    </AppText>
    <AppText style={styles.faqAnswer}>{answer}</AppText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flexOne: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    color: COLORS.slateText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  scrollContent: { paddingHorizontal: 20 },

  heroSection: { alignItems: "center", marginTop: 30, marginBottom: 20 },
  heroIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 15,
  },
  heroTitle: { fontSize: 24, color: COLORS.slateText, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: COLORS.slateLight, marginTop: 4 },

  section: { marginTop: 25 },
  sectionHeading: {
    fontSize: 18,
    color: COLORS.slateText,
    marginBottom: 15,
    marginLeft: 4,
  },

  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    gap: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.goldLight,
    justifyContent: "center",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.slateLight,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  cardValue: { fontSize: 15, color: COLORS.slateText, marginTop: 1 },

  articleList: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
    gap: 15,
  },
  articleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  articleTitle: { fontSize: 15, color: COLORS.slateText },
  articleDesc: { fontSize: 13, color: COLORS.slateLight, marginTop: 2 },

  faqCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqQuestion: { fontSize: 15, color: COLORS.slateText, marginBottom: 8 },
  faqAnswer: { fontSize: 14, color: COLORS.slateLight, lineHeight: 20 },
});

export default SupportPage;
