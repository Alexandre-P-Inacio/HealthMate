import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Navbar from '../Components/Navbar';

const MedicationTrackingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const [activeTab, setActiveTab] = useState('weekly');
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  
  // Sample medication data - in a real app this would come from storage/backend
  const medicationData = {
    weekly: {
      adherence: [80, 100, 75, 90, 60, 85, 70],
      totalPills: [2, 2, 2, 2, 2, 2, 2],
      takenPills: [1.6, 2, 1.5, 1.8, 1.2, 1.7, 1.4],
      days: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    },
    monthly: {
      adherence: [85, 75, 90, 70],
      totalPills: [14, 14, 14, 14],
      takenPills: [12, 10.5, 12.6, 9.8],
      weeks: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    }
  };

  // Sample medication list
  const medications = [
    { id: 1, name: 'Paracetamol', dosage: '500mg', schedule: '8h, 14h, 20h', color: '#FF9500' },
    { id: 2, name: 'Ibuprofeno', dosage: '400mg', schedule: '8h, 20h', color: '#34C759' },
    { id: 3, name: 'Loratadina', dosage: '10mg', schedule: '8h', color: '#007AFF' },
    { id: 4, name: 'Omeprazol', dosage: '20mg', schedule: '8h', color: '#5856D6' },
  ];

  // Sample reminders
  const reminders = [
    { id: 1, medicationId: 1, time: '08:00', taken: true, date: 'Hoje' },
    { id: 2, medicationId: 1, time: '14:00', taken: false, date: 'Hoje' },
    { id: 3, medicationId: 1, time: '20:00', taken: false, date: 'Hoje' },
    { id: 4, medicationId: 2, time: '08:00', taken: true, date: 'Hoje' },
    { id: 5, medicationId: 2, time: '20:00', taken: false, date: 'Hoje' },
    { id: 6, medicationId: 3, time: '08:00', taken: true, date: 'Hoje' },
    { id: 7, medicationId: 4, time: '08:00', taken: true, date: 'Hoje' },
  ];

  // Get medication name by id
  const getMedicationById = (id) => {
    return medications.find(med => med.id === id);
  };

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  // Pie chart data for adherence
  const pieChartData = [
    {
      name: 'Tomados',
      value: activeTab === 'weekly' 
        ? medicationData.weekly.takenPills.reduce((a, b) => a + b, 0)
        : medicationData.monthly.takenPills.reduce((a, b) => a + b, 0),
      color: '#3498db',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Não Tomados',
      value: activeTab === 'weekly'
        ? medicationData.weekly.totalPills.reduce((a, b) => a + b, 0) - medicationData.weekly.takenPills.reduce((a, b) => a + b, 0)
        : medicationData.monthly.totalPills.reduce((a, b) => a + b, 0) - medicationData.monthly.takenPills.reduce((a, b) => a + b, 0),
      color: '#e74c3c',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ];

  const handleReminderPress = (reminder) => {
    setSelectedReminder(reminder);
    setReminderModalVisible(true);
  };

  const handleTakeMedication = () => {
    Alert.alert(
      "Medicamento Registrado",
      "Obrigado por registrar seu medicamento!",
      [{ text: "OK", onPress: () => setReminderModalVisible(false) }]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Exportar Dados",
      "Os dados do seu histórico de medicamentos serão exportados por email.",
      [{ text: "OK" }]
    );
  };

  const handleAddMedication = () => {
    Alert.alert(
      "Adicionar Medicamento",
      "Esta funcionalidade permitirá adicionar novos medicamentos.",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={20} color="#3498db" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Controle de Medicamentos</Text>
          <TouchableOpacity 
            style={styles.optionsButton}
            onPress={handleExportData}
          >
            <FontAwesome name="download" size={20} color="#3498db" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Overview Card */}
          <View style={styles.overviewCard}>
            <Text style={styles.cardTitle}>Visão Geral da Adesão</Text>
            
            {/* Tab Selector */}
            <View style={styles.tabSelector}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
                onPress={() => setActiveTab('weekly')}
              >
                <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>Semanal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
                onPress={() => setActiveTab('monthly')}
              >
                <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>Mensal</Text>
              </TouchableOpacity>
            </View>
            
            {/* Adherence Rate */}
            <View style={styles.adherenceRate}>
              <Text style={styles.adherenceLabel}>Taxa de Adesão</Text>
              <Text style={styles.adherenceValue}>
                {activeTab === 'weekly' 
                  ? Math.round(
                      (medicationData.weekly.takenPills.reduce((a, b) => a + b, 0) / 
                       medicationData.weekly.totalPills.reduce((a, b) => a + b, 0)) * 100
                    )
                  : Math.round(
                      (medicationData.monthly.takenPills.reduce((a, b) => a + b, 0) / 
                       medicationData.monthly.totalPills.reduce((a, b) => a + b, 0)) * 100
                    )
                }%
              </Text>
            </View>

            {/* Bar Chart */}
            <Text style={styles.chartTitle}>Medicamentos por Dia</Text>
            <BarChart
              data={{
                labels: activeTab === 'weekly' 
                  ? medicationData.weekly.days 
                  : medicationData.monthly.weeks,
                datasets: [
                  {
                    data: activeTab === 'weekly' 
                      ? medicationData.weekly.adherence 
                      : medicationData.monthly.adherence,
                  }
                ],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
            />

            {/* Pie Chart */}
            <Text style={styles.chartTitle}>Distribuição de Adesão</Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>

          {/* Today's Medications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Medicamentos de Hoje</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddMedication}
              >
                <FontAwesome name="plus" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {reminders.map((reminder) => {
              const medication = getMedicationById(reminder.medicationId);
              return (
                <TouchableOpacity 
                  key={reminder.id} 
                  style={styles.medicationCard}
                  onPress={() => handleReminderPress(reminder)}
                >
                  <View style={[styles.medicationColor, { backgroundColor: medication.color }]} />
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                  </View>
                  <View style={styles.medicationTime}>
                    <Text style={styles.timeText}>{reminder.time}</Text>
                    <View style={[
                      styles.statusIndicator, 
                      reminder.taken ? styles.takenIndicator : styles.pendingIndicator
                    ]} />
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="#ccc" />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Funcionalidades Adicionais</Text>
            
            <View style={styles.featuresGrid}>
              <TouchableOpacity style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: '#ebfaf0' }]}>
                  <FontAwesome name="bell" size={20} color="#34c759" />
                </View>
                <Text style={styles.featureTitle}>Lembretes</Text>
                <Text style={styles.featureDescription}>Configurar notificações</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: '#fff0ee' }]}>
                  <FontAwesome name="history" size={20} color="#ff3b30" />
                </View>
                <Text style={styles.featureTitle}>Histórico</Text>
                <Text style={styles.featureDescription}>Ver medicamentos passados</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: '#edf4ff' }]}>
                  <FontAwesome name="camera" size={20} color="#007aff" />
                </View>
                <Text style={styles.featureTitle}>Escanear</Text>
                <Text style={styles.featureDescription}>Adicionar via código</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: '#f5efff' }]}>
                  <FontAwesome name="share-alt" size={20} color="#5856d6" />
                </View>
                <Text style={styles.featureTitle}>Compartilhar</Text>
                <Text style={styles.featureDescription}>Com cuidadores</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Reminder Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={reminderModalVisible}
          onRequestClose={() => setReminderModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setReminderModalVisible(false)}
                >
                  <FontAwesome name="times" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Detalhes do Medicamento</Text>
                <View style={styles.modalHeaderRight} />
              </View>

              {selectedReminder && (
                <View style={styles.reminderDetails}>
                  <View style={[
                    styles.medicationIconLarge, 
                    { backgroundColor: getMedicationById(selectedReminder.medicationId).color }
                  ]}>
                    <FontAwesome name="medkit" size={30} color="#fff" />
                  </View>
                  
                  <Text style={styles.reminderMedicationName}>
                    {getMedicationById(selectedReminder.medicationId).name}
                  </Text>
                  <Text style={styles.reminderDosage}>
                    {getMedicationById(selectedReminder.medicationId).dosage}
                  </Text>
                  
                  <View style={styles.reminderTimeRow}>
                    <FontAwesome name="clock-o" size={16} color="#666" />
                    <Text style={styles.reminderTimeText}>{selectedReminder.time}</Text>
                  </View>
                  
                  <View style={styles.reminderStatusRow}>
                    <Text style={styles.reminderStatusLabel}>Status:</Text>
                    <Text style={[
                      styles.reminderStatusValue,
                      selectedReminder.taken ? styles.takenStatus : styles.pendingStatus
                    ]}>
                      {selectedReminder.taken ? 'Tomado' : 'Pendente'}
                    </Text>
                  </View>
                  
                  {!selectedReminder.taken && (
                    <TouchableOpacity 
                      style={styles.takeMedicationButton}
                      onPress={handleTakeMedication}
                    >
                      <FontAwesome name="check" size={18} color="#fff" />
                      <Text style={styles.takeMedicationText}>Marcar como Tomado</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity style={styles.skipButton}>
                    <Text style={styles.skipButtonText}>Pular Dose</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Navbar />
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tabText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  adherenceRate: {
    alignItems: 'center',
    marginBottom: 20,
  },
  adherenceLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  adherenceValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#3498db',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    marginTop: 10,
  },
  chart: {
    borderRadius: 10,
    marginVertical: 10,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  medicationColor: {
    width: 12,
    height: 50,
    borderRadius: 6,
    marginRight: 15,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  medicationTime: {
    alignItems: 'center',
    marginRight: 15,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  takenIndicator: {
    backgroundColor: '#34c759',
  },
  pendingIndicator: {
    backgroundColor: '#ff9500',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  modalHeaderRight: {
    width: 40,
  },
  reminderDetails: {
    alignItems: 'center',
    padding: 20,
  },
  medicationIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  reminderMedicationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  reminderDosage: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reminderTimeText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 10,
  },
  reminderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  reminderStatusLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    marginRight: 10,
  },
  reminderStatusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  takenStatus: {
    color: '#34c759',
  },
  pendingStatus: {
    color: '#ff9500',
  },
  takeMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
  },
  takeMedicationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  skipButton: {
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MedicationTrackingScreen; 