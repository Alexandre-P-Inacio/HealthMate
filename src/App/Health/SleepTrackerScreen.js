import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SamsungHealthService from '../../services/SamsungHealthService';

const SleepTrackerScreen = () => {
  const navigation = useNavigation();
  const [sleepData, setSleepData] = useState([]);
  const [todaySleep, setTodaySleep] = useState(0);
  const [weeklyAverage, setWeeklyAverage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [sleepQuality, setSleepQuality] = useState('good');
  const [sleepNotes, setSleepNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadSleepData();
    fetchSamsungHealthSleep();
  }, []);

  const loadSleepData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('sleep_data');
      if (savedData) {
        const data = JSON.parse(savedData);
        setSleepData(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error loading sleep data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSamsungHealthSleep = async () => {
    try {
      const result = await SamsungHealthService.getRawHealthDataForDisplay();
      if (result.success && result.summary.sleep > 0) {
        const today = new Date().toISOString().split('T')[0];
        setTodaySleep(result.summary.sleep);
        
        // Save Samsung Health data to local storage
        const newEntry = {
          date: today,
          duration: result.summary.sleep,
          quality: 'good',
          source: 'samsung_health',
          notes: 'Automatically synced from Samsung Health',
          timestamp: new Date().toISOString()
        };

        await saveSleepEntry(newEntry, false); // Don't show alert for auto-sync
      }
    } catch (error) {
      console.error('Error fetching Samsung Health sleep data:', error);
    }
  };

  const calculateStats = (data) => {
    const today = new Date().toISOString().split('T')[0];
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    // Today's sleep
    const todayEntry = data.find(entry => entry.date === today);
    setTodaySleep(todayEntry ? todayEntry.duration : 0);

    // Weekly average
    const weekData = data.filter(entry => new Date(entry.date) >= last7Days);
    if (weekData.length > 0) {
      const avg = weekData.reduce((sum, entry) => sum + entry.duration, 0) / weekData.length;
      setWeeklyAverage(Math.round(avg * 10) / 10);
    }
  };

  const saveSleepEntry = async (entry, showAlert = true) => {
    try {
      const existingData = await AsyncStorage.getItem('sleep_data');
      let sleepArray = existingData ? JSON.parse(existingData) : [];
      
      // Remove existing entry for this date if any
      sleepArray = sleepArray.filter(item => item.date !== entry.date);
      
      // Add new entry
      sleepArray.push(entry);
      sleepArray.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      await AsyncStorage.setItem('sleep_data', JSON.stringify(sleepArray));
      setSleepData(sleepArray);
      calculateStats(sleepArray);
      
      if (showAlert) {
        Alert.alert('Success', 'Sleep data saved successfully!');
      }
    } catch (error) {
      console.error('Error saving sleep data:', error);
      if (showAlert) {
        Alert.alert('Error', 'Failed to save sleep data');
      }
    }
  };

  const handleAddSleep = async () => {
    if (!sleepHours || isNaN(sleepHours) || parseFloat(sleepHours) < 0 || parseFloat(sleepHours) > 24) {
      Alert.alert('Invalid Input', 'Please enter valid hours (0-24)');
      return;
    }

    const minutes = sleepMinutes ? parseFloat(sleepMinutes) : 0;
    if (minutes < 0 || minutes >= 60) {
      Alert.alert('Invalid Input', 'Please enter valid minutes (0-59)');
      return;
    }

    const totalHours = parseFloat(sleepHours) + (minutes / 60);
    
    const entry = {
      date: selectedDate,
      duration: Math.round(totalHours * 10) / 10,
      quality: sleepQuality,
      source: 'manual',
      notes: sleepNotes,
      timestamp: new Date().toISOString()
    };

    await saveSleepEntry(entry);
    
    // Reset form
    setSleepHours('');
    setSleepMinutes('');
    setSleepQuality('good');
    setSleepNotes('');
    setShowAddModal(false);
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'excellent': return 'star';
      case 'good': return 'thumbs-up';
      case 'fair': return 'remove';
      case 'poor': return 'thumbs-down';
      default: return 'help';
    }
  };

  const getSleepInsight = () => {
    if (todaySleep === 0) return "No sleep data for today";
    if (todaySleep < 6) return "You might need more sleep 😴";
    if (todaySleep >= 6 && todaySleep <= 9) return "Great sleep duration! 😊";
    if (todaySleep > 9) return "That's a lot of sleep! 😴";
    return "Keep tracking your sleep!";
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#9C88FF', '#8A6EF5']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sleep Tracker</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C88FF" />
          <Text style={styles.loadingText}>Loading sleep data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#9C88FF', '#8A6EF5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sleep Tracker</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Today's Sleep Card */}
        <View style={styles.todayCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="moon" size={32} color="#9C88FF" />
            <Text style={styles.cardTitle}>Today's Sleep</Text>
          </View>
          <Text style={styles.sleepDuration}>{todaySleep}h</Text>
          <Text style={styles.sleepInsight}>{getSleepInsight()}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{weeklyAverage}h</Text>
            <Text style={styles.statLabel}>Weekly Average</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{sleepData.length}</Text>
            <Text style={styles.statLabel}>Days Tracked</Text>
          </View>
        </View>

        {/* Sleep History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Sleep History</Text>
          {sleepData.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Ionicons name="moon-outline" size={48} color="#ccc" />
              <Text style={styles.noDataText}>No sleep data yet</Text>
              <Text style={styles.noDataSubtext}>Tap + to add your first sleep entry</Text>
            </View>
          ) : (
            sleepData.slice(0, 10).map((entry, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Text style={styles.historySource}>
                    {entry.source === 'samsung_health' ? '📱 Samsung Health' : '✋ Manual'}
                  </Text>
                </View>
                <View style={styles.historyCenter}>
                  <Text style={styles.historyDuration}>{entry.duration}h</Text>
                  {entry.notes && (
                    <Text style={styles.historyNotes} numberOfLines={1}>
                      {entry.notes}
                    </Text>
                  )}
                </View>
                <View style={styles.historyRight}>
                  <Ionicons 
                    name={getQualityIcon(entry.quality)} 
                    size={20} 
                    color={getQualityColor(entry.quality)} 
                  />
                  <Text style={[styles.qualityText, { color: getQualityColor(entry.quality) }]}>
                    {entry.quality}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Sleep Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Sleep Entry</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Date Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              {/* Duration Input */}
              <View style={styles.durationContainer}>
                <View style={styles.durationInput}>
                  <Text style={styles.inputLabel}>Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={sleepHours}
                    onChangeText={setSleepHours}
                    placeholder="8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.durationInput}>
                  <Text style={styles.inputLabel}>Minutes</Text>
                  <TextInput
                    style={styles.input}
                    value={sleepMinutes}
                    onChangeText={setSleepMinutes}
                    placeholder="30"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Quality Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sleep Quality</Text>
                <View style={styles.qualityContainer}>
                  {['excellent', 'good', 'fair', 'poor'].map((quality) => (
                    <TouchableOpacity
                      key={quality}
                      style={[
                        styles.qualityButton,
                        { backgroundColor: sleepQuality === quality ? getQualityColor(quality) : '#f0f0f0' }
                      ]}
                      onPress={() => setSleepQuality(quality)}
                    >
                      <Ionicons 
                        name={getQualityIcon(quality)} 
                        size={16} 
                        color={sleepQuality === quality ? '#fff' : getQualityColor(quality)} 
                      />
                      <Text style={[
                        styles.qualityButtonText,
                        { color: sleepQuality === quality ? '#fff' : '#666' }
                      ]}>
                        {quality}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={sleepNotes}
                  onChangeText={setSleepNotes}
                  placeholder="How was your sleep?"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddSleep}>
                <Text style={styles.saveButtonText}>Save Sleep Entry</Text>
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
    backgroundColor: '#9C88FF',
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
  addButton: {
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
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
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
  },
  todayCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginLeft: 12,
  },
  sleepDuration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#9C88FF',
    marginBottom: 8,
  },
  sleepInsight: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3142',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  historySection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    padding: 20,
    paddingBottom: 12,
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  historySource: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyCenter: {
    flex: 1,
    alignItems: 'center',
  },
  historyDuration: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C88FF',
  },
  historyNotes: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    maxWidth: 100,
  },
  historyRight: {
    alignItems: 'center',
    minWidth: 60,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'capitalize',
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
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3142',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  durationInput: {
    flex: 1,
  },
  qualityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  qualityButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#9C88FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default SleepTrackerScreen; 