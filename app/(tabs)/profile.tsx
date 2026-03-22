import { View, Text, Switch, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { usePreferencesStore } from '../../store/preferencesStore';
import { Bell, Flame } from 'lucide-react-native';

export default function ProfileScreen() {
  const preferences = usePreferencesStore();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-background-primary">
      <View className="p-6 items-center">
        <View className="w-24 h-24 bg-background-surface border-[3px] border-accent-primary rounded-full items-center justify-center mb-4">
          <Text className="text-5xl">🧘🏽</Text>
        </View>
        <Text className="text-2xl font-bold text-text-primary">{preferences.userName || 'Seeker'}</Text>
        <Text className="text-accent-primary font-medium mt-1 uppercase tracking-widest">{preferences.selectedTradition} Tradition</Text>
      </View>

      <View className="px-4">
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
          
          <View className="flex-row justify-between items-center py-2 mt-2">
            <Text className="text-text-primary text-base">Daily Reminder</Text>
            <View className="flex-row items-center border border-border bg-background-surfaceAlt px-3 py-1 rounded-lg">
               <Bell size={16} color="#A08060" />
               <Text className="text-text-secondary ml-2 font-medium">{preferences.reminderTime}</Text>
            </View>
          </View>
        </View>

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
    </ScrollView>
  );
}
