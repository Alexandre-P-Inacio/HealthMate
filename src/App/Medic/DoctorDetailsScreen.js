import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../Components/Navbar';
import DataUser from '../../../navigation/DataUser';
import { DoctorAvailabilityService } from '../../services/DoctorAvailabilityService';
import supabase from '../../../supabase';

const WEEKDAYS = [
  { key: 'sunday', label: 'Sun', idx: 0 },
  { key: 'monday', label: 'Mon', idx: 1 },
  { key: 'tuesday', label: 'Tue', idx: 2 },
  { key: 'wednesday', label: 'Wed', idx: 3 },
  { key: 'thursday', label: 'Thu', idx: 4 },
  { key: 'friday', label: 'Fri', idx: 5 },
  { key: 'saturday', label: 'Sat', idx: 6 },
];
const defaultSchedule = {
  monday: { start: '08:00', end: '18:00' },
  tuesday: { start: '08:00', end: '18:00' },
  wednesday: { start: '08:00', end: '18:00' },
  thursday: { start: '08:00', end: '18:00' },
  friday: { start: '08:00', end: '18:00' },
  saturday: { start: '', end: '' },
  sunday: { start: '', end: '' }
};

const DoctorDetailsScreen = ({ route, navigation }) => {
  const { doctor } = route.params;
  const [isMedic, setIsMedic] = useState(false);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [isFavorite, setIsFavorite] = useState(false);
  const [doctorRatings, setDoctorRatings] = useState([]);
  const [doctorComments, setDoctorComments] = useState([]);

  useEffect(() => {
    const currentUser = DataUser.getUserData();
    if (currentUser) {
      // Verifica se o ID do usuário logado corresponde ao ID do médico (assumindo que doctor.id é o user.id)
      setIsMedic(currentUser.role === 'doctor' && currentUser.id === doctor.id);
    }
    // Buscar disponibilidade do médico
    const fetchAvailability = async () => {
      const result = await DoctorAvailabilityService.getAvailabilityByDoctorId(doctor.id);
      if (result.success) {
        const blankSchedule = { ...defaultSchedule };
        const recurring = result.data.filter(a => a.is_recurring && a.start_time && a.end_time);
        let hasAny = false;
        recurring.forEach(slot => {
          const dayKey = WEEKDAYS.find(d => d.idx === slot.day_of_week)?.key;
          if (dayKey) {
            blankSchedule[dayKey] = {
              start: slot.start_time ? slot.start_time.substring(0,5) : '',
              end: slot.end_time ? slot.end_time.substring(0,5) : ''
            };
            hasAny = true;
          }
        });
        setSchedule(hasAny ? blankSchedule : defaultSchedule);
      } else {
        setSchedule(defaultSchedule);
      }
    };
    fetchAvailability();
  }, [doctor]); // Adicione doctor como dependência

  // Buscar favoritos do usuário no Supabase
  useEffect(() => {
    const fetchFavorite = async () => {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;
      const { data: user, error } = await supabase
        .from('users')
        .select('favorite_doctors')
        .eq('id', userId)
        .single();
      if (user && user.favorite_doctors) {
        const favs = user.favorite_doctors.split(';').map(s => s.trim()).filter(Boolean);
        setIsFavorite(favs.includes(String(doctor.id)));
      } else {
        setIsFavorite(false);
      }
    };
    fetchFavorite();
  }, [doctor]);

  useEffect(() => {
    const fetchRatings = async () => {
      const { data, error } = await supabase.from('doctor_ratings').select('rating').eq('doctor_id', doctor.id);
      if (!error && data) {
        setDoctorRatings(data.map(r => r.rating));
      }
    };
    fetchRatings();
  }, [doctor.id]);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('doctor_ratings')
        .select('rating, comment, is_anonymous, user_id, users (fullname)')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false });
      if (!error && data) setDoctorComments(data);
    };
    fetchComments();
  }, [doctor.id]);

  const handleToggleFavorite = async () => {
    const userId = DataUser.getUserData()?.id;
    if (!userId) return;
    const { data: user, error } = await supabase
      .from('users')
      .select('favorite_doctors')
      .eq('id', userId)
      .single();
    let favs = [];
    if (user && user.favorite_doctors) {
      favs = user.favorite_doctors.split(';').map(s => s.trim()).filter(Boolean);
    }
    const doctorIdStr = String(doctor.id);
    if (!isFavorite) {
      favs = favs.filter(id => id !== doctorIdStr); // Remove if exists (prevent dupe)
      favs.push(doctorIdStr);
    } else {
      favs = favs.filter(id => id !== doctorIdStr);
    }
    // Always keep unique
    favs = Array.from(new Set(favs));
    await supabase
      .from('users')
      .update({ favorite_doctors: favs.join(';') })
      .eq('id', userId);
    setIsFavorite(!isFavorite);
  };

  const profileImageSource = doctor.user?.pfpimg
    ? { uri: `data:image/png;base64,${doctor.user.pfpimg}` }
    : { uri: 'https://img.icons8.com/ios-filled/100/3498db/doctor-male.png' };

  // Improved schedule label logic
  const workingDays = WEEKDAYS.filter(d => schedule[d.key].start && schedule[d.key].end);
  let scheduleDaysLabel = '';
  if (workingDays.length === 7) {
    scheduleDaysLabel = 'Mon-Sun';
  } else if (workingDays.length > 1) {
    // Find consecutive ranges
    let ranges = [];
    let start = 0;
    for (let i = 1; i <= workingDays.length; i++) {
      if (i === workingDays.length || workingDays[i].idx !== workingDays[i-1].idx + 1) {
        if (start === i-1) {
          ranges.push(workingDays[start].label);
        } else {
          ranges.push(`${workingDays[start].label}-${workingDays[i-1].label}`);
        }
        start = i;
      }
    }
    scheduleDaysLabel = ranges.join(', ');
  } else if (workingDays.length === 1) {
    scheduleDaysLabel = workingDays[0].label;
  } else {
    scheduleDaysLabel = 'Mon, Tue, Wed, Thu, Fri';
  }
  const scheduleHoursLabel = workingDays.length
    ? `${Object.values(schedule).find(s => s.start && s.end)?.start || '08:00'} - ${Object.values(schedule).reverse().find(s => s.start && s.end)?.end || '18:00'}`
    : '08:00 - 18:00';

  // Calculate average rating
  const avgRating = doctorComments.length
    ? (doctorComments.reduce((sum, c) => sum + c.rating, 0) / doctorComments.length).toFixed(1)
    : '0.0';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Info</Text>
          {isMedic && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('DoctorRegistration', { doctorId: doctor.id })}
            >
              <Ionicons name="create-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Doctor Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.profileImageContainer}>
                <Image source={profileImageSource} style={styles.profileImage} />
                {isMedic && (
                  <TouchableOpacity 
                    style={styles.editImageButton}
                    onPress={() => {/* Add image upload functionality */}}
                  >
                    <Ionicons name="camera" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.yearsExperience}>
                  {doctor.years_experience !== 'Nao encontrado' ? `${doctor.years_experience} years experience` : ''}
                </Text>
                {/* Focus Area Balloon */}
                <View style={styles.focusAreaBox}>
                  <Text style={styles.focusAreaText}>
                    {doctor.work_description == null
                      ? (doctor.specialization || 'No specialization available.')
                      : (doctor.work_description.trim().length > 0 ? doctor.work_description : '')}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.doctorName}>{doctor.user?.fullname}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
              <Ionicons name="star" size={18} color="#FFD700" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 16, color: '#6A8DFD', fontWeight: 'bold', marginRight: 16 }}>{avgRating}</Text>
              <Ionicons name="time-outline" size={20} color="#6A8DFD" style={{ marginRight: 4 }} />
              <Text style={styles.scheduleText}>{doctor.appointment_duration_minutes || 60} min</Text>
              <View style={{ width: 16 }} />
              <Ionicons name="calendar-outline" size={20} color="#6A8DFD" style={{ marginRight: 4 }} />
              <View>
                <Text style={[styles.scheduleText, { color: '#6A8DFD', fontWeight: 'bold', fontSize: 15 }]}>{scheduleDaysLabel}</Text>
                <Text style={[styles.scheduleText, { color: '#aaa', fontSize: 13, marginTop: 2 }]}>{scheduleHoursLabel}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.scheduleButton]}
                onPress={() => navigation.navigate('RequestAppointmentScreen', { doctor })}
              >
                <Ionicons name="calendar-outline" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Solicitar Consulta</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.infoButton]}
                onPress={handleToggleFavorite}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#e74c3c' : '#6A8DFD'} />
              </TouchableOpacity>
              {isMedic && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.infoButton]}
                    onPress={() => navigation.navigate('DoctorRegistration', { doctorId: doctor.id })}
                  >
                    <Ionicons name="create-outline" size={20} color="#6A8DFD" />
                  </TouchableOpacity>
              )}
              {isMedic && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.infoButton]}
                    onPress={() => navigation.navigate('DoctorDashboard')}
                  >
                    <Ionicons name="stats-chart-outline" size={20} color="#6A8DFD" />
                  </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.sectionContent}>{doctor.description || 'No profile description available.'}</Text>
          </View>

          {doctorComments.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 8, color: '#222' }}>Comentários dos pacientes</Text>
              {doctorComments.map((c, idx) => (
                <View key={idx} style={{ backgroundColor: '#f5f6fa', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    {[1,2,3,4,5].map(star => (
                      <Ionicons key={star} name={star <= c.rating ? 'star' : 'star-outline'} size={16} color="#FFD700" />
                    ))}
                    <Text style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>
                      {c.is_anonymous ? 'Anônimo' : (c.users?.fullname || 'Usuário')}
                    </Text>
                  </View>
                  {c.comment && <Text style={{ color: '#333', fontSize: 15 }}>{c.comment}</Text>}
                </View>
              ))}
            </View>
          )}

        </ScrollView>

        {/* Navbar */}
        <Navbar navigation={navigation} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A8DFD', // Match header background
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA', // Match main background
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
   scrollContent: {
    padding: 16,
    paddingBottom: 80, // Add padding at the bottom equal to Navbar height
  },
  summaryCard: {
    backgroundColor: '#E0E8F9', // Light blue background
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  summaryInfo: {
    flex: 1,
  },
   yearsExperience: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  focusAreaBox: {
     backgroundColor: '#6A8DFD', // Blue background for focus area
     borderRadius: 10,
     padding: 10,
  },
   focusAreaText: {
    fontSize: 14,
    color: '#FFF',
  },
  doctorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 5,
  },
  scheduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
   scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
   actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  scheduleButton: {
    backgroundColor: '#6A8DFD',
     flex: 1,
     justifyContent: 'center',
     marginRight: 10,
  },
  infoButton: {
     backgroundColor: '#E8ECF4', // Light gray background
  },
   actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6A8DFD',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default DoctorDetailsScreen; 