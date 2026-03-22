import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal,
  Alert, ActivityIndicator, StyleSheet
} from 'react-native';
import { TextInput } from 'react-native';
import { useSankalpaStore } from '../../store/sankalpaStore';
import { openDatabase, Mantra, Sankalpa } from '../../db/database';
import { Plus, Pause, Play, CheckCircle, Sunrise, ChevronRight } from 'lucide-react-native';

const TARGET_PRESETS = [
  { label: '1,008', value: 1008 },
  { label: '11,000', value: 11000 },
  { label: '1,25,000', value: 125000 },
  { label: 'Custom', value: 0 },
];
const DURATION_PRESETS = [
  { label: '11 days', value: 11 },
  { label: '21 days', value: 21 },
  { label: '40 days', value: 40 },
  { label: 'Custom', value: 0 },
];

function SankalpaCard({
  sankalpa,
  onPause,
  onResume,
  onComplete,
}: {
  sankalpa: Sankalpa;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
}) {
  const progress = Math.min(1, sankalpa.current_count / sankalpa.target_count);
  const pct = Math.round(progress * 100);

  const end = new Date(sankalpa.end_date);
  const today = new Date();
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  const dailyNeeded = daysLeft > 0
    ? Math.ceil((sankalpa.target_count - sankalpa.current_count) / daysLeft)
    : sankalpa.target_count - sankalpa.current_count;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusPill, sankalpa.status === 'paused' ? styles.statusPaused : styles.statusActive]}>
          <Text style={styles.statusPillText}>
            {sankalpa.status === 'paused' ? '⏸ Paused' : '🔥 Active'}
          </Text>
        </View>
        <Text style={styles.cardMantra} numberOfLines={1}>{sankalpa.mantra_name}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={styles.progressLabel}>
        {sankalpa.current_count.toLocaleString()} / {sankalpa.target_count.toLocaleString()} jaaps · {pct}%
      </Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{daysLeft}</Text>
          <Text style={styles.statLbl}>Days Left</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{dailyNeeded.toLocaleString()}</Text>
          <Text style={styles.statLbl}>Needed/Day</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{sankalpa.duration_days}</Text>
          <Text style={styles.statLbl}>Total Days</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {sankalpa.status === 'active' ? (
          <Pressable style={[styles.actionBtn, styles.actionBtnOutline]} onPress={onPause}>
            <Pause size={15} color="#D47C2A" />
            <Text style={styles.actionBtnOutlineText}>Pause</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onResume}>
            <Play size={15} color="#fff" />
            <Text style={styles.actionBtnText}>Resume</Text>
          </Pressable>
        )}
        <Pressable style={[styles.actionBtn, styles.actionBtnDark]} onPress={onComplete}>
          <CheckCircle size={15} color="#fff" />
          <Text style={styles.actionBtnText}>Fulfilled</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SankalpaScreen() {
  const { sankalpas, isLoading, loadAllSankalpas, createSankalpa, pauseSankalpa, resumeSankalpa, completeSankalpa, getSankalpaForMantra } = useSankalpaStore();

  const [showCreate, setShowCreate] = useState(false);
  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [selectedMantra, setSelectedMantra] = useState<Mantra | null>(null);
  const [targetCount, setTargetCount] = useState(11000);
  const [customTarget, setCustomTarget] = useState('');
  const [durationDays, setDurationDays] = useState(21);
  const [customDuration, setCustomDuration] = useState('');
  const [selectedTargetPreset, setSelectedTargetPreset] = useState(1);
  const [selectedDurationPreset, setSelectedDurationPreset] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAllSankalpas();
    loadMantras();
  }, []);

  const loadMantras = async () => {
    try {
      const db = await openDatabase();
      const rows = await db.getAllAsync<Mantra>('SELECT * FROM mantras ORDER BY tradition_id, deity');
      setMantras(rows);
      if (rows.length > 0) setSelectedMantra(rows[0]);
    } catch (e) {
      console.warn('loadMantras error:', e);
    }
  };

  const handleCreate = async () => {
    if (!selectedMantra) return;
    const finalTarget = selectedTargetPreset === 3 ? parseInt(customTarget) : targetCount;
    const finalDuration = selectedDurationPreset === 3 ? parseInt(customDuration) : durationDays;
    if (!finalTarget || !finalDuration || isNaN(finalTarget) || isNaN(finalDuration)) {
      Alert.alert('Incomplete', 'Please fill in all fields.');
      return;
    }

    setCreating(true);
    const result = await createSankalpa({
      mantraId: selectedMantra.id,
      mantraName: selectedMantra.transliteration,
      targetCount: finalTarget,
      durationDays: finalDuration,
    });
    setCreating(false);

    if (result.success) {
      setShowCreate(false);
    } else {
      Alert.alert('Cannot Create', result.error ?? 'Unknown error');
    }
  };

  const handlePause = (s: Sankalpa) => {
    Alert.alert('Pause Sankalpa', `Pause your vow for "${s.mantra_name}"? You can resume anytime.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pause', onPress: () => pauseSankalpa(s.id) },
    ]);
  };

  const handleComplete = (s: Sankalpa) => {
    Alert.alert('Mark Fulfilled 🙏', `Mark your "${s.mantra_name}" Sankalpa as fulfilled?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Fulfilled', onPress: () => completeSankalpa(s.id) },
    ]);
  };

  // Which mantras already have an active/paused sankalpa (blocked from new creation)
  const blockedMantraIds = new Set(sankalpas.map(s => s.mantra_id));

  const finalTarget = selectedTargetPreset === 3 ? parseInt(customTarget || '0') : targetCount;
  const finalDuration = selectedDurationPreset === 3 ? parseInt(customDuration || '1') : durationDays;

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#D47C2A" size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* Header row */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Your Sankalpas</Text>
          <Text style={styles.pageSubtitle}>{sankalpas.length} active vow{sankalpas.length !== 1 ? 's' : ''}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Plus size={20} color="#fff" />
          <Text style={styles.addBtnText}>New</Text>
        </Pressable>
      </View>

      {/* Sankalpa cards */}
      {sankalpas.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🪬</Text>
          <Text style={styles.emptyTitle}>No Active Sankalpas</Text>
          <Text style={styles.emptySubtitle}>
            A Sankalpa is a sacred vow — commit to a set number of jaaps over a period of time for a specific mantra.
          </Text>
          <Pressable style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Plus size={20} color="#fff" />
            <Text style={styles.createBtnText}>Take a Sankalpa</Text>
          </Pressable>
        </View>
      ) : (
        sankalpas.map(s => (
          <SankalpaCard
            key={s.id}
            sankalpa={s}
            onPause={() => handlePause(s)}
            onResume={() => resumeSankalpa(s.id)}
            onComplete={() => handleComplete(s)}
          />
        ))
      )}

      {/* Hint */}
      {sankalpas.length > 0 && (
        <Text style={styles.hint}>
          📿 Jaap sessions automatically contribute to the matching Sankalpa.
        </Text>
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreate(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Take a Sankalpa 🪬</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Mantra picker */}
              <Text style={styles.fieldLabel}>Choose Mantra</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {mantras.map(m => {
                  const isBlocked = blockedMantraIds.has(m.id);
                  const isSelected = selectedMantra?.id === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => !isBlocked && setSelectedMantra(m)}
                      style={[
                        styles.mantraChip,
                        isSelected && styles.mantraChipActive,
                        isBlocked && styles.mantraChipBlocked,
                      ]}
                    >
                      <Text style={[styles.mantraChipText, isSelected && styles.mantraChipTextActive]}>
                        {m.sanskrit}
                      </Text>
                      <Text style={[styles.mantraChipSub, isSelected && { color: '#fff' }]}>
                        {m.transliteration}
                      </Text>
                      {isBlocked && (
                        <Text style={styles.mantraChipBlockedLabel}>Active</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Selected mantra already has sankalpa warning */}
              {selectedMantra && blockedMantraIds.has(selectedMantra.id) && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ "{selectedMantra.transliteration}" already has an active Sankalpa. Choose a different mantra.
                  </Text>
                </View>
              )}

              {/* Target Count */}
              <Text style={styles.fieldLabel}>Total Jaap Target</Text>
              <View style={styles.presetRow}>
                {TARGET_PRESETS.map((p, i) => (
                  <Pressable
                    key={i}
                    onPress={() => { setSelectedTargetPreset(i); if (i !== 3) setTargetCount(p.value); }}
                    style={[styles.presetChip, selectedTargetPreset === i && styles.presetChipActive]}
                  >
                    <Text style={[styles.presetChipText, selectedTargetPreset === i && styles.presetChipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {selectedTargetPreset === 3 && (
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 50000"
                  placeholderTextColor="#A08060"
                  value={customTarget}
                  onChangeText={setCustomTarget}
                />
              )}

              {/* Duration */}
              <Text style={styles.fieldLabel}>Duration</Text>
              <View style={styles.presetRow}>
                {DURATION_PRESETS.map((p, i) => (
                  <Pressable
                    key={i}
                    onPress={() => { setSelectedDurationPreset(i); if (i !== 3) setDurationDays(p.value); }}
                    style={[styles.presetChip, selectedDurationPreset === i && styles.presetChipActive]}
                  >
                    <Text style={[styles.presetChipText, selectedDurationPreset === i && styles.presetChipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {selectedDurationPreset === 3 && (
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 30"
                  placeholderTextColor="#A08060"
                  value={customDuration}
                  onChangeText={setCustomDuration}
                />
              )}

              {/* Preview */}
              {selectedMantra && !blockedMantraIds.has(selectedMantra.id) && finalTarget > 0 && finalDuration > 0 && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewText}>
                    📿 ~{Math.ceil(finalTarget / finalDuration).toLocaleString()} jaaps/day for {finalDuration} days
                  </Text>
                </View>
              )}

              <Pressable
                style={[
                  styles.createBtn,
                  { marginTop: 8 },
                  (selectedMantra && blockedMantraIds.has(selectedMantra.id)) && { opacity: 0.4 }
                ]}
                onPress={handleCreate}
                disabled={creating || (!!selectedMantra && blockedMantraIds.has(selectedMantra.id))}
              >
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.createBtnText}>🙏 Begin Sankalpa</Text>
                }
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const AMBER = '#D47C2A';
const BG = '#FDF6EC';
const CARD = '#FDF0DC';
const BORDER = '#E8D5B0';
const TEXT = '#3D2010';
const HINT = '#A08060';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: TEXT },
  pageSubtitle: { fontSize: 13, color: HINT, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AMBER, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Card
  card: { backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
  cardHeader: { marginBottom: 12 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 8 },
  statusActive: { backgroundColor: AMBER + '20', borderWidth: 1, borderColor: AMBER + '50' },
  statusPaused: { backgroundColor: '#A0806020', borderWidth: 1, borderColor: BORDER },
  statusPillText: { fontSize: 11, fontWeight: '700', color: TEXT },
  cardMantra: { fontSize: 18, fontWeight: '700', color: TEXT },
  progressBg: { height: 8, backgroundColor: BORDER, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: 8, backgroundColor: AMBER, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: HINT, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: BORDER },
  statNum: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 2 },
  statLbl: { fontSize: 10, color: HINT, fontWeight: '600', letterSpacing: 0.5 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 11, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary: { backgroundColor: AMBER },
  actionBtnOutline: { borderWidth: 1.5, borderColor: AMBER },
  actionBtnDark: { backgroundColor: '#7C3A00' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionBtnOutlineText: { color: AMBER, fontWeight: '700', fontSize: 14 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: TEXT, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: HINT, textAlign: 'center', lineHeight: 22, marginBottom: 32, maxWidth: 300 },
  hint: { fontSize: 12, color: HINT, textAlign: 'center', marginTop: 4 },

  createBtn: { backgroundColor: AMBER, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 24, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48, maxHeight: '90%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: HINT, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' },
  mantraChip: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 12, marginRight: 10, minWidth: 110 },
  mantraChipActive: { backgroundColor: AMBER, borderColor: AMBER },
  mantraChipBlocked: { opacity: 0.45 },
  mantraChipBlockedLabel: { fontSize: 9, color: AMBER, fontWeight: '700', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' },
  mantraChipText: { fontSize: 18, color: TEXT, marginBottom: 2 },
  mantraChipTextActive: { color: '#fff' },
  mantraChipSub: { fontSize: 10, color: HINT },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  presetChipActive: { backgroundColor: AMBER, borderColor: AMBER },
  presetChipText: { fontSize: 13, color: TEXT, fontWeight: '600' },
  presetChipTextActive: { color: '#fff' },
  input: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, fontSize: 16, color: TEXT, marginBottom: 16 },
  warningBox: { backgroundColor: '#FFF3CD', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFDCA0' },
  warningText: { fontSize: 13, color: '#7C5200' },
  previewBox: { backgroundColor: AMBER + '15', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: AMBER + '30' },
  previewText: { fontSize: 14, color: TEXT, fontWeight: '600', textAlign: 'center' },
});
