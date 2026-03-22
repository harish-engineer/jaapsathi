import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '../store/sessionStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { openDatabase, Mantra } from '../db/database';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2, ArrowRight } from 'lucide-react-native';

export default function CompletionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useSessionStore();
  const preferences = usePreferencesStore();
  
  const [mantra, setMantra] = useState<Mantra | null>(null);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const [isSaving, setIsSaving] = useState(true);
  const viewShotRef = useRef<ViewShot>(null);

  const durationSecs = Number(params.duration) || 0;

  useEffect(() => {
    async function saveSession() {
      if (!session.mantraId || session.count === 0) {
        setIsSaving(false);
        return;
      }

      const db = await openDatabase();
      const m = await db.getFirstAsync<Mantra>(
        'SELECT * FROM mantras WHERE id = ?', 
        session.mantraId
      );
      if (m) setMantra(m);

      const id = Date.now().toString();
      const nowIso = new Date().toISOString();
      const todayString = nowIso.split('T')[0];

      try {
        await db.runAsync(
          'INSERT INTO sessions (id, mantra_id, count, duration_seconds, completed_at) VALUES (?, ?, ?, ?, ?)',
          id, session.mantraId, session.count, durationSecs, nowIso
        );

        // Update daily stats
        const existingStat = await db.getFirstAsync<{total_count: number, session_count: number}>(
          'SELECT total_count, session_count FROM daily_stats WHERE date = ?', 
          todayString
        );
        
        if (existingStat) {
          await db.runAsync(
            'UPDATE daily_stats SET total_count = ?, session_count = ? WHERE date = ?',
            existingStat.total_count + session.count,
            existingStat.session_count + 1,
            todayString
          );
        } else {
          await db.runAsync(
            'INSERT INTO daily_stats (date, total_count, session_count) VALUES (?, ?, ?)',
            todayString,
            session.count,
            1
          );
        }

        // Update streak
        const { streakUpdated: updated } = preferences.updateStreak(todayString);
        setStreakUpdated(updated);

      } catch (err) {
        console.warn('Error saving session:', err);
      } finally {
        setIsSaving(false);
      }
    }
    
    saveSession();
  }, [session.mantraId]);

  const handleShare = async () => {
    if (viewShotRef.current && viewShotRef.current.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Sharing is not available on this device');
        }
      } catch (err) {
        console.warn('Share error:', err);
      }
    }
  };

  const handleFinish = () => {
    session.resetSession();
    router.replace('/(tabs)/counter');
  };

  if (isSaving) {
    return (
      <View className="flex-1 bg-background-primary justify-center items-center">
        <ActivityIndicator color="#D47C2A" size="large" />
      </View>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-background-primary px-6 pt-16 pb-8">
      {/* Header Section */}
      <View className="items-center mb-6 mt-4">
        <Text className="text-4xl mb-3">✨</Text>
        <Text className="text-[32px] font-extrabold text-text-primary tracking-tight mb-1">Jaap Completed!</Text>
        <Text className="text-base text-text-secondary font-medium">Namaste, {preferences.userName}</Text>
      </View>

      {/* Shareable Card */}
      <View className="flex-1 justify-center max-w-sm w-full self-center">
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <View 
            className="bg-background-surface rounded-[40px] p-8 pb-10 border border-border items-center"
            style={{ shadowColor: '#3D2010', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8 }}
          >
            {/* Circle Icon Badge */}
            <View className="w-[100px] h-[100px] bg-[#FDF0DC] border-[2px] border-accent-bright/20 rounded-full items-center justify-center mb-5 shadow-sm">
              <Text className="text-5xl text-accent-primary pt-1">{mantra?.sanskrit || 'ॐ'}</Text>
            </View>

            {/* Mantra Texts */}
            <Text className="text-2xl text-text-primary font-bold text-center mb-1">
              {mantra?.transliteration || 'Om'}
            </Text>
            {mantra?.deity && mantra.deity !== 'Custom' && (
              <Text className="text-sm font-semibold tracking-widest text-text-hint uppercase mb-8 text-center">{mantra.deity} Tradition</Text>
            )}

            {/* Stats row */}
            <View className="flex-row justify-center items-center w-full px-2 mt-4">
              <View className="items-center flex-1">
                <Text className="text-[32px] font-bold text-text-primary mb-1">{session.count}</Text>
                <Text className="text-xs font-bold tracking-widest text-text-hint uppercase">Jaap Count</Text>
              </View>

              <View className="w-[2px] h-12 bg-border mx-4" />

              <View className="items-center flex-1">
                <Text className="text-[32px] font-bold text-text-primary mb-1">{formatTime(durationSecs)}</Text>
                <Text className="text-xs font-bold tracking-widest text-text-hint uppercase">Duration</Text>
              </View>
            </View>

            {streakUpdated && (
              <View className="bg-accent-bright/10 px-5 py-2.5 rounded-full mt-8 border border-accent-bright/30">
                <Text className="text-accent-bright font-bold text-xs tracking-[0.2em] uppercase">🔥 {preferences.currentStreak} Day Streak</Text>
              </View>
            )}

            <Text className="text-[10px] tracking-[0.4em] text-text-hint/80 font-bold mt-10">JAAPSAATHI</Text>
          </View>
        </ViewShot>
      </View>

      {/* Action Buttons */}
      <View className="mt-8 gap-y-4">
        <Pressable
          onPress={handleShare}
          className="flex-row bg-accent-primary rounded-[20px] p-[18px] items-center justify-center shadow-lg active:opacity-80"
        >
          <Share2 size={24} color="white" strokeWidth={2.5} />
          <Text className="text-white font-bold text-xl ml-3">Share with friends</Text>
        </Pressable>

        <Pressable
          onPress={handleFinish}
          className="flex-row bg-background-surface border-2 border-border rounded-[20px] p-[18px] items-center justify-center active:opacity-70"
        >
          <Text className="text-text-primary font-bold text-xl mr-2">Go back home</Text>
          <ArrowRight size={24} color="#3D2010" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}
