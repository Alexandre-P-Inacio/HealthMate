import supabase from '../../supabase';
import { NotificationService } from './NotificationService';
import {
  validateAppointmentRequest,
  validateDoctorAvailability,
  validateUserAppointments
} from '../utils/validation';

export class AppointmentService {
  static async createAppointment(appointmentData) {
    try {
      // Validate appointment data
      const validation = validateAppointmentRequest(appointmentData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check doctor availability
      const availability = await validateDoctorAvailability(
        appointmentData.doctorId,
        appointmentData.appointmentDateTime,
        supabase
      );
      if (!availability.isAvailable) {
        return {
          success: false,
          errors: { date: availability.message }
        };
      }

      // Check user's existing appointments
      const userCheck = await validateUserAppointments(
        appointmentData.userId,
        appointmentData.appointmentDateTime,
        supabase
      );
      if (!userCheck.canSchedule) {
        return {
          success: false,
          errors: { date: userCheck.message }
        };
      }

      // Create the appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          user_id: appointmentData.userId,
          doctor_id: appointmentData.doctorId,
          appointment_datetime: appointmentData.appointmentDateTime,
          location: appointmentData.location,
          notes: appointmentData.notes,
          status: 'pending',
          requested_by: parseInt(appointmentData.requestedBy),
          requested_date_change: appointmentData.requestedDateChange || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Get doctor's data for notification
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('id', appointmentData.doctorId)
        .single();

      if (doctorData) {
        // Send notification to doctor about new appointment request
        await NotificationService.sendAppointmentStatusNotification(
          doctorData.user_id,
          'new_request',
          data
        );
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return {
        success: false,
        errors: { general: 'Erro ao criar agendamento. Tente novamente.' }
      };
    }
  }

  static async updateAppointmentStatus(appointmentId, newStatus, requestedById) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          requested_by: parseInt(requestedById)
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating appointment status:', error);
      return {
        success: false,
        error: 'Erro ao atualizar status do agendamento.'
      };
    }
  }

  static async getDoctorAppointments(doctorId, status = null, date = null) {
    try {
      let query = supabase
        .from('appointments')
        .select('*, users:users(fullname), doctors:doctors(name), requested_by, requested_date_change')
        .eq('doctor_id', doctorId)
        .order('appointment_datetime', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query = query
          .gte('appointment_datetime', startOfDay.toISOString())
          .lte('appointment_datetime', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching doctor appointments:', error);
      return {
        success: false,
        error: 'Erro ao buscar consultas.'
      };
    }
  }

  static async getUserAppointments(userId, status = null) {
    try {
      let query = supabase
        .from('appointments')
        .select('*, users:users(fullname), doctors:doctors(name), requested_by, requested_date_change')
        .eq('user_id', userId)
        .order('appointment_datetime', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching user appointments:', error);
      return {
        success: false,
        error: 'Erro ao buscar consultas.'
      };
    }
  }

  static async cancelAppointment(appointmentId, canceledBy, reason) {
    try {
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors!appointments_doctor_id_fkey (user_id)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: `${currentAppointment.notes}\n\nCancelado por: ${canceledBy}\nMotivo: ${reason}`,
          updated_by: canceledBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Notify both patient and doctor
      await NotificationService.sendAppointmentStatusNotification(
        currentAppointment.user_id,
        'cancelled',
        data
      );

      await NotificationService.sendAppointmentStatusNotification(
        currentAppointment.doctors.user_id,
        'cancelled',
        data
      );

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error canceling appointment:', error);
      return {
        success: false,
        error: 'Erro ao cancelar consulta.'
      };
    }
  }

  static async requestDateChange(appointmentId, newDate, requestedById) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          requested_date_change: newDate,
          requested_by: parseInt(requestedById)
        })
        .eq('id', appointmentId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error requesting date change:', error);
      return { success: false, error: 'Erro ao solicitar nova data.' };
    }
  }
} 