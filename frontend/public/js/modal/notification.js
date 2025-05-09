import { NotificationService, NOTIFICATION_TYPES } from '../notificationService.js';
import supabase from '../supabaseClient.js';

let currentUserId = null;
let notificationChannel = null;

function setupRealtimeNotifications() {
  if (!notificationChannel) {
    notificationChannel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("New notification:", payload);
          updateNotificationCount();
          loadNotifications();
        }
      )
      .subscribe();
  }
}

async function fetchCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error.message);
    return null;
  }
  if (!user) {
    console.error("No user logged in.");
    return null;
  }
  return user.id;
}

async function loadNotifications() {
  if (!currentUserId) return;

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", currentUserId)
    .order("created_at", { ascending: false });

  const notifList = document.getElementById("notificationList");
  notifList.innerHTML = "";

  if (error) {
    console.error("Error fetching notifications:", error.message);
    notifList.innerHTML = `<div class="text-center text-gray-500">Error loading notifications</div>`;
    return;
  }

  if (!notifications.length) {
    notifList.innerHTML = `<div class="text-center text-gray-500">No notifications yet</div>`;
    return;
  }

  notifications.forEach((notif) => {
    const notifItem = document.createElement("div");
    notifItem.className = `notification-item p-2 rounded cursor-pointer ${
      notif.status === "unread" ? "bg-blue-100" : "bg-white"
    } hover:bg-gray-100`;
    notifItem.dataset.id = notif.id;
    notifItem.dataset.status = notif.status;

    let formattedMessage = notif.message;
    let actionLink = '';

    // Add action links based on notification type
    switch (notif.type) {
      case NOTIFICATION_TYPES.NEW_BOOKING:
      case NOTIFICATION_TYPES.RESCHEDULE_REQUEST:
        actionLink = `<a href="#" data-target="booking" class="text-blue-500 underline ml-1 view-link">View</a>`;
        break;
      case NOTIFICATION_TYPES.LOW_STOCK:
        actionLink = `<a href="#" data-target="inventory" class="text-blue-500 underline ml-1 view-link">View</a>`;
        break;
    }

    const createdAt = new Date(notif.created_at).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    notifItem.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <p class="text-sm">${formattedMessage}</p>
          <p class="text-xs text-gray-500 mt-1">${createdAt}</p>
        </div>
        ${actionLink}
      </div>
    `;

    notifItem.addEventListener("click", async (e) => {
      const viewLink = e.target.closest(".view-link");

      if (viewLink) {
        e.preventDefault();
        const targetId = viewLink.dataset.target;

        const targetSection = document.getElementById(targetId);
        if (!targetSection) {
          console.warn(`No section found with id: ${targetId}`);
          return;
        }

        const currentSections = document.querySelectorAll(".current-page");

        if (currentSections.length === 0) {
          const fallback = document.querySelector("#dashboard");
          if (fallback) {
            fallback.classList.add("hidden");
            fallback.classList.remove("current-page");
          }
        } else {
          currentSections.forEach((section) => {
            section.classList.add("hidden");
            section.classList.remove("current-page");
          });
        }

        targetSection.classList.remove("hidden");
        targetSection.classList.add("current-page");

        notifModal.classList.add("hidden");
      }

      if (notifItem.dataset.status === "unread") {
        await NotificationService.markAsRead(notif.id);
        notifItem.classList.remove("bg-blue-100");
        notifItem.classList.add("bg-white");
        notifItem.dataset.status = "read";
        updateNotificationCount();
      }
    });

    notifList.appendChild(notifItem);
  });
}

async function sendAppointmentReminders() {
  const currentDate = new Date();

  const reminderDays = [5, 3, 1, 0];

  for (let days of reminderDays) {
    const reminderDate = new Date(currentDate);
    reminderDate.setDate(currentDate.getDate() + days);
    const formattedReminderDate = reminderDate.toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(
        "appointment_id, appointment_date, appointment_time, user_id, pets(pet_name), status"
      )
      .eq("appointment_date", formattedReminderDate)
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Error fetching appointments:", error.message);
      continue;
    }

    appointments.forEach((appointment) => {
      const customerMessage = `Reminder: Your appointment with ${appointment.pets.pet_name} is in ${days} day(s) on ${appointment.appointment_date} at ${appointment.appointment_time}.`;
      sendNotificationToCustomer(appointment.user_id, customerMessage);

      const adminMessage = `Admin Reminder: Appointment for ${appointment.pets.pet_name} with customer ID ${appointment.user_id} is in ${days} day(s) on ${appointment.appointment_date} at ${appointment.appointment_time}.`;
      sendNotificationToAdmins(adminMessage);
    });
  }
}

async function sendNotificationToCustomer(
  userId,
  actionType,
  petName,
  appointmentDate,
  appointmentTime
) {
  let message = "";

  switch (actionType) {
    case "accepted":
      message = `Your appointment for ${petName} has been accepted. It's scheduled for ${appointmentDate} at ${appointmentTime}.`;
      break;
    case "cancelled":
      message = `Your appointment for ${petName} has been canceled. Please contact us for rescheduling.`;
      break;
    case "reschedule_accepted":
      message = `Your request to reschedule the appointment for ${petName} has been accepted. New appointment is on ${appointmentDate} at ${appointmentTime}.`;
      break;
    case "reschedule_denied":
      message = `Your request to reschedule the appointment for ${petName} has been denied. Please contact us for further assistance.`;
      break;
    default:
      console.error("Unknown action type");
      return;
  }

  const { error } = await supabase.from("notifications").insert([
    {
      recipient_id: userId,
      message,
      status: "unread",
    },
  ]);

  if (error) {
    console.error(
      `Error sending ${actionType} notification to customer:`,
      error.message
    );
  } else {
    console.log(`${actionType} notification sent to customer ${userId}`);
  }
}

async function sendNotificationToAdmins(message) {
  const { data: admins, error } = await supabase
    .from("users_table")
    .select("id")
    .eq("role", "admin");

  if (error) {
    console.error("Error fetching admins:", error.message);
    return;
  }

  if (!admins || admins.length === 0) {
    console.warn("No admins found.");
    return;
  }

  const notifications = admins.map((admin) => ({
    recipient_id: admin.id,
    message: message,
    status: "unread",
  }));

  const { error: insertError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (insertError) {
    console.error("Error sending notifications to admins:", insertError);
  } else {
    console.log("Notifications sent to admins.");
  }
}

setInterval(sendAppointmentReminders, 24 * 60 * 60 * 1000); // Runs once every day

async function updateNotificationCount() {
  try {
    const count = await NotificationService.getUnreadCount(currentUserId);
    const badge = document.getElementById("notificationCount");
    
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  } catch (error) {
    console.error("Error updating notification count:", error);
  }
}

export async function notifyCustomerOfAppointmentStatus(userId, status, message) {
  const { error } = await supabase.from("notifications").insert([
    {
      recipient_id: userId,
      message,
      status: "unread",
      type: status
    },
  ]);

  if (error) {
    console.error("Customer notification error:", error.message);
  } else {
    console.log("Notification sent to customer", userId);
  }
}

// Load user ID when the module is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const userSession = localStorage.getItem('userSession');
  if (userSession) {
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user.id;
  }
});

// Event Listeners
const notifBtn = document.getElementById("notificationBtn");
const notifModal = document.getElementById("notificationModal");
const closeNotifBtn = document.getElementById("closeNotification");
const closeNotifFooterBtn = document.getElementById("closeNotificationFooter");

notifBtn.addEventListener("click", () => {
  notifModal.classList.remove("hidden");
  loadNotifications();
});

closeNotifBtn.addEventListener("click", () => {
  notifModal.classList.add("hidden");
});

closeNotifFooterBtn.addEventListener("click", () => {
  notifModal.classList.add("hidden");
});

// Close modal when clicking outside
notifModal.addEventListener("click", (e) => {
  if (e.target === notifModal) {
    notifModal.classList.add("hidden");
  }
});

// Initialize notifications
(async function initNotifications() {
  currentUserId = await fetchCurrentUser();
  if (currentUserId) {
    setupRealtimeNotifications();
    await loadNotifications();
    await updateNotificationCount();
  }
})();

// Export the NotificationService for use in other modules
export { NotificationService, NOTIFICATION_TYPES };
