import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  SafeAreaView,
  Dimensions,
  Linking,
  Animated,
  LogBox
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import HealthConnectService from '../../services/HealthConnectTypeScript';
import { useFocusEffect } from '@react-navigation/native';
// 1. Importando o módulo react-native-health-connect (mais estável)
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
  openHealthConnectSettings,
} from 'react-native-health-connect';
import SamsungHealthService from '../../services/SamsungHealthService';
import BalancaDigitalService from '../../services/BalancaDigitalService';
import WearablesService from '../../services/WearablesService';

// Suppress specific warnings that don't affect functionality
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component',
  'Warning: Text strings must be rendered within a <Text> component'
]);

const { width } = Dimensions.get('window');

const STORAGE_KEY = 'medicalDiaryEntries';
const MEDS_STORAGE_KEY = 'medicationSchedule';

const MedicalDiaryScreen = ({ navigation }) => {
  const [entries, setEntries] = useState([]);
  const [dailyMedications, setDailyMedications] = useState([]);
  const [confirmedMedications, setConfirmedMedications] = useState([]);
  const [pendingMedications, setPendingMedications] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    description: '',
    mood: 'normal',
    symptoms: '',
    dailyNotes: '',
  });
  const [loading, setLoading] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [loadingPendingMedications, setLoadingPendingMedications] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [medicationDetailsModalVisible, setMedicationDetailsModalVisible] = useState(false);
  
  // Health Connect states
  const [isLoadingHealthData, setIsLoadingHealthData] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [healthResponses, setHealthResponses] = useState(null);
  const [allHealthData, setAllHealthData] = useState(null);
  const [loadingAllHealthData, setLoadingAllHealthData] = useState(false);
  const [healthDataError, setHealthDataError] = useState(null);
  const [healthConnectModalVisible, setHealthConnectModalVisible] = useState(false);
  const [showSavedDataModal, setShowSavedDataModal] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(null);
  
  // IMC Calculator states
  const [imcModalVisible, setImcModalVisible] = useState(false);
  const [userAge, setUserAge] = useState('');
  const [fatMassKg, setFatMassKg] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [imcResults, setImcResults] = useState(null);

  // Helper function to check if selected date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function to format date for comparison
  const formatDateForComparison = (date) => {
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    const loadUserData = () => {
      try {
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          setUserId(userData.id);
        } else {
            supabase.auth.getSession().then(({ data }) => {
              if (data?.session?.user?.id) {
                setUserId(data.session.user.id);
              }
            });
          }
        }
      catch (error) {
        console.error('Error getting user data:', error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (userId) {
    fetchEntriesByDate(selectedDate);
    fetchConfirmedMedications(selectedDate);
    fetchPendingMedications(selectedDate);
    }
  }, [selectedDate, userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchEntriesByDate(selectedDate);
        fetchConfirmedMedications(selectedDate);
        fetchPendingMedications(selectedDate);
      }
    }, [navigation, userId, selectedDate])
  );

  const fetchConfirmedMedications = async (date) => {
    try {
      setLoadingMedications(true);
      const formattedDate = date.toISOString().split('T')[0];
      console.log('🔍 [Diary] Fetching confirmed medications for:', formattedDate, 'userId:', userId);
      
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select(`
          *,
          pills_warning:pill_id (
            id,
            titulo,
            nome_medicamento:titulo
          )
        `)
        .eq('user_id', userId)
        .eq('scheduled_date', formattedDate)
        .not('status', 'eq', 'pending');
        
      console.log('🔍 [Diary] Confirmed medications query result:', { data, error });
      
      if (error) throw error;
      
      // Processar dados para incluir nome do medicamento
      const processedData = (data || []).map(item => ({
        ...item,
        nome_medicamento: item.pills_warning?.titulo || item.pills_warning?.nome_medicamento || 'Medicamento Desconhecido'
      }));
      
      setConfirmedMedications(processedData);
    } catch (error) {
      console.error('❌ [Diary] Error fetching confirmed medications:', error);
      Alert.alert('Error', 'Failed to load confirmed medications');
      setConfirmedMedications([]);
    } finally {
      setLoadingMedications(false);
    }
  };

  const fetchPendingMedications = async (date) => {
    try {
      setLoadingPendingMedications(true);
      const formattedDate = date.toISOString().split('T')[0];
      console.log('🔍 [Diary] Fetching pending medications for:', formattedDate, 'userId:', userId);
      
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select(`
          *,
          pills_warning:pill_id (
            id,
            titulo,
            nome_medicamento:titulo
          )
        `)
        .eq('user_id', userId)
        .eq('scheduled_date', formattedDate)
        .eq('status', 'pending');
        
      console.log('🔍 [Diary] Pending medications query result:', { data, error });
      
      if (error) throw error;
      
      // Processar dados para incluir nome do medicamento
      const processedData = (data || []).map(item => ({
        ...item,
        nome_medicamento: item.pills_warning?.titulo || item.pills_warning?.nome_medicamento || 'Medicamento Desconhecido'
      }));
      
      setPendingMedications(processedData);
    } catch (error) {
      console.error('❌ [Diary] Error fetching pending medications:', error);
      Alert.alert('Error', 'Failed to load pending medications');
      setPendingMedications([]);
    } finally {
      setLoadingPendingMedications(false);
    }
  };

  const fetchEntriesByDate = async (date) => {
    try {
      setLoading(true);
      const formattedDate = date.toISOString().split('T')[0];
      
      const startOfDay = new Date(formattedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(formattedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());
      
      if (error) {
        console.error('Error fetching from Supabase:', error);
        const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
        const asyncStorageEntries = storedEntries ? JSON.parse(storedEntries) : [];
      const filteredAsyncEntries = asyncStorageEntries.filter(entry => {
        const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
          return entryDate === formattedDate && (entry.user_id === userId || entry.user_id === undefined);
      });
        setEntries(filteredAsyncEntries);
      } else {
        const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
        const asyncStorageEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      const entryMap = new Map();
      
        data.forEach(entry => {
        entryMap.set(entry.id.toString(), entry);
      });
      
        asyncStorageEntries.filter(entry => entry.user_id === userId || entry.user_id === undefined).forEach(entry => {
        if (!entryMap.has(entry.id.toString())) {
          entryMap.set(entry.id.toString(), entry);
        }
      });
      
      setEntries(Array.from(entryMap.values()));
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      Alert.alert('Error', 'Could not load the diary.');
    } finally {
      setLoading(false);
    }
  };

  // Função temporária para debug de medicamentos
  const debugMedicationData = async () => {
    try {
      console.log('🔍 [Debug] Testing medication data in database...');
      console.log('🔍 [Debug] Current userId:', userId);
      
      // Verificar se existem dados na tabela medication_schedule_times
      const { data: allMeds, error: allMedsError } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .limit(10);
      
      console.log('🔍 [Debug] All medications in table (first 10):', allMeds);
      console.log('🔍 [Debug] Error fetching all medications:', allMedsError);
      
      // Verificar medicamentos do utilizador específico
      if (userId) {
        const { data: userMeds, error: userMedsError } = await supabase
          .from('medication_schedule_times')
          .select('*')
          .eq('user_id', userId);
        
        console.log('🔍 [Debug] User medications for userId', userId, ':', userMeds);
        console.log('🔍 [Debug] Error fetching user medications:', userMedsError);
      }
      
      // Verificar se há medicamentos na tabela pills_warning
      const { data: pillsData, error: pillsError } = await supabase
        .from('pills_warning')
        .select('*')
        .limit(5);
        
      console.log('🔍 [Debug] Pills warning data:', pillsData);
      console.log('🔍 [Debug] Pills warning error:', pillsError);
      
      // Criar dados de teste se não existirem
      if (userId && (!userMeds || userMeds.length === 0)) {
        await createTestMedications();
      }
      
    } catch (error) {
      console.error('❌ [Debug] Error in debug function:', error);
    }
  };

  // Função para criar medicamentos de teste
  const createTestMedications = async () => {
    try {
      console.log('🔧 [Debug] Creating test medications...');
      
      // Primeiro criar entrada na pills_warning
      const { data: pillData, error: pillError } = await supabase
        .from('pills_warning')
        .insert({
          user_id: userId,
          titulo: 'Paracetamol 500mg',
          quantidade_comprimidos: 30,
          quantidade_comprimidos_por_vez: 1,
          intervalo_horas: 8,
          horario_fixo: '08:00',
          data_inicio: new Date().toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();
      
      if (pillError) {
        console.error('❌ [Debug] Error creating test pill:', pillError);
        return;
      }
      
      console.log('✅ [Debug] Test pill created:', pillData);
      
      // Agora criar horários na medication_schedule_times
      const today = new Date();
      const testSchedules = [
        {
          scheduled_date: today.toISOString().split('T')[0],
          scheduled_time: '08:00:00',
          complete_datetime: new Date(today.toISOString().split('T')[0] + 'T08:00:00').toISOString(),
          dosage: '1 comprimido',
          user_id: userId,
          pill_id: pillData.id,
          status: 'pending',
          notes: 'Medicamento de teste - manhã'
        },
        {
          scheduled_date: today.toISOString().split('T')[0],
          scheduled_time: '16:00:00',
          complete_datetime: new Date(today.toISOString().split('T')[0] + 'T16:00:00').toISOString(),
          dosage: '1 comprimido',
          user_id: userId,
          pill_id: pillData.id,
          status: 'pending',
          notes: 'Medicamento de teste - tarde'
        }
      ];
      
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('medication_schedule_times')
        .insert(testSchedules)
        .select();
      
      if (scheduleError) {
        console.error('❌ [Debug] Error creating test schedules:', scheduleError);
      } else {
        console.log('✅ [Debug] Test schedules created:', scheduleData);
        Alert.alert('Sucesso', 'Medicamentos de teste criados! Recarregue a página para ver.');
      }
      
    } catch (error) {
      console.error('❌ [Debug] Error creating test medications:', error);
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
      
      let entryDataToSave;
      const commonFields = {
        title: newEntry.title,
        description: newEntry.description,
        mood: newEntry.mood,
        symptoms: newEntry.symptoms,
        daily_notes: newEntry.dailyNotes,
      };

        if (editingEntry) {
        entryDataToSave = {
          id: parseInt(editingEntry.id),
          ...commonFields,
          updated_at: new Date().toISOString()
        };
          const { error } = await supabase
            .from('diary_entries')
          .update(entryDataToSave)
          .eq('id', entryDataToSave.id);
        
        if (error) {
          console.error('Error updating entry in Supabase:', error);
          Alert.alert('Error', `Could not update the entry: ${error.message}`);
          return;
        }

        const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
        const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
        const updatedAsyncEntries = allEntries.map(entry => {
          if (entry.id === editingEntry.id) {
            return { ...entry, ...entryDataToSave, user_id: userId };
          }
          return entry;
        });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAsyncEntries));

        } else {
        const newId = Date.now().toString();
        entryDataToSave = {
          id: parseInt(newId),
              user_id: userId,
          ...commonFields,
              created_at: entryDate.toISOString(),
        };
        
        const { error } = await supabase
          .from('diary_entries')
          .insert([entryDataToSave]);
        
        if (error) {
          console.error('Error inserting entry in Supabase:', error);
          Alert.alert('Error', `Could not save the entry: ${error.message}`);
          return;
        }

        const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
        const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
        const updatedAsyncEntries = [...allEntries, { ...entryDataToSave, id: newId }];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAsyncEntries));
      }

      setNewEntry({
        title: '',
        description: '',
        mood: 'normal',
        symptoms: '',
        dailyNotes: '',
      });
      setEditingEntry(null);
        setModalVisible(false);
        fetchEntriesByDate(selectedDate);
      Alert.alert('Success', `Note ${editingEntry ? 'updated' : 'added'} successfully!`);

    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', `Could not save the entry: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
                const { error } = await supabase
                  .from('diary_entries')
                  .delete()
        .eq('id', parseInt(entryId));
      
      if (error) {
        console.error('Error deleting entry from Supabase:', error);
        Alert.alert('Error', `Could not delete the entry: ${error.message}`);
        return;
      }

      const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      const updatedEntries = allEntries.filter(entry => entry.id !== entryId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));

      fetchEntriesByDate(selectedDate);
      Alert.alert('Success', 'Note deleted successfully!');
            } catch (error) {
              console.error('Error deleting entry:', error);
      Alert.alert('Error', 'Could not delete the entry.');
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setNewEntry({
      title: entry.title,
      description: entry.description,
      mood: entry.mood,
      symptoms: entry.symptoms,
      dailyNotes: entry.daily_notes || '',
    });
    setModalVisible(true);
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

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed') {
      return;
    }
    if (date) {
      setSelectedDate(date);
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
            <View style={[styles.moodIconContainer, { backgroundColor: moodIcon.color }]}>
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
        {item.daily_notes && (
          <View style={styles.dailyNotesContainer}>
            <Text style={styles.dailyNotesLabel}>Daily Notes:</Text>
            <Text style={styles.dailyNotesText}>{item.daily_notes}</Text>
          </View>
        )}
      </View>
    );
  };

  const showMedicationDetails = (medication) => {
    setSelectedMedication(medication);
    setMedicationDetailsModalVisible(true);
  };

  // 2. Async function to fetch ALL REAL Health Connect data
  const fetchAllHealthConnectData = async () => {
    try {
            console.log('🏥 [Health Connect] Starting REAL search with react-native-health-connect...');
  
      // Check if Android (Health Connect only works on Android)
      if (Platform.OS !== 'android') {
        throw new Error('Health Connect is only available on Android');
      }

      // PRIMEIRO: Verificar status do SDK
      const sdkStatus = await getSdkStatus();
      console.log('📱 [Health Connect] SDK Status:', sdkStatus);
      
      if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        throw new Error('Health Connect is not available. Install Health Connect from Google Play Store.');
      }

      // SECOND: Initialize Health Connect with MULTIPLE ATTEMPTS
      console.log('🔄 [Health Connect] Initializing...');
      const initialized = await initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Health Connect');
      }

      // WAIT to ensure complete initialization
      console.log('⏱️ [Health Connect] Waiting for complete initialization...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // THIRD: Request permissions AGGRESSIVELY to FORCE appearance
      console.log('🔐 [Health Connect] FORCING appearance in Health Connect...');
      
      const permissions = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'BloodPressure' },
        { accessType: 'read', recordType: 'Hydration' },
      ];

              // MULTIPLE ATTEMPTS to force appearance
      let grantedPermissions = [];
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && (!grantedPermissions || grantedPermissions.length === 0)) {
        attempts++;
                  console.log(`🎯 [Health Connect] Attempt ${attempts}/${maxAttempts} - Forcing registration...`);
        
        try {
          grantedPermissions = await requestPermission(permissions);
                      console.log(`✅ [Health Connect] Attempt ${attempts} - Permissions:`, grantedPermissions);
          
          if (grantedPermissions && grantedPermissions.length > 0) {
            break; // Sucesso!
          }
          
          // Se não conseguiu, aguardar antes da próxima tentativa
          if (attempts < maxAttempts) {
            console.log(`⏳ [Health Connect] Waiting ${attempts * 1000}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));
          }
        } catch (permError) {
          console.log(`⚠️ [Health Connect] Error in attempt ${attempts}:`, permError.message);
          if (attempts === maxAttempts) {
            throw permError;
          }
        }
      }

              console.log('🏁 [Health Connect] Final permissions:', grantedPermissions);
        
        if (!grantedPermissions || grantedPermissions.length === 0) {
          // Open settings automatically
          console.log('🔧 [Health Connect] Opening settings - app should appear now...');
          await openHealthConnectSettings();
          throw new Error('No permissions granted after multiple attempts. Health Connect settings have been opened. HealthMate should appear in the list now - configure permissions and try again.');
        }

      // QUARTO: Definir intervalo de tempo
      const now = new Date();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const timeRangeFilter = {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      };

              console.log('📅 [Health Connect] Fetching data between:', startOfDay.toLocaleDateString(), 'and', now.toLocaleTimeString());

      // QUINTO: Buscar dados usando react-native-health-connect
      const results = {};

      // Buscar passos
      try {
        const stepsData = await readRecords('Steps', { timeRangeFilter });
        results.steps = stepsData && stepsData.length > 0 ? {
          value: stepsData.reduce((total, record) => total + (record.count || 0), 0)
        } : null;
        console.log('🚶 Passos encontrados:', results.steps?.value || 'Nenhum');
    } catch (error) {
        console.log('⚠️ Erro ao buscar passos:', error.message);
        results.steps = null;
      }

      // Buscar calorias
      try {
        const caloriesData = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
        results.calories = caloriesData && caloriesData.length > 0 ? {
          value: caloriesData.reduce((total, record) => total + (record.energy?.inCalories || 0), 0)
        } : null;
        console.log('🔥 Calorias encontradas:', results.calories?.value || 'Nenhuma');
      } catch (error) {
        console.log('⚠️ Erro ao buscar calorias:', error.message);
        results.calories = null;
      }

      // Buscar frequência cardíaca
      try {
        const heartRateData = await readRecords('HeartRate', { timeRangeFilter });
        results.heartRate = heartRateData && heartRateData.length > 0 ? 
          heartRateData.map(record => ({ value: record.beatsPerMinute })) : [];
        console.log('❤️ Freq. cardíaca encontrada:', results.heartRate.length, 'registros');
      } catch (error) {
        console.log('⚠️ Erro ao buscar frequência cardíaca:', error.message);
        results.heartRate = [];
      }

      // Buscar peso
      try {
        const weightData = await readRecords('Weight', { timeRangeFilter });
        results.weight = weightData && weightData.length > 0 ? 
          weightData.map(record => ({ value: record.weight?.inKilograms })) : [];
        console.log('⚖️ Peso encontrado:', results.weight.length, 'registros');
      } catch (error) {
        console.log('⚠️ Erro ao buscar peso:', error.message);
        results.weight = [];
      }

      // Buscar distância
      try {
        const distanceData = await readRecords('Distance', { timeRangeFilter });
        results.distance = distanceData && distanceData.length > 0 ? {
          value: distanceData.reduce((total, record) => total + (record.distance?.inMeters || 0), 0)
        } : null;
        console.log('🗺️ Distância encontrada:', results.distance?.value || 'Nenhuma');
      } catch (error) {
        console.log('⚠️ Erro ao buscar distância:', error.message);
        results.distance = null;
      }

      // Buscar pressão arterial
      try {
        const bloodPressureData = await readRecords('BloodPressure', { timeRangeFilter });
        results.bloodPressure = bloodPressureData && bloodPressureData.length > 0 ? 
          bloodPressureData.map(record => ({ 
            systolic: record.systolic?.inMillimetersOfMercury,
            diastolic: record.diastolic?.inMillimetersOfMercury
          })) : [];
        console.log('💪 Pressão arterial encontrada:', results.bloodPressure.length, 'registros');
      } catch (error) {
        console.log('⚠️ Erro ao buscar pressão arterial:', error.message);
        results.bloodPressure = [];
      }

      // Buscar hidratação
      try {
        const hydrationData = await readRecords('Hydration', { timeRangeFilter });
        results.hydration = hydrationData && hydrationData.length > 0 ? {
          value: hydrationData.reduce((total, record) => total + (record.volume?.inMilliliters || 0), 0)
        } : null;
        console.log('💧 Hidratação encontrada:', results.hydration?.value || 'Nenhuma');
      } catch (error) {
        console.log('⚠️ Erro ao buscar hidratação:', error.message);
        results.hydration = null;
      }

      // Buscar sono
      try {
        const sleepData = await readRecords('SleepSession', { timeRangeFilter });
        results.sleep = sleepData && sleepData.length > 0 ? 
          sleepData.map(record => ({ 
            duration: new Date(record.endTime) - new Date(record.startTime)
          })) : [];
        console.log('😴 Sono encontrado:', results.sleep.length, 'registros');
      } catch (error) {
        console.log('⚠️ Erro ao buscar sono:', error.message);
        results.sleep = [];
      }

      console.log('✅ [Health Connect] Busca REAL concluída com sucesso!');

      // Retornar dados REAIS
      return {
        ...results,
        fetchedAt: now.toISOString(),
        date: startOfDay.toLocaleDateString('pt-BR'),
      };

    } catch (error) {
      console.error('❌ [Health Connect] Erro ao buscar dados REAIS:', error);
      throw error;
    }
  };

  // 3. Handler para mostrar todos os dados do Health Connect  
  const handleShowHealthData = async () => {
    setLoadingAllHealthData(true);
    setHealthDataError(null);
    
    try {
      console.log('🔍 [Health Connect] Iniciando busca de todos os dados...');
      const data = await fetchAllHealthConnectData();
      setAllHealthData(data);
      setHealthConnectModalVisible(true);
      console.log('📊 [Health Connect] Dados obtidos e modal aberto');
    } catch (error) {
      console.error('❌ [Health Connect] Erro no handler:', error);
      setHealthDataError(error.message);
      
      // Se o erro for de permissões, dar instruções específicas
      if (error.message.includes('permiss')) {
        Alert.alert(
          '🔧 Configuration Required',
          `HealthMate does not yet appear in the Health Connect list.\n\n📋 FOLLOW THESE STEPS:\n\n1️⃣ Health Connect settings have been opened\n2️⃣ If "HealthMate" does NOT appear in the list:\n   • Close Health Connect\n   • Open HealthMate again\n   • Click "View Complete Data" again\n\n3️⃣ When it appears in the list:\n   • Tap "HealthMate"\n   • Grant ALL permissions\n   • Return to the app and try again`,
          [
            { text: 'Open Health Connect', onPress: () => openHealthConnectSettings() },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          '❌ Health Connect Error',
          `${error.message}\n\nCheck:\n• Health Connect is installed\n• App was restarted after installation`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoadingAllHealthData(false);
    }
  };

  const renderMedication = ({ item }) => {
    let backgroundColor, statusText, statusColor, statusIcon;
    
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
    } else if (item.status === 'jumped') {
      backgroundColor = '#ffeaea';
      statusText = 'Jumped';
      statusColor = '#e74c3c';
      statusIcon = 'arrow-undo';
    } else {
      backgroundColor = '#f0f3ff';
      statusText = 'Pending';
      statusColor = '#f39c12';
      statusIcon = 'time-outline';
    }
    
    const timeString = item.scheduled_time 
      ? item.scheduled_time.substring(0, 5) // Extrair HH:MM do formato time
      : '';
        
    return (
      <TouchableOpacity 
        style={[styles.medicationCard, { backgroundColor: backgroundColor }]}
        onPress={() => showMedicationDetails(item)}
      >
        <View style={styles.medicationCardHeader}>
          <Ionicons name={statusIcon} size={16} color={statusColor} />
          <Text style={[styles.medicationCardStatus, { color: statusColor }]}> 
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

    const handleConnectDigitalScale = async () => {
    if (!isToday(selectedDate)) {
      Alert.alert(
        'Action Available Only for Today',
        'Digital scale data search is only available for the current date.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoadingHealthData(true);
    try {
      console.log('🔵 Buscando dados de composição corporal...');
      const [weightRes, bodyFatRes, boneMassRes, bmrRes] = await Promise.all([
        HealthConnectService.getWeightData(7),
        HealthConnectService.getBodyFatData(7),
        HealthConnectService.getBoneMassData(7),
        HealthConnectService.getBasalMetabolicRateData(7)
      ]);
      console.log('[Balança Digital] Peso:', weightRes);
      console.log('[Balança Digital] Gordura corporal:', bodyFatRes);
      console.log('[Balança Digital] Massa óssea:', boneMassRes);
      console.log('[Balança Digital] Taxa metabólica basal:', bmrRes);
      
      setHealthData({
        type: 'bodycomp',
        weight: weightRes.latest?.weight?.inKilograms ?? null,
        bodyFat: bodyFatRes.latest?.percentage ?? null,
        boneMass: boneMassRes.latest?.mass?.inKilograms ?? null,
        bmr: bmrRes.latest?.basalMetabolicRate?.inKilocaloriesPerDay ?? null,
        timestamp: new Date().toISOString(),
        source: 'Health Connect',
        allReadings: {
          weight: weightRes.data,
          bodyFat: bodyFatRes.data,
          boneMass: boneMassRes.data,
          bmr: bmrRes.data
        }
      });
      
      Alert.alert(
        '✅ Digital Scale Data!',
        `📊 Body composition data successfully obtained from Health Connect!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erro geral:', error);
      Alert.alert(
        '❌ Digital Scale Error',
        `Unexpected error: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingHealthData(false);
    }
  };

    

    const handleConnectHealthConnect = async () => {
    if (!isToday(selectedDate)) {
      Alert.alert(
        'Ação Disponível Apenas para Hoje',
        'A busca de dados dos wearables só está disponível para a data atual.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoadingHealthData(true);
    try {
      console.log('🔵 Buscando dados do Samsung Health (Wearable)...');
      const result = await SamsungHealthService.getRawHealthDataForDisplay();
      console.log('[Wearable] Dados buscados:', result.summary);
      if (result.success && result.totalRecords > 0) {
        setHealthData({
          type: 'wearable',
          heartRate: result.summary.heartRate ?? null,
          steps: result.summary.steps ?? null,
          calories: result.summary.calories ?? null,
          distance: result.summary.distance ?? null,
          bloodOxygen: result.summary.oxygen ?? null,
          sleepData: { duration: result.summary.sleep ?? null },
          timestamp: new Date().toISOString(),
          source: 'Samsung Health',
        });
        Alert.alert(
          '✅ Dados do Wearable!',
          `📊 Dados do Samsung Health obtidos com sucesso!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '❌ Nenhum dado encontrado',
          'Nenhum dado do Samsung Health foi encontrado para hoje.\nAbra o app Samsung Health, sincronize e tente novamente.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Erro geral:', error);
      Alert.alert(
        '❌ Erro ao buscar dados',
        `Erro inesperado: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingHealthData(false);
    }
  };

  const handleSaveWearableDataToDiary = async () => {
    try {
      if (!healthData) {
        Alert.alert('Erro', 'Nenhum dado disponível para salvar.');
        return;
      }

      if (!isToday(selectedDate)) {
        Alert.alert(
          'Ação Disponível Apenas para Hoje',
          'O salvamento de dados só está disponível para a data atual.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Save to the appropriate database table based on data type
      if (healthData.type === 'bodycomp') {
        // Save body composition data
        const bodyCompositionData = {
          weight: healthData.weight || null,
          bodyFat: healthData.bodyFat || null,
          boneMass: healthData.boneMass || null,
          bmr: healthData.bmr || null,
          leanBodyMass: healthData.leanBodyMass || null,
          bodyWaterMass: healthData.bodyWaterMass || null,
          source: healthData.source || 'Health Connect'
        };
        
        console.log('📊 Saving body composition data:', bodyCompositionData);
        await BalancaDigitalService.saveBodyCompositionData(bodyCompositionData);
        
        Alert.alert(
          '✅ Dados Salvos!',
          'Dados da balança digital salvos com sucesso no banco de dados!',
          [{ text: 'OK' }]
        );
      } else if (healthData.type === 'wearable') {
        // Save wearables data
        const vitalsData = {
          heartRate: healthData.heartRate || null,
          steps: healthData.steps || null,
          calories: healthData.calories || null,
          distance: healthData.distance || null,
          bloodOxygen: healthData.bloodOxygen || null,
          bodyTemperature: healthData.bodyTemperature || null,
          bloodPressure: healthData.bloodPressure || null,
          sleepData: healthData.sleepData || null,
          stressLevel: healthData.stressLevel || null,
          source: healthData.source || 'Samsung Health'
        };
        
        console.log('📱 Saving wearables data:', vitalsData);
        await WearablesService.saveVitalsData(vitalsData);
        
        Alert.alert(
          '✅ Dados Salvos!',
          'Dados dos wearables salvos com sucesso no banco de dados!',
          [{ text: 'OK' }]
        );
      }

      // Clear the displayed data after saving
      setHealthData(null);
    } catch (error) {
      console.error('❌ Error saving health data:', error);
      
      // More detailed error message
      let errorMessage = 'Erro desconhecido';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Erro do banco de dados (${error.code}): ${error.details || error.hint || 'Verifique a conexão'}`;
      }
      
      Alert.alert('Erro ao Salvar', `Não foi possível salvar os dados:\n${errorMessage}`);
    }
  };

  const handleRequestHealthPermissions = async () => {
    try {
      const result = await HealthConnectService.requestHealthPermissions();
      if (result.success) {
        Alert.alert('Permissões concedidas', `Permissões concedidas: ${result.granted.join(', ')}`);
      } else {
        Alert.alert('Permissões não concedidas', result.error || 'Erro desconhecido');
      }
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro desconhecido ao solicitar permissões');
    }
  };

  const handleCalculateIMC = () => {
    if (!healthData || !healthData.weight || healthData.type !== 'bodycomp') {
      Alert.alert(
        'Dados Necessários',
        'Primeiro busque os dados da balança digital para obter o peso e composição corporal.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isToday(selectedDate)) {
      Alert.alert(
        'Ação Disponível Apenas para Hoje',
        'O cálculo de IMC só está disponível para a data atual.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Calculate directly with available data
    calculateIMCWithAvailableData();
    setImcModalVisible(true);
  };

  const calculateIMCWithAvailableData = () => {
    const weight = healthData.weight; // em kg
    const bodyFatPercentage = healthData.bodyFat; // em %
    const boneMass = healthData.boneMass; // em kg
    const bmr = healthData.bmr; // kcal/dia

    // Using a standard height (you can modify this)
    const height = 1.70; // metros - ALTURA PADRÃO
    
    // Calculate IMC
    const imc = weight / (height * height);
    
    // Calculate fat mass from percentage
    const fatMassFromPercentage = bodyFatPercentage ? (weight * bodyFatPercentage / 100) : null;
    
    // Calculate lean mass (weight - fat mass)
    const leanMass = fatMassFromPercentage ? weight - fatMassFromPercentage : null;
    
    // IMC Classification
    let imcClassification = '';
    let imcColor = '';
    if (imc < 18.5) {
      imcClassification = 'Abaixo do peso';
      imcColor = '#3498DB';
    } else if (imc < 25) {
      imcClassification = 'Peso normal';
      imcColor = '#27AE60';
    } else if (imc < 30) {
      imcClassification = 'Sobrepeso';
      imcColor = '#F39C12';
    } else {
      imcClassification = 'Obesidade';
      imcColor = '#E74C3C';
    }

    const results = {
      imc: imc.toFixed(1),
      imcClassification,
      imcColor,
      weight: weight.toFixed(1),
      height,
      bodyFatPercentage: bodyFatPercentage?.toFixed(1),
      fatMassKg: fatMassFromPercentage?.toFixed(1),
      leanMass: leanMass?.toFixed(1),
      boneMass: boneMass?.toFixed(2),
      bmrFromDevice: bmr?.toFixed(0),
      // Calculate body fat ratio
      fatRatio: fatMassFromPercentage ? ((fatMassFromPercentage / weight) * 100).toFixed(1) : null,
      // Calculate lean mass ratio
      leanRatio: leanMass ? ((leanMass / weight) * 100).toFixed(1) : null
    };

    setImcResults(results);
    console.log('📊 [IMC] Resultados com dados disponíveis:', results);
  };













  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#6A8DFD' }}>
      <StatusBar backgroundColor="#6A8DFD" barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: '#F5F6FA' }}>
        <View style={{ backgroundColor: '#6A8DFD', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
          <TouchableOpacity 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', flex: 1, textAlign: 'center' }}>Medical Diary</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
        {renderDateSelector()}
        
        <View style={styles.quickActionsContainer}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {/* Botão temporário para debug de medicamentos */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E74C3C' }]}
            onPress={debugMedicationData}
          >
            <Ionicons name="bug-outline" size={28} color="#FFF" />
            <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Fix Medications</Text>
            <Text style={[styles.actionButtonSubtext, { color: '#FFF' }]}>Create test data</Text>
          </TouchableOpacity>
          
          <View style={styles.quickActionsGrid}>
        <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      (isLoadingHealthData || !isToday(selectedDate)) && styles.actionButtonDisabled
                    ]}
              onPress={handleConnectDigitalScale}
                    disabled={isLoadingHealthData || !isToday(selectedDate)}
        >
          {isLoadingHealthData ? (
                      <ActivityIndicator size="small" color="#4A67E3" />
                    ) : (
              <FontAwesome5 name="weight" size={28} color="#4A67E3" />
                    )}
                    <Text style={styles.actionButtonText}>
                      {isLoadingHealthData ? 'Searching...' : 'Digital Scale'}
                    </Text>
                    <Text style={styles.actionButtonSubtext}>Health Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      (isLoadingHealthData || !isToday(selectedDate)) && styles.actionButtonDisabled
                    ]}
              onPress={handleConnectHealthConnect}
                    disabled={isLoadingHealthData || !isToday(selectedDate)}
        >
          {isLoadingHealthData ? (
                      <ActivityIndicator size="small" color="#4A67E3" />
          ) : (
              <View style={styles.actionButtonContent}>
              <Ionicons 
                          name="fitness-outline"
                  size={30} 
                          color="#4A67E3"
                />
                  </View>
                )}
                                        <Text style={styles.actionButtonText}>
                      {isLoadingHealthData ? 'Searching...' : 'Wearables'}
              </Text>
                    <Text style={styles.actionButtonSubtext}>
                      {!isToday(selectedDate) ? 'Today only' : 'Health Connect'}
                    </Text>
        </TouchableOpacity>

        {/* Novo botão para salvar no diário */}
        <TouchableOpacity
          style={[
            styles.actionButton, 
            (!healthData || !isToday(selectedDate)) && styles.actionButtonDisabled
          ]}
          onPress={handleSaveWearableDataToDiary}
          disabled={!healthData || !isToday(selectedDate)}
        >
          <Ionicons name="save-outline" size={28} color="#4A67E3" />
          <Text style={styles.actionButtonText}>Save to Diary</Text>
          <Text style={styles.actionButtonSubtext}>
            {!isToday(selectedDate) ? 'Today only' : 'Record data'}
          </Text>
        </TouchableOpacity>

        {/* Novo botão para calcular IMC */}
        <TouchableOpacity
          style={[
            styles.actionButton, 
            (!healthData || !healthData.weight || healthData.type !== 'bodycomp' || !isToday(selectedDate)) && styles.actionButtonDisabled
          ]}
          onPress={handleCalculateIMC}
          disabled={!healthData || !healthData.weight || healthData.type !== 'bodycomp' || !isToday(selectedDate)}
        >
          <Ionicons name="calculator-outline" size={28} color="#4A67E3" />
          <Text style={styles.actionButtonText}>Calculate BMI</Text>
          <Text style={styles.actionButtonSubtext}>
            {!isToday(selectedDate) ? 'Today only' : 'Body analysis'}
          </Text>
        </TouchableOpacity>

            {/* 3. Novo botão "Ver Dados do Health Connect" */}
        {/* REMOVIDO: Botão Ver Dados Completos */}

          </View>
      </View>
      
        {/* Health Data Display Section - Now positioned first and full width */}
        {healthData && (
          <View style={styles.medicationsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {healthData.type === 'weight' ? 'Dados de Peso' : 
                 healthData.type === 'bodycomp' ? 'Dados da Balança Digital' : 
                 'Dados de Saúde por Categoria'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {healthData.type === 'weight' 
                  ? `${new Date(healthData.timestamp).toLocaleString()}`
                  : healthData.type === 'bodycomp'
                  ? `${new Date(healthData.timestamp).toLocaleString()}`
                  : `${healthData.availableCategories?.length || 0} categorias encontradas • Todas as apps`
                }
              </Text>
            </View>
            
            {healthData.type === 'weight' ? (
              <View style={styles.weightDataCard}>
                <View style={styles.weightDataHeader}>
                  <FontAwesome5 name="weight" size={24} color="#4A67E3" />
                  <Text style={styles.weightDataTitle}>Peso Atual</Text>
                </View>
                <Text style={styles.weightDataValue}>{healthData.weight} kg</Text>
                <Text style={styles.weightDataTime}>
                  Registrado em {new Date(healthData.timestamp).toLocaleString()}
                </Text>
                {healthData.allReadings && healthData.allReadings.length > 1 && (
                  <Text style={styles.weightDataExtra}>
                    Total de {healthData.allReadings.length} registros hoje
                  </Text>
                )}
              </View>
            ) : healthData.type === 'bodycomp' ? (
              // Show body composition data for bodycomp type (Balança Digital)
              <View style={styles.wearableDataGrid}>
                {healthData.weight && (
                  <View style={styles.healthDataCard}>
                    <FontAwesome5 name="weight" size={20} color="#3498DB" />
                    <Text style={styles.healthDataLabel}>Peso</Text>
                    <Text style={styles.healthDataValue}>{healthData.weight.toFixed(1)} kg</Text>
                  </View>
                )}
                
                {healthData.bodyFat && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="body" size={20} color="#E74C3C" />
                    <Text style={styles.healthDataLabel}>Gordura Corporal</Text>
                    <Text style={styles.healthDataValue}>{healthData.bodyFat.toFixed(1)}%</Text>
                  </View>
                )}
                
                {healthData.boneMass && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="medical" size={20} color="#95A5A6" />
                    <Text style={styles.healthDataLabel}>Massa Óssea</Text>
                    <Text style={styles.healthDataValue}>{healthData.boneMass.toFixed(2)} kg</Text>
                  </View>
                )}
                
                {healthData.bmr && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="flame" size={20} color="#E67E22" />
                    <Text style={styles.healthDataLabel}>Taxa Metabólica</Text>
                    <Text style={styles.healthDataValue}>{Math.round(healthData.bmr)} kcal/dia</Text>
                  </View>
                )}
              </View>
            ) : (
              // Show wearables data for general health data (Wearables button)
              <View style={styles.wearableDataGrid}>
                {healthData.heartRate && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="heart" size={20} color="#E74C3C" />
                    <Text style={styles.healthDataLabel}>Freq. Cardíaca</Text>
                    <Text style={styles.healthDataValue}>{healthData.heartRate} bpm</Text>
                  </View>
                )}
                
                {healthData.steps && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="walk" size={20} color="#3498DB" />
                    <Text style={styles.healthDataLabel}>Passos</Text>
                    <Text style={styles.healthDataValue}>{healthData.steps.toLocaleString()}</Text>
                  </View>
                )}
                
                {healthData.calories && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="flame" size={20} color="#E67E22" />
                    <Text style={styles.healthDataLabel}>Calorias</Text>
                    <Text style={styles.healthDataValue}>{healthData.calories}</Text>
                  </View>
                )}
                
                {healthData.distance && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="map" size={20} color="#27AE60" />
                    <Text style={styles.healthDataLabel}>Distância</Text>
                    <Text style={styles.healthDataValue}>{healthData.distance} km</Text>
                  </View>
                )}
                
                {healthData.bloodOxygen && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="water" size={20} color="#9B59B6" />
                    <Text style={styles.healthDataLabel}>SpO2</Text>
                    <Text style={styles.healthDataValue}>{healthData.bloodOxygen}%</Text>
                  </View>
                )}
                
                {healthData.bodyTemperature && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="thermometer" size={20} color="#FF6B6B" />
                    <Text style={styles.healthDataLabel}>Temperatura</Text>
                    <Text style={styles.healthDataValue}>{healthData.bodyTemperature}°C</Text>
                  </View>
                )}
                
                {healthData.bloodPressure && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="fitness" size={20} color="#E91E63" />
                    <Text style={styles.healthDataLabel}>Pressão</Text>
                    <Text style={styles.healthDataValue}>
                      {healthData.bloodPressure.systolic}/{healthData.bloodPressure.diastolic}
                    </Text>
                  </View>
                )}

                {healthData.sleepData && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="moon" size={20} color="#8B5A3C" />
                    <Text style={styles.healthDataLabel}>Sono</Text>
                    <Text style={styles.healthDataValue}>{healthData.sleepData.duration}h</Text>
                  </View>
                )}
                
                {healthData.stressLevel !== undefined && (
                  <View style={styles.healthDataCard}>
                    <Ionicons name="pulse" size={20} color="#FF9800" />
                    <Text style={styles.healthDataLabel}>Stress</Text>
                    <Text style={styles.healthDataValue}>{healthData.stressLevel}/100</Text>
                  </View>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={styles.clearHealthDataButton}
              onPress={() => setHealthData(null)}
            >
              <Ionicons name="close-circle" size={16} color="#666" />
              <Text style={styles.clearHealthDataText}>Limpar Dados</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Medications Section - Now positioned after health data */}
        <View style={styles.medicationsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Todas as Medicações</Text>
            <Text style={styles.sectionSubtitle}>
              {confirmedMedications.length + pendingMedications.length} medicação(ões)
              {healthData && healthData.source && ` • Fonte: ${healthData.source}`}
            </Text>
          </View>
          
          {loadingMedications || loadingPendingMedications ? (
            <View style={styles.loadingStateContainer}>
              <ActivityIndicator size="small" color="#6A8DFD" />
              <Text style={styles.loadingStateText}>Carregando medicações...</Text>
            </View>
          ) : confirmedMedications.length > 0 || pendingMedications.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.medicationsList}
            >
              {[...confirmedMedications, ...pendingMedications].map((item) => (
                <View key={`med-${item.id}`}>
                  {renderMedication({ item })}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="medical-outline" size={36} color="#6A8DFD" />
              <Text style={styles.emptyStateText}>Nenhuma medicação para esta data.</Text>
              <TouchableOpacity
                style={[styles.addNoteButton, { marginTop: 10 }]}
                onPress={() => navigation.navigate('MedicationTracker')}
              >
                <Ionicons name="add-circle-outline" size={24} color="#FFF" />
                <Text style={styles.addNoteButtonText}>Adicionar Medicamento</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Minhas Anotações</Text>
          <Text style={styles.sectionSubtitle}>
            {entries.length} anotação(ões) para este dia
          </Text>
        </View>
      </View>
    )}
    ListEmptyComponent={() => (
      loading ? (
        <View style={styles.loadingStateContainer}>
          <ActivityIndicator size="large" color="#6A8DFD" />
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="document-text-outline" size={36} color="#6A8DFD" />
          <Text style={styles.emptyStateText}>Nenhuma anotação para esta data.</Text>
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => {
              setEditingEntry(null);
              setNewEntry({
                title: '',
                description: '',
                mood: 'normal',
                symptoms: '',
                dailyNotes: '',
              });
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.addNoteButtonText}>Adicionar Anotação</Text>
          </TouchableOpacity>
        </View>
      )
    )}
  />

          <TouchableOpacity 
          style={styles.floatingAddButton}
            onPress={() => {
            setEditingEntry(null);
            setNewEntry({
              title: '',
              description: '',
              mood: 'normal',
              symptoms: '',
              dailyNotes: '',
            });
              setModalVisible(true);
            }}
          >
          <Ionicons name="add" size={30} color="#FFF" />
          </TouchableOpacity>

        {/* 4. Modal para exibir todos os dados do Health Connect */}
        <Modal
          visible={healthConnectModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setHealthConnectModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📊 Dados do Health Connect</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setHealthConnectModalVisible(false)}
                >
                  <Ionicons name="close" size={26} color="#666" />
                </TouchableOpacity>
              </View>

              {allHealthData && (
                <Text style={styles.modalSubtitle}>
                  Data: {allHealthData.date} • Atualizado em: {new Date(allHealthData.fetchedAt).toLocaleTimeString()}
                      </Text>
              )}

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {healthDataError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={32} color="#E74C3C" />
                    <Text style={styles.errorText}>Erro: {healthDataError}</Text>
                      </View>
                ) : allHealthData ? (
                  <View style={styles.healthDataContainer}>
                    {/* Passos */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <Ionicons name="walk" size={24} color="#3498DB" />
            </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Passos</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.steps?.value ? allHealthData.steps.value.toLocaleString() : 'Sem dados'}
                        </Text>
                      </View>
                    </View>

                    {/* Calorias */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <Ionicons name="flame" size={24} color="#E67E22" />
                      </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Calorias</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.calories?.value ? `${Math.round(allHealthData.calories.value)} kcal` : 'Sem dados'}
            </Text>
                      </View>
          </View>

                    {/* Frequência Cardíaca */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <Ionicons name="heart" size={24} color="#E74C3C" />
                    </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Frequência Cardíaca</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.heartRate?.length > 0 ? `${allHealthData.heartRate[allHealthData.heartRate.length - 1]?.value || '--'} bpm` : 'Sem dados'}
                        </Text>
                    </View>
                    </View>

                    {/* Distância */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <Ionicons name="map" size={24} color="#27AE60" />
                    </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Distância</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.distance?.value ? `${(allHealthData.distance.value / 1000).toFixed(2)} km` : 'Sem dados'}
                        </Text>
                    </View>
                    </View>

                    {/* Peso */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <FontAwesome5 name="weight" size={20} color="#9B59B6" />
                    </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Peso</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.weight?.length > 0 ? `${allHealthData.weight[allHealthData.weight.length - 1]?.value || '--'} kg` : 'Sem dados'}
                        </Text>
                    </View>
                    </View>

                    {/* Pressão Arterial */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <Ionicons name="fitness" size={24} color="#E91E63" />
                </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Pressão Arterial</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.bloodPressure?.length > 0 ? 
                            `${allHealthData.bloodPressure[allHealthData.bloodPressure.length - 1]?.systolic || '--'}/${allHealthData.bloodPressure[allHealthData.bloodPressure.length - 1]?.diastolic || '--'} mmHg` 
                            : 'Sem dados'}
                        </Text>
                  </View>
              </View>

                    {/* Hidratação */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <Ionicons name="water" size={24} color="#3498DB" />
                    </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Hidratação</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.hydration?.value ? `${(allHealthData.hydration.value / 1000).toFixed(1)} L` : 'Sem dados'}
                        </Text>
                    </View>
                    </View>

                    {/* Sono */}
                    <View style={styles.healthDataItem}>
                      <View style={styles.healthDataIcon}>
                        <Ionicons name="moon" size={24} color="#8B5A3C" />
                    </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataLabel}>Sono</Text>
                        <Text style={styles.healthDataValue}>
                          {allHealthData.sleep?.length > 0 ? 
                            `${((allHealthData.sleep[allHealthData.sleep.length - 1]?.duration || 0) / 3600000).toFixed(1)}h` 
                            : 'Sem dados'}
                        </Text>
                    </View>
                    </View>

                    {/* Informação sobre fontes */}
                    <View style={styles.sourcesInfo}>
                      <Text style={styles.sourcesInfoText}>
                        💡 Dados obtidos do Health Connect. Para ter mais informações, conecte apps como Samsung Health, Google Fit ou seu smartwatch ao Health Connect.
                      </Text>
                    </View>

                    {/* Botão para atualizar dados */}
                    <TouchableOpacity
                      style={[styles.refreshDataButton, loadingAllHealthData && styles.refreshDataButtonDisabled]}
                      onPress={handleShowHealthData}
                      disabled={loadingAllHealthData}
                    >
                      {loadingAllHealthData ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Ionicons name="refresh" size={20} color="#FFF" />
                      )}
                      <Text style={styles.refreshDataButtonText}>
                        {loadingAllHealthData ? 'Atualizando...' : 'Atualizar Dados'}
                      </Text>
                    </TouchableOpacity>
                    </View>
                ) : (
                  <View style={styles.noDataContainer}>
                    <Ionicons name="analytics-outline" size={48} color="#BDC3C7" />
                    <Text style={styles.noDataText}>Nenhum dado disponível</Text>
                    <Text style={styles.noDataSubtext}>
                      Clique no botão "Ver Dados Completos" para buscar informações do Health Connect
                    </Text>
                    </View>
                  )}
              </ScrollView>
                    </View>
                </View>
        </Modal>

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
                <Text style={styles.modalTitle}>Detalhes da Medicação</Text>
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
                    <Text style={styles.detailsLabel}>Nome da Medicação</Text>
                    <Text style={styles.detailsValue}>{selectedMedication.nome_medicamento || 'Desconhecido'}</Text>
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
                          ? 'TOMADA'
                          : selectedMedication.status === 'skipped'
                            ? 'PULADA'
                            : 'PENDENTE'}
                      </Text>
                    </View>
                    </View>

                  {selectedMedication.scheduled_time && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Horário Agendado</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(`2000-01-01T${selectedMedication.scheduled_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}

                  {selectedMedication.confirmation_time && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Horário de Confirmação</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(selectedMedication.confirmation_time).toLocaleString()}
                      </Text>
              </View>
            )}

                  {selectedMedication.dosage && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Dosagem</Text>
                      <Text style={styles.detailsValue}>{selectedMedication.dosage}</Text>
              </View>
            )}

                  {selectedMedication.notes && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Notas</Text>
                      <Text style={styles.detailsValue}>{selectedMedication.notes}</Text>
              </View>
            )}
          </ScrollView>
              )}
        </View>
      </View>
    </Modal>

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
                  {editingEntry ? 'Editar Anotação' : 'Nova Anotação'}
                </Text>
            <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
            >
                  <Ionicons name="close" size={26} color="#666" />
            </TouchableOpacity>
          </View>

              <Text style={styles.modalSubtitle}>
                Data: {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>

              <ScrollView style={styles.modalScroll}>
              <TextInput
                  style={styles.input}
                  placeholder="Título da Anotação"
                  value={newEntry.title}
                  onChangeText={(text) => setNewEntry({ ...newEntry, title: text })}
                />

                <View style={styles.moodSelector}>
                  <Text style={styles.moodLabel}>Como você está se sentindo?</Text>
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
                  placeholder="Sintomas (opcional)"
                  value={newEntry.symptoms}
                  onChangeText={(text) => setNewEntry({ ...newEntry, symptoms: text })}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrição detalhada da anotação (opcional)"
                  value={newEntry.description}
                  onChangeText={(text) => setNewEntry({ ...newEntry, description: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Adicione detalhes sobre alimentação, água, exercícios, etc. (opcional)"
                  value={newEntry.dailyNotes}
                  onChangeText={(text) => setNewEntry({ ...newEntry, dailyNotes: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

              </ScrollView>
            
            <TouchableOpacity
                style={styles.saveButtonFull}
                onPress={handleSaveEntry}
            >
                <Text style={styles.buttonText}>Salvar Anotação</Text>
            </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <Modal visible={showSavedDataModal} transparent animationType="slide" onRequestClose={() => setShowSavedDataModal(false)}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 320, alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12 }}>Dados salvos no Diário</Text>
          {lastSavedData && (
            <>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>Passos: {lastSavedData.steps}</Text>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>FC: {lastSavedData.heart_rate} bpm</Text>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>Calorias: {lastSavedData.calories}</Text>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>O2: {lastSavedData.blood_oxygen}%</Text>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>Sono: {lastSavedData.sleep_hours}h</Text>
            </>
          )}
          <TouchableOpacity style={{ marginTop: 18, backgroundColor: '#6A8DFD', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 }} onPress={() => setShowSavedDataModal(false)}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Modal para Calculadora de IMC */}
    <Modal
      visible={imcModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setImcModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🧮 Calculadora de IMC</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setImcModalVisible(false)}
            >
              <Ionicons name="close" size={26} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {!imcResults ? (
              <View>
                <Text style={styles.modalSubtitle}>
                  Dados disponíveis da balança digital:
                </Text>
                
                <View style={styles.availableDataContainer}>
                  <Text style={styles.availableDataText}>
                    • Peso: {healthData?.weight?.toFixed(1)} kg
                  </Text>
                  <Text style={styles.availableDataText}>
                    • Gordura corporal: {healthData?.bodyFat?.toFixed(1)}%
                  </Text>
                  <Text style={styles.availableDataText}>
                    • Massa óssea: {healthData?.boneMass?.toFixed(2)} kg
                  </Text>
                  <Text style={styles.availableDataText}>
                    • Taxa metabólica: {healthData?.bmr?.toFixed(0)} kcal/dia
                  </Text>
                  <Text style={styles.availableDataText}>
                    • Altura assumida: 1.70m (padrão)
                  </Text>
                </View>

                <TouchableOpacity style={styles.calculateButton} onPress={calculateIMCWithAvailableData}>
                  <Ionicons name="calculator" size={20} color="#fff" />
                  <Text style={styles.calculateButtonText}>Calcular IMC e Análise</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resultsContainer}>
                <View style={[styles.imcCard, { borderLeftColor: imcResults.imcColor }]}>
                  <Text style={styles.imcValue}>{imcResults.imc}</Text>
                  <Text style={[styles.imcClassification, { color: imcResults.imcColor }]}>
                    {imcResults.imcClassification}
                  </Text>
                </View>

                <View style={styles.dataGrid}>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Peso</Text>
                    <Text style={styles.dataValue}>{imcResults.weight} kg</Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Gordura %</Text>
                    <Text style={styles.dataValue}>{imcResults.bodyFatPercentage}%</Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Massa Gorda</Text>
                    <Text style={styles.dataValue}>{imcResults.fatMassKg} kg</Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Massa Magra</Text>
                    <Text style={styles.dataValue}>{imcResults.leanMass} kg</Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Taxa Magra</Text>
                    <Text style={styles.dataValue}>{imcResults.leanRatio}%</Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Massa Óssea</Text>
                    <Text style={styles.dataValue}>{imcResults.boneMass} kg</Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Taxa Metabólica</Text>
                    <Text style={styles.dataValue}>{imcResults.bmrFromDevice} kcal</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.newCalculationButton} 
                  onPress={() => {
                    setImcResults(null);
                  }}
                >
                  <Ionicons name="refresh" size={18} color="#6A8DFD" />
                  <Text style={styles.newCalculationText}>Recalcular</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
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

  quickActionsContainer: {
    marginTop: 25,
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 15,
    gap: 15,
  },
  actionButton: {
    backgroundColor: '#F0F3FF',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: (width - 100) / 2,
    height: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonConnected: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  actionButtonContent: {
    position: 'relative',
    alignItems: 'center',
  },
  connectedIndicator: {
    position: 'absolute',
    top: -2,
    right: -8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  connectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    alignSelf: 'center',
    marginTop: 2,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A67E3',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtonSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6A8DFD',
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonTextConnected: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  connectionStatus: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },

  medicationsSection: { marginTop: 25, marginHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionSubtitle: { fontSize: 14, color: '#6A8DFD' },
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
    borderColor: '#E8ECF4',
    width: 160,
    minHeight: 150,
    justifyContent: 'space-between',
  },
  medicationCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  medicationCardStatus: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  medicationCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4, flex: 1 },
  medicationCardDosage: { fontSize: 14, color: '#888' },
  medicationCardTime: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  medicationCardTimeText: { fontSize: 12, color: '#888', marginLeft: 8 },
  medicationCardNotes: { fontSize: 14, color: '#888', marginTop: 4 },

  // Health Data Display Styles
  healthDataDisplaySection: {
    marginTop: 25,
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weightDataCard: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 15,
  },
  weightDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  weightDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A67E3',
    marginLeft: 10,
  },
  weightDataValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  weightDataTime: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  weightDataExtra: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  wearableDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 15,
  },
  healthDataCard: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF4',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  healthDataLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  healthDataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  clearHealthDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  clearHealthDataText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },

  notesSection: { flex: 1, marginTop: 25, marginHorizontal: 20, marginBottom: 100 },
  notesListContent: { paddingVertical: 10, paddingBottom: 20 },
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E8ECF4'
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  moodIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  entryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  entryTime: { fontSize: 12, color: '#888', marginTop: 2 },
  entryDescription: { fontSize: 16, color: '#444', lineHeight: 22, marginTop: 8 },
  entryActions: { flexDirection: 'row', gap: 16 },
  editButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F3FF', justifyContent: 'center', alignItems: 'center' },
  deleteButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  symptomsContainer: { backgroundColor: '#F8F9FF', padding: 12, borderRadius: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#6A8DFD' },
  symptomsLabel: { fontSize: 14, fontWeight: 'bold', color: '#6A8DFD', marginBottom: 6 },
  symptomsText: { fontSize: 16, color: '#444' },
  dailyNotesContainer: {
    backgroundColor: '#F0F3FF',
    padding: 12,
    borderRadius: 16,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4A67E3',
  },
  dailyNotesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A67E3',
    marginBottom: 6,
  },
  dailyNotesText: {
    fontSize: 16,
    color: '#444',
  },

  loadingStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  loadingStateText: { marginLeft: 10, fontSize: 14, color: '#666' },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    borderStyle: 'dashed',
  },
  emptyStateText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 10, marginBottom: 15, lineHeight: 22 },
  addNoteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A67E3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, elevation: 3 },
  addNoteButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },

  floatingAddButton: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A67E3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingTop: 15, maxHeight: '90%' },
  modalHandle: { width: 50, height: 5, backgroundColor: '#DDD', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', flex: 1 },
  modalHeaderButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpButton: { padding: 5 },
  closeButton: { padding: 5 },
  modalSubtitle: { fontSize: 16, color: '#6A8DFD', marginBottom: 15 },
  modalScroll: { maxHeight: Dimensions.get('window').height * 0.6 },
  input: { backgroundColor: '#F5F6FA', borderRadius: 12, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#E8ECF4' },
  textArea: { height: 100, textAlignVertical: 'top' },
  moodSelector: { marginBottom: 20, backgroundColor: '#F5F6FA', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E8ECF4' },
  moodLabel: { fontSize: 16, color: '#444', marginBottom: 14, fontWeight: '600', textAlign: 'center' },
  moodButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  moodButton: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E8ECF4', backgroundColor: '#FFF' },
  moodButtonSelected: { backgroundColor: '#4A67E3', borderColor: '#4A67E3' },
  saveButtonFull: { backgroundColor: '#4A67E3', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  detailsSection: { marginBottom: 16, backgroundColor: '#F8FAFF', padding: 16, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#6A8DFD' },
  detailsLabel: { fontSize: 14, color: '#6A8DFD', fontWeight: 'bold', marginBottom: 6 },
  detailsValue: { fontSize: 16, color: '#333' },
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginTop: 4 },
  takenBadge: { backgroundColor: '#E6F4EA' },
  missedBadge: { backgroundColor: '#FEEAE6' },
  statusBadgeText: { fontWeight: 'bold', fontSize: 14 },
  skippedBadge: { backgroundColor: '#fcf3e7' },
  pendingBadge: { backgroundColor: '#f0f3ff' },
  titleTimeContainer: { flex: 1 },

  // 5. Estilos para o modal de dados do Health Connect
  healthDataContainer: {
    backgroundColor: '#FFF',
  },
  healthDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6A8DFD',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  healthDataIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  healthDataInfo: {
    flex: 1,
  },
  healthDataLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  healthDataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    marginVertical: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    marginVertical: 16,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#BDC3C7',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  sourcesInfo: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  sourcesInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
    textAlign: 'center',
  },
  refreshDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A8DFD',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  refreshDataButtonDisabled: {
    opacity: 0.6,
  },
  refreshDataButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 16, color: '#444', marginBottom: 8 },
  inputField: { backgroundColor: '#F5F6FA', borderRadius: 12, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#E8ECF4' },
  inputHint: { fontSize: 12, color: '#888', marginTop: 4 },
  availableDataContainer: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6A8DFD',
  },
  availableDataText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
    lineHeight: 24,
  },
  calculateButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#6A8DFD', 
    borderRadius: 12, 
    padding: 15, 
    marginTop: 20 
  },
  calculateButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 8 
  },
  resultsContainer: { padding: 20 },
  imcCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 20, 
    marginBottom: 20, 
    borderLeftWidth: 5, 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imcValue: { fontSize: 36, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  imcClassification: { fontSize: 18, fontWeight: '600' },
  dataGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  dataCard: { 
    width: '48%', 
    padding: 12, 
    backgroundColor: '#F8F9FF', 
    borderRadius: 10, 
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  dataLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  dataValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  newCalculationButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#F0F3FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 15 
  },
  newCalculationText: { fontSize: 14, color: '#6A8DFD', marginLeft: 5, fontWeight: '600' },
});

export default MedicalDiaryScreen;
