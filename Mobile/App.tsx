import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { SplashScreen } from './src/components/SplashScreen';
import { AppStateProvider } from './src/context/AppState';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';

const Tab = createBottomTabNavigator();

function TabIcon({
  name,
  color,
  focused,
  tintBg,
}: {
  name: string;
  color: string;
  focused: boolean;
  tintBg: string;
}) {
  return (
    <View
      style={[
        styles.iconWrap,
        focused ? { backgroundColor: tintBg } : null,
      ]}>
      <Feather name={name} size={18} color={color} />
    </View>
  );
}

function AppContent(): React.JSX.Element {
  const { isDark, theme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const renderAssistantIcon = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon
        name="message-circle"
        color={color}
        focused={focused}
        tintBg={theme.accentTint}
      />
    ),
    [theme.accentTint],
  );

  const renderHistoryIcon = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon
        name="shopping-bag"
        color={color}
        focused={focused}
        tintBg={theme.accentTint}
      />
    ),
    [theme.accentTint],
  );

  const renderActivityIcon = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon
        name="activity"
        color={color}
        focused={focused}
        tintBg={theme.accentTint}
      />
    ),
    [theme.accentTint],
  );

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bgDeep}
      />
      <AppStateProvider>
        <View style={[styles.root, { backgroundColor: theme.bgDeep }]}>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                sceneStyle: { backgroundColor: theme.bgDeep },
                tabBarActiveTintColor: theme.tabBarActiveTint,
                tabBarInactiveTintColor: theme.tabBarInactiveTint,
                tabBarLabelStyle: {
                  fontSize: 11,
                  fontWeight: '600',
                  marginBottom: 4,
                },
                tabBarStyle: {
                  position: 'absolute',
                  bottom: 14,
                  left: 16,
                  right: 16,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: theme.tabBarBg,
                  borderTopWidth: 1,
                  borderWidth: 1,
                  borderColor: theme.tabBarBorder,
                  paddingTop: 6,
                  elevation: 12,
                },
              }}>
              <Tab.Screen
                name="Assistant"
                component={AssistantScreen}
                options={{ tabBarIcon: renderAssistantIcon }}
              />
              <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{ tabBarIcon: renderHistoryIcon }}
              />
              <Tab.Screen
                name="Activity"
                component={ActivityScreen}
                options={{ tabBarIcon: renderActivityIcon }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          {showSplash ? <SplashScreen onFinish={handleSplashFinish} /> : null}
        </View>
      </AppStateProvider>
    </>
  );
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
