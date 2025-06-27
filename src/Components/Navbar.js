import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { isLoggedIn } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const currentRoute = route.name;

  const isActive = (screenName) => currentRoute === screenName;

  const renderIcon = (iconName, isSelected, isDisabled = false) => {
    let color = '#9BA3B7'; // cor padrão
    
    if (isDisabled) {
      color = '#D1D5DB'; // cor desabilitada (mais clara)
    } else if (isSelected) {
      color = '#6A8DFD'; // cor ativa
    }
    
    return (
      <Ionicons 
        name={isSelected ? iconName : `${iconName}-outline`}
        size={24} 
        color={color} 
      />
    );
  };

  return (
    <View style={[
      styles.navbar,
      { paddingBottom: Math.max(insets.bottom, 10) }
    ]}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        {renderIcon('home', isActive('HomeScreen'))}
        <Text style={[
          styles.navText,
          isActive('HomeScreen') && styles.activeText
        ]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('CalendarScreen')}
      >
        {renderIcon('medkit', isActive('CalendarScreen'))}
        <Text style={[
          styles.navText,
          isActive('CalendarScreen') && styles.activeText
        ]}>Medications</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('MedicalDiaryScreen')}
      >
        {renderIcon('book', isActive('MedicalDiaryScreen'))}
        <Text style={[
          styles.navText,
          isActive('MedicalDiaryScreen') && styles.activeText
        ]}>Diary</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navItem,
          !isLoggedIn && styles.navItemDisabled
        ]}
        onPress={() => {
          if (isLoggedIn) {
            navigation.navigate('AccountScreen');
          } else {
            Alert.alert(
              'Login Necessário',
              'Faça login para acessar seu perfil',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Fazer Login', onPress: () => navigation.navigate('WelcomeScreen') }
              ]
            );
          }
        }}
        disabled={!isLoggedIn}
      >
        {renderIcon('person', isActive('AccountScreen'), !isLoggedIn)}
        <Text style={[
          styles.navText,
          isActive('AccountScreen') && styles.activeText,
          !isLoggedIn && styles.navTextDisabled
        ]}>Profile</Text>
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
    width: '100%',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
    height: Platform.OS === 'ios' ? 80 : 60, // Account for different platform heights
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#9BA3B7',
    fontWeight: '500',
  },
  activeText: {
    color: '#6A8DFD',
    fontWeight: '600',
  },
  navItemDisabled: {
    opacity: 0.5,
  },
  navTextDisabled: {
    color: '#D1D5DB',
  },
});

export default Navbar;
