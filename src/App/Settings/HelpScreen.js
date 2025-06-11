import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpScreen = ({ navigation }) => {
  const helpTopics = [
    {
      title: 'Getting Started',
      items: [
        'How to set up your profile',
        'Adding medications',
        'Setting up reminders',
        'Understanding the calendar',
      ],
    },
    {
      title: 'Medications',
      items: [
        'Adding new medications',
        'Editing medication schedule',
        'Medication reminders',
        'Medication history',
      ],
    },
    {
      title: 'Account & Privacy',
      items: [
        'Managing your account',
        'Privacy settings',
        'Data security',
        'Changing password',
      ],
    },
    {
      title: 'Troubleshooting',
      items: [
        'Notification issues',
        'App performance',
        'Data sync problems',
        'Common errors',
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {helpTopics.map((topic, index) => (
          <View key={index} style={styles.topicContainer}>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            {topic.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.helpItem}
                onPress={() => {
                  // Handle help item press
                  // You can navigate to detailed help pages here
                }}
              >
                <Text style={styles.helpItemText}>{item}</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  topicContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  helpItemText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
});

export default HelpScreen; 