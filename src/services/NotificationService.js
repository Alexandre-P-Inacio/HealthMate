import * as Notifications from 'expo-notifications';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';
import MedicationService from './MedicationService';

// Configuração das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // Agendar notificações para medicamentos
  static async scheduleNotifications() {
    try {
      // Cancelar notificações anteriores
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      const userData = DataUser.getUserData();
      if (!userData?.id) {
        console.error('User ID not found');
        return;
      }
      
      // Buscar medicamentos ativos
      const medications = await MedicationService.getUserMedicationSchedules();
      const now = new Date();
      
      for (const med of medications) {
        // Parse da data e hora
        const scheduledDate = new Date(med.scheduled_date);
        const timeArray = med.scheduled_time.split(':');
        
        const scheduledDateTime = new Date(scheduledDate);
        scheduledDateTime.setHours(parseInt(timeArray[0], 10));
        scheduledDateTime.setMinutes(parseInt(timeArray[1], 10));
        
        // Só agendar se for no futuro
        if (scheduledDateTime > now) {
          // Calcular segundos até o horário
          const secondsUntilDue = (scheduledDateTime.getTime() - now.getTime()) / 1000;
          
          // Agendar para 30 minutos antes, se possível
          if (secondsUntilDue > 30 * 60) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Medication Reminder',
                body: `Remember to take ${med.medication_name} in 30 minutes`,
                data: { medicationId: med.id },
              },
              trigger: { seconds: secondsUntilDue - (30 * 60) },
            });
          }
          
          // Agendar para o horário exato
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Time to take your medication',
              body: `It's time to take ${med.medication_name} ${med.dosage ? `(${med.dosage})` : ''}`,
              data: { medicationId: med.id },
            },
            trigger: { seconds: secondsUntilDue },
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }
  
  // Registrar que o usuário tomou ou perdeu uma medicação
  static async recordMedicationResponse(medicationId, taken) {
    try {
      const userData = DataUser.getUserData();
      if (!userData?.id) {
        throw new Error('User ID not found');
      }
      
      const now = new Date();
      
      // Registrar na tabela medication_confirmations
      const { error } = await supabase
        .from('medication_confirmations')
        .insert({
          medication_id: medicationId,
          user_id: userData.id,
          taken: taken,
          confirmation_date: now.toISOString().split('T')[0],
          confirmation_time: now.toISOString(),
          notes: taken ? 'Medication taken' : 'Medication not taken'
        });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error recording medication response:', error);
      throw error;
    }
  }
  
  // Verificar medicamentos perdidos
  static async checkMissedMedications() {
    try {
      const userData = DataUser.getUserData();
      if (!userData?.id) {
        console.error('User ID not found');
        return [];
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Buscar medicamentos agendados para hoje
      const medications = await MedicationService.getMedicationsForDate(today);
      const missedMeds = [];
      
      for (const med of medications) {
        // Parse da hora
        const timeArray = med.scheduled_time.split(':');
        const scheduledTime = new Date();
        scheduledTime.setHours(parseInt(timeArray[0], 10));
        scheduledTime.setMinutes(parseInt(timeArray[1], 10));
        
        // Se o horário já passou
        if (scheduledTime < now) {
          // Verificar se já foi confirmado
          const { data } = await supabase
            .from('medication_confirmations')
            .select('*')
            .eq('medication_id', med.id)
            .eq('user_id', userData.id)
            .eq('confirmation_date', today)
            .single();
          
          if (!data) {
            missedMeds.push(med);
          }
        }
      }
      
      return missedMeds;
    } catch (error) {
      console.error('Error checking missed medications:', error);
      return [];
    }
  }
}

export default NotificationService; 