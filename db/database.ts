import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type Mantra = {
  id: string;
  tradition_id: string;
  deity: string;
  sanskrit: string;
  transliteration: string;
  meaning: string;
  recommended_count: number;
};

export type SessionHistory = {
  id: string;
  mantra_id: string;
  count: number;
  duration_seconds: number;
  completed_at: string; // ISO8601
};

export type DailyStat = {
  date: string;
  total_count: number;
  session_count: number;
};

export type Sankalpa = {
  id: string;
  mantra_id: string;
  mantra_name: string;
  target_count: number;
  current_count: number;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
};

let _db: SQLite.SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    return {
      execAsync: async () => {},
      getAllAsync: async <T>() => [] as T[],
      getFirstAsync: async <T>() => null as T | null,
      runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
      closeAsync: async () => {},
    } as any;
  }

  // Return the cached instance immediately
  if (_db) return _db;

  // If already opening, wait for that promise (don't open twice)
  if (_dbPromise) return _dbPromise;

  _dbPromise = SQLite.openDatabaseAsync('jaapsathi.db').then(db => {
    _db = db;
    _dbPromise = null;
    return db;
  });

  return _dbPromise;
}

export async function initDatabase() {
  const db = await openDatabase();
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS mantras (
      id TEXT PRIMARY KEY,
      tradition_id TEXT NOT NULL,
      deity TEXT NOT NULL,
      sanskrit TEXT NOT NULL,
      transliteration TEXT NOT NULL,
      meaning TEXT NOT NULL,
      recommended_count INTEGER DEFAULT 108
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      mantra_id TEXT NOT NULL,
      count INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      FOREIGN KEY (mantra_id) REFERENCES mantras(id)
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      total_count INTEGER DEFAULT 0,
      session_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sankalpas (
      id TEXT PRIMARY KEY,
      mantra_id TEXT NOT NULL,
      mantra_name TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      duration_days INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );
  `);

  // Seed default mantras if not exists
  const countResult = await db.getAllAsync<{count: number}>('SELECT COUNT(*) as count FROM mantras');
  if (countResult[0]?.count === 0) {
    const seedData: Mantra[] = [
      {
        id: 'om',
        tradition_id: 'hindu',
        deity: 'Shiva',
        sanskrit: 'ॐ',
        transliteration: 'Om',
        meaning: 'The primordial sound of the universe',
        recommended_count: 108
      },
      {
        id: 'shiva_panchakshari',
        tradition_id: 'hindu',
        deity: 'Shiva',
        sanskrit: 'ॐ नमः शिवाय',
        transliteration: 'Om Namah Shivaya',
        meaning: 'Adoration to Lord Shiva',
        recommended_count: 108
      },
      {
        id: 'ganesh_mool',
        tradition_id: 'hindu',
        deity: 'Ganesh',
        sanskrit: 'ॐ गं गणपतये नमः',
        transliteration: 'Om Gam Ganapataye Namaha',
        meaning: 'Salutations to the remover of obstacles',
        recommended_count: 108
      },
      {
        id: 'gayatri',
        tradition_id: 'hindu',
        deity: 'Devi',
        sanskrit: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्',
        transliteration: 'Om Bhur Bhuva Svaha Tat Savitur Varenyam',
        meaning: 'May the divine light of the Supreme awaken our intellect',
        recommended_count: 108
      }
    ];

    for (const m of seedData) {
      await db.runAsync(
        'INSERT INTO mantras (id, tradition_id, deity, sanskrit, transliteration, meaning, recommended_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
        m.id, m.tradition_id, m.deity, m.sanskrit, m.transliteration, m.meaning, m.recommended_count
      );
    }
  }

  // Seed history if empty or sparse for testing reasons
  const sessionCount = await db.getAllAsync<{count: number}>('SELECT COUNT(*) as count FROM sessions');
  if (sessionCount[0]?.count < 10) {
    console.log('Seeding 3 months of mock session data for realistic UI...');
    await db.execAsync('DELETE FROM sessions; DELETE FROM daily_stats;');
    
    const today = new Date();
    const mantraIds = ['om', 'shiva_panchakshari', 'ganesh_mool', 'gayatri'];

    for (let i = 0; i < 90; i++) {
        // Skip some days randomly (~30% miss rate) to make streak gaps
        if (Math.random() > 0.70) continue;

        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const sessionsToday = Math.floor(Math.random() * 3) + 1; // 1 to 3 sessions
        let totalCount = 0;

        for (let j = 0; j < sessionsToday; j++) {
            const id = `mock_${i}_${j}`;
            const count = [27, 54, 108, 108, 108][Math.floor(Math.random() * 5)];
            totalCount += count;
            const duration = count * 2; // rough estimate (2s per chant)
            const mantraId = mantraIds[Math.floor(Math.random() * mantraIds.length)];
            
            // Set completion time to sometime in the middle of that day
            const completedAt = new Date(d);
            completedAt.setHours(8 + Math.floor(Math.random() * 10), 0, 0, 0);
            
            await db.runAsync(
              'INSERT INTO sessions (id, mantra_id, count, duration_seconds, completed_at) VALUES (?, ?, ?, ?, ?)',
              id, mantraId, count, duration, completedAt.toISOString()
            );
        }

        await db.runAsync(
          'INSERT INTO daily_stats (date, total_count, session_count) VALUES (?, ?, ?)',
          dateStr, totalCount, sessionsToday
        );
    }
  }
}
