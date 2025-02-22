import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Navbar from '../Components/Navbar';

const CalendarScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar Screen</Text>
      <Navbar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default CalendarScreen;
