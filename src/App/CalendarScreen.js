import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';
import Navbar from '../Components/Navbar';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';

const CalendarScreen = ({ navigation }) => {
  const userId = DataUser.getUserData()?.id;
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [selectedScheduleType, setSelectedScheduleType] = useState('interval');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateType, setDateType] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [fixedTimes, setFixedTimes] = useState([]);
  const [intervalStartTime, setIntervalStartTime] = useState('');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [scheduleConfirmModal, setScheduleConfirmModal] = useState(false);
  const [scheduleItems, setScheduleItems] = useState([]);

  const [newMedication, setNewMedication] = useState({
    titulo: '',
    quantidade_comprimidos: '',
    quantidade_comprimidos_por_vez: '',
    data_inicio: '',
    intervalo_horas: null,
    horario_fixo: '',
    data_fim: '',
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMedications = async () => {
      try {
        const { data, error } = await supabase
          .from('pills_warning')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;
        setMedications(data || []);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch medications');
        console.error('Error fetching medications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [userId]);

  const handleInfoPress = (medication) => {
    setSelectedMedication(medication);
    setInfoModalVisible(true);
  };

  const handleEditMedication = (medication) => {
    setSelectedMedication(medication);
    const { data_inicio, intervalo_horas } = medication;
    const [startDate, startTime] = data_inicio.split(';');
    setNewMedication({
      titulo: medication.titulo,
      quantidade_comprimidos: medication.quantidade_comprimidos.toString(),
      quantidade_comprimidos_por_vez: medication.quantidade_comprimidos_por_vez.toString(),
      data_inicio: startDate.trim(),
      intervalo_horas: intervalo_horas,
      horario_fixo: medication.horario_fixo,
      data_fim: medication.data_fim,
    });
    setIntervalStartTime(startTime ? startTime.trim() : '');

    if (medication.horario_fixo) {
      setFixedTimes(medication.horario_fixo.split(';').map(time => time.trim()));
    }

    setSelectedScheduleType(medication.horario_fixo ? 'fixed' : 'interval');
    setModalVisible(true);
  };

  const handleScheduleTypeChange = (itemValue) => {
    setSelectedScheduleType(itemValue);
    if (itemValue === 'interval') {
      const [dataInicio] = newMedication.data_inicio.split(';');
      setNewMedication({ ...newMedication, data_inicio: dataInicio.trim() });
      setIntervalStartTime('');
      setFixedTimes([]);
    } else if (itemValue === 'fixed') {
      setNewMedication({ ...newMedication, intervalo_horas: null });
    }
  };

  const handleDeleteMedication = async (medicationId) => {
    try {
      const { error } = await supabase
        .from('pills_warning')
        .delete()
        .eq('id', medicationId);

      if (error) throw error;

      setMedications(medications.filter((med) => med.id !== medicationId));
      setInfoModalVisible(false);
      Alert.alert('Success', 'Medication deleted successfully!');
    } catch (error) {
      Alert.alert('Error', 'Could not delete medication');
      console.error('Delete error:', error);
    }
  };

  const validateMedicationInput = () => {
    if (!newMedication.titulo.trim()) {
      Alert.alert('Error', 'Please enter medication name');
      return false;
    }
    if (!newMedication.quantidade_comprimidos || isNaN(newMedication.quantidade_comprimidos)) {
      Alert.alert('Error', 'Please enter a valid number of tablets');
      return false;
    }
    if (!newMedication.quantidade_comprimidos_por_vez || isNaN(newMedication.quantidade_comprimidos_por_vez)) {
      Alert.alert('Error', 'Please enter a valid dose amount');
      return false;
    }
    if (!newMedication.data_inicio) {
      Alert.alert('Error', 'Please select a start date');
      return false;
    }
    return true;
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      setShowTimePicker(false);
      return;
    }

    if (selectedDate) {
      const updatedMedication = { ...newMedication };
      const timeString = selectedDate.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });

      switch (dateType) {
        case 'start':
          updatedMedication.data_inicio = selectedDate.toISOString().split('T')[0];
          break;
        case 'time':
          if (selectedScheduleType === 'fixed') {
            setFixedTimes(prevTimes => {
              const updatedTimes = [...new Set([...prevTimes, timeString])];
              return updatedTimes;
            });
          } else if (selectedScheduleType === 'interval') {
            setIntervalStartTime(timeString);
          }
          break;
        case 'end':
          updatedMedication.data_fim = selectedDate.toISOString().split('T')[0];
          break;
      }
      
      setNewMedication(updatedMedication);
    }
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const removeTime = (timeToRemove) => {
    setSelectedTimes(selectedTimes.filter(time => time !== timeToRemove));
  };

  const removeFixedTime = (timeToRemove) => {
    const updatedFixedTimes = fixedTimes.filter(time => time !== timeToRemove);
    setFixedTimes(updatedFixedTimes);
  };

  const handleAddMedication = async () => {
    if (!validateMedicationInput()) return;

    try {
      const combinedDateTime = `${newMedication.data_inicio}; ${intervalStartTime}`;

      const [dataInicio, startTime] = combinedDateTime.split(';');
      const startDate = new Date(dataInicio);
      if (isNaN(startDate.getTime())) {
        Alert.alert('Error', 'Invalid start date format');
        return;
      }

      // First get the highest current ID to generate a new one (temporary solution)
      const { data: maxIdData, error: maxIdError } = await supabase
        .from('pills_warning')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
        
      if (maxIdError) {
        console.error('Error getting max ID:', maxIdError);
        Alert.alert('Error', 'Failed to generate new ID');
        return;
      }

      // Calculate new ID (max + 1)
      const newId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;
      console.log(`Generated new ID: ${newId}`);

      // Create medication data object with proper field names and explicit ID
      const medicationData = {
        id: selectedMedication ? selectedMedication.id : newId, // Use existing ID for updates, new one for inserts
        user_id: userId,
        titulo: newMedication.titulo,
        quantidade_comprimidos: parseInt(newMedication.quantidade_comprimidos),
        quantidade_comprimidos_por_vez: parseInt(newMedication.quantidade_comprimidos_por_vez),
        data_inicio: combinedDateTime,
        intervalo_horas: newMedication.intervalo_horas,
        horario_fixo: fixedTimes.join('; '),
        data_fim: newMedication.data_fim,
        status: 'pending'
      };

      console.log('Saving medication:', medicationData);

      // Handle update vs insert
      if (selectedMedication) {
        console.log(`Updating existing medication with ID: ${selectedMedication.id}`);
        const { data, error } = await supabase
          .from('pills_warning')
          .update(medicationData)
          .eq('id', selectedMedication.id)
          .select();

        if (error) {
          console.error('Error updating medication:', error);
          Alert.alert('Error', `Failed to update medication: ${error.message}`);
          return;
        }

        console.log('Medication updated successfully:', data);
        setMedications(medications.map(med => 
          med.id === selectedMedication.id ? { ...med, ...medicationData } : med
        ));
        
        Alert.alert('Success', 'Medication updated successfully!');
      } else {
        console.log('Creating new medication with ID:', newId);
      const { data, error } = await supabase
        .from('pills_warning')
        .insert([medicationData])
        .select();

        if (error) {
          console.error('Error creating medication:', error);
          Alert.alert('Error', `Failed to create medication: ${error.message}`);
        return;
      }

        console.log('Medication created successfully:', data);
        setMedications([...medications, data[0]]);
        
        Alert.alert('Success', 'Medication saved successfully!');
        
        // Store the newly created medication for calendar/reminders
        const savedMedication = data[0];
        
        // Schedule reminders and add to calendar after successful save
        await scheduleReminders(savedMedication);
        await handleAddToCalendarRequest(savedMedication);
      }

      // Reset form and close modal
      setModalVisible(false);
      setNewMedication({
        titulo: '',
        quantidade_comprimidos: '',
        quantidade_comprimidos_por_vez: '',
        data_inicio: '',
        intervalo_horas: null,
        horario_fixo: '',
        data_fim: '',
      });
      setSelectedTimes([]);
      setFixedTimes([]);
      setIntervalStartTime('');

    } catch (error) {
      console.error('Exception saving medication:', error);
      Alert.alert('Error', `An error occurred: ${error.message}`);
    }
  };

  const scheduleReminders = async (medication) => {
    const startDate = new Date(medication.data_inicio);
    const reminderDays = 20;
    const intervalDays = 5;

    for (let i = 0; i < reminderDays / intervalDays; i++) {
      const reminderDate = new Date(startDate);
      reminderDate.setDate(startDate.getDate() + i * intervalDays);
      reminderDate.setMinutes(reminderDate.getMinutes() - 10);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Lembrete: ${medication.titulo}`,
          body: `É hora de tomar seu comprimido!`,
          data: { medicationId: medication.id },
        },
        trigger: {
          date: reminderDate,
        },
      });
    }
  };

  const handleAddToCalendarRequest = async (medication) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow calendar access to add medication reminders.');
        return;
      }

      const { 
        titulo, 
        quantidade_comprimidos, 
        quantidade_comprimidos_por_vez, 
        intervalo_horas, 
        horario_fixo, 
        data_inicio,
        data_fim
      } = medication;

      let baseDate = new Date();
      let initialHour = null;
      
      if (data_inicio && data_inicio.includes(';')) {
        const [dateStr, timeStr] = data_inicio.split(';');
        baseDate = new Date(dateStr.trim());
        initialHour = timeStr.trim();
      } else if (data_inicio) {
        baseDate = new Date(data_inicio);
      }
      
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }

      const events = [];

      const totalDoses = Math.ceil(quantidade_comprimidos / quantidade_comprimidos_por_vez);
      let remainingDoses = totalDoses;

      if (horario_fixo && horario_fixo !== 'NULL') {
        const fixedTimes = horario_fixo.split(';').map(time => time.trim()).filter(time => time);
        
        if (fixedTimes.length === 0) {
          Alert.alert('Erro', 'Horários fixos inválidos.');
          return;
        }

        let currentDay = 0;
        
        while (remainingDoses > 0) {
          for (let timeIndex = 0; timeIndex < fixedTimes.length; timeIndex++) {
            if (remainingDoses <= 0) break;
            
            const time = fixedTimes[timeIndex];
            if (!time.includes(':')) continue;
            
            const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
            
            const eventDate = new Date(baseDate);
            eventDate.setDate(baseDate.getDate() + currentDay);
            eventDate.setHours(hours, minutes, 0, 0);
            
            if (data_fim && new Date(data_fim) < eventDate) {
              remainingDoses = 0;
              break;
            }
            
            const dosePills = Math.min(quantidade_comprimidos_por_vez, remainingDoses * quantidade_comprimidos_por_vez);
            
            events.push({
              title: titulo,
              startDate: eventDate,
              endDate: new Date(eventDate.getTime() + 15 * 60000),
              notes: `Tome ${dosePills} comprimido(s)`
            });
            
            remainingDoses--;
          }
          
          currentDay++;
          
          if (currentDay > 365) {
            Alert.alert('Aviso', 'Número excessivo de dias. Verifique a configuração do medicamento.');
            break;
          }
        }
      } else if (intervalo_horas && intervalo_horas !== 'NULL') {
        let startTime = new Date(baseDate);
        if (initialHour) {
          const [hours, minutes] = initialHour.split(':').map(num => parseInt(num, 10));
          startTime.setHours(hours, minutes, 0, 0);
        }
        
        const intervalHours = parseInt(intervalo_horas);
        
        if (isNaN(intervalHours) || intervalHours <= 0) {
          Alert.alert('Erro', 'Intervalo de horas inválido.');
          return;
        }
        
        for (let i = 0; i < totalDoses; i++) {
          const intervalMillis = intervalHours * 60 * 60 * 1000;
          const eventTime = new Date(startTime.getTime() + i * intervalMillis);
          
          if (data_fim && new Date(data_fim) < eventTime) break;
          
          const dosePills = Math.min(quantidade_comprimidos_por_vez, (totalDoses - i) * quantidade_comprimidos_por_vez);
          
          events.push({
            title: titulo,
            startDate: eventTime,
            endDate: new Date(eventTime.getTime() + 15 * 60000),
            notes: `Tome ${dosePills} comprimido(s)`
          });
        }
      }

      if (events.length === 0) {
        Alert.alert('Aviso', 'Não foi possível calcular os horários para este medicamento.');
        return;
      }

      events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      setPendingEvents(events);
      setSelectedMedication(medication);
      setConfirmModal(true);

    } catch (error) {
      console.error('Erro ao preparar eventos:', error);
      Alert.alert('Erro', 'Não foi possível preparar os horários. Tente novamente.');
    }
  };

  const confirmAddToCalendar = async () => {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (calendars.length === 0) {
        Alert.alert('No calendars found', 'You need at least one calendar to add events.');
        setConfirmModal(false);
        return;
      }

      const defaultCalendar = calendars.find(cal => 
        cal.accessLevel === Calendar.CalendarAccessLevel.OWNER && 
        cal.source.name === 'Default'
      ) || calendars[0];

      // Prepare schedule items for confirmation
      const scheduleItemsToSave = pendingEvents.map(event => {
        const eventDate = new Date(event.startDate);
        const timeStr = eventDate.toTimeString().split(' ')[0]; // HH:MM:SS
        return {
          date: eventDate.toLocaleDateString(),
          time: eventDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
          notes: event.notes,
          rawDate: eventDate.toISOString().split('T')[0],
          rawTime: timeStr,
          fullDatetime: eventDate.toISOString()
        };
      });

      // Show confirmation popup for schedule items
      setScheduleItems(scheduleItemsToSave);
      setScheduleConfirmModal(true);
      setConfirmModal(false); // Close the first confirmation modal

    } catch (error) {
      console.error('Erro ao preparar dados para confirmação:', error);
      Alert.alert('Erro', 'Não foi possível preparar os horários. Tente novamente.');
      setConfirmModal(false);
    }
  };

  const finalizeCalendarAndScheduleSave = async () => {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => 
        cal.accessLevel === Calendar.CalendarAccessLevel.OWNER && 
        cal.source.name === 'Default'
      ) || calendars[0];

      let savedConfirmationsCount = 0;
      let savedSchedulesCount = 0;

      // Save to both tables
      for (const item of scheduleItems) {
        try {
          // 1. Save to medication_confirmations
          const confirmationData = {
            medication_id: selectedMedication.id,
            pill_id: selectedMedication.id,
            user_id: userId,
            scheduled_time: item.fullDatetime,
            confirmation_date: item.rawDate,
            confirmation_time: null,
            taken: false,
            notes: item.notes || 'Medicamento agendado',
            created_at: new Date().toISOString()
          };

          const { data: existingConfirmation, error: checkError } = await supabase
            .from('medication_confirmations')
            .select('id')
            .eq('medication_id', confirmationData.medication_id)
            .eq('scheduled_time', confirmationData.scheduled_time)
            .maybeSingle();

          if (!checkError && !existingConfirmation) {
            const { error: insertError } = await supabase
              .from('medication_confirmations')
              .insert(confirmationData);

            if (!insertError) savedConfirmationsCount++;
          }

          // 2. Save to medication_schedule_times
          const scheduleData = {
            medication_id: selectedMedication.id,
            scheduled_date: item.rawDate,
            scheduled_time: item.rawTime,
            complete_datetime: item.fullDatetime,
            dosage: item.notes ? item.notes.replace('Tome ', '').replace(' comprimido(s)', '') : null,
            user_id: userId,
            pill_id: selectedMedication.id,
            notes: item.notes || 'Agendado via CalendarScreen'
          };

          const { data: existingSchedule, error: checkScheduleError } = await supabase
            .from('medication_schedule_times')
            .select('id')
            .eq('medication_id', scheduleData.medication_id)
            .eq('scheduled_date', scheduleData.scheduled_date)
            .eq('scheduled_time', scheduleData.scheduled_time)
            .maybeSingle();

          if (!checkScheduleError && !existingSchedule) {
            const { error: insertScheduleError } = await supabase
              .from('medication_schedule_times')
              .insert(scheduleData);

            if (!insertScheduleError) savedSchedulesCount++;
          }
        } catch (err) {
          console.error('Erro ao salvar item individual:', err);
        }
      }

      console.log(`Salvos: ${savedConfirmationsCount} confirmações, ${savedSchedulesCount} agendamentos`);

      // Add to calendar
      const eventIds = [];
      for (const event of pendingEvents) {
        const eventDetails = {
          ...event,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          alarms: [{ relativeOffset: -15 }]
        };
        
        const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
        eventIds.push(eventId);
      }

      // Update pill status
      if (selectedMedication && eventIds.length > 0) {
        await supabase
          .from('pills_warning')
          .update({ 
            status: 'calendar_added',
            all_schedules_saved: true
          })
          .eq('id', selectedMedication.id);
      }

      Alert.alert(
        'Sucesso', 
        `${eventIds.length} lembretes adicionados ao calendário.\n${savedSchedulesCount} agendamentos salvos no banco de dados.`
      );

    } catch (error) {
      console.error('Erro ao finalizar agendamentos:', error);
      Alert.alert('Erro', 'Não foi possível salvar todos os agendamentos.');
    } finally {
      setScheduleConfirmModal(false);
      setPendingEvents([]);
      setSelectedMedication(null);
      setScheduleItems([]);
    }
  };

  const renderMedicationCard = ({ item }) => (
    <View style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <Text style={styles.medicationTitle}>{item.titulo}</Text>
        <TouchableOpacity 
          onPress={() => handleInfoPress(item)}
          style={styles.infoButton}
        >
          <Ionicons name="information-circle-outline" size={24} color="#3498db" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleEditMedication(item)}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={24} color="#f39c12" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleAddToCalendarRequest(item)} style={styles.addToCalendarButton}>
          <Ionicons name="calendar" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>
      <View style={styles.medicationDetails}>
        <Text style={styles.medicationInfo}>
          <Ionicons name="calendar" size={16} color="#3498db" /> Start: {item.data_inicio.split(';')[0]}
        </Text>
        {item.data_fim && (
          <Text style={styles.medicationInfo}>
            <Ionicons name="calendar" size={16} color="#e74c3c" /> End: {item.data_fim.split(';')[0]}
          </Text>
        )}
        <Text style={styles.medicationInfo}>
          <Ionicons name="alarm" size={16} color="#f1c40f" /> 
          {item.intervalo_horas ? `Interval: ${item.intervalo_horas} hours` : 
           item.horario_fixo ? `Fixed time: ${item.horario_fixo}` : 'No schedule set'}
        </Text>
        <Text style={styles.medicationInfo}>
          <Ionicons name="medkit" size={16} color="#e67e22" /> 
          Dose: {item.quantidade_comprimidos_por_vez} of {item.quantidade_comprimidos} tablets
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Medications</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical" size={64} color="#bdc3c7" />
          <Text style={styles.noDataText}>No scheduled medications</Text>
          <Text style={styles.noDataSubtext}>Add your first medication below</Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMedicationCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={styles.addButtonText}>Add Medication</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContentEnhanced}>
            <View style={styles.modalHandle} />
            
            <TouchableOpacity 
              style={styles.closeButtonEnhanced} 
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.modalTitleEnhanced}>
              {selectedMedication ? 'Editar Medicamento' : 'Novo Medicamento'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContentEnhanced}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome do Medicamento</Text>
                <TextInput
                  style={styles.inputEnhanced}
                  placeholder="Ex: Paracetamol, Vitamina C..."
                  value={newMedication.titulo}
                  onChangeText={(text) => setNewMedication({ ...newMedication, titulo: text })}
                  placeholderTextColor="#95a5a6"
                />
              </View>
              
              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 8}]}>
                  <Text style={styles.inputLabel}>Total de Comprimidos</Text>
                  <TextInput
                    style={styles.inputEnhanced}
                    placeholder="Ex: 30"
                    keyboardType="numeric"
                    value={newMedication.quantidade_comprimidos}
                    onChangeText={(text) => setNewMedication({ ...newMedication, quantidade_comprimidos: text })}
                    placeholderTextColor="#95a5a6"
                  />
                </View>
                
                <View style={[styles.inputGroup, {flex: 1, marginLeft: 8}]}>
                  <Text style={styles.inputLabel}>Dose por vez</Text>
                  <TextInput
                    style={styles.inputEnhanced}
                    placeholder="Ex: 1"
                    keyboardType="numeric"
                    value={newMedication.quantidade_comprimidos_por_vez}
                    onChangeText={(text) => setNewMedication({ ...newMedication, quantidade_comprimidos_por_vez: text })}
                    placeholderTextColor="#95a5a6"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Agendamento</Text>
                <View style={styles.scheduleTypeContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.scheduleTypeButton,
                      selectedScheduleType === 'interval' && styles.scheduleTypeSelected
                    ]}
                    onPress={() => handleScheduleTypeChange('interval')}
                  >
                    <Ionicons 
                      name="time-outline" 
                      size={20} 
                      color={selectedScheduleType === 'interval' ? '#fff' : '#3498db'} 
                    />
                    <Text style={[
                      styles.scheduleTypeText,
                      selectedScheduleType === 'interval' && styles.scheduleTypeTextSelected
                    ]}>Intervalo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.scheduleTypeButton,
                      selectedScheduleType === 'fixed' && styles.scheduleTypeSelected
                    ]}
                    onPress={() => handleScheduleTypeChange('fixed')}
                  >
                    <Ionicons 
                      name="alarm-outline" 
                      size={20} 
                      color={selectedScheduleType === 'fixed' ? '#fff' : '#3498db'} 
                    />
                    <Text style={[
                      styles.scheduleTypeText,
                      selectedScheduleType === 'fixed' && styles.scheduleTypeTextSelected
                    ]}>Horário Fixo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selectedScheduleType === 'interval' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Data de Início</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButtonEnhanced}
                      onPress={() => { setShowDatePicker(true); setDateType('start'); }}
                    >
                      <Ionicons name="calendar" size={20} color="#3498db" />
                      <Text style={styles.datePickerTextEnhanced}>
                        {newMedication.data_inicio || 'Selecione a data inicial'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Horário Inicial</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButtonEnhanced}
                      onPress={() => { setShowTimePicker(true); setDateType('time'); }}
                    >
                      <Ionicons name="time" size={20} color="#3498db" />
                      <Text style={styles.datePickerTextEnhanced}>
                        {intervalStartTime || 'Selecione o horário inicial'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Intervalo (horas)</Text>
                    <TextInput
                      style={styles.inputEnhanced}
                      placeholder="Ex: 8 (para de 8 em 8 horas)"
                      keyboardType="numeric"
                      value={newMedication.intervalo_horas}
                      onChangeText={(text) => setNewMedication({ ...newMedication, intervalo_horas: text })}
                      placeholderTextColor="#95a5a6"
                    />
                  </View>
                </>
              )}

              {selectedScheduleType === 'fixed' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Horários Fixos</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButtonEnhanced}
                      onPress={() => { setShowTimePicker(true); setDateType('time'); }}
                    >
                      <Ionicons name="time" size={20} color="#3498db" />
                      <Text style={styles.datePickerTextEnhanced}>
                        Adicionar novo horário
                      </Text>
                      <View style={styles.addTimeButton}>
                        <Ionicons name="add" size={18} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {fixedTimes.length > 0 && (
                    <View style={styles.selectedTimesContainerEnhanced}>
                      <Text style={styles.selectedTimesTitle}>Horários Selecionados:</Text>
                      <View style={styles.timeChipsContainer}>
                        {fixedTimes.map((time, index) => (
                          <View key={index} style={styles.timeChip}>
                            <Text style={styles.timeChipText}>{time}</Text>
                            <TouchableOpacity 
                              style={styles.removeTimeButton} 
                              onPress={() => removeFixedTime(time)}
                            >
                              <Ionicons name="close-circle" size={18} color="#e74c3c" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data Final (opcional)</Text>
                <TouchableOpacity 
                  style={styles.datePickerButtonEnhanced}
                  onPress={() => { setShowDatePicker(true); setDateType('end'); }}
                >
                  <Ionicons name="calendar" size={20} color="#3498db" />
                  <Text style={styles.datePickerTextEnhanced}>
                    {newMedication.data_fim || 'Definir data final'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode={dateType === 'start' || dateType === 'end' ? 'date' : 'time'}
                  is24Hour={true}
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              <TouchableOpacity 
                style={styles.saveButtonEnhanced} 
                onPress={handleAddMedication}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Salvar Medicamento</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={infoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setInfoModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Medication Details</Text>

            {selectedMedication && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Medication Name</Text>
                  <Text style={styles.infoValue}>{selectedMedication.titulo}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Total Tablets</Text>
                  <Text style={styles.infoValue}>{selectedMedication.quantidade_comprimidos}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Tablets per Dose</Text>
                  <Text style={styles.infoValue}>{selectedMedication.quantidade_comprimidos_por_vez}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Start Date</Text>
                  <Text style={styles.infoValue}>{selectedMedication.data_inicio.split(';')[0]}</Text>
                </View>

                {selectedMedication.data_fim && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>End Date</Text>
                    <Text style={styles.infoValue}>{selectedMedication.data_fim.split(';')[0]}</Text>
                  </View>
                )}

                {selectedMedication.intervalo_horas && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Interval</Text>
                    <Text style={styles.infoValue}>{selectedMedication.intervalo_horas} hours</Text>
                  </View>
                )}

                {selectedMedication.horario_fixo && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Fixed Time</Text>
                    <Text style={styles.infoValue}>{selectedMedication.horario_fixo}</Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => handleDeleteMedication(selectedMedication.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete Medication</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmModal}
        onRequestClose={() => setConfirmModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Lembretes</Text>
            
            <Text style={styles.modalSubTitle}>
              {selectedMedication?.titulo} - {pendingEvents.length} horário(s)
            </Text>
            
            <ScrollView style={styles.eventsList}>
              {pendingEvents.map((event, index) => (
                <View key={index} style={styles.eventItem}>
                  <Text style={styles.eventDate}>
                    {event.startDate.toLocaleDateString()}
                  </Text>
                  <Text style={styles.eventTime}>
                    {event.startDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                  <Text style={styles.eventNotes}>{event.notes}</Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setConfirmModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmAddToCalendar}
              >
                <Text style={styles.buttonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Modal for Schedule Times Confirmation */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scheduleConfirmModal}
        onRequestClose={() => setScheduleConfirmModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { width: '95%' }]}>
            <Text style={styles.modalTitle}>Confirmação de Agendamentos</Text>
            
            <Text style={styles.modalSubtitle}>
              Confirme os {scheduleItems.length} horários a serem salvos no banco de dados:
            </Text>
            
            <ScrollView style={styles.scheduleListContainer}>
              {scheduleItems.map((item, index) => (
                <View key={index} style={styles.scheduleItem}>
                  <View style={styles.scheduleDateTimeContainer}>
                    <Text style={styles.scheduleDate}>{item.date}</Text>
                    <Text style={styles.scheduleTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.scheduleNotes}>{item.notes}</Text>
                </View>
              ))}
            </ScrollView>
            
            <Text style={styles.saveWarning}>
              Estes horários serão salvos na tabela medication_schedule_times
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setScheduleConfirmModal(false);
                  setPendingEvents([]);
                  setSelectedMedication(null);
                  setScheduleItems([]);
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={finalizeCalendarAndScheduleSave}
              >
                <Text style={styles.buttonText}>Salvar Todos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Navbar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginVertical: 20, letterSpacing: 0.5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  noDataText: { fontSize: 20, color: '#7f8c8d', marginTop: 20, fontWeight: '600' },
  noDataSubtext: { fontSize: 16, color: '#95a5a6', marginTop: 8, textAlign: 'center' },
  listContainer: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  medicationCard: { 
    backgroundColor: '#ffffff', 
    padding: 20, 
    borderRadius: 15, 
    marginBottom: 15, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    borderLeftWidth: 5, 
    borderLeftColor: '#3498db' 
  },
  medicationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  medicationTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', flex: 1 },
  infoButton: { padding: 5 },
  medicationDetails: { gap: 8 },
  medicationInfo: { fontSize: 16, color: '#34495e', flexDirection: 'row', alignItems: 'center', gap: 8 },
  addButton: { 
    position: 'absolute', 
    bottom: 80, 
    alignSelf: 'center', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#3498db', 
    paddingVertical: 15, 
    paddingHorizontal: 25, 
    borderRadius: 25, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 4 
  },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentEnhanced: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingTop: 15,
    width: '100%',
    maxHeight: '90%',
    position: 'absolute',
    bottom: 0,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalTitleEnhanced: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButtonEnhanced: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f2f6',
  },
  scrollViewContentEnhanced: {
    paddingBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  inputEnhanced: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  datePickerButtonEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datePickerTextEnhanced: {
    fontSize: 16,
    color: '#3498db',
    flex: 1,
    marginLeft: 10,
  },
  saveButtonEnhanced: {
    backgroundColor: '#3498db',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  scheduleTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  scheduleTypeSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  scheduleTypeText: {
    fontSize: 16,
    color: '#3498db',
    marginLeft: 8,
  },
  scheduleTypeTextSelected: {
    color: '#fff',
  },
  selectedTimesContainerEnhanced: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  timeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  timeChipText: {
    fontSize: 14,
    color: '#3498db',
  },
  removeTimeButton: {
    marginLeft: 5,
  },
  addTimeButton: {
    backgroundColor: '#3498db',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTimesTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  eventItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  eventDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  eventTime: {
    fontSize: 16,
    color: '#6A8DFD',
    fontWeight: 'bold',
    marginVertical: 4,
  },
  eventNotes: {
    fontSize: 14,
    color: '#9BA3B7',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#6A8DFD',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: { padding: 5 },
  addToCalendarButton: {
    marginLeft: 10,
  },
  infoSection: { marginBottom: 15 },
  infoLabel: { fontSize: 14, color: '#7f8c8d', marginBottom: 5 },
  infoValue: { fontSize: 18, color: '#2c3e50', fontWeight: '500' },
  deleteButton: { backgroundColor: '#e74c3c', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 8 },
  deleteButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollViewContent: { gap: 15 },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: { position: 'absolute', top: 15, right: 15, zIndex: 1, padding: 5 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6A8DFD',
    marginBottom: 15,
    textAlign: 'center',
  },
  eventsList: {
    maxHeight: 300,
  },
  selectedTimesContainer: { marginTop: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 10 },
  selectedTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 5 },
  selectedTimeText: { fontSize: 16, color: '#34495e' },
  scheduleListContainer: {
    maxHeight: 300,
    marginVertical: 10
  },
  scheduleItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db'
  },
  scheduleDateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  scheduleDate: {
    fontWeight: 'bold',
    color: '#2c3e50',
    fontSize: 14
  },
  scheduleTime: {
    fontWeight: 'bold',
    color: '#3498db',
    fontSize: 14
  },
  scheduleNotes: {
    color: '#7f8c8d',
    fontSize: 13
  },
  saveWarning: {
    fontStyle: 'italic',
    color: '#e67e22',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default CalendarScreen;