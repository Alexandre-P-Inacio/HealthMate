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
  ScrollView,
  TextInput,
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
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [doctorRatings, setDoctorRatings] = useState({});

  // Extract unique specializations from medics
  const specializations = React.useMemo(() => {
    const specs = medics.map(d => d.specialization).filter(Boolean);
    const unique = Array.from(new Set(specs.filter(s => s && s !== 'Nao encontrado' && s !== 'Não informado')));
    unique.sort((a, b) => a.localeCompare(b));
    return ['All', ...unique];
  }, [medics]);

  // Filter medics by specialization and search text
  const filteredMedics = React.useMemo(() => {
    let filtered = medics;
    if (selectedSpecialization !== 'All') {
      filtered = filtered.filter(d => d.specialization === selectedSpecialization);
    }
    if (searchText.trim()) {
      const lower = searchText.trim().toLowerCase();
      filtered = filtered.filter(d => d.user.fullname.toLowerCase().includes(lower));
    }
    return filtered;
  }, [medics, selectedSpecialization, searchText]);

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

      // Buscar favoritos do usuário
      let favoriteIds = [];
      if (currentUser && currentUser.id) {
        const { data: user } = await supabase
          .from('users')
          .select('favorite_doctors')
          .eq('id', currentUser.id)
          .single();
        if (user && user.favorite_doctors) {
          favoriteIds = user.favorite_doctors.split(';').map(s => s.trim()).filter(Boolean);
        }
      }

      // Buscar todos os médicos
      const { success: allDoctorsSuccess, data: allDoctors, error: allDoctorsError } = await DoctorService.getAllDoctors();
      if (!allDoctorsSuccess) {
        console.error('Error fetching all doctors:', allDoctorsError);
        Alert.alert('Erro', 'Não foi possível carregar a lista de médicos.');
      } else {
        // Ordenar: favoritos primeiro
        const favs = allDoctors.filter(d => favoriteIds.includes(String(d.id)));
        const nonFavs = allDoctors.filter(d => !favoriteIds.includes(String(d.id)));
        setMedics([...favs, ...nonFavs]);
        setFavoriteIds(favoriteIds);
        }

      setLoading(false);
    };
    fetchScreenData();
  }, []);

  useEffect(() => {
    const fetchRatings = async () => {
      const { data, error } = await supabase.from('doctor_ratings').select('doctor_id, rating');
      if (!error && data) {
        const ratingsMap = {};
        data.forEach(r => {
          if (!ratingsMap[r.doctor_id]) ratingsMap[r.doctor_id] = [];
          ratingsMap[r.doctor_id].push(r.rating);
        });
        setDoctorRatings(ratingsMap);
      }
    };
    fetchRatings();
  }, []);

  const renderMedicItem = ({ item }) => {
    const ratings = doctorRatings[item.id] || [];
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
    return (
      <TouchableOpacity 
        style={styles.doctorCard} 
        onPress={() => navigation.navigate('DoctorDetailsScreen', { doctor: item })}
        activeOpacity={0.85}
      >
        <View style={styles.cardLeft}>
          <Image 
            source={item.user.pfpimg ? { uri: `data:image/png;base64,${item.user.pfpimg}` } : { uri: 'https://i.pravatar.cc/150?img=3' }}
            style={styles.doctorImage}
          />
        </View>
        <View style={styles.cardRight}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={styles.doctorName}>{item.user.fullname}</Text>
            {avgRating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                {[1,2,3,4,5].map(star => (
                  <Ionicons key={star} name={star <= Math.round(avgRating) ? 'star' : 'star-outline'} size={16} color="#FFD700" />
                ))}
                <Text style={{ marginLeft: 4, color: '#FFD700', fontWeight: 'bold', fontSize: 14 }}>{avgRating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.doctorSpecialization}>{item.specialization || 'Não informado'}</Text>
          <Text style={styles.doctorDetails}>{item.years_experience || 'Não informado'} years exp</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderList = () => {
    if (favoriteIds.length > 0) {
      const favs = filteredMedics.filter(d => favoriteIds.includes(String(d.id)));
      const nonFavs = filteredMedics.filter(d => !favoriteIds.includes(String(d.id)));
      return (
        <>
          {favs.length > 0 && <Text key="fav-label" style={styles.favLabel}>Favoritos</Text>}
          {favs.map(item => (
            <View key={`fav-${item.id}`}>
              {renderMedicItem({ item })}
            </View>
          ))}
          {favs.length > 0 && <View key="divider" style={styles.dashedDivider} />}
          {nonFavs.map(item => (
            <View key={`nonfav-${item.id}`}>
              {renderMedicItem({ item })}
            </View>
          ))}
        </>
      );
    } else {
      return filteredMedics.map(item => (
        <View key={`doctor-${item.id}`}>
          {renderMedicItem({ item })}
        </View>
      ));
    }
  };

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('AccountScreen')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctors</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AppointmentsScreen')}
            style={styles.headerRight}
          >
            <Ionicons name="calendar-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('RequestAppointmentScreen', role === 'doctor' && userDoctorData ? { doctor: userDoctorData } : {})}
            style={styles.headerRight}
          >
            <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>

        {/* Specialization filter bar */}
        <View style={styles.filterBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarScroll}>
            {specializations.map(spec => (
              <TouchableOpacity
                key={spec}
                style={[styles.filterChip, selectedSpecialization === spec && styles.filterChipSelected]}
                onPress={() => setSelectedSpecialization(spec)}
              >
                <Text style={[styles.filterChipText, selectedSpecialization === spec && styles.filterChipTextSelected]}>{spec}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
            </View>
        {/* Search by name */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#6A8DFD" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctor by name..."
            placeholderTextColor="#aaa"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
        </View>

        <View style={styles.listContainer}>
          {renderList()}
        </View>

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
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e8f9',
  },
  doctorImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#6A8DFD',
    backgroundColor: '#e0e8f9',
  },
  doctorName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  doctorSpecialization: {
    fontSize: 15,
    color: '#6A8DFD',
    marginBottom: 2,
  },
  doctorDetails: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  favLabel: {
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 4,
    color: '#4A67E3',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dashedDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 2,
    borderColor: '#4A67E3',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  filterBarContainer: {
    backgroundColor: '#F5F6FA',
    paddingVertical: 8,
    paddingLeft: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  filterChip: {
    backgroundColor: '#e0e8f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e8f9',
  },
  filterChipSelected: {
    backgroundColor: '#6A8DFD',
    borderColor: '#6A8DFD',
  },
  filterChipText: {
    color: '#6A8DFD',
    fontWeight: 'bold',
    fontSize: 15,
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  cardLeft: {
    marginRight: 15,
  },
  cardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorsScreen; 