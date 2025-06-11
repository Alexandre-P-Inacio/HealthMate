import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';
import Navbar from '../Components/Navbar';
import * as Calendar from 'expo-calendar';
import Constants from 'expo-constants';

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
      Alert.alert(
        'Confirmação',
        'Tem certeza que deseja excluir este medicamento e todos os seus horários agendados?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              // Always delete schedule times before deleting the medication
              await deleteMedicationScheduleTimes(medicationId);
              
              // Also delete confirmations for this pill
              const { error: confirmationError } = await supabase
                .from('medication_confirmations')
                .delete()
                .eq('pill_id', medicationId);

              if (confirmationError) {
                console.error('Confirmation delete error:', confirmationError);
                Alert.alert('Error', 'Could not delete medication confirmations');
                return;
              }
              
              // Then delete the medication
              const { error } = await supabase
                .from('pills_warning')
                .delete()
                .eq('id', medicationId);

              if (error) throw error;

              setMedications(medications.filter((med) => med.id !== medicationId));
              setInfoModalVisible(false);
              Alert.alert('Sucesso', 'Medicamento e seus horários excluídos com sucesso!');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível excluir o medicamento');
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

  const handleQuantityReduction = async (oldMedication, newMedication) => {
    try {
      // Calculate old and new total dose counts
      const oldTotalDoses = Math.ceil(oldMedication.quantidade_comprimidos / oldMedication.quantidade_comprimidos_por_vez);
      const newTotalDoses = Math.ceil(newMedication.quantidade_comprimidos / newMedication.quantidade_comprimidos_por_vez);
      
      // If new quantity is same or higher, no need to delete entries
      if (newTotalDoses >= oldTotalDoses) {
        return true;
      }
      
      console.log(`Quantity reduced from ${oldTotalDoses} doses to ${newTotalDoses} doses. Removing excess schedule entries.`);
      
      // Get all schedule entries for this medication, sorted by date/time
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .eq('pill_id', oldMedication.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });
        
      if (scheduleError) {
        return false;
      }
      
      // If there are fewer schedule entries than the difference, just delete all and recreate
      if (!scheduleData || scheduleData.length <= (oldTotalDoses - newTotalDoses)) {
        return await deleteMedicationScheduleTimes(oldMedication.id);
      }
      
      // Keep entries up to the new dose count, remove the rest
      const entriesToKeep = scheduleData.slice(0, newTotalDoses);
      const entriesToDelete = scheduleData.slice(newTotalDoses);
      
      if (entriesToDelete.length === 0) {
        return true; // Nothing to delete
      }
      
      // Extract IDs of entries to delete
      const idsToDelete = entriesToDelete.map(entry => entry.id);
      
      // Delete excess entries from medication_schedule_times ONLY
      const { error: deleteError } = await supabase
        .from('medication_schedule_times')
        .delete()
        .in('id', idsToDelete);
        
      if (deleteError) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAddMedication = async () => {
    if (!validateMedicationInput()) return;

    try {
      // If no start date is provided, use today's date
      if (!newMedication.data_inicio) {
        const today = new Date().toISOString().split('T')[0];
        newMedication.data_inicio = today;
      }
      
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
        
        // Update the medication in pills_warning table
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

        // Update UI
        setMedications(medications.map(med => 
          med.id === selectedMedication.id ? { ...med, ...medicationData } : med
        ));
        
        // Always delete all existing schedule entries and create new ones when editing
        try {
          // Delete all existing schedule entries for this medication
          const deleteResult = await deleteMedicationScheduleTimes(selectedMedication.id);
          
          if (deleteResult) {
            // Create new schedule entries based on updated medication data
            await saveMedicationScheduleTimes(medicationData);
            console.log('Schedule times updated successfully');
          } else {
            console.log('Failed to delete old schedule times');
          }
        } catch (scheduleError) {
          // Silent error handling
        }

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
        const savedMedication = data[0];
        setMedications([...medications, savedMedication]);
        
        // IMEDIATAMENTE salva os horários aqui - alteração crucial
        console.log('Iniciando salvamento automático dos horários de agendamento...');
        try {
          // Garantir que a medicação tenha todos os campos necessários
          if (!savedMedication.id || !savedMedication.user_id) {
            console.error('Medicação salva não tem id ou user_id', savedMedication);
            Alert.alert('Erro', 'Falha ao obter dados completos da medicação.');
            return;
          }
          
          const result = await saveMedicationScheduleTimes(savedMedication);
          console.log('Resultado do salvamento automático:', result);
          
          if (result.success) {
            console.log('Horários salvos automaticamente:', result.message);
            
            // Agora vamos adicionar ao calendário 
            try {
              await addToCalendarDirectly(savedMedication);
              Alert.alert('Sucesso', `Medicação ${savedMedication.titulo} criada, ${result.message} e eventos adicionados ao calendário.`);
            } catch (calendarError) {
              console.error('Erro ao adicionar ao calendário:', calendarError);
              Alert.alert('Sucesso Parcial', `Medicação ${savedMedication.titulo} criada e ${result.message}, mas não foi possível adicionar ao calendário.`);
            }
          } else {
            console.error('Falha ao salvar horários:', result.message);
            Alert.alert('Atenção', `Medicação criada, mas ocorreu um problema ao salvar os horários: ${result.message}`);
          }
        } catch (error) {
          console.error('Exceção no salvamento automático:', error);
          Alert.alert('Erro', `Medicação criada, mas ocorreu um erro ao salvar horários: ${error.message}`);
        }
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
      setSelectedMedication(null);

    } catch (error) {
      console.error('Exception saving medication:', error);
      Alert.alert('Error', `An error occurred: ${error.message}`);
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

      // Agrupar eventos pelo mesmo horário
      const groupedEvents = {};
      pendingEvents.forEach(event => {
        const timeKey = event.startDate.toISOString();
        if (!groupedEvents[timeKey]) {
          groupedEvents[timeKey] = [];
        }
        groupedEvents[timeKey].push(event);
      });

      // Criar schedule items organizados
      const scheduleItemsToSave = [];
      
      Object.keys(groupedEvents).forEach(timeKey => {
        const eventsAtTime = groupedEvents[timeKey];
        const firstEvent = eventsAtTime[0];
        const eventDate = new Date(firstEvent.startDate);
        const timeStr = eventDate.toTimeString().split(' ')[0]; // HH:MM:SS
        
        // Se houver múltiplos eventos no mesmo horário, combinar notas
        if (eventsAtTime.length > 1) {
          const combinedNotes = eventsAtTime.map(e => e.notes).join(' + ');
          scheduleItemsToSave.push({
            date: eventDate.toLocaleDateString(),
            time: eventDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
            notes: `Múltiplos medicamentos: ${combinedNotes}`,
            rawDate: eventDate.toISOString().split('T')[0],
            rawTime: timeStr,
            fullDatetime: eventDate.toISOString(),
            isCombined: true,
            originalEvents: eventsAtTime
          });
        } else {
          // Caso único evento no horário
          scheduleItemsToSave.push({
            date: eventDate.toLocaleDateString(),
            time: eventDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
            notes: firstEvent.notes,
            rawDate: eventDate.toISOString().split('T')[0],
            rawTime: timeStr,
            fullDatetime: eventDate.toISOString(),
            isCombined: false,
            originalEvents: [firstEvent]
          });
        }
      });

      // Ordenar por horário
      scheduleItemsToSave.sort((a, b) => new Date(a.fullDatetime) - new Date(b.fullDatetime));

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

      let savedSchedulesCount = 0;
      const eventIds = [];

      // Collect all schedule entries to save
      const schedulesToSave = [];
      
      // Process each calendar item
      for (const item of scheduleItems) {
        // For each original event in the group
          for (const event of item.originalEvents) {
            const eventDate = new Date(event.startDate);
            
          // Create entry for medication_schedule_times
            const scheduleData = {
              pill_id: selectedMedication.id,
              scheduled_date: eventDate.toISOString().split('T')[0],
              scheduled_time: eventDate.toTimeString().split(' ')[0],
              complete_datetime: eventDate.toISOString(),
              dosage: event.notes ? event.notes.replace('Tome ', '').replace(' comprimido(s)', '') : null,
              user_id: userId,
              status: 'pending',
              notes: event.notes || 'Agendado via CalendarScreen'
            };

          schedulesToSave.push(scheduleData);
        }

        // Create calendar events
        const firstEvent = item.originalEvents[0];
        
        // Handle combined or individual events
        if (item.isCombined) {
          const titles = item.originalEvents.map(e => e.title);
          const uniqueTitles = [...new Set(titles)];
          const combinedTitle = uniqueTitles.join(' + ');
          const combinedNotes = item.originalEvents.map(e => e.notes).join('\n');
          
          const eventDetails = {
            title: combinedTitle,
            startDate: new Date(firstEvent.startDate),
            endDate: new Date(firstEvent.endDate),
            notes: combinedNotes,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            alarms: [{ relativeOffset: -15 }]
          };
          
          const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
          eventIds.push(eventId);
        } else {
          const eventDetails = {
            ...firstEvent,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            alarms: [{ relativeOffset: -15 }]
          };
          
          const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
          eventIds.push(eventId);
        }
      }

      // Batch insert all schedules to medication_schedule_times
      if (schedulesToSave.length > 0) {
        // First check for existing entries to avoid duplicates
        const uniqueSchedules = [];
        
        for (const schedule of schedulesToSave) {
          const { data: existing } = await supabase
            .from('medication_schedule_times')
            .select('id')
            .eq('pill_id', schedule.pill_id)
            .eq('scheduled_date', schedule.scheduled_date)
            .eq('scheduled_time', schedule.scheduled_time)
            .maybeSingle();
          
          if (!existing) {
            uniqueSchedules.push(schedule);
          }
        }
        
        if (uniqueSchedules.length > 0) {
          const { data, error } = await supabase
            .from('medication_schedule_times')
            .insert(uniqueSchedules);
          
          if (!error) {
            savedSchedulesCount = uniqueSchedules.length;
          }
        }
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
      Alert.alert('Erro', 'Não foi possível salvar todos os agendamentos.');
    } finally {
      setScheduleConfirmModal(false);
      setPendingEvents([]);
      setSelectedMedication(null);
      setScheduleItems([]);
    }
  };

  // Function to save medication schedule times
  const saveMedicationScheduleTimes = async (medication) => {
    try {
      console.log('Iniciando salvamento de horários para medicação:', medication.id);
      
      const { 
        id, 
        user_id, 
        titulo, 
        quantidade_comprimidos, 
        quantidade_comprimidos_por_vez, 
        intervalo_horas, 
        horario_fixo, 
        data_inicio,
        data_fim
      } = medication;

      // Parse the start date
      let baseDate = new Date();
      let initialHour = null;
      
      if (data_inicio && data_inicio.includes(';')) {
        const [dateStr, timeStr] = data_inicio.split(';');
        baseDate = new Date(dateStr.trim());
        initialHour = timeStr?.trim();
        console.log('Data de início:', dateStr.trim(), 'Horário inicial:', initialHour);
      } else if (data_inicio) {
        baseDate = new Date(data_inicio);
        console.log('Data de início (sem hora):', data_inicio);
      }
      
      if (isNaN(baseDate.getTime())) {
        console.log('Data de início inválida, usando data atual');
        baseDate = new Date();
      }

      const scheduleTimes = [];
      const totalDoses = Math.ceil(quantidade_comprimidos / quantidade_comprimidos_por_vez);
      let remainingDoses = totalDoses;

      console.log(`Calculando ${totalDoses} doses totais para ${quantidade_comprimidos} comprimidos com ${quantidade_comprimidos_por_vez} por vez`);

      // Generate schedule times based on medication type
      if (horario_fixo && horario_fixo !== 'NULL') {
        // Handle fixed time schedules
        const fixedTimes = horario_fixo.split(';').map(time => time.trim()).filter(time => time);
        
        console.log('Modo horário fixo. Horários:', fixedTimes);
        
        if (fixedTimes.length === 0) {
          console.error('Nenhum horário fixo válido encontrado');
          return { success: false, message: 'Horários fixos inválidos.' };
        }

        let currentDay = 0;
        
        while (remainingDoses > 0) {
          for (let timeIndex = 0; timeIndex < fixedTimes.length; timeIndex++) {
            if (remainingDoses <= 0) break;
            
            const time = fixedTimes[timeIndex];
            if (!time.includes(':')) {
              console.log(`Horário inválido ignorado: ${time}`);
              continue;
            }
            
            const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
            
            const eventDate = new Date(baseDate);
            eventDate.setDate(baseDate.getDate() + currentDay);
            eventDate.setHours(hours, minutes, 0, 0);
            
            if (data_fim && new Date(data_fim) < eventDate) {
              console.log('Data final atingida, interrompendo cálculo');
              remainingDoses = 0;
              break;
            }
            
            const dosePills = Math.min(quantidade_comprimidos_por_vez, remainingDoses);
            
            console.log(`Agendando para ${eventDate.toISOString()}, dose: ${dosePills}`);
            
            scheduleTimes.push({
              pill_id: id,
              scheduled_date: eventDate.toISOString().split('T')[0],
              scheduled_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`,
              complete_datetime: eventDate.toISOString(),
              dosage: dosePills.toString(),
              user_id: user_id,
              status: 'pending',
              notes: `Tome ${dosePills} comprimido(s)`
            });
            
            remainingDoses--;
          }
          
          currentDay++;
          
          if (currentDay > 365) {
            console.log('Excedeu limite de dias, interrompendo cálculo');
            return { success: false, message: 'Número excessivo de dias. Verifique a configuração do medicamento.' };
          }
        }
      } else if (intervalo_horas && intervalo_horas !== 'NULL') {
        // Handle interval-based schedules
        console.log('Modo intervalo de horas:', intervalo_horas);
        
        let startTime = new Date(baseDate);
        if (initialHour) {
          // Certifique-se de que o formato da hora é válido (HH:MM)
          if (initialHour.includes(':')) {
          const [hours, minutes] = initialHour.split(':').map(num => parseInt(num, 10));
          startTime.setHours(hours, minutes, 0, 0);
            console.log(`Horário inicial definido para ${hours}:${minutes}`);
          } else {
            console.log('Formato de horário inicial inválido, usando hora atual');
          }
        } else {
          console.log('Nenhum horário inicial definido, usando hora atual');
        }
        
        const intervalHours = parseInt(intervalo_horas);
        
        if (isNaN(intervalHours) || intervalHours <= 0) {
          console.error('Intervalo de horas inválido:', intervalo_horas);
          return { success: false, message: 'Intervalo de horas inválido.' };
        }
        
        console.log(`Calculando doses com intervalo de ${intervalHours} horas a partir de ${startTime.toISOString()}`);
        
        for (let i = 0; i < totalDoses; i++) {
          const intervalMillis = intervalHours * 60 * 60 * 1000;
          const eventTime = new Date(startTime.getTime() + i * intervalMillis);
          
          if (data_fim && new Date(data_fim) < eventTime) {
            console.log('Data final atingida, interrompendo cálculo');
            break;
          }
          
          const dosePills = Math.min(quantidade_comprimidos_por_vez, remainingDoses);
          remainingDoses -= dosePills;
          
          const hours = eventTime.getHours();
          const minutes = eventTime.getMinutes();
          
          console.log(`Agendando para ${eventTime.toISOString()}, dose: ${dosePills}`);
          
          scheduleTimes.push({
            pill_id: id,
            scheduled_date: eventTime.toISOString().split('T')[0],
            scheduled_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`,
            complete_datetime: eventTime.toISOString(),
            dosage: dosePills.toString(),
            user_id: user_id,
            status: 'pending',
            notes: `Tome ${dosePills} comprimido(s)`
          });
        }
      }

      if (scheduleTimes.length === 0) {
        console.error('Nenhum horário calculado');
        return { success: false, message: 'Não foi possível calcular os horários para este medicamento.' };
      }

      console.log(`Inserindo ${scheduleTimes.length} horários na tabela para pill_id ${id}`);
      
      // Log schedule times for debugging
      scheduleTimes.forEach((time, index) => {
        console.log(`Horário ${index+1}:`, time.scheduled_date, time.scheduled_time, time.pill_id);
      });
      
      // Insert all new schedule times
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .insert(scheduleTimes);

      if (error) {
        console.error('Erro na inserção:', error);
        return { success: false, message: `Erro ao salvar horários: ${error.message}` };
      }

      // Update medication status to indicate schedule times are saved
      await supabase
        .from('pills_warning')
        .update({ all_schedules_saved: true })
        .eq('id', id);
        
      console.log(`${scheduleTimes.length} horários salvos com sucesso!`);

      return { success: true, message: `${scheduleTimes.length} horários salvos com sucesso.` };
    } catch (error) {
      console.error('Exceção ao salvar horários:', error);
      return { success: false, message: `Erro: ${error.message}` };
    }
  };

  // Function to delete medication schedule times
  const deleteMedicationScheduleTimes = async (medicationId) => {
    try {
      // Explicitly delete all entries matching the pill_id
      const { error } = await supabase
        .from('medication_schedule_times')
        .delete()
        .eq('pill_id', medicationId);
      
      if (error) {
        console.log(`Failed to delete schedule times for pill ID ${medicationId}: ${error.message}`);
        return false;
      }
      
      console.log(`Successfully deleted all schedule times for pill ID ${medicationId}`);
      return true;
    } catch (error) {
      console.log(`Exception deleting schedule times: ${error.message}`);
      return false;
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

  const addToCalendarDirectly = async (medication) => {
    try {
      console.log('Adicionando eventos ao calendário para medicação:', medication.id);
      
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão de calendário não concedida');
        return;
      }

      const { 
        id,
        titulo, 
        quantidade_comprimidos, 
        quantidade_comprimidos_por_vez, 
        intervalo_horas, 
        horario_fixo, 
        data_inicio,
        data_fim
      } = medication;

      // Parse the start date
      let baseDate = new Date();
      let initialHour = null;
      
      if (data_inicio && data_inicio.includes(';')) {
        const [dateStr, timeStr] = data_inicio.split(';');
        baseDate = new Date(dateStr.trim());
        initialHour = timeStr?.trim();
        console.log('Data de início para calendário:', dateStr.trim(), 'Horário inicial:', initialHour);
      } else if (data_inicio) {
        baseDate = new Date(data_inicio);
      }
      
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }

      const events = [];
      const totalDoses = Math.ceil(quantidade_comprimidos / quantidade_comprimidos_por_vez);
      let remainingDoses = totalDoses;

      // Calcular eventos baseados no tipo de agendamento
      if (horario_fixo && horario_fixo !== 'NULL') {
        const fixedTimes = horario_fixo.split(';').map(time => time.trim()).filter(time => time);
        
        if (fixedTimes.length === 0) {
          console.log('Nenhum horário fixo válido para calendário');
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
            
            const dosePills = Math.min(quantidade_comprimidos_por_vez, remainingDoses);
            
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
            console.log('Número excessivo de dias para calendário');
            break;
          }
        }
      } else if (intervalo_horas && intervalo_horas !== 'NULL') {
        let startTime = new Date(baseDate);
        if (initialHour) {
          if (initialHour.includes(':')) {
            const [hours, minutes] = initialHour.split(':').map(num => parseInt(num, 10));
            startTime.setHours(hours, minutes, 0, 0);
          }
        }
        
        const intervalHours = parseInt(intervalo_horas);
        
        if (isNaN(intervalHours) || intervalHours <= 0) {
          console.log('Intervalo de horas inválido para calendário');
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
        console.log('Nenhum evento calculado para o calendário');
        return;
      }

      console.log(`Adicionando ${events.length} eventos ao calendário`);

      // Get calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (calendars.length === 0) {
        console.log('Nenhum calendário disponível');
        return;
      }
      
      const defaultCalendar = calendars.find(cal => 
        cal.accessLevel === Calendar.CalendarAccessLevel.OWNER && 
        cal.source.name === 'Default'
      ) || calendars[0];
      
      console.log('Usando calendário:', defaultCalendar.title);

      // Add all events directly to calendar
      let addedCount = 0;
      for (const event of events) {
        try {
          await Calendar.createEventAsync(defaultCalendar.id, {
            ...event,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            alarms: [{ relativeOffset: -15 }]
          });
          addedCount++;
        } catch (eventError) {
          console.log('Erro ao adicionar evento:', eventError);
        }
      }

      // Update medication status silently
      await supabase
        .from('pills_warning')
        .update({ 
          status: 'calendar_added'
        })
        .eq('id', id);
      
      console.log(`Adicionados ${addedCount} de ${events.length} eventos ao calendário automaticamente`);
      return true;
    } catch (error) {
      console.log('Erro ao adicionar ao calendário:', error);
      return false;
    }
  };

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
          contentContainerStyle={[styles.listContainer, { paddingBottom: 200 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => {
          // Reset selected medication when adding new one
          setSelectedMedication(null);
          setFixedTimes([]);
          setIntervalStartTime('');
          setSelectedScheduleType('interval');
          setNewMedication({
            titulo: '',
            quantidade_comprimidos: '',
            quantidade_comprimidos_por_vez: '',
            data_inicio: '',
            intervalo_horas: null,
            horario_fixo: '',
            data_fim: '',
          });
          setModalVisible(true);
        }}
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
                    <Text style={styles.inputLabel}>Data de Início (opcional)</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButtonEnhanced}
                      onPress={() => { setShowDatePicker(true); setDateType('start'); }}
                    >
                      <Ionicons name="calendar" size={20} color="#3498db" />
                      <Text style={styles.datePickerTextEnhanced}>
                        {newMedication.data_inicio || 'Usar data atual'}
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
                  <View style={styles.eventItemHeader}>
                    <Text style={styles.eventDate}>
                      {event.startDate.toLocaleDateString()}
                    </Text>
                    <Text style={styles.eventTime}>
                      {event.startDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </Text>
                  </View>
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
                <View key={index} style={[
                  styles.scheduleItem,
                  item.isCombined && styles.combinedScheduleItem
                ]}>
                  <View style={styles.scheduleDateTimeContainer}>
                    <Text style={styles.scheduleDate}>{item.date}</Text>
                    <Text style={styles.scheduleTime}>{item.time}</Text>
                  </View>
                  {item.isCombined ? (
                    <View>
                      <Text style={styles.combinedScheduleTitle}>Múltiplos medicamentos no mesmo horário:</Text>
                      {item.originalEvents.map((event, eventIdx) => (
                        <Text key={eventIdx} style={styles.scheduleNotes}>• {event.notes}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.scheduleNotes}>{item.notes}</Text>
                  )}
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
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 40, paddingBottom: 80 },
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
  eventItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
  notificationButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    backgroundColor: '#3498db',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 999,
  },
  todayMedsList: {
    flex: 1,
    marginVertical: 10,
  },
  timeGroupContainer: {
    marginBottom: 20,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeLineBefore: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  timeGroupTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
    paddingHorizontal: 10,
  },
  timeLineAfter: {
    flex: 2,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 10,
  },
  todayMedItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayMedItemInfo: {
    flex: 1,
  },
  todayMedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  todayMedDosage: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  takeMedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f8f5',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  takeMedButtonText: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  undoTakeMedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdedec',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  undoTakeMedButtonText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyMedsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyMedsText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 10,
    textAlign: 'center',
  },
  combinedScheduleItem: {
    borderLeftColor: '#e74c3c',
    backgroundColor: '#fef9e7',
  },
  combinedScheduleTitle: {
    fontWeight: 'bold',
    color: '#e74c3c',
    fontSize: 14,
    marginBottom: 5,
  },
  todayMedItemTaken: {
    backgroundColor: '#e8f8f5',
    borderLeftColor: '#2ecc71',
  },
  takenStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  takenStatusText: {
    fontSize: 14,
    color: '#2ecc71',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  todayMedActions: {
    marginTop: 8,
  },
});

export default CalendarScreen;