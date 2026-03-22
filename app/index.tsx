import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { usePreferencesStore } from '../store/preferencesStore';
import { ArrowRight, Sparkles } from 'lucide-react-native';

const TRADITIONS = [
  { id: 'hindu', label: 'Hindu', icon: 'ॐ', available: true },
  { id: 'buddhist', label: 'Buddhist', icon: '☸', available: false },
  { id: 'sikh', label: 'Sikh', icon: 'ੴ', available: false },
  { id: 'jain', label: 'Jain', icon: '卐', available: false },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const store = usePreferencesStore();
  const { onboardingComplete, setUserName, setSelectedTradition, setDefaultBeadCount, setOnboardingComplete } = store;

  const [name, setName] = useState('');
  const [tradition, setTradition] = useState('hindu');
  const [malaCount, setMalaCount] = useState(108);

  // Skip if already onboarded
  useEffect(() => {
    if (onboardingComplete) {
      router.replace('/(tabs)/counter');
    }
  }, [onboardingComplete]);

  const handleBegin = () => {
    if (!name.trim()) return;
    setUserName(name.trim());
    setSelectedTradition(tradition);
    setDefaultBeadCount(malaCount);
    setOnboardingComplete(true);
    router.replace('/(tabs)/counter');
  };

  return (
    <SafeAreaView className="flex-1 bg-background-primary">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }}>
          
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-background-surface border border-accent-bright/30 rounded-full items-center justify-center mb-6 shadow-sm">
              <Text className="text-5xl text-accent-primary pt-1">📿</Text>
            </View>
            <Text className="text-4xl font-extrabold text-text-primary text-center tracking-tight mb-2">
              Jaap<Text className="text-accent-primary">Saathi</Text>
            </Text>
            <Text className="text-lg text-text-secondary text-center max-w-[280px]">
              Your digital companion for daily spiritual practice
            </Text>
          </View>

          <View className="space-y-6 mb-8 gap-y-6">
            <View>
              <Text className="text-sm font-semibold tracking-wider text-text-hint uppercase mb-2 ml-1">Your Name</Text>
              <TextInput
                className="bg-background-surface border border-border rounded-xl px-5 py-4 text-text-primary text-xl font-medium shadow-sm"
                placeholder="How should we call you?"
                placeholderTextColor="#D4C0A0"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View>
              <Text className="text-sm font-semibold tracking-wider text-text-hint uppercase mb-2 ml-1">Choose Tradition</Text>
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {TRADITIONS.map(t => {
                  const isSelected = tradition === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => t.available && setTradition(t.id)}
                      disabled={!t.available}
                      className={`w-[48%] p-4 rounded-xl border shadow-sm h-[80px] justify-center relative ${
                        isSelected 
                          ? 'bg-accent-primary border-accent-bright' 
                          : t.available 
                            ? 'bg-background-surface border-border'
                            : 'bg-background-surfaceAlt border-border opacity-60'
                      }`}
                    >
                      <View className="flex-row items-center">
                        <Text className={`text-2xl mr-3 ${isSelected ? 'text-white/90' : 'text-accent-primary'}`}>{t.icon}</Text>
                        <Text className={`font-semibold text-lg ${isSelected ? 'text-white' : 'text-text-primary'}`}>{t.label}</Text>
                      </View>
                      
                      {!t.available && (
                        <View className="absolute top-1 right-2 w-full pr-1">
                          <Text className="text-[10px] text-text-hint uppercase font-bold text-right tracking-tighter">Coming Soon</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text className="text-sm font-semibold tracking-wider text-text-hint uppercase mb-2 ml-1">Daily Mala Focus</Text>
              <Pressable 
                onPress={() => setMalaCount(c => c === 108 ? 27 : c === 27 ? 54 : 108)}
                className="flex-row items-center justify-between p-4 rounded-xl border border-border bg-background-surface shadow-sm active:opacity-70"
              >
                <Text className="text-lg text-text-primary font-medium">Beads per Mala</Text>
                <View className="flex-row items-center bg-accent-bright/10 px-4 py-1.5 rounded-lg border border-accent-bright/20">
                  <Text className="font-bold text-xl text-accent-bright mr-1">{malaCount}</Text>
                  <Text className="text-accent-primary text-sm font-medium">Beads</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleBegin}
            disabled={!name.trim()}
            className={`flex-row rounded-2xl p-5 items-center justify-center shadow-lg mt-4
              ${name.trim() ? 'bg-accent-primary' : 'bg-border opacity-60'}`}
          >
            {name.trim() ? <Sparkles size={20} color="white" className="mr-3" /> : null}
            <Text className={`font-bold text-xl mr-2 ${name.trim() ? 'text-white' : 'text-text-secondary'}`}>
              {name.trim() ? 'Begin Journey' : 'Please Enter Name'}
            </Text>
            {name.trim() ? <ArrowRight size={24} color="white" strokeWidth={2.5} /> : null}
          </Pressable>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
