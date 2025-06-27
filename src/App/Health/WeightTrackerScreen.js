import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import HealthConnectService from '../../services/HealthConnectTypeScript';

const WeightTrackerScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [healthData, setHealthData] = useState(null);

  const fetchDigitalScaleData = async () => {
    setLoading(true);
    setHealthData(null);
    try {
      const [weightRes, heightRes, bodyFatRes, leanBodyMassRes, bodyWaterMassRes, boneMassRes, bmrRes, heartRateRes] = await Promise.all([
        HealthConnectService.getWeightData(7),
        HealthConnectService.getHeightData(7),
        HealthConnectService.getBodyFatData(7),
        HealthConnectService.getLeanBodyMassData(7),
        HealthConnectService.getBodyWaterMassData(7),
        HealthConnectService.getBoneMassData(7),
        HealthConnectService.getBasalMetabolicRateData(7),
        HealthConnectService.getHeartRateData ? HealthConnectService.getHeartRateData(7) : { latest: null, data: [] },
      ]);

      // Função utilitária para extrair o valor mais recente de cada métrica
      const getLatestValue = (res, path) => {
        if (!res || !res.latest) return null;
        try {
          return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), res.latest);
        } catch {
          return null;
        }
      };

      setHealthData({
        weight: getLatestValue(weightRes, 'weight.inKilograms'),
        height: getLatestValue(heightRes, 'height.inMeters'),
        bodyFat: getLatestValue(bodyFatRes, 'percentage'),
        leanBodyMass: getLatestValue(leanBodyMassRes, 'mass.inKilograms'),
        bodyWaterMass: getLatestValue(bodyWaterMassRes, 'mass.inKilograms'),
        boneMass: getLatestValue(boneMassRes, 'mass.inKilograms'),
        bmr: getLatestValue(bmrRes, 'basalMetabolicRate.inKilocaloriesPerDay'),
        heartRate: getLatestValue(heartRateRes, 'beatsPerMinute'),
      });
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao buscar dados da balança digital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Tracker</Text>
        <View style={styles.placeholder} />
      </LinearGradient>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="scale" size={80} color="#66BB6A" />
          <Text style={styles.comingSoonTitle}>Weight Tracker</Text>
          <Text style={styles.comingSoonText}>Monitor your weight changes and track your progress.</Text>
          <Text style={styles.comingSoonSubtext}>
            ⚖️ Weight logging{"\n"}📈 Progress charts{"\n"}🎯 Weight goals
          </Text>
          <TouchableOpacity style={styles.fetchButton} onPress={fetchDigitalScaleData} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={22} color="#fff" />
                <Text style={styles.fetchButtonText}>Buscar dados da balança digital</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📊 Dados da Balança Digital</Text>
            {healthData ? (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.headerCell]}>Métrica</Text>
                  <Text style={[styles.tableCell, styles.headerCell]}>Valor</Text>
                  <Text style={[styles.tableCell, styles.headerCell]}>Unidade</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Peso</Text>
                  <Text style={styles.tableCell}>{healthData.weight ? healthData.weight.toFixed(2) : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>kg</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Altura</Text>
                  <Text style={styles.tableCell}>{healthData.height ? healthData.height.toFixed(2) : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>m</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Gordura corporal</Text>
                  <Text style={styles.tableCell}>{healthData.bodyFat ? healthData.bodyFat.toFixed(1) : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>%</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Massa corporal magra</Text>
                  <Text style={styles.tableCell}>{healthData.leanBodyMass ? healthData.leanBodyMass.toFixed(2) : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>kg</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Massa de água corporal</Text>
                  <Text style={styles.tableCell}>{healthData.bodyWaterMass ? healthData.bodyWaterMass.toFixed(2) : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>kg</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Massa óssea</Text>
                  <Text style={styles.tableCell}>{healthData.boneMass ? healthData.boneMass.toFixed(2) : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>kg</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Taxa metabólica basal</Text>
                  <Text style={styles.tableCell}>{healthData.bmr ? healthData.bmr.toFixed(0) : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>kcal/dia</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Ritmo cardíaco</Text>
                  <Text style={styles.tableCell}>{healthData.heartRate ? healthData.heartRate : 'Sem dados'}</Text>
                  <Text style={styles.tableCell}>bpm</Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator color="#6A8DFD" />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#6A8DFD' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 50 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  comingSoonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff', margin: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  comingSoonTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3142', marginTop: 20, marginBottom: 15 },
  comingSoonText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  comingSoonSubtext: { fontSize: 16, color: '#66BB6A', textAlign: 'center', lineHeight: 28 },
  fetchButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6A8DFD', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, marginTop: 24 },
  fetchButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '85%', alignItems: 'center', elevation: 8 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2D3142', marginBottom: 18 },
  tableContainer: { width: '100%', marginTop: 10, marginBottom: 10, backgroundColor: '#F8F9FF', borderRadius: 10, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#6A8DFD' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tableCell: { flex: 1, padding: 10, textAlign: 'center', color: '#333' },
  headerCell: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  closeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6A8DFD', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, marginTop: 24 },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});

export default WeightTrackerScreen; 