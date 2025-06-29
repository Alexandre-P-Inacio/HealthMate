import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

// Configurar notificações para funcionar em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  
  // Registrar permissões de notificação
  static async registerForPushNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Allow notifications to receive medication and appointment reminders.'
        );
        return false;
      }

      console.log('✅ Notification permissions granted');
      return true;
          } catch (error) {
        console.error('❌ Error requesting notification permissions:', error);
        return false;
      }
  }

  // Agendar notificação para medicamento
  static async scheduleMedicationNotification(medicationData) {
    try {
      const { id, title, scheduled_date, scheduled_time, dosage } = medicationData;
      
      // Criar data/hora da notificação
      const notificationDate = new Date(`${scheduled_date}T${scheduled_time}`);
      const now = new Date();
      
      // Don't schedule notifications for the past
      if (notificationDate <= now) {
        console.log('⚠️ Not scheduling notification for the past:', notificationDate);
        return null;
      }

      // Schedule main notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Medication Time',
          body: `${title || 'Medication'} - ${dosage || '1'} pill(s)`,
          data: { 
            type: 'medication',
            medicationId: id,
            scheduledTime: scheduled_time,
            scheduledDate: scheduled_date
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'medication',
        },
        trigger: {
          date: notificationDate,
        },
      });

      // Schedule reminder notification (5 minutes later)
      const reminderDate = new Date(notificationDate.getTime() + 5 * 60 * 1000);
      const reminderId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Reminder: Medication',
          body: `Did you take ${title || 'your medication'}? Please confirm in the app.`,
          data: { 
            type: 'medication_reminder',
            medicationId: id,
            scheduledTime: scheduled_time,
            scheduledDate: scheduled_date
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          categoryIdentifier: 'medication_reminder',
        },
        trigger: {
          date: reminderDate,
        },
      });

      console.log(`✅ Notifications scheduled for medication ${title}:`, {
        main: notificationId,
        reminder: reminderId,
        date: notificationDate.toISOString()
      });

      return { notificationId, reminderId };
    } catch (error) {
      console.error('❌ Error scheduling medication notification:', error);
      return null;
    }
  }

  // Agendar notificação para consulta
  static async scheduleAppointmentNotification(appointmentData) {
    try {
      const { id, appointment_datetime, doctors, custom_doctor_name, location } = appointmentData;
      
      const appointmentDate = new Date(appointment_datetime);
      const now = new Date();
      
      // Don't schedule notifications for the past
      if (appointmentDate <= now) {
        console.log('⚠️ Not scheduling notification for appointment in the past:', appointmentDate);
        return null;
      }

      const doctorName = custom_doctor_name || doctors?.fullname || doctors?.name || 'Doctor';
      
      // Notification 1 day before
      const oneDayBefore = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
      let dayBeforeId = null;
      
      if (oneDayBefore > now) {
        dayBeforeId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Appointment Tomorrow',
            body: `Appointment with Dr. ${doctorName} at ${appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
            data: { 
              type: 'appointment_reminder',
              appointmentId: id,
              reminderType: 'day_before'
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
          },
          trigger: {
            date: oneDayBefore,
          },
        });
      }

      // Notification 2 hours before
      const twoHoursBefore = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
      let twoHoursBeforeId = null;
      
      if (twoHoursBefore > now) {
        twoHoursBeforeId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🏥 Appointment in 2 Hours',
            body: `Dr. ${doctorName} - ${location || 'Clinic'}`,
            data: { 
              type: 'appointment_reminder',
              appointmentId: id,
              reminderType: 'two_hours_before'
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: twoHoursBefore,
          },
        });
      }

      // Notification 30 minutes before
      const thirtyMinutesBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
      let thirtyMinutesBeforeId = null;
      
      if (thirtyMinutesBefore > now) {
        thirtyMinutesBeforeId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 Appointment in 30 Minutes!',
            body: `Get ready for your appointment with Dr. ${doctorName}`,
            data: { 
              type: 'appointment_urgent',
              appointmentId: id,
              reminderType: 'thirty_minutes_before'
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            date: thirtyMinutesBefore,
          },
        });
      }

      console.log(`✅ Notifications scheduled for appointment with ${doctorName}:`, {
        dayBefore: dayBeforeId,
        twoHours: twoHoursBeforeId,
        thirtyMinutes: thirtyMinutesBeforeId,
        appointmentDate: appointmentDate.toISOString()
      });

      return { dayBeforeId, twoHoursBeforeId, thirtyMinutesBeforeId };
    } catch (error) {
      console.error('❌ Error scheduling appointment notification:', error);
      return null;
    }
  }

  // Agendar todas as notificações de medicamentos do usuário
  static async scheduleAllMedicationNotifications() {
    try {
      const userData = DataUser.getUserData();
      if (!userData?.id) {
        console.log('⚠️ User not logged in, not scheduling notifications');
        return;
      }

      // Cancel all existing medication notifications
      await this.cancelAllMedicationNotifications();

      // Search for pending medications for the next 7 days
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const { data: medications, error } = await supabase
        .from('medication_schedule_times')
        .select(`
          id,
          pill_id,
          scheduled_date,
          scheduled_time,
          dosage,
          status,
          pills_warning (
            titulo
          )
        `)
        .eq('user_id', userData.id)
        .eq('status', 'pending')
        .gte('scheduled_date', today.toISOString().split('T')[0])
        .lte('scheduled_date', nextWeek.toISOString().split('T')[0]);

      if (error) {
        console.error('❌ Error fetching medications:', error);
        return;
      }

      let scheduled = 0;
      for (const med of medications || []) {
        const result = await this.scheduleMedicationNotification({
          id: med.id,
          title: med.pills_warning?.titulo || 'Medication',
          scheduled_date: med.scheduled_date,
          scheduled_time: med.scheduled_time,
          dosage: med.dosage || '1'
        });
        
        if (result) scheduled++;
      }

      console.log(`✅ ${scheduled} medication notifications scheduled`);
      return scheduled;
          } catch (error) {
        console.error('❌ Error scheduling medication notifications:', error);
        return 0;
      }
  }

  // Agendar todas as notificações de consultas do usuário
  static async scheduleAllAppointmentNotifications() {
    try {
      const userData = DataUser.getUserData();
      if (!userData?.id) {
        console.log('⚠️ User not logged in, not scheduling notifications');
        return;
      }

      // Cancel all existing appointment notifications
      await this.cancelAllAppointmentNotifications();

      // Search for future appointments for the next 30 days
      const today = new Date();
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_datetime,
          location,
          custom_doctor_name,
          doctors (
            name,
            users:user_id (
              fullname
            )
          )
        `)
        .eq('user_id', userData.id)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_datetime', today.toISOString())
        .lte('appointment_datetime', nextMonth.toISOString());

      if (error) {
        console.error('❌ Error fetching appointments:', error);
        return;
      }

      let scheduled = 0;
      for (const appointment of appointments || []) {
        const result = await this.scheduleAppointmentNotification(appointment);
        if (result) scheduled++;
      }

      console.log(`✅ ${scheduled} appointment notifications scheduled`);
      return scheduled;
          } catch (error) {
        console.error('❌ Error scheduling appointment notifications:', error);
        return 0;
      }
  }

  // Cancelar todas as notificações de medicamentos
  static async cancelAllMedicationNotifications() {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const medicationNotifications = allNotifications.filter(notif => 
        notif.content.data?.type === 'medication' || 
        notif.content.data?.type === 'medication_reminder'
      );
      
      for (const notif of medicationNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
      
      console.log(`✅ ${medicationNotifications.length} medication notifications cancelled`);
    } catch (error) {
      console.error('❌ Error cancelling medication notifications:', error);
    }
  }

  // Cancelar todas as notificações de consultas
  static async cancelAllAppointmentNotifications() {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const appointmentNotifications = allNotifications.filter(notif => 
        notif.content.data?.type === 'appointment_reminder' || 
        notif.content.data?.type === 'appointment_urgent'
      );
      
      for (const notif of appointmentNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
      
      console.log(`✅ ${appointmentNotifications.length} appointment notifications cancelled`);
    } catch (error) {
      console.error('❌ Error cancelling appointment notifications:', error);
    }
  }

  // Cancel specific medication notification
  static async cancelMedicationNotification(medicationId) {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const medicationNotifications = allNotifications.filter(notif => 
        notif.content.data?.medicationId === medicationId
      );
      
      for (const notif of medicationNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
      
      console.log(`✅ Notifications cancelled for medication ${medicationId}`);
    } catch (error) {
      console.error('❌ Error cancelling medication notification:', error);
    }
  }

  // Cancel specific appointment notification
  static async cancelAppointmentNotification(appointmentId) {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const appointmentNotifications = allNotifications.filter(notif => 
        notif.content.data?.appointmentId === appointmentId
      );
      
      for (const notif of appointmentNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
      
      console.log(`✅ Notifications cancelled for appointment ${appointmentId}`);
    } catch (error) {
      console.error('❌ Error cancelling appointment notification:', error);
    }
  }

  // Reschedule all notifications (useful after changes)
  static async rescheduleAllNotifications() {
    try {
      console.log('🔄 Rescheduling all notifications...');
      
      const medicationCount = await this.scheduleAllMedicationNotifications();
      const appointmentCount = await this.scheduleAllAppointmentNotifications();
      
      console.log(`✅ Rescheduling completed: ${medicationCount} medications, ${appointmentCount} appointments`);
      
      return { medicationCount, appointmentCount };
    } catch (error) {
      console.error('❌ Error rescheduling notifications:', error);
      return { medicationCount: 0, appointmentCount: 0 };
    }
  }

  // Configure notification categories (Android)
  static async setupNotificationCategories() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medication', {
          name: 'Medications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: true,
        });

        await Notifications.setNotificationChannelAsync('appointment', {
          name: 'Appointments',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4ECDC4',
          sound: true,
        });
      }
    } catch (error) {
      console.error('❌ Error setting up notification categories:', error);
    }
  }

  // Get notification statistics
  static async getNotificationStats() {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const medicationNotifications = allNotifications.filter(notif => 
        notif.content.data?.type === 'medication' || 
        notif.content.data?.type === 'medication_reminder'
      );
      
      const appointmentNotifications = allNotifications.filter(notif => 
        notif.content.data?.type === 'appointment_reminder' || 
        notif.content.data?.type === 'appointment_urgent'
      );
      
      return {
        total: allNotifications.length,
        medications: medicationNotifications.length,
        appointments: appointmentNotifications.length
      };
    } catch (error) {
      console.error('❌ Error getting notification statistics:', error);
      return { total: 0, medications: 0, appointments: 0 };
    }
  }

  // Save notification preferences
  static async saveNotificationPreferences(preferences) {
    try {
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      console.log('✅ Notification preferences saved');
    } catch (error) {
      console.error('❌ Error saving notification preferences:', error);
    }
  }

  // Get notification preferences
  static async getNotificationPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('notificationPreferences');
      return preferences ? JSON.parse(preferences) : {
        medicationsEnabled: true,
        appointmentsEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        quietHours: { start: '22:00', end: '07:00' }
      };
    } catch (error) {
      console.error('❌ Error getting notification preferences:', error);
      return {
        medicationsEnabled: true,
        appointmentsEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        quietHours: { start: '22:00', end: '07:00' }
      };
    }
  }
}

export default NotificationService; 