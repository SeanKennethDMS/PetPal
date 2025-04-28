import supabase from "../supabaseClient.js";

let currentUserId = null;

async function fetchCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching user:', error.message);
    return null;
  }
  if (!user) {
    console.error('No user logged in.');
    return null;
  }
  return user.id;
}

async function loadNotifications() {
  if (!currentUserId) return;

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', currentUserId)
    .order('created_at', { ascending: false });

  const notifList = document.getElementById('notificationList');
  notifList.innerHTML = '';

  if (error) {
    console.error('Error fetching notifications:', error.message);
    notifList.innerHTML = `<div class="text-center text-gray-500">Error loading notifications</div>`;
    return;
  }

  if (!notifications.length) {
    notifList.innerHTML = `<div class="text-center text-gray-500">No notifications yet</div>`;
    return;
  }

  notifications.forEach(notif => {
    const notifItem = document.createElement('div');
    notifItem.className = `notification-item p-2 rounded cursor-pointer ${
      notif.status === 'unread' ? 'bg-blue-100' : 'bg-white'
    } hover:bg-gray-100`;
    notifItem.textContent = notif.message;
    notifItem.dataset.id = notif.id;
    notifItem.dataset.status = notif.status;

    notifItem.addEventListener('click', async () => {
      if (notifItem.dataset.status === 'unread') {
        await markAsRead(notif.id, notifItem);
      }
    });

    notifList.appendChild(notifItem);
  });
}

async function updateNotificationCount() {
  if (!currentUserId) return;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', currentUserId)
    .eq('status', 'unread');

  const badge = document.getElementById('notificationCount');

  if (error) {
    console.error('Error fetching notification count:', error);
    badge.classList.add('hidden');
    return;
  }

  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function markAsRead(notificationId, notifItem) {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read' })
    .eq('id', notificationId);

  if (error) {
    console.error('Error updating notification status:', error);
    return;
  }

  notifItem.classList.remove('bg-blue-100');
  notifItem.classList.add('bg-white');
  notifItem.dataset.status = 'read';

  updateNotificationCount();
}

const notifBtn = document.getElementById('notificationBtn');
const notifModal = document.getElementById('notificationModal');

notifBtn.addEventListener('click', () => {
  notifModal.classList.remove('hidden');
  loadNotifications();
});

document.getElementById('closeNotification').addEventListener('click', () => {
  notifModal.classList.add('hidden');
});

document.getElementById('closeNotificationFooter').addEventListener('click', () => {
  notifModal.classList.add('hidden');
});

(async function initNotifications() {
  currentUserId = await fetchCurrentUser();
  if (currentUserId) {
    updateNotificationCount();
  }
})();
