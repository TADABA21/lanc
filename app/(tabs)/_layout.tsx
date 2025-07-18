import { Redirect, Tabs } from 'expo-router';
import { Chrome as Home, FolderOpen, Users, User, Menu, Award } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { View, ActivityIndicator, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sidebar } from '@/components/Sidebar';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const { shouldShowSidebar, openSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isMobile = Platform.OS !== 'web' || screenWidth < 768;

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  // Calculate proper spacing for Android to avoid system navigation
  const getTabBarStyle = () => {
    if (Platform.OS === 'android') {
      const androidBottomPadding = Math.max(insets.bottom + 8, 24);
      
      return {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingBottom: androidBottomPadding,
        paddingTop: 12,
        height: 70 + androidBottomPadding,
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 8,
        shadowColor: 'transparent',
      };
    }

    // iOS styling
    return {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
      paddingTop: 8,
      height: insets.bottom > 0 ? 80 + insets.bottom : 80,
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      elevation: 0,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    };
  };

  // Add button component for mobile headers
  const MobileAddButton = ({ route }: { route: string }) => (
    <TouchableOpacity
      onPress={() => router.push(route as any)}
      style={{
        marginRight: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.primary,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Plus size={18} color="white" />
    </TouchableOpacity>
  );

  const TabsComponent = () => (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isMobile ? getTabBarStyle() : { display: 'none' },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
          headerShown: isMobile,
          headerTitle: 'Dashboard',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTitleStyle: {
            color: colors.text,
            fontFamily: 'Inter-Bold',
          },
          headerLeft: isMobile ? () => (
            <TouchableOpacity
              onPress={openSidebar}
              style={{
                marginLeft: 16,
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.background,
              }}
            >
              <Menu size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ size, color }) => (
            <FolderOpen size={size} color={color} />
          ),
          headerShown: isMobile,
          headerTitle: 'Projects',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTitleStyle: {
            color: colors.text,
            fontFamily: 'Inter-Bold',
          },
          headerLeft: isMobile ? () => (
            <TouchableOpacity
              onPress={openSidebar}
              style={{
                marginLeft: 16,
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.background,
              }}
            >
              <Menu size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined,
          headerRight: isMobile ? () => (
            <MobileAddButton route="/projects/new" />
          ) : undefined,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
          headerShown: isMobile,
          headerTitle: 'Clients',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTitleStyle: {
            color: colors.text,
            fontFamily: 'Inter-Bold',
          },
          headerLeft: isMobile ? () => (
            <TouchableOpacity
              onPress={openSidebar}
              style={{
                marginLeft: 16,
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.background,
              }}
            >
              <Menu size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined,
          headerRight: isMobile ? () => (
            <MobileAddButton route="/clients/new" />
          ) : undefined,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
          headerShown: isMobile,
          headerTitle: 'Team',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTitleStyle: {
            color: colors.text,
            fontFamily: 'Inter-Bold',
          },
          headerLeft: isMobile ? () => (
            <TouchableOpacity
              onPress={openSidebar}
              style={{
                marginLeft: 16,
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.background,
              }}
            >
              <Menu size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined,
          headerRight: isMobile ? () => (
            <MobileAddButton route="/team/new" />
          ) : undefined,
        }}
      />
      <Tabs.Screen
        name="testimonials"
        options={{
          title: 'Testimonials',
          tabBarIcon: ({ size, color }) => (
            <Award size={size} color={color} />
          ),
          headerShown: isMobile,
          headerTitle: 'Testimonials',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTitleStyle: {
            color: colors.text,
            fontFamily: 'Inter-Bold',
          },
          headerLeft: isMobile ? () => (
            <TouchableOpacity
              onPress={openSidebar}
              style={{
                marginLeft: 16,
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.background,
              }}
            >
              <Menu size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined,
        }}
      />
    </Tabs>
  );

  if (shouldShowSidebar) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
        <Sidebar />
        <View style={{ flex: 1 }}>
          <TabsComponent />
        </View>
      </View>
    );
  }

  return (
    <>
      <TabsComponent />
      <Sidebar />
    </>
  );
}