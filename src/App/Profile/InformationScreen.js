import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Theme colors
const COLORS = {
  primary: '#0066CC',
  primaryLight: '#E5F1FF',
  primaryDark: '#004C99',
  secondary: '#2C3E50',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1A2C42',
  textSecondary: '#64748B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#E2E8F0'
};

const InformationScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('all');
  const [healthData, setHealthData] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categories = useMemo(() => [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'general', label: 'General', icon: 'heart-outline' },
    { id: 'mental', label: 'Mental', icon: 'medical-outline' },
    { id: 'emergency', label: 'Emergency', icon: 'warning-outline' },
    { id: 'covid', label: 'COVID-19', icon: 'fitness-outline' }
  ], []);

  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = {
        mentalHealth: {
          title: "Mental Health Statistics",
          icon: "medical-outline",
          category: 'mental',
          source: "Source: WHO Mental Health Atlas 2023",
          stats: [
            {
              title: "Depression Rate",
              value: "5.7%",
              description: "Population affected by depression",
              trend: "increasing"
            },
            {
              title: "Anxiety Disorders",
              value: "4.9%",
              description: "Adults with anxiety disorders",
              trend: "stable"
            },
            {
              title: "Treatment Centers",
              value: "25+",
              description: "Mental health facilities",
              trend: "improving"
            }
          ]
        },
        generalHealth: {
          title: "General Health Indicators",
          icon: "heart-outline",
          category: 'general',
          stats: [
            {
              title: "Life Expectancy",
              value: "81.6",
              description: "Years (above EU average)",
              trend: "improving"
            },
            {
              title: "Healthcare Coverage",
              value: "99%",
              description: "Population with health insurance",
              trend: "stable"
            },
            {
              title: "Hospital Beds",
              value: "3.4",
              description: "Per 1,000 inhabitants",
              trend: "stable"
            },
            {
              title: "Medical Staff",
              value: "5.3",
              description: "Doctors per 1,000 people",
              trend: "increasing"
            }
          ],
          source: "European Health Information Gateway 2023"
        },
        emergencyServices: {
          title: "Emergency Services",
          icon: "alert-outline",
          category: 'emergency',
          stats: [
            {
              title: "Emergency Number",
              value: "112",
              description: "European emergency number",
              trend: "active"
            },
            {
              title: "Response Time",
              value: "8min",
              description: "Average emergency response",
              trend: "stable"
            },
            {
              title: "Ambulances",
              value: "475",
              description: "Active emergency vehicles",
              trend: "increasing"
            },
            {
              title: "Emergency Centers",
              value: "42",
              description: "24/7 emergency facilities",
              trend: "stable"
            }
          ],
          source: "National Emergency Services 2023"
        },
        covidStats: {
          title: "COVID-19 Statistics",
          icon: "fitness-outline",
          category: 'covid',
          stats: [
            {
              title: "Vaccination Rate",
              value: "95.5%",
              description: "Fully vaccinated population",
              trend: "stable"
            },
            {
              title: "Booster Coverage",
              value: "67.8%",
              description: "Population with boosters",
              trend: "increasing"
            },
            {
              title: "Testing Centers",
              value: "850+",
              description: "Active testing locations",
              trend: "stable"
            },
            {
              title: "Digital System",
              value: "100%",
              description: "Digital certificate coverage",
              trend: "implemented"
            }
          ],
          source: "DGS COVID-19 Dashboard 2023"
        },
        lifestyleHealth: {
          title: "Lifestyle & Prevention",
          icon: "walk-outline",
          category: 'lifestyle',
          stats: [
            {
              title: "Physical Activity",
              value: "43%",
              description: "Meet WHO guidelines",
              trend: "improving"
            },
            {
              title: "Smoking Rate",
              value: "16.8%",
              description: "Adult smokers",
              trend: "decreasing"
            },
            {
              title: "Obesity Rate",
              value: "22.1%",
              description: "Adult population",
              trend: "concerning"
            },
            {
              title: "Healthy Diet",
              value: "76%",
              description: "Mediterranean diet adherence",
              trend: "stable"
            }
          ],
          source: "National Health Survey 2023"
        },
        childHealth: {
          title: "Child Health",
          icon: "people-outline",
          category: 'children',
          stats: [
            {
              title: "Vaccination",
              value: "98%",
              description: "Childhood vaccination rate",
              trend: "excellent"
            },
            {
              title: "Infant Care",
              value: "99.9%",
              description: "Professional birth attendance",
              trend: "stable"
            },
            {
              title: "Child Mortality",
              value: "3.2",
              description: "Per 1,000 live births",
              trend: "improving"
            },
            {
              title: "Pediatric Access",
              value: "100%",
              description: "Access to pediatric care",
              trend: "stable"
            }
          ],
          source: "UNICEF Report 2023"
        },
        pharmacyServices: {
          title: "Pharmacy Services",
          icon: "medical-outline",
          category: 'pharmacy',
          stats: [
            {
              title: "Pharmacies",
              value: "2,900+",
              description: "Across the country",
              trend: "stable"
            },
            {
              title: "24/7 Service",
              value: "100%",
              description: "Areas with night service",
              trend: "stable"
            },
            {
              title: "Generic Drugs",
              value: "48.6%",
              description: "Generic prescription rate",
              trend: "increasing"
            },
            {
              title: "Coverage",
              value: "97%",
              description: "5min from pharmacy",
              trend: "excellent"
            }
          ],
          source: "INFARMED Statistics 2023"
        }
      };

      setHealthData(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load health information');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const renderTrendIndicator = useCallback(({ trend }) => {
    const getTrendColor = (trend) => {
      switch (trend) {
        case 'increasing': return COLORS.success;
        case 'decreasing': return COLORS.error;
        case 'stable': return COLORS.primary;
        case 'improving': return COLORS.success;
        default: return COLORS.textSecondary;
      }
    };

    const getTrendIcon = (trend) => {
      switch (trend) {
        case 'increasing': return 'arrow-up';
        case 'decreasing': return 'arrow-down';
        case 'stable': return 'remove';
        case 'improving': return 'trending-up';
        default: return 'remove';
      }
    };

    const color = getTrendColor(trend);
    return (
      <View style={[styles.trendContainer, { borderColor: color }]}>
        <Ionicons
          name={getTrendIcon(trend)}
          size={12}
          color={color}
          style={styles.trendIcon}
        />
        <Text style={[styles.trendText, { color }]}>
          {trend.charAt(0).toUpperCase() + trend.slice(1)}
        </Text>
      </View>
    );
  }, []);

  const renderStatCard = useCallback(({ stat }) => (
    <LinearGradient
      colors={[COLORS.surface, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statCard}
      key={stat.title}
    >
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{stat.title}</Text>
        {renderTrendIndicator({ trend: stat.trend })}
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statDescription}>{stat.description}</Text>
    </LinearGradient>
  ), [renderTrendIndicator]);

  const renderSection = useCallback(([key, section]) => {
    if (!section) return null;

    return (
      <View key={key} style={styles.section}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sectionHeader}
        >
          <View style={styles.sectionTitleContainer}>
            <Ionicons name={section.icon} size={20} color={COLORS.surface} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <Text style={styles.sourceText}>{section.source}</Text>
        </LinearGradient>
        <View style={styles.statsContainer}>
          {section.stats.map((stat) => renderStatCard({ stat }))}
        </View>
      </View>
    );
  }, [renderStatCard]);

  const renderFilterDropdown = () => (
    <Modal
      visible={isFilterOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsFilterOpen(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1} 
        onPress={() => setIsFilterOpen(false)}
      >
        <View style={styles.dropdownContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.dropdownItem,
                activeSection === category.id && styles.dropdownItemActive
              ]}
              onPress={() => {
                setActiveSection(category.id);
                setIsFilterOpen(false);
              }}
            >
              <Ionicons
                name={category.icon}
                size={16}
                color={activeSection === category.id ? '#007AFF' : '#8E8E93'}
                style={styles.dropdownIcon}
              />
              <Text
                style={[
                  styles.dropdownText,
                  activeSection === category.id && styles.dropdownTextActive
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Information</Text>
          <View style={styles.headerRight} />
        </LinearGradient>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={50} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchHealthData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Information</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setIsFilterOpen(true)}
        >
          <Ionicons name="filter" size={20} color={COLORS.surface} />
        </TouchableOpacity>
      </LinearGradient>
      {renderFilterDropdown()}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading health information...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {Object.entries(healthData)
            .filter(([_, section]) => 
              activeSection === 'all' || section.category === activeSection
            )
            .map(renderSection)}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff'
  },
  backButton: {
    padding: 8,
    marginLeft: -8
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  headerRight: {
    width: 40
  },
  filterButton: {
    padding: 8,
    marginRight: -8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  dropdownContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 88 : StatusBar.currentHeight + 44,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 8,
    minWidth: 180
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8
  },
  dropdownItemActive: {
    backgroundColor: '#E5F0FF'
  },
  dropdownIcon: {
    marginRight: 8
  },
  dropdownText: {
    fontSize: 15,
    color: '#8E8E93'
  },
  dropdownTextActive: {
    color: '#007AFF',
    fontWeight: '500'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    gap: 16
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionHeader: {
    padding: 16
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.surface,
    marginLeft: 8
  },
  sourceText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  statsContainer: {
    padding: 16,
    gap: 12
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1
  },
  trendIcon: {
    marginRight: 4
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600'
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4
  },
  statDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600'
  }
});

export default InformationScreen; 