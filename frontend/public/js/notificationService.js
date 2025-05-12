import supabase from './supabaseClient.js';

// Notification Types
const NOTIFICATION_TYPES = {
  // Customer Notifications
  APPOINTMENT_ACCEPTED: 'appointment_accepted',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  RESCHEDULE_ACCEPTED: 'reschedule_accepted',
  RESCHEDULE_DENIED: 'reschedule_denied',
  ADMIN_CANCELLED: 'admin_cancelled',
  APPOINTMENT_NO_SHOW: 'appointment_no_show',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  
  // Admin Notifications
  NEW_BOOKING: 'new_booking',
  CUSTOMER_CANCELLED_PENDING: 'customer_cancelled_pending',
  CUSTOMER_CANCELLED_ACCEPTED: 'customer_cancelled_accepted',
  RESCHEDULE_REQUEST: 'reschedule_request',
  LOW_STOCK: 'low_stock',
  
  // Shared Notifications
  APPOINTMENT_REMINDER: 'appointment_reminder'
};

// Message Templates
const MESSAGE_TEMPLATES = {
  [NOTIFICATION_TYPES.APPOINTMENT_ACCEPTED]: (data) => 
    `Your appointment for ${data.petName} has been accepted. It's scheduled for ${data.date} at ${data.time}.`,
  
  [NOTIFICATION_TYPES.APPOINTMENT_CANCELLED]: (data) =>
    `Your appointment for ${data.petName} has been cancelled. Please contact us for rescheduling.`,
  
  [NOTIFICATION_TYPES.RESCHEDULE_ACCEPTED]: (data) =>
    `Your request to reschedule the appointment for ${data.petName} has been accepted. New appointment is on ${data.newDate} at ${data.newTime}.`,
  
  [NOTIFICATION_TYPES.RESCHEDULE_DENIED]: (data) =>
    `Your request to reschedule the appointment for ${data.petName} has been denied. Please contact us for further assistance.`,
  
  [NOTIFICATION_TYPES.ADMIN_CANCELLED]: (data) =>
    `Your accepted appointment for ${data.petName} has been cancelled by the admin. Please contact us for rescheduling.`,
  
  [NOTIFICATION_TYPES.APPOINTMENT_NO_SHOW]: (data) =>
    `Your appointment for ${data.petName} has been marked as no show. Please contact us to reschedule.`,
  
  [NOTIFICATION_TYPES.APPOINTMENT_COMPLETED]: (data) =>
    `Your appointment for ${data.petName} has been completed. Thank you for choosing our services!`,
  
  [NOTIFICATION_TYPES.NEW_BOOKING]: (data) =>
    `New appointment request from ${data.customerName} for ${data.petName} on ${data.date} at ${data.time}.`,
  
  [NOTIFICATION_TYPES.CUSTOMER_CANCELLED_PENDING]: (data) =>
    `${data.customerName} has cancelled their pending appointment request for ${data.petName}.`,
  
  [NOTIFICATION_TYPES.CUSTOMER_CANCELLED_ACCEPTED]: (data) =>
    `${data.customerName} has cancelled their accepted appointment for ${data.petName} scheduled on ${data.date}.`,
  
  [NOTIFICATION_TYPES.RESCHEDULE_REQUEST]: (data) =>
    `${data.customerName} has requested to reschedule their appointment for ${data.petName} from ${data.oldDate} to ${data.newDate}.`,
  
  [NOTIFICATION_TYPES.LOW_STOCK]: (data) =>
    `Low stock alert: ${data.productName} is running low (${data.currentStock} items remaining).`,
  
  [NOTIFICATION_TYPES.APPOINTMENT_REMINDER]: (data) =>
    `Reminder: Your appointment for ${data.petName} is in ${data.daysLeft} day(s) on ${data.date} at ${data.time}.`
};

class NotificationService {
  static async sendNotification(recipientId, type, data) {
    try {
      console.log('Sending notification:', { recipientId, type, data });

      // Validate recipientId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(recipientId)) {
        console.error('Invalid recipientId format:', recipientId);
        throw new Error('Invalid recipient ID format');
      }

      const message = MESSAGE_TEMPLATES[type](data);
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: recipientId,
          type,
          message,
          data,
          status: 'unread'
        });

      if (error) {
        console.error('Error sending notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in sendNotification:', error);
      throw error;
    }
  }

  static async sendNotificationToAdmins(type, data) {
    const { data: admins, error } = await supabase
      .from('users_table')
      .select('id')
      .in('role_type', ['system_admin', 'business_admin']);

    if (error) {
      console.error('Error fetching admins:', error.message);
      throw error;
    }

    const notifications = admins.map(admin => ({
      recipient_id: admin.id,
      type,
      message: MESSAGE_TEMPLATES[type](data),
      status: 'unread',
      data: JSON.stringify(data)
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error sending notifications to admins:', insertError.message);
      throw insertError;
    }
  }

  static async sendAppointmentReminders() {
    const currentDate = new Date();
    const reminderDays = [7, 5, 3, 1, 0];

    for (const days of reminderDays) {
      const reminderDate = new Date(currentDate);
      reminderDate.setDate(currentDate.getDate() + days);
      const formattedReminderDate = reminderDate.toISOString().split('T')[0];

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          appointment_id,
          appointment_date,
          appointment_time,
          pets!inner (
            pet_name,
            owner_id,
            users_table!inner (
              id,
              first_name,
              last_name
            )
          ),
          status
        `)
        .eq('appointment_date', formattedReminderDate)
        .eq('status', 'accepted')
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error.message);
        continue;
      }

      for (const appointment of appointments) {
        if (!appointment.pets || !appointment.pets.owner_id) {
          console.error('Invalid appointment data:', appointment);
          continue;
        }

        const reminderData = {
          petName: appointment.pets.pet_name,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          daysLeft: days
        };

        // Send to customer using owner_id
        await this.sendNotification(
          appointment.pets.owner_id,
          NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
          reminderData
        );

        // Send to admins
        await this.sendNotificationToAdmins(
          NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
          {
            ...reminderData,
            customerId: appointment.pets.owner_id
          }
        );
      }
    }
  }

  static async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error.message);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('status', 'unread');

    if (error) {
      console.error('Error getting unread count:', error.message);
      throw error;
    }

    return count;
  }
}

export { NotificationService, NOTIFICATION_TYPES }; 