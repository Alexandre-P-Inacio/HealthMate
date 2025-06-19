import { DoctorAvailabilityService } from '../services/DoctorAvailabilityService';

export const validateAppointmentRequest = (data) => {
  const errors = {};

  if (!data.doctorId) {
    errors.doctor = 'Por favor, selecione um médico';
  }

  if (!data.appointmentDateTime) {
    errors.date = 'Por favor, selecione uma data e hora';
  } else {
    const selectedDate = new Date(data.appointmentDateTime);
    const now = new Date();

    // Appointment must be at least 24 hours in the future
    if (selectedDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      errors.date = 'A consulta deve ser agendada com pelo menos 24 horas de antecedência';
    }

    // Check if it's within business hours (8am - 6pm)
    const hours = selectedDate.getHours();
    if (hours < 8 || hours >= 18) {
      errors.date = 'As consultas devem ser agendadas entre 8:00 e 18:00';
    }

    // Check if it's not on weekend
    const day = selectedDate.getDay();
    if (day === 0 || day === 6) {
      errors.date = 'As consultas não podem ser agendadas para finais de semana';
    }
  }

  if (data.notes && data.notes.length > 500) {
    errors.notes = 'As observações não podem exceder 500 caracteres';
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
        message: 'Erro ao verificar disponibilidade do médico.'
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
        return { isAvailable: false, message: 'O médico está indisponível nesta data.' };
      }
      relevantAvailabilities.push(exceptionForToday);
    } else {
      // Caso contrário, verificar horários recorrentes
      relevantAvailabilities = doctorAvailabilities.filter(item => 
        item.is_recurring && item.day_of_week === appointmentDayOfWeek
      );
    }

    if (relevantAvailabilities.length === 0) {
      return { isAvailable: false, message: 'O médico não tem horários definidos para este dia.' };
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
      return { isAvailable: false, message: 'Horário fora da disponibilidade do médico para este dia.' };
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
        return { isAvailable: false, message: 'O médico já possui uma consulta neste horário ou muito próximo.' };
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
      message: 'Erro ao verificar disponibilidade do médico.'
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
        ? 'Você já possui uma consulta agendada para este dia' 
        : null
    };
  } catch (error) {
    console.error('Error checking user appointments:', error);
    return {
      canSchedule: false,
      message: 'Erro ao verificar agendamentos do usuário'
    };
  }
}; 