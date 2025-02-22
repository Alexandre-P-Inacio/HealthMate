import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const Navbar = () => {
  const navigation = useNavigation();
  const route = useRoute(); // Para acessar os parâmetros da rota atual
  const userId = route.params?.userId; // Pegue o userId da rota atual

  return (
    <View style={styles.navbar}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('HomeScreen', { userId })}
      >
        <FontAwesome name="home" size={24} color="#4A90E2" />
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('CalendarScreen', { userId })}
      >
        <FontAwesome name="calendar" size={24} color="#4A90E2" />
        <Text style={styles.navText}>Calendar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('AccountScreen', { userId })}
      >
        <FontAwesome name="user" size={24} color="#4A90E2" />
        <Text style={styles.navText}>Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 4,
  },
});

export default Navbar;
