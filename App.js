import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import notifee, { EventType } from '@notifee/react-native';

import { AppProvider, useApp } from './src/hooks/useAppContext';
import {
  setupNotificationChannel,
  requestPermissions,
  handleNotificationAction,
} from './src/utils/notificationService';

import HomeScreen         from './src/screens/HomeScreen';
import AddMedicineScreen  from './src/screens/AddMedicineScreen';
import SymptomSearchScreen from './src/screens/SymptomSearchScreen';
import EditTimesScreen    from './src/screens/EditTimesScreen';
import SettingsScreen     from './src/screens/SettingsScreen';
import TutorialScreen     from './src/screens/TutorialScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabIcon({ icon }) {
  return <Text style={{ fontSize: 22 }}>{icon}</Text>;
}

function MainTabs() {
  const { colors } = useApp();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Trang chủ', tabBarIcon: ({ color }) => <TabIcon icon="💊" color={color} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Cài đặt', tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} /> }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { tutorialShown, toggleTaken } = useApp();

  useEffect(() => {
    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        handleNotificationAction(detail, toggleTaken, null);
      }
    });
    return unsub;
  }, [toggleTaken]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!tutorialShown && (
          <Stack.Screen name="Tutorial" component={TutorialScreen} />
        )}
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="AddMedicine"   component={AddMedicineScreen}   options={{ presentation: 'modal' }} />
        <Stack.Screen name="SymptomSearch" component={SymptomSearchScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EditTimes"     component={EditTimesScreen}     options={{ presentation: 'modal' }} />
        <Stack.Screen name="Tutorial"      component={TutorialScreen}      options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Background handler — PHẢI đặt ngoài component
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    if (detail.pressAction?.id === 'taken') {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const data = detail.notification?.data || {};
      const key = `${data.medicineName}@${data.time}@${data.date}`;
      try {
        const raw = await AsyncStorage.getItem('medpro_taken');
        const taken = raw ? JSON.parse(raw) : {};
        taken[key] = true;
        await AsyncStorage.setItem('medpro_taken', JSON.stringify(taken));
      } catch {}
    }
    if (detail.pressAction?.id === 'snooze') {
      const snoozeTime = Date.now() + 10 * 60 * 1000;
      await notifee.createTriggerNotification(
        {
          title: `⏰ Nhắc lại: ${detail.notification?.data?.medicineName}`,
          body: detail.notification?.body,
          android: { channelId: 'medpro_reminders', importance: 4, sound: 'default' },
          data: detail.notification?.data,
        },
        { type: 0, timestamp: snoozeTime, alarmManager: { allowWhileIdle: true } }
      );
    }
  }
});

export default function App() {
  useEffect(() => {
    (async () => {
      await setupNotificationChannel();
      await requestPermissions();
    })();
  }, []);

  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
