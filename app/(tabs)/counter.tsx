import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '../../store/sessionStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { openDatabase, Mantra } from '../../db/database';

function MalaRing({ count }: { count: number }) {
  const BEAD_COUNT = 28;
  const beadIndex = count % BEAD_COUNT;
  
  const beads = Array.from({ length: BEAD_COUNT }).map((_, i) => {
    const angle = (i * 360) / BEAD_COUNT;
    const rad = (angle - 90) * (Math.PI / 180);
    const radius = 120; // 120px radius
    const x = radius * Math.cos(rad);
    const y = radius * Math.sin(rad);

    let backgroundColor = '#E8D5B0'; // Inactive sand
    if (i < beadIndex) backgroundColor = '#D47C2A'; // Completed amber
    else if (i === beadIndex) backgroundColor = '#F0A830'; // Current glow
    
    // Top-most bead (index 0) is the Meru bead
    if (i === 0) {
      return (
        <View
          key={i}
          style={[
            styles.meruBead,
            { transform: [{ translateX: x }, { translateY: y }] }
          ]}
        />
      );
    }
    
    return (
      <View
        key={i}
        style={[
          styles.bead,
          { backgroundColor, transform: [{ translateX: x }, { translateY: y }] },
          i === beadIndex ? styles.activeBeadGlow : null
        ]}
      />
    );
  });

  return (
    <View style={styles.ringContainer}>
      {beads}
    </View>
  );
}

export default function CounterScreen() {
  const router = useRouter();
  const session = useSessionStore();
  const preferences = usePreferencesStore();
  
  const [activeMantra, setActiveMantra] = useState<Mantra | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Initialize session if not active
  useEffect(() => {
    async function init() {
      const db = await openDatabase();
      if (!session.isActive) {
        if (session.mantraId) {
          const m = await db.getFirstAsync<Mantra>(
            'SELECT * FROM mantras WHERE id = ?', 
            session.mantraId
          );
          if (m) {
            setActiveMantra(m);
            session.startSession(m.id, preferences.defaultBeadCount);
          }
        } else {
          // fallback to om
          const m = await db.getFirstAsync<Mantra>(
            "SELECT * FROM mantras WHERE id = ?",
            'om'
          );
          if (m) {
            setActiveMantra(m);
            session.startSession(m.id, preferences.defaultBeadCount);
          } else {
            // Web fallback if seed failed or mock
            const fallback: Mantra = {
              id: 'om',
              tradition_id: 'hindu',
              deity: 'Shiva',
              sanskrit: 'ॐ',
              transliteration: 'Om',
              meaning: 'The primordial sound',
              recommended_count: 108
            };
            setActiveMantra(fallback);
            session.startSession(fallback.id, preferences.defaultBeadCount);
          }
        }
      } else {
        if (session.mantraId) {
          const m = await db.getFirstAsync<Mantra>(
            'SELECT * FROM mantras WHERE id = ?', 
            session.mantraId
          );
          if (m) setActiveMantra(m);
          else {
            setActiveMantra({ id: 'om', tradition_id: 'hindu', deity: 'Shiva', sanskrit: 'ॐ', transliteration: 'Om', meaning: '', recommended_count: 108 });
          }
        }
      }
    }
    init();
  }, [session.isActive, session.mantraId, preferences.defaultBeadCount]);

  // Sync preference changes to fresh sessions that are waiting for their first tap
  useEffect(() => {
    if (session.isActive && session.count === 0 && session.targetCount !== preferences.defaultBeadCount) {
      session.updateTargetCount(preferences.defaultBeadCount);
    }
  }, [preferences.defaultBeadCount, session.isActive, session.count, session.targetCount]);

  // Timer
  useEffect(() => {
    if (!session.isActive) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (session.startTime || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.isActive, session.startTime]);

  const handleTap = () => {
    if (!session.isActive) return;
    
    session.incrementCount();
    const newCount = session.count + 1;
    
    if (preferences.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (newCount % 108 === 0 && preferences.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (newCount >= session.targetCount) {
      if (preferences.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      router.replace({
        pathname: '/completion',
        params: { duration: elapsedSeconds }
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Pressable style={{ flex: 1, backgroundColor: '#FDF6EC' }} onPress={handleTap}>
      <View className="items-center mt-12 px-6">
        <Text className="text-xl font-semibold text-text-primary text-center">
          {activeMantra?.transliteration || 'Loading...'}
        </Text>
        <Text className="text-sm text-text-secondary mt-1 text-center">Current Session</Text>
      </View>

      <View className="flex-1 justify-center items-center">
        <MalaRing count={session.count} />
        
        <View style={StyleSheet.absoluteFill} className="justify-center items-center pointer-events-none">
          <Text style={{ fontSize: 80, fontWeight: '300', color: '#3D2010', includeFontPadding: false }}>
            {session.count}
          </Text>
          <Text className="text-accent-primary text-lg font-medium mt-1">
            {session.malaRounds > 0 ? `${session.malaRounds} Mala` : 'Mala'}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-around mb-8 px-4">
        <View className="bg-background-surface px-4 py-2 rounded-full border border-border items-center">
          <Text className="text-xs text-text-secondary uppercase tracking-wider">Sankalp</Text>
          <Text className="text-base font-semibold text-text-primary mt-1">{session.targetCount}</Text>
        </View>
        <View className="bg-background-surface px-4 py-2 rounded-full border border-border items-center">
          <Text className="text-xs text-text-secondary uppercase tracking-wider">Streak</Text>
          <Text className="text-base font-semibold text-accent-bright mt-1">{preferences.currentStreak} Days</Text>
        </View>
        <View className="bg-background-surface px-4 py-2 rounded-full border border-border items-center">
          <Text className="text-xs text-text-secondary uppercase tracking-wider">Time</Text>
          <Text className="text-base font-semibold text-text-primary mt-1">{formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      <View className="items-center mb-8">
        <Text className="text-text-hint tracking-widest text-sm uppercase">Tap anywhere to count</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ringContainer: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bead: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  meruBead: {
    position: 'absolute',
    width: 14,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#8B3A1A',
  },
  activeBeadGlow: {
    shadowColor: '#F0A830',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
  }
});
