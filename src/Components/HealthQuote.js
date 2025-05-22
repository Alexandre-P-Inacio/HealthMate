import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const healthQuotes = [
  {
    quote: "The greatest wealth is health.",
    author: "Ralph Waldo Emerson"
  },
  {
    quote: "Take care of your body. It's the only place you have to live.",
    author: "Jim Rohn"
  },
  {
    quote: "Health is a state of complete harmony of the body, mind and spirit.",
    author: "B.K.S. Iyengar"
  },
  {
    quote: "The first wealth is health.",
    author: "Ralph Waldo Emerson"
  },
  {
    quote: "A healthy outside starts from the inside.",
    author: "Robert Urich"
  },
  {
    quote: "Your health is what you make of it. Everything you do and think either adds to the vitality, energy, and spirit you possess or takes away from it.",
    author: "Ann Wigmore"
  },
  {
    quote: "The groundwork of all happiness is health.",
    author: "Leigh Hunt"
  },
  {
    quote: "Health is not just about what you're eating. It's also about what you're thinking and saying.",
    author: "Unknown"
  }
];

const HealthQuote = () => {
  const [currentQuote, setCurrentQuote] = useState(null);

  const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * healthQuotes.length);
    setCurrentQuote(healthQuotes[randomIndex]);
  };

  useEffect(() => {
    getRandomQuote();
  }, []);

  if (!currentQuote) return null;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={getRandomQuote}
    >
      <View style={styles.quoteContainer}>
        <Ionicons name="open-outline" size={24} color="#6A8DFD" style={styles.quoteIcon} />
        <Text style={styles.quoteText}>{currentQuote.quote}</Text>
        <Text style={styles.authorText}>- {currentQuote.author}</Text>
      </View>
      <View style={styles.refreshButton}>
        <Ionicons name="refresh" size={20} color="#6A8DFD" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteContainer: {
    flex: 1,
  },
  quoteIcon: {
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 16,
    color: '#2D3142',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 22,
  },
  authorText: {
    fontSize: 14,
    color: '#6A8DFD',
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    marginLeft: 10,
  }
});

export default HealthQuote; 