import supabase from "../supabaseClient.js";

let currentUserId = null;
let notificationChannel = null;

function setupRealtimeNotifications() {
  if (!notificationChannel) {
    notificationChannel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${currentUserId}`,
      }, (payload) => {
        console.log('New notification:', payload);
        updateNotificationCount();
        loadNotifications();
      })
      .subscribe();
  }
}

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
    notifItem.dataset.id = notif.id;
    notifItem.dataset.status = notif.status;

    let formattedMessage = notif.message
      .replace(/for\s([^()]+)\s\(/, 'for <strong>$1</strong> (')
      .replace(/on\s([\d-]+)/, 'on <strong>$1</strong>');

    if (notif.message.toLowerCase().includes("new appointment booked")) {
      formattedMessage += ` <a href="#" data-target="booking" class="text-blue-500 underline ml-1 view-link">View</a>`;
    }

    const createdAt = new Date(notif.created_at).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    notifItem.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="text-sm">${formattedMessage}</div>
        <div class="text-xs text-gray-400 pl-2 whitespace-nowrap">${createdAt}</div>
      </div>
    `;

    notifItem.addEventListener('click', async (e) => {
      const viewLink = e.target.closest('.view-link');
      
      if (viewLink) {
        e.preventDefault();
        const targetId = viewLink.dataset.target;
    
        const targetSection = document.getElementById(targetId);
        if (!targetSection) {
          console.warn(`No section found with id: ${targetId}`);
          return;
        }
    
        const currentSections = document.querySelectorAll('.current-page');

        if (currentSections.length === 0) {
          const fallback = document.querySelector('#dashboard'); 
          if (fallback) {
            fallback.classList.add('hidden');
            fallback.classList.remove('current-page');
          }
        } else {
          currentSections.forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('current-page');
          });
        }
    
        targetSection.classList.remove('hidden');
        targetSection.classList.add('current-page');
    
        notifModal.classList.add('hidden');
      }
    
      if (notifItem.dataset.status === 'unread') {
        await markAsRead(notif.id, notifItem);
      }
    });
    
    notifList.appendChild(notifItem);
  });
}

async function sendNotificationToAdmins(message) {
  const { data: admins, error: fetchError } = await supabase
    .from('users_table')
    .select('id')
    .eq('role', 'admin');

  if (fetchError) {
    console.error('Error fetching admins:', fetchError);
    return;
  }

  if (!admins || admins.length === 0) {
    console.warn('No admins found.');
    return;
  }

  const notifications = admins.map(admin => ({
    recipient_id: admin.id,
    message: message,
    status: 'unread'
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error('Error sending notifications to admins:', insertError);
  } else {
    console.log('Notifications sent to all admins.');
  }
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
    setupRealtimeNotifications();
    updateNotificationCount();
  }
})();
