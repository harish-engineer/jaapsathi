import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../store/sessionStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useSankalpaStore } from '../store/sankalpaStore';
import { openDatabase, Mantra } from '../db/database';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';

// Floating decorative dots
const DOTS = [
  { top: '8%', left: '25%' }, { top: '12%', left: '80%' },
  { top: '18%', left: '10%' }, { top: '22%', left: '62%' },
  { top: '30%', left: '88%' }, { top: '34%', left: '5%' },
];

export default function CompletionScreen() {
  const router = useRouter();
  const session = useSessionStore();
  const preferences = usePreferencesStore();
  const sankalpa = useSankalpaStore();

  const [mantra, setMantra] = useState<Mantra | null>(null);
  const [isSaving, setIsSaving] = useState(true);
  const [isLongestStreak, setIsLongestStreak] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const hasSaved = useRef(false);                    // prevent double-save

  // Snapshot duration at mount time before startTime can be cleared
  const durationSecs = useRef(
    session.startTime ? Math.floor((Date.now() - session.startTime) / 1000) : 0
  ).current;

  useEffect(() => {
    async function saveSession() {
      if (hasSaved.current) return;            // StrictMode / remount guard
      if (!session.mantraId || session.count === 0) {
        setIsSaving(false);
        return;
      }
      hasSaved.current = true;

      const db = await openDatabase();
      const m = await db.getFirstAsync<Mantra>('SELECT * FROM mantras WHERE id = ?', [session.mantraId as string]);
      if (m) setMantra(m);

      const id = Date.now().toString();
      const nowIso = new Date().toISOString();
      const todayString = nowIso.split('T')[0];

      try {
        await db.runAsync(
          'INSERT INTO sessions (id, mantra_id, count, duration_seconds, completed_at) VALUES (?, ?, ?, ?, ?)',
          [id, session.mantraId as string, session.count, durationSecs, nowIso]
        );

        const existingStat = await db.getFirstAsync<{ total_count: number, session_count: number }>(
          'SELECT total_count, session_count FROM daily_stats WHERE date = ?',
          [todayString]
        );

        if (existingStat) {
          await db.runAsync(
            'UPDATE daily_stats SET total_count = ?, session_count = ? WHERE date = ?',
            [existingStat.total_count + session.count, existingStat.session_count + 1, todayString]
          );
        } else {
          await db.runAsync(
            'INSERT INTO daily_stats (date, total_count, session_count) VALUES (?, ?, ?)',
            [todayString, session.count, 1]
          );
        }

        const prevBest = preferences.bestStreak;
        preferences.updateStreak(todayString);
        setIsLongestStreak(preferences.currentStreak >= prevBest);

        // Contribute to active Sankalpa — only if this session's mantra matches
        const matchingSankalpa = sankalpa.getSankalpaForMantra(session.mantraId ?? '');
        if (matchingSankalpa) {
          await sankalpa.addProgress(session.mantraId!, session.count);
        }

      } catch (err) {
        console.warn('Error saving session:', err);
      } finally {
        setIsSaving(false);
      }
    }
    saveSession();
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const malaCount = session.malaRounds;

  const handleShare = async () => {
    if (viewShotRef.current?.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Sharing not available on this device');
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

  const handleViewStats = () => {
    session.resetSession();
    router.replace('/(tabs)/stats');
  };

  if (isSaving) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#D47C2A" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Floating decorative dots */}
      {DOTS.map((dot, i) => (
        <View key={i} style={[styles.dot, { top: dot.top as any, left: dot.left as any }]} />
      ))}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + Title */}
        <View style={styles.headerSection}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarEmoji}>📿</Text>
            </View>
          </View>
          <Text style={styles.title}>Jaap Sampann!</Text>
          <Text style={styles.subtitle}>Session complete — well done, {preferences.userName}</Text>
        </View>

        {/* 2x2 Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={[styles.statsCell, styles.statsCellRight]}>
              <Text style={styles.statLabel}>MANTRA</Text>
              <Text style={styles.mantraText} numberOfLines={1}>{mantra?.sanskrit || 'ॐ'}</Text>
            </View>
            <View style={styles.statsCell}>
              <Text style={styles.statLabel}>COUNT</Text>
              <Text style={styles.statCountBig}>{session.count}</Text>
            </View>
          </View>

          <View style={styles.statsHDivider} />

          <View style={styles.statsRow}>
            <View style={[styles.statsCell, styles.statsCellRight]}>
              <Text style={styles.statLabel}>MALAS</Text>
              <Text style={styles.statValue}>{malaCount} mala{malaCount !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.statsCell}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.statValue}>{formatTime(durationSecs)}</Text>
            </View>
          </View>
        </View>

        {/* Streak Banner */}
        {preferences.currentStreak > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakIcon}>🔆</Text>
            <View>
              <Text style={styles.streakTitle}>{preferences.currentStreak} day streak!</Text>
              <Text style={styles.streakSub}>
                {isLongestStreak ? 'Your longest streak yet — keep going' : 'Keep the momentum going!'}
              </Text>
            </View>
          </View>
        )}

        {/* Share section */}
        <Text style={styles.shareSectionLabel}>SHARE YOUR JAAP</Text>
        <View style={styles.shareRow}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }}>
            <View style={styles.shareCard}>
              <Text style={styles.shareCardHeader}>TODAY'S JAAP</Text>
              <Text style={styles.shareCardMantra}>{mantra?.sanskrit || 'ॐ'}</Text>
              <Text style={styles.shareCardStats}>
                {session.count} x {malaCount} mala · {preferences.currentStreak} day streak
              </Text>
              <Text style={styles.shareCardBrand}>JaapSaathi · jaapsaathi.app</Text>
            </View>
          </ViewShot>

          <Pressable onPress={handleShare} style={styles.shareButton}>
            <Share2 size={22} color="#D47C2A" />
            <Text style={styles.shareButtonText}>Share{'\n'}to status</Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsRow}>
          <Pressable onPress={handleFinish} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>New Session</Text>
          </Pressable>
          <Pressable onPress={handleViewStats} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>View Stats</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const BG = '#2A1200';
const CARD_BG = '#3D1C00';
const AMBER = '#D47C2A';
const TEXT_PRIMARY = '#F5DEB3';
const TEXT_SECONDARY = '#C8A878';
const TEXT_HINT = '#9A7040';
const BORDER = '#5A3010';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  dot: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: AMBER, opacity: 0.5,
  },
  scroll: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  headerSection: { alignItems: 'center', marginBottom: 28 },
  avatarOuter: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#4A2800', borderWidth: 2, borderColor: AMBER + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  avatarInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 36 },
  title: { fontSize: 32, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: TEXT_SECONDARY, fontWeight: '500' },

  // Stats card
  statsCard: {
    backgroundColor: CARD_BG, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 14,
  },
  statsRow: { flexDirection: 'row' },
  statsCell: { flex: 1, padding: 18, justifyContent: 'center' },
  statsCellRight: { borderRightWidth: 1, borderRightColor: BORDER },
  statsHDivider: { height: 1, backgroundColor: BORDER },
  statLabel: { fontSize: 11, fontWeight: '700', color: TEXT_HINT, letterSpacing: 1.5, marginBottom: 6 },
  mantraText: { fontSize: 22, color: TEXT_PRIMARY, fontWeight: '600' },
  statCountBig: { fontSize: 44, fontWeight: '300', color: AMBER, letterSpacing: -1 },
  statValue: { fontSize: 20, fontWeight: '500', color: TEXT_PRIMARY },

  // Streak banner
  streakBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BG, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 22, gap: 12,
  },
  streakIcon: { fontSize: 28 },
  streakTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 2 },
  streakSub: { fontSize: 13, color: TEXT_SECONDARY },

  // Share section
  shareSectionLabel: {
    fontSize: 11, fontWeight: '700', color: TEXT_HINT,
    letterSpacing: 2, marginBottom: 10,
  },
  shareRow: {
    flexDirection: 'row', gap: 12,
    backgroundColor: CARD_BG, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 28, alignItems: 'center',
  },
  shareCard: {
    flex: 1, backgroundColor: '#4A2800', borderRadius: 12, padding: 14,
  },
  shareCardHeader: { fontSize: 10, fontWeight: '700', color: TEXT_HINT, letterSpacing: 1.5, marginBottom: 6 },
  shareCardMantra: { fontSize: 20, color: TEXT_PRIMARY, fontWeight: '600', marginBottom: 6 },
  shareCardStats: { fontSize: 13, color: AMBER, fontWeight: '600', marginBottom: 4 },
  shareCardBrand: { fontSize: 11, color: TEXT_HINT },
  shareButton: { alignItems: 'center', gap: 6, paddingHorizontal: 10 },
  shareButtonText: { fontSize: 13, color: TEXT_PRIMARY, textAlign: 'center', fontWeight: '500' },

  // Bottom buttons
  buttonsRow: { flexDirection: 'row', gap: 12 },
  btnPrimary: {
    flex: 1.1, backgroundColor: AMBER, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  btnSecondary: {
    flex: 1, backgroundColor: CARD_BG,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 17, fontWeight: '600', color: TEXT_PRIMARY },
});
