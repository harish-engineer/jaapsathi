import { useState, useEffect } from 'react';
import { View, Text, TextInput, SectionList, Pressable, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { openDatabase, Mantra } from '../../db/database';
import { useSessionStore } from '../../store/sessionStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { Search, CheckCircle2, Plus, X, Trash2 } from 'lucide-react-native';

export default function MantrasScreen() {
  const router = useRouter();
  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMantra, setSelectedMantra] = useState<Mantra | null>(null);
  
  // Custom Mantra Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMantra, setNewMantra] = useState({ sanskrit: '', transliteration: '', meaning: '', deity: 'Custom' });
  
  const defaultBeadCount = usePreferencesStore(s => s.defaultBeadCount);
  const startSession = useSessionStore(s => s.startSession);

  const loadMantras = async () => {
    const db = await openDatabase();
    const allMantras = await db.getAllAsync<Mantra>('SELECT * FROM mantras ORDER BY deity');
    setMantras(allMantras);
  };

  useEffect(() => {
    loadMantras();
  }, []);

  const handleDeleteMantra = (id: string, name: string) => {
    Alert.alert(
      "Delete Mantra",
      `Are you sure you want to permanently delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const db = await openDatabase();
            await db.runAsync('DELETE FROM mantras WHERE id = ?', [id]);
            await loadMantras();
            if (selectedMantra?.id === id) {
              setSelectedMantra(null);
            }
          }
        }
      ]
    );
  };

  const handleAddCustomMantra = async () => {
    if (!newMantra.transliteration.trim()) {
      Alert.alert("Name Required", "Please enter the name or transliteration for your custom mantra.");
      return;
    }

    const db = await openDatabase();
    const id = `custom_${Date.now()}`;
    
    await db.runAsync(
      'INSERT INTO mantras (id, tradition_id, deity, sanskrit, transliteration, meaning, recommended_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id,
      'custom',
      newMantra.deity.trim() || 'Custom',
      newMantra.sanskrit.trim() || newMantra.transliteration.trim(),
      newMantra.transliteration.trim(),
      newMantra.meaning.trim() || 'Personal custom mantra',
      108]
    );

    await loadMantras();
    setShowAddModal(false);
    setSearch('');
    setNewMantra({ sanskrit: '', transliteration: '', meaning: '', deity: 'Custom' });
  };

  const filteredMantras = mantras.filter(m => 
    m.sanskrit.includes(search) || 
    m.transliteration.toLowerCase().includes(search.toLowerCase()) ||
    m.deity.toLowerCase().includes(search.toLowerCase())
  );

  const sections = filteredMantras.reduce((acc, mantra) => {
    const existingSection = acc.find(s => s.title === mantra.deity);
    if (existingSection) {
      existingSection.data.push(mantra);
    } else {
      acc.push({ title: mantra.deity, data: [mantra] });
    }
    return acc;
  }, [] as {title: string, data: Mantra[]}[]);

  const handleBeginJaap = () => {
    if (selectedMantra) {
      startSession(selectedMantra.id, selectedMantra.recommended_count || defaultBeadCount);
      router.navigate('/(tabs)/counter');
    }
  };

  return (
    <View className="flex-1 bg-background-primary">
      <View className="p-4">
        <View className="flex-row items-center gap-x-2">
          <View className="flex-1 flex-row items-center bg-background-surface border border-border rounded-xl px-4 py-3">
            <Search size={20} color="#A08060" />
            <TextInput
              className="flex-1 ml-3 text-text-primary text-base"
              placeholder="Search mantras or deities"
              placeholderTextColor="#C8A878"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable 
            onPress={() => setShowAddModal(true)} 
            className="bg-accent-primary p-3 rounded-xl border border-accent-bright items-center justify-center justify-self-stretch h-[50px] w-[50px]"
          >
            <Plus size={24} color="white" />
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderSectionHeader={({ section: { title } }) => (
          <View className="py-2 mb-2 border-b border-border">
            <Text className="text-xl font-semibold text-text-secondary">{title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = selectedMantra?.id === item.id;
          return (
            <Pressable
              onPress={() => setSelectedMantra(item)}
              className={`mb-4 p-4 rounded-xl border ${isSelected ? 'border-accent-primary bg-background-surface' : 'border-border bg-background-surfaceAlt'}`}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-2">
                  <Text className="text-2xl text-accent-primary mb-1">{item.sanskrit}</Text>
                  <Text className="text-lg text-text-primary font-medium">{item.transliteration}</Text>
                  <Text className="text-sm text-text-secondary mt-1 leading-tight">{item.meaning}</Text>
                </View>
                
                <View className="items-center">
                  <Pressable 
                    onPress={() => handleDeleteMantra(item.id, item.transliteration)}
                    hitSlop={15}
                    className="p-2 -mr-2 -mt-2 opacity-40 mb-2"
                  >
                    <Trash2 size={20} color="#8B4A1A" />
                  </Pressable>
                  
                  {isSelected && (
                    <CheckCircle2 size={24} color="#D47C2A" className="flex-shrink-0" />
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={() => (
          <View className="items-center py-10 opacity-70">
            <Text className="text-text-secondary text-lg">No mantras found.</Text>
            <Text className="text-text-hint mt-2 text-center px-6">Tap the + button above to add your own distinct mantra.</Text>
          </View>
        )}
      />

      {selectedMantra && (
        <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-background-primary border-t border-border shadow-md">
          <Pressable
            onPress={handleBeginJaap}
            className="bg-accent-primary rounded-xl p-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              Begin Jaap • {selectedMantra.transliteration}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Add Mantra Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-background-primary w-full p-6 rounded-[24px] border border-border shadow-lg">
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-text-primary">Add Custom Mantra</Text>
              <Pressable onPress={() => setShowAddModal(false)} className="p-2 -mr-2 opacity-60">
                <X size={24} color="#3D2010" />
              </Pressable>
            </View>

            <View className="space-y-4 mb-8 gap-y-4">
              <View>
                <Text className="text-sm font-semibold tracking-wider text-text-hint uppercase mb-1.5 ml-1">Mantra / Title *</Text>
                <TextInput 
                  className="bg-background-surface border border-border rounded-xl px-4 py-3.5 text-text-primary text-base font-medium"
                  placeholder="e.g. Om Namo Narayanaya"
                  placeholderTextColor="#C8A878"
                  value={newMantra.transliteration}
                  onChangeText={(t) => setNewMantra({...newMantra, transliteration: t})}
                />
              </View>
              
              <View>
                <Text className="text-sm font-semibold tracking-wider text-text-hint uppercase mb-1.5 ml-1">Deity / Category</Text>
                <TextInput 
                  className="bg-background-surface border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
                  placeholder="e.g. Vishnu, Custom"
                  placeholderTextColor="#C8A878"
                  value={newMantra.deity}
                  onChangeText={(t) => setNewMantra({...newMantra, deity: t})}
                />
              </View>

              <View>
                <Text className="text-sm font-semibold tracking-wider text-text-hint uppercase mb-1.5 ml-1">Meaning (Optional)</Text>
                <TextInput 
                  className="bg-background-surface border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
                  placeholder="Meaning or significance"
                  placeholderTextColor="#C8A878"
                  value={newMantra.meaning}
                  onChangeText={(t) => setNewMantra({...newMantra, meaning: t})}
                  multiline
                />
              </View>
            </View>

            <Pressable 
              onPress={handleAddCustomMantra}
              className="bg-accent-primary py-4 rounded-xl items-center shadow-sm"
            >
              <Text className="text-white font-bold text-lg tracking-wide">Save Custom Mantra</Text>
            </Pressable>

          </View>
        </View>
      </Modal>

    </View>
  );
}
