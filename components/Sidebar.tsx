import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import {
  Home,
  FolderOpen,
  Users,
  User,
  Award,
  Mail,
  Settings,
  Moon,
  Sun,
  Monitor,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface SidebarItem {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  route: string;
  showOnMobile?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', title: 'Dashboard', icon: Home, route: '/(tabs)' },
  { id: 'projects', title: 'Projects', icon: FolderOpen, route: '/(tabs)/projects' },
  { id: 'clients', title: 'Clients', icon: Users, route: '/(tabs)/clients' },
  { id: 'team', title: 'Team', icon: User, route: '/(tabs)/team' },
  { id: 'testimonials', title: 'Testimonials', icon: Award, route: '/(tabs)/testimonials', showOnMobile: true },
  { id: 'email', title: 'Email Composer', icon: Mail, route: '/email/ai-compose', showOnMobile: true },
];

export function Sidebar() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const { isOpen, closeSidebar, isCollapsed, toggleCollapsed, shouldShowSidebar } = useSidebar();
  const { signOut, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isMobile = Platform.OS !== 'web' || screenWidth < 768;
  const sidebarWidth = isCollapsed ? 80 : 280;

  // Animation values
  const slideAnim = React.useRef(new Animated.Value(isMobile ? -sidebarWidth : 0)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isMobile) {
      if (isOpen) {
        // Slide in animation
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Slide out animation
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -sidebarWidth,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [isOpen, isMobile, sidebarWidth]);

  const handleNavigation = (route: string) => {
    try {
      router.push(route as any);
      if (isMobile) {
        closeSidebar();
      }
    } catch (error) {
      console.log('Navigation error for route:', route);
    }
  };

  const handleThemeChange = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return Sun;
      case 'dark': return Moon;
      default: return Monitor;
    }
  };

  const isActiveRoute = (route: string) => {
    if (route === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)';
    }
    return pathname.includes(route.replace('/(tabs)', ''));
  };

  const filteredItems = isMobile 
    ? sidebarItems.filter(item => item.showOnMobile)
    : sidebarItems;

  const sidebarStyles = StyleSheet.create({
    // Mobile Modal Container
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    // Animated Backdrop for Mobile
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    // Desktop Container
    container: {
      position: shouldShowSidebar ? 'relative' : 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: sidebarWidth,
      backgroundColor: colors.surface,
      borderRightWidth: shouldShowSidebar ? 1 : 0,
      borderRightColor: colors.border,
      zIndex: 999,
      paddingTop: isMobile ? 0 : insets.top,
      // Modern shadow for desktop
      ...(!isMobile && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
      }),
    },
    // Mobile Animated Container
    mobileContainer: {
      width: sidebarWidth,
      height: '100%',
      backgroundColor: colors.surface,
      paddingTop: insets.top,
      // Modern shadow for mobile
      shadowColor: colors.shadow,
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    logo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    logoIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isCollapsed ? 0 : 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    logoText: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    content: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      paddingVertical: 20,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: 'Inter-SemiBold',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      marginHorizontal: 12,
      borderRadius: 12,
      backgroundColor: 'transparent',
    },
    navItemActive: {
      backgroundColor: colors.primaryLight,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    navItemIcon: {
      marginRight: isCollapsed ? 0 : 16,
    },
    navItemText: {
      fontSize: 15,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    navItemTextActive: {
      color: colors.primary,
      fontFamily: 'Inter-SemiBold',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      padding: 20,
      backgroundColor: colors.surface,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isCollapsed ? 0 : 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    userText: {
      flex: 1,
    },
    userName: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    userEmail: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    footerActions: {
      flexDirection: 'row',
      gap: 10,
    },
    footerButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    footerButtonText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginLeft: isCollapsed ? 0 : 6,
    },
  });

  if (!shouldShowSidebar && !isOpen) {
    return null;
  }

  const ThemeIcon = getThemeIcon();

  const SidebarContent = () => (
    <View style={isMobile ? sidebarStyles.mobileContainer : sidebarStyles.container}>
      <View style={sidebarStyles.header}>
        <View style={sidebarStyles.logo}>
          <View style={sidebarStyles.logoIcon}>
            <Text style={{ color: 'white', fontFamily: 'Inter-Bold', fontSize: 16 }}>
              BM
            </Text>
          </View>
          {!isCollapsed && (
            <Text style={sidebarStyles.logoText}>Business Manager</Text>
          )}
        </View>
        
        <View style={sidebarStyles.headerActions}>
          {isMobile && (
            <TouchableOpacity style={sidebarStyles.headerButton} onPress={closeSidebar}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {shouldShowSidebar && (
            <TouchableOpacity style={sidebarStyles.headerButton} onPress={toggleCollapsed}>
              {isCollapsed ? (
                <ChevronRight size={18} color={colors.textSecondary} />
              ) : (
                <ChevronLeft size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={sidebarStyles.content} contentContainerStyle={sidebarStyles.scrollContent}>
        <View style={sidebarStyles.section}>
          {!isCollapsed && (
            <Text style={sidebarStyles.sectionTitle}>Navigation</Text>
          )}
          {filteredItems.map((item) => {
            const isActive = isActiveRoute(item.route);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  sidebarStyles.navItem,
                  isActive && sidebarStyles.navItemActive,
                ]}
                onPress={() => handleNavigation(item.route)}
                activeOpacity={0.7}
              >
                <item.icon
                  size={22}
                  color={isActive ? colors.primary : colors.textSecondary}
                  style={sidebarStyles.navItemIcon}
                />
                {!isCollapsed && (
                  <Text
                    style={[
                      sidebarStyles.navItemText,
                      isActive && sidebarStyles.navItemTextActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={sidebarStyles.footer}>
        {!isCollapsed && (
          <View style={sidebarStyles.userInfo}>
            <View style={sidebarStyles.userAvatar}>
              <Text style={{ color: 'white', fontFamily: 'Inter-Bold', fontSize: 14 }}>
                {user?.email?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={sidebarStyles.userText}>
              <Text style={sidebarStyles.userName}>User</Text>
              <Text style={sidebarStyles.userEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>
        )}

        <View style={sidebarStyles.footerActions}>
          <TouchableOpacity style={sidebarStyles.footerButton} onPress={handleThemeChange}>
            <ThemeIcon size={16} color={colors.textSecondary} />
            {!isCollapsed && (
              <Text style={sidebarStyles.footerButtonText}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={sidebarStyles.footerButton} onPress={signOut}>
            <LogOut size={16} color={colors.textSecondary} />
            {!isCollapsed && (
              <Text style={sidebarStyles.footerButtonText}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Mobile Modal with Blur and Animation
  if (isMobile) {
    return (
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={closeSidebar}
      >
        <View style={sidebarStyles.modalContainer}>
          <Animated.View
            style={[
              sidebarStyles.backdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
          >
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={closeSidebar}
              activeOpacity={1}
            />
          </Animated.View>
          
          <Animated.View
            style={{
              transform: [{ translateX: slideAnim }],
            }}
          >
            <SidebarContent />
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Desktop Sidebar
  return <SidebarContent />;
}