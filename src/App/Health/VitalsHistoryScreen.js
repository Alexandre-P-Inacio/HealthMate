import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WearablesService from '../../services/WearablesService';

const { width } = Dimensions.get('window');

const VitalsHistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vitalsData, setVitalsData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30); // 7, 30, 90 days
  const [chartData, setChartData] = useState({
    heartRate: [],
    steps: [],
    bloodOxygen: []
  });

  useEffect(() => {
    loadVitalsData();
  }, [selectedPeriod]);

  const loadVitalsData = async () => {
    try {
      setLoading(true);
      
      const [summary, heartRateChart, stepsChart, bloodOxygenChart] = await Promise.all([
        WearablesService.getVitalsSummary(),
        WearablesService.getHeartRateChartData(selectedPeriod),
        WearablesService.getStepsChartData(selectedPeriod),
        WearablesService.getBloodOxygenChartData(selectedPeriod)
      ]);

      setVitalsData(summary);
      setChartData({
        heartRate: heartRateChart,
        steps: stepsChart,
        bloodOxygen: bloodOxygenChart
      });

    } catch (error) {
      console.error('Error loading vitals data:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados dos sinais vitais.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVitalsData();
    setRefreshing(false);
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
        return { name: 'trending-up', color: '#27AE60' };
      case 'decreasing':
        return { name: 'trending-down', color: '#E74C3C' };
      default:
        return { name: 'trending-flat', color: '#95A5A6' };
    }
  };

  const renderStatCard = (title, stats, icon, color, unit = '') => {
    if (!stats) return null;

    const trendIcon = getTrendIcon(stats.trend);

    return (
      <View style={[styles.statCard, { borderLeftColor: color }]}>
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={[styles.statValue, { color }]}>
              {stats.current}{unit}
            </Text>
          </View>
          <View style={styles.trendContainer}>
            <Ionicons name={trendIcon.name} size={20} color={trendIcon.color} />
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

  const renderSimpleChart = (data, color, title) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{title} - Últimos {selectedPeriod} dias</Text>
          <View style={styles.chart}>
            {/* Show empty bars when no data */}
            {[1,2,3,4,5,6,7,8,9,10].map((_, index) => (
              <View key={index} style={styles.chartBarContainer}>
                <View 
                  style={[
                    styles.chartBar, 
                    { 
                      height: '10%', 
                      backgroundColor: color + '30',
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
            <Text style={styles.chartLegendText}>-- - --</Text>
          </View>
        </View>
      );
    }

    const maxValue = Math.max(...data.map(item => item.value));
    const minValue = Math.min(...data.map(item => item.value));
    const range = maxValue - minValue;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title} - Últimos {selectedPeriod} dias</Text>
        <View style={styles.chart}>
          {data.slice(-10).map((item, index) => {
            const height = range > 0 ? ((item.value - minValue) / range) * 100 : 50;
            return (
              <View key={index} style={styles.chartBarContainer}>
                <View 
                  style={[
                    styles.chartBar, 
                    { 
                      height: `${Math.max(height, 10)}%`, 
                      backgroundColor: color 
                    }
                  ]} 
                />
                <Text style={styles.chartBarLabel}>
                  {new Date(item.date).getDate()}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartLegend}>
          <Text style={styles.chartLegendText}>Últimos 10 registros</Text>
          <Text style={styles.chartLegendText}>
            {minValue} - {maxValue}
          </Text>
        </View>
      </View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {[7, 30, 90].map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period}d
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico de Sinais Vitais</Text>
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de Sinais Vitais</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderPeriodSelector()}

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Estatísticas</Text>
          
          {renderStatCard(
            'Frequência Cardíaca',
            vitalsData?.heartRate || { current: '--', average: '--', min: '--', max: '--', totalEntries: 0, trend: 'stable' },
            'heart',
            '#E74C3C',
            ' bpm'
          )}
          
          {renderStatCard(
            'Passos Diários',
            vitalsData?.steps || { current: '--', average: '--', min: '--', max: '--', totalEntries: 0, trend: 'stable' },
            'walk',
            '#3498DB',
            ''
          )}
          
          {renderStatCard(
            'Saturação de Oxigênio',
            vitalsData?.bloodOxygen || { current: '--', average: '--', min: '--', max: '--', totalEntries: 0, trend: 'stable' },
            'water',
            '#9B59B6',
            '%'
          )}
        </View>

        <View style={styles.chartsSection}>
          <Text style={styles.sectionTitle}>📈 Gráficos</Text>
          
          {renderSimpleChart(chartData.heartRate, '#E74C3C', 'Frequência Cardíaca')}
          {renderSimpleChart(chartData.steps, '#3498DB', 'Passos')}
          {renderSimpleChart(chartData.bloodOxygen, '#9B59B6', 'SpO2')}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4A67E3'
  },
  header: {
    backgroundColor: '#4A67E3',
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerRight: {
    width: 40
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FF'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    marginHorizontal: 20
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8ECF4'
  },
  periodButtonActive: {
    backgroundColor: '#6A8DFD',
    borderColor: '#6A8DFD'
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  periodButtonTextActive: {
    color: '#FFF'
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  statInfo: {
    flex: 1
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  trendContainer: {
    padding: 8
  },
  statDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4
  },
  statDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  chartsSection: {
    marginHorizontal: 20,
    marginBottom: 30
  },
  chartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center'
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 10
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2
  },
  chartBar: {
    width: 20,
    borderRadius: 10,
    minHeight: 10
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 5
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4'
  },
  chartLegendText: {
    fontSize: 12,
    color: '#888'
  },
  noChartData: {
    alignItems: 'center',
    paddingVertical: 40
  },
  noChartText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24
  }
});

export default VitalsHistoryScreen; 