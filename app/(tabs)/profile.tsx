import { useState } from 'react';
import { View, Text, Switch, Pressable, ScrollView, Alert, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { usePreferencesStore } from '../../store/preferencesStore';
import { Bell, Flame, Check } from 'lucide-react-native';
import { scheduleDailyReminder, cancelDailyReminder, requestNotificationPermissions } from '../../lib/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Generate time options every 30 mins
const TIME_OPTIONS: string[] = [];
for (let h = 4; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function ProfileScreen() {
  const preferences = usePreferencesStore();
  const router = useRouter();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleReminderToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to use daily reminders.',
        );
        return;
      }
      await scheduleDailyReminder(preferences.reminderTime, preferences.userName);
      preferences.setReminderEnabled(true);
    } else {
      await cancelDailyReminder();
      preferences.setReminderEnabled(false);
    }
  };

  const handleTimeSelect = async (time: string) => {
    preferences.setReminderTime(time);
    setShowTimePicker(false);
    if (preferences.reminderEnabled) {
      await scheduleDailyReminder(time, preferences.userName);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <ScrollView className="flex-1 bg-background-primary" contentContainerStyle={{ paddingTop: insets.top }}>
      <View className="p-6 items-center">
        <View className="w-24 h-24 bg-background-surface border-[3px] border-accent-primary rounded-full items-center justify-center mb-4">
          <Text className="text-5xl">🧘🏽</Text>
        </View>
        <Text className="text-2xl font-bold text-text-primary">{preferences.userName || 'Seeker'}</Text>
        <Text className="text-accent-primary font-medium mt-1 uppercase tracking-widest">{preferences.selectedTradition} Tradition</Text>
      </View>

      <View className="px-4">
        {/* Streak + Haptics + Reminder */}
        <View className="bg-background-surface rounded-2xl border border-border p-4 mb-6">
          <View className="flex-row items-center mb-4 pb-4 border-b border-border">
            <Flame color="#D47C2A" size={24} />
            <View className="ml-3">
               <Text className="text-text-secondary text-sm">Best Streak</Text>
               <Text className="text-lg font-bold text-text-primary">{preferences.bestStreak} Days</Text>
            </View>
          </View>
          
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-text-primary text-base">Haptic Feedback</Text>
            <Switch 
              value={preferences.hapticsEnabled} 
              onValueChange={preferences.setHapticsEnabled}
              trackColor={{ false: '#E8D5B0', true: '#D47C2A' }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          
          {/* Daily Reminder row */}
          <View className="mt-3 pt-3 border-t border-border">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Bell size={18} color={preferences.reminderEnabled ? '#D47C2A' : '#A08060'} />
                <Text className="text-text-primary text-base ml-2">Daily Reminder</Text>
              </View>
              <Switch
                value={preferences.reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: '#E8D5B0', true: '#D47C2A' }}
                thumbColor={'#FFFFFF'}
              />
            </View>

            {/* Time selector — only shown when enabled */}
            {preferences.reminderEnabled && (
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="mt-3 flex-row items-center justify-between bg-background-surfaceAlt border border-border rounded-xl px-4 py-3 active:opacity-70"
              >
                <Text className="text-text-secondary text-sm font-medium">Reminder Time</Text>
                <View className="flex-row items-center bg-accent-bright/15 px-3 py-1.5 rounded-lg border border-accent-bright/30">
                  <Bell size={14} color="#D47C2A" />
                  <Text className="text-accent-bright font-bold ml-2">{formatTime(preferences.reminderTime)}</Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Settings */}
        <View className="bg-background-surface rounded-2xl border border-border p-4 mb-10">
           <Text className="text-text-secondary uppercase tracking-wider text-xs font-semibold mb-4">Settings</Text>
           
           <Pressable className="flex-row justify-between items-center py-3 border-b border-border">
              <Text className="text-text-primary text-base">Change Name</Text>
              <Text className="text-text-hint">{preferences.userName}</Text>
           </Pressable>

           <Pressable 
              className="flex-row justify-between items-center py-3 border-b border-border"
              onPress={() => {
                const current = preferences.defaultBeadCount;
                const nextCount = current === 108 ? 27 : current === 27 ? 54 : 108;
                preferences.setDefaultBeadCount(nextCount);
              }}
           >
              <Text className="text-text-primary text-base">Default Mala Count</Text>
              <View className="bg-accent-bright/20 px-3 py-1 rounded-lg border border-accent-bright/30">
                <Text className="text-accent-bright font-bold">{preferences.defaultBeadCount}</Text>
              </View>
           </Pressable>

           <Pressable 
             className="py-4 mt-2 bg-red-500/10 rounded-xl"
             onPress={() => {
               Alert.alert(
                 "Test Onboarding",
                 "Are you sure you want to test from scratch? This will sign you out and take you back to the name entry screen.",
                 [
                   { text: "Cancel", style: "cancel" },
                   { 
                     text: "Start Over", 
                     style: "destructive",
                     onPress: () => {
                       preferences.setUserName("");
                       preferences.setOnboardingComplete(false);
                       router.replace('/');
                     }
                   }
                 ]
               );
             }}
           >
              <Text className="text-red-700 font-bold tracking-wide text-center text-lg">Test App From Scratch</Text>
           </Pressable>
        </View>
      </View>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowTimePicker(false)}
        >
          <View className="bg-background-primary rounded-t-[28px] border-t border-l border-r border-border pb-8">
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-border">
              <Text className="text-lg font-bold text-text-primary">Choose Reminder Time</Text>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text className="text-accent-primary font-semibold">Done</Text>
              </Pressable>
            </View>
            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              {TIME_OPTIONS.map((t) => {
                const isSelected = t === preferences.reminderTime;
                return (
                  <Pressable
                    key={t}
                    onPress={() => handleTimeSelect(t)}
                    className={`flex-row justify-between items-center px-6 py-3.5 border-b border-border/50 active:opacity-60 ${
                      isSelected ? 'bg-accent-primary/10' : ''
                    }`}
                  >
                    <Text className={`text-base font-medium ${isSelected ? 'text-accent-primary font-bold' : 'text-text-primary'}`}>
                      {formatTime(t)}
                    </Text>
                    {isSelected && <Check size={18} color="#D47C2A" strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
