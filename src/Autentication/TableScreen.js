import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import supabase from '../../supabase'; // Importar Supabase

const TableScreen = () => {
  const [usersData, setUsersData] = useState([]);
  const [pillsData, setPillsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar dados da tabela "users"
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*');

        if (usersError) {
          console.error('Error fetching users:', usersError.message);
        } else {
          setUsersData(users);
        }

        // Buscar dados da tabela "pills_warning"
        const { data: pills, error: pillsError } = await supabase
          .from('pills_warning')
          .select('*');

        if (pillsError) {
          console.error('Error fetching pills_warning:', pillsError.message);
        } else {
          setPillsData(pills);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Users Table */}
      <View style={styles.tableContainer}>
        <Text style={styles.title}>Users Table</Text>
        <ScrollView horizontal>
          <View>
            <View style={styles.tableHeader}>
              {['ID', 'Full Name', 'Email', 'Phone', 'Role'].map((column) => (
                <Text key={column} style={[styles.cell, styles.header]}>{column}</Text>
              ))}
            </View>
            <FlatList
              data={usersData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.tableRow}>
                  <Text style={styles.cell}>{item.id}</Text>
                  <Text style={styles.cell}>{item.fullname}</Text>
                  <Text style={styles.cell}>{item.email}</Text>
                  <Text style={styles.cell}>{item.phone || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.role || 'N/A'}</Text>
                </View>
              )}
            />
          </View>
        </ScrollView>
      </View>

      {/* Pills Warning Table */}
      <View style={styles.tableContainer}>
        <Text style={styles.title}>Pills Warning Table</Text>
        <ScrollView horizontal>
          <View>
            <View style={styles.tableHeader}>
              {['ID', 'User ID', 'Title', 'Quantity', 'Start Date', 'End Date'].map((column) => (
                <Text key={column} style={[styles.cell, styles.header]}>{column}</Text>
              ))}
            </View>
            <FlatList
              data={pillsData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.tableRow}>
                  <Text style={styles.cell}>{item.id}</Text>
                  <Text style={styles.cell}>{item.user_id}</Text>
                  <Text style={styles.cell}>{item.titulo}</Text>
                  <Text style={styles.cell}>{item.quantidade_comprimidos}</Text>
                  <Text style={styles.cell}>{item.data_inicio}</Text>
                  <Text style={styles.cell}>{item.data_fim || 'N/A'}</Text>
                </View>
              )}
            />
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  tableContainer: { marginBottom: 30, backgroundColor: '#fff', padding: 10, borderRadius: 10, elevation: 3 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#007bff', paddingVertical: 10, borderRadius: 5 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  cell: { width: 120, fontSize: 14, textAlign: 'center', padding: 5, color: '#333' },
  header: { fontWeight: 'bold', color: '#fff', textAlign: 'center' },
});

export default TableScreen;
