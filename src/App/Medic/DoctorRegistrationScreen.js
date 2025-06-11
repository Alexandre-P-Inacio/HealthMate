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
import { supabase } from '../../../supabase';
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

      // First try to get existing doctor data if editing
      if (isEditing) {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', route.params.doctorId)
          .single();

        if (doctorError && doctorError.code !== 'PGRST116') throw doctorError;

        if (doctorData) {
          setFormData({
            name: doctorData.name || userData.name || '',
            specialization: doctorData.specialization || '',
            age: doctorData.age ? doctorData.age.toString() : '',
            years_experience: doctorData.years_experience ? doctorData.years_experience.toString() : '',
            description: doctorData.description || '',
          });
        } else {
          // If no doctor data but we have user data, pre-fill with user data
          setFormData({
            name: userData.name || '',
            specialization: '',
            age: '',
            years_experience: '',
            description: '',
          });
        }
      } else {
        // For new registration, pre-fill with user data
        setFormData({
          name: userData.name || '',
          specialization: '',
          age: '',
          years_experience: '',
          description: '',
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
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userData = DataUser.getUserData();
      if (!userData) throw new Error('No user data found');

      const doctorData = {
        id: userData.id, // Use the user's ID
        name: formData.name.trim(),
        specialization: formData.specialization.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        description: formData.description.trim() || null,
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
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'register'} doctor`);
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
            {isEditing ? 'Edit Doctor' : 'Register Doctor'}
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