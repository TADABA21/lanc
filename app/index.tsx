import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const NavBar = () => (
    <View style={styles.navbar}>
      <View style={styles.navContent}>
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>LT</Text>
          </View>
          <Text style={styles.logoName}>Lancelot</Text>
        </View>
        
        <View style={styles.navButtons}>
          {user ? (
            <>
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => router.push('/(tabs)/' as any)}
              >
                <Text style={styles.navButtonTextDash}>Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navButton, styles.logoutNavButton]} 
                onPress={signOut}
              >
                <Text style={styles.navButtonText}>Logout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => router.push('/(auth)/signIn')}
              >
                <Text style={styles.navButtonTextSign}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navButton, styles.primaryNavButton]} 
                onPress={() => router.push('/(auth)/signup')}
              >
                <Text style={[styles.navButtonText, styles.primaryNavButtonText]}>Get Started</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const HeroSection = () => (
    <View style={styles.heroSection}>
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>
          One tool to manage{'\n'}
          <Text style={styles.heroTitleAccent}>clients, projects and your team</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          The first all-in-one platform for freelancers to manage clients, execute projects, 
          and hire temporary teammates — all without the complexity.
        </Text>
        
        {user ? (
          <TouchableOpacity 
            style={styles.heroCTA} 
            onPress={() => router.push('/(tabs)/' as any)}
          >
            <Text style={styles.heroCTAText}>Go to Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.heroCTA} 
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.heroCTAText}>Start Free Trial</Text>
          </TouchableOpacity>
        )}
        
        <Text style={styles.trustedBy}>Enjoy your freelancing now</Text>
      </View>
    </View>
  );

  type FeatureCardProps = {
    title: string;
    description: string;
    color?: string;
  };

  const FeatureCard = ({ title, description, color = '#4F46E5' }: FeatureCardProps) => (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: color }]}>
        <Text style={styles.featureIconText}>●</Text>
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );

  const FeaturesSection = () => (
    <View style={styles.featuresSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionBadge}>Features</Text>
        <Text style={styles.sectionTitle}>
          Everything you need to{'\n'}run your freelance business
        </Text>
        <Text style={styles.sectionSubtitle}>
          Stop juggling multiple tools. Get everything in one simple, powerful platform.
        </Text>
      </View>

      <View style={styles.featuresGrid}>
        <FeatureCard
          title="Client Management"
          description="Keep track of all your clients, contracts, and communications in one organized dashboard."
          color="#4F46E5"
        />
        <FeatureCard
          title="Project Tracking"
          description="Manage multiple projects with timelines, and progress tracking that actually works."
          color="#10B981"
        />
        <FeatureCard
          title="Team Collaboration"
          description="Hire temporary teammates for projects and collaborate seamlessly without the overhead."
          color="#F59E0B"
        />
        <FeatureCard
          title="Smart Notifications"
          description="Get notified about deadlines, payments, and project updates without being overwhelmed."
          color="#EF4444"
        />
      </View>
    </View>
  );

  const StatsSection = () => (
    <View style={styles.statsSection}>
      <View style={styles.statsContent}>
        <Text style={styles.statsTitle}>Built for freelancers, by freelancers</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            {/* <Text style={styles.statNumber}>10K+</Text>
            <Text style={styles.statLabel}>Active Users</Text> */}
          </View>
          <View style={styles.statItem}>
            {/* <Text style={styles.statNumber}>50K+</Text>
            <Text style={styles.statLabel}>Projects Managed</Text> */}
          </View>
          <View style={styles.statItem}>
            {/* <Text style={styles.statNumber}>99%</Text>
            <Text style={styles.statLabel}>Uptime</Text> */}
          </View>
        </View>
      </View>
    </View>
  );

  const CTASection = () => (
    <View style={styles.ctaSection}>
      <View style={styles.ctaContent}>
        <Text style={styles.ctaTitle}>Ready to streamline your freelance business?</Text>
        <Text style={styles.ctaSubtitle}>
          Join thousands of freelancers who've simplified their workflow with Lancelot.
        </Text>
        
        {user ? (
          <TouchableOpacity 
            style={styles.ctaButton} 
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Text style={styles.ctaButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ctaButtons}>
            <TouchableOpacity 
              style={styles.ctaButton} 
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.ctaButtonText}>Start Free Trial</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.ctaSecondaryButton} 
              onPress={() => router.push('/(auth)/signIn')}
            >
              <Text style={styles.ctaSecondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <CTASection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Navbar Styles
  navbar: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 6,
  },
  primaryNavButton: {
    backgroundColor: '#4F46E5',
  },
  logoutNavButton: {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  navButtonTextDash: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1b1919ff',
  },
  navButtonTextSign: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1b1919ff',
  },
  primaryNavButtonText: {
    color: '#FFFFFF',
  },

  // Hero Section
  heroSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: 600,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
    lineHeight: 56,
    marginBottom: 24,
  },
  heroTitleAccent: {
    color: '#4F46E5',
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#6B7280',
    lineHeight: 28,
    marginBottom: 32,
  },
  heroCTA: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 24,
  },
  heroCTAText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trustedBy: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Features Section
  featuresSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 64,
  },
  sectionBadge: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 44,
  },
  sectionSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#6B7280',
    lineHeight: 28,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    width: (width - 64) / 2,
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Stats Section
  statsSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  statsContent: {
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
    textAlign: 'center',
    marginBottom: 48,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // CTA Section
  ctaSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: '#4F46E5',
  },
  ctaContent: {
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#C7D2FE',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  ctaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  ctaButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  ctaSecondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginHorizontal: 8,
  },
  ctaSecondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});