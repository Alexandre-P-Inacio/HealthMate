import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal, FlatList, Animated, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import HealthQuote from '../../Components/HealthQuote';
import FunZone from '../../Components/FunZone';
import { AppointmentService } from '../../services/AppointmentService';
import SamsungHealthService from '../../services/SamsungHealthService';
import { useAuth } from '../../contexts/AuthContext';
import LocalStorageService from '../../services/LocalStorageService';
import { FontAwesome5 } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const HomeScreen = () => {
  const { isLoggedIn, user, syncAuthState } = useAuth();
  const [userData, setUserData] = useState({
    fullname: '',
    profilePicture: ''
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingHealth, setIsSyncingHealth] = useState(false);
  const [healthStats, setHealthStats] = useState({
    steps: 0,
    heartRate: 0,
    calories: 0,
    sleep: 0,
    water: 0,
    oxygen: 0
  });
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [healthConnectionStatus, setHealthConnectionStatus] = useState('disconnected');
  const [quickActions, setQuickActions] = useState([]);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showCaloriesDetails, setShowCaloriesDetails] = useState(false);
  const [caloriesDetails, setCaloriesDetails] = useState({
    total: 0,
    active: 0,
    records: []
  });
  const [showBodyCompModal, setShowBodyCompModal] = useState(false);
  const [bodyCompData, setBodyCompData] = useState(null);
  const [isLoadingBodyComp, setIsLoadingBodyComp] = useState(false);
  const navigation = useNavigation();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  useEffect(() => {
    syncAuthState();
    fetchUserData();
    fetchHealthData();
    setupQuickActions();
  }, [isLoggedIn]);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 HomeScreen focused - syncing auth state...');
      syncAuthState();
      fetchEvents();
      fetchHealthData();
    }, [syncAuthState, selectedDate])
  );

  const fetchUserData = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      
      if (!userId) {
        setUserData({
          fullname: '',
          profilePicture: ''
        });
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
      setUserData({
        fullname: '',
        profilePicture: ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealthData = async () => {
    try {
      setIsLoadingHealth(true);
      console.log('🔄 [HomeScreen] Buscando dados do Samsung Health...');
      
      const result = await SamsungHealthService.getRawHealthDataForDisplay();
      
      if (result.success) {
        console.log('📊 [HomeScreen] Dados brutos recebidos:', result);
        
        if (result.totalRecords > 0) {
          setHealthStats(result.summary);
          setLastSyncTime(new Date().toLocaleTimeString());
          console.log('✅ [HomeScreen] Dados atualizados:', result.summary);
          
          // Processa detalhes das calorias para exibição
          const caloriesInfo = processCaloriesDetails(result.rawData);
          setCaloriesDetails(caloriesInfo);
        } else {
          console.log('⚠️ [HomeScreen] Nenhum dado encontrado');
          setHealthStats({
            steps: 0,
            heartRate: 0,
            calories: 0,
            sleep: 0,
            water: 0,
            weight: 0,
            distance: 0,
            oxygen: 0
          });
          setCaloriesDetails({
            total: 0,
            active: 0,
            records: []
          });
        }
      } else {
        console.error('❌ [HomeScreen] Erro ao buscar dados:', result.error);
        Alert.alert('Erro', 'Falha ao buscar dados do Samsung Health');
      }
    } catch (error) {
      console.error('❌ [HomeScreen] Erro geral:', error);
      Alert.alert('Erro', 'Erro inesperado ao buscar dados');
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // Função para processar detalhes das calorias
  const processCaloriesDetails = (rawData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let total = 0;
    let active = 0;
    const records = [];
    
    // Processa calorias totais
    const totalRecords = rawData.caloriesTotalData?.records || [];
    totalRecords.forEach(record => {
      const recordDate = new Date(record.endTime);
      const isToday = recordDate >= today;
      
      let caloriesValue = 0;
      if (record.energy && record.energy.value !== undefined) {
        caloriesValue = record.energy.value;
      } else if (record.value !== undefined) {
        caloriesValue = record.value;
      }
      
      if (isToday) {
        total += caloriesValue;
        records.push({
          type: 'Total',
          value: Math.round(caloriesValue),
          time: new Date(record.endTime).toLocaleTimeString(),
          startTime: new Date(record.startTime).toLocaleTimeString()
        });
      }
    });
    
    // Processa calorias ativas
    const activeRecords = rawData.caloriesActiveData?.records || [];
    activeRecords.forEach(record => {
      const recordDate = new Date(record.endTime);
      const isToday = recordDate >= today;
      
      let caloriesValue = 0;
      if (record.energy && record.energy.value !== undefined) {
        caloriesValue = record.energy.value;
      } else if (record.value !== undefined) {
        caloriesValue = record.value;
      }
      
      if (isToday) {
        active += caloriesValue;
        records.push({
          type: 'Active',
          value: Math.round(caloriesValue),
          time: new Date(record.endTime).toLocaleTimeString(),
          startTime: new Date(record.startTime).toLocaleTimeString()
        });
      }
    });
    
    return {
      total: Math.round(total),
      active: Math.round(active),
      records: records.sort((a, b) => new Date(b.time) - new Date(a.time))
    };
  };

  const handleSyncHealthData = async () => {
    await fetchHealthData();
  };

  const handleCheckPermissions = async () => {
    try {
      console.log('🔍 [HomeScreen] Verificando permissões...');
      const result = await SamsungHealthService.checkCurrentPermissions();
      
      if (result.success) {
        console.log('✅ [HomeScreen] Permissões verificadas:', result);
        Alert.alert(
          'Permissões de Saúde',
          `Permissões concedidas: ${result.totalGranted}/${result.totalRequested}\n\nVerifique os logs para detalhes.`,
          [{ text: 'OK' }]
        );
      } else {
        console.error('❌ [HomeScreen] Erro ao verificar permissões:', result.error);
        Alert.alert(
          'Erro',
          'Erro ao verificar permissões: ' + result.error,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ [HomeScreen] Erro ao verificar permissões:', error);
      Alert.alert(
        'Erro',
        'Erro ao verificar permissões: ' + error.message,
        [{ text: 'OK' }]
      );
    }
  };

  const setupQuickActions = () => {
    const actions = [
      { 
        id: 3, 
        title: 'Book Appointment', 
        icon: 'calendar', 
        color: '#45B7D1', 
        screen: 'DoctorsScreen',
        description: 'Schedule with doctors'
      },
      { 
        id: 4, 
        title: 'Mood Tracker', 
        icon: 'happy', 
        color: '#F7CA88', 
        screen: 'MoodTracker',
        description: 'Log your daily mood'
      },
      { 
        id: 5, 
        title: 'Vital Signs', 
        icon: 'pulse', 
        color: '#FB8C00', 
        screen: 'VitalSigns',
        description: 'Monitor blood pressure, heart rate'
      },
      { 
        id: 6, 
        title: 'Sleep Tracker', 
        icon: 'moon', 
        color: '#8E24AA', 
        screen: 'SleepTracker',
        description: 'Track sleep patterns'
      },
      { 
        id: 7, 
        title: 'Water Intake', 
        icon: 'water', 
        color: '#26C6DA', 
        screen: 'WaterTracker',
        description: 'Stay hydrated'
      },
      { 
        id: 8, 
        title: 'Workout Log', 
        icon: 'fitness', 
        color: '#66BB6A', 
        screen: 'WorkoutTracker',
        description: 'Track exercises and fitness'
      }
    ];
    setQuickActions(actions);
  };

  const fetchEvents = async () => {
    try {
      setIsRefreshing(true);
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      const userRole = userData?.role;
      
      if (!isLoggedIn || !userId) {
        try {
          const localEvents = await LocalStorageService.getCalendarEvents(selectedDate);
          setEvents(localEvents || []);
        } catch (error) {
          console.error('Error loading local events:', error);
          setEvents([]);
        }
        setIsRefreshing(false);
        return;
      }

      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Fetch medication events
      const { data: medData, error: medError } = await supabase
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

      if (medError) {
        setIsRefreshing(false);
        return;
      }

      // Fetch appointments
      let appointmentEvents = [];
      try {
        let result = null;
        if (userRole === 'doctor' || userRole === 'medic') {
          result = await AppointmentService.getDoctorAppointments(userId);
        } else {
          result = await AppointmentService.getUserAppointments(userId);
        }
        
        if (result && result.success && Array.isArray(result.data)) {
          appointmentEvents = result.data
            .filter(app => {
              const appDate = new Date(app.appointment_datetime);
              return appDate.toISOString().split('T')[0] === formattedDate;
            })
            .map(app => {
              const appDate = new Date(app.appointment_datetime);
              let otherPerson = '';
              if (userRole === 'doctor' || userRole === 'medic') {
                otherPerson = app.users?.fullname || 'Patient';
              } else {
                otherPerson = app.doctors?.name || 'Doctor';
              }
              
              return {
                id: `appointment-${app.id}`,
                title: `Appointment with ${otherPerson}`,
                startDate: appDate.toISOString(),
                endDate: new Date(appDate.getTime() + 60 * 60000).toISOString(),
                notes: app.location || '',
                scheduledDate: appDate.toISOString().split('T')[0],
                scheduledTime: appDate.toTimeString().substring(0, 5),
                isAppointment: true,
                status: app.status,
                type: 'appointment',
                color: '#4ECDC4',
              };
            });
        }
      } catch (err) {
        console.error('Error fetching appointments:', err);
      }

      const calendarEvents = [
        ...medData.map(item => {
          const isTaken = item.status === 'taken';
          const timeComponents = item.scheduled_time?.split(':') || ['08', '00', '00'];
          const hours = parseInt(timeComponents[0], 10);
          const minutes = parseInt(timeComponents[1], 10);
          const eventDate = new Date(item.scheduled_date);
          eventDate.setHours(hours, minutes, 0, 0);
          
          return {
            id: item.id,
            title: item.pills_warning?.titulo || 'Medication',
            startDate: eventDate.toISOString(),
            endDate: new Date(eventDate.getTime() + 30 * 60000).toISOString(),
            notes: `Dose: ${item.dosage || item.pills_warning?.quantidade_comprimidos_por_vez || 1} tablet(s)`,
            scheduledDate: item.scheduled_date,
            scheduledTime: item.scheduled_time,
            pill_id: item.pill_id,
            isTaken: isTaken,
            status: item.status || 'pending',
            type: 'medication',
            color: isTaken ? '#66BB6A' : '#FF6B6B',
          };
        }),
        ...appointmentEvents
      ];

      setEvents(calendarEvents);
      setIsRefreshing(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setIsRefreshing(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the first Monday of the calendar grid
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      days.push(currentDate);
    }
    
    return days;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  const hasEvents = (date) => {
    return events.some(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleQuickAction = (action) => {
    setShowQuickActionsModal(false);
    if (isLoggedIn || action.screen === 'MedicalDiaryScreen') {
      navigation.navigate(action.screen);
    } else {
          Alert.alert(
        'Login Required',
        'Please login to access this feature',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('WelcomeScreen') }
        ]
      );
    }
  };

  const handleEmergency = () => {
      Alert.alert(
      '🚨 Emergency',
      'Do you need immediate medical assistance?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Emergency Contacts', onPress: () => navigation.navigate('EmergencyContacts') },
        { text: 'Call 911', onPress: () => console.log('Calling emergency services...'), style: 'destructive' }
      ]
    );
  };

  // Função para verificar se medicamento está atrasado ou se o horário passou
  const isMedicationTimePassed = (medication) => {
    if (medication.type !== 'medication') return false;
    
    const now = new Date();
    const scheduledDate = medication.scheduledDate || selectedDate.toISOString().split('T')[0];
    const medicationDateTime = new Date(`${scheduledDate}T${medication.scheduledTime}`);
    return medicationDateTime <= now && medication.status === 'pending';
  };

  // Confirmar medicamento (Tomei/Pulei) - corrigido para mostrar "jumped"
  const confirmMedicationTaken = async (medication, taken) => {
    try {
      if (isLoggedIn) {
        // Atualizar no Supabase se estiver logado
        const { error } = await supabase
          .from('medication_schedule_times')
          .update({ 
            status: taken ? 'taken' : 'jumped',
            complete_datetime: new Date().toISOString()
          })
          .eq('id', medication.id);
        
        if (error) throw error;
        
        Alert.alert(
          taken ? '✅ Medicamento Confirmado' : '⚠️ Medicamento Pulado',
          taken ? `${medication.title} marcado como tomado!` : `${medication.title} marcado como pulado.`,
          [{ text: 'OK' }]
        );
      } else {
        // Atualizar localmente se não estiver logado
        await LocalStorageService.updateMedicationStatus(
          medication.id, 
          taken ? 'taken' : 'jumped'
        );
        
        Alert.alert(
          taken ? '✅ Medicamento Confirmado' : '⚠️ Medicamento Pulado',
          taken ? `${medication.title} marcado como tomado!` : `${medication.title} marcado como pulado.`,
          [{ text: 'OK' }]
        );
      }
      
      // Recarregar eventos
      fetchEvents();
    } catch (error) {
      console.error('Error confirming medication:', error);
      Alert.alert('❌ Erro', 'Não foi possível registrar sua confirmação.');
    }
  };

  const renderCalendarDay = (date, index) => {
    const isCurrentMonthDay = isCurrentMonth(date);
    const isTodayDate = isToday(date);
    const isSelectedDate = isSelected(date);
    const dayHasEvents = hasEvents(date);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.calendarDay,
          isSelectedDate && styles.selectedDay,
          isTodayDate && !isSelectedDate && styles.todayDay,
          !isCurrentMonthDay && styles.otherMonthDay
        ]}
        onPress={() => setSelectedDate(date)}
        disabled={!isCurrentMonthDay}
      >
        <Text
          style={[
            styles.calendarDayText,
            isSelectedDate && styles.selectedDayText,
            isTodayDate && !isSelectedDate && styles.todayDayText,
            !isCurrentMonthDay && styles.otherMonthDayText
          ]}
        >
          {date.getDate()}
        </Text>
        {dayHasEvents && (
          <View style={[
            styles.eventDot,
            isSelectedDate && styles.selectedEventDot
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEventItem = ({ item, index }) => {
    const eventTime = new Date(item.startDate);
    const isUpcoming = eventTime > new Date();
    const isPast = eventTime < new Date();
    const timePassed = isMedicationTimePassed(item);
    const isLate = isPast && item.status === 'pending' && item.type === 'medication';
    const isJumped = item.status === 'jumped' && item.type === 'medication';

    return (
      <View style={[
        styles.eventCard, 
        { borderLeftColor: item.color },
        isLate && styles.lateEventCard,
        isJumped && styles.jumpedEventCard
      ]}>
        <View style={styles.eventTimeContainer}>
          <Text style={styles.eventTime}>
            {item.scheduledTime?.substring(0, 5) || eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isLate && (
            <Text style={styles.lateLabel}>Atrasado</Text>
          )}
          {isPast && !item.status && item.type !== 'medication' && (
            <Text style={styles.pastLabel}>Past</Text>
          )}
          {isUpcoming && (
            <Text style={styles.upcomingLabel}>Upcoming</Text>
          )}
          {timePassed && !isLate && item.type === 'medication' && (
            <Text style={styles.readyLabel}>Pronto</Text>
          )}
        </View>
        
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>
            {item.type === 'appointment' && '🏥 '}
            {item.type === 'medication' && (
              isJumped ? '⏭️ ' : '💊 '
            )}
            {item.title}
          </Text>
          {item.notes && (
            <Text style={styles.eventNotes}>{item.notes}</Text>
          )}
          {item.status && (
            <View style={[
              styles.statusBadge,
              item.status === 'taken' ? styles.takenBadge :
              item.status === 'jumped' ? styles.jumpedBadge :
              styles.pendingBadge
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'taken' ? styles.takenText :
                item.status === 'jumped' ? styles.jumpedText :
                styles.pendingText
              ]}>
                {item.status === 'taken' ? 'Completed' : item.status === 'jumped' ? 'Jumped' : 'Pending'}
              </Text>
            </View>
          )}
          {/* Botões de confirmação apenas para medicamentos após o horário */}
          {item.type === 'medication' && timePassed && item.status === 'pending' && (
            <View style={styles.medicationActions}>
              <TouchableOpacity 
                style={styles.missedButton}
                onPress={() => confirmMedicationTaken(item, false)}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.medicationActionText}>Pulei</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.takenButton}
                onPress={() => confirmMedicationTaken(item, true)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.medicationActionText}>Tomei</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const fetchBodyCompositionData = async () => {
    setIsLoadingBodyComp(true);
    setShowBodyCompModal(true);
    try {
      const result = await SamsungHealthService.getRawHealthDataForDisplay();
      if (result.success && result.rawData) {
        const raw = result.rawData;
        setBodyCompData({
          weight: raw.weightData?.records?.[0]?.weight?.inKilograms ?? '--',
          height: raw.heightData?.records?.[0]?.height?.inMeters ?? '--',
          bodyFat: raw.bodyFatData?.records?.[0]?.percentage ?? '--',
          leanBodyMass: raw.leanBodyMassData?.records?.[0]?.mass?.inKilograms ?? '--',
          bodyWaterMass: raw.bodyWaterMassData?.records?.[0]?.mass?.inKilograms ?? '--',
          boneMass: raw.boneMassData?.records?.[0]?.mass?.inKilograms ?? '--',
          bmr: raw.basalMetabolicRateData?.records?.[0]?.basalMetabolicRate?.inKilocaloriesPerDay ?? '--',
        });
      } else {
        setBodyCompData(null);
      }
    } catch (e) {
      setBodyCompData(null);
    } finally {
      setIsLoadingBodyComp(false);
    }
  };

  const renderHealthCard = (title, value, unit, icon, color) => (
    <TouchableOpacity 
      style={[styles.healthCard, { backgroundColor: color }]}
      onPress={() => {
        if (title === 'Calories') {
          setShowCaloriesDetails(true);
        } else if (title === 'Weight') {
          fetchBodyCompositionData();
        }
      }}
    >
      <View style={styles.healthCardContent}>
        {title === 'Weight' ? (
          <FontAwesome5 name="weight" size={24} color="white" />
        ) : (
          <Ionicons name={icon} size={24} color="white" />
        )}
        <Text style={styles.healthCardValue}>{value}{unit}</Text>
        <Text style={styles.healthCardTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A8DFD" />
        <Text style={styles.loadingText}>Loading HealthMate...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A8DFD" />
      
      {/* Header */}
      <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {isLoggedIn ? (
              <>
                {userData?.profilePicture ? (
                  <Image source={{ uri: userData.profilePicture }} style={styles.profilePicture} />
                ) : (
                  <View style={[styles.profilePicture, styles.profilePlaceholder]}>
                    <Text style={styles.profilePlaceholderText}>
                      {userData?.fullname?.charAt(0) || user?.fullname?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  <Text style={styles.welcomeText}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</Text>
                  <Text style={styles.userNameText} numberOfLines={1}>
                    {userData?.fullname || user?.fullname || 'User'}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.profilePicture, styles.profilePlaceholder]}>
                  <Ionicons name="person" size={20} color="#6A8DFD" />
                </View>
                <TouchableOpacity 
                  style={styles.headerTextContainer}
                  onPress={() => navigation.navigate('WelcomeScreen')}
                >
                  <Text style={styles.welcomeText}>Welcome to HealthMate!</Text>
                  <Text style={styles.loginText} numberOfLines={1}>
                    Login or Sign Up
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergency}
            >
              <Ionicons name="medical" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setShowQuickActionsModal(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
                  </View>
      </LinearGradient>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              fetchEvents();
              fetchHealthData();
            }}
            colors={['#6A8DFD']}
            tintColor="#6A8DFD"
          />
        }
      >
        {/* Health Stats Overview */}
        {isLoggedIn && (
          <View style={styles.healthStatsContainer}>
            <View style={styles.healthHeader}>
              <Text style={styles.sectionTitle}>Health Overview</Text>
              <View style={styles.healthStatusContainer}>
                <View style={[
                  styles.statusDot, 
                  { 
                    backgroundColor: healthConnectionStatus === 'connected' ? '#4CAF50' : 
                                   healthConnectionStatus === 'error' ? '#F44336' : 
                                   healthConnectionStatus === 'permission_denied' ? '#FF9800' : '#9E9E9E' 
                  }
                ]} />
                <Text style={styles.healthStatusText}>
                  {healthConnectionStatus === 'connected' ? 'Connected' :
                   healthConnectionStatus === 'error' ? 'Error' :
                   healthConnectionStatus === 'permission_denied' ? 'Permissions Needed' : 'Disconnected'}
                </Text>
              </View>
            </View>
            
            {lastSyncTime && (
              <Text style={styles.lastSyncText}>
                Last sync: {lastSyncTime} • Samsung Health
              </Text>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.healthCardsContainer}>
              {renderHealthCard('Steps', healthStats.steps.toLocaleString(), 'steps', 'walk', '#66BB6A')}
              {renderHealthCard('Heart Rate', healthStats.heartRate, 'bpm', 'heart', '#FF6B6B')}
              {renderHealthCard('Calories', Math.round(healthStats.calories).toLocaleString(), 'kcal', 'flame', '#FF9800')}
              {renderHealthCard('O2 Level', `${healthStats.oxygen}%`, 'oxygen', 'pulse', '#4CAF50')}
              {renderHealthCard('Sleep', `${healthStats.sleep}h`, 'hours', 'moon', '#8E24AA')}
              {renderHealthCard('Water', `${healthStats.water.toFixed(1)}L`, 'liters', 'water', '#26C6DA')}
              {renderHealthCard('Weight', healthStats.weight ?? '--', 'kg', 'barbell', '#4A67E3')}
            </ScrollView>

            <View style={styles.healthActionsContainer}>
              <TouchableOpacity
                style={[styles.syncButton, isLoadingHealth && styles.syncButtonDisabled]}
                onPress={handleSyncHealthData}
                disabled={isLoadingHealth}
              >
                <View style={styles.syncButtonContent}>
                  {isLoadingHealth ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="#fff" />
                  )}
                  <Text style={styles.syncButtonText}>
                    {isLoadingHealth ? 'Syncing...' : 'Sync Now'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsButton}
                onPress={handleCheckPermissions}
              >
                <Ionicons name="settings-outline" size={20} color="#6A8DFD" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavButton}>
                  <Ionicons name="chevron-back" size={20} color="#6A8DFD" />
                </TouchableOpacity>
                
            <TouchableOpacity onPress={() => setCurrentDate(new Date())} style={styles.monthTitleContainer}>
              <Text style={styles.monthTitle}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </Text>
                </TouchableOpacity>
                
            <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavButton}>
                  <Ionicons name="chevron-forward" size={20} color="#6A8DFD" />
                </TouchableOpacity>
              </View>

          {/* Day names header */}
          <View style={styles.dayNamesContainer}>
            {dayNames.map((day, index) => (
              <Text key={index} style={styles.dayName}>{day}</Text>
                ))}
              </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {getDaysInMonth(currentDate).map((date, index) => renderCalendarDay(date, index))}
                          </View>
              </View>

        {/* Selected Date Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          
          {events.length === 0 ? (
            <View style={styles.noEventsContainer}>
                    <Ionicons name="calendar-clear-outline" size={48} color="#9BA3B7" />
              <Text style={styles.noEventsTitle}>No events today</Text>
              <Text style={styles.noEventsText}>
                      {isLoggedIn ? 
                  'Your schedule is clear for this day.' :
                  'Add medications or notes in the Medical Diary.\nData is saved locally.'
                      }
                    </Text>
                    <TouchableOpacity 
                      style={styles.addEventButton}
                      onPress={() => navigation.navigate(isLoggedIn ? 'MedicationTracker' : 'MedicalDiaryScreen')}
                    >
                      <Ionicons name="add-circle" size={20} color="#FFF" />
                      <Text style={styles.addEventButtonText}>
                  {isLoggedIn ? 'Add Medication' : 'Open Diary'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
            <FlatList
              data={events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))}
              renderItem={renderEventItem}
              keyExtractor={(item, index) => `${item.id}-${index}`}
                    showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
                              )}
                            </View>
                            
        {/* Quick Health Tips */}
        <View style={styles.tipsSection}>
          <HealthQuote />
        </View>
      </ScrollView>

      {/* Quick Actions Modal */}
      <Modal
        visible={showQuickActionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickActionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              <TouchableOpacity 
                onPress={() => setShowQuickActionsModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
                              </View>
                              
            <ScrollView style={styles.quickActionsGrid} showsVerticalScrollIndicator={false}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.quickActionCard, { borderLeftColor: action.color }]}
                  onPress={() => handleQuickAction(action)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon} size={24} color="#fff" />
                            </View>
                  <View style={styles.quickActionText}>
                    <Text style={styles.quickActionTitle}>{action.title}</Text>
                    <Text style={styles.quickActionDescription}>{action.description}</Text>
                          </View>
                  <Ionicons name="chevron-forward" size={20} color="#9BA3B7" />
                </TouchableOpacity>
              ))}
                  </ScrollView>
              </View>
            </View>
      </Modal>

      {/* Modal de Detalhes das Calorias */}
      <Modal
        visible={showCaloriesDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCaloriesDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.caloriesModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔥 Detalhes das Calorias</Text>
              <TouchableOpacity onPress={() => setShowCaloriesDetails(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.caloriesSummary}>
              <View style={styles.caloriesSummaryItem}>
                <Text style={styles.caloriesSummaryLabel}>Total</Text>
                <Text style={styles.caloriesSummaryValue}>{caloriesDetails.total} cal</Text>
              </View>
              <View style={styles.caloriesSummaryItem}>
                <Text style={styles.caloriesSummaryLabel}>Ativas</Text>
                <Text style={styles.caloriesSummaryValue}>{caloriesDetails.active} cal</Text>
              </View>
            </View>
            
            <Text style={styles.caloriesRecordsTitle}>Registros de Hoje:</Text>
            <ScrollView style={styles.caloriesRecordsList}>
              {caloriesDetails.records.length > 0 ? (
                caloriesDetails.records.map((record, index) => (
                  <View key={index} style={styles.caloriesRecordItem}>
                    <View style={styles.caloriesRecordHeader}>
                      <Text style={[
                        styles.caloriesRecordType, 
                        { color: record.type === 'Total' ? '#FF6B35' : '#4CAF50' }
                      ]}>
                        {record.type}
                      </Text>
                      <Text style={styles.caloriesRecordValue}>{record.value} cal</Text>
                    </View>
                    <Text style={styles.caloriesRecordTime}>
                      {record.startTime} - {record.time}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noCaloriesText}>Nenhum registro de calorias encontrado para hoje</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Composição Corporal */}
      <Modal
        visible={showBodyCompModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBodyCompModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.caloriesModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚖️ Body Composition</Text>
              <TouchableOpacity onPress={() => setShowBodyCompModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {isLoadingBodyComp ? (
              <View style={{ alignItems: 'center', marginVertical: 30 }}>
                <ActivityIndicator size="large" color="#4A67E3" />
                <Text style={{ marginTop: 10 }}>Loading...</Text>
              </View>
            ) : bodyCompData ? (
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Latest Measurements:</Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>Weight: {bodyCompData.weight} kg</Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>Height: {bodyCompData.height} m</Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>Body Fat: {bodyCompData.bodyFat} %</Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>Lean Body Mass: {bodyCompData.leanBodyMass} kg</Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>Body Water Mass: {bodyCompData.bodyWaterMass} kg</Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>Bone Mass: {bodyCompData.boneMass} kg</Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>Basal Metabolic Rate: {bodyCompData.bmr} kcal/day</Text>
              </View>
            ) : (
              <Text style={{ color: '#E74C3C', textAlign: 'center', marginVertical: 30 }}>No body composition data found.</Text>
            )}
          </View>
        </View>
      </Modal>

      <Navbar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A8DFD',
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
    fontWeight: '500',
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  profilePicture: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
  },
  profilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8ECF4',
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
    fontSize: 14,
    color: '#E8ECF4',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loginText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textDecorationLine: 'underline',
  },
  emergencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  healthStatsContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 15,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  healthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthStatusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  healthCardsContainer: {
    marginTop: 10,
  },
  healthCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  healthCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginTop: 4,
    textAlign: 'center',
  },
  healthCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  calendarSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  dayNamesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9BA3B7',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100/7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: '#6A8DFD',
    borderRadius: 12,
  },
  todayDay: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3142',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#E65100',
    fontWeight: 'bold',
  },
  otherMonthDayText: {
    color: '#9BA3B7',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6A8DFD',
    position: 'absolute',
    bottom: 6,
  },
  selectedEventDot: {
    backgroundColor: '#fff',
  },
  eventsSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  eventTimeContainer: {
    alignItems: 'center',
    marginRight: 15,
    minWidth: 60,
  },
  eventTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 4,
  },
  pastLabel: {
    fontSize: 10,
    color: '#F44336',
    fontWeight: '600',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  upcomingLabel: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 4,
  },
  eventNotes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  takenBadge: {
    backgroundColor: '#E8F5E8',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  takenText: {
    color: '#4CAF50',
  },
  pendingText: {
    color: '#FF9800',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginTop: 10,
    marginBottom: 8,
  },
  noEventsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A8DFD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#6A8DFD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addEventButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipsSection: {
    marginHorizontal: 15,
    marginBottom: 100,
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
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsGrid: {
    padding: 20,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 12,
    color: '#666',
  },
  lateEventCard: {
    borderLeftColor: '#FF9800',
  },
  lateLabel: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  readyLabel: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  medicationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  missedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  takenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  medicationActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  healthActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    gap: 10,
  },
  syncButton: {
    backgroundColor: '#6A8DFD',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  syncButtonDisabled: {
    backgroundColor: '#E8ECF4',
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  lastSyncText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginBottom: 8,
  },
  caloriesModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  caloriesSummary: {
    marginBottom: 20,
  },
  caloriesSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  caloriesSummaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  caloriesSummaryValue: {
    fontSize: 14,
    color: '#666',
  },
  caloriesRecordsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 10,
  },
  caloriesRecordsList: {
    maxHeight: 200,
  },
  caloriesRecordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  caloriesRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caloriesRecordType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3142',
    marginRight: 10,
  },
  caloriesRecordValue: {
    fontSize: 14,
    color: '#666',
  },
  caloriesRecordTime: {
    fontSize: 12,
    color: '#999',
  },
  noCaloriesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  jumpedEventCard: {
    backgroundColor: '#FFF7E6',
    borderLeftColor: '#FFA726',
  },
  jumpedBadge: {
    backgroundColor: '#FFE0B2',
  },
  jumpedText: {
    color: '#FFA726',
  },
});

export default HomeScreen;