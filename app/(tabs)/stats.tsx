import { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { usePreferencesStore } from '../../store/preferencesStore';
import { openDatabase, DailyStat } from '../../db/database';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function StatsScreen() {
  const preferences = usePreferencesStore();
  const [stats, setStats] = useState({ totalJaap: 0, totalMalas: 0, sessions: 0 });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const db = await openDatabase();
    
    // Aggregate stats
    const agg = await db.getFirstAsync<{total: number, malas: number, count: number}>(
      'SELECT SUM(count) as total, COUNT(id) as count, SUM(count)/108 as malas FROM sessions'
    );
    if (agg) {
      setStats({
        totalJaap: agg.total || 0,
        totalMalas: Math.floor(agg.malas || 0),
        sessions: agg.count || 0
      });
    }

    // Recent sessions
    const recent = await db.getAllAsync(
      `SELECT s.*, m.sanskrit, m.transliteration 
       FROM sessions s 
       JOIN mantras m ON s.mantra_id = m.id 
       ORDER BY s.completed_at DESC LIMIT 5`
    );
    setRecentSessions(recent);

    // Daily stats for heatmap (last 30 days)
    const daily = await db.getAllAsync<DailyStat>(
      "SELECT * FROM daily_stats ORDER BY date DESC LIMIT 30"
    );
    setDailyStats(daily);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return '#FDF0DC';
    if (count < 108) return '#F0A830';
    if (count < 324) return '#D47C2A';
    return '#8B4A1A';
  };

  // Generate 28 day grid aligned to Monday-Sunday
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const daysUntilSunday = 6 - daysSinceMonday;

  const days = Array.from({length: 28}).map((_, i) => {
    const d = new Date(today);
    const shift = 27 - i;
    d.setDate(today.getDate() + daysUntilSunday - shift);
    const dateStr = d.toISOString().split('T')[0];
    const stat = dailyStats.find(s => s.date === dateStr);
    
    // 0 out future days so they remain empty
    const isFuture = d > today;
    return { 
      date: dateStr, 
      count: stat && !isFuture ? stat.total_count : 0,
      isFuture 
    };
  });

  return (
    <ScrollView 
      className="flex-1 bg-background-primary"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D47C2A" />}
    >
      <View className="p-4 space-y-4">
        <View className="flex-row gap-3 mb-3">
          <View style={{ backgroundColor: '#FDF0DC', borderColor: '#E8D5B0', borderWidth: 1 }} className="flex-[1.5] py-5 rounded-[20px] items-center">
            <Text className="text-[#A08060] text-[11px] font-medium tracking-[0.15em] uppercase mb-1">Total Jaap</Text>
            <Text className="text-[#D47C2A] text-[28px] font-bold">{stats.totalJaap.toLocaleString()}</Text>
          </View>
          <View style={{ backgroundColor: '#FDF0DC', borderColor: '#E8D5B0', borderWidth: 1 }} className="flex-1 py-5 rounded-[20px] items-center">
            <Text className="text-[#A08060] text-[11px] font-medium tracking-[0.15em] uppercase mb-1">Streak</Text>
            <Text className="text-[#D47C2A] text-[28px] font-bold">{preferences.currentStreak} 🔥</Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-8">
          <View style={{ backgroundColor: '#FDF0DC', borderColor: '#E8D5B0', borderWidth: 1 }} className="flex-1 py-4 rounded-[20px] items-center">
            <Text className="text-[#A08060] text-[10px] font-medium tracking-[0.1em] uppercase mb-1">Sessions</Text>
            <Text className="text-[#3D2010] text-[22px] font-medium">{stats.sessions}</Text>
          </View>
          <View style={{ backgroundColor: '#FDF0DC', borderColor: '#E8D5B0', borderWidth: 1 }} className="flex-1 py-4 rounded-[20px] items-center">
            <Text className="text-[#A08060] text-[10px] font-medium tracking-[0.1em] uppercase mb-1">Malas</Text>
            <Text className="text-[#3D2010] text-[22px] font-medium">{stats.totalMalas}</Text>
          </View>
          <View style={{ backgroundColor: '#FDF0DC', borderColor: '#E8D5B0', borderWidth: 1 }} className="flex-1 py-4 rounded-[20px] items-center">
            <Text className="text-[#A08060] text-[10px] font-medium tracking-[0.1em] uppercase mb-1">Avg/Day</Text>
            <Text className="text-[#3D2010] text-[22px] font-medium">{dailyStats.length ? Math.round(stats.totalJaap / dailyStats.length) : 0}</Text>
          </View>
        </View>

        <View className="bg-background-surface p-4 rounded-2xl border border-border mb-4">
          <Text className="text-lg font-semibold text-text-primary mb-4">Last 4 Weeks</Text>
          
          {/* Weekday Header */}
          <View className="flex-row justify-between w-full mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <Text key={i} className="text-text-hint font-medium text-center w-10">{day}</Text>
            ))}
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-2">
            {days.map((day, i) => (
              <View 
               key={i} 
               className="w-10 h-10 rounded-md"
               style={{ 
                 backgroundColor: getHeatmapColor(day.count),
                 opacity: day.isFuture ? 0.3 : 1 
               }}
              />
            ))}
          </View>
          <View className="flex-row justify-end items-center mt-5 space-x-2">
            <Text className="text-xs text-text-secondary">Less</Text>
            <View className="w-3 h-3 rounded-sm bg-[#FDF0DC]" />
            <View className="w-3 h-3 rounded-sm bg-[#F0A830]" />
            <View className="w-3 h-3 rounded-sm bg-[#D47C2A]" />
            <View className="w-3 h-3 rounded-sm bg-[#8B4A1A]" />
            <Text className="text-xs text-text-secondary ml-1">More</Text>
          </View>
        </View>

        <View className="mt-2 mb-8">
          <Text className="text-lg font-semibold text-text-primary mb-3">Recent Sessions</Text>
          {recentSessions.length === 0 ? (
            <Text className="text-text-secondary italic">No sessions yet.</Text>
          ) : (
             recentSessions.map((session, i) => (
              <View key={i} className="bg-background-surface p-4 rounded-xl border border-border mb-3 flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                  <Text className="text-accent-primary font-medium text-lg" numberOfLines={2}>
                    {session.sanskrit}
                  </Text>
                  <Text className="text-text-secondary text-sm mt-1">
                    {new Date(session.completed_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className="items-end shrink-0">
                  <Text className="text-text-primary font-bold text-xl">{session.count}</Text>
                  <Text className="text-text-hint text-xs uppercase">{Math.floor(session.duration_seconds/60)}m {session.duration_seconds%60}s</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
