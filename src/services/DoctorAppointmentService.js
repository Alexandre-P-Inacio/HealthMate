import supabase from '../../supabase';

const DoctorAppointmentService = {
  // Fetch all doctors
  async fetchDoctors() {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  },

  // Fetch appointments for a specific user
  async fetchUserAppointments(userId) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, doctors(*)') // Select appointment and related doctor info
        .eq('user_id', userId)
        .order('appointment_datetime', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching user appointments:', error);
      throw error;
    }
  },

  // Create a new appointment
  async createAppointment(appointmentData) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }
};

export default DoctorAppointmentService; 