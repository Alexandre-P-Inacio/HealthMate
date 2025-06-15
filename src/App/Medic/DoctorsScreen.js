import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';
import DoctorService from '../../services/DoctorService';

const DoctorsScreen = ({ navigation }) => {
  const [role, setRole] = useState('');
  const [medics, setMedics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userDoctorData, setUserDoctorData] = useState(null);

  useEffect(() => {
    const fetchScreenData = async () => {
      setLoading(true);
      const currentUser = DataUser.getUserData();

      if (currentUser && currentUser.id) {
        setUserId(currentUser.id);
        setRole(currentUser.role);

        // Buscar dados completos do médico logado, se o usuário for um médico
        if (currentUser.role === 'doctor') {
          const { success, data: doctorData, error: doctorError } = await DoctorService.getDoctorByUserId(currentUser.id);
          if (!success) {
            console.error('Error fetching current doctor data:', doctorError);
          } else {
            setUserDoctorData(doctorData);
          }
        }
      } else {
        Alert.alert('Erro', 'Usuário não logado. Por favor, faça login novamente.');
        navigation.goBack();
      }

      // Sempre buscar todos os médicos para exibição
      const { success: allDoctorsSuccess, data: allDoctors, error: allDoctorsError } = await DoctorService.getAllDoctors();
      if (!allDoctorsSuccess) {
        console.error('Error fetching all doctors:', allDoctorsError);
        Alert.alert('Erro', 'Não foi possível carregar a lista de médicos.');
      } else {
        // Usar dados diretos do médico, já que não há user_id na tabela doctors para a relação
        setMedics(allDoctors);
      }

      setLoading(false);
    };
    fetchScreenData();
  }, []);

  const renderMedicItem = ({ item }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorDetailsScreen', { doctor: item })}
    >
      <Image
        source={item.user.pfpimg ? { uri: `data:image/png;base64,${item.user.pfpimg}` } : { uri: 'https://img.icons8.com/ios-filled/100/3498db/doctor-male.png' }}
        style={styles.doctorImage}
      />
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{item.user.fullname}</Text>
        <Text style={styles.doctorSpecialization}>Spec: {item.specialization || 'Não informado'}</Text>
        <Text style={styles.doctorDetails}>Exp: {item.years_experience || 'Não informado'} years</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#6A8DFD' }}>
          <TouchableOpacity onPress={() => navigation.navigate('AccountScreen')} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 }}>Doctors</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AppointmentsScreen')}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="calendar-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('RequestAppointmentScreen', role === 'doctor' && userDoctorData ? { doctor: userDoctorData } : {})}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={medics}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMedicItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#bdc3c7" />
              <Text style={styles.noDataText}>Nenhum médico disponível.</Text>
            </View>
          }
        />

        <Navbar navigation={navigation} />
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
    paddingBottom: 80,
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
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 10,
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  doctorSpecialization: {
    fontSize: 15,
    color: '#3498db',
    marginTop: 4,
  },
  doctorDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorsScreen; 