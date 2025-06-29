import supabase from '../../supabase';
import {
  validateAppointmentRequest,
  validateDoctorAvailability,
  validateUserAppointments
} from '../utils/validation';
import DoctorService from './DoctorService';
import UserService from './UserService';
import NotificationService from './NotificationService';

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
          user_id: !isNaN(parseInt(appointmentData.userId)) ? parseInt(appointmentData.userId) : null,
          doctor_id: !isNaN(parseInt(appointmentData.doctorId)) ? parseInt(appointmentData.doctorId) : null,
          appointment_datetime: appointmentData.appointmentDateTime,
          location: appointmentData.location || null,
          notes: appointmentData.notes,
          description: appointmentData.description || null,
          status: 'pending',
          requested_by: (appointmentData.requestedBy !== null && appointmentData.requestedBy !== undefined && !isNaN(parseInt(appointmentData.requestedBy))) ? parseInt(appointmentData.requestedBy) : null,
          requested_date_change: appointmentData.requestedDateChange || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Schedule notifications for the appointment
      try {
        await NotificationService.scheduleAppointmentNotification(data);
        console.log('✅ Notifications scheduled for appointment:', data.id);
      } catch (notificationError) {
        console.error('⚠️ Error scheduling appointment notifications:', notificationError);
        // Don't fail appointment creation because of notifications
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
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('user_id, doctor_id')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentAppointment) throw new Error('Consulta não encontrada.');

      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          requested_by: (requestedById !== null && requestedById !== undefined && !isNaN(parseInt(requestedById))) ? parseInt(requestedById) : null,
          updated_at: new Date().toISOString()
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
      const parsedDoctorId = parseInt(doctorId);
      if (isNaN(parsedDoctorId)) {
        console.warn(`AppointmentService: Invalid doctorId provided to getDoctorAppointments: ${doctorId}`);
        return { success: false, error: 'Invalid Doctor ID.' };
      }

      let query = supabase
        .from('appointments')
        .select(`
          *,
          users:user_id (
            id,
            fullname,
            email
          ),
          doctors:doctor_id (
            id,
            name,
            specialization,
            user_id,
            user:user_id (
              fullname
            )
          )
        `)
        .eq('doctor_id', parsedDoctorId)
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

      const { data: appointments, error } = await query;
      if (error) throw error;

      // Process appointments to ensure user data is available
      const processedAppointments = appointments.map(appointment => {
        // Ensure users data is properly structured
        if (appointment.users && !appointment.users.fullname && appointment.users.email) {
          appointment.users.fullname = appointment.users.email.split('@')[0];
        }
        
        return appointment;
      });

      return {
        success: true,
        data: processedAppointments
      };
    } catch (error) {
      console.error('Error fetching doctor appointments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getUserAppointments(userId, status = null) {
    try {
      const parsedUserId = parseInt(userId);
      if (isNaN(parsedUserId)) {
        console.warn(`AppointmentService: Invalid userId provided to getUserAppointments: ${userId}`);
        return { success: false, error: 'Invalid User ID.' };
      }

      let query = supabase
        .from('appointments')
        .select(`
          *,
          users:user_id (
            id,
            fullname,
            email
          ),
          doctors:doctor_id (
            id,
            name,
            specialization,
            user_id,
            user:user_id (
              fullname
            )
          )
        `)
        .eq('user_id', parsedUserId)
        .order('appointment_datetime', { ascending: true });

      if (status && status !== 'null') {
        query = query.eq('status', status);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      // Process appointments to ensure doctor data is available
      const processedAppointments = appointments.map(appointment => {
        // Handle custom appointments
        if (appointment.is_custom_appointment && appointment.custom_doctor_name) {
          appointment.doctors = {
            fullname: appointment.custom_doctor_name,
            name: appointment.custom_doctor_name,
            specialization: appointment.custom_doctor_specialty || 'N/A',
            phone: appointment.custom_doctor_phone,
            isCustom: true
          };
        } else if (appointment.doctors) {
          // Ensure doctors data is properly structured for regular appointments
          if (appointment.doctors.user && appointment.doctors.user.fullname) {
            appointment.doctors.fullname = appointment.doctors.user.fullname;
          } else if (appointment.doctors.name) {
            appointment.doctors.fullname = appointment.doctors.name;
          }
        }
        
        return appointment;
      });

      return {
        success: true,
        data: processedAppointments
      };
    } catch (error) {
      console.error('Error fetching user appointments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async cancelAppointment(appointmentId, canceledBy, reason) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          canceled_by: (canceledBy !== null && canceledBy !== undefined && !isNaN(parseInt(canceledBy))) ? parseInt(canceledBy) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('user_id, doctor_id, appointment_datetime')
        .single();

      if (error) throw error;

      // Cancel appointment notifications
      try {
        await NotificationService.cancelAppointmentNotification(appointmentId);
        console.log('✅ Notifications cancelled for appointment:', appointmentId);
      } catch (notificationError) {
        console.error('⚠️ Error cancelling appointment notifications:', notificationError);
        // Don't fail appointment cancellation because of notifications
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return { success: false, error: error.message };
    }
  }

  static async requestDateChange(appointmentId, newDate, requestedById, newNotes = null) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'reschedule_requested',
          requested_date_change: newDate.toISOString(),
          requested_by: (requestedById !== null && requestedById !== undefined && !isNaN(parseInt(requestedById))) ? parseInt(requestedById) : null,
          notes: newNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('user_id, doctor_id, appointment_datetime')
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error requesting date change:', error);
      return { success: false, error: error.message };
    }
  }

  static async respondToRescheduleRequest(appointmentId, status, requestedById) {
    try {
      let updateData = {
        requested_by: (requestedById !== null && requestedById !== undefined && !isNaN(parseInt(requestedById))) ? parseInt(requestedById) : null,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved') {
        const { data: appointmentData, error: fetchError } = await supabase
          .from('appointments')
          .select('requested_date_change')
          .eq('id', appointmentId)
          .single();

        if (fetchError) throw fetchError;
        if (!appointmentData || !appointmentData.requested_date_change) {
          throw new Error('Data de reagendamento não encontrada.');
        }

        updateData.status = 'confirmed';
        updateData.appointment_datetime = appointmentData.requested_date_change;
        updateData.requested_date_change = null;

      } else if (status === 'rejected') {
        updateData.status = 'pending';
        updateData.requested_date_change = null;
      } else {
        throw new Error('Status de resposta inválido.');
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select('user_id, doctor_id, appointment_datetime')
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error responding to reschedule request:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAppointmentById(appointmentId) {
    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      if (appointment) {
        let user = null;
        if (appointment.user_id) {
          const userResult = await UserService.getUserById(appointment.user_id);
          user = userResult.success ? userResult.data : null;
        }

        let doctor = null;
        if (appointment.doctor_id) {
          const doctorResult = await DoctorService.getDoctorById(appointment.doctor_id);
          doctor = doctorResult.success ? doctorResult.data : null;
        }

        return {
          success: true,
          data: {
            ...appointment,
            user: user,
            doctor: doctor,
          },
        };
      }
      return { success: false, error: 'Consulta não encontrada.' };
    } catch (error) {
      console.error('Error fetching appointment by ID:', error);
      return { success: false, error: error.message };
    }
  }

  static async createCustomAppointment(appointmentData) {
    try {
      // Basic validation for custom appointments
      if (!appointmentData.userId || !appointmentData.customDoctorName || !appointmentData.location) {
        return {
          success: false,
          errors: { 
            general: 'User ID, doctor name, and location are required for custom appointments.' 
          }
        };
      }

      // Validate appointment date is in the future
      const appointmentDate = new Date(appointmentData.appointmentDateTime);
      const now = new Date();
      if (appointmentDate <= now) {
        return {
          success: false,
          errors: { date: 'Appointment date must be in the future.' }
        };
      }

      // Create the custom appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          user_id: !isNaN(parseInt(appointmentData.userId)) ? parseInt(appointmentData.userId) : null,
          doctor_id: null, // No doctor ID for custom appointments
          appointment_datetime: appointmentData.appointmentDateTime,
          location: appointmentData.location || null,
          notes: appointmentData.notes || null,
          description: appointmentData.description || null,
          status: appointmentData.status || 'confirmed',
          requested_by: (appointmentData.requestedBy !== null && appointmentData.requestedBy !== undefined && !isNaN(parseInt(appointmentData.requestedBy))) ? parseInt(appointmentData.requestedBy) : null,
          // Custom appointment specific fields
          custom_doctor_name: appointmentData.customDoctorName,
          custom_doctor_specialty: appointmentData.customDoctorSpecialty || null,
          custom_doctor_phone: appointmentData.customDoctorPhone || null,
          is_custom_appointment: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Schedule notifications for the custom appointment
      try {
        await NotificationService.scheduleAppointmentNotification(data);
        console.log('✅ Notifications scheduled for custom appointment:', data.id);
      } catch (notificationError) {
        console.error('⚠️ Error scheduling custom appointment notifications:', notificationError);
        // Don't fail appointment creation because of notifications
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error creating custom appointment:', error);
      return {
        success: false,
        errors: { general: 'Erro ao criar consulta personalizada. Tente novamente.' }
      };
    }
  }
} 