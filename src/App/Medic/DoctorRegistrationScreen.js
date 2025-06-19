import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';

const DoctorRegistrationScreen = ({ navigation, route }) => {
  const isEditing = route.params?.doctorId;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    age: '',
    years_experience: '',
    description: '',
    appointment_duration_minutes: '60',
    work_description: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const userData = DataUser.getUserData();
      if (!userData) {
        throw new Error('No user data found');
      }
      // Always use fullname if available
      const fullName = userData.fullname || userData.name || '';
      if (isEditing) {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', route.params.doctorId)
          .single();
        if (doctorError && doctorError.code !== 'PGRST116') throw doctorError;
        setFormData({
          name: fullName,
          specialization: doctorData?.specialization || '',
          age: doctorData?.age ? doctorData.age.toString() : '',
          years_experience: doctorData?.years_experience ? doctorData.years_experience.toString() : '',
          description: doctorData?.description || '',
          appointment_duration_minutes: doctorData?.appointment_duration_minutes ? doctorData.appointment_duration_minutes.toString() : '60',
          work_description: doctorData?.work_description || '',
        });
      } else {
        setFormData({
          name: fullName,
          specialization: '',
          age: '',
          years_experience: '',
          description: '',
          appointment_duration_minutes: '60',
          work_description: '',
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load user information');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return false;
    }
    const age = parseInt(formData.age);
    const yearsExp = parseInt(formData.years_experience);
    if (isNaN(age) || age < 25) {
      Alert.alert('Error', 'Doctor must be at least 25 years old.');
      return false;
    }
    if (isNaN(yearsExp) || yearsExp < 0) {
      Alert.alert('Error', 'Years of experience cannot be negative.');
      return false;
    }
    if (yearsExp > (age - 18)) {
      Alert.alert('Error', `Years of experience cannot exceed age minus 18 (max: ${age - 18}).`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const userData = DataUser.getUserData();
      if (!userData) throw new Error('No user data found');
      if (!supabase || typeof supabase.from !== 'function') {
        throw new Error('Supabase client is not initialized correctly.');
      }
      // Always fetch the latest fullname and pfpimg from users table
      const { data: userProfile, error: userProfileError } = await supabase
        .from('users')
        .select('fullname, pfpimg')
        .eq('id', userData.id)
        .single();
      if (userProfileError) throw userProfileError;
      const doctorData = {
        name: userProfile?.fullname || '',
        specialization: formData.specialization.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        description: formData.description.trim() || null,
        appointment_duration_minutes: formData.appointment_duration_minutes ? parseInt(formData.appointment_duration_minutes) : 60,
        work_description: formData.work_description.trim() || null,
        user_id: userData.id,
      };
      let error;
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('doctors')
          .update(doctorData)
          .eq('id', route.params.doctorId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('doctors')
          .insert([doctorData]);
        error = insertError;
      }
      if (error) throw error;
      Alert.alert(
        'Success',
        `Doctor ${isEditing ? 'updated' : 'registered'} successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving doctor:', error);
      Alert.alert('Error', error.message || `Failed to ${isEditing ? 'update' : 'register'} doctor`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Perfil Médico' : 'Registrar Médico'}
          </Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.form}>
            {/* Name Input - Required */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter doctor's name"
                placeholderTextColor="#999"
              />
            </View>

            {/* Specialization Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Specialization</Text>
              <TextInput
                style={styles.input}
                value={formData.specialization}
                onChangeText={(text) => setFormData(prev => ({ ...prev, specialization: text }))}
                placeholder="Enter specialization"
                placeholderTextColor="#999"
              />
            </View>

            {/* Age Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={formData.age}
                onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
                placeholder="Enter age"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            {/* Years of Experience Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                value={formData.years_experience}
                onChangeText={(text) => setFormData(prev => ({ ...prev, years_experience: text }))}
                placeholder="Enter years of experience"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Enter description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Appointment Duration Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Appointment Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={formData.appointment_duration_minutes}
                onChangeText={text => setFormData(prev => ({ ...prev, appointment_duration_minutes: text.replace(/[^0-9]/g, '') }))}
                placeholder="Ex: 60"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            {/* Work Description Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Work Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.work_description}
                onChangeText={text => setFormData(prev => ({ ...prev, work_description: text }))}
                placeholder="Describe your work or type of care provided"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Doctor' : 'Register Doctor'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorRegistrationScreen; 