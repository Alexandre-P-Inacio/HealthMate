import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal, FlatList } from 'react-native';
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
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'list'
  const navigation = useNavigation();
  const hourlyScrollViewRef = useRef(null);
  const hourRowHeight = 70; // Definir altura fixa de cada linha de hora para cálculos precisos

  useEffect(() => {
    fetchUserData();
    checkMissedMedications();
    getTodayMedicationStats();
    
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
      checkMissedMedications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  useEffect(() => {
    if (hourlyScrollViewRef.current) {
      setTimeout(() => {
        scrollToCurrentTime();
      }, 300);
    }
  }, [currentHour, isLoading]);

  const scrollToCurrentTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // FlatList usa scrollToIndex em vez de scrollTo
    if (hourlyScrollViewRef.current) {
      hourlyScrollViewRef.current.scrollToIndex({ 
        index: currentHour,
        animated: true,
        viewPosition: 0.5 // Centralizar o item na tela
      });
    }
  };

  // Garantir que o try/catch seja adicionado para evitar erros se o índice estiver fora dos limites
  const onScrollToIndexFailed = (info) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      if (hourlyScrollViewRef.current) {
        hourlyScrollViewRef.current.scrollToIndex({ 
          index: Math.min(info.highestMeasuredFrameIndex, currentHour),
          animated: true 
        });
      }
    });
  };

  const fetchUserData = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      
      if (!userId) {
        console.error('User ID not found');
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
      console.error('Error fetching user data:', error);
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
      console.error('Error fetching medications:', error);
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
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setIsRefreshing(true);
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) {
        console.error('User ID not found');
        setIsRefreshing(false);
        return;
      }

      console.log(`Buscando agendamentos para o usuário ID: ${userId}`);

      // Obter a data do dia selecionado no formato YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0];
      console.log(`Consultando medicamentos para a data: ${formattedDate}`);
      
      // Buscar os medicamentos agendados na tabela medication_schedule_times
      // Foco nas colunas scheduled_date e scheduled_time
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
        console.error('Erro ao buscar medicamentos agendados:', error);
        setIsRefreshing(false);
        return;
      }

      console.log(`Encontrados ${data?.length || 0} medicamentos agendados para a data ${formattedDate}`);
      
      // Se encontrou dados, lista os horários no console para debug
      if (data && data.length > 0) {
        console.log("Horários encontrados:");
        data.forEach(item => {
          console.log(`- Data: ${item.scheduled_date}, Hora: ${item.scheduled_time}, Medicamento: ${item.pills_warning?.titulo || 'Desconhecido'}`);
        });
      }

      // Verificar se já existem confirmações para estes medicamentos
      const { data: confirmations, error: confirmError } = await supabase
        .from('medication_confirmations')
        .select('pill_id, confirmation_date')
        .eq('user_id', userId)
        .eq('confirmation_date', formattedDate)
        .eq('taken', true);

      if (confirmError) {
        console.error('Erro ao buscar confirmações:', confirmError);
      }

      // Converter os dados para o formato esperado pelo calendário
      // Garantindo que usamos corretamente scheduled_date e scheduled_time
      const calendarEvents = data.map(item => {
        // Verificar se este medicamento já foi tomado
        const isTaken = confirmations?.some(conf => 
          conf.pill_id === item.pill_id && conf.confirmation_date === item.scheduled_date
        ) || item.status === 'taken' || false;

        // Extrair componentes de hora da string scheduled_time (formato HH:MM:SS)
        const timeComponents = item.scheduled_time?.split(':') || ['08', '00', '00'];
        const hours = parseInt(timeComponents[0], 10);
        const minutes = parseInt(timeComponents[1], 10);
        const seconds = parseInt(timeComponents[2], 10);

        // Criar objeto de data combinando scheduled_date com scheduled_time
        const eventDate = new Date(item.scheduled_date);
        eventDate.setHours(hours, minutes, seconds, 0);
        
        return {
          id: item.id,
          title: item.pills_warning?.titulo || 'Medicamento',
          startDate: eventDate.toISOString(),
          endDate: new Date(eventDate.getTime() + 30 * 60000).toISOString(),
          notes: `Dose: ${item.dosage || item.pills_warning?.quantidade_comprimidos_por_vez || 1} comprimido(s)`,
          scheduledDate: item.scheduled_date,  // Armazenar a data original
          scheduledTime: item.scheduled_time,  // Armazenar a hora original
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
      console.error('Error fetching medication schedule:', error);
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
            .eq('medication_id', med.id)
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
          medication_id: missedMedication.id,
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
        console.error('Error recording medication response:', error);
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

  // Função para calcular e salvar todos os horários de medicação na tabela medication_confirmations
  const calculateAndSaveMedicationSchedule = async (medicationData, userId) => {
    try {
      if (!medicationData.id || !userId) {
        console.error('ID do medicamento ou ID do usuário não fornecido');
        return { error: 'Dados incompletos' };
      }

      console.log(`Calculando horários para medicamento ID: ${medicationData.id}`);
      
      // Array para armazenar todas as datas/horas calculadas
      const scheduledTimes = [];
      
      // Data atual como referência
      const now = new Date();
      let startDate = medicationData.data_inicio ? new Date(medicationData.data_inicio) : now;
      
      // Garantir que a data de início não seja anterior à data atual
      if (startDate < now) {
        startDate = now;
      }
      
      // Data de término (se existir)
      const endDate = medicationData.data_fim ? new Date(medicationData.data_fim) : null;
      
      // Determinar o tipo de frequência e calcular os horários
      if (medicationData.recurrence === 'daily' || !medicationData.recurrence) {
        // Medicamento diário
        const daysToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 
          30; // Padrão: 30 dias se não houver data final
        
        // Para cada dia no período
        for (let day = 0; day < daysToCalculate; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + day);
          
          // Se houver horários fixos específicos
          if (medicationData.horario_fixo) {
            const hours = medicationData.horario_fixo.split(';');
            for (const hourStr of hours) {
              const [hour, minute] = hourStr.trim().split(':').map(Number);
              const datetime = new Date(currentDate);
              datetime.setHours(hour, minute, 0, 0);
              
              // Só adicionar se a data/hora for no futuro
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          } 
          // Se for por intervalo de horas
          else if (medicationData.intervalo_horas) {
            const intervalo = parseInt(medicationData.intervalo_horas);
            const startHour = medicationData.hora_inicio || 8; // Padrão: 8h se não especificado
            
            for (let hour = startHour; hour < 24; hour += intervalo) {
              const datetime = new Date(currentDate);
              datetime.setHours(hour, 0, 0, 0);
              
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          }
          // Caso padrão: uma vez por dia
          else {
            const datetime = new Date(currentDate);
            datetime.setHours(8, 0, 0, 0); // Padrão: 8h da manhã
            
            if (datetime > now) {
              scheduledTimes.push(datetime.toISOString());
            }
          }
        }
      } 
      else if (medicationData.recurrence === 'weekly') {
        // Medicamento semanal
        const weeksToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7)) : 
          4; // Padrão: 4 semanas
        
        // Dias da semana selecionados (0 = Domingo, 6 = Sábado)
        const selectedDays = medicationData.days_of_week || [1, 3, 5]; // Padrão: Segunda, Quarta, Sexta
        
        // Para cada semana no período
        for (let week = 0; week < weeksToCalculate; week++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          
          // Para cada dia da semana selecionado
          for (const dayOfWeek of selectedDays) {
            const currentDate = new Date(weekStart);
            const currentDayOfWeek = currentDate.getDay();
            const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
            
            currentDate.setDate(currentDate.getDate() + daysToAdd);
            
            // Aplicar os mesmos cálculos de hora como no caso diário
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
              datetime.setHours(8, 0, 0, 0); // Padrão: 8h da manhã
              
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          }
        }
      }
      else if (medicationData.recurrence === 'once') {
        // Medicamento de dose única
        const datetime = new Date(medicationData.schedule_date || startDate);
        
        // Definir a hora específica se fornecida
        if (medicationData.schedule_time) {
          const [hour, minute] = medicationData.schedule_time.split(':').map(Number);
          datetime.setHours(hour, minute, 0, 0);
        } else {
          datetime.setHours(8, 0, 0, 0); // Padrão: 8h da manhã
        }
        
        if (datetime > now) {
          scheduledTimes.push(datetime.toISOString());
        }
      }
      
      console.log(`Calculados ${scheduledTimes.length} horários para tomar o medicamento`);
      
      // Salvar cada horário calculado na tabela
      const results = [];
      for (const scheduledTime of scheduledTimes) {
        // Verificar se já existe um registro
        const { data: existing, error: checkError } = await supabase
          .from('medication_confirmations')
          .select('id')
          .eq('medication_id', medicationData.id)
          .eq('scheduled_time', scheduledTime)
          .maybeSingle();
        
        if (checkError) {
          console.error('Erro ao verificar registro existente:', checkError);
          continue;
        }
        
        // Se não existir, criar o novo registro
        if (!existing) {
          const confirmationData = {
            medication_id: medicationData.id,
            scheduled_time: scheduledTime,
            user_id: userId,
            taken: null, // Inicialmente null até ser confirmado
            notes: 'Agendado automaticamente',
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('medication_confirmations')
            .insert(confirmationData)
            .select('id');
          
          if (error) {
            console.error('Erro ao criar registro de confirmação:', error);
          } else {
            results.push(data[0]);
          }
        } else {
          results.push(existing);
        }
      }
      
      console.log(`Salvos ${results.length} registros na tabela medication_confirmations`);
      return { data: results };
    } catch (error) {
      console.error('Erro ao calcular e salvar horários de medicação:', error);
      return { error };
    }
  };

  const handleSaveMedication = async (medicationData) => {
    try {
      // Salvar o medicamento principal
      const { data, error } = await supabase
        .from('pills_warning')
        .upsert(medicationData)
        .select('id');
      
      if (error) throw error;
      
      // Obter o ID do medicamento salvo
      const medicationId = data[0].id;
      
      // Obter ID do usuário atual
      const userData = DataUser.getUserData();
      const userId = userData.id;
      
      // Calcular e salvar todos os horários
      await calculateAndSaveMedicationSchedule({
        ...medicationData,
        id: medicationId
      }, userId);
      
      Alert.alert('Sucesso', 'Medicamento salvo e todos os horários agendados');
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o medicamento');
    }
  };

  const fetchTodayMedications = async () => {
    const userId = DataUser.getUserData()?.id;
    if (!userId) {
      console.error('Usuário não encontrado');
      Alert.alert('Erro', 'Usuário não identificado. Por favor, faça login novamente.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Obtém a data atual no formato ISO (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      console.log(`Buscando medicamentos para data: ${today} e usuário: ${userId}`);
      
      // Busca todos os agendamentos para hoje na tabela medication_schedule_times
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('medication_schedule_times')
        .select(`
          id,
          pill_id,
          scheduled_date,
          scheduled_time,
          complete_datetime,
          dosage,
          notes,
          user_id,
          pills_warning (
            id,
            titulo,
            quantidade_comprimidos,
            quantidade_comprimidos_por_vez,
            horario_fixo,
            intervalo_horas
          )
        `)
        .eq('scheduled_date', today)
        .eq('user_id', userId)
        .order('scheduled_time', { ascending: true });
        
      if (scheduleError) {
        console.error('Erro ao buscar medicamentos de hoje:', scheduleError);
        Alert.alert('Erro', `Falha ao buscar medicamentos: ${scheduleError.message}`);
        setIsLoading(false);
        return;
      }
      
      console.log(`Encontrados ${scheduleData?.length || 0} agendamentos para hoje`);
      
      // Caso não encontre medicamentos agendados, buscar todos da tabela pills_warning
      // e calcular os horários para hoje
      if (!scheduleData || scheduleData.length === 0) {
        console.log('Nenhum medicamento agendado encontrado. Buscando medicamentos na tabela pills_warning');
        
        const { data: pillsData, error: pillsError } = await supabase
          .from('pills_warning')
          .select('*')
          .eq('user_id', userId);
          
        if (pillsError) {
          console.error('Erro ao buscar medicamentos:', pillsError);
          Alert.alert('Erro', 'Não foi possível carregar seus medicamentos.');
          setIsLoading(false);
          return;
        }
        
        if (pillsData && pillsData.length > 0) {
          console.log(`Encontrados ${pillsData.length} medicamentos. Calculando horários para hoje.`);
          
          // Para cada medicamento, calcular horários para hoje
          const medicationsByTime = {};
          
          for (const pill of pillsData) {
            // Obter horários para hoje (usando lógica simplificada)
            let times = [];
            
            if (pill.horario_fixo) {
              // Horários fixos
              times = pill.horario_fixo.split(';').map(time => time.trim()).filter(time => time);
            } else if (pill.intervalo_horas) {
              // Intervalos de horas
              const intervalo = parseInt(pill.intervalo_horas);
              for (let hour = 8; hour < 24; hour += intervalo) {
                times.push(`${hour.toString().padStart(2, '0')}:00:00`);
              }
            } else {
              // Caso não haja configuração, assume um horário padrão
              times = ['08:00:00'];
            }
            
            // Adicionar cada horário ao mapa
            times.forEach(time => {
              if (!medicationsByTime[time]) {
                medicationsByTime[time] = [];
              }
              
              medicationsByTime[time].push({
                id: `manual-${pill.id}-${time}`,
                pillId: pill.id,
                scheduledTime: time,
                scheduledDate: today,
                dosage: pill.quantidade_comprimidos_por_vez?.toString() || '1',
                title: pill.titulo || 'Medicamento',
                quantidade: pill.quantidade_comprimidos || 0,
                dosePorVez: pill.quantidade_comprimidos_por_vez || 1,
                isManuallyCalculated: true  // Flag para identificar que foi calculado manualmente
              });
            });
          }
          
          // Converter para array
          const todayMeds = Object.keys(medicationsByTime).map(timeKey => ({
            time: timeKey,
            medications: medicationsByTime[timeKey]
          }));
          
          // Ordenar por horário
          todayMeds.sort((a, b) => {
            if (a.time < b.time) return -1;
            if (a.time > b.time) return 1;
            return 0;
          });
          
          setTodayMedications(todayMeds);
          setTodayMedicationsModal(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Organiza os medicamentos por horário
      const medicationsByTime = {};
      
      if (scheduleData && scheduleData.length > 0) {
        scheduleData.forEach(item => {
          const timeKey = item.scheduled_time;
          if (!medicationsByTime[timeKey]) {
            medicationsByTime[timeKey] = [];
          }
          
          medicationsByTime[timeKey].push({
            id: item.id,
            pillId: item.pill_id,
            scheduledTime: item.scheduled_time,
            scheduledDate: item.scheduled_date,
            completeDatetime: item.complete_datetime,
            dosage: item.dosage,
            notes: item.notes,
            title: item.pills_warning?.titulo || 'Medicamento',
            quantidade: item.pills_warning?.quantidade_comprimidos || 0,
            dosePorVez: item.pills_warning?.quantidade_comprimidos_por_vez || 0
          });
        });
      }
      
      // Converte para array para facilitar a exibição
      const todayMeds = Object.keys(medicationsByTime).map(timeKey => ({
        time: timeKey,
        medications: medicationsByTime[timeKey]
      }));
      
      // Ordena por horário
      todayMeds.sort((a, b) => {
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return 0;
      });
      
      console.log(`Organizados ${todayMeds.length} grupos de horários`);
      
      setTodayMedications(todayMeds);
      setTodayMedicationsModal(true);
    } catch (error) {
      console.error('Erro ao processar medicamentos de hoje:', error);
      Alert.alert('Erro', `Não foi possível carregar os medicamentos para hoje: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const markMedicationAsTaken = async (scheduleId, pillId) => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;
      
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      
      // Não tentamos mais atualizar a tabela medication_schedule_times com taken e taken_at
      // Apenas adicionamos o registro à tabela medication_confirmations
      
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
        console.error('Erro ao registrar confirmação:', insertError);
        Alert.alert('Erro', 'Não foi possível registrar a confirmação do medicamento.');
        return;
      }
      
      // Atualiza a lista de medicamentos do dia
      await fetchTodayMedications();
      
      Alert.alert('Sucesso', 'Medicamento marcado como tomado!');
    } catch (error) {
      console.error('Erro ao processar medicamento:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao processar sua solicitação.');
    }
  };

  // Adicionar função para obter estatísticas dos medicamentos do dia
  const getTodayMedicationStats = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar medicamentos do dia
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select('id, pill_id')
        .eq('scheduled_date', today)
        .eq('user_id', userId);
        
      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return;
      }
      
      // Buscar confirmações do dia
      const { data: confirmations, error: confirmError } = await supabase
        .from('medication_confirmations')
        .select('pill_id')
        .eq('confirmation_date', today)
        .eq('user_id', userId)
        .eq('taken', true);
      
      if (confirmError) {
        console.error('Erro ao buscar confirmações:', confirmError);
        return;
      }
      
      // Calcular estatísticas
      const total = data?.length || 0;
      const completed = confirmations?.length || 0;
      
      setTodayStats({ total, completed });
      
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
    }
  };

  // Função para atualizar todos os dados
  const refreshCalendarData = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    await getTodayMedicationStats();
    setIsRefreshing(false);
  };

  // Atualizar a função takeMedication para garantir que todos os campos usem o formato correto
  const takeMedication = async (event) => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) {
        Alert.alert('Erro', 'Usuário não identificado');
        return;
      }

      // Agora temos diretamente o pill_id do evento
      const pillId = event.pill_id;
      
      if (!pillId) {
        Alert.alert('Erro', 'Não foi possível identificar o medicamento neste evento');
        return;
      }
      
      const now = new Date();
      // Formato ISO completo para timestamp
      const isoTimestamp = now.toISOString();
      // Data no formato YYYY-MM-DD
      const currentDate = isoTimestamp.split('T')[0];
      
      console.log(`Registrando confirmação para pill_id=${pillId}, data=${currentDate}, iso=${isoTimestamp}`);
      
      // Usar apenas os campos necessários e no formato correto
      const confirmationData = {
        pill_id: pillId,
        user_id: userId,
        scheduled_time: isoTimestamp, // ISO timestamp completo
        confirmation_date: currentDate, // Apenas a data YYYY-MM-DD
        taken: true,
        notes: `Medicamento tomado via calendário: ${event.title}`,
        created_at: isoTimestamp // ISO timestamp completo
      };
      
      console.log('Dados de confirmação a serem enviados:', confirmationData);
      
      // Inserir o registro na tabela medication_confirmations
      const { error: insertError } = await supabase
        .from('medication_confirmations')
        .insert(confirmationData);
        
      if (insertError) {
        console.error('Erro ao registrar confirmação:', insertError);
        Alert.alert('Erro', `Não foi possível registrar a confirmação do medicamento: ${insertError.message}`);
        return;
      }
      
      // Atualizar o status na tabela medication_schedule_times
      try {
        const { error: updateError } = await supabase
          .from('medication_schedule_times')
          .update({
            status: 'taken',
            complete_datetime: isoTimestamp
          })
          .eq('id', event.id);
          
        if (updateError) {
          console.error('Erro ao atualizar status do medicamento:', updateError);
        }
      } catch (updateError) {
        console.error('Erro ao atualizar status:', updateError);
      }
      
      // Atualizar estatísticas e dados
      await refreshCalendarData();
      
      Alert.alert('Sucesso', `${event.title} marcado como tomado!`);
    } catch (error) {
      console.error('Erro ao processar medicamento:', error);
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
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={fetchTodayMedications}
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Conteúdo principal (sem aninhamento de ScrollViews) */}
        <View style={styles.content}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Your Schedule</Text>
              <View style={styles.calendarActions}>
                <TouchableOpacity 
                  style={[styles.viewToggle, viewMode === 'timeline' && styles.viewToggleActive]}
                  onPress={() => setViewMode('timeline')}
                >
                  <Ionicons 
                    name="time-outline" 
                    size={18} 
                    color={viewMode === 'timeline' ? '#fff' : '#6A8DFD'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons 
                    name="list-outline" 
                    size={18} 
                    color={viewMode === 'list' ? '#fff' : '#6A8DFD'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats do dia */}
            <View style={styles.todayStatsContainer}>
              <View style={styles.todayStatsContent}>
                <View style={styles.todayStatsItem}>
                  <Text style={styles.todayStatsNumber}>{todayStats.total}</Text>
                  <Text style={styles.todayStatsLabel}>Total</Text>
                </View>
                <View style={styles.todayStatsDivider} />
                <View style={styles.todayStatsItem}>
                  <Text style={styles.todayStatsNumber}>{todayStats.completed}</Text>
                  <Text style={styles.todayStatsLabel}>Tomados</Text>
                </View>
                <View style={styles.todayStatsDivider} />
                <View style={styles.todayStatsItem}>
                  <Text style={styles.todayStatsNumber}>{todayStats.total - todayStats.completed}</Text>
                  <Text style={styles.todayStatsLabel}>Pendentes</Text>
                </View>
              </View>
              
              {/* Barra de progresso */}
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${todayStats.total > 0 ? (todayStats.completed / todayStats.total) * 100 : 0}%` }
                  ]} 
                />
              </View>
            </View>

            {/* Selector de dias (sem usar ScrollView) */}
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
                      isSelected && styles.selectedDayText,
                      isToday && styles.todayText
                    ]}>
                      {date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      isToday && styles.todayText
                    ]}>
                      {date.getDate()}
                    </Text>
                    {/* Indicador de medicamentos */}
                    {events.filter(e => 
                      new Date(e.startDate).toDateString() === date.toDateString()
                    ).length > 0 && (
                      <View style={styles.dayEventIndicator} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {viewMode === 'timeline' ? (
              <View style={styles.scrollViewContainer}>
                {isRefreshing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6A8DFD" />
                  </View>
                ) : (
                  <>
                    {/* Timeline View - usar FlatList em vez de ScrollView */}
                    <FlatList
                      ref={hourlyScrollViewRef}
                      style={styles.hourlySchedule}
                      showsVerticalScrollIndicator={true}
                      contentContainerStyle={styles.hourlyScheduleContent}
                      data={getAllHours()}
                      keyExtractor={(hour) => hour.toString()}
                      renderItem={({item: hour}) => {
                        // Filtrar eventos para esta hora
                        const hourEvents = events.filter(event => 
                          new Date(event.startDate).getHours() === hour &&
                          new Date(event.startDate).toDateString() === selectedDate.toDateString()
                        );
                        
                        // Se não houver eventos e não for a hora atual, mostrar versão compacta
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
                                return (
                                  <View key={idx} style={[
                                    styles.eventCard,
                                    event.isTaken && styles.eventCardTaken
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
                                    {!event.isTaken && (
                                      <TouchableOpacity 
                                        style={styles.takePillButton}
                                        onPress={() => takeMedication(event)}
                                      >
                                        <Text style={styles.takePillButtonText}>Tomar</Text>
                                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                                      </TouchableOpacity>
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
                      initialScrollIndex={Math.max(0, currentHour - 2)} // Scroll para a hora atual
                      onScrollToIndexFailed={onScrollToIndexFailed}
                      maxToRenderPerBatch={24}
                      windowSize={10}
                    />
                    <TouchableOpacity 
                      style={styles.currentTimeButton}
                      onPress={() => {
                        hourlyScrollViewRef.current?.scrollToIndex({
                          index: currentHour,
                          animated: true
                        });
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.refreshButton}
                      onPress={refreshCalendarData}
                    >
                      <Ionicons name="refresh-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              // Visualização em lista
              <View style={styles.listViewContainer}>
                {events
                  .filter(event => new Date(event.startDate).toDateString() === selectedDate.toDateString())
                  .length === 0 ? (
                  <View style={styles.emptyListContainer}>
                    <Ionicons name="calendar-outline" size={64} color="#e0e0e0" />
                    <Text style={styles.emptyListText}>Nenhum medicamento agendado para este dia</Text>
                  </View>
                ) : (
                  <FlatList
                    data={events.filter(event => 
                      new Date(event.startDate).toDateString() === selectedDate.toDateString()
                    )}
                    keyExtractor={(item, index) => `${item.id || ''}-${index}`}
                    renderItem={({ item }) => {
                      const eventTime = new Date(item.startDate);
                      return (
                        <View style={styles.listEventCard}>
                          <View style={styles.listEventTime}>
                            <Text style={styles.listEventHour}>
                              {eventTime.getHours().toString().padStart(2, '0')}
                            </Text>
                            <Text style={styles.listEventMinute}>
                              {eventTime.getMinutes().toString().padStart(2, '0')}
                            </Text>
                          </View>
                          <View style={styles.listEventContent}>
                            <Text style={styles.listEventTitle}>{item.title}</Text>
                            {item.notes && (
                              <Text style={styles.listEventNotes}>{item.notes}</Text>
                            )}
                            <TouchableOpacity 
                              style={styles.listTakePillButton}
                              onPress={() => takeMedication(item)}
                            >
                              <Text style={styles.listTakePillButtonText}>Tomar medicamento</Text>
                              <Ionicons name="checkmark-circle" size={16} color="#6A8DFD" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }}
                    contentContainerStyle={styles.listContentContainer}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showMedicationModal}
          onRequestClose={() => setShowMedicationModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Medication Reminder</Text>
              
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
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { width: '95%', maxHeight: '80%' }]}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setTodayMedicationsModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>Medicamentos de Hoje</Text>
              
              {todayMedications.length === 0 ? (
                <View style={styles.emptyMedsContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
                  <Text style={styles.emptyMedsText}>Não há medicamentos agendados para hoje</Text>
                </View>
              ) : (
                <FlatList
                  style={styles.todayMedsList}
                  data={todayMedications}
                  keyExtractor={(item, index) => `timegroup-${index}`}
                  renderItem={({item: timeGroup, index: idx}) => (
                    <View style={styles.timeGroupContainer}>
                      <View style={styles.timeHeader}>
                        <View style={styles.timeLineBefore} />
                        <Text style={styles.timeGroupTime}>
                          {timeGroup.time.substring(0, 5)}
                        </Text>
                        <View style={styles.timeLineAfter} />
                      </View>
                      
                      <FlatList
                        data={timeGroup.medications}
                        keyExtractor={(med, medIdx) => `med-${med.id || medIdx}`}
                        renderItem={({item: med, index: medIdx}) => (
                          <View style={styles.todayMedItem}>
                            <View style={styles.todayMedItemInfo}>
                              <Text style={styles.todayMedTitle}>{med.title}</Text>
                              <Text style={styles.todayMedDosage}>
                                Dose: {med.dosage || med.dosePorVez} comprimido(s)
                              </Text>
                            </View>
                            
                            <TouchableOpacity
                              style={styles.takeMedButton}
                              onPress={() => markMedicationAsTaken(med.id, med.pillId)}
                            >
                              <Ionicons name="checkmark-circle" size={32} color="#2ecc71" />
                            </TouchableOpacity>
                          </View>
                        )}
                        scrollEnabled={false} // Importante: desabilitar scroll interno
                      />
                    </View>
                  )}
                />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  calendarActions: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 2,
  },
  viewToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewToggleActive: {
    backgroundColor: '#6A8DFD',
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
    color: '#6A8DFD',
  },
  dayEventIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B6B',
  },
  scrollViewContainer: {
    position: 'relative',
    height: 350,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  hourlySchedule: {
    height: 350,
  },
  hourlyScheduleContent: {
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  hourRow: {
    flexDirection: 'row',
    paddingVertical: 10,
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
  currentTimeButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#6A8DFD',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  refreshButton: {
    position: 'absolute',
    right: 10,
    bottom: 56,
    backgroundColor: '#75C1E7',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  // Estilos para a visualização em lista
  listViewContainer: {
    height: 350,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  listContentContainer: {
    padding: 10,
  },
  listEventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  listEventTime: {
    alignItems: 'center',
    marginRight: 15,
  },
  listEventHour: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  listEventMinute: {
    fontSize: 14,
    color: '#9BA3B7',
  },
  listEventContent: {
    flex: 1,
  },
  listEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3142',
    marginBottom: 4,
  },
  listEventNotes: {
    fontSize: 13,
    color: '#9BA3B7',
    marginBottom: 8,
  },
  listTakePillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#6A8DFD',
  },
  listTakePillButtonText: {
    color: '#6A8DFD',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListText: {
    fontSize: 16,
    color: '#9BA3B7',
    textAlign: 'center',
    marginTop: 16,
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
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: { 
    position: 'absolute', 
    top: 15, 
    right: 15, 
    zIndex: 1, 
    padding: 5 
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 10,
    textAlign: 'center',
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
    padding: 5,
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
});

export default HomeScreen;
