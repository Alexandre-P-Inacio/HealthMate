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
      // Primeiro, buscar os dados atuais da consulta para obter o user_id do paciente e o doctor_id
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          users!appointments_user_id_fkey (user_id:id),
          doctors!appointments_doctor_id_fkey (user_id)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentAppointment) throw new Error('Consulta não encontrada.');

      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          requested_by: parseInt(requestedById),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação para o paciente
      if (currentAppointment.users?.user_id) {
        await NotificationService.sendAppointmentStatusNotification(
          currentAppointment.users.user_id,
          newStatus,
          data
        );
      }

      // Enviar notificação para o médico
      if (currentAppointment.doctors?.user_id) {
        await NotificationService.sendAppointmentStatusNotification(
          currentAppointment.doctors.user_id,
          newStatus,
          data
        );
      }

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
        .select('*, users:users(fullname), doctors:doctors(name), requested_by, requested_date_change, updated_at')
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

      // Lógica de cancelamento automático
      const now = new Date();
      for (const appointment of data) {
        if (appointment.status !== 'cancelled' && appointment.status !== 'completed') {
          const appointmentDate = new Date(appointment.appointment_datetime);
          const updatedAt = appointment.updated_at ? new Date(appointment.updated_at) : null;
          const hasUpdate = !!appointment.requested_date_change || !!updatedAt;
          const diffMs = appointmentDate - now;
          const diffHours = diffMs / (1000 * 60 * 60);

          if (!hasUpdate && diffHours <= 24) {
            // Faltando 1 dia ou já passou e sem update
            await supabase
              .from('appointments')
              .update({ status: 'cancelled', notes: (appointment.notes || '') + '\n\nCancelado automaticamente por ausência de atualização.' })
              .eq('id', appointment.id);
            appointment.status = 'cancelled';
            appointment.notes = (appointment.notes || '') + '\n\nCancelado automaticamente por ausência de atualização.';
          } else if (hasUpdate && diffHours <= 12) {
            // Houve update, cancela se faltar 12h ou já passou
            await supabase
              .from('appointments')
              .update({ status: 'cancelled', notes: (appointment.notes || '') + '\n\nCancelado automaticamente após atualização.' })
              .eq('id', appointment.id);
            appointment.status = 'cancelled';
            appointment.notes = (appointment.notes || '') + '\n\nCancelado automaticamente após atualização.';
          }
        }
      }

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
        .select('*, users:users(fullname), doctors:doctors(name), requested_by, requested_date_change, updated_at')
        .eq('user_id', userId)
        .order('appointment_datetime', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Lógica de cancelamento automático
      const now = new Date();
      for (const appointment of data) {
        if (appointment.status !== 'cancelled' && appointment.status !== 'completed') {
          const appointmentDate = new Date(appointment.appointment_datetime);
          const updatedAt = appointment.updated_at ? new Date(appointment.updated_at) : null;
          const hasUpdate = !!appointment.requested_date_change || !!updatedAt;
          const diffMs = appointmentDate - now;
          const diffHours = diffMs / (1000 * 60 * 60);

          if (!hasUpdate && diffHours <= 24) {
            // Faltando 1 dia ou já passou e sem update
            await supabase
              .from('appointments')
              .update({ status: 'cancelled', notes: (appointment.notes || '') + '\n\nCancelado automaticamente por ausência de atualização.' })
              .eq('id', appointment.id);
            appointment.status = 'cancelled';
            appointment.notes = (appointment.notes || '') + '\n\nCancelado automaticamente por ausência de atualização.';
          } else if (hasUpdate && diffHours <= 12) {
            // Houve update, cancela se faltar 12h ou já passou
            await supabase
              .from('appointments')
              .update({ status: 'cancelled', notes: (appointment.notes || '') + '\n\nCancelado automaticamente após atualização.' })
              .eq('id', appointment.id);
            appointment.status = 'cancelled';
            appointment.notes = (appointment.notes || '') + '\n\nCancelado automaticamente após atualização.';
          }
        }
      }

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

  static async requestDateChange(appointmentId, newDate, requestedById, newNotes = null) {
    try {
      // Buscar a consulta atual para obter o doctor_id e user_id
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors!appointments_doctor_id_fkey (user_id)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentAppointment) throw new Error('Consulta não encontrada.');

      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'reschedule_requested', // Novo status para solicitação de alteração
          requested_date_change: newDate,
          requested_by: parseInt(requestedById),
          notes: newNotes, // Adicionar as novas notas à consulta
          updated_at: new Date().toISOString() // Atualizar o timestamp de modificação
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação para o médico
      if (currentAppointment.doctors?.user_id) {
        await NotificationService.sendAppointmentStatusNotification(
          currentAppointment.doctors.user_id,
          'reschedule_requested',
          data
        );
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error requesting date change:', error);
      return { success: false, error: 'Erro ao solicitar nova data.' };
    }
  }
} 