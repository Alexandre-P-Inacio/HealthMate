import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import Navbar from '../Components/Navbar';
import DataUser from '../../navigation/DataUser';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const [userData, setUserData] = useState({
    fullname: '',
    profilePicture: ''
  });
  const [medications, setMedications] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [isLoading, setIsLoading] = useState(true);
  const [missedMedication, setMissedMedication] = useState(null);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [todayMedicationsModal, setTodayMedicationsModal] = useState(false);
  const [todayMedications, setTodayMedications] = useState([]);
  const [calendarView, setCalendarView] = useState('day'); // 'day', 'week', 'month'
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigation = useNavigation();
  const hourlyScrollViewRef = useRef(null);
  const hourRowHeight = 70; // Definir altura fixa de cada linha de hora para cálculos precisos
  const [pulseAnimation, setPulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    fetchUserData();
    checkMissedMedications();
    getTodayMedicationStats();
    checkPendingMedications();
    
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
      checkMissedMedications();
      checkPendingMedications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  useEffect(() => {
    // Create pulsing effect for notification button when there are pending medications
    if (notificationCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animation when there are no notifications
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [notificationCount]);

  const goToCurrentHourAndDay = () => {
    // Get current date and hour
    const today = new Date();
    const nowHour = today.getHours();
    
    // First update state
    setSelectedDate(today);
    setCurrentHour(nowHour);
    
    // Then scroll in a separate cycle after state updates
    setTimeout(() => {
      // Direct approach - use calculated offset which is most reliable
      if (hourlyScrollViewRef.current) {
        const hourHeight = 70; // Height of each hour row
        
        // Scroll to position the current hour row at the top of the visible area
        hourlyScrollViewRef.current.scrollToOffset({
          offset: nowHour * hourHeight,
          animated: false // First jump instantly to correct position
        });
        
        // Slight delay to ensure the initial jump happened
        setTimeout(() => {
          // Refresh events after date change
          fetchEvents();
        }, 50);
      }
    }, 50);
  };

  const onScrollToIndexFailed = (info) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      if (hourlyScrollViewRef.current) {
        const validIndex = Math.min(info.highestMeasuredFrameIndex, currentHour);
        if (validIndex >= 0) {
          hourlyScrollViewRef.current.scrollToIndex({
            index: validIndex,
            animated: true
          });
        } else {
          hourlyScrollViewRef.current.scrollToOffset({
            offset: 0,
            animated: true
          });
        }
      }
    });
  };

  const fetchUserData = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      
      if (!userId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUserData({
          fullname: data.fullname || 'User',
          profilePicture: data.pfpimg ? `data:image/jpeg;base64,${data.pfpimg}` : null
        });
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase.from('pills_warning').select('*');
      if (error) throw error;
      setMedications(data || []);
      return data || [];
    } catch (error) {
      return [];
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'doctor')
        .limit(2);

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
    }
  };

  const fetchEvents = async () => {
    try {
      setIsRefreshing(true);
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) {
        setIsRefreshing(false);
        return;
      }

      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select(`
          id,
          pill_id,
          scheduled_date,
          scheduled_time,
          dosage,
          notes,
          complete_datetime,
          status,
          user_id,
          pills_warning (
            id,
            titulo,
            quantidade_comprimidos,
            quantidade_comprimidos_por_vez
          )
        `)
        .eq('user_id', userId)
        .eq('scheduled_date', formattedDate);

      if (error) {
        setIsRefreshing(false);
        return;
      }

      const { data: confirmations, error: confirmError } = await supabase
        .from('medication_confirmations')
        .select('pill_id, confirmation_date')
        .eq('user_id', userId)
        .eq('confirmation_date', formattedDate)
        .eq('taken', true);

      if (confirmError) {
      }

      const calendarEvents = data.map(item => {
        const isTaken = confirmations?.some(conf => 
          conf.pill_id === item.pill_id && conf.confirmation_date === item.scheduled_date
        ) || item.status === 'taken' || false;

        const timeComponents = item.scheduled_time?.split(':') || ['08', '00', '00'];
        const hours = parseInt(timeComponents[0], 10);
        const minutes = parseInt(timeComponents[1], 10);
        const seconds = parseInt(timeComponents[2], 10);

        const eventDate = new Date(item.scheduled_date);
        eventDate.setHours(hours, minutes, seconds, 0);
        
        return {
          id: item.id,
          title: item.pills_warning?.titulo || 'Medicamento',
          startDate: eventDate.toISOString(),
          endDate: new Date(eventDate.getTime() + 30 * 60000).toISOString(),
          notes: `Dose: ${item.dosage || item.pills_warning?.quantidade_comprimidos_por_vez || 1} comprimido(s)`,
          scheduledDate: item.scheduled_date,
          scheduledTime: item.scheduled_time,
          pill_id: item.pill_id,
          isTaken: isTaken,
          status: item.status || 'pending',
          allDay: false,
          color: isTaken ? '#2ECC71' : '#6A8DFD'
        };
      });

      setEvents(calendarEvents);
      setIsRefreshing(false);
    } catch (error) {
      setIsRefreshing(false);
    }
  };

  const checkMissedMedications = async () => {
    const medsList = await fetchMedications();
    const now = new Date();
    
    for (const med of medsList) {
      if (med.data_inicio) {
        const medTime = new Date(med.data_inicio);
        
        if (medTime.getDate() === now.getDate() && 
            medTime.getMonth() === now.getMonth() && 
            medTime.getFullYear() === now.getFullYear() && 
            medTime.getHours() < now.getHours()) {
            
          const { data } = await supabase
            .from('medication_confirmations')
            .select('*')
            .eq('pill_id', med.id)
            .eq('confirmation_date', now.toISOString().split('T')[0])
            .single();
            
          if (!data) {
            setMissedMedication(med);
            setShowMedicationModal(true);
            break;
          }
        }
      }
    }
  };

  const handleMedicationResponse = async (taken) => {
    if (missedMedication) {
      try {
        await supabase.from('medication_confirmations').insert({
          pill_id: missedMedication.id,
          taken: taken,
          confirmation_date: new Date().toISOString().split('T')[0],
          confirmation_time: new Date().toISOString()
        });
        
        if (taken) {
          await supabase
            .from('pills_warning')
            .update({ last_taken: new Date().toISOString() })
            .eq('id', missedMedication.id);
        }
        
        Alert.alert(
          'Thank you!', 
          taken ? 'We recorded that you took your medication.' : 'We recorded that you missed your medication.'
        );
        
      } catch (error) {
      }
    }
    
    setShowMedicationModal(false);
    setMissedMedication(null);
  };

  const getNextDays = (numDays) => {
    const today = new Date();
    const days = Array.from({ length: numDays }, (_, i) => {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i - 2); // Começar 2 dias antes de hoje
      return nextDay;
    });
    return days;
  };

  const getAllHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  const calculateAndSaveMedicationSchedule = async (medicationData, userId) => {
    try {
      if (!medicationData.id || !userId) {
        return { error: 'Dados incompletos' };
      }

      const scheduledTimes = [];
      
      const now = new Date();
      let startDate = medicationData.data_inicio ? new Date(medicationData.data_inicio) : now;
      
      if (startDate < now) {
        startDate = now;
      }
      
      const endDate = medicationData.data_fim ? new Date(medicationData.data_fim) : null;
      
      if (medicationData.recurrence === 'daily' || !medicationData.recurrence) {
        const daysToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 
          30;
        
        for (let day = 0; day < daysToCalculate; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + day);
          
          if (medicationData.horario_fixo) {
            const hours = medicationData.horario_fixo.split(';');
            for (const hourStr of hours) {
              const [hour, minute] = hourStr.trim().split(':').map(Number);
              const datetime = new Date(currentDate);
              datetime.setHours(hour, minute, 0, 0);
              
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          } 
          else if (medicationData.intervalo_horas) {
            const intervalo = parseInt(medicationData.intervalo_horas);
            const startHour = medicationData.hora_inicio || 8;
            
            for (let hour = startHour; hour < 24; hour += intervalo) {
              const datetime = new Date(currentDate);
              datetime.setHours(hour, 0, 0, 0);
              
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          }
          else {
            const datetime = new Date(currentDate);
            datetime.setHours(8, 0, 0, 0);
            
            if (datetime > now) {
              scheduledTimes.push(datetime.toISOString());
            }
          }
        }
      } 
      else if (medicationData.recurrence === 'weekly') {
        const weeksToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7)) : 
          4;
        
        const selectedDays = medicationData.days_of_week || [1, 3, 5];
        
        for (let week = 0; week < weeksToCalculate; week++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          
          for (const dayOfWeek of selectedDays) {
            const currentDate = new Date(weekStart);
            const currentDayOfWeek = currentDate.getDay();
            const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
            
            currentDate.setDate(currentDate.getDate() + daysToAdd);
            
            if (medicationData.horario_fixo) {
              const hours = medicationData.horario_fixo.split(';');
              for (const hourStr of hours) {
                const [hour, minute] = hourStr.trim().split(':').map(Number);
                const datetime = new Date(currentDate);
                datetime.setHours(hour, minute, 0, 0);
                
                if (datetime > now) {
                  scheduledTimes.push(datetime.toISOString());
                }
              }
            } else {
              const datetime = new Date(currentDate);
              datetime.setHours(8, 0, 0, 0);
              
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          }
        }
      }
      else if (medicationData.recurrence === 'once') {
        const datetime = new Date(medicationData.schedule_date || startDate);
        
        if (medicationData.schedule_time) {
          const [hour, minute] = medicationData.schedule_time.split(':').map(Number);
          datetime.setHours(hour, minute, 0, 0);
        } else {
          datetime.setHours(8, 0, 0, 0);
        }
        
        if (datetime > now) {
          scheduledTimes.push(datetime.toISOString());
        }
      }
      
      const results = [];
      for (const scheduledTime of scheduledTimes) {
        const { data: existing, error: checkError } = await supabase
          .from('medication_confirmations')
          .select('id')
          .eq('pill_id', medicationData.id)
          .eq('scheduled_time', scheduledTime)
          .maybeSingle();
        
        if (checkError) {
          continue;
        }
        
        if (!existing) {
          const confirmationData = {
            pill_id: medicationData.id,
            scheduled_time: scheduledTime,
            user_id: userId,
            taken: null,
            notes: 'Agendado automaticamente',
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('medication_confirmations')
            .insert(confirmationData)
            .select('id');
          
          if (error) {
          } else {
            results.push(data[0]);
          }
        } else {
          results.push(existing);
        }
      }
      
      return { data: results };
    } catch (error) {
      return { error };
    }
  };

  const handleSaveMedication = async (medicationData) => {
    try {
      const { data, error } = await supabase
        .from('pills_warning')
        .upsert(medicationData)
        .select('id');
      
      if (error) throw error;
      
      const medicationId = data[0].id;
      
      const userData = DataUser.getUserData();
      const userId = userData.id;
      
      await calculateAndSaveMedicationSchedule({
        ...medicationData,
        id: medicationId
      }, userId);
      
      Alert.alert('Sucesso', 'Medicamento salvo e todos os horários agendados');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o medicamento');
    }
  };

  const checkPlatform = () => {
    const platform = Platform.OS;
    console.log('Plataforma detectada:', platform);
    return platform;
  };

  const fetchTodayMedications = async () => {
    const userId = DataUser.getUserData()?.id;
    if (!userId) {
      Alert.alert('Erro', 'Usuário não identificado. Por favor, faça login novamente.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get the current device date in YYYY-MM-DD format
      const now = new Date();
      const deviceDate = now.toISOString().split('T')[0];
      
      console.log('===== INICIANDO BUSCA DE MEDICAMENTOS DO DIA =====');
      console.log('Data atual do dispositivo:', now);
      console.log('Data formatada para consulta:', deviceDate);
      console.log('ID do usuário:', userId);
      
      // Busca todos os medicamentos na tabela pills_warning associados ao usuário
      const { data: pillsData, error: pillsError } = await supabase
        .from('pills_warning')
        .select('*')
        .eq('user_id', userId);
        
      if (pillsError) {
        console.log('Erro ao buscar pills_warning:', pillsError);
        return;
      }
      
      console.log(`Encontrados ${pillsData?.length || 0} medicamentos na tabela pills_warning`);
      
      // Filtrar medicamentos de teste
      const validPillsData = pillsData?.filter(pill => {
        // Skip test or invalid medications
        if (!pill.titulo || 
            pill.titulo.toLowerCase().includes('test')) {
          console.log(`Skipping test pill: ${pill.titulo}`);
          return false;
        }
        return true;
      });
      
      // Extrair IDs de todos os medicamentos válidos
      const pillIds = validPillsData.map(pill => pill.id);
      console.log(`IDs de medicamentos válidos: ${pillIds.join(', ')}`);
      
      // Buscar todos os agendamentos para esses medicamentos
      const { data: allSchedules, error: allSchedulesError } = await supabase
        .from('medication_schedule_times')
        .select(`
          id,
          pill_id,
          scheduled_date,
          scheduled_time,
          dosage,
          notes,
          complete_datetime,
          status,
          user_id,
          pills_warning (
            id,
            titulo,
            quantidade_comprimidos,
            quantidade_comprimidos_por_vez
          )
        `)
        .eq('user_id', userId)
        .in('pill_id', pillIds.length > 0 ? pillIds : [0]);
        
      if (allSchedulesError) {
        console.log('Erro ao buscar agendamentos:', allSchedulesError);
        return;
      }
      
      console.log(`Encontrados ${allSchedules?.length || 0} agendamentos para medicamentos do usuário`);
      
      // Filtrar apenas agendamentos para a data atual do dispositivo
      const scheduleData = allSchedules?.filter(item => item.scheduled_date === deviceDate);
      
      console.log(`Encontrados ${scheduleData?.length || 0} medicamentos agendados para hoje (${deviceDate})`);
      
      // Get confirmation records for TODAY ONLY - data do dispositivo exata
      const { data: confirmations, error: confirmError } = await supabase
        .from('medication_confirmations')
        .select('pill_id, confirmation_date, confirmation_time')
        .eq('user_id', userId)
        .eq('confirmation_date', deviceDate) // Strict match with device date
        .eq('taken', true);
      
      if (confirmError) {
        console.log('Erro ao buscar confirmações:', confirmError);
      }
      
      const medicationsByTime = {};
      
      // Filter valid schedule data (exclude test data and enforce date match)
      const validScheduleData = scheduleData?.filter(item => {
        // Skip test or invalid medications
        if (!item.pills_warning?.titulo || 
            item.pills_warning?.titulo.toLowerCase().includes('test')) {
          console.log(`Skipping test medication: ${item.pills_warning?.titulo}`);
          return false;
        }
        
        // Double check date matches device date exactly
        if (item.scheduled_date !== deviceDate) {
          console.log(`Skipping medication with non-matching date: ${item.scheduled_date} vs ${deviceDate}`);
          return false;
        }
        
        console.log(`Medicamento válido: ${item.pills_warning?.titulo} para a data: ${item.scheduled_date}`);
        return true;
      });
      
      // Add medications from schedule for TODAY ONLY
      if (validScheduleData && validScheduleData.length > 0) {
        validScheduleData.forEach(item => {
          const timeKey = item.scheduled_time;
          if (!medicationsByTime[timeKey]) {
            medicationsByTime[timeKey] = [];
          }
          
          const medScheduledTime = new Date(`${item.scheduled_date}T${item.scheduled_time}`);
          const canTake = medScheduledTime <= now;
          const isTaken = confirmations?.some(conf => 
            conf.pill_id === item.pill_id && conf.confirmation_date === deviceDate
          ) || item.status === 'taken' || false;
          
          const confirmation = confirmations?.find(conf => 
            conf.pill_id === item.pill_id && conf.confirmation_date === deviceDate
          );
          
          medicationsByTime[timeKey].push({
            id: item.id,
            pillId: item.pill_id,
            scheduledTime: item.scheduled_time,
            scheduledDate: item.scheduled_date,
            completeDatetime: item.complete_datetime,
            confirmationTime: confirmation?.confirmation_time || null,
            dosage: item.dosage,
            notes: item.notes,
            title: item.pills_warning?.titulo || 'Medicamento',
            quantidade: item.pills_warning?.quantidade_comprimidos || 0,
            dosePorVez: item.pills_warning?.quantidade_comprimidos_por_vez || 0,
            isTaken: isTaken,
            canTake: canTake,
            status: item.status || 'pending'
          });
        });
      }
      
      // Também verificar medicamentos da tabela pills_warning que ainda não estão agendados
      // mas que deveriam ser tomados hoje de acordo com a frequência
      try {
        if (validPillsData && validPillsData.length > 0) {
          validPillsData.forEach(pill => {
            try {
              // Check if this pill should be taken today based on frequency and start date
              const shouldTakeToday = shouldTakePillToday(pill, deviceDate);
              if (!shouldTakeToday) {
                console.log(`Pill ${pill.titulo} should not be taken today according to schedule`);
                return;
              }
              
              // Verify this medication isn't already added from the schedule
              const alreadyScheduled = Object.values(medicationsByTime).flat().some(
                med => med.pillId === pill.id
              );
              
              if (!alreadyScheduled) {
                // Define a default time if none exists
                let timeKey = pill.horario_fixo ? 
                  pill.horario_fixo.split(';')[0].trim() : 
                  '08:00:00';
                
                if (!medicationsByTime[timeKey]) {
                  medicationsByTime[timeKey] = [];
                }
                
                const pillScheduledTime = new Date(`${deviceDate}T${timeKey}`);
                const canTake = pillScheduledTime <= now;
                const isTaken = confirmations?.some(conf => 
                  conf.pill_id === pill.id && conf.confirmation_date === deviceDate
                );
                
                medicationsByTime[timeKey].push({
                  id: `pill-${pill.id}`,
                  pillId: pill.id,
                  scheduledTime: timeKey,
                  scheduledDate: deviceDate,
                  title: pill.titulo,
                  quantidade: pill.quantidade_comprimidos || 0,
                  dosePorVez: pill.quantidade_comprimidos_por_vez || 1,
                  dosage: `${pill.quantidade_comprimidos_por_vez || 1} comprimido(s)`,
                  isTaken: isTaken || false,
                  canTake: canTake,
                  status: 'pending'
                });
              }
            } catch (pillError) {
              console.log(`Erro ao processar medicamento ${pill.titulo}: ${pillError.message}`);
            }
          });
        }
      } catch (pillsProcessError) {
        console.log(`Erro ao processar medicamentos: ${pillsProcessError.message}`);
      }
      
      const todayMeds = Object.keys(medicationsByTime).map(timeKey => ({
        time: timeKey,
        medications: medicationsByTime[timeKey]
      }));
      
      // Prioritize groups with pending medications 
      todayMeds.sort((a, b) => {
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return 0;
      });
      
      console.log(`Organizados ${todayMeds.length} grupos de medicamentos`);
      
      // Display log of medications for debugging
      todayMeds.forEach((group, i) => {
        console.log(`Grupo ${i+1}: ${group.time}`);
        group.medications.forEach((med, j) => {
          console.log(`- Med ${j+1}: ${med.title} (${med.dosage}) - Data: ${med.scheduledDate}`);
        });
      });
      
      // Mostrar modal mesmo se não houver medicamentos pendentes
      setTodayMedications(todayMeds);
      
      setTimeout(() => {
        if (todayMeds.length > 0) {
          console.log('Exibindo modal de medicamentos para o dia atual: ', deviceDate);
          setTodayMedicationsModal(true);
        } else {
          console.log('Não há medicamentos para exibir na data atual: ', deviceDate);
          Alert.alert('Informação', 'Não há medicamentos agendados para hoje.');
        }
      }, 300);
      
    } catch (error) {
      console.log('Erro não tratado ao buscar medicamentos:', error);
      Alert.alert('Erro', `Não foi possível carregar os medicamentos para hoje: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to determine if a pill should be taken today based on frequency
  const shouldTakePillToday = (pill, today) => {
    try {
      if (!pill.data_inicio) {
        console.log(`Medicamento ${pill.titulo} sem data de início, considerando válido`);
        return true; // If no start date, assume it should be taken
      }
      
      // Validate date format safely
      let startDate;
      try {
        startDate = new Date(pill.data_inicio);
        // Check if date is valid
        if (isNaN(startDate.getTime())) {
          console.log(`Medicamento ${pill.titulo} com data de início inválida: ${pill.data_inicio}`);
          return false;
        }
      } catch (e) {
        console.log(`Erro ao processar data de início de ${pill.titulo}: ${e.message}`);
        return false;
      }
      
      // Get date strings in YYYY-MM-DD format for comparison
      const startDateStr = startDate.toISOString().split('T')[0];
      
      let todayDate;
      try {
        todayDate = new Date(today);
        // Check if date is valid
        if (isNaN(todayDate.getTime())) {
          console.log(`Data atual inválida: ${today}`);
          return false;
        }
      } catch (e) {
        console.log(`Erro ao processar data atual: ${e.message}`);
        return false;
      }
      
      const todayDateStr = today; // today is already in YYYY-MM-DD format
      
      console.log(`Verificando medicamento: ${pill.titulo}, data início: ${startDateStr}, today: ${todayDateStr}`);
      
      // If pill hasn't started yet, don't take it
      if (startDate > todayDate) {
        console.log(`Medicamento ${pill.titulo} ainda não iniciou`);
        return false;
      }
      
      // If pill has ended, don't take it
      if (pill.data_fim) {
        try {
          const endDate = new Date(pill.data_fim);
          
          // Check if end date is valid
          if (isNaN(endDate.getTime())) {
            console.log(`Medicamento ${pill.titulo} com data de fim inválida: ${pill.data_fim}`);
            return false;
          }
          
          const endDateStr = endDate.toISOString().split('T')[0];
          if (endDate < todayDate) {
            console.log(`Medicamento ${pill.titulo} já terminou em ${endDateStr}`);
            return false;
          }
        } catch (e) {
          console.log(`Erro ao processar data de fim de ${pill.titulo}: ${e.message}`);
          // If there's an error with the end date, we'll ignore it and continue checking
        }
      }
      
      // Check frequency
      if (!pill.recurrence || pill.recurrence === 'daily') {
        console.log(`Medicamento ${pill.titulo} é diário`);
        return true;
      }
      
      if (pill.recurrence === 'weekly') {
        // If no specific days are set, default to today
        if (!pill.days_of_week || !Array.isArray(pill.days_of_week) || pill.days_of_week.length === 0) {
          console.log(`Medicamento ${pill.titulo} é semanal sem dias específicos, considerando válido`);
          return true;
        }
        
        // Check if today's day of week is in the selected days
        const todayDayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const shouldTake = pill.days_of_week.includes(todayDayOfWeek);
        console.log(`Medicamento ${pill.titulo} é semanal, dia da semana: ${todayDayOfWeek}, deve tomar: ${shouldTake}`);
        return shouldTake;
      }
      
      if (pill.recurrence === 'monthly') {
        // Check if today's day of month matches the start date's day
        const shouldTake = todayDate.getDate() === startDate.getDate();
        console.log(`Medicamento ${pill.titulo} é mensal, deve tomar: ${shouldTake}`);
        return shouldTake;
      }
      
      if (pill.recurrence === 'once') {
        // For one-time medications, check if it's exactly the scheduled date
        try {
          const scheduledDate = pill.schedule_date || pill.data_inicio;
          const scheduleDay = new Date(scheduledDate).toISOString().split('T')[0];
          const shouldTake = scheduleDay === todayDateStr;
          console.log(`Medicamento ${pill.titulo} é de dose única, data programada: ${scheduleDay}, deve tomar: ${shouldTake}`);
          return shouldTake;
        } catch (e) {
          console.log(`Erro ao processar data de dose única de ${pill.titulo}: ${e.message}`);
          return false;
        }
      }
      
      console.log(`Medicamento ${pill.titulo} sem regra específica, considerando válido`);
      return true; // Default to showing the medication
    } catch (err) {
      console.warn(`Error checking pill schedule: ${err.message}`);
      return false; // When in doubt, don't show the medication
    }
  };

  const markMedicationAsTaken = async (scheduleId, pillId) => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;
      
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      
      const { error: insertError } = await supabase
        .from('medication_confirmations')
        .insert({
          pill_id: pillId,
          user_id: userId,
          scheduled_time: now.toISOString(),
          confirmation_date: now.toISOString().split('T')[0],
          confirmation_time: currentTime,
          taken: true,
          notes: 'Medicamento tomado',
          created_at: now.toISOString()
        });
        
      if (insertError) {
        Alert.alert('Erro', 'Não foi possível registrar a confirmação do medicamento.');
        return;
      }
      
      await fetchTodayMedications();
      
      Alert.alert('Sucesso', 'Medicamento marcado como tomado!');
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao processar sua solicitação.');
    }
  };

  const getTodayMedicationStats = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select('id, pill_id')
        .eq('scheduled_date', today)
        .eq('user_id', userId);
        
      if (error) {
        return;
      }
      
      const { data: confirmations, error: confirmError } = await supabase
        .from('medication_confirmations')
        .select('pill_id')
        .eq('confirmation_date', today)
        .eq('user_id', userId)
        .eq('taken', true);
      
      if (confirmError) {
        return;
      }
      
      const total = data?.length || 0;
      const completed = confirmations?.length || 0;
      
      setTodayStats({ total, completed });
      
    } catch (error) {
    }
  };

  const takeMedication = async (event) => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) {
        Alert.alert('Erro', 'Usuário não identificado');
        return;
      }

      const now = new Date();
      
      // If we're taking it from the schedule view, check scheduling time
      if (event.startDate) {
        const scheduledTime = new Date(event.startDate);
        
        if (scheduledTime > now) {
          const scheduledTimeStr = scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const nowTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          Alert.alert(
            'Horário não atingido',
            `Ainda não é hora de tomar este medicamento.\nHorário agendado: ${scheduledTimeStr}\nHorário atual: ${nowTimeStr}`,
            [{ text: "OK", style: "cancel" }]
          );
          return;
        }
      }

      const pillId = event.pill_id;
      
      if (!pillId) {
        Alert.alert('Erro', 'Não foi possível identificar o medicamento neste evento');
        return;
      }
      
      const isoTimestamp = now.toISOString();
      const currentDate = isoTimestamp.split('T')[0];
      
      const confirmationData = {
        pill_id: pillId,
        user_id: userId,
        scheduled_time: isoTimestamp,
        confirmation_date: currentDate,
        taken: true,
        notes: `Medicamento tomado via aplicativo: ${event.title}`,
        created_at: isoTimestamp
      };
      
      const { error: insertError } = await supabase
        .from('medication_confirmations')
        .insert(confirmationData);
        
      if (insertError) {
        Alert.alert('Erro', `Não foi possível registrar a confirmação do medicamento: ${insertError.message}`);
        return;
      }
      
      // If it was taken from the calendar view and has an ID, update the schedule
      if (event.id && !event.id.toString().startsWith('pill-')) {
        try {
          const { error: updateError } = await supabase
            .from('medication_schedule_times')
            .update({
              status: 'taken',
              complete_datetime: isoTimestamp
            })
            .eq('id', event.id);
            
          if (updateError) {
            console.error('Error updating schedule status:', updateError);
          }
        } catch (updateError) {
          console.error('Exception updating schedule status:', updateError);
        }
      }
      
      fetchEvents();
      getTodayMedicationStats();
      
      Alert.alert('Sucesso', `${event.title} marcado como tomado!`);

      // Update notification count after taking a medication
      checkPendingMedications();
    } catch (error) {
      Alert.alert('Erro', `Ocorreu um erro ao processar sua solicitação: ${error.message}`);
    }
  };

  const checkPendingMedications = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;

      // Get current device date and format it
      const deviceNow = new Date();
      const deviceToday = deviceNow.toISOString().split('T')[0];
      
      console.log(`===== INICIANDO BUSCA DE MEDICAMENTOS DO DIA =====`);
      console.log(`Data atual do dispositivo: ${deviceNow.toISOString()}`);
      console.log(`Data formatada para consulta: ${deviceToday}`);
      console.log(`ID do usuário: ${userId}`);
      
      // Busca todos os medicamentos na tabela pills_warning associados ao usuário
      const { data: pillsData, error: pillsError } = await supabase
        .from('pills_warning')
        .select('*')
        .eq('user_id', userId);
        
      if (pillsError) {
        console.error('Erro ao buscar pills_warning:', pillsError);
        return;
      }
      
      // Filtrar medicamentos de teste
      const validPillsData = pillsData?.filter(pill => {
        // Skip test or invalid medications
        if (!pill.titulo || 
            pill.titulo.toLowerCase().includes('test')) {
          console.log(`Skipping test pill: ${pill.titulo}`);
          return false;
        }
        return true;
      });
      
      // Extrair IDs de todos os medicamentos válidos
      const pillIds = validPillsData.map(pill => pill.id);
      
      // Buscar todos os agendamentos para esses medicamentos
      const { data: allSchedules, error: allSchedulesError } = await supabase
        .from('medication_schedule_times')
        .select('id, pill_id, scheduled_time, scheduled_date')
        .eq('user_id', userId)
        .in('pill_id', pillIds.length > 0 ? pillIds : [0]);
        
      if (allSchedulesError) {
        console.error('Error fetching scheduled medications:', allSchedulesError);
        return;
      }
      
      // Filtrar apenas agendamentos para a data atual do dispositivo
      const scheduled = allSchedules?.filter(item => item.scheduled_date === deviceToday);
      
      console.log(`Encontrados ${scheduled?.length || 0} medicamentos agendados para hoje (${deviceToday})`);
      
      // Get all confirmed medications for today
      const { data: confirmed, error: confirmError } = await supabase
        .from('medication_confirmations')
        .select('pill_id, confirmation_date')
        .eq('confirmation_date', deviceToday) // Strict match with device date
        .eq('user_id', userId)
        .eq('taken', true);
      
      if (confirmError) {
        console.error('Error fetching medication confirmations:', confirmError);
        return;
      }
      
      // Filter out any scheduled medications where the database date doesn't match device date
      const validScheduled = scheduled?.filter(item => {
        // Double check that the scheduled date matches today's device date exactly
        const isMatch = item.scheduled_date === deviceToday;
        if (!isMatch) {
          console.log(`Skipping medication with non-matching date: ${item.scheduled_date} vs ${deviceToday}`);
        }
        return isMatch;
      });
      
      // Cria lista completa de medicamentos para o dia
      const allMedsForToday = [];
      
      // Adiciona medicamentos do agendamento
      for (const item of validScheduled || []) {
        try {
          allMedsForToday.push({
            pill_id: item.pill_id,
            scheduled_time: item.scheduled_time,
            scheduled_date: item.scheduled_date,
            isTaken: confirmed?.some(conf => 
              conf.pill_id === item.pill_id && 
              conf.confirmation_date === deviceToday
            ) || false
          });
        } catch (err) {
          console.log(`Erro ao processar agendamento: ${err.message}`);
        }
      }
      
      // Também verificar medicamentos que devem ser tomados hoje conforme a frequência
      for (const pill of validPillsData || []) {
        try {
          const shouldTakeToday = shouldTakePillToday(pill, deviceToday);
          if (!shouldTakeToday) continue;
          
          // Verificar se este medicamento já não está incluído nos agendamentos
          const alreadyScheduled = validScheduled?.some(schedule => schedule.pill_id === pill.id);
          if (alreadyScheduled) continue;
          
          // Verificar se já foi tomado hoje
          const isTaken = confirmed?.some(conf => 
            conf.pill_id === pill.id && 
            conf.confirmation_date === deviceToday
          );
          
          // Definir horário padrão se não existir
          let timeKey = pill.horario_fixo ? 
            pill.horario_fixo.split(';')[0].trim() : 
            '08:00:00';
            
          try {
            allMedsForToday.push({
              pill_id: pill.id,
              scheduled_time: timeKey,
              scheduled_date: deviceToday,
              isTaken: isTaken || false
            });
          } catch (timeErr) {
            console.log(`Erro ao processar horário para ${pill.titulo}: ${timeErr.message}`);
          }
        } catch (pillErr) {
          console.log(`Erro ao processar medicamento ${pill.titulo}: ${pillErr.message}`);
        }
      }
      
      // Contar todos os medicamentos do dia
      const totalMedsCount = allMedsForToday.length;
      
      // Contar os medicamentos pendentes (não tomados)
      const pendingCount = allMedsForToday.filter(med => !med.isTaken).length;
      
      console.log(`Total de ${totalMedsCount} medicamentos para o dia: ${deviceToday}`);
      console.log(`- ${pendingCount} pendentes (não tomados)`);
      console.log(`- ${totalMedsCount - pendingCount} tomados`);
      
      // Mostrar notificação para todos os medicamentos do dia, independente de terem sido tomados
      setNotificationCount(totalMedsCount);
    } catch (error) {
      console.error('Error checking pending medications:', error);
    }
  };

  const skipMedication = async (medication) => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) {
        Alert.alert('Erro', 'Usuário não identificado');
        return;
      }

      const now = new Date();
      const isoTimestamp = now.toISOString();
      const currentDate = isoTimestamp.split('T')[0];
      
      const confirmationData = {
        pill_id: medication.pillId,
        user_id: userId,
        scheduled_time: `${medication.scheduledDate}T${medication.scheduledTime}`,
        confirmation_date: currentDate,
        confirmation_time: now.toTimeString().split(' ')[0],
        taken: false,
        status: 'skipped',
        notes: `Medicamento pulado pelo usuário: ${medication.title}`,
        created_at: isoTimestamp
      };
      
      const { error: insertError } = await supabase
        .from('medication_confirmations')
        .insert(confirmationData);
        
      if (insertError) {
        console.error('Erro ao registrar medicamento pulado:', insertError);
        Alert.alert('Erro', `Não foi possível registrar o medicamento como pulado: ${insertError.message}`);
        return;
      }
      
      // If it's a scheduled medication and has an ID, update the schedule
      if (medication.id && !medication.id.toString().startsWith('pill-')) {
        try {
          const { error: updateError } = await supabase
            .from('medication_schedule_times')
            .update({
              status: 'skipped',
              complete_datetime: isoTimestamp
            })
            .eq('id', medication.id);
            
          if (updateError) {
            console.error('Error updating schedule status:', updateError);
          }
        } catch (updateError) {
          console.error('Exception updating schedule status:', updateError);
        }
      }
      
      fetchEvents();
      getTodayMedicationStats();
      fetchTodayMedications();
      
      Alert.alert('Marcado como pulado', `${medication.title} foi registrado como pulado.`);

      // Update notification count after skipping a medication
      checkPendingMedications();
    } catch (error) {
      console.error('Erro ao pular medicamento:', error);
      Alert.alert('Erro', `Ocorreu um erro ao processar sua solicitação: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A8DFD" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {userData?.profilePicture ? (
              <Image 
                source={{ uri: userData.profilePicture }}
                style={styles.profilePicture}
              />
            ) : (
              <View style={[styles.profilePicture, styles.profilePlaceholder]}>
                <Text style={styles.profilePlaceholderText}>
                  {userData?.fullname?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.userNameText} numberOfLines={1}>
                {userData?.fullname || 'User'}
              </Text>
            </View>
          </View>
          <Animated.View style={{
            transform: [{ scale: pulseAnimation }]
          }}>
            <TouchableOpacity 
              style={[
                styles.notificationButton,
                notificationCount > 0 && styles.notificationButtonAll
              ]}
              onPress={() => {
                fetchTodayMedications();
                // Add haptic feedback if available
                if (Platform.OS === 'ios' || Platform.OS === 'android') {
                  // This requires react-native-haptic-feedback library
                  // For now, we'll use a small timeout to simulate a response
                  setTimeout(() => {
                    if (notificationCount > 0) {
                      // If there are pending medications, vibrate
                      try {
                        if (Platform.OS === 'android') {
                          // Android vibration
                          const vibrationPattern = [0, 50, 50, 50];
                          if (navigator && navigator.vibrate) {
                            navigator.vibrate(vibrationPattern);
                          }
                        }
                      } catch (error) {
                        console.log('Vibration not supported');
                      }
                    }
                  }, 50);
                }
              }}
            >
              <Ionicons 
                name={notificationCount > 0 ? "notifications" : "notifications-outline"} 
                size={24} 
                color="white" 
              />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.content}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Your Schedule</Text>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayScrollView}
              contentContainerStyle={styles.dayScrollViewContent}
              data={getNextDays(7)}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({item: date, index}) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                
                const hasEvents = events.filter(e => 
                  new Date(e.startDate).toDateString() === date.toDateString()
                ).length > 0;
                
                return (
                  <TouchableOpacity 
                    style={[
                      styles.dayButton,
                      isSelected && styles.selectedDayButton,
                      isToday && styles.todayButton
                    ]} 
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.daySubText,
                      (isSelected || isToday) && styles.selectedDayText
                    ]}>
                      {date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={[
                      styles.dayText,
                      (isSelected || isToday) && styles.selectedDayText
                    ]}>
                      {date.getDate()}
                    </Text>
                    {hasEvents && isToday && (
                      <View style={styles.dayEventIndicator} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.scrollViewContainer}>
              {isRefreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6A8DFD" />
                </View>
              ) : (
                <>
                  <FlatList
                    ref={hourlyScrollViewRef}
                    style={styles.hourlySchedule}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.hourlyScheduleContent}
                    data={getAllHours()}
                    keyExtractor={(hour) => hour.toString()}
                    renderItem={({item: hour}) => {
                      const hourEvents = events.filter(event => 
                        new Date(event.startDate).getHours() === hour &&
                        new Date(event.startDate).toDateString() === selectedDate.toDateString()
                      );
                      
                      const isCurrentHour = hour === currentHour;
                      const hasEvents = hourEvents.length > 0;
                      
                      if (!hasEvents && !isCurrentHour) {
                        return (
                          <View style={styles.hourRowCompact}>
                            <Text style={styles.hourText}>
                              {hour.toString().padStart(2, '0')}:00
                            </Text>
                            <View style={styles.hourLine} />
                          </View>
                        );
                      }
                      
                      return (
                        <View 
                          style={[
                            styles.hourRow,
                            isCurrentHour && styles.currentHourRow
                          ]}
                        >
                          <Text style={[
                            styles.hourText,
                            isCurrentHour && styles.currentHourText
                          ]}>
                            {hour.toString().padStart(2, '0')}:00
                          </Text>
                          <View style={styles.timelineContainer}>
                            {hourEvents.map((event, idx) => {
                              const now = new Date();
                              const scheduledTime = new Date(event.startDate);
                              const canTake = scheduledTime <= now;

                              return (
                                <View key={idx} style={[
                                  styles.eventCard,
                                  event.isTaken && styles.eventCardTaken,
                                  !canTake && !event.isTaken && styles.eventCardFuture
                                ]}>
                                  <View style={styles.eventCardHeader}>
                                    <Text style={styles.eventTitle}>{event.title}</Text>
                                    <Text style={styles.eventTime}>
                                      {event.scheduledTime?.substring(0, 5) || '00:00'}
                                    </Text>
                                  </View>
                                  {event.notes && (
                                    <Text style={styles.eventNotes}>{event.notes}</Text>
                                  )}
                                  <Text style={styles.scheduledInfo}>
                                    Agendado para: {event.scheduledDate} às {event.scheduledTime?.substring(0, 5) || '00:00'}
                                  </Text>
                                  {!event.isTaken && canTake && (
                                    <TouchableOpacity 
                                      style={styles.takePillButton}
                                      onPress={() => takeMedication(event)}
                                    >
                                      <Text style={styles.takePillButtonText}>Tomar</Text>
                                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                                    </TouchableOpacity>
                                  )}
                                  {!event.isTaken && !canTake && (
                                    <View style={styles.futureIndicator}>
                                      <Text style={styles.futureText}>Aguardando horário</Text>
                                      <Ionicons name="time-outline" size={16} color="#f39c12" />
                                    </View>
                                  )}
                                  {event.isTaken && (
                                    <View style={styles.takenPillIndicator}>
                                      <Text style={styles.takenPillText}>Medicamento tomado</Text>
                                      <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    }}
                    getItemLayout={(data, index) => (
                      {length: 70, offset: 70 * index, index}
                    )}
                    initialScrollIndex={Math.max(0, currentHour - 2)}
                    onScrollToIndexFailed={() => {
                      // Simple fallback - just scroll to offset
                      const hourHeight = 70;
                      hourlyScrollViewRef.current?.scrollToOffset({
                        offset: currentHour * hourHeight,
                        animated: true
                      });
                    }}
                    maxToRenderPerBatch={24}
                    windowSize={10}
                    scrollEventThrottle={16}
                    removeClippedSubviews={false}
                    scrollEnabled={true}
                    maintainVisibleContentPosition={{
                      minIndexForVisible: 0,
                      autoscrollToTopThreshold: 10
                    }}
                    bounces={false}
                    overScrollMode="never"
                  />
                  <TouchableOpacity 
                    style={styles.currentTimeFloatingButton}
                    onPress={goToCurrentHourAndDay}
                  >
                    <Ionicons name="time-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showMedicationModal}
          onRequestClose={() => setShowMedicationModal(false)}
          statusBarTranslucent={true}
          hardwareAccelerated={true}
        >
          <View style={[
            styles.modalContainer,
            Platform.OS === 'web' && styles.modalContainerWeb
          ]}>
            <View style={[
              styles.modalContent, 
              { width: Platform.OS === 'web' ? '80%' : '95%', maxHeight: '85%' },
              Platform.OS === 'web' && styles.modalContentWeb
            ]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Medication Reminder
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setShowMedicationModal(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalText}>
                Did you take your medication: {missedMedication?.nome}?
              </Text>
              
              <Text style={styles.medicationInfo}>
                Scheduled for: {missedMedication ? new Date(missedMedication.data_inicio).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : ''}
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.noButton]} 
                  onPress={() => handleMedicationResponse(false)}
                >
                  <Text style={styles.buttonText}>No</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.yesButton]} 
                  onPress={() => handleMedicationResponse(true)}
                >
                  <Text style={styles.buttonText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={todayMedicationsModal}
          onRequestClose={() => setTodayMedicationsModal(false)}
          statusBarTranslucent={true}
          hardwareAccelerated={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Todos os Medicamentos de Hoje ({new Date().toLocaleDateString()})
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setTodayMedicationsModal(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.currentTimeIndicator}>
                <Ionicons name="time-outline" size={18} color="#6A8DFD" />
                <Text style={styles.currentTimeText}>
                  Horário atual: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
              
              {todayMedications.length === 0 ? (
                <View style={styles.emptyMedsContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
                  <Text style={styles.emptyMedsText}>Não há medicamentos agendados para hoje</Text>
                </View>
              ) : (
                <ScrollView style={styles.medicationListScroll}>
                  {todayMedications.map((timeGroup, idx) => (
                    <View key={`time-${idx}`} style={styles.timeGroupContainer}>
                      <View style={styles.timeHeaderWrapper}>
                        <Text style={styles.timeHeader}>
                          {timeGroup.time.substring(0, 5)}
                        </Text>
                      </View>
                      
                      {timeGroup.medications.map((med, medIdx) => (
                        <View 
                          key={`med-${med.id || medIdx}`} 
                          style={[
                            styles.medicationCard,
                            med.isTaken ? styles.medicationCardTaken : 
                            !med.canTake ? styles.medicationCardFuture : null
                          ]}
                        >
                          <View style={styles.medicationInfo}>
                            <Text style={styles.medicationTitle}>{med.title}</Text>
                            <Text style={styles.medicationDosage}>
                              Dose: {med.dosage || med.dosePorVez || '1'} comprimido(s)
                            </Text>
                            
                            {med.isTaken && (
                              <View style={styles.statusContainer}>
                                <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                                <Text style={styles.statusTextTaken}>
                                  Tomado {med.confirmationTime ? `às ${med.confirmationTime.substring(0, 5)}` : ''}
                                </Text>
                              </View>
                            )}
                            
                            {!med.isTaken && !med.canTake && (
                              <View style={styles.statusContainer}>
                                <Ionicons name="time-outline" size={16} color="#f39c12" />
                                <Text style={styles.statusTextPending}>
                                  Horário não atingido
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.medicationActions}>
                            {!med.isTaken && med.canTake && (
                              <View style={styles.actionButtonsRow}>
                                <TouchableOpacity
                                  style={styles.takeButton}
                                  onPress={() => {
                                    setTodayMedicationsModal(false);
                                    setTimeout(() => takeMedication({
                                      id: med.id,
                                      pill_id: med.pillId,
                                      title: med.title,
                                      startDate: `${med.scheduledDate}T${med.scheduledTime}`,
                                      scheduledDate: med.scheduledDate,
                                      scheduledTime: med.scheduledTime
                                    }), 300);
                                  }}
                                >
                                  <Text style={styles.takeButtonText}>Tomar</Text>
                                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.skipButton}
                                  onPress={() => {
                                    Alert.alert(
                                      "Pular medicamento",
                                      `Deseja realmente pular ${med.title}?`,
                                      [
                                        { text: "Cancelar", style: "cancel" },
                                        { 
                                          text: "Sim, pular",
                                          onPress: () => {
                                            setTodayMedicationsModal(false);
                                            setTimeout(() => skipMedication(med), 300);
                                          }
                                        }
                                      ]
                                    );
                                  }}
                                >
                                  <Text style={styles.skipButtonText}>Pular</Text>
                                  <Ionicons name="close-circle" size={18} color="#fff" />
                                </TouchableOpacity>
                              </View>
                            )}
                            
                            {!med.isTaken && !med.canTake && (
                              <View style={styles.waitingIcon}>
                                <Ionicons name="time-outline" size={24} color="#f39c12" />
                              </View>
                            )}
                            
                            {med.isTaken && (
                              <View style={styles.takenIcon}>
                                <Ionicons name="checkmark-done-circle" size={24} color="#2ecc71" />
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={() => {
                      setTodayMedicationsModal(false);
                      setTimeout(() => fetchTodayMedications(), 300);
                    }}
                  >
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.refreshButtonText}>Atualizar lista</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

      <Navbar />
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A8DFD',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    paddingBottom: 80, // Added padding to account for the navbar height
  },
  header: {
    backgroundColor: '#6A8DFD',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profilePlaceholder: {
    backgroundColor: '#E8ECF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A8DFD',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  welcomeText: {
    fontSize: 12,
    color: '#E8ECF4',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  notificationButtonActive: {
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
  },
  notificationButtonAll: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    padding: 15,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  todayStatsContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  todayStatsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
  },
  todayStatsItem: {
    alignItems: 'center',
  },
  todayStatsNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  todayStatsLabel: {
    fontSize: 12,
    color: '#9BA3B7',
    marginTop: 4,
  },
  todayStatsDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E4F1',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E4F1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6A8DFD',
    borderRadius: 4,
  },
  dayScrollView: {
    marginBottom: 10,
  },
  dayScrollViewContent: {
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  daySelector: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 75,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    position: 'relative',
  },
  selectedDayButton: {
    backgroundColor: '#6A8DFD',
    borderColor: '#6A8DFD',
  },
  todayButton: {
    borderColor: '#6A8DFD',
    borderWidth: 2,
  },
  dayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  daySubText: {
    fontSize: 12,
    color: '#9BA3B7',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  todayText: {
    color: '#ffffff',
  },
  dayEventIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  scrollViewContainer: {
    position: 'relative',
    height: 280,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  hourlySchedule: {
    height: 280,
  },
  hourlyScheduleContent: {
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  hourRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    minHeight: 70,
  },
  hourRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    height: 30,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F0F5',
    marginLeft: 10,
  },
  currentHourRow: {
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6A8DFD',
    borderRightWidth: 3,
    borderRightColor: '#6A8DFD',
  },
  hourText: {
    width: 55,
    fontSize: 14,
    color: '#9BA3B7',
    fontWeight: '500',
  },
  currentHourText: {
    color: '#6A8DFD',
    fontWeight: 'bold',
  },
  timelineContainer: {
    flex: 1,
    marginLeft: 10,
  },
  eventCard: {
    backgroundColor: '#F5F7FF',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6A8DFD',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  eventCardTaken: {
    backgroundColor: '#F0FFF4',
    borderLeftColor: '#2ECC71',
  },
  eventCardFuture: {
    backgroundColor: '#f5f5f5',
    borderLeftColor: '#f39c12',
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3142',
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    color: '#6A8DFD',
    fontWeight: '500',
  },
  eventNotes: {
    fontSize: 12,
    color: '#9BA3B7',
    marginBottom: 8,
  },
  takePillButton: {
    backgroundColor: '#6A8DFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  takePillButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: { 
    position: 'absolute', 
    right: 0, 
    top: 0, 
    zIndex: 1, 
    padding: 5 
  },
  modalStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  modalStatsItem: {
    alignItems: 'center',
  },
  modalStatsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginVertical: 4,
  },
  modalStatsLabel: {
    fontSize: 12,
    color: '#9BA3B7',
  },
  modalStatsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E4F1',
  },
  todayMedItemTaken: {
    borderLeftColor: '#2ecc71',
    backgroundColor: '#f0fff4',
  },
  todayMedItemFuture: {
    borderLeftColor: '#f39c12',
    backgroundColor: '#fffbf0',
  },
  todayMedNotes: {
    color: '#7f8c8d',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  waitingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  takenContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    borderRadius: 25,
  },
  refreshAllButton: {
    backgroundColor: '#6A8DFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 15,
    marginBottom: 10,
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  refreshAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
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
    marginBottom: 12,
  },
  timeLineBefore: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  timeGroupTimeContainer: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTimeGroupContainer: {
    backgroundColor: '#6A8DFD',
  },
  timeGroupTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  currentTimeGroupTime: {
    color: '#fff',
  },
  currentTimeLine: {
    backgroundColor: '#6A8DFD',
    height: 2,
  },
  todayMedItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6A8DFD',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  todayMedItemInfo: {
    flex: 1,
    marginRight: 10,
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
  medStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  medFutureText: {
    fontSize: 12,
    color: '#f39c12',
    marginLeft: 4,
    fontWeight: '500',
  },
  medTakenText: {
    fontSize: 12,
    color: '#2ecc71',
    fontWeight: '500',
  },
  medActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  takeMedButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  takeMedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
  },
  skipMedButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  skipMedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
  },
  currentTimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  currentTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3142',
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
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E74C3C',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  takenPillIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  takenPillText: {
    fontSize: 12,
    color: '#2ECC71',
    fontStyle: 'italic',
    marginRight: 4,
  },
  scheduledInfo: {
    fontSize: 12,
    color: '#9BA3B7',
    marginBottom: 8,
  },
  futureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  futureText: {
    fontSize: 12,
    color: '#f39c12',
    fontStyle: 'italic',
    marginRight: 4,
  },
  listEventCardTaken: {
    borderLeftColor: '#2ecc71',
    backgroundColor: '#f0fff4',
  },
  listEventCardFuture: {
    borderLeftColor: '#f39c12',
    backgroundColor: '#fffbf0',
  },
  listFutureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    marginTop: 8,
    backgroundColor: '#fffbf0',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  listFutureText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '500',
    marginRight: 4,
  },
  listTakenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    marginTop: 8,
    backgroundColor: '#f0fff4',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  listTakenText: {
    fontSize: 12,
    color: '#2ecc71',
    fontWeight: '500',
    marginRight: 4,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  currentTimeFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6A8DFD',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1000,
  },
  modalContainerWeb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContentWeb: {
    maxWidth: 800,
  },
  medicationListScroll: {
    maxHeight: 400,
  },
  timeGroupContainer: {
    marginBottom: 15,
  },
  timeHeaderWrapper: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
  },
  timeHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  medicationCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6A8DFD',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  medicationCardTaken: {
    borderLeftColor: '#2ecc71',
    backgroundColor: '#f0fff4',
  },
  medicationCardFuture: {
    borderLeftColor: '#f39c12',
    backgroundColor: '#fffbf0',
  },
  medicationInfo: {
    flex: 1,
    marginRight: 10,
  },
  medicationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusTextTaken: {
    fontSize: 12,
    color: '#2ecc71',
    marginLeft: 4,
    fontWeight: '500',
  },
  statusTextPending: {
    fontSize: 12,
    color: '#f39c12',
    marginLeft: 4,
    fontWeight: '500',
  },
  medicationActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  takeButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 6,
  },
  takeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 14,
  },
  skipButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  skipButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 14,
  },
  waitingIcon: {
    padding: 4,
  },
  takenIcon: {
    padding: 4,
  },
  refreshButton: {
    backgroundColor: '#6A8DFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 15,
    marginBottom: 10,
    alignSelf: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
});

export default HomeScreen;