import { NotificationService, NOTIFICATION_TYPES } from './notificationService.js';
import supabase from './supabaseClient.js';

class AppointmentScheduler {
  constructor() {
    this.checkInterval = 1000 * 60 * 60; // Check every hour
    this.reminderDays = [7, 5, 3, 1, 0]; // Days before appointment to send reminders
  }

  async start() {
    console.log('Starting appointment scheduler...');
    await this.checkAppointments();
    setInterval(() => this.checkAppointments(), this.checkInterval);
  }

  async checkAppointments() {
    try {
      const today = new Date();
      const appointments = await this.getUpcomingAppointments();

      for (const appointment of appointments) {
        const appointmentDate = new Date(appointment.date);
        const daysUntilAppointment = this.getDaysDifference(today, appointmentDate);

        if (this.reminderDays.includes(daysUntilAppointment)) {
          await this.sendReminders(appointment, daysUntilAppointment);
        }
      }
    } catch (error) {
      console.error('Error checking appointments:', error);
    }
  }

  async getUpcomingAppointments() {
    const currentDate = new Date();
    const oneWeekLater = new Date(currentDate);
    oneWeekLater.setDate(currentDate.getDate() + 7);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pets!inner (
          pet_name,
          owner_id,
          users_table!inner (
            id,
            first_name,
            last_name
          )
        ),
        services!inner (
          service_name
        )
      `)
      .eq('status', 'accepted')
      .gte('appointment_date', currentDate.toISOString().split('T')[0])
      .lte('appointment_date', oneWeekLater.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching upcoming appointments:', error);
      return [];
    }

    return appointments;
  }

  getDaysDifference(date1, date2) {
    const diffTime = date2 - date1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async sendReminders(appointment, daysUntilAppointment) {
    const { pets, services } = appointment;
    const customerName = `${pets.users_table.first_name} ${pets.users_table.last_name}`;
    const reminderData = {
      customerName,
      petName: pets.pet_name,
      serviceName: services.service_name,
      date: appointment.date,
      time: appointment.time,
      daysUntilAppointment
    };

    // Send reminder to customer using the correct owner_id
    await NotificationService.sendNotification(
      pets.owner_id,
      NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      reminderData
    );

    // Send reminder to all admins
    await NotificationService.sendNotificationToAdmins(
      NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      reminderData
    );
  }
}

// Initialize and start the scheduler
const scheduler = new AppointmentScheduler();
scheduler.start().catch(console.error);

export default scheduler; 