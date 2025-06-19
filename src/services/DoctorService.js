import supabase from '../../supabase';

class DoctorService {
  static async getDoctorById(doctorId) {
    try {
      if (!doctorId) {
        console.warn(`DoctorService: Invalid doctorId provided: ${doctorId}`);
        return { success: false, error: 'Invalid doctorId.' };
      }
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctorId)
        .single();

      if (doctorError) throw doctorError;

      if (doctor) {
        // Fetch associated user info using user_id
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('fullname, pfpimg')
          .eq('id', doctor.user_id)
          .single();

        if (userError) {
          console.warn(`DoctorService: Error fetching user for doctor ID ${doctor.id}: ${userError.message}`);
          return { success: true, data: { ...doctor, user: { fullname: doctor.name, pfpimg: null } } };
        } else {
          return { success: true, data: { ...doctor, user: { fullname: user.fullname, pfpimg: user.pfpimg } } };
        }
      }
      return { success: false, error: 'Doctor not found.' };
    } catch (error) {
      console.error('DoctorService: Error fetching doctor by ID:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDoctorByUserId(userId) {
    try {
      if (!userId) {
        console.warn(`DoctorService: Invalid userId for doctor: ${userId}`);
        return { success: false, error: 'Invalid userId for doctor.' };
      }
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (doctorError) throw doctorError;

      if (doctor) {
        // Fetch associated user info using user_id
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('fullname, pfpimg')
          .eq('id', doctor.user_id)
          .single();

        if (userError) {
          console.warn(`DoctorService: Error fetching user (by user ID) for doctor ID ${doctor.id}: ${userError.message}`);
          return { success: true, data: { ...doctor, user: { fullname: doctor.name, pfpimg: null } } };
        } else {
          return { success: true, data: { ...doctor, user: { fullname: user.fullname, pfpimg: user.pfpimg } } };
        }
      }
      return { success: false, error: 'Doctor not found by user ID.' };
    } catch (error) {
      console.error('DoctorService: Error fetching doctor by user ID:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllDoctors() {
    try {
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('*');

      if (doctorsError) throw doctorsError;

      const doctorsWithUserDetails = await Promise.all(doctors.map(async (doctor) => {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('fullname, pfpimg')
          .eq('id', doctor.user_id)
          .single();

        if (userError) {
          console.warn(`DoctorService: Error fetching user for doctor ID ${doctor.id} in getAllDoctors: ${userError.message}`);
          return { ...doctor, user: { fullname: doctor.name, pfpimg: null } };
        } else {
          return { ...doctor, user: { fullname: user.fullname, pfpimg: user.pfpimg } };
        }
      }));

      return { success: true, data: doctorsWithUserDetails };
    } catch (error) {
      console.error('DoctorService: Error fetching all doctors:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDoctorAvailability(doctorId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString());

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDoctorAppointments(doctorId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('appointment_datetime', startDate.toISOString())
        .lte('appointment_datetime', endDate.toISOString());

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching doctor appointments:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DoctorService; 