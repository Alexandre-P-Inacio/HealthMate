import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { VictoryPie, VictoryLegend } from 'victory-native';
import DataUser from '../../navigation/DataUser';
import supabase from '../../supabase';

const { width } = Dimensions.get('window');

const MedicationHistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [adhereceData, setAdhereceData] = useState({
    taken: 0,
    skipped: 0,
    missed: 0
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'week', 'month', 'year'
  const [medicationStats, setMedicationStats] = useState([]);

  useEffect(() => {
    fetchMedicationData();
  }, [selectedPeriod]);

  const fetchMedicationData = async () => {
    try {
      setLoading(true);
      
      const userData = DataUser.getUserData();
      
      if (!userData || !userData.id) {
        console.error('User data not available');
        return;
      }
      
      const userId = userData.id;
      
      // Calculate date ranges based on selected period
      const today = new Date();
      let startDate;
      
      if (selectedPeriod === 'week') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
      } else {
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
      }
      
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = today.toISOString().split('T')[0];
      
      console.log(`Fetching medication data from ${formattedStartDate} to ${formattedEndDate}`);
      
      // Fetch data from medication_schedule_times for adherence stats
      const { data: medicationData, error: medicationError } = await supabase
        .from('medication_schedule_times')
        .select('id, scheduled_date, status, pill_id, pills_warning(titulo)')
        .eq('user_id', userId)
        .gte('scheduled_date', formattedStartDate)
        .lte('scheduled_date', formattedEndDate);
        
      if (medicationError) {
        console.error('Error fetching medication data:', medicationError);
        return;
      }
      
      // Calculate adherence statistics
      let taken = 0;
      let skipped = 0;
      let missed = 0;
      
      // Count from medication_schedule_times
      if (medicationData) {
        medicationData.forEach(med => {
          // Check if the scheduled date is in the past (not in the future)
          const scheduledDate = new Date(med.scheduled_date);
          const isInPast = scheduledDate <= today;
          
          // Only count medications that are in the past
          if (isInPast) {
            if (med.status === 'taken') taken++;
            else if (med.status === 'skipped') skipped++;
            else missed++; // Assuming any other status means missed
          }
        });
      }
      
      setAdhereceData({ taken, skipped, missed });
      
      // Prepare weekly/monthly/yearly data
      const labelMap = {};
      const dataMap = {
        taken: {},
        skipped: {},
        missed: {}
      };
      
      // Generate labels based on selected period
      let labels = [];
      if (selectedPeriod === 'week') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
          labels.push(dayName);
          
          const formattedDate = date.toISOString().split('T')[0];
          labelMap[formattedDate] = dayName;
          
          // Initialize counts
          dataMap.taken[dayName] = 0;
          dataMap.skipped[dayName] = 0;
          dataMap.missed[dayName] = 0;
        }
      } else if (selectedPeriod === 'month') {
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - (i * 7));
          const weekLabel = `Sem ${i+1}`;
          labels.push(weekLabel);
          
          // Initialize counts
          dataMap.taken[weekLabel] = 0;
          dataMap.skipped[weekLabel] = 0;
          dataMap.missed[weekLabel] = 0;
        }
      } else {
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
          labels.push(monthName);
          
          // Initialize counts
          dataMap.taken[monthName] = 0;
          dataMap.skipped[monthName] = 0;
          dataMap.missed[monthName] = 0;
        }
      }
      
      // Count data for charts
      if (medicationData) {
        medicationData.forEach(med => {
          const date = new Date(med.scheduled_date);
          
          // Skip future medications
          if (date > today) return;
          
          let label;
          if (selectedPeriod === 'week') {
            label = date.toLocaleDateString('pt-BR', { weekday: 'short' });
          } else if (selectedPeriod === 'month') {
            // Calculate which week the date falls into
            const today = new Date();
            const diffTime = Math.abs(today - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7);
            label = `Sem ${weekNum + 1}`;
          } else {
            label = date.toLocaleDateString('pt-BR', { month: 'short' });
          }
          
          if (med.status === 'taken') {
            dataMap.taken[label] = (dataMap.taken[label] || 0) + 1;
          } else if (med.status === 'skipped') {
            dataMap.skipped[label] = (dataMap.skipped[label] || 0) + 1;
          } else {
            dataMap.missed[label] = (dataMap.missed[label] || 0) + 1;
          }
        });
      }
      
      // Convert data maps to arrays for charts
      const takenData = labels.map(label => dataMap.taken[label] || 0);
      const skippedData = labels.map(label => dataMap.skipped[label] || 0);
      const missedData = labels.map(label => dataMap.missed[label] || 0);
      
      setWeeklyData({
        labels,
        datasets: [
          {
            data: takenData,
            color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
            strokeWidth: 2
          },
          {
            data: skippedData,
            color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`,
            strokeWidth: 2
          },
          {
            data: missedData,
            color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Tomados', 'Pulados', 'Perdidos']
      });
      
      // Calculate medication-specific stats
      const medicationStatsMap = {};
      
      // Usar apenas os dados de medication_schedule_times
      const allMedicationData = medicationData || [];
      
      allMedicationData.forEach(med => {
        // Skip future medications
        const scheduledDate = new Date(med.scheduled_date);
        if (scheduledDate > today) return;
        
        const pillId = med.pill_id;
        const pillName = med.pills_warning?.titulo || `Medicamento ${pillId}`;
        
        if (!medicationStatsMap[pillId]) {
          medicationStatsMap[pillId] = {
            id: pillId,
            name: pillName,
            taken: 0,
            skipped: 0,
            missed: 0,
            total: 0
          };
        }
        
        medicationStatsMap[pillId].total++;
        
        // Para dados de medication_schedule_times
        if (med.status === 'taken') {
          medicationStatsMap[pillId].taken++;
        } else if (med.status === 'skipped') {
          medicationStatsMap[pillId].skipped++;
        } else {
          medicationStatsMap[pillId].missed++;
        }
      });
      
      // Convert to array and calculate percentages
      const statsArray = Object.values(medicationStatsMap).map(stat => {
        const adherenceRate = stat.total > 0 
          ? Math.round((stat.taken / stat.total) * 100) 
          : 0;
        
        return {
          ...stat,
          adherenceRate
        };
      });
      
      // Sort by adherence rate (descending)
      statsArray.sort((a, b) => b.adherenceRate - a.adherenceRate);
      
      setMedicationStats(statsArray);
      
    } catch (error) {
      console.error('Error in fetchMedicationData:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPeriodSelector = () => {
    return (
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'week' && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text 
            style={[
              styles.periodButtonText,
              selectedPeriod === 'week' && styles.periodButtonTextActive
            ]}
          >
            Semana
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'month' && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text 
            style={[
              styles.periodButtonText,
              selectedPeriod === 'month' && styles.periodButtonTextActive
            ]}
          >
            Mês
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'year' && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod('year')}
        >
          <Text 
            style={[
              styles.periodButtonText,
              selectedPeriod === 'year' && styles.periodButtonTextActive
            ]}
          >
            Ano
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAdherenceOverview = () => {
    const { taken, skipped, missed } = adhereceData;
    const total = taken + skipped + missed;
    
    const pieData = [
      {
        name: 'Tomados',
        value: taken,
        color: '#2ecc71',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Pulados',
        value: skipped,
        color: '#e67e22',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Perdidos',
        value: missed,
        color: '#e74c3c',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      }
    ];

    // Calculate adherence rate
    const adherenceRate = total > 0 
      ? Math.round((taken / total) * 100) 
      : 0;
    
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Visão Geral de Adesão</Text>
        <Text style={styles.chartSubtitle}>
          {selectedPeriod === 'week' ? 'Últimos 7 dias' : 
           selectedPeriod === 'month' ? 'Último mês' : 'Último ano'}
        </Text>
        
        <View style={styles.adherenceRateContainer}>
          <View style={styles.adherenceRateCircle}>
            <Text style={styles.adherenceRateText}>{adherenceRate}%</Text>
          </View>
          <Text style={styles.adherenceRateLabel}>Taxa de Adesão</Text>
        </View>
        
        {total > 0 ? (
          <PieChart
            data={pieData}
            width={width - 60}
            height={180}
            chartConfig={{
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Não há dados disponíveis para este período</Text>
          </View>
        )}
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#2ecc71' }]} />
            <Text style={styles.statLabel}>Tomados</Text>
            <Text style={styles.statValue}>{taken}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#e67e22' }]} />
            <Text style={styles.statLabel}>Pulados</Text>
            <Text style={styles.statValue}>{skipped}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#e74c3c' }]} />
            <Text style={styles.statLabel}>Perdidos</Text>
            <Text style={styles.statValue}>{missed}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWeeklyChart = () => {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Histórico de Medicamentos</Text>
        <Text style={styles.chartSubtitle}>
          {selectedPeriod === 'week' ? 'Últimos 7 dias' : 
           selectedPeriod === 'month' ? 'Último mês' : 'Último ano'}
        </Text>
        
        {weeklyData.labels && weeklyData.labels.length > 0 ? (
          <LineChart
            data={weeklyData}
            width={width - 60}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
            fromZero
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Não há dados disponíveis para este período</Text>
          </View>
        )}
        
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2ecc71' }]} />
            <Text style={styles.legendText}>Tomados</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#e67e22' }]} />
            <Text style={styles.legendText}>Pulados</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
            <Text style={styles.legendText}>Perdidos</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMedicationStats = () => {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Adesão por Medicamento</Text>
        <Text style={styles.chartSubtitle}>
          {selectedPeriod === 'week' ? 'Últimos 7 dias' : 
           selectedPeriod === 'month' ? 'Último mês' : 'Último ano'}
        </Text>
        
        {medicationStats.length > 0 ? (
          medicationStats.map((med, index) => (
            <View key={med.id} style={styles.medicationStatItem}>
              <View style={styles.medicationStatHeader}>
                <Text style={styles.medicationName} numberOfLines={1}>
                  {med.name}
                </Text>
                <Text style={[
                  styles.adherenceLabel,
                  med.adherenceRate >= 80 ? styles.adherenceGood :
                  med.adherenceRate >= 50 ? styles.adherenceModerate :
                  styles.adherencePoor
                ]}>
                  {med.adherenceRate}%
                </Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar,
                    med.adherenceRate >= 80 ? styles.progressBarGood :
                    med.adherenceRate >= 50 ? styles.progressBarModerate :
                    styles.progressBarPoor,
                    { width: `${med.adherenceRate}%` }
                  ]} 
                />
              </View>
              
              <View style={styles.medicationStatDetails}>
                <Text style={styles.medicationStatText}>
                  Tomados: {med.taken} | Pulados: {med.skipped} | Perdidos: {med.missed}
                </Text>
                <Text style={styles.medicationStatTotal}>
                  Total: {med.total}
                </Text>
              </View>
              
              {index < medicationStats.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Não há dados disponíveis para este período</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4A67E3" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico de Medicamentos</Text>
          <View style={styles.headerRight} />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A67E3" />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderPeriodSelector()}
            {renderAdherenceOverview()}
            {renderWeeklyChart()}
            {renderMedicationStats()}
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Os dados são baseados nos registros de medicamentos do HealthMate.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4A67E3'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  header: {
    backgroundColor: '#4A67E3',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 10,
    paddingBottom: 25,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 30
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16
  },
  periodButtonActive: {
    backgroundColor: '#4A67E3'
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  periodButtonTextActive: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center'
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6
  },
  legendText: {
    fontSize: 12,
    color: '#666'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  statItem: {
    alignItems: 'center'
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  medicationStatItem: {
    marginBottom: 15
  },
  medicationStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1
  },
  adherenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10
  },
  adherenceGood: {
    color: '#2ecc71'
  },
  adherenceModerate: {
    color: '#f39c12'
  },
  adherencePoor: {
    color: '#e74c3c'
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 8
  },
  progressBar: {
    height: 8,
    borderRadius: 4
  },
  progressBarGood: {
    backgroundColor: '#2ecc71'
  },
  progressBarModerate: {
    backgroundColor: '#f39c12'
  },
  progressBarPoor: {
    backgroundColor: '#e74c3c'
  },
  medicationStatDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  medicationStatText: {
    fontSize: 12,
    color: '#666'
  },
  medicationStatTotal: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333'
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 15
  },
  adherenceRateContainer: {
    alignItems: 'center',
    marginVertical: 15
  },
  adherenceRateCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A67E3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  adherenceRateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF'
  },
  adherenceRateLabel: {
    fontSize: 14,
    color: '#666'
  },
  footer: {
    padding: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  }
});

export default MedicationHistoryScreen; 