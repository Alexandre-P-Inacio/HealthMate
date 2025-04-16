import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import supabase from '../../supabase';

const ConfirmMedicationsScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('pills_warning')
        .select('*')
        .eq('status', 'pending');

      if (error) throw error;

      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
      Alert.alert('Error', 'Failed to load medications.');
    }
  };

  const handleConfirmation = async (id, taken) => {
    try {
      const { error } = await supabase
        .from('pills_warning')
        .update({ status: taken ? 'taken' : 'missed' })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Medication status updated.');
      fetchMedications(); // Refresh the list
    } catch (error) {
      console.error('Error updating medication status:', error);
      Alert.alert('Error', 'Failed to update medication status.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Medications</Text>
      <ScrollView>
        {medications.map((med) => (
          <View key={med.id} style={styles.medicationCard}>
            <Text style={styles.medicationName}>{med.nome_medicamento}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.buttonYes]} 
                onPress={() => handleConfirmation(med.id, true)}
              >
                <Text style={styles.buttonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.buttonNo]} 
                onPress={() => handleConfirmation(med.id, false)}
              >
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F6FA' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  medicationCard: { 
    backgroundColor: '#ffffff', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 10, 
    elevation: 2 
  },
  medicationName: { fontSize: 18, fontWeight: 'bold' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button: { 
    flex: 1, 
    padding: 10, 
    borderRadius: 5, 
    marginHorizontal: 5 
  },
  buttonYes: { backgroundColor: '#4CAF50' },
  buttonNo: { backgroundColor: '#FF4B4B' },
  buttonText: { color: '#ffffff', textAlign: 'center' },
});

export default ConfirmMedicationsScreen; 