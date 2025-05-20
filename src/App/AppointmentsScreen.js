import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Modal, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const AppointmentsScreen = () => {
  const navigation = useNavigation();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDatasetModal, setShowDatasetModal] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://transparencia.sns.gov.pt/api/explore/v2.1/catalog/datasets?limit=30');
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('Nenhum dataset encontrado.');
      }
      
      setDatasets(data.results);
      if (data.results.length > 0) {
        setSelectedDataset(data.results[0]);
        fetchRecords(data.results[0].dataset_id);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (datasetId) => {
    try {
      setLoading(true);
      const url = `https://transparencia.sns.gov.pt/api/explore/v2.1/catalog/datasets/${datasetId}/records?limit=10`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error('Sem registos disponíveis neste dataset.');
      }

      setRecords(data.results);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCell = (cell) => {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'object') return JSON.stringify(cell);
    return cell;
  };

  const handleDatasetSelect = (dataset) => {
    setSelectedDataset(dataset);
    setShowDatasetModal(false);
    fetchRecords(dataset.dataset_id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Public SNS Datasets</Text>
          <TouchableOpacity 
            style={styles.datasetButton}
            onPress={() => setShowDatasetModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#6A8DFD" />
              <Text style={styles.loadingText}>Loading data...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle" size={48} color="#e74c3c" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              {records.length > 0 && (
                <View style={styles.tableCard}>
                  <View style={styles.datasetHeader}>
                    <Text style={styles.datasetTitle}>
                      {selectedDataset?.metas?.default?.title || selectedDataset?.dataset_id}
                    </Text>
                    <Text style={styles.datasetSubtitle}>
                      {records.length} records found
                    </Text>
                  </View>
                  <View style={styles.tableWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View>
                        <View style={styles.tableHeaderRow}>
                          {Object.keys(records[0]).map((field, index) => (
                            <View key={index} style={[styles.headerCell, { width: 200 }]}>
                              <Text style={styles.headerCellText} numberOfLines={2} ellipsizeMode="tail">{field}</Text>
                            </View>
                          ))}
                        </View>
                        <ScrollView style={styles.tableBody}>
                          {records.map((row, rowIndex) => (
                            <View key={rowIndex} style={[
                              styles.tableRow,
                              rowIndex % 2 === 0 ? styles.evenRow : styles.oddRow
                            ]}>
                              {Object.keys(records[0]).map((field, colIndex) => (
                                <View key={colIndex} style={[styles.cell, { width: 200 }]}>
                                  <Text style={styles.cellText} numberOfLines={3} ellipsizeMode="tail">
                                    {formatCell(row[field])}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        <Modal
          visible={showDatasetModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDatasetModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Dataset</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowDatasetModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#6A8DFD" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.datasetList}>
                {datasets.map((dataset, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.datasetItem,
                      selectedDataset?.dataset_id === dataset.dataset_id && styles.selectedDataset
                    ]}
                    onPress={() => handleDatasetSelect(dataset)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datasetItemText} numberOfLines={2} ellipsizeMode="tail">
                      {dataset.metas?.default?.title || dataset.dataset_id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A8DFD',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#6A8DFD',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  datasetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6A8DFD',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    fontWeight: '600',
  },
  tableCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  datasetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  datasetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 4,
  },
  datasetSubtitle: {
    fontSize: 14,
    color: '#6A8DFD',
  },
  tableWrapper: {
    maxHeight: 600,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#6A8DFD',
    borderBottomWidth: 2,
    borderBottomColor: '#E8ECF4',
    minHeight: 50,
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#E8ECF4',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCellText: {
    fontWeight: '700',
    color: '#FFF',
    fontSize: 14,
    textAlign: 'left',
  },
  tableBody: {
    maxHeight: 540,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
    minHeight: 60,
  },
  evenRow: {
    backgroundColor: '#FFF',
  },
  oddRow: {
    backgroundColor: '#F5F7FF',
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#E8ECF4',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  cellText: {
    color: '#2D3142',
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
    backgroundColor: '#F5F7FF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3142',
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  datasetList: {
    padding: 16,
  },
  datasetItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
    borderRadius: 8,
  },
  selectedDataset: {
    backgroundColor: '#F5F7FF',
    borderLeftWidth: 4,
    borderLeftColor: '#6A8DFD',
  },
  datasetItemText: {
    fontSize: 16,
    color: '#2D3142',
  },
});

export default AppointmentsScreen; 