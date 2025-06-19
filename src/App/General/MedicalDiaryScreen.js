import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
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

  const handleConnectSmartwatch = () => {
    Alert.alert('Conectar Smartwatch', 'Simulando conexão com Smartwatch. Implemente a API aqui!');
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
          <Text style={styles.headerTitle}>Diário Médico</Text>
          <View style={styles.headerRight} />
        </View>
        
        {renderDateSelector()}
        
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas & Dispositivos</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleConnectDigitalScale}
            >
              <FontAwesome5 name="weight" size={28} color="#4A67E3" />
              <Text style={styles.actionButtonText}>Balança Digital</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleConnectSmartwatch}
            >
              <Ionicons name="watch-outline" size={30} color="#4A67E3" />
              <Text style={styles.actionButtonText}>Smartwatch</Text>
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
              <Ionicons name="pill-outline" size={36} color="#6A8DFD" />
              <Text style={styles.emptyStateText}>Nenhuma medicação para esta data.</Text>
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
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A67E3',
    marginTop: 8,
    textAlign: 'center',
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
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
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
});

export default MedicalDiaryScreen;