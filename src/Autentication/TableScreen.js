import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import supabase from '../../supabase'; // Importar Supabase

// Função para truncar texto
const truncateText = (text, maxLength) => {
  if (typeof text !== 'string') return text;
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const TableScreen = () => {
  const [users, setUsers] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Erro ao buscar utilizadores:', error.message);
        setLoading(false);
        return;
      }
      setUsers(data);
      const allColumns = Array.from(new Set(data.flatMap((user) => Object.keys(user))));
      setColumns(allColumns);
      setLoading(false);
    };

    fetchUsers();
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
    <View style={styles.container}>
      <Text style={styles.title}>Users Table</Text>
      <ScrollView horizontal>
        <View>
          <View style={styles.tableHeader}>
            {columns.map((column) => (
              <Text key={column} style={[styles.cell, styles.header]}>
                {truncateText(column.toUpperCase(), 15)}
              </Text>
            ))}
          </View>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.tableRow}>
                {columns.map((column) => (
                  <Text key={column} style={styles.cell}>
                    {item[column] !== undefined && item[column] !== null
                      ? truncateText(item[column], 15)
                      : 'N/A'}
                  </Text>
                ))}
              </View>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e0e0e0', paddingVertical: 10, paddingHorizontal: 5, borderRadius: 5 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  cell: { width: 120, fontSize: 12, textAlign: 'center' },
  header: { fontWeight: 'bold', backgroundColor: '#0d6efd', color: '#fff', textAlign: 'center', paddingVertical: 5 },
});

export default TableScreen;
