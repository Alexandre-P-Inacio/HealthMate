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
  Animated
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import BluetoothWearableService from '../../services/BluetoothWearableService';
import BluetoothTroubleshooting from '../../services/BluetoothTroubleshooting';
import AndroidPermissionsGuide from '../../services/AndroidPermissionsGuide';
import AlternativeDataSources from '../../services/AlternativeDataSources';
import { useFocusEffect } from '@react-navigation/native';


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
  
  // Smartwatch Bluetooth states
  const [smartwatchModalVisible, setSmartwatchModalVisible] = useState(false);
  const [isGatheringData, setIsGatheringData] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const realTimeIntervalRef = useRef(null);
  const [savedHealthData, setSavedHealthData] = useState([]);
  const [loadingSavedData, setLoadingSavedData] = useState(false);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const [updateCount, setUpdateCount] = useState(0);

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
      fetchSavedHealthData(selectedDate);
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
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .eq('user_id', userId)
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

  const fetchPendingMedications = async (date) => {
    try {
      setLoadingPendingMedications(true);
      const formattedDate = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .eq('user_id', userId)
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

  const fetchSavedHealthData = async (date) => {
    try {
      setLoadingSavedData(true);
      const formattedDate = date.toISOString().split('T')[0];
      
      if (!userId) return;

      const { data, error } = await supabase
        .from('smartwatch_data')
        .select('*')
        .eq('user_id', userId)
        .gte('collected_at', `${formattedDate}T00:00:00.000Z`)
        .lt('collected_at', `${formattedDate}T23:59:59.999Z`)
        .order('collected_at', { ascending: false })
        .limit(10); // Limit to last 10 entries of the day

      if (error) {
        console.error('Error fetching saved health data:', error);
        return;
      }

      setSavedHealthData(data || []);
    } catch (error) {
      console.error('Error fetching saved health data:', error);
    } finally {
      setLoadingSavedData(false);
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

  const handleConnectDigitalScale = () => {
    Alert.alert('Conectar Balança Digital', 'Simulando conexão com Balança Digital. Implemente a API aqui!');
  };

  const handleConnectHealthConnect = async () => {
    setSmartwatchModalVisible(true);
    
    // Quick permission check when opening modal
    try {
      console.log('🔧 Quick permission check...');
      const permissionStatus = await BluetoothWearableService.checkPermissionStatus();
      
      if (!permissionStatus.allRequiredGranted) {
        console.log('⚠️ Some required permissions are missing:', permissionStatus.required);
        const missingRequired = Object.entries(permissionStatus.required || {})
          .filter(([_, granted]) => !granted)
          .map(([permission, _]) => permission.split('.').pop());
        console.log('❌ Missing required permissions:', missingRequired);
      } else {
        console.log('✅ All required permissions are granted');
      }
      
      // Log optional permissions status
      if (permissionStatus.optional) {
        const optionalStatus = Object.entries(permissionStatus.optional)
          .map(([permission, granted]) => `${permission.split('.').pop()}: ${granted ? '✅' : '⚠️'}`)
          .join(', ');
        console.log('📋 Optional permissions:', optionalStatus);
      }
    } catch (error) {
      console.log('⚠️ Could not check permissions:', error.message);
    }
  };

  const handlePermissionError = (error) => {
    if (error.message.includes('permissions not granted')) {
      const isAdvertiseOnly = error.message.includes('BLUETOOTH_ADVERTISE') && 
                             !error.message.includes('BLUETOOTH_SCAN') && 
                             !error.message.includes('BLUETOOTH_CONNECT') &&
                             !error.message.includes('ACCESS_FINE_LOCATION');
      
      if (isAdvertiseOnly) {
        Alert.alert(
          '📋 Permissão Opcional',
          'A permissão BLUETOOTH_ADVERTISE é opcional para esta funcionalidade.\n\n📊 **Esta permissão permite:**\n• Fazer o telefone anunciar-se via Bluetooth\n• Não é necessária para conectar com wearables\n\n✅ **Você pode:**\n• Continuar sem esta permissão\n• Todas as funcionalidades principais funcionarão\n\n🔧 **Se quiser conceder:**\n1. Vá em Configurações > Apps > HealthMate > Permissões\n2. Ative "Bluetooth" se disponível',
          [
            { text: 'Continuar Mesmo Assim', onPress: scanForWearables },
            { text: 'Configurações', onPress: () => Linking.openSettings() },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          '⚠️ Permissões Necessárias',
          'Para conectar com wearables, precisamos de algumas permissões:\n\n📍 **Localização**: Necessária para escanear dispositivos Bluetooth\n📡 **Bluetooth**: Para conectar com seu wearable\n\n🔧 **Soluções disponíveis:**',
          [
            { text: 'Configurar Manualmente', onPress: () => AndroidPermissionsGuide.showManualPermissionGuide() },
            { text: 'Configurações', onPress: () => {
              // Open app settings
              Linking.openSettings();
            }},
            { text: 'Tentar Novamente', onPress: scanForWearables },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
      }
    } else if (error.message.includes('Bluetooth is turned off')) {
      Alert.alert(
        '📡 Bluetooth Desativado',
        'O Bluetooth precisa estar ativado para conectar com wearables.\n\n🔧 **Como ativar:**\n1. Vá nas configurações do seu telefone\n2. Ative o Bluetooth\n3. Volte e tente novamente',
        [
          { text: 'Tentar Novamente', onPress: scanForWearables },
          { text: 'OK' }
        ]
      );
    } else {
      Alert.alert(
        '❌ Erro ao Buscar Wearables',
        `${error.message}\n\n🔧 **Soluções:**\n• Verifique se o Bluetooth está ativo\n• Conceda todas as permissões solicitadas\n• Certifique-se que o wearable está ligado\n• Mantenha os dispositivos próximos\n• Reinicie o app se necessário`,
        [
          { text: 'Tentar Novamente', onPress: scanForWearables },
          { text: 'OK' }
        ]
      );
    }
  };

  const scanForWearables = async () => {
    try {
      setIsScanning(true);
      setAvailableDevices([]);
      
      console.log('🔍 Buscando wearables para dados REAIS...');
      
      const wearables = await BluetoothWearableService.scanForWearableDevices();
      setAvailableDevices(wearables);
      
      console.log(`✅ Encontrados ${wearables.length} wearables`);
      
      if (wearables.length === 0) {
        Alert.alert(
          '🔍 Nenhum Wearable Encontrado',
          'Nenhum smartwatch ou wearable foi encontrado.\n\n🔗 **Para funcionar:**\n\n1. ⌚ Ligue seu smartwatch/wearable\n2. 📱 Certifique-se que o Bluetooth está ativo\n3. 🔄 Mantenha o dispositivo próximo (< 10m)\n4. 📍 Conceda permissões de localização\n5. 🔄 Tente novamente\n\n💡 **Nota:** Apenas dispositivos com serviços de saúde BLE são mostrados.',
          [
            { text: 'Dispositivos Incompatíveis?', onPress: () => AlternativeDataSources.showAllAlternatives() },
            { text: 'Tentar Novamente', onPress: scanForWearables },
            { text: 'OK' }
          ]
        );
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar wearables:', error);
      handlePermissionError(error);
    } finally {
      setIsScanning(false);
    }
  };

  const connectToWearable = async (deviceId, deviceName) => {
    try {
      setIsConnecting(true);
      
      console.log(`🔗 Conectando ao wearable: ${deviceName}`);
      
      Alert.alert(
        '🔗 Conectando ao Wearable',
        `Estabelecendo conexão BLE com:\n\n⌚ ${deviceName}\n\n🔄 Conectando via Bluetooth...\n📊 Preparando para coletar dados REAIS...\n⏳ Aguarde alguns segundos...`,
        [{ text: 'OK' }]
      );
      
      const result = await BluetoothWearableService.connectToDevice(deviceId, deviceName);
      
      if (result.success) {
        setConnectedDevice(result.device);
        console.log(`✅ Conectado ao wearable: ${deviceName}`);
        
        const healthServicesCount = result.healthServices?.length || 0;
        const servicesMessage = healthServicesCount > 0 
          ? `📊 Serviços de saúde: ${healthServicesCount} encontrados`
          : `⚠️ Nenhum serviço de saúde padrão encontrado`;
        
        Alert.alert(
          '✅ Wearable Conectado!',
          `Conexão estabelecida com:\n\n⌚ ${deviceName}\n🔗 Status: CONECTADO\n📊 Fonte: WEARABLE REAL\n📋 Total de serviços: ${result.availableServices?.length || 0}\n${servicesMessage}\n\n🚀 Pronto para coletar dados!`,
          [{ text: 'Coletar Dados!' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Erro na conexão:', error);
      
      // Handle Huawei devices specifically
      if (error.message.includes('HUAWEI_DEVICE_DETECTED')) {
        Alert.alert(
          '⌚ Dispositivo Huawei Detectado',
          `${deviceName} é um smartwatch Huawei!\n\n❌ **LIMITAÇÃO TÉCNICA:**\nOs dispositivos Huawei Watch GT/GT2/GT3 usam protocolos proprietários fechados. A conexão direta via Bluetooth não é possível.\n\n✅ **SOLUÇÃO:**\nUse o botão "Alternativas" para ver como exportar seus dados do app Huawei Health.`,
          [
            { text: 'Ver Alternativas', onPress: () => AlternativeDataSources.showHuaweiExportGuide() },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          '❌ Falha na Conexão',
          `Não foi possível conectar ao wearable:\n\n${error.message}\n\n🔧 Soluções:\n• Certifique-se que o wearable está ligado\n• Verifique se está próximo (menos de 10m)\n• Certifique-se que não está conectado a outro dispositivo\n• Tente reiniciar o Bluetooth`,
          [{ text: 'Tentar Novamente', onPress: () => connectToWearable(deviceId, deviceName) }, { text: 'Cancelar' }]
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectSmartwatch = async () => {
    try {
      await BluetoothWearableService.disconnect();
      setConnectedDevice(null);
      setHealthData(null);
      stopRealTimeMode();
      Alert.alert('Desconectado', 'Dispositivo desconectado com sucesso.');
    } catch (error) {
      console.error('❌ Erro ao desconectar:', error);
      Alert.alert('Erro', 'Erro ao desconectar o dispositivo.');
    }
  };

  const gatherHealthData = async () => {
    try {
      setIsGatheringData(true);
      setHealthData(null);
      
      console.log('📊 Coletando dados REAIS do wearable...');
      
      if (!connectedDevice) {
        Alert.alert('❌ Erro', 'Nenhum wearable conectado');
        return;
      }
      
      // Coletar dados REAIS do wearable
      const realHealthData = await BluetoothWearableService.readHealthData();
      
      if (realHealthData) {
        setHealthData(realHealthData);
        console.log('✅ Dados REAIS coletados:', realHealthData);
        
        const dataKeys = Object.keys(realHealthData).filter(k => 
          !['timestamp', 'deviceName', 'deviceBrand', 'dataSource'].includes(k)
        );
        
        Alert.alert(
          '✅ Dados REAIS Coletados!', 
          `Dados coletados diretamente do wearable:\n\n⌚ ${connectedDevice.name}\n📊 Fonte: WEARABLE REAL\n🔗 Dados: ${dataKeys.join(', ')}\n📊 Total: ${dataKeys.length} tipos de dados\n\n💾 Use os botões para salvar.`,
          [{ text: 'Excelente!' }]
        );
      } else {
        throw new Error('Nenhum dado foi coletado do wearable');
      }
    } catch (error) {
      console.error('❌ Erro ao coletar dados reais:', error);
      Alert.alert(
        '❌ Falha na Coleta de Dados REAIS', 
        `Não foi possível coletar dados REAIS do wearable:\n\n${error.message}\n\n🔧 Possíveis causas:\n• Wearable não suporta os serviços BLE padrão\n• Conexão BLE instável\n• Wearable requer autenticação específica\n• Dispositivo não está transmitindo dados no momento\n\n💡 Alguns wearables precisam de apps específicos da marca para funcionar completamente.`,
        [
          { text: 'Tentar Novamente', onPress: gatherHealthData },
          { text: 'OK' }
        ]
      );
    } finally {
      setIsGatheringData(false);
    }
  };

  const saveHealthDataToDatabase = async () => {
    try {
      if (!healthData) {
        Alert.alert('Erro', 'Nenhum dado de saúde disponível para salvar');
        return;
      }

      if (!userId) {
        Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
        return;
      }

      setIsGatheringData(true);
      console.log('💾 Salvando dados na database...');

      // Save to Supabase using BluetoothWearableService
      const result = await BluetoothWearableService.saveHealthDataToSupabase(userId, healthData);

      if (result.success) {
        Alert.alert(
          'Dados Salvos!',
          `✅ Dados salvos com sucesso na database!\n\n📱 Dispositivo: ${connectedDevice?.name}\n🗄️ ID do Registro: ${result.data.id}\n📊 Dados salvos: ${Object.keys(healthData).filter(k => !['timestamp', 'deviceName', 'deviceBrand', 'dataSource'].includes(k)).length} tipos\n\nOs dados estão agora permanentemente armazenados.`,
          [{ text: 'OK' }]
        );
        console.log('✅ Dados salvos na database:', result.data);
        
        // Reload saved health data to show the new entry
        fetchSavedHealthData(selectedDate);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar na database:', error);
      Alert.alert(
        'Erro ao Salvar',
        `Não foi possível salvar os dados na database:\n\n${error.message}\n\n🔧 Verifique se:\n• Você está conectado à internet\n• O dispositivo está conectado\n• Os dados foram coletados corretamente`
      );
    } finally {
      setIsGatheringData(false);
    }
  };

  const saveHealthDataToDiary = async () => {
    try {
      if (!healthData) {
        Alert.alert('Erro', 'Nenhum dado de saúde disponível para salvar');
        return;
      }

      // Create diary entry with health data
      const healthSummary = `Dados do Smartwatch em Tempo Real:\n` +
        `🔗 Dispositivo: ${connectedDevice?.name || 'Smartwatch'}\n` +
        `👟 Passos: ${healthData.steps ? healthData.steps.toLocaleString() + ' passos' : 'N/A'}\n` +
        `❤️ Frequência Cardíaca: ${healthData.heartRate ? healthData.heartRate + ' bpm' : 'N/A'}\n` +
        `🔥 Calorias: ${healthData.calories ? healthData.calories + ' kcal' : 'N/A'}\n` +
        `📏 Distância: ${healthData.distance ? healthData.distance + ' km' : 'N/A'}\n` +
        `🩸 SpO2: ${healthData.bloodOxygen ? healthData.bloodOxygen + '%' : 'N/A'}\n` +
        `🌡️ Temperatura: ${healthData.bodyTemperature ? healthData.bodyTemperature + '°C' : 'N/A'}\n` +
        `🩺 Pressão: ${healthData.bloodPressure ? `${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic} mmHg` : 'N/A'}\n` +
        `${healthData.stressLevel !== undefined ? `😰 Stress: ${healthData.stressLevel}/100\n` : ''}` +
        `${healthData.batteryLevel ? `🔋 Bateria: ${healthData.batteryLevel}%\n` : ''}` +
        `${healthData.sleepTime ? `😴 Sono: ${healthData.sleepTime}\n` : ''}` +
        `⏰ Coletado: ${new Date(healthData.timestamp).toLocaleString()}`;

      // Create new entry for diary
      setNewEntry({
        title: `Dados do Smartwatch - ${new Date().toLocaleDateString()}`,
        description: healthSummary,
        mood: 'normal',
        symptoms: `Dados coletados via Bluetooth direto do ${healthData.deviceBrand || 'smartwatch'}`,
        dailyNotes: `Dados coletados automaticamente em ${new Date().toLocaleString()}`
      });

      await handleSaveEntry();
      
      // Reload entries to show the new diary entry
      fetchEntriesByDate(selectedDate);
      
      Alert.alert(
        'Adicionado ao Diário!',
        `✅ Dados do smartwatch adicionados ao seu diário médico!\n\n📖 Os dados aparecem agora na lista de anotações.`,
        [{ text: 'OK', onPress: () => setSmartwatchModalVisible(false) }]
      );
    } catch (error) {
      console.error('❌ Erro ao salvar no diário:', error);
      Alert.alert(
        'Erro ao Salvar',
        `Não foi possível adicionar os dados ao diário:\n\n${error.message}`
      );
    }
  };

  const startRealTimeMode = async () => {
    if (!connectedDevice) {
      Alert.alert('Erro', 'Nenhum dispositivo conectado');
      return;
    }

    try {
      setIsRealTimeMode(true);
      
      // Start pulse animation
      const startPulse = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnimation, {
              toValue: 1.3,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      startPulse();
      
      // Get initial data if we don't have any
      if (!healthData) {
        console.log('📊 Coletando dados iniciais...');
        const initialData = await BluetoothWearableService.readHealthData();
        if (initialData) {
          setHealthData(initialData);
        }
      }
      
      // Start real-time monitoring with callback
      try {
        await BluetoothWearableService.startRealTimeMonitoring((realtimeData) => {
          console.log('📊 Dados em tempo real recebidos:', realtimeData);
          setHealthData(prevData => ({
            ...prevData,
            ...realtimeData,
            timestamp: realtimeData.timestamp
          }));
          setUpdateCount(prev => prev + 1);
        });
      } catch (monitorError) {
        console.log('⚠️ Monitoramento em tempo real não disponível, usando polling...');
        
        // Fallback to periodic reading if real-time monitoring is not available
        setUpdateCount(1);
        realTimeIntervalRef.current = setInterval(async () => {
          try {
            console.log('🔄 Atualizando dados via polling...');
            const newHealthData = await BluetoothWearableService.readHealthData();
            if (newHealthData) {
              setHealthData(newHealthData);
              setUpdateCount(prev => prev + 1);
            }
          } catch (error) {
            console.error('❌ Erro na atualização via polling:', error);
            stopRealTimeMode();
            Alert.alert(
              '❌ Erro no Modo Tempo Real',
              `Falha ao coletar dados em tempo real:\n\n${error.message}\n\n🔄 Modo tempo real foi interrompido.`,
              [{ text: 'OK' }]
            );
          }
        }, 5000); // Poll every 5 seconds
      }

      Alert.alert(
        'Modo Tempo Real Ativado!',
        '🔄 Monitoramento em tempo real iniciado.\n\n💡 Os dados serão atualizados automaticamente conforme disponível.\n\n📊 Use os botões para salvar quando desejar.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erro ao iniciar modo tempo real:', error);
      Alert.alert('Erro', `Não foi possível iniciar o modo tempo real:\n\n${error.message}`);
      setIsRealTimeMode(false);
    }
  };

  const stopRealTimeMode = () => {
    setIsRealTimeMode(false);
    setUpdateCount(0);
    
    // Stop real-time monitoring
    BluetoothWearableService.stopRealTimeMonitoring();
    
    // Stop polling interval if running
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }
    
    // Stop pulse animation
    pulseAnimation.stopAnimation();
    Animated.timing(pulseAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    Alert.alert('Modo Tempo Real Parado', 'O monitoramento automático foi interrompido.');
  };

  // Effect to cleanup interval when component unmounts or device disconnects
  useEffect(() => {
    return () => {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
      // Cleanup Bluetooth connection on unmount
      BluetoothWearableService.disconnect().catch(console.error);
    };
  }, []);

  // Stop real time mode when device disconnects
  useEffect(() => {
    if (!connectedDevice && isRealTimeMode) {
      stopRealTimeMode();
    }
  }, [connectedDevice, isRealTimeMode]);

  const clearHealthData = () => {
    setHealthData(null);
    setUpdateCount(0);
    stopRealTimeMode();
    Alert.alert('Dados Limpos', 'Dados de saúde removidos da visualização.');
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
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', flex: 1, textAlign: 'center' }}>Diário Médico</Text>
          <View style={{ width: 40 }} />
        </View>
        
        {renderDateSelector()}
        
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas & Dados de Saúde</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleConnectDigitalScale}
            >
              <FontAwesome5 name="weight" size={28} color="#4A67E3" />
              <Text style={styles.actionButtonText}>Balança Digital</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                connectedDevice && styles.actionButtonConnected
              ]}
              onPress={handleConnectHealthConnect}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons 
                  name={connectedDevice ? "watch" : "fitness-outline"} 
                  size={30} 
                  color={connectedDevice ? "#2E7D32" : "#4A67E3"} 
                />
                {connectedDevice && (
                  <View style={styles.connectedIndicator}>
                    <View style={styles.connectedDot} />
                  </View>
                )}
              </View>
              <Text style={[
                styles.actionButtonText,
                connectedDevice && styles.actionButtonTextConnected
              ]}>
                Smartwatch
              </Text>
              {connectedDevice && (
                <Text style={styles.connectionStatus}>
                  {connectedDevice.name}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.medicationsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Todas as Medicações</Text>
            <Text style={styles.sectionSubtitle}>
              {confirmedMedications.length + pendingMedications.length} medicação(ões)
            </Text>
          </View>
          
          {loadingMedications || loadingPendingMedications ? (
            <View style={styles.loadingStateContainer}>
              <ActivityIndicator size="small" color="#6A8DFD" />
              <Text style={styles.loadingStateText}>Carregando medicações...</Text>
            </View>
          ) : confirmedMedications.length > 0 || pendingMedications.length > 0 ? (
            <FlatList
              data={[...confirmedMedications, ...pendingMedications]}
              renderItem={renderMedication}
              keyExtractor={(item) => `med-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.medicationsList}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="medical-outline" size={36} color="#6A8DFD" />
              <Text style={styles.emptyStateText}>Nenhuma medicação para esta data.</Text>
            </View>
          )}
        </View>

        {/* Saved Health Data Section */}
        <View style={styles.savedHealthSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dados de Saúde Salvos</Text>
            <Text style={styles.sectionSubtitle}>
              {savedHealthData.length} registro(s) na database
            </Text>
          </View>
          
          {loadingSavedData ? (
            <View style={styles.loadingStateContainer}>
              <ActivityIndicator size="small" color="#6A8DFD" />
              <Text style={styles.loadingStateText}>Carregando dados de saúde...</Text>
            </View>
          ) : savedHealthData.length > 0 ? (
            <FlatList
              data={savedHealthData}
              renderItem={({ item }) => (
                <View style={styles.savedHealthCard}>
                  <View style={styles.savedHealthHeader}>
                    <View style={styles.deviceInfoContainer}>
                      <Ionicons name="watch" size={20} color="#4A67E3" />
                      <Text style={styles.deviceName}>{item.device_name || 'Smartwatch'}</Text>
                      <Text style={styles.deviceBrand}>({item.device_brand || 'Unknown'})</Text>
                    </View>
                    <Text style={styles.collectedTime}>
                      {new Date(item.collected_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.savedHealthDataGrid}>
                    {item.heart_rate && (
                      <View style={styles.savedHealthDataItem}>
                        <Ionicons name="heart" size={16} color="#E74C3C" />
                        <Text style={styles.savedHealthDataValue}>{item.heart_rate}</Text>
                        <Text style={styles.savedHealthDataLabel}>bpm</Text>
                      </View>
                    )}
                    
                    {item.steps && (
                      <View style={styles.savedHealthDataItem}>
                        <Ionicons name="walk" size={16} color="#3498DB" />
                        <Text style={styles.savedHealthDataValue}>{item.steps.toLocaleString()}</Text>
                        <Text style={styles.savedHealthDataLabel}>passos</Text>
                      </View>
                    )}
                    
                    {item.calories && (
                      <View style={styles.savedHealthDataItem}>
                        <Ionicons name="flame" size={16} color="#E67E22" />
                        <Text style={styles.savedHealthDataValue}>{item.calories}</Text>
                        <Text style={styles.savedHealthDataLabel}>kcal</Text>
                      </View>
                    )}
                    
                    {item.blood_oxygen && (
                      <View style={styles.savedHealthDataItem}>
                        <Ionicons name="water" size={16} color="#9B59B6" />
                        <Text style={styles.savedHealthDataValue}>{item.blood_oxygen}%</Text>
                        <Text style={styles.savedHealthDataLabel}>SpO2</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedHealthList}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="fitness-outline" size={36} color="#6A8DFD" />
              <Text style={styles.emptyStateText}>
                Nenhum dado de saúde salvo para esta data.
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Use o smartwatch para coletar e salvar dados na database.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.notesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Minhas Anotações</Text>
            <Text style={styles.sectionSubtitle}>
              {entries.length} anotação(ões) para este dia
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingStateContainer}>
              <ActivityIndicator size="large" color="#6A8DFD" />
            </View>
          ) : (
            <FlatList
              data={entries}
              renderItem={renderEntry}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.notesListContent}
              ListEmptyComponent={
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
              }
            />
          )}
        </View>

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

        {/* Health Data Modal */}
        <Modal
          visible={smartwatchModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSmartwatchModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Dispositivos Bluetooth</Text>
                <View style={styles.modalHeaderButtons}>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => BluetoothTroubleshooting.showFullTroubleshootingGuide()}
                  >
                    <Ionicons name="help-circle-outline" size={24} color="#6A8DFD" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSmartwatchModalVisible(false)}
                  >
                    <Ionicons name="close" size={26} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.modalScroll}>
                {!connectedDevice ? (
                  <>
                    <View style={styles.scanSection}>
                      <View style={styles.bluetoothHeader}>
                        <Ionicons name="bluetooth" size={48} color="#4A67E3" />
                        <Text style={styles.bluetoothTitle}>Wearables para Dados REAIS</Text>
                                              <Text style={styles.bluetoothSubtitle}>
                        ⌚ APENAS WEARABLES com protocolos BLE padrão{'\n\n'}
                        🟢 DADOS REAIS do seu dispositivo{'\n'}
                        📊 SEM SIMULAÇÕES - apenas dados genuínos{'\n\n'}
                        💡 Precisa de permissões de Localização + Bluetooth
                      </Text>
                      
                      <View style={styles.incompatibleTip}>
                        <Ionicons name="warning" size={20} color="#FF5722" />
                        <Text style={styles.incompatibleTipText}>
                          ⚠️ Huawei Watch GT/GT2/GT3, Apple Watch e Fitbit não funcionam com BLE direto. Use o botão "Alternativas" abaixo.
                        </Text>
                      </View>
                      
                      <View style={styles.permissionTip}>
                        <Ionicons name="information-circle" size={20} color="#FF9800" />
                        <Text style={styles.permissionTipText}>
                          Se não encontrar dispositivos, verifique se concedeu todas as permissões solicitadas
                        </Text>
                      </View>
                      </View>
                      
                      <View style={styles.scanButtonsContainer}>
                        <TouchableOpacity
                          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
                          onPress={scanForWearables}
                          disabled={isScanning}
                        >
                          {isScanning ? (
                            <>
                              <ActivityIndicator size="small" color="#FFF" />
                              <Text style={styles.scanButtonText}>Procurando...</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="search" size={20} color="#FFF" />
                              <Text style={styles.scanButtonText}>Buscar Wearables</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.testButton}
                          onPress={async () => {
                            try {
                              await BluetoothWearableService.initialize();
                              Alert.alert('✅ Teste OK', 'Permissões e Bluetooth estão funcionando corretamente!');
                            } catch (error) {
                              handlePermissionError(error);
                            }
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                          <Text style={styles.testButtonText}>Testar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.setupButton}
                          onPress={() => AndroidPermissionsGuide.showFullSetupGuide()}
                        >
                          <Ionicons name="settings" size={16} color="#FF9800" />
                          <Text style={styles.setupButtonText}>Configurar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.alternativesButton}
                          onPress={() => AlternativeDataSources.showAllAlternatives()}
                        >
                          <Ionicons name="cloud-upload" size={16} color="#9C27B0" />
                          <Text style={styles.alternativesButtonText}>Alternativas</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {availableDevices.length > 0 && (
                      <View style={styles.devicesSection}>
                        <Text style={styles.devicesTitle}>Wearables Encontrados ({availableDevices.length})</Text>
                        <Text style={styles.devicesSubtitle}>Apenas smartwatches e wearables para dados reais</Text>
                                                 {availableDevices.map((device) => {
                           // Use watch icon for wearables, special handling for Huawei
                           let deviceIcon = "watch";
                           let deviceColor = "#4CAF50";
                           let isHuawei = device.brand === 'Huawei';
                           let deviceStyle = styles.connectedDeviceItem;
                           
                           if (isHuawei) {
                             deviceIcon = "warning";
                             deviceColor = "#FF9800";
                             deviceStyle = [styles.connectedDeviceItem, styles.huaweiDeviceItem];
                           }
                           
                           return (
                             <TouchableOpacity
                               key={device.id}
                               style={deviceStyle}
                               onPress={() => {
                                 if (isHuawei) {
                                   Alert.alert(
                                     '⌚ Dispositivo Huawei Detectado',
                                     `${device.name} é um smartwatch Huawei!\n\n❌ **NÃO É POSSÍVEL CONECTAR:**\nDispositivos Huawei usam protocolos proprietários fechados.\n\n✅ **SOLUÇÃO:**\nExporte seus dados do app Huawei Health e compartilhe conosco.`,
                                     [
                                       { text: 'Como Exportar?', onPress: () => AlternativeDataSources.showHuaweiExportGuide() },
                                       { text: 'OK' }
                                     ]
                                   );
                                 } else {
                                   connectToWearable(device.id, device.name);
                                 }
                               }}
                               disabled={isConnecting}
                             >
                               <View style={styles.deviceInfo}>
                                 <View style={styles.deviceIconContainer}>
                                   <Ionicons 
                                     name={deviceIcon} 
                                     size={24} 
                                     color={deviceColor} 
                                   />
                                   <View style={[styles.connectedBadge, isHuawei && styles.huaweiBadge]}>
                                     <Ionicons 
                                       name={isHuawei ? "close" : "fitness"} 
                                       size={10} 
                                       color="#FFF" 
                                     />
                                   </View>
                                 </View>
                                 <View style={styles.deviceDetails}>
                                   <Text style={[styles.deviceName, isHuawei && styles.huaweiDeviceName]}>
                                     {device.name}
                                   </Text>
                                   <Text style={styles.deviceBrand}>
                                     {device.brand} • RSSI: {device.rssi}dBm
                                   </Text>
                                   <Text style={[styles.deviceSignal, isHuawei && styles.huaweiDeviceSignal]}>
                                     {isHuawei 
                                       ? '❌ Protocolos proprietários - Não conectável' 
                                       : `${device.serviceUUIDs?.length || 0} serviços • ${device.isConnectable ? 'Conectável' : 'Não conectável'}`
                                     }
                                   </Text>
                                 </View>
                               </View>
                               {isConnecting ? (
                                 <ActivityIndicator size="small" color="#4A67E3" />
                               ) : (
                                 <Ionicons 
                                   name={isHuawei ? "information-circle" : "chevron-forward"} 
                                   size={20} 
                                   color={isHuawei ? "#FF9800" : "#4A67E3"} 
                                 />
                               )}
                             </TouchableOpacity>
                           );
                         })}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.connectedSection}>
                    <View style={styles.connectedHeader}>
                      <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                      <Text style={styles.connectedTitle}>Conectado!</Text>
                      <Text style={styles.connectedDevice}>
                        {connectedDevice.name}
                        {connectedDevice.connectionType === 'HEALTH_KIT' && (
                          <Text style={styles.healthKitBadge}> via Health Kit</Text>
                        )}
                      </Text>
                      {connectedDevice.connectionType === 'HEALTH_KIT' && (
                        <Text style={styles.healthKitSubtext}>
                          📱 Dados do app Huawei Health • Real device: {connectedDevice.realDeviceName}
                        </Text>
                      )}
                    </View>

                    <View style={styles.actionButtons}>
                      {!isRealTimeMode ? (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.gatherDataButton]}
                            onPress={gatherHealthData}
                            disabled={isGatheringData}
                          >
                            {isGatheringData ? (
                              <>
                                <ActivityIndicator size="small" color="#FFF" />
                                <Text style={styles.actionButtonText}>Coletando...</Text>
                              </>
                            ) : (
                              <>
                                <Ionicons name="analytics" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Coletar Dados</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                            onPress={startRealTimeMode}
                          >
                            <Ionicons name="play" size={20} color="#FFF" />
                            <Text style={styles.actionButtonText}>Modo Tempo Real</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                          onPress={stopRealTimeMode}
                        >
                          <Ionicons name="stop" size={20} color="#FFF" />
                          <Text style={styles.actionButtonText}>Parar Tempo Real</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionButton, styles.disconnectButton]}
                        onPress={disconnectSmartwatch}
                      >
                        <Ionicons name="bluetooth-outline" size={20} color="#FFF" />
                        <Text style={styles.actionButtonText}>Desconectar</Text>
                      </TouchableOpacity>
                    </View>

                    {healthData && (
                      <>
                        <View style={styles.healthDataSection}>
                          <View style={styles.healthDataHeader}>
                            <Text style={styles.healthDataTitle}>
                              Dados em Tempo Real {isRealTimeMode && `🔄 (${updateCount} updates)`}
                            </Text>
                            {isRealTimeMode && (
                              <View style={styles.realTimeBadge}>
                                <Animated.View 
                                  style={[
                                    styles.pulseDot,
                                    { transform: [{ scale: pulseAnimation }] }
                                  ]} 
                                />
                                <Text style={styles.realTimeBadgeText}>LIVE</Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.healthDataGrid}>
                            {healthData.heartRate && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="heart" size={20} color="#E74C3C" />
                                <Text style={styles.healthDataLabel}>Freq. Cardíaca</Text>
                                <Text style={styles.healthDataValue}>{healthData.heartRate} bpm</Text>
                              </View>
                            )}
                            
                            {healthData.steps && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="walk" size={20} color="#3498DB" />
                                <Text style={styles.healthDataLabel}>Passos</Text>
                                <Text style={styles.healthDataValue}>{healthData.steps.toLocaleString()}</Text>
                              </View>
                            )}
                            
                            {healthData.calories && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="flame" size={20} color="#E67E22" />
                                <Text style={styles.healthDataLabel}>Calorias</Text>
                                <Text style={styles.healthDataValue}>{healthData.calories}</Text>
                              </View>
                            )}
                            
                            {healthData.distance && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="map" size={20} color="#27AE60" />
                                <Text style={styles.healthDataLabel}>Distância</Text>
                                <Text style={styles.healthDataValue}>{healthData.distance} km</Text>
                              </View>
                            )}
                            
                            {healthData.bloodOxygen && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="water" size={20} color="#9B59B6" />
                                <Text style={styles.healthDataLabel}>SpO2</Text>
                                <Text style={styles.healthDataValue}>{healthData.bloodOxygen}%</Text>
                              </View>
                            )}
                            
                            {healthData.bodyTemperature && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="thermometer" size={20} color="#FF6B6B" />
                                <Text style={styles.healthDataLabel}>Temperatura</Text>
                                <Text style={styles.healthDataValue}>{healthData.bodyTemperature}°C</Text>
                              </View>
                            )}
                            
                            {healthData.bloodPressure && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="fitness" size={20} color="#E91E63" />
                                <Text style={styles.healthDataLabel}>Pressão</Text>
                                <Text style={styles.healthDataValue}>
                                  {healthData.bloodPressure.systolic}/{healthData.bloodPressure.diastolic}
                                </Text>
                              </View>
                            )}
                            
                            {healthData.stressLevel !== undefined && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="pulse" size={20} color="#FF9800" />
                                <Text style={styles.healthDataLabel}>Stress</Text>
                                <Text style={styles.healthDataValue}>{healthData.stressLevel}/100</Text>
                              </View>
                            )}
                            
                            {healthData.batteryLevel && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="battery-half" size={20} color="#4CAF50" />
                                <Text style={styles.healthDataLabel}>Bateria</Text>
                                <Text style={styles.healthDataValue}>{healthData.batteryLevel}%</Text>
                              </View>
                            )}
                            
                            {healthData.sleepTime && (
                              <View style={[
                                styles.healthDataItem,
                                isRealTimeMode && styles.healthDataItemRealTime
                              ]}>
                                <Ionicons name="moon" size={20} color="#8E44AD" />
                                <Text style={styles.healthDataLabel}>Sono</Text>
                                <Text style={styles.healthDataValue}>{healthData.sleepTime}</Text>
                              </View>
                            )}
                          </View>
                          
                          <Text style={styles.lastUpdateText}>
                            Última atualização: {new Date(healthData.timestamp).toLocaleString()}
                          </Text>
                        </View>

                        {/* Save Options */}
                        <View style={styles.saveOptionsSection}>
                          <Text style={styles.saveOptionsTitle}>Opções de Salvamento</Text>
                          <View style={styles.saveOptionsGrid}>
                            <TouchableOpacity
                              style={[styles.saveOptionButton, { backgroundColor: '#2196F3' }]}
                              onPress={saveHealthDataToDatabase}
                              disabled={isGatheringData}
                            >
                              {isGatheringData ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <Ionicons name="server" size={24} color="#FFF" />
                              )}
                              <Text style={styles.saveOptionButtonText}>Salvar na Database</Text>
                              <Text style={styles.saveOptionSubtext}>Armazenamento permanente</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.saveOptionButton, { backgroundColor: '#4CAF50' }]}
                              onPress={saveHealthDataToDiary}
                            >
                              <Ionicons name="book" size={24} color="#FFF" />
                              <Text style={styles.saveOptionButtonText}>Adicionar ao Diário</Text>
                              <Text style={styles.saveOptionSubtext}>Visualização no histórico</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.clearDataButton]}
                          onPress={clearHealthData}
                        >
                          <Ionicons name="trash" size={20} color="#FFF" />
                          <Text style={styles.actionButtonText}>Limpar Dados</Text>
                        </TouchableOpacity>
                      </>
                    )}
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

  // Smartwatch Modal Styles
  scanSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    marginBottom: 20,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  scanButtonsContainer: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A8DFD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    justifyContent: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#9BB5FF',
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  testButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  setupButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  alternativesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 4,
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  alternativesButtonText: {
    color: '#9C27B0',
    fontSize: 14,
    fontWeight: '600',
  },
  devicesSection: {
    marginBottom: 20,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  devicesSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pairedDeviceItem: {
    backgroundColor: '#F8FFF8',
    borderColor: '#4CAF50',
    borderWidth: 1.5,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairedIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  smartwatchBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  smartwatchBadgeText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: 'bold',
  },
  smartwatchDeviceItem: {
    backgroundColor: '#F0F8F0',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  smartwatchDeviceName: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  connectedDeviceItem: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  connectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  huaweiBadge: {
    backgroundColor: '#FF9800',
  },
  huaweiDeviceItem: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  huaweiDeviceName: {
    color: '#E65100',
    fontWeight: 'bold',
  },
  huaweiDeviceSignal: {
    color: '#E65100',
    fontWeight: '500',
  },
  pairedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  connectionStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#E8ECF4',
    marginLeft: 8,
  },
  connectedStatusBadge: {
    backgroundColor: '#E8F5E8',
  },
  pairedStatusBadge: {
    backgroundColor: '#FFF3E0',
  },
  connectionStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  deviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  pairedDeviceName: {
    color: '#2E7D32',
  },
  pairedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  pairedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  deviceSignal: {
    fontSize: 12,
    color: '#666',
  },
  connectedSection: {
    alignItems: 'center',
    padding: 20,
  },
  connectedHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  connectedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
    marginBottom: 4,
  },
  connectedDevice: {
    fontSize: 16,
    color: '#666',
  },
  healthKitBadge: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  healthKitSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 30,
  },
  gatherDataButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 12,
  },
  clearDataButton: {
    backgroundColor: '#FF6B6B',
    marginBottom: 20,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  bluetoothHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bluetoothTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  bluetoothSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  permissionTipText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 18,
  },
  incompatibleTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5722',
  },
  incompatibleTipText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#C62828',
    lineHeight: 18,
    fontWeight: '500',
  },
  deviceBrand: {
    fontSize: 14,
    color: '#666',
  },
  deviceSignal: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  healthConnectSection: {
    padding: 20,
  },
  healthConnectHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  healthConnectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
    marginBottom: 8,
  },
  healthConnectSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  healthDataSection: {
    width: '100%',
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  healthDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  realTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  realTimeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    // Add animation here if needed
  },
  healthDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  healthDataItem: {
    backgroundColor: '#FFF',
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
  healthDataItemRealTime: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#F8FFF8',
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
  lastUpdateText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  saveOptionsSection: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  saveOptionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  saveOptionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  saveOptionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveOptionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  saveOptionSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  savedHealthSection: {
    marginTop: 25,
    marginHorizontal: 20,
  },
  savedHealthList: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  savedHealthCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    width: 280,
    minHeight: 120,
  },
  savedHealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  deviceBrand: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  collectedTime: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  savedHealthDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  savedHealthDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    gap: 4,
  },
  savedHealthDataValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  savedHealthDataLabel: {
    fontSize: 11,
    color: '#666',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  troubleshootSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 12,
  },
  troubleshootText: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
    marginBottom: 15,
  },
  troubleshootBold: {
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  troubleshootActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  troubleshootButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6A8DFD',
    flex: 1,
    minWidth: 140,
  },
  mockButton: {
    borderColor: '#4CAF50',
  },
  troubleshootButtonText: {
    fontSize: 14,
    color: '#6A8DFD',
    fontWeight: '600',
    marginLeft: 6,
    textAlign: 'center',
    flex: 1,
  },
});

export default MedicalDiaryScreen;