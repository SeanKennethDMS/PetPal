'use strict';

import supabase from "../supabaseClient.js";

// Elements
const notificationBtn = document.getElementById("notificationBtn");
const notificationModal = document.getElementById("notificationModal");
const closeNotification = document.getElementById("closeNotification");
const closeNotificationFooter = document.getElementById("closeNotificationFooter");
const notificationList = document.getElementById("notificationList");
const notificationCount = document.getElementById("notificationCount");

/**
 * Navigates to the specified section by its ID.
 * @param {string} targetId
 */
function goToSection(targetId) {
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const contentSections = document.querySelectorAll(".content-section");

  contentSections.forEach(section => section.classList.add("hidden"));

  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.remove("hidden");
  }

  sidebarLinks.forEach(link => {
    link.classList.remove("font-bold", "bg-gray-700");
    if (link.dataset.target === targetId) {
      link.classList.add("font-bold", "bg-gray-700");
    }
  });
}

/**
 * Listen for real-time notifications for the specific user.
 * @param {string} userId
 */
function listenForUserNotifications(userId) {
  const channel = supabase
    .channel('user-notification-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      payload => {
        console.log('Customer notification received:', payload.new);
        addNotificationToList(payload.new);
        updateNotificationBadge();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Listening for user notifications...');
      }
    });
}

/**
 * Listen for real-time notifications for admin users.
 */
function listenForAdminNotifications() {
  const channel = supabase
    .channel('admin-notification-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      payload => {
        console.log('Admin notification received:', payload.new);
        addNotificationToList(payload.new);
        updateNotificationBadge();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Listening for admin notifications...');
      }
    });
}

/**
 * Adds a new notification item to the list inside the modal.
 * @param {Object} notification
 */
function addNotificationToList(notification) {
  if (!notificationList) {
    console.warn("Notification list element not found.");
    return;
  }

  const li = document.createElement("li");
  li.className = `p-3 border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`;

  let message = notification.message;

  if (!message && notification.action_type) {
    switch (notification.action_type) {
      case "approved":
        message = "Your appointment has been approved!";
        break;
      case "canceled":
        message = "Your appointment has been canceled.";
        break;
      case "completed":
        message = "Your appointment has been completed.";
        break;
      case "pending":
        message = "You have a new pending appointment.";
        break;
      default:
        message = "You have a new notification.";
    }
  }

  li.innerHTML = `
    <div class="flex flex-col">
      <div class="flex justify-between items-center">
        <p class="text-sm text-gray-800">${message}</p>
        <span class="text-xs text-gray-500">${new Date(notification.created_at).toLocaleString()}</span>
      </div>
      <div class="mt-2 text-right">
        <button class="text-blue-600 text-xs hover:underline section-link" data-target="booking" data-appointment-id="${notification.appointment_id}">
          View Appointment
        </button>
      </div>
    </div>
  `;

  li.addEventListener("click", async (event) => {
    if (event.target.classList.contains('section-link')) return;
    if (!notification.is_read) {
      await markSingleNotificationAsRead(notification.id, li);
    }
  });

  notificationList.prepend(li);

  const goToBookingBtn = li.querySelector(".section-link");

  if (goToBookingBtn) {
    goToBookingBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      goToSection("booking");

      const appointmentId = goToBookingBtn.getAttribute('data-appointment-id');
      console.log(`Navigate to appointment ID: ${appointmentId}`);

      notificationModal?.classList.add("hidden");
      notificationModal?.classList.remove("flex");
    });
  }
}

/**
 * Sends a new notification.
 */
async function sendNotification({
  userId,
  message,
  actionType = '',
  appointmentId = null
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      message: message,
      action_type: actionType,
      appointment_id: appointmentId,
      is_read: false
    }]);

  if (error) {
    console.error('Error sending notification:', error);
  } else {
    console.log('Notification sent:', data);
  }
}

/**
 * Marks a single notification as read.
 * @param {number} notificationId
 * @param {HTMLElement} listItem
 */
async function markSingleNotificationAsRead(notificationId, listItem) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    return;
  }

  console.log(`Notification ${notificationId} marked as read.`);

  listItem.classList.remove('bg-blue-50');
  listItem.classList.add('bg-white');

  let currentCount = parseInt(notificationCount.textContent) || 0;
  if (currentCount > 1) {
    notificationCount.textContent = currentCount - 1;
  } else {
    clearNotificationBadge();
  }
}

/**
 * Increments the notification badge.
 */
function updateNotificationBadge() {
  if (!notificationCount) return;

  let currentCount = parseInt(notificationCount.textContent) || 0;
  notificationCount.textContent = currentCount + 1;
  notificationCount.classList.remove("hidden");
}

/**
 * Clears the notification badge.
 */
function clearNotificationBadge() {
  if (!notificationCount) return;

  notificationCount.textContent = "";
  notificationCount.classList.add("hidden");
}

/**
 * Checks for unread notifications on load.
 * @param {string} userId
 */
async function checkUnreadNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error("Error fetching unread notifications:", error);
    return;
  }

  if (data.length > 0) {
    notificationCount.textContent = data.length;
    notificationCount.classList.remove("hidden");
  } else {
    clearNotificationBadge();
  }
}

/**
 * Loads notification history.
 * @param {string} userId
 * @param {string} role
 */
async function loadNotificationHistory(userId, role) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (role === 'customer') {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notification history:", error);
    return;
  }

  notificationList.innerHTML = '';

  if (!data.length) {
    notificationList.innerHTML = `<li class="p-3 text-gray-500">No notifications found.</li>`;
    return;
  }

  data.forEach(notification => addNotificationToList(notification));
}

/**
 * Marks all unread notifications as read.
 * @param {string} userId
 */
async function markAllNotificationsAsRead(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error("Error marking notifications as read:", error);
    return;
  }

  console.log(`Marked ${data?.length || 0} notifications as read.`);
}

/**
 * Initializes the notification listeners.
 */
async function initNotificationListener() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error fetching user:", error.message);
    return;
  }

  if (!user) {
    console.warn("No authenticated user found.");
    return;
  }

  try {
    const { data: userData, error: roleError } = await supabase
      .from('users_table')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError) {
      console.error("Error fetching user role:", roleError.message);
      return;
    }

    if (!userData) {
      console.warn("No user data found.");
      return;
    }

    const userRole = userData.role;

    window.currentUserId = user.id;
    window.currentUserRole = userRole;

    if (userRole === 'admin') {
      console.log('Admin detected. Listening for ALL notifications...');
      listenForAdminNotifications();
    } else if (userRole === 'customer') {
      console.log('Customer detected. Listening for personal notifications...');
      listenForUserNotifications(user.id);
    } else {
      console.warn(`Unknown role detected: ${userRole}`);
    }

    await checkUnreadNotifications(user.id);
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

// Open Modal
notificationBtn?.addEventListener("click", async () => {
  notificationModal?.classList.remove("hidden");
  notificationModal?.classList.add("flex");

  if (window.currentUserId && window.currentUserRole) {
    await loadNotificationHistory(window.currentUserId, window.currentUserRole);
    await markAllNotificationsAsRead(window.currentUserId);
    clearNotificationBadge();
  }
});

// Close Modal Buttons
[closeNotification, closeNotificationFooter].forEach(btn => {
  btn?.addEventListener("click", () => {
    notificationModal?.classList.add("hidden");
    notificationModal?.classList.remove("flex");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  initNotificationListener();
});

export { sendNotification };
