import AsyncStorage from '@react-native-async-storage/async-storage';

const DIARY_ENTRIES_KEY = 'medicalDiaryEntries';
const LOCAL_MEDICATIONS_KEY = 'localMedications';

class LocalStorageService {
  // ===== DIARY ENTRIES =====
  
  async saveEntry(entry, date) {
    try {
      const storedEntries = await AsyncStorage.getItem(DIARY_ENTRIES_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      const formattedDate = date.toISOString().split('T')[0];
      const newEntry = {
        ...entry,
        id: Date.now().toString(),
        date: formattedDate,
        created_at: new Date().toISOString()
      };
      
      allEntries.push(newEntry);
      await AsyncStorage.setItem(DIARY_ENTRIES_KEY, JSON.stringify(allEntries));
      
      return newEntry;
    } catch (error) {
      console.error('Error saving local entry:', error);
      throw error;
    }
  }

  async updateEntry(entryId, updatedEntry) {
    try {
      const storedEntries = await AsyncStorage.getItem(DIARY_ENTRIES_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      const entryIndex = allEntries.findIndex(entry => entry.id === entryId);
      if (entryIndex !== -1) {
        allEntries[entryIndex] = {
          ...allEntries[entryIndex],
          ...updatedEntry,
          updated_at: new Date().toISOString()
        };
        await AsyncStorage.setItem(DIARY_ENTRIES_KEY, JSON.stringify(allEntries));
      }
    } catch (error) {
      console.error('Error updating local entry:', error);
      throw error;
    }
  }

  async deleteEntry(entryId) {
    try {
      const storedEntries = await AsyncStorage.getItem(DIARY_ENTRIES_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      const filteredEntries = allEntries.filter(entry => entry.id !== entryId);
      await AsyncStorage.setItem(DIARY_ENTRIES_KEY, JSON.stringify(filteredEntries));
    } catch (error) {
      console.error('Error deleting local entry:', error);
      throw error;
    }
  }

  async getEntriesByDate(date) {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const storedEntries = await AsyncStorage.getItem(DIARY_ENTRIES_KEY);
      const allEntries = storedEntries ? JSON.parse(storedEntries) : [];
      
      return allEntries.filter(entry => entry.date === formattedDate);
    } catch (error) {
      console.error('Error loading local entries:', error);
      return [];
    }
  }

  // ===== MEDICATIONS =====

  async saveMedication(medication, date) {
    try {
      const storedMedications = await AsyncStorage.getItem(LOCAL_MEDICATIONS_KEY);
      const allMedications = storedMedications ? JSON.parse(storedMedications) : [];
      
      const formattedDate = date.toISOString().split('T')[0];
      const newMedication = {
        ...medication,
        id: Date.now().toString(),
        scheduled_date: formattedDate,
        created_at: new Date().toISOString(),
        user_id: 'local'
      };
      
      allMedications.push(newMedication);
      await AsyncStorage.setItem(LOCAL_MEDICATIONS_KEY, JSON.stringify(allMedications));
      
      return newMedication;
    } catch (error) {
      console.error('Error saving local medication:', error);
      throw error;
    }
  }

  async updateMedicationStatus(medicationId, status) {
    try {
      const storedMedications = await AsyncStorage.getItem(LOCAL_MEDICATIONS_KEY);
      const allMedications = storedMedications ? JSON.parse(storedMedications) : [];
      
      const medicationIndex = allMedications.findIndex(med => med.id === medicationId);
      if (medicationIndex !== -1) {
        allMedications[medicationIndex].status = status;
        allMedications[medicationIndex].updated_at = new Date().toISOString();
        await AsyncStorage.setItem(LOCAL_MEDICATIONS_KEY, JSON.stringify(allMedications));
      }
    } catch (error) {
      console.error('Error updating local medication:', error);
      throw error;
    }
  }

  async deleteMedication(medicationId) {
    try {
      const storedMedications = await AsyncStorage.getItem(LOCAL_MEDICATIONS_KEY);
      const allMedications = storedMedications ? JSON.parse(storedMedications) : [];
      
      const filteredMedications = allMedications.filter(med => med.id !== medicationId);
      await AsyncStorage.setItem(LOCAL_MEDICATIONS_KEY, JSON.stringify(filteredMedications));
    } catch (error) {
      console.error('Error deleting local medication:', error);
      throw error;
    }
  }

  async getMedicationsByDate(date) {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const storedMedications = await AsyncStorage.getItem(LOCAL_MEDICATIONS_KEY);
      const allMedications = storedMedications ? JSON.parse(storedMedications) : [];
      
      return allMedications.filter(med => med.scheduled_date === formattedDate);
    } catch (error) {
      console.error('Error loading local medications:', error);
      return [];
    }
  }

  // ===== CALENDAR DATA =====
  
  async getCalendarEvents(date) {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      
      // Buscar entradas do diário
      const entries = await this.getEntriesByDate(date);
      
      // Buscar medicamentos
      const medications = await this.getMedicationsByDate(date);
      
      // Converter entradas para eventos do calendário
      const entryEvents = entries.map(entry => ({
        id: `entry-${entry.id}`,
        title: `📝 ${entry.title}`,
        startDate: new Date(`${entry.date}T${entry.created_at.split('T')[1]}`).toISOString(),
        endDate: new Date(`${entry.date}T${entry.created_at.split('T')[1]}`).toISOString(),
        notes: entry.description || '',
        scheduledDate: entry.date,
        scheduledTime: entry.created_at.split('T')[1].substring(0, 8),
        isEntry: true,
        mood: entry.mood,
        allDay: false,
        color: entry.mood === 'good' ? '#4CAF50' : entry.mood === 'bad' ? '#F44336' : '#FF9800',
      }));

      // Converter medicamentos para eventos do calendário
      const medicationEvents = medications.map(med => {
        const timeComponents = med.scheduled_time?.split(':') || ['08', '00', '00'];
        const hours = parseInt(timeComponents[0], 10);
        const minutes = parseInt(timeComponents[1], 10);
        const seconds = parseInt(timeComponents[2], 10);
        const eventDate = new Date(med.scheduled_date);
        eventDate.setHours(hours, minutes, seconds, 0);
        
        return {
          id: `med-${med.id}`,
          title: med.title || 'Medicamento',
          startDate: eventDate.toISOString(),
          endDate: new Date(eventDate.getTime() + 30 * 60000).toISOString(),
          notes: `Status: ${med.status === 'taken' ? 'Tomado' : med.status === 'missed' ? 'Perdido' : 'Pendente'}`,
          scheduledDate: med.scheduled_date,
          scheduledTime: med.scheduled_time,
          isMedication: true,
          status: med.status || 'pending',
          allDay: false,
          color: med.status === 'taken' ? '#2ECC71' : '#6A8DFD',
        };
      });

      return [...entryEvents, ...medicationEvents];
    } catch (error) {
      console.error('Error getting calendar events:', error);
      return [];
    }
  }

  // ===== UTILITY =====
  
  async clearAllData() {
    try {
      await AsyncStorage.removeItem(DIARY_ENTRIES_KEY);
      await AsyncStorage.removeItem(LOCAL_MEDICATIONS_KEY);
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }

  async exportData() {
    try {
      const entries = await AsyncStorage.getItem(DIARY_ENTRIES_KEY);
      const medications = await AsyncStorage.getItem(LOCAL_MEDICATIONS_KEY);
      
      return {
        entries: entries ? JSON.parse(entries) : [],
        medications: medications ? JSON.parse(medications) : [],
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting local data:', error);
      return null;
    }
  }
}

export default new LocalStorageService(); 