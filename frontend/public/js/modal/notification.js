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
 * Listen for real-time notifications for the specific user.
 * @param {string} userId - The Supabase authenticated user's ID.
 */
async function listenForUserNotifications(userId) {
  supabase
    .channel('notification-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Customer notification:', payload.new);
        addNotificationToList(payload.new);
        updateNotificationBadge();
      }
    )
    .subscribe();
}

/**
 * Listen for real-time notifications for admin users (ALL notifications).
 */
async function listenForAdminNotifications() {
  supabase
    .channel('notification-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        console.log('Admin notification:', payload.new);
        addNotificationToList(payload.new);
        updateNotificationBadge();
      }
    )
    .subscribe();
}

/**
 * Adds a new notification item to the list inside the modal.
 * @param {Object} notification - The notification object from Supabase.
 */
function addNotificationToList(notification) {
  if (!notificationList) {
    console.warn("Notification list element not found.");
    return;
  }

  const li = document.createElement("li");

  // ✨ Add different styles for read/unread notifications
  li.className = `p-3 border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`;

  li.innerHTML = `
    <div class="flex justify-between items-center">
      <p class="text-sm text-gray-800">${notification.message}</p>
      <span class="text-xs text-gray-500">${new Date(notification.created_at).toLocaleString()}</span>
    </div>
  `;

  // ✨ Click to mark as read (if unread)
  li.addEventListener("click", async () => {
    if (!notification.is_read) {
      await markSingleNotificationAsRead(notification.id, li);
    }
  });

  notificationList.prepend(li);
}

/**
 * Marks a single notification as read and updates its UI.
 * @param {number} notificationId - The notification ID.
 * @param {HTMLElement} listItem - The clicked list item element.
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

  // ✨ Change style to show it's read
  listItem.classList.remove('bg-blue-50');
  listItem.classList.add('bg-white');

  // ✨ Decrease the badge count by 1 (if > 0)
  let currentCount = parseInt(notificationCount.textContent) || 0;
  if (currentCount > 1) {
    notificationCount.textContent = currentCount - 1;
  } else {
    clearNotificationBadge();
  }
}

/**
 * Updates the notification badge counter by incrementing it.
 */
function updateNotificationBadge() {
  if (!notificationCount) return;

  let currentCount = parseInt(notificationCount.textContent) || 0;
  notificationCount.textContent = currentCount + 1;

  notificationCount.classList.remove("hidden");
}

/**
 * Clears the notification badge counter.
 */
function clearNotificationBadge() {
  if (!notificationCount) return;

  notificationCount.textContent = "";
  notificationCount.classList.add("hidden");
}

/**
 * Checks for unread notifications and updates the badge.
 * @param {string} userId
 */
async function checkUnreadNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
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
 * Loads all past notifications for the current user or admin.
 * @param {string} userId
 * @param {string} role
 */
async function loadNotificationHistory(userId, role) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: true })
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

  if (data.length === 0) {
    notificationList.innerHTML = `<li class="p-3 text-gray-500">No notifications found.</li>`;
    return;
  }

  data.forEach(notification => {
    addNotificationToList(notification);
  });
}

// Event: Open Modal
notificationBtn?.addEventListener("click", async () => {
  notificationModal?.classList.remove("hidden");
  notificationModal?.classList.add("flex");

  if (window.currentUserId && window.currentUserRole) {
    await loadNotificationHistory(window.currentUserId, window.currentUserRole);

    // ✨ Mark all as read after loading and opening
    await markAllNotificationsAsRead(window.currentUserId);

    // ✨ Clear the badge count since they are now read
    clearNotificationBadge();
  }
});

// Close modals
closeNotification?.addEventListener("click", () => {
  notificationModal?.classList.add("hidden");
  notificationModal?.classList.remove("flex");
});
closeNotificationFooter?.addEventListener("click", () => {
  notificationModal?.classList.add("hidden");
  notificationModal?.classList.remove("flex");
});

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
 * Initializes the notification listener based on user role.
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
      console.warn("No user data found in users_table.");
      return;
    }

    const userRole = userData.role;

    window.currentUserId = user.id;
    window.currentUserRole = userRole;

    if (userRole === 'admin') {
      console.log('Admin detected. Listening for ALL notifications...');
      listenForAdminNotifications();

      await checkUnreadNotifications(user.id);
    } else if (userRole === 'customer') {
      console.log('Customer detected. Listening for personal notifications...');
      listenForUserNotifications(user.id);

      await checkUnreadNotifications(user.id);
    } else {
      console.warn(`Unknown role detected: ${userRole}`);
    }

  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initNotificationListener();
});
