import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal, FlatList, Animated, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import HealthQuote from '../../Components/HealthQuote';
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
    oxygen: 0,
    workoutMinutes: 0
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

  // Utility function to get date parts directly from datetime string (no timezone conversion)
  const getDatePartsFromDatetime = (datetime) => {
    // Extract date parts directly from the string format YYYY-MM-DD HH:MM:SS
    const dateStr = datetime.split('T')[0]; // Gets YYYY-MM-DD
    const timeStr = datetime.split('T')[1]?.split('.')[0] || '00:00:00'; // Gets HH:MM:SS
    return { dateStr, timeStr };
  };

  // Utility function to format Date object to YYYY-MM-DD string (no timezone conversion)
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    syncAuthState();
    fetchUserData();
    fetchHealthData();
    setupQuickActions();
  }, [isLoggedIn, user]);

  // Additional effect to watch for user changes
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchUserData();
    }
  }, [user?.id, user?.fullname]);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 HomeScreen focused - syncing auth state...');
      syncAuthState();
      fetchUserData();
      fetchEvents();
      fetchHealthData();
    }, [syncAuthState, selectedDate])
  );

  const fetchUserData = async () => {
    try {
      const currentUserData = DataUser.getUserData();
      const authUser = user;
      
      console.log('🔍 [HomeScreen] Fetching user data...', { 
        dataUserData: currentUserData, 
        authUser: authUser, 
        isLoggedIn: isLoggedIn 
      });
      
      // Try to get user data from multiple sources
      let userData = null;
      let userId = null;
      
      // Priority: DataUser -> AuthContext -> try to fetch from DB
      if (currentUserData?.id) {
        userId = currentUserData.id;
        userData = currentUserData;
      } else if (authUser?.id) {
        userId = authUser.id;
        userData = authUser;
      }
      
      if (!userId) {
        console.log('⚠️ [HomeScreen] No user ID found');
        setUserData({
          fullname: '',
          profilePicture: ''
        });
        setIsLoading(false);
        return;
      }

      // If we have user data in memory, use it immediately
      if (userData?.fullname) {
        console.log('✅ [HomeScreen] Using cached user data:', userData.fullname);
        setUserData({
          fullname: userData.fullname || 'User',
          profilePicture: userData.pfpimg ? `data:image/jpeg;base64,${userData.pfpimg}` : null
        });
      }

      // Try to fetch fresh data from database
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('❌ [HomeScreen] Database error:', error);
          // If we have cached data, keep using it
          if (!userData?.fullname) {
            throw error;
          }
        } else if (data) {
          console.log('✅ [HomeScreen] Fresh user data from DB:', data.fullname);
          setUserData({
            fullname: data.fullname || userData?.fullname || 'User',
            profilePicture: data.pfpimg ? `data:image/jpeg;base64,${data.pfpimg}` : null
          });
          
          // Update DataUser with fresh data
          DataUser.updateUserData({
            fullname: data.fullname,
            pfpimg: data.pfpimg
          });
        }
      } catch (dbError) {
        console.error('❌ [HomeScreen] Failed to fetch from database:', dbError);
        // Fall back to cached data if available
        if (userData?.fullname) {
          setUserData({
            fullname: userData.fullname,
            profilePicture: userData.pfpimg ? `data:image/jpeg;base64,${userData.pfpimg}` : null
          });
        } else {
          setUserData({
            fullname: 'User',
            profilePicture: ''
          });
        }
      }
    } catch (error) {
      console.error('❌ [HomeScreen] fetchUserData error:', error);
      setUserData({
        fullname: 'User',
        profilePicture: ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealthData = async () => {
    try {
      setIsLoadingHealth(true);
      console.log('🔄 [HomeScreen] Fetching Samsung Health data...');
      
      const result = await SamsungHealthService.getRawHealthDataForDisplay();
      
      // Load water and workout data from AsyncStorage
      const today = new Date().toISOString().split('T')[0];
      let waterIntake = 0;
      let workoutCalories = 0;
      let workoutMinutes = 0;
      
      try {
        // Get today's water intake
        const todayWaterIntake = await AsyncStorage.getItem(`water_intake_${today}`);
        if (todayWaterIntake) {
          waterIntake = parseInt(todayWaterIntake) / 1000; // Convert ml to liters
        }
        
        // Get today's workouts
        const savedWorkouts = await AsyncStorage.getItem('workout_history');
        if (savedWorkouts) {
          const workoutHistory = JSON.parse(savedWorkouts);
          const todayWorkouts = workoutHistory.filter(workout => workout.date === today);
          workoutCalories = todayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
          workoutMinutes = todayWorkouts.reduce((sum, w) => sum + w.duration, 0);
        }
      } catch (error) {
        console.error('Error loading local health data:', error);
      }
      
      if (result.success) {
        console.log('📊 [HomeScreen] Raw data received:', result);
        
        if (result.totalRecords > 0) {
          // Merge Samsung Health data with local data
          const mergedStats = {
            ...result.summary,
            water: waterIntake > 0 ? waterIntake : result.summary.water,
            calories: result.summary.calories + workoutCalories,
            workoutMinutes: workoutMinutes
          };
          
          setHealthStats(mergedStats);
          setLastSyncTime(new Date().toLocaleTimeString());
          setHealthConnectionStatus('connected');
          console.log('✅ [HomeScreen] Data updated:', mergedStats);
          
          // Process calories details for display
          const caloriesInfo = processCaloriesDetails(result.rawData);
          setCaloriesDetails(caloriesInfo);
        } else {
          console.log('⚠️ [HomeScreen] No data found');
          setHealthConnectionStatus('disconnected');
          setHealthStats({
            steps: 0,
            heartRate: 0,
            calories: workoutCalories,
            sleep: 0,
            water: waterIntake,
            distance: 0,
            oxygen: 0,
            workoutMinutes: workoutMinutes
          });
          setCaloriesDetails({
            total: 0,
            active: 0,
            records: []
          });
        }
      } else {
        console.error('❌ [HomeScreen] Error fetching data:', result.error);
        setHealthConnectionStatus('error');
        // Still show local data even if Samsung Health fails
        setHealthStats({
          steps: 0,
          heartRate: 0,
          calories: workoutCalories,
          sleep: 0,
          water: waterIntake,
          distance: 0,
          oxygen: 0,
          workoutMinutes: workoutMinutes
        });
        Alert.alert('Error', 'Failed to fetch Samsung Health data');
      }
    } catch (error) {
      console.error('❌ [HomeScreen] General error:', error);
      setHealthConnectionStatus('error');
      Alert.alert('Error', 'Unexpected error fetching data');
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // Function to process calories details
  const processCaloriesDetails = (rawData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let total = 0;
    let active = 0;
    const records = [];
    
    // Process total calories
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
    
    // Process active calories
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
          'Health Permissions',
          `Permissions granted: ${result.totalGranted}/${result.totalRequested}\n\nCheck logs for details.`,
          [{ text: 'OK' }]
        );
      } else {
        console.error('❌ [HomeScreen] Error checking permissions:', result.error);
        Alert.alert(
          'Error',
          'Error checking permissions: ' + result.error,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ [HomeScreen] Error checking permissions:', error);
      Alert.alert(
        'Error',
        'Error checking permissions: ' + error.message,
        [{ text: 'OK' }]
      );
    }
  };

  const setupQuickActions = () => {
    const actions = [
      { 
        id: 1, 
        title: 'Vitals History', 
        icon: 'heart', 
        color: '#E74C3C', 
        screen: 'VitalsHistoryScreen',
        description: 'View heart rate, steps, SpO2 history'
      },
      { 
        id: 2, 
        title: 'Body Composition', 
        icon: 'body', 
        color: '#3498DB', 
        screen: 'BodyCompositionHistoryScreen',
        description: 'View weight, body fat history'
      },
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
      },
      { 
        id: 9, 
        title: 'Sleep Tracker', 
        icon: 'moon', 
        color: '#9C88FF', 
        screen: 'SleepTracker',
        description: 'Track your sleep quality'
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

      const formattedDate = formatDateToString(selectedDate);
      
      console.log(`📅 [HomeScreen] Fetching events for date: ${formattedDate} (selected: ${selectedDate.toDateString()}) - NO TIMEZONE CONVERSION`);
      
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
        console.log(`🔍 [HomeScreen] Fetching appointments for userId: ${userId}, role: ${userRole}, date: ${formattedDate}`);
        
        let result = null;
        if (userRole === 'doctor' || userRole === 'medic') {
          result = await AppointmentService.getDoctorAppointments(userId);
        } else {
          result = await AppointmentService.getUserAppointments(userId);
        }
        
        console.log(`📊 [HomeScreen] Appointments result:`, { success: result?.success, count: result?.data?.length });
        
        if (result && result.success && Array.isArray(result.data)) {
          console.log(`📅 [HomeScreen] Total appointments found: ${result.data.length}`);
          
                     // Filter appointments for the selected date (NO timezone conversion)
           const filteredAppointments = result.data.filter(app => {
             const { dateStr } = getDatePartsFromDatetime(app.appointment_datetime);
             const matches = dateStr === formattedDate;
             
             console.log(`🕐 [HomeScreen] Appointment date comparison (RAW):`, {
               original: app.appointment_datetime,
               extractedDate: dateStr,
               selectedFormattedDate: formattedDate,
               matches: matches,
               comparison: `"${dateStr}" === "${formattedDate}" = ${matches}`
             });
             
             if (matches) {
               console.log(`✅ [HomeScreen] Found appointment for ${formattedDate}:`, {
                 id: app.id,
                 datetime: app.appointment_datetime,
                 extractedDate: dateStr,
                 status: app.status,
                 users: app.users,
                 doctors: app.doctors
               });
             }
             
             return matches;
           });
          
          console.log(`📅 [HomeScreen] Appointments for ${formattedDate}: ${filteredAppointments.length}`);
          
                     appointmentEvents = filteredAppointments.map(app => {
             const { dateStr, timeStr } = getDatePartsFromDatetime(app.appointment_datetime);
             const displayTime = timeStr.substring(0, 5); // Get HH:MM only
             
             let otherPerson = '';
             
             if (userRole === 'doctor' || userRole === 'medic') {
               otherPerson = app.users?.fullname || app.users?.name || app.users?.email?.split('@')[0] || 'Patient';
             } else {
               otherPerson = app.doctors?.fullname || app.doctors?.name || app.doctors?.user?.fullname || 'Doctor';
             }
             
             console.log(`👤 [HomeScreen] Appointment with: ${otherPerson} at ${displayTime} (RAW TIME - NO CONVERSION)`);
             
             return {
               id: `appointment-${app.id}`,
               title: `Appointment with ${otherPerson}`,
               startDate: app.appointment_datetime, // Use original datetime
               endDate: app.appointment_datetime, // Use original datetime
               notes: app.location || '',
               scheduledDate: dateStr,
               scheduledTime: displayTime,
               isAppointment: true,
               status: app.status,
               type: 'appointment',
               color: '#4ECDC4',
               originalAppointment: app // Keep original data for debugging
             };
           });
          
          console.log(`✅ [HomeScreen] Created ${appointmentEvents.length} appointment events`);
        } else {
          console.log(`❌ [HomeScreen] No appointments found or error:`, result?.error);
        }
      } catch (err) {
        console.error('❌ [HomeScreen] Error fetching appointments:', err);
      }

      const medicationEvents = medData.map(item => {
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
      });

      const calendarEvents = [
        ...medicationEvents,
        ...appointmentEvents
      ];

      console.log(`📊 [HomeScreen] Final events for ${formattedDate}:`, {
        medications: medicationEvents.length,
        appointments: appointmentEvents.length,
        total: calendarEvents.length,
        events: calendarEvents.map(e => ({ id: e.id, title: e.title, type: e.type }))
      });

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
    const hasEventsResult = events.some(event => {
      const eventDate = new Date(event.startDate);
      const matches = eventDate.toDateString() === date.toDateString();
      
      // Debug log for today's date
      if (isToday(date) && matches) {
        console.log(`📅 [HomeScreen] Event found for today (${date.toDateString()}):`, {
          title: event.title,
          type: event.type,
          eventDate: eventDate.toDateString()
        });
      }
      
      return matches;
    });
    
    return hasEventsResult;
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
      Alert.alert('❌ Error', 'Could not register your confirmation.');
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
            {item.scheduledTime || 'N/A'}
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
        } else if (title === 'Water') {
          navigation.navigate('WaterTracker');
        } else if (title === 'Workout') {
          navigation.navigate('WorkoutTracker');
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
                      {userData?.fullname?.charAt(0) || user?.fullname?.charAt(0) || user?.name?.charAt(0) || DataUser.getUserData()?.fullname?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  <Text style={styles.welcomeText}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</Text>
                  <Text style={styles.userNameText} numberOfLines={1}>
                    {userData?.fullname || user?.fullname || user?.name || DataUser.getUserData()?.fullname || 'User'}
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
            
            

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.healthCardsContainer}>
              {renderHealthCard('Steps', healthStats.steps.toLocaleString(), '', 'walk', '#66BB6A')}
              {renderHealthCard('Heart Rate', healthStats.heartRate, 'bpm', 'heart', '#FF6B6B')}
              {renderHealthCard('Calories', Math.round(healthStats.calories).toLocaleString(), 'kcal', 'flame', '#FF9800')}
              {renderHealthCard('Sleep', `${healthStats.sleep}h`, '', 'moon', '#9C88FF')}
              {renderHealthCard('Water', `${healthStats.water.toFixed(1)}L`, '', 'water', '#26C6DA')}
              {renderHealthCard('Workout', `${healthStats.workoutMinutes}min`, '', 'fitness', '#9C27B0')}
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
              <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
                Selected: {selectedDate.toISOString().split('T')[0]} | Total events: {events.length}
              </Text>
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
              <Text style={styles.modalTitle}>🔥 Calories Details</Text>
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
                <Text style={styles.caloriesSummaryLabel}>Active</Text>
                <Text style={styles.caloriesSummaryValue}>{caloriesDetails.active} cal</Text>
              </View>
            </View>
            
            <Text style={styles.caloriesRecordsTitle}>Today's Records:</Text>
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
                <Text style={styles.noCaloriesText}>No calorie records found for today</Text>
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
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#6A8DFD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(106, 141, 253, 0.1)',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 141, 253, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3142',
    letterSpacing: 0.5,
  },
  healthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  healthStatusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  healthCardsContainer: {
    marginTop: 10,
  },
  healthCard: {
    flex: 1,
    margin: 4,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  healthCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  healthCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    marginTop: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    alignItems: 'center',
    marginTop: 15,
  },
  syncButton: {
    backgroundColor: '#6A8DFD',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastSyncText: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    marginBottom: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
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