import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

const ConfirmMedicationsScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Get current user ID and fetch data when component mounts
    const initialize = async () => {
      setLoading(true);
      await getCurrentUser();
      if (userId) {
        await syncAllMedicationSchedules();
        await fetchMedications();
      }
      setLoading(false);
    };
    
    initialize();
  }, [userId]); // Re-run when userId changes

  // Function to get the current user ID
  const getCurrentUser = async () => {
    try {
      // Get user data from DataUser
      const userData = DataUser.getUserData();
      
      if (userData && userData.id) {
        setUserId(userData.id);
        console.log(`Loaded user ID: ${userData.id}`);
      } else {
        // If DataUser doesn't provide ID, try getting from Supabase session
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (data && data.user) {
          setUserId(data.user.id);
          console.log(`Using Supabase auth ID: ${data.user.id}`);
        } else {
          console.warn('No user ID found');
          Alert.alert('Error', 'Unable to identify user. Please log in again.');
          navigation.navigate('LoginScreen');
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      Alert.alert('Error', 'Unable to get user data. Please try again.');
    }
  };

  // Function to sync all medication schedules to the confirmation table
  const syncAllMedicationSchedules = async () => {
    try {
      setSyncing(true);
      
      if (!userId) {
        console.log('User ID not available, skipping sync');
        setSyncing(false);
        return;
      }

      console.log('Syncing all medication schedules...');
      
      // 1. Get all medications from pills_warning table
      const { data: allMedications, error: fetchError } = await supabase
        .from('pills_warning')
        .select('*');
      
      if (fetchError) throw fetchError;
      
      if (!allMedications || allMedications.length === 0) {
        console.log('No medications found to sync');
        setSyncing(false);
        return;
      }
      
      console.log(`Found ${allMedications.length} medications to process`);
      
      // 2. Process each medication
      for (const medication of allMedications) {
        if (!medication.id || !medication.scheduled_time) {
          console.log(`Skipping medication with missing data: ${JSON.stringify(medication)}`);
          continue;
        }
        
        // Check if a schedule record already exists
        const { data: existingSchedules, error: checkError } = await supabase
          .from('medication_schedule_times')
          .select('id')
          .eq('pill_id', medication.id)
          .eq('scheduled_time', medication.scheduled_time);
        
        if (checkError) {
          console.error('Error checking existing schedule:', checkError);
          continue;
        }
        
        // Create a new schedule record if none exists
        if (!existingSchedules || existingSchedules.length === 0) {
          console.log(`Creating schedule record for medication ID ${medication.id}`);
          
          const newSchedule = {
            pill_id: medication.id,
            scheduled_time: medication.scheduled_time,
            scheduled_date: new Date().toISOString().split('T')[0],
            user_id: userId,
            status: 'pending',
            notes: 'Scheduled automatically',
            created_at: new Date().toISOString(),
            complete_datetime: new Date().toISOString()
          };
          
          const { error: insertError } = await supabase
            .from('medication_schedule_times')
            .insert(newSchedule);
          
          if (insertError) {
            console.error('Error creating schedule record:', insertError);
          }
        }
      }
      
      console.log('Medication schedule sync completed');
    } catch (error) {
      console.error('Error syncing medication schedules:', error);
      Alert.alert('Sync Error', 'Failed to synchronize medication schedules');
    } finally {
      setSyncing(false);
    }
  };

  const fetchMedications = async () => {
    try {
      if (!userId) {
        console.log('User ID not available, skipping fetch');
        return;
      }

      // Get pending medications from medication_schedule_times
      const { data, error } = await supabase
        .from('medication_schedule_times')
        .select(`
          id,
          pill_id,
          scheduled_time,
          scheduled_date,
          status,
          notes,
          pills_warning: pill_id (nome_medicamento, dosage)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      if (!data) {
        setMedications([]);
        return;
      }

      // Format the data for display
      const formattedMedications = data.map(item => ({
        id: item.id,
        pill_id: item.pill_id,
        scheduled_time: item.scheduled_time,
        scheduled_date: item.scheduled_date,
        nome_medicamento: item.pills_warning?.nome_medicamento || 'Unknown',
        dosage: item.pills_warning?.dosage || 'Standard dose',
        status: item.status,
        notes: item.notes
      }));

      setMedications(formattedMedications);
    } catch (error) {
      console.error('Error fetching medications:', error);
      Alert.alert('Error', 'Failed to load medications. Please try again.');
    }
  };

  const handleConfirmation = async (scheduleId, taken) => {
    try {
      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please try again.');
        return;
      }

      // Update the status in medication_schedule_times
      const now = new Date();
      const { error } = await supabase
        .from('medication_schedule_times')
        .update({
          status: taken ? 'taken' : 'missed',
          complete_datetime: now.toISOString(),
          notes: taken ? 'Medication taken' : 'Medication not taken'
        })
        .eq('id', scheduleId)
        .eq('user_id', userId);

      if (error) throw error;

      Alert.alert('Success', 'Medication status updated.');
      fetchMedications(); // Refresh the list
    } catch (error) {
      console.error('Error updating medication status:', error);
      Alert.alert('Error', 'Failed to update medication status. Please try again.');
    }
  };

  // Force refresh all data
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await getCurrentUser();
      await syncAllMedicationSchedules();
      await fetchMedications();
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A67E3" />
        <Text style={styles.loadingText}>Loading medications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Confirm Medications</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={syncing}
        >
          <Text style={styles.refreshButtonText}>
            {syncing ? 'Syncing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {syncing && (
        <View style={styles.syncingBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.syncingText}>Syncing medication data...</Text>
        </View>
      )}
      
      {medications.length > 0 ? (
        <ScrollView style={styles.scrollView}>
          {medications.map((med) => (
            <View key={med.id} style={styles.medicationCard}>
              <Text style={styles.medicationName}>{med.nome_medicamento}</Text>
              <Text style={styles.medicationDetails}>
                {med.dosage} • {new Date(med.scheduled_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>Did you take this medication?</Text>
              </View>
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
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No medications waiting for confirmation</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={handleRefresh}
          >
            <Text style={styles.emptyButtonText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F6FA' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold'
  },
  refreshButton: {
    backgroundColor: '#4A67E3',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  syncingBanner: {
    backgroundColor: '#4A67E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10
  },
  syncingText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14
  },
  scrollView: {
    flex: 1,
    padding: 20
  },
  medicationCard: { 
    backgroundColor: '#ffffff', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  medicationName: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#333'
  },
  medicationDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5
  },
  questionContainer: {
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A67E3'
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10 
  },
  button: { 
    flex: 1, 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center',
    marginHorizontal: 5 
  },
  buttonYes: { 
    backgroundColor: '#4CAF50' 
  },
  buttonNo: { 
    backgroundColor: '#FF4B4B' 
  },
  buttonText: { 
    color: '#ffffff', 
    fontWeight: 'bold',
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  emptyButton: {
    backgroundColor: '#4A67E3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666'
  }
});

export default ConfirmMedicationsScreen; 