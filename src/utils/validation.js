import { DoctorAvailabilityService } from '../services/DoctorAvailabilityService';
import supabase from '../../supabase';

export const validateAppointmentRequest = (data) => {
  const errors = {};

  if (!data.doctorId) {
    errors.doctor = 'Please select a doctor';
  }

  if (!data.appointmentDateTime) {
    errors.date = 'Please select a date and time';
  } else {
    const selectedDate = new Date(data.appointmentDateTime);
    const now = new Date();

    // Appointment must be at least 24 hours in the future
    const timeDiff = selectedDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    if (hoursDiff < 24) {
      errors.date = 'Appointment must be scheduled at least 24 hours in advance';
    }

    // Check if it's within business hours (8am - 6pm)
    const hours = selectedDate.getHours();
    if (hours < 8 || hours >= 18) {
      errors.date = 'Appointments must be scheduled between 8:00 AM and 6:00 PM';
    }

    // Check if it's not on weekend
    const day = selectedDate.getDay();
    if (day === 0 || day === 6) {
      errors.date = 'Appointments cannot be scheduled for weekends';
    }
  }

  if (data.notes && data.notes.length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateDoctorAvailability = async (doctorId, appointmentDateTime, supabase) => {
  try {
    const appointmentDate = new Date(appointmentDateTime);
    const appointmentTime = appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const appointmentDayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const appointmentDateString = appointmentDate.toISOString().split('T')[0];

    // 1. Verificar a disponibilidade configurada pelo médico
    const availabilitiesResult = await DoctorAvailabilityService.getAvailabilityByDoctorId(doctorId);
    if (!availabilitiesResult.success) {
      console.error('Error fetching doctor availability:', availabilitiesResult.error);
      return {
        isAvailable: false,
        message: 'Error checking doctor availability.'
      };
    }

    const doctorAvailabilities = availabilitiesResult.data;
    let isDoctorAvailableInSlot = false;

    // Priorizar exceções de um dia
    const exceptionForToday = doctorAvailabilities.find(item => 
      !item.is_recurring && new Date(item.exception_date).toDateString() === appointmentDate.toDateString()
    );

    let relevantAvailabilities = [];
    if (exceptionForToday) {
      if (!exceptionForToday.is_available) {
        // Se há uma exceção para hoje e o médico está indisponível, não há slots.
        return { isAvailable: false, message: 'Doctor is unavailable on this date.' };
      }
      relevantAvailabilities.push(exceptionForToday);
    } else {
      // Caso contrário, verificar horários recorrentes
      relevantAvailabilities = doctorAvailabilities.filter(item => 
        item.is_recurring && item.day_of_week === appointmentDayOfWeek
      );
    }

    if (relevantAvailabilities.length === 0) {
      return { isAvailable: false, message: 'Doctor has no defined hours for this day.' };
    }

    // Verificar se o horário da consulta cai em algum slot de disponibilidade
    for (const slot of relevantAvailabilities) {
      const slotStartTime = slot.start_time.substring(0, 8); // hh:mm:ss
      const slotEndTime = slot.end_time.substring(0, 8);   // hh:mm:ss

      if (appointmentTime >= slotStartTime && appointmentTime < slotEndTime) {
        isDoctorAvailableInSlot = true;
        break;
      }
    }

    if (!isDoctorAvailableInSlot) {
      return { isAvailable: false, message: 'Time outside doctor availability for this day.' };
    }

    // 2. Verificar conflitos com outras consultas já agendadas
    // Onde a nova consulta terminaria (assumindo 30 minutos de duração)
    const appointmentEndTime = new Date(appointmentDate.getTime() + 30 * 60 * 1000);

    const { data: conflictingAppointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_datetime')
      .eq('doctor_id', doctorId)
      .in('status', ['pending', 'approved'])
      .lt('appointment_datetime', appointmentEndTime.toISOString()) // Conflita se começa antes do fim da nova consulta
      .gt('appointment_datetime', new Date(appointmentDate.getTime() - 30 * 60 * 1000).toISOString()); // Conflita se começa depois do início da nova consulta menos 30 min

    if (error) throw error;

    // Loop pelos agendamentos existentes para checar sobreposição precisa
    for (const existingApp of conflictingAppointments) {
      const existingAppStart = new Date(existingApp.appointment_datetime);
      const existingAppEnd = new Date(existingAppStart.getTime() + 30 * 60 * 1000); // Assumindo duração de 30 min

      // Se houver qualquer sobreposição, há um conflito
      if (
        (appointmentDate < existingAppEnd && appointmentEndTime > existingAppStart) 
      ) {
        return { isAvailable: false, message: 'Doctor already has an appointment at this time or very close.' };
      }
    }

    return {
      isAvailable: true,
      message: null
    };
  } catch (error) {
    console.error('Error checking doctor availability:', error);
    return {
      isAvailable: false,
      message: 'Error checking doctor availability.'
    };
  }
};

export const validateUserAppointments = async (userId, appointmentDateTime, supabase) => {
  try {
    // Check if user has any appointments on the same day
    const startOfDay = new Date(appointmentDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('user_id', userId)
      .gte('appointment_datetime', startOfDay.toISOString())
      .lte('appointment_datetime', endOfDay.toISOString());

    if (error) throw error;

    const activeAppointments = data.filter(app => 
      ['pending', 'approved'].includes(app.status)
    );

    return {
      canSchedule: activeAppointments.length === 0,
      message: activeAppointments.length > 0 
        ? 'You already have an appointment scheduled for this day' 
        : null
    };
  } catch (error) {
    console.error('Error checking user appointments:', error);
    return {
      canSchedule: false,
      message: 'Error checking user appointments'
    };
  }
};

const validateAppointment = (doctorId, appointmentDate, notes) => {
  const errors = {};

  if (!doctorId) {
    errors.doctor = 'Please select a doctor';
  }

  if (!appointmentDate) {
    errors.date = 'Please select a date and time';
  } else {
    const now = new Date();
    const appointment = new Date(appointmentDate);
    
    // Check if appointment is at least 24 hours in advance
    const timeDiff = appointment.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    if (hoursDiff < 24) {
      errors.date = 'Appointment must be scheduled at least 24 hours in advance';
    }

    // Check if appointment is during business hours (8 AM - 6 PM)
    const appointmentHour = appointment.getHours();
    if (appointmentHour < 8 || appointmentHour >= 18) {
      errors.date = 'Appointments must be scheduled between 8:00 AM and 6:00 PM';
    }

    // Check if appointment is not on weekend
    const appointmentDay = appointment.getDay();
    if (appointmentDay === 0 || appointmentDay === 6) {
      errors.date = 'Appointments cannot be scheduled for weekends';
    }
  }

  if (notes && notes.length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const checkDoctorAvailability = async (doctorId, appointmentDate) => {
  try {
    console.log('🔍 Checking doctor availability...');
    const appointmentTime = appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const appointmentDateString = appointmentDate.toISOString().split('T')[0];
    const appointmentDayOfWeek = appointmentDate.getDay();

    // 1. Check doctor's configured availability
    const { data: availabilities, error: availabilitiesError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId);

    if (availabilitiesError) {
      console.error('Error fetching doctor availability:', availabilitiesError);
      return {
        isAvailable: false,
        message: 'Error checking doctor availability.'
      };
    }

    console.log('📋 Doctor availabilities found:', availabilities?.length || 0);

    // Check if there's an exception for today
    const todayException = availabilities?.find(avail => 
      avail.specific_date === appointmentDateString && !avail.is_available
    );

    if (todayException) {
      console.log('❌ Doctor has exception for this date');
      // If there's an exception for today and the doctor is unavailable, no slots available.
      return { isAvailable: false, message: 'Doctor is unavailable on this date.' };
    }

    // Check regular weekly availability
    const dayAvailability = availabilities?.find(avail => 
      avail.day_of_week === appointmentDayOfWeek && 
      !avail.specific_date && 
      avail.is_available
    );

    if (!dayAvailability) {
      console.log('❌ Doctor has no availability for this day of week');
      return { isAvailable: false, message: 'Doctor has no defined hours for this day.' };
    }

    // Check if appointment time falls within availability slot
    const startTime = dayAvailability.start_time;
    const endTime = dayAvailability.end_time;
    
    console.log(`🕐 Checking if ${appointmentTime} is between ${startTime} and ${endTime}`);
    
    if (appointmentTime < startTime || appointmentTime >= endTime) {
      console.log('❌ Appointment time outside doctor availability');
      return { isAvailable: false, message: 'Time outside doctor availability for this day.' };
    }

    // 2. Check conflicts with other scheduled appointments
    // Where the new appointment would end (assuming 30 minutes duration)
    const appointmentEndTime = new Date(appointmentDate.getTime() + 30 * 60000);

    const { data: conflictingAppointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('appointment_datetime', appointmentDate.toISOString()) // Conflicts if starts before the end of new appointment
      .lt('appointment_datetime', appointmentEndTime.toISOString()) // Conflicts if starts after the beginning of new appointment minus 30 min
      .neq('status', 'cancelled');

    if (error) throw error;

    // Loop through existing appointments to check precise overlap
    for (const existingAppointment of conflictingAppointments || []) {
      const existingStart = new Date(existingAppointment.appointment_datetime);
      const existingEnd = new Date(existingStart.getTime() + 30 * 60000); // Assuming 30 min duration

      // Check if there's overlap
      if (
        (appointmentDate >= existingStart && appointmentDate < existingEnd) ||
        (appointmentEndTime > existingStart && appointmentEndTime <= existingEnd)
      ) {
        console.log('❌ Conflict found with existing appointment');
        return { isAvailable: false, message: 'Doctor already has an appointment at this time or very close.' };
      }
    }

    console.log('✅ Doctor is available at this time');
    return { isAvailable: true };

  } catch (error) {
    console.error('Error checking doctor availability:', error);
    return {
      isAvailable: false,
      message: 'Error checking doctor availability.'
    };
  }
};

const checkUserAppointmentConflict = async (userId, appointmentDate) => {
  try {
    const appointmentDateString = appointmentDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('appointment_datetime', appointmentDateString + 'T00:00:00.000Z')
      .lt('appointment_datetime', appointmentDateString + 'T23:59:59.999Z')
      .neq('status', 'cancelled');

    if (error) throw error;

    const hasConflict = data && data.length > 0;

    return {
      hasConflict,
      message: hasConflict 
        ? 'You already have an appointment scheduled for this day'
        : null
    };

  } catch (error) {
    console.error('Error checking user appointments:', error);
    return {
      hasConflict: false,
      message: 'Error checking user appointments'
    };
  }
};

export { validateAppointment, checkDoctorAvailability, checkUserAppointmentConflict }; 