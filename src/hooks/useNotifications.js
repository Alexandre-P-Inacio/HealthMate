import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../services/NotificationService';

const useNotifications = () => {
  const { isLoggedIn, user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [notificationStats, setNotificationStats] = useState({ 
    total: 0, 
    medications: 0, 
    appointments: 0 
  });

  // Initialize notifications when user logs in
  useEffect(() => {
    if (isLoggedIn && !isInitialized) {
      initializeNotifications();
    } else if (!isLoggedIn && isInitialized) {
      // Clear notifications when logging out
      cleanupNotifications();
    }
  }, [isLoggedIn, isInitialized]);

  // Listener for received notifications
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(handleNotificationReceived);
    const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      console.log('🔔 Initializing notification system...');
      
      // Configure notification categories
      await NotificationService.setupNotificationCategories();
      
      // Request permissions
      const hasPermission = await NotificationService.registerForPushNotifications();
      
      if (hasPermission) {
        // Schedule all notifications
        const medicationCount = await NotificationService.scheduleAllMedicationNotifications();
        const appointmentCount = await NotificationService.scheduleAllAppointmentNotifications();
        
        // Update statistics
        await updateStats();
        
        console.log(`✅ Notification system initialized: ${medicationCount} medications, ${appointmentCount} appointments`);
        setIsInitialized(true);
      } else {
        console.log('⚠️ Notification permissions denied');
        setIsInitialized(false);
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      setIsInitialized(false);
    }
  };

  const cleanupNotifications = async () => {
    try {
      console.log('🧹 Cleaning up notifications...');
      
      await NotificationService.cancelAllMedicationNotifications();
      await NotificationService.cancelAllAppointmentNotifications();
      
      setNotificationStats({ total: 0, medications: 0, appointments: 0 });
      setIsInitialized(false);
      
      console.log('✅ Notifications cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
    }
  };

  const updateStats = async () => {
    try {
      const stats = await NotificationService.getNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('❌ Error updating notification statistics:', error);
    }
  };

  const handleNotificationReceived = (notification) => {
    const { type, medicationId, appointmentId } = notification.request.content.data || {};
    
    console.log('📱 Notification received:', {
      type,
      medicationId,
      appointmentId,
      title: notification.request.content.title
    });

    // You can add specific logic here based on notification type
  };

  const handleNotificationResponse = async (response) => {
    const { type, medicationId, appointmentId } = response.notification.request.content.data || {};
    
    console.log('👆 User interacted with notification:', {
      type,
      medicationId,
      appointmentId,
      actionIdentifier: response.actionIdentifier
    });

    try {
      if (type === 'medication' && medicationId) {
        // Navigate to medication confirmation screen
        console.log(`🔄 Redirecting to medication confirmation ${medicationId}`);
        // TODO: Implement specific navigation
      } else if (type === 'appointment_reminder' && appointmentId) {
        // Navigate to appointment details
        console.log(`🔄 Redirecting to appointment details ${appointmentId}`);
        // TODO: Implement specific navigation
      }
    } catch (error) {
      console.error('❌ Error processing notification response:', error);
    }
  };

  const rescheduleAll = async () => {
    try {
      if (!isLoggedIn) {
        Alert.alert('⚠️ Warning', 'You need to be logged in to reschedule notifications.');
        return { success: false };
      }

      const result = await NotificationService.rescheduleAllNotifications();
      await updateStats();
      
      return { 
        success: true, 
        medicationCount: result.medicationCount,
        appointmentCount: result.appointmentCount
      };
    } catch (error) {
      console.error('❌ Error rescheduling notifications:', error);
      return { success: false, error: error.message };
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await NotificationService.registerForPushNotifications();
      
      if (granted && isLoggedIn) {
        await initializeNotifications();
      }
      
      return granted;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  };

  const scheduleTestNotification = async () => {
    try {
      const testDate = new Date(Date.now() + 5000); // 5 seconds in the future
      
      await NotificationService.scheduleMedicationNotification({
        id: 'test_notification',
        title: 'Test Medication',
        scheduled_date: testDate.toISOString().split('T')[0],
        scheduled_time: testDate.toTimeString().split(' ')[0],
        dosage: '1'
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error scheduling test notification:', error);
      return { success: false, error: error.message };
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await NotificationService.cancelAllMedicationNotifications();
      await NotificationService.cancelAllAppointmentNotifications();
      await updateStats();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    isInitialized,
    notificationStats,
    initializeNotifications,
    cleanupNotifications,
    updateStats,
    rescheduleAll,
    requestPermissions,
    scheduleTestNotification,
    cancelAllNotifications
  };
};

export default useNotifications; 