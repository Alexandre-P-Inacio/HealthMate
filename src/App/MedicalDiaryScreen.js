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
import DataUser from '../../navigation/DataUser';
import supabase from '../../supabase'; // Import supabase client

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

  useEffect(() => {
    // Load user data when component mounts
    fetchEntriesByDate(selectedDate);
    fetchMedicationsForDate(selectedDate);
    fetchConfirmedMedications(selectedDate);
  }, [selectedDate, userId]);

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
      
      const medications = JSON.parse(storedMeds);
      const selectedDateStr = date.toISOString().split('T')[0];
      
      // Filter medications by date AND user ID
      const medsForDate = medications.filter(med => {
        const medDate = new Date(med.nextDose).toISOString().split('T')[0];
        return medDate === selectedDateStr && 
               (med.user_id === userId || med.user_id === undefined); // Include legacy records
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
      
      // 2. Then fetch from Supabase
      let supabaseEntries = [];
      if (userId) {
        const startOfDay = new Date(formattedDate);
        const endOfDay = new Date(formattedDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        
        const { data, error } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());
        
        if (error) {
          console.error('Error fetching from Supabase:', error);
        } else {
          supabaseEntries = data || [];
        }
      }
      
      // 3. Filter AsyncStorage entries by date AND user ID (for legacy entries)
      const filteredAsyncEntries = asyncStorageEntries.filter(entry => {
        const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
        return entryDate === formattedDate && 
               (entry.user_id === userId || entry.user_id === undefined); // Include legacy records
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

  // Improved function to fetch confirmed medications from Supabase
  const fetchConfirmedMedications = async (date) => {
    try {
      setLoadingMedications(true);
      
      if (!userId) {
        setLoadingMedications(false);
        return;
      }

      // Format date to ISO string (YYYY-MM-DD)
      const formattedDate = date.toISOString().split('T')[0];
      
      
      // Modified query to fix relationship error - separating the queries
      const { data: confirmations, error: confirmError } = await supabase
        .from('medication_confirmations')
        .select('*')
        .eq('confirmation_date', formattedDate)
        .eq('user_id', userId)
        .not('confirmation_time', 'is', null);
      
      if (confirmError) {
        console.error('Error fetching from medication_confirmations:', confirmError);
        
        // Fallback to pills_warning table (old approach)
        const { data: oldData, error } = await supabase
          .from('pills_warning')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'in', ['taken', 'missed']);
        
        if (error) throw error;
        
        // Filter those matching the selected date - handling potential missing confirmation_date
        const filteredData = oldData?.filter(med => {
          try {
            // Check if status date matches
            if (med.data_status_update) {
              const medDate = med.data_status_update.split('T')[0];
              return medDate === formattedDate;
            }
            return false;
          } catch (err) {
            console.warn(`Error filtering medication date: ${err.message}`);
            return false;
          }
        }) || [];
        
        setConfirmedMedications(filteredData);
      } else {
        // We need to fetch medication details separately to avoid the relationship error
        const processedData = [];
        
        if (confirmations && confirmations.length > 0) {
          // Get all pill_ids from confirmations
          const medIds = confirmations.map(conf => conf.pill_id);
          
          // Fetch medication details
          const { data: medicationsData, error: medError } = await supabase
            .from('pills_warning')
            .select('id, nome_medicamento, dosage')
            .in('id', medIds);
          
          if (!medError && medicationsData) {
            // Create a map for quick lookup
            const medMap = {};
            medicationsData.forEach(med => {
              medMap[med.id] = med;
            });
            
            // Process confirmations with medication details
            for (const item of confirmations) {
              const med = medMap[item.pill_id];
              processedData.push({
                id: item.id,
                pill_id: item.pill_id,
                nome_medicamento: med?.nome_medicamento || 'Unknown Medication',
                dosage: med?.dosage || 'Standard dose',
                scheduled_time: item.scheduled_time,
                confirmation_date: item.confirmation_date,
                confirmation_time: item.confirmation_time,
                taken: item.taken,
                notes: item.notes,
                // Ensure backward compatibility
                status: item.taken ? 'taken' : 'missed'
              });
            }
          } else {
            console.error('Error fetching medication details:', medError);
            // Still use the confirmations data without medication details
            for (const item of confirmations) {
              processedData.push({
                id: item.id,
                pill_id: item.pill_id,
                nome_medicamento: 'Unknown Medication',
                dosage: 'Standard dose',
                scheduled_time: item.scheduled_time,
                confirmation_date: item.confirmation_date,
                confirmation_time: item.confirmation_time,
                taken: item.taken,
                notes: item.notes,
                status: item.taken ? 'taken' : 'missed'
              });
            }
          }
        }
        
        setConfirmedMedications(processedData);
      }
    } catch (error) {
      console.error('Error fetching confirmed medications:', error);
      Alert.alert('Error', 'Failed to load confirmed medications');
      setConfirmedMedications([]);
    } finally {
      setLoadingMedications(false);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
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

      if (!userId) {
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
          user_id: userId,
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
        const { error } = await supabase
          .from('diary_entries')
          .upsert({
            id: parseInt(editingEntry.id), // Supabase expects numeric id
            user_id: userId,
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
          user_id: userId,
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
        const { error } = await supabase
          .from('diary_entries')
          .insert({
            id: parseInt(newId), // Supabase expects numeric id
            user_id: userId,
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
      
      // 2. Delete from Supabase if userId exists
      if (userId) {
        const { error } = await supabase
          .from('diary_entries')
          .delete()
          .eq('id', parseInt(entryId)) // Supabase expects numeric id
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error deleting entry from Supabase:', error);
        }
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

  // Modified renderMedication function to handle confirmed medications with touch action
  const renderMedication = ({ item, type }) => {
    // Handle rendering for confirmed medications from Supabase
    if (type === 'confirmed') {
      // Handle potential date format issues
      let formattedTime;
      try {
        // First try to format the scheduled_time
        formattedTime = new Date(item.scheduled_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        // If the result is 'Invalid Date', try with confirmation_time
        if (formattedTime === 'Invalid Date' && item.confirmation_time) {
          formattedTime = new Date(item.confirmation_time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        }
      } catch (error) {
        console.error('Error formatting medication time:', error);
        formattedTime = 'Time unavailable';
      }
      
      // Determine if the medication was taken
      const isTaken = item.taken === true || item.status === 'taken';
      
      return (
        <TouchableOpacity 
          style={[
            styles.medicationItem,
            isTaken ? styles.medicationItemTaken : styles.medicationItemMissed
          ]}
          onPress={() => showMedicationDetails(item)}
        >
          <View style={[
            styles.medicationIcon,
            isTaken ? styles.medicationIconTaken : styles.medicationIconMissed
          ]}>
            <Ionicons name={isTaken ? "checkmark" : "close"} size={20} color="#FFF" />
          </View>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{item.nome_medicamento || 'Unknown Medication'}</Text>
            <Text style={styles.medicationDetails}>
              {item.dosage || 'Standard dose'} • {formattedTime}
            </Text>
            <Text style={[
              styles.statusText,
              isTaken ? styles.takenText : styles.missedText
            ]}>
              {isTaken ? 'TAKEN' : 'MISSED'}
            </Text>
          </View>
          <View style={styles.medicationMoreIcon}>
            <Ionicons name="information-circle-outline" size={16} color="#999" />
          </View>
        </TouchableOpacity>
      );
    }
    
    // Original rendering for scheduled medications
    const doseTime = new Date(item.nextDose);
    const formattedTime = doseTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const now = new Date();
    const isPastDue = now > doseTime;
    const isUpcoming = doseTime > now && (doseTime - now) < 2 * 60 * 60 * 1000; // Next 2 hours

    return (
      <View style={[
        styles.medicationItem, 
        isPastDue && styles.medicationItemPastDue,
        isUpcoming && styles.medicationItemUpcoming
      ]}>
        <View style={[
          styles.medicationIcon, 
          isPastDue && styles.medicationIconPastDue,
          isUpcoming && styles.medicationIconUpcoming
        ]}>
          <Ionicons name="medkit" size={20} color="#FFF" />
        </View>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{item.name}</Text>
          <Text style={styles.medicationDetails}>
            {item.dosage} • {formattedTime}
          </Text>
          {isPastDue && (
            <Text style={styles.pastDueText}>OVERDUE</Text>
          )}
          {isUpcoming && (
            <Text style={styles.upcomingText}>UPCOMING</Text>
          )}
        </View>
      </View>
    );
  };

  // Add a function to sync all AsyncStorage entries to Supabase
  // This can be called when the component mounts
  const syncAsyncStorageToSupabase = async () => {
    try {
      if (!userId) return;
      
      const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      // Filter entries for this user
      const userEntries = allEntries.filter(entry => 
        entry.user_id === userId || entry.user_id === undefined
      );
      
      if (userEntries.length === 0) return;
      
      // Prepare entries for Supabase (ensure all required fields are present)
      const formattedEntries = userEntries.map(entry => ({
        id: parseInt(entry.id),
        user_id: userId,
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
        
        {/* Confirmed Medications Section */}
        <View style={styles.medicationsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Taken Medications</Text>
            <Text style={styles.sectionSubtitle}>
              {confirmedMedications.length} confirmed medication(s)
            </Text>
          </View>
          
          {loadingMedications ? (
            <View style={styles.loadingMedicationsContainer}>
              <ActivityIndicator size="small" color="#6A8DFD" />
              <Text style={styles.loadingMedicationsText}>Loading medications...</Text>
            </View>
          ) : confirmedMedications.length > 0 ? (
            <FlatList
              data={confirmedMedications}
              renderItem={(props) => renderMedication({...props, type: 'confirmed'})}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.medicationsList}
            />
          ) : (
            <View style={styles.emptyMedications}>
              <Ionicons name="document-text-outline" size={24} color="#6A8DFD" />
              <Text style={styles.emptyMedicationsText}>
                No confirmed medications for this date
              </Text>
            </View>
          )}
        </View>
        
        {/* Scheduled Medications Section */}
        {dailyMedications.length > 0 && (
          <View style={styles.medicationsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scheduled Medications</Text>
              <Text style={styles.sectionSubtitle}>
                {dailyMedications.length} medication(s) for this day
              </Text>
            </View>
            <FlatList
              data={dailyMedications}
              renderItem={(props) => renderMedication({...props, type: 'scheduled'})}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.medicationsList}
            />
          </View>
        )}

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
                        : styles.missedBadge
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {selectedMedication.status === 'taken' || selectedMedication.taken === true
                          ? 'TAKEN'
                          : 'MISSED'}
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
  header: { backgroundColor: '#4A67E3', padding: 20, paddingTop: Platform.OS === 'android' ? 16 : 10, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', letterSpacing: 0.5, textAlign: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerRight: { width: 40 },
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
  medicationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginRight: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, borderWidth: 1, borderColor: '#F0F3FF', minWidth: 200 },
  medicationIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4A67E3', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  medicationInfo: { flex: 1 },
  medicationName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  medicationDetails: { fontSize: 14, color: '#888' },
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
});


export default MedicalDiaryScreen;