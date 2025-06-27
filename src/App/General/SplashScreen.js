import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, StatusBar, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';

// Assume the video file is named 'splash_video.mp4' in the assets folder
// **NOTE: Please replace 'require("../../assets/splash_video.mp4")' with the correct path and filename of your video.**
const splashVideo = require("../../../assets/splashvideo.mp4");

const { width, height } = Dimensions.get('window'); // Get screen dimensions

const SplashScreen = () => {
  const navigation = useNavigation();
  const videoRef = useRef(null);

  useEffect(() => {
    // Timeout de fallback: navega direto para HomeScreen após 5 segundos
    const timeout = setTimeout(() => {
      navigation.replace('HomeScreen');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [navigation]);

  const handlePlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      // Vai direto para HomeScreen quando o vídeo termina
      navigation.replace('HomeScreen');
    }
    if (status.isLoaded === false && status.error) {
      Alert.alert('Erro', 'Não foi possível carregar o vídeo de abertura.');
      navigation.replace('HomeScreen');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Video
        ref={videoRef}
        style={styles.video} // Apply video styles
        source={splashVideo}
        useNativeControls={false}
        resizeMode="contain" // Use 'contain' to fit the video while maintaining aspect ratio
        shouldPlay // Start playing automatically
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
      {/* Overlay content can be added here if needed, it will be centered with the video */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Changed background color to white
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width * 0.9,
    height: height * 0.6,
    // remove position: 'absolute' and top/left/bottom/right properties
  },
});

export default SplashScreen; 