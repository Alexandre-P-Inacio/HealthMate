import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';

const DoctorRegistrationScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    fullname: '',
    birth_date: new Date(),
    years_of_experience: '',
    specialization: '',
    license_number: '',
    hospital: '',
    address: '',
    phone: '',
    email: '',
  });

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, birth_date: selectedDate }));
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const validateForm = () => {
    const age = calculateAge(formData.birth_date);
    const yearsExp = parseInt(formData.years_of_experience);

    if (yearsExp < 0) {
      Alert.alert('Error', 'Years of experience cannot be negative');
      return false;
    }

    if (yearsExp > (age - 18)) {
      Alert.alert('Error', 'Years of experience cannot exceed your age minus 18');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;

      setLoading(true);
      const userData = DataUser.getUserData();

      const { error } = await supabase
        .from('doctors')
        .insert([
          {
            id: userData.id,
            fullname: formData.fullname,
            birth_date: formData.birth_date.toISOString(),
            years_of_experience: parseInt(formData.years_of_experience),
            specialization: formData.specialization,
            license_number: formData.license_number,
            hospital: formData.hospital,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
          },
        ]);

      if (error) throw error;

      Alert.alert('Success', 'Doctor profile created successfully!');
      navigation.navigate('DoctorDashboard');
    } catch (error) {
      console.error('Error creating doctor profile:', error);
      Alert.alert('Error', 'Failed to create doctor profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Doctor Registration</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.fullname}
            onChangeText={(text) => setFormData(prev => ({ ...prev, fullname: text }))}
            placeholder="Enter your full name"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            disabled={loading}
          >
            <Text style={styles.dateButtonText}>
              {formData.birth_date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.birth_date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Years of Experience</Text>
          <TextInput
            style={styles.input}
            value={formData.years_of_experience}
            onChangeText={(text) => {
              if (/^\d*$/.test(text)) {
                setFormData(prev => ({ ...prev, years_of_experience: text }));
              }
            }}
            placeholder="Enter years of experience"
            keyboardType="numeric"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Specialization</Text>
          <TextInput
            style={styles.input}
            value={formData.specialization}
            onChangeText={(text) => setFormData(prev => ({ ...prev, specialization: text }))}
            placeholder="Enter your specialization"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>License Number</Text>
          <TextInput
            style={styles.input}
            value={formData.license_number}
            onChangeText={(text) => setFormData(prev => ({ ...prev, license_number: text }))}
            placeholder="Enter your license number"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Hospital</Text>
          <TextInput
            style={styles.input}
            value={formData.hospital}
            onChangeText={(text) => setFormData(prev => ({ ...prev, hospital: text }))}
            placeholder="Enter your hospital name"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            placeholder="Enter your address"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating Profile...' : 'Create Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a237e',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#1a237e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DoctorRegistrationScreen; 