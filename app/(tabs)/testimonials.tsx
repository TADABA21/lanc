import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Testimonial } from '@/types/database';
import { Award, Star, Share2, ExternalLink, MoveVertical as MoreVertical } from 'lucide-react-native';
import { formatDistanceToNow } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TestimonialsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { shouldShowSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMobile = Platform.OS !== 'web' || window.innerWidth < 768;

  const fetchTestimonials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTestimonials();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTestimonials();
  }, [user]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out our client testimonials!',
        url: 'https://example.com/testimonials', // Replace with your actual testimonials page
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Calculate bottom padding to account for tab bar
  const getBottomPadding = () => {
    if (Platform.OS === 'android') {
      const androidBottomPadding = Math.max(insets.bottom + 8, 24);
      const tabBarHeight = 70 + androidBottomPadding;
      return tabBarHeight + 20;
    }
    return insets.bottom > 0 ? 100 + insets.bottom : 100;
  };

  const bottomPadding = isMobile ? getBottomPadding() : 20;

  const StarRating = ({ rating }: { rating: number }) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          color={star <= rating ? '#F59E0B' : colors.border}
          fill={star <= rating ? '#F59E0B' : 'transparent'}
        />
      ))}
    </View>
  );

  const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
    <View style={styles.testimonialCard}>
      <View style={styles.testimonialHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>
            {testimonial.client_name || 'Anonymous'}
          </Text>
          {testimonial.client_position && (
            <Text style={styles.clientPosition}>{testimonial.client_position}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <MoreVertical size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {testimonial.rating && (
        <StarRating rating={testimonial.rating} />
      )}

      <Text style={styles.testimonialContent}>"{testimonial.content}"</Text>

      <View style={styles.testimonialFooter}>
        <Text style={styles.testimonialDate}>
          {formatDistanceToNow(new Date(testimonial.created_at))}
        </Text>
        <View style={styles.testimonialBadges}>
          {testimonial.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {testimonial.is_public && (
            <View style={styles.publicBadge}>
              <Text style={styles.badgeText}>Public</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const averageRating = testimonials.length > 0 
    ? testimonials
        .filter(t => t.rating)
        .reduce((sum, t) => sum + (t.rating || 0), 0) / testimonials.filter(t => t.rating).length
    : 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: shouldShowSidebar ? 16 : 0,
      paddingBottom: 8,
    },
    title: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    shareButton: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginTop: 2,
    },
    linkContainer: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    linkCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkInfo: {
      flex: 1,
    },
    linkTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    linkDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    linkUrl: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
    },
    linkButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    testimonialCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    testimonialHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    clientInfo: {
      flex: 1,
    },
    clientName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 2,
    },
    clientPosition: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    menuButton: {
      padding: 4,
    },
    starContainer: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    testimonialContent: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 24,
      marginBottom: 12,
      fontStyle: 'italic',
    },
    testimonialFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    testimonialDate: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    testimonialBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    featuredBadge: {
      backgroundColor: '#F59E0B',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    publicBadge: {
      backgroundColor: '#10B981',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    emptyButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {shouldShowSidebar && (
        <View style={styles.header}>
          <Text style={styles.title}>Testimonials</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Share2 size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{testimonials.length}</Text>
          <Text style={styles.statLabel}>Total Reviews</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {testimonials.filter(t => t.is_featured).length}
          </Text>
          <Text style={styles.statLabel}>Featured</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {testimonials.filter(t => t.is_public).length}
          </Text>
          <Text style={styles.statLabel}>Public</Text>
        </View>
      </View>

      {/* Collection Link */}
      <View style={styles.linkContainer}>
        <View style={styles.linkCard}>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Collection Link</Text>
            <Text style={styles.linkDescription}>
              Share this link with clients to collect testimonials
            </Text>
            <Text style={styles.linkUrl}>
              https://example.com/testimonials/{user?.id}
            </Text>
          </View>
          <TouchableOpacity style={styles.linkButton}>
            <ExternalLink size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {testimonials.length > 0 ? (
          testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Award size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No testimonials yet</Text>
            <Text style={styles.emptyDescription}>
              Share your collection link with clients to start gathering testimonials
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleShare}>
              <Text style={styles.emptyButtonText}>Share Collection Link</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}