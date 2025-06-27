import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import BalancaDigitalService from '../../services/BalancaDigitalService';

const BodyCompositionHistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [stats, setStats] = useState({ weight: null, bodyFat: null });

  useEffect(() => {
    loadBodyCompositionData();
  }, [selectedPeriod]);

  const loadBodyCompositionData = async () => {
    try {
      setLoading(true);
      const [weightStats, bodyFatStats] = await Promise.all([
        BalancaDigitalService.getWeightStats(),
        BalancaDigitalService.getBodyFatStats()
      ]);
      setStats({ weight: weightStats, bodyFat: bodyFatStats });
    } catch (error) {
      console.error('Error loading body composition data:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados de composição corporal.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBodyCompositionData();
    setRefreshing(false);
  };

  const renderStatCard = (title, stats, icon, color, unit = '') => {
    if (!stats) return null;

    return (
      <View style={[styles.statCard, { borderLeftColor: color }]}>
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
            {icon === 'weight' ? (
              <FontAwesome5 name="weight" size={20} color={color} />
            ) : (
              <Ionicons name={icon} size={24} color={color} />
            )}
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={[styles.statValue, { color }]}>
              {stats.current}{unit}
            </Text>
          </View>
        </View>
        
        <View style={styles.statDetails}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Média</Text>
            <Text style={styles.statDetailValue}>{stats.average}{unit}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Mínimo</Text>
            <Text style={styles.statDetailValue}>{stats.min}{unit}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Máximo</Text>
            <Text style={styles.statDetailValue}>{stats.max}{unit}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Registros</Text>
            <Text style={styles.statDetailValue}>{stats.totalEntries}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Composição Corporal</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A8DFD" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Composição Corporal</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>📊 Dados Salvos</Text>
          
          {renderStatCard(
            'Peso Corporal',
            stats.weight || { current: '--', average: '--', min: '--', max: '--', totalEntries: 0, trend: 'stable' },
            'weight',
            '#3498DB',
            ' kg'
          )}
          
          {renderStatCard(
            'Gordura Corporal',
            stats.bodyFat || { current: '--', average: '--', min: '--', max: '--', totalEntries: 0, trend: 'stable' },
            'body',
            '#E74C3C',
            '%'
          )}

          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>📈 Gráficos</Text>
            
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Peso - Últimos 30 dias</Text>
              <View style={styles.chart}>
                {/* Show empty bars when no data */}
                {[1,2,3,4,5,6,7,8,9,10].map((_, index) => (
                  <View key={index} style={styles.chartBarContainer}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { 
                          height: '10%', 
                          backgroundColor: '#3498DB30',
                          opacity: 0.3
                        }
                      ]} 
                    />
                    <Text style={styles.chartBarLabel}>--</Text>
                  </View>
                ))}
              </View>
              <View style={styles.chartLegend}>
                <Text style={styles.chartLegendText}>Sem dados disponíveis</Text>
                <Text style={styles.chartLegendText}>-- kg - -- kg</Text>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Gordura Corporal - Últimos 30 dias</Text>
              <View style={styles.chart}>
                {/* Show empty bars when no data */}
                {[1,2,3,4,5,6,7,8,9,10].map((_, index) => (
                  <View key={index} style={styles.chartBarContainer}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { 
                          height: '10%', 
                          backgroundColor: '#E74C3C30',
                          opacity: 0.3
                        }
                      ]} 
                    />
                    <Text style={styles.chartBarLabel}>--</Text>
                  </View>
                ))}
              </View>
              <View style={styles.chartLegend}>
                <Text style={styles.chartLegendText}>Sem dados disponíveis</Text>
                <Text style={styles.chartLegendText}>--% - --%</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#4A67E3' },
  header: {
    backgroundColor: '#4A67E3', padding: 20, paddingTop: 10, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30, elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', flex: 1, textAlign: 'center' },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerRight: { width: 40 },
  container: { flex: 1, backgroundColor: '#F8F9FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FF' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  statCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, borderLeftWidth: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  statIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  statInfo: { flex: 1 },
  statTitle: { fontSize: 14, color: '#666', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statDetailValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  noDataContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  noDataTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  noDataText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  chartsSection: { marginBottom: 30 },
  chartContainer: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingHorizontal: 10 },
  chartBarContainer: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  chartBar: { width: 20, borderRadius: 10, minHeight: 10 },
  chartBarLabel: { fontSize: 10, color: '#888', marginTop: 5 },
  chartLegend: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#E8ECF4'
  },
  chartLegendText: { fontSize: 12, color: '#888' }
});

export default BodyCompositionHistoryScreen;