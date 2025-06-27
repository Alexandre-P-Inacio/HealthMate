import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import { useAuth } from '../../contexts/AuthContext';

const MoodTrackerScreen = () => {
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();
  const [moodEntries, setMoodEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');

  const moods = [
    { id: 'excellent', name: 'Excellent', emoji: '🤩', color: '#4CAF50', value: 5 },
    { id: 'good', name: 'Good', emoji: '😊', color: '#66BB6A', value: 4 },
    { id: 'neutral', name: 'Neutral', emoji: '😐', color: '#FFC107', value: 3 },
    { id: 'bad', name: 'Bad', emoji: '😔', color: '#FF9800', value: 2 },
    { id: 'terrible', name: 'Terrible', emoji: '😫', color: '#F44336', value: 1 }
  ];

  const emotions = [
    { id: 'happy', name: 'Happy', emoji: '😄' },
    { id: 'sad', name: 'Sad', emoji: '😢' },
    { id: 'angry', name: 'Angry', emoji: '😠' },
    { id: 'anxious', name: 'Anxious', emoji: '😰' },
    { id: 'excited', name: 'Excited', emoji: '🤗' },
    { id: 'tired', name: 'Tired', emoji: '😴' },
    { id: 'stressed', name: 'Stressed', emoji: '😣' },
    { id: 'calm', name: 'Calm', emoji: '😌' }
  ];

  useEffect(() => {
    fetchMoodEntries();
  }, []);

  const fetchMoodEntries = async () => {
    try {
      setIsLoading(true);
      
      if (isLoggedIn) {
        const userId = DataUser.getUserData()?.id;
        if (userId) {
          const { data, error } = await supabase
            .from('diary_entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);

          if (error) throw error;
          setMoodEntries(data || []);
        }
      } else {
        // SEM DADOS DE TESTE - Apenas dados reais
        setMoodEntries([]);
      }
    } catch (error) {
      console.error('❌ [MoodTracker] Erro ao buscar entradas:', error);
      Alert.alert('Erro', 'Falha ao carregar dados de humor');
    } finally {
      setIsLoading(false);
    }
  };

  const saveMoodEntry = async () => {
    try {
      if (!selectedMood) {
        Alert.alert('Error', 'Please select a mood');
        return;
      }

      if (!isLoggedIn) {
        Alert.alert('Login Required', 'Please login to save mood entries');
        return;
      }

      const userId = DataUser.getUserData()?.id;
      if (!userId) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const moodData = {
        user_id: userId,
        title: title.trim() || `Mood: ${selectedMood.name}`,
        description: notes || null,
        mood: selectedMood.id,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('diary_entries')
        .insert(moodData);

      if (error) throw error;

      Alert.alert('Success', 'Mood entry saved successfully');
      setShowAddModal(false);
      setSelectedMood(null);
      setNotes('');
      setTitle('');
      fetchMoodEntries();
    } catch (error) {
      console.error('Error saving mood entry:', error);
      Alert.alert('Error', 'Failed to save mood entry');
    }
  };

  const getMoodData = (moodId) => {
    return moods.find(m => m.id === moodId) || moods[2]; // Default to neutral
  };

  const getWeeklyAverage = () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyEntries = moodEntries.filter(entry => 
      new Date(entry.created_at) > weekAgo
    );
    
    if (weeklyEntries.length === 0) return 0;
    
    const sum = weeklyEntries.reduce((acc, entry) => {
      const mood = getMoodData(entry.mood);
      return acc + mood.value;
    }, 0);
    
    return (sum / weeklyEntries.length).toFixed(1);
  };

  const renderMoodCard = (entry, index) => {
    const mood = getMoodData(entry.mood);
    return (
      <View key={index} style={[styles.moodCard, { borderLeftColor: mood.color }]}>
        <View style={styles.moodHeader}>
          <View style={styles.moodInfo}>
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <View>
              <Text style={styles.moodName}>{entry.title}</Text>
              <Text style={styles.moodSubtitle}>{mood.name}</Text>
              <Text style={styles.moodTime}>
                {new Date(entry.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
          <View style={[styles.moodValue, { backgroundColor: mood.color }]}>
            <Text style={styles.moodValueText}>{mood.value}</Text>
          </View>
        </View>
        {entry.description && (
          <Text style={styles.moodNotes}>{entry.description}</Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A8DFD" />
          <Text style={styles.loadingText}>Loading Mood Tracker...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mood Tracker</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {!isLoggedIn ? (
          // Tela para usuários não logados
          <View style={styles.loginPromptContainer}>
            <Ionicons name="happy-outline" size={80} color="#9BA3B7" />
            <Text style={styles.loginPromptTitle}>Login Necessário</Text>
            <Text style={styles.loginPromptText}>
              Para registrar e acompanhar seu humor, faça login na sua conta.
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('LoginScreen')}
            >
              <Text style={styles.loginButtonText}>Fazer Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mood Overview</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{getWeeklyAverage()}</Text>
                  <Text style={styles.statLabel}>Weekly Average</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{moodEntries.length}</Text>
                  <Text style={styles.statLabel}>Total Entries</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {moodEntries.filter(e => new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                  </Text>
                  <Text style={styles.statLabel}>This Week</Text>
                </View>
              </View>
            </View>

        {/* Quick Mood Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickMoods}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[styles.quickMoodButton, { backgroundColor: mood.color + '20' }]}
                onPress={() => {
                  setSelectedMood(mood);
                  setShowAddModal(true);
                }}
              >
                <Text style={styles.quickMoodEmoji}>{mood.emoji}</Text>
                <Text style={styles.quickMoodName}>{mood.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {moodEntries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="happy-outline" size={64} color="#9BA3B7" />
              <Text style={styles.emptyTitle}>No Mood Entries Yet</Text>
              <Text style={styles.emptyText}>
                Start tracking your mood to understand your emotional patterns
              </Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.addFirstButtonText}>Add First Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            moodEntries.map((entry, index) => renderMoodCard(entry, index))
          )}
        </View>
          </>
        )}
      </ScrollView>

      {/* Add Mood Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How are you feeling?</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Title (Optional)</Text>
                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Morning mood, After workout..."
                  placeholderTextColor="#9BA3B7"
                />
              </View>

              {/* Mood Selection */}
              <Text style={styles.sectionSubtitle}>Select your mood</Text>
              <View style={styles.moodGrid}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[
                      styles.moodOption,
                      { backgroundColor: mood.color + '20' },
                      selectedMood?.id === mood.id && styles.selectedMood
                    ]}
                    onPress={() => setSelectedMood(mood)}
                  >
                    <Text style={styles.moodOptionEmoji}>{mood.emoji}</Text>
                    <Text style={styles.moodOptionName}>{mood.name}</Text>
                    <View style={[styles.moodOptionValue, { backgroundColor: mood.color }]}>
                      <Text style={styles.moodOptionValueText}>{mood.value}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#9BA3B7"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={saveMoodEntry}>
                <Text style={styles.saveButtonText}>Save Entry</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A8DFD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    elevation: 4,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3142',
    marginTop: 20,
    marginBottom: 15,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#6A8DFD',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  section: {
    margin: 15,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3142',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6A8DFD',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  quickMoods: {
    paddingVertical: 10,
  },
  quickMoodButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginRight: 15,
    minWidth: 80,
  },
  quickMoodEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickMoodName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3142',
  },
  moodCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  moodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  moodSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A8DFD',
    marginTop: 2,
  },
  moodTime: {
    fontSize: 12,
    color: '#9BA3B7',
  },
  moodValue: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodValueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  moodNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  addFirstButton: {
    backgroundColor: '#6A8DFD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  moodOption: {
    width: '30%',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMood: {
    borderColor: '#6A8DFD',
  },
  moodOptionEmoji: {
    fontSize: 32,
    marginBottom: 5,
  },
  moodOptionName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3142',
    marginBottom: 5,
  },
  moodOptionValue: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodOptionValueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3142',
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E8ECF4',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#2D3142',
    backgroundColor: '#F8F9FA',
    height: 50,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E8ECF4',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#2D3142',
    backgroundColor: '#F8F9FA',
    height: 100,
  },
  saveButton: {
    backgroundColor: '#6A8DFD',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MoodTrackerScreen; 