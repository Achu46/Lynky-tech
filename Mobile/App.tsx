import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { AppStateProvider } from './src/context/AppState';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { THEME } from './src/theme';

const Tab = createBottomTabNavigator();

function TabIcon({
  name,
  color,
  focused,
}: {
  name: string;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
      <Feather name={name} size={18} color={color} />
    </View>
  );
}

const renderAssistantIcon = ({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) => <TabIcon name="message-circle" color={color} focused={focused} />;

const renderHistoryIcon = ({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) => <TabIcon name="shopping-bag" color={color} focused={focused} />;

const renderActivityIcon = ({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) => <TabIcon name="activity" color={color} focused={focused} />;

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgDeep} />
      <AppStateProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarHideOnKeyboard: true,
              sceneStyle: { backgroundColor: THEME.bgDeep },
              tabBarActiveTintColor: THEME.accent,
              tabBarInactiveTintColor: THEME.textMuted,
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
                backgroundColor: THEME.tabBarBg,
                borderTopWidth: 1,
                borderWidth: 1,
                borderColor: THEME.tabBarBorder,
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
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 34,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: THEME.accentTint,
  },
});
