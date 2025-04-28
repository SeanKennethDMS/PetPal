"use strict";

import supabase from "../supabaseClient.js";

// Elements
const notificationBtn = document.getElementById("notificationBtn");
const notificationModal = document.getElementById("notificationModal");
const closeNotification = document.getElementById("closeNotification");
const closeNotificationFooter = document.getElementById(
  "closeNotificationFooter"
);
const notificationList = document.getElementById("notificationList");
const notificationCount = document.getElementById("notificationCount");

// Go to specific section
function goToSection(targetId) {
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const contentSections = document.querySelectorAll(".content-section");

  contentSections.forEach((section) => section.classList.add("hidden"));
  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.remove("hidden");
  }

  sidebarLinks.forEach((link) => {
    link.classList.remove("font-bold", "bg-gray-700");
    if (link.dataset.target === targetId) {
      link.classList.add("font-bold", "bg-gray-700");
    }
  });
}

// Listen for real-time notifications for the user
function listenForUserNotifications(userId) {
  const channel = supabase
    .channel("user-notification-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        console.log("Notification received:", payload.new);
        addNotificationToList(payload.new);
        updateNotificationBadge();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Listening for notifications...");
      }
    });
}

// Add notification to list
function addNotificationToList(notification) {
  if (!notificationList) return;

  const li = document.createElement("li");
  li.className = `p-3 border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer ${
    notification.status === "unread" ? "bg-blue-50" : "bg-white"
  }`;

  let message = notification.message || "You have a new notification.";

  li.innerHTML = `
    <div class="flex flex-col">
      <div class="flex justify-between items-center">
        <p class="text-sm text-gray-800">${message}</p>
        <span class="text-xs text-gray-500">${new Date(
          notification.created_at
        ).toLocaleString()}</span>
      </div>
      ${
        notification.appointment_id
          ? `
      <div class="mt-2 text-right">
        <button class="text-blue-600 text-xs hover:underline section-link" data-target="booking" data-appointment-id="${notification.appointment_id}">
          View Appointment
        </button>
      </div>`
          : ""
      }
    </div>
  `;

  li.addEventListener("click", async (event) => {
    if (event.target.classList.contains("section-link")) return;
    if (notification.status === "unread") {
      await markSingleNotificationAsRead(notification.id, li);
    }
  });

  notificationList.prepend(li);

  const goToBookingBtn = li.querySelector(".section-link");

  if (goToBookingBtn) {
    goToBookingBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      goToSection("booking");
      notificationModal?.classList.add("hidden");
      notificationModal?.classList.remove("flex");
    });
  }
}

// Send notification
async function sendNotification({
  recipientId,
  senderId = null,
  message = "",
  type = "general",
  actionType = "",
  appointmentId = null,
  data = {},
}) {
  if (!recipientId) {
    console.error("Recipient ID is required.");
    return;
  }

  if (!message && actionType) {
    switch (actionType) {
      case "pending":
        message = "A new appointment request has been submitted!";
        break;
      case "approved":
        message = "Your appointment has been approved!";
        break;
      case "canceled":
        message = "Your appointment has been canceled.";
        break;
      case "completed":
        message = "Your appointment has been completed.";
        break;
      case "low_stock":
        message = "Stock level is low for some products.";
        break;
      case "pet_updated":
        message = "Your pet profile has been updated.";
        break;
      default:
        message = "You have a new notification.";
    }
  }

  const { error } = await supabase.from("notifications").insert([
    {
      recipient_id: recipientId,
      sender_id: senderId,
      message: message,
      type: type,
      action_type: actionType,
      appointment_id: appointmentId,
      data: data,
      status: "unread",
    },
  ]);

  if (error) {
    console.error("Error sending notification:", error);
  } else {
    console.log("Notification sent successfully.");
  }
}

// Mark a single notification as read
async function markSingleNotificationAsRead(notificationId, listItem) {
  const { error } = await supabase
    .from("notifications")
    .update({ status: "read" })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking as read:", error);
    return;
  }

  listItem.classList.remove("bg-blue-50");
  listItem.classList.add("bg-white");

  let currentCount = parseInt(notificationCount.textContent) || 0;
  if (currentCount > 1) {
    notificationCount.textContent = currentCount - 1;
  } else {
    clearNotificationBadge();
  }
}

// Update badge
function updateNotificationBadge() {
  if (!notificationCount) return;

  let currentCount = parseInt(notificationCount.textContent) || 0;
  notificationCount.textContent = currentCount + 1;
  notificationCount.classList.remove("hidden");
}

// Clear badge
function clearNotificationBadge() {
  if (!notificationCount) return;

  notificationCount.textContent = "";
  notificationCount.classList.add("hidden");
}

// Check unread notifications on load
async function checkUnreadNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_id", userId)
    .eq("status", "unread");

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

// Load notification history
async function loadNotificationHistory(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error loading history:", error);
    return;
  }

  notificationList.innerHTML = "";

  if (!data.length) {
    notificationList.innerHTML = `<li class="p-3 text-gray-500">No notifications found.</li>`;
    return;
  }

  data.forEach((notification) => addNotificationToList(notification));
}

// Mark all notifications as read
async function markAllNotificationsAsRead(userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ status: "read" })
    .eq("recipient_id", userId)
    .eq("status", "unread");

  if (error) {
    console.error("Error marking all as read:", error);
  }
}

// Initialize notifications
async function initNotificationListener() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Error fetching user:", error?.message || "No user found.");
    return;
  }

  window.currentUserId = user.id;

  listenForUserNotifications(user.id);
  await checkUnreadNotifications(user.id);
}

// Open Notification Modal
notificationBtn?.addEventListener("click", async () => {
  notificationModal?.classList.remove("hidden");
  notificationModal?.classList.add("flex");

  if (window.currentUserId) {
    await loadNotificationHistory(window.currentUserId);
    await markAllNotificationsAsRead(window.currentUserId);
    clearNotificationBadge();
  }
});

// Close Notification Modal
[closeNotification, closeNotificationFooter].forEach((btn) => {
  btn?.addEventListener("click", () => {
    notificationModal?.classList.add("hidden");
    notificationModal?.classList.remove("flex");
  });
});

// Run init on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initNotificationListener();
});

// Export sendNotification
export { sendNotification };
