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

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Personal Information Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="person-outline" size={18} color="#3b82f6" /> Personal Information
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter doctor's full name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Specialization</Text>
                <TextInput
                  style={styles.input}
                  value={formData.specialization}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, specialization: text }))}
                  placeholder="e.g., Cardiology, Pediatrics, General Medicine"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.inputHelper}>Your area of medical expertise</Text>
              </View>

              <View style={styles.rowContainer}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.age}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, age: text.replace(/[^0-9]/g, '') }))}
                    placeholder="25+"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.inputHelper}>Minimum 25 years</Text>
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Years of Experience</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.years_experience}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, years_experience: text.replace(/[^0-9]/g, '') }))}
                    placeholder="0+"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.inputHelper}>Professional experience</Text>
                </View>
              </View>
            </View>

            {/* Professional Details Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="briefcase-outline" size={18} color="#3b82f6" /> Professional Details
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Professional Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Tell patients about your background, approach to medicine, and what makes you unique as a healthcare provider..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.characterCount}>
                  {formData.description.length}/500 characters
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Work Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.work_description}
                  onChangeText={text => setFormData(prev => ({ ...prev, work_description: text }))}
                  placeholder="Describe the type of care you provide, your clinical focus, or any specialized services you offer..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={styles.characterCount}>
                  {formData.work_description.length}/300 characters
                </Text>
              </View>
            </View>

            {/* Practice Settings Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="time-outline" size={18} color="#3b82f6" /> Practice Settings
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Default Appointment Duration (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.appointment_duration_minutes}
                  onChangeText={text => setFormData(prev => ({ ...prev, appointment_duration_minutes: text.replace(/[^0-9]/g, '') }))}
                  placeholder="60"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.inputHelper}>Standard consultation time in minutes (typically 30-90 minutes)</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Update Profile' : 'Complete Registration'}
                  </Text>
                </View>
              )}
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
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
    paddingBottom: 100,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    transition: 'all 0.2s ease',
  },
  inputFocused: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    elevation: 3,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  // Additional enhanced styles
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 50,
    color: '#9ca3af',
  },
  requiredAsterisk: {
    color: '#ef4444',
    fontSize: 16,
  },
  inputWithIcon: {
    paddingRight: 45,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  inputHelper: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInput: {
    width: '48%',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DoctorRegistrationScreen; 