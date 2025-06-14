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

    // Appointment must be at least 1 hour in the future
    if (selectedDate < new Date(now.getTime() + 60 * 60 * 1000)) {
      errors.date = 'A consulta deve ser agendada com pelo menos 1 hora de antecedência';
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

  if (!data.location || data.location.trim().length < 5) {
    errors.location = 'Por favor, forneça um endereço válido com pelo menos 5 caracteres';
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
    // Check if doctor has any appointments within 30 minutes before or after
    const startTime = new Date(appointmentDateTime);
    const endTime = new Date(appointmentDateTime);
    startTime.setMinutes(startTime.getMinutes() - 30);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('status', 'approved')
      .gte('appointment_datetime', startTime.toISOString())
      .lte('appointment_datetime', endTime.toISOString());

    if (error) throw error;

    return {
      isAvailable: data.length === 0,
      message: data.length > 0 ? 'O médico já possui uma consulta próxima a este horário' : null
    };
  } catch (error) {
    console.error('Error checking doctor availability:', error);
    return {
      isAvailable: false,
      message: 'Erro ao verificar disponibilidade do médico'
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