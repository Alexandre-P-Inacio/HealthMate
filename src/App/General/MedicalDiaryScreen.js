import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';

// Chave para armazenar as entradas e medicamentos no AsyncStorage
const STORAGE_KEY = 'medicalDiaryEntries';
const MEDS_STORAGE_KEY = 'medicationSchedule';

const MedicalDiaryScreen = ({ navigation }) => {
  const [entries, setEntries] = useState([]);
  const [dailyMedications, setDailyMedications] = useState([]);
  const [confirmedMedications, setConfirmedMedications] = useState([]); // Added state for confirmed medications
  const [modalVisible, setModalVisible] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    description: '',
    mood: 'normal',
    symptoms: '',
  });
  const [loading, setLoading] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true); // Added loading state for medications
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [medicationDetailsModalVisible, setMedicationDetailsModalVisible] = useState(false);
  const [pendingMedications, setPendingMedications] = useState([]);
  const [loadingPendingMedications, setLoadingPendingMedications] = useState(false);

  // Add this new useEffect to get the user ID when component mounts
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          setUserId(userData.id);
        } else {
          console.warn('User data not available in DataUser');
          // Try to get user data from navigation params if available
          const userIdFromParams = navigation.getParam ? 
            navigation.getParam('userId') : 
            navigation.route?.params?.userId;
            
          if (userIdFromParams) {
            setUserId(userIdFromParams);
          } else {
            // As a last resort, try to get from Supabase session
            supabase.auth.getSession().then(({ data }) => {
              if (data?.session?.user?.id) {
                setUserId(data.session.user.id);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    };

    loadUserData();
  }, [navigation]);

  useEffect(() => {
    // Fetch data for the selected date
    fetchEntriesByDate(selectedDate);
    fetchConfirmedMedications(selectedDate);
    fetchPendingMedications(selectedDate);
  }, [selectedDate]);

  // Add focus listener to refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) {
        fetchConfirmedMedications(selectedDate);
      }
    });

    return unsubscribe;
  }, [navigation, userId, selectedDate]);

  const fetchMedicationsForDate = async (date) => {
    try {
      const storedMeds = await AsyncStorage.getItem(MEDS_STORAGE_KEY);
      if (!storedMeds) return;
      
      // Try to get user ID if not already set
      let currentUserId = userId;
      if (!currentUserId) {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          currentUserId = userData.id;
          setUserId(userData.id); // Update the state for future use
        }
      }
      
      const medications = JSON.parse(storedMeds);
      const selectedDateStr = date.toISOString().split('T')[0];
      
      // Filter medications by date AND user ID
      const medsForDate = medications.filter(med => {
        const medDate = new Date(med.nextDose).toISOString().split('T')[0];
        return medDate === selectedDateStr && 
               (med.user_id === currentUserId || med.user_id === undefined); // Include legacy records
      });
      
      // Sort by time
      const sortedMeds = medsForDate.sort((a, b) => 
        new Date(a.nextDose) - new Date(b.nextDose)
      );
      
      setDailyMedications(sortedMeds);
    } catch (error) {
      console.error('Error fetching medications for date:', error);
    }
  };

  const fetchEntriesByDate = async (date) => {
    try {
      setLoading(true);
      
      const formattedDate = date.toISOString().split('T')[0];
      
      // 1. First fetch from AsyncStorage for backward compatibility
      const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
      const asyncStorageEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      // Try to get user ID if not already set
      let currentUserId = userId;
      if (!currentUserId) {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          currentUserId = userData.id;
          setUserId(userData.id); // Update the state for future use
        }
      }
      
      // 2. Then fetch from Supabase
      let supabaseEntries = [];
      const startOfDay = new Date(formattedDate);
      const endOfDay = new Date(formattedDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());
      
      if (error) {
        console.error('Error fetching from Supabase:', error);
      } else {
        // No filtering by user ID since column doesn't exist
        supabaseEntries = data || [];
      }
      
      // 3. Filter AsyncStorage entries by date only (remove user ID filtering)
      const filteredAsyncEntries = asyncStorageEntries.filter(entry => {
        const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
        return entryDate === formattedDate;
      });
      
      // 4. Combine entries from both sources, avoiding duplicates
      // Use entries from Supabase first, then add AsyncStorage entries that aren't duplicates
      const entryMap = new Map();
      
      // Add Supabase entries to map
      supabaseEntries.forEach(entry => {
        entryMap.set(entry.id.toString(), entry);
      });
      
      // Add AsyncStorage entries if they don't exist in Supabase yet
      filteredAsyncEntries.forEach(entry => {
        if (!entryMap.has(entry.id.toString())) {
          entryMap.set(entry.id.toString(), entry);
        }
      });
      
      setEntries(Array.from(entryMap.values()));
    } catch (error) {
      console.error('Error fetching entries:', error);
      Alert.alert('Error', 'Could not load the diary.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch confirmed medications from medication_schedule_times
  const fetchConfirmedMedications = async (date) => {
    try {
      setLoadingMedications(true);
      let currentUserId = userId;
      if (!currentUserId) {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          currentUserId = userData.id;
          setUserId(userData.id);
        }
      }
      if (!currentUserId) {
        setLoadingMedications(false);
        return;
      }
      const formattedDate = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('scheduled_date', formattedDate)
        .not('status', 'eq', 'pending');
        if (error) throw error;
      setConfirmedMedications(data || []);
    } catch (error) {
      console.error('Error fetching confirmed medications:', error);
      Alert.alert('Error', 'Failed to load confirmed medications');
      setConfirmedMedications([]);
    } finally {
      setLoadingMedications(false);
    }
  };

  // Fetch pending medications from medication_schedule_times
  const fetchPendingMedications = async (date) => {
    try {
      setLoadingPendingMedications(true);
      let currentUserId = userId;
      if (!currentUserId) {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          currentUserId = userData.id;
          setUserId(userData.id);
        }
      }
      if (!currentUserId) {
        setLoadingPendingMedications(false);
        return;
      }
      const formattedDate = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select('*')
          .eq('user_id', currentUserId)
        .eq('scheduled_date', formattedDate)
        .eq('status', 'pending');
      if (error) throw error;
      setPendingMedications(data || []);
    } catch (error) {
      console.error('Error fetching pending medications:', error);
      Alert.alert('Error', 'Failed to load pending medications');
      setPendingMedications([]);
    } finally {
      setLoadingPendingMedications(false);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSaveEntry = async () => {
    try {
      if (!newEntry.title.trim()) {
        Alert.alert('Error', 'Please add a title.');
        return;
      }

      // Try to get user ID if not already set
      let entryUserId = userId;
      if (!entryUserId) {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          entryUserId = userData.id;
          setUserId(userData.id); // Update the state for future use
        } else {
          // Try to get from navigation params
          const userIdFromParams = navigation.getParam ? 
            navigation.getParam('userId') : 
            navigation.route?.params?.userId;
          
          if (userIdFromParams) {
            entryUserId = userIdFromParams;
            setUserId(userIdFromParams);
          }
        }
      }

      if (!entryUserId) {
        console.warn('No user ID available, cannot save entry');
        Alert.alert('Error', 'User information not available. Please try again later.');
        return;
      }

      const now = new Date();
      const entryDate = new Date(selectedDate);
      entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      
      // Retrieve all existing entries from AsyncStorage
      const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      let entryData;
      
      if (editingEntry) {
        // Update existing entry
        entryData = {
          id: editingEntry.id,
          user_id: entryUserId, // Keep this in local storage only
          title: newEntry.title,
          description: newEntry.description,
          mood: newEntry.mood,
          symptoms: newEntry.symptoms,
          updated_at: new Date().toISOString()
        };

        // 1. Update in AsyncStorage
        const updatedEntries = allEntries.map(entry => {
          if (entry.id === editingEntry.id) {
            return { ...entry, ...entryData };
          }
          return entry;
        });
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
        
        // 2. Update in Supabase - use upsert to handle both insert and update
        // Don't include user_id since it doesn't exist in the table
        const { error } = await supabase
          .from('diary_entries')
          .upsert({
            id: parseInt(editingEntry.id), // Supabase expects numeric id
            title: newEntry.title,
            description: newEntry.description,
            mood: newEntry.mood,
            symptoms: newEntry.symptoms,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error updating entry in Supabase:', error);
        }
      } else {
        // Create new entry
        const newId = Date.now().toString();
        entryData = {
          id: newId,
          user_id: entryUserId, // Keep this in local storage only
          title: newEntry.title,
          description: newEntry.description,
          mood: newEntry.mood,
          symptoms: newEntry.symptoms,
          created_at: entryDate.toISOString(),
        };
        
        // 1. Save to AsyncStorage
        const updatedEntries = [...allEntries, entryData];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
        
        // 2. Save to Supabase
        // Don't include user_id since it doesn't exist in the table
        const { error } = await supabase
          .from('diary_entries')
          .insert({
            id: parseInt(newId), // Supabase expects numeric id
            title: newEntry.title,
            description: newEntry.description,
            mood: newEntry.mood,
            symptoms: newEntry.symptoms,
            created_at: entryDate.toISOString()
          });
        
        if (error) {
          console.error('Error inserting entry in Supabase:', error);
        }
      }

      setNewEntry({
        title: '',
        description: '',
        mood: 'normal',
        symptoms: '',
      });
      setEditingEntry(null);
      setModalVisible(false);
      
      // Update the list
      fetchEntriesByDate(selectedDate);
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', `Could not save the entry: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setNewEntry({
      title: entry.title,
      description: entry.description,
      mood: entry.mood,
      symptoms: entry.symptoms,
    });
    setModalVisible(true);
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      // 1. Delete from AsyncStorage
      const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      const updatedEntries = allEntries.filter(entry => entry.id !== entryId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
      
      // 2. Delete from Supabase
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', parseInt(entryId)); // Supabase expects numeric id
      
      if (error) {
        console.error('Error deleting entry from Supabase:', error);
      }
      
      // 3. Refresh the list
      fetchEntriesByDate(selectedDate);
    } catch (error) {
      console.error('Error deleting entry:', error);
      Alert.alert('Error', 'Could not delete the entry.');
    }
  };

  const getMoodIcon = (mood) => {
    switch (mood) {
      case 'good':
        return { name: 'happy', color: '#4CAF50' };
      case 'bad':
        return { name: 'sad', color: '#F44336' };
      default:
        return { name: 'happy-outline', color: '#FFC107' };
    }
  };

  const renderDateSelector = () => {
    const formattedDateText = selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
    
    const isToday = 
      selectedDate.getDate() === new Date().getDate() &&
      selectedDate.getMonth() === new Date().getMonth() &&
      selectedDate.getFullYear() === new Date().getFullYear();
    
    return (
      <View style={styles.dateContainer}>
        <View style={styles.dateSelector}>
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => {
              const prevDay = new Date(selectedDate);
              prevDay.setDate(prevDay.getDate() - 1);
              setSelectedDate(prevDay);
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#6A8DFD" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dateButton, isToday && styles.todayButton]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateText, isToday && styles.todayText]}>
              {isToday ? 'TODAY' : formattedDateText}
            </Text>
            <Ionicons 
              name="calendar" 
              size={22} 
              color={isToday ? "#FFF" : "#6A8DFD"} 
              style={styles.calendarIcon} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => {
              const nextDay = new Date(selectedDate);
              nextDay.setDate(nextDay.getDate() + 1);
              setSelectedDate(nextDay);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="#6A8DFD" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
        
        <Text style={styles.dateContextText}>
          Showing entries and medications for {isToday ? "today" : formattedDateText}
        </Text>
      </View>
    );
  };

  const renderEntry = ({ item }) => {
    const moodIcon = getMoodIcon(item.mood);
    const entryTime = new Date(item.created_at);
    const formattedTime = entryTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.titleContainer}>
            <View style={[styles.moodIconContainer, {backgroundColor: moodIcon.color}]}>
              <Ionicons name={moodIcon.name} size={22} color="#FFF" />
            </View>
            <View style={styles.titleTimeContainer}>
              <Text style={styles.entryTitle}>{item.title}</Text>
              <Text style={styles.entryTime}>{formattedTime}</Text>
            </View>
          </View>
          <View style={styles.entryActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditEntry(item)}
            >
              <Ionicons name="create-outline" size={22} color="#6A8DFD" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => 
                Alert.alert(
                  'Confirm deletion',
                  'Are you sure you want to delete this entry?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', onPress: () => handleDeleteEntry(item.id), style: 'destructive' }
                  ]
                )
              }
            >
              <Ionicons name="trash-outline" size={22} color="#E74C3C" />
            </TouchableOpacity>
          </View>
        </View>
        
        {item.symptoms && (
          <View style={styles.symptomsContainer}>
            <Text style={styles.symptomsLabel}>Symptoms:</Text>
            <Text style={styles.symptomsText}>{item.symptoms}</Text>
          </View>
        )}
        
        {item.description && (
          <Text style={styles.entryDescription}>{item.description}</Text>
        )}
      </View>
    );
  };

  // Function to show medication details
  const showMedicationDetails = (medication) => {
    setSelectedMedication(medication);
    setMedicationDetailsModalVisible(true);
  };

  // Modified renderMedication function to handle all medication types
  const renderMedication = ({ item }) => {
    let backgroundColor, statusText, statusColor, statusIcon;
    
    // Determine styling based on status
    if (item.status === 'taken') {
      backgroundColor = '#e8f7f0';
      statusText = 'Taken';
      statusColor = '#2ecc71';
      statusIcon = 'checkmark-circle';
    } else if (item.status === 'missed') {
      backgroundColor = '#fcf3e7';
      statusText = 'Missed';
      statusColor = '#e67e22';
      statusIcon = 'close-circle';
    } else {
      backgroundColor = '#f0f3ff';
      statusText = 'Pending';
      statusColor = '#f39c12';
      statusIcon = 'time-outline';
    }
    
    const timeString = item.scheduled_time 
      ? new Date(`2000-01-01T${item.scheduled_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
        
    return (
      <TouchableOpacity 
        style={[styles.medicationCard, {backgroundColor: backgroundColor}]}
        onPress={() => showMedicationDetails(item)}
      >
        <View style={styles.medicationCardHeader}>
          <Ionicons name={statusIcon} size={16} color={statusColor} />
          <Text style={[styles.medicationCardStatus, {color: statusColor}]}>
            {statusText}
          </Text>
        </View>
        
        <Text style={styles.medicationCardTitle} numberOfLines={2}>
          {item.nome_medicamento}
        </Text>
        
        <Text style={styles.medicationCardDosage}>
          {item.dosage} {typeof item.dosage === 'number' ? 'unit(s)' : ''}
        </Text>
        
        <View style={styles.medicationCardTime}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.medicationCardTimeText}>
            {timeString}
          </Text>
        </View>
        
        {item.notes && (
          <Text style={styles.medicationCardNotes} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Add a function to sync all AsyncStorage entries to Supabase
  // This can be called when the component mounts
  const syncAsyncStorageToSupabase = async () => {
    try {
      // Try to get user ID if not already set
      let currentUserId = userId;
      if (!currentUserId) {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          currentUserId = userData.id;
          setUserId(userData.id); // Update the state for future use
        }
      }
      
      if (!currentUserId) return;
      
      const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      // Filter entries for this user
      const userEntries = allEntries.filter(entry => 
        entry.user_id === currentUserId || entry.user_id === undefined
      );
      
      if (userEntries.length === 0) return;
      
      // Prepare entries for Supabase (ensure all required fields are present)
      const formattedEntries = userEntries.map(entry => ({
        id: parseInt(entry.id),
        user_id: currentUserId,
        title: entry.title,
        description: entry.description || null,
        mood: entry.mood || 'normal',
        symptoms: entry.symptoms || null,
        created_at: entry.created_at,
        updated_at: entry.updated_at || null
      }));
      
      // Use upsert to handle both inserts and updates
      const { error } = await supabase
        .from('diary_entries')
        .upsert(formattedEntries);
      
      if (error) {
        console.error('Error syncing entries to Supabase:', error);
      }
    } catch (error) {
      console.error('Error in syncAsyncStorageToSupabase:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#4A67E3" barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('HomeScreen')}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Medical Diary</Text>
          
        </View>
        
        {renderDateSelector()}
        
        {/* All Medications Section */}
        <View style={styles.medicationsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Medications</Text>
            <Text style={styles.sectionSubtitle}>
              {confirmedMedications.length + pendingMedications.length} medication(s)
            </Text>
          </View>
          
          {loadingMedications || loadingPendingMedications ? (
            <View style={styles.loadingMedicationsContainer}>
              <ActivityIndicator size="small" color="#6A8DFD" />
              <Text style={styles.loadingMedicationsText}>Loading medications...</Text>
            </View>
          ) : confirmedMedications.length > 0 || pendingMedications.length > 0 ? (
            <FlatList
              data={[...confirmedMedications, ...pendingMedications]}
              renderItem={(props) => renderMedication({...props, type: 'all'})}
              keyExtractor={(item) => `med-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.medicationsList}
            />
          ) : (
            <View style={styles.emptyMedications}>
              <Ionicons name="document-text-outline" size={24} color="#6A8DFD" />
              <Text style={styles.emptyMedicationsText}>
                No medications for this date
              </Text>
            </View>
          )}
        </View>

        <View style={styles.entriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.entriesCount}>
              {entries.length} note(s) for this day
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6A8DFD" />
            </View>
          ) : (
            <FlatList
              data={entries}
              renderItem={renderEntry}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="book-outline" size={70} color="#6A8DFD" />
                  <Text style={styles.emptyText}>
                    No notes for this date
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => {
                      setEditingEntry(null);
                      setNewEntry({
                        title: '',
                        description: '',
                        mood: 'normal',
                        symptoms: '',
                      });
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.emptyButtonText}>Add note</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>

        {/* Botão flutuante */}
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => {
            setEditingEntry(null);
            setNewEntry({
              title: '',
              description: '',
              mood: 'normal',
              symptoms: '',
            });
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>

        {/* Medication Details Modal */}
        <Modal
          visible={medicationDetailsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMedicationDetailsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Medication Details
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setMedicationDetailsModalVisible(false)}
                >
                  <Ionicons name="close" size={26} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedMedication && (
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Medication Name</Text>
                    <Text style={styles.detailsValue}>{selectedMedication.nome_medicamento || 'Unknown'}</Text>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Status</Text>
                    <View style={[
                      styles.statusBadge,
                      selectedMedication.status === 'taken' || selectedMedication.taken === true
                        ? styles.takenBadge
                        : selectedMedication.status === 'skipped'
                          ? styles.skippedBadge
                          : styles.pendingBadge
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {selectedMedication.status === 'taken' || selectedMedication.taken === true
                          ? 'TAKEN'
                          : selectedMedication.status === 'skipped'
                            ? 'SKIPPED'
                            : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {selectedMedication.scheduled_time && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Scheduled Time</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(selectedMedication.scheduled_time).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {selectedMedication.confirmation_time && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Confirmation Time</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(selectedMedication.confirmation_time).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {selectedMedication.dosage && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Dosage</Text>
                      <Text style={styles.detailsValue}>{selectedMedication.dosage}</Text>
                    </View>
                  )}

                  {selectedMedication.notes && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Notes</Text>
                      <Text style={styles.detailsValue}>{selectedMedication.notes}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal de entrada do diário */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingEntry ? 'Edit Note' : 'New Note'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={26} color="#666" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Date: {selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>

              <ScrollView style={styles.modalScroll}>
                <TextInput
                  style={styles.input}
                  placeholder="Title"
                  value={newEntry.title}
                  onChangeText={(text) => setNewEntry({ ...newEntry, title: text })}
                />

                <View style={styles.moodSelector}>
                  <Text style={styles.moodLabel}>How are you feeling?</Text>
                  <View style={styles.moodButtons}>
                    <TouchableOpacity
                      style={[
                        styles.moodButton,
                        newEntry.mood === 'good' && styles.moodButtonSelected,
                      ]}
                      onPress={() => setNewEntry({ ...newEntry, mood: 'good' })}
                    >
                      <Ionicons name="happy" size={32} color={newEntry.mood === 'good' ? '#FFF' : '#4CAF50'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.moodButton,
                        newEntry.mood === 'normal' && styles.moodButtonSelected,
                      ]}
                      onPress={() => setNewEntry({ ...newEntry, mood: 'normal' })}
                    >
                      <Ionicons name="happy-outline" size={32} color={newEntry.mood === 'normal' ? '#FFF' : '#FFC107'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.moodButton,
                        newEntry.mood === 'bad' && styles.moodButtonSelected,
                      ]}
                      onPress={() => setNewEntry({ ...newEntry, mood: 'bad' })}
                    >
                      <Ionicons name="sad" size={32} color={newEntry.mood === 'bad' ? '#FFF' : '#F44336'} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Symptoms (optional)"
                  value={newEntry.symptoms}
                  onChangeText={(text) => setNewEntry({ ...newEntry, symptoms: text })}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (optional)"
                  value={newEntry.description}
                  onChangeText={(text) => setNewEntry({ ...newEntry, description: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </ScrollView>

              <TouchableOpacity
                style={styles.saveButtonFull}
                onPress={handleSaveEntry}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#4A67E3' },
  container: { flex: 1, backgroundColor: '#F8F9FF' },
  header: { 
    backgroundColor: '#4A67E3', 
    padding: 20, 
    paddingTop: Platform.OS === 'android' ? 16 : 10, 
    paddingBottom: 25, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFF', 
    letterSpacing: 0.5, 
    textAlign: 'center',
    flex: 1
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 10
  },
  headerRight: { 
    width: 40 
  },
  dateContainer: { marginHorizontal: 20, marginTop: 20 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF', borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  todayButton: { backgroundColor: '#6A8DFD' },
  todayText: { color: '#FFF', fontWeight: 'bold' },
  dateContextText: { textAlign: 'center', color: '#666', marginTop: 10, marginBottom: 5, fontSize: 14, fontStyle: 'italic' },
  dateArrow: { padding: 10, backgroundColor: '#F0F3FF', borderRadius: 15 },
  dateButton: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 15, backgroundColor: '#F0F3FF', paddingHorizontal: 15, flex: 1, marginHorizontal: 10, justifyContent: 'center' },
  dateText: { fontSize: 16, fontWeight: '500', color: '#444', textAlign: 'center' },
  calendarIcon: { marginLeft: 8 },
  medicationsContainer: { marginTop: 20, marginHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionSubtitle: { fontSize: 14, color: '#6A8DFD' },
  entriesCount: { fontSize: 14, color: '#6A8DFD', fontWeight: '500' },
  medicationsList: { paddingVertical: 10 },
  medicationCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 15, 
    marginRight: 15, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2, 
    borderWidth: 1, 
    borderColor: '#F0F3FF', 
    width: 180,
    minHeight: 150,
  },
  medicationCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  medicationCardStatus: { fontSize: 14, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  medicationCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4, flex: 1 },
  medicationCardDosage: { fontSize: 14, color: '#888' },
  medicationCardTime: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  medicationCardTimeText: { fontSize: 12, color: '#888', marginLeft: 8 },
  medicationCardNotes: { fontSize: 14, color: '#888', marginTop: 4 },
  entriesSection: { flex: 1, marginTop: 20, marginHorizontal: 20 },
  listContent: { paddingVertical: 10, paddingBottom: 100 },
  entryCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, borderWidth: 1, borderColor: '#F0F3FF' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  moodIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  entryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  entryTime: { fontSize: 12, color: '#888', marginTop: 2 },
  entryDescription: { fontSize: 16, color: '#444', lineHeight: 22 },
  entryActions: { flexDirection: 'row', gap: 16 },
  editButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F3FF', justifyContent: 'center', alignItems: 'center' },
  deleteButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  symptomsContainer: { backgroundColor: '#F8F9FF', padding: 12, borderRadius: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#6A8DFD' },
  symptomsLabel: { fontSize: 14, fontWeight: 'bold', color: '#6A8DFD', marginBottom: 6 },
  symptomsText: { fontSize: 16, color: '#444' },
  nextMedContainer: { marginHorizontal: 20, marginTop: 16, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 16, padding: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, borderLeftWidth: 4, borderLeftColor: '#4A67E3' },
  nextMedContent: { flexDirection: 'row', alignItems: 'center' },
  nextMedIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4A67E3', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  nextMedInfo: { flex: 1 },
  nextMedTitle: { fontSize: 12, color: '#888' },
  nextMedName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginVertical: 2 },
  nextMedTime: { fontSize: 14, color: '#4A67E3', fontWeight: '500' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 15, maxHeight: '92%' },
  modalHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 6 },
  modalSubtitle: { fontSize: 16, color: '#6A8DFD', marginBottom: 20 },
  modalScroll: { maxHeight: 450 },
  input: { backgroundColor: '#F5F6FA', borderRadius: 16, padding: 16, marginBottom: 18, fontSize: 16, borderWidth: 1, borderColor: '#E8ECF4' },
  textArea: { height: 120, textAlignVertical: 'top' },
  moodSelector: { marginBottom: 20, backgroundColor: '#F5F6FA', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E8ECF4' },
  moodLabel: { fontSize: 16, color: '#444', marginBottom: 14, fontWeight: '500', textAlign: 'center' },
  moodButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  moodButton: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E8ECF4', backgroundColor: '#FFF' },
  moodButtonSelected: { backgroundColor: '#4A67E3', borderColor: '#4A67E3' },
  saveButtonFull: { backgroundColor: '#4A67E3', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', padding: 24, marginTop: 50 },
  emptyText: { fontSize: 18, color: '#888', textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 24 },
  emptyButton: { backgroundColor: '#4A67E3', paddingHorizontal: 30, paddingVertical: 16, borderRadius: 18, elevation: 3 },
  emptyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  medicationItemTaken: { borderColor: '#D0F0C0', borderWidth: 1, backgroundColor: '#F0FFF0' },
  medicationIconTaken: { backgroundColor: '#4CAF50' },
  medicationItemMissed: { borderColor: '#FFE0E0', borderWidth: 1, backgroundColor: '#FFF0F0' },
  medicationIconMissed: { backgroundColor: '#FF4842' },
  takenText: { color: '#4CAF50', fontSize: 12, fontWeight: '500', marginTop: 4 },
  missedText: { color: '#FF4842', fontSize: 12, fontWeight: '500', marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  loadingMedicationsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: '#FFF', borderRadius: 16, marginVertical: 10 },
  loadingMedicationsText: { marginLeft: 10, fontSize: 14, color: '#666' },
  emptyMedications: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginVertical: 10, borderWidth: 1, borderColor: '#F0F3FF', borderStyle: 'dashed' },
  emptyMedicationsText: { fontSize: 14, color: '#888', marginLeft: 10 },
  medicationMoreIcon: { marginLeft: 8, width: 20, alignItems: 'center', justifyContent: 'center' },
  detailsSection: { marginBottom: 16, backgroundColor: '#F8FAFF', padding: 16, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#6A8DFD' },
  detailsLabel: { fontSize: 14, color: '#6A8DFD', fontWeight: 'bold', marginBottom: 6 },
  detailsValue: { fontSize: 16, color: '#333' },
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginTop: 4 },
  takenBadge: { backgroundColor: '#E6F4EA' },
  missedBadge: { backgroundColor: '#FEEAE6' },
  statusBadgeText: { fontWeight: 'bold', fontSize: 14 },
  floatingButton: { position: 'absolute', right: 25, bottom: 30, width: 65, height: 65, borderRadius: 35, backgroundColor: '#4A67E3', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, zIndex: 999 },
  titleTimeContainer: { flex: 1 },
  skippedBadge: { backgroundColor: '#fcf3e7' },
  pendingBadge: { backgroundColor: '#f0f3ff' },
});


export default MedicalDiaryScreen;