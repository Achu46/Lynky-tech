import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/context/AppState';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';

const Tab = createBottomTabNavigator();

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: '#0F766E',
              tabBarInactiveTintColor: '#64748B',
              tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
            }}>
            <Tab.Screen name="Assistant" component={AssistantScreen} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Activity" component={ActivityScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
