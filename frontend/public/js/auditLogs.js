import supabase from './supabaseClient.js';

let currentPage = 1;
const logsPerPage = 10;

let filterState = {
  actionType: '',
  startDate: '',
  endDate: '',
  searchQuery: '',
};

async function fetchAuditLogs() {
  const actionType = document.getElementById('actionTypeFilter')?.value;

  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      user_id,
      role,
      action,
      target,
      details,
      timestamp,
      users_table(first_name, last_name)
    `)
    .order('timestamp', { ascending: false })
    .range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1);

  if (actionType) query = query.eq('action', actionType);
  if (filterState.startDate && filterState.endDate) {
    query = query
      .gte('timestamp', filterState.startDate)
      .lte('timestamp', filterState.endDate);
  }
  if (filterState.searchQuery) {
    query = query.ilike('details', `%${filterState.searchQuery}%`);
  }

  const { data, error } = await query;

  const tableBody = document.getElementById('auditLogBody');
  const placeholderRow = document.getElementById('placeholderRow');
  tableBody.innerHTML = '';

  if (error) {
    console.error('Error fetching audit logs:', error.message);
    if (placeholderRow) placeholderRow.style.display = 'table-row';
    return;
  }

  if (!data || data.length === 0) {
    if (placeholderRow) placeholderRow.style.display = 'table-row';
    return;
  }

  if (placeholderRow) placeholderRow.style.display = 'none';

  data.forEach((log) => {
    const row = document.createElement('tr');
    row.setAttribute('id', `log-${log.id}`);

    let parsedDetails;
    try {
      parsedDetails = JSON.parse(log.details);
    } catch (e) {
      parsedDetails = log.details || 'No details';
    }

    row.innerHTML = `
      <td class="p-2 border-b">${new Date(log.timestamp).toLocaleString()}</td>
      <td class="p-2 border-b">
        ${log.users_table?.last_name || 'N/A'}, ${log.users_table?.first_name || ''} (${log.role})
      </td>
      <td class="p-2 border-b">${log.action}</td>
      <td class="p-2 border-b">${log.target || '—'}</td>
      <td class="p-2 border-b">
        <button class="text-blue-600 hover:underline" onclick='showChangesModal(\`${JSON.stringify(parsedDetails).replace(/`/g, "\\`")}\`)'>View Details</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function showChangesModal(detailsJson) {
  const contentDiv = document.getElementById('changesContent');
  let parsed;
  try {
    parsed = JSON.parse(detailsJson);
  } catch (e) {
    parsed = detailsJson;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const htmlList = Object.entries(parsed)
      .map(([key, val]) => `<tr><td class="border px-4 py-2 font-medium">${key}</td><td class="border px-4 py-2">${val}</td></tr>`)
      .join('');
    contentDiv.innerHTML = `<table class="min-w-full border text-sm">${htmlList}</table>`;
  } else {
    contentDiv.innerHTML = `<p>${parsed}</p>`;
  }

  document.getElementById('changesModal').classList.remove('hidden');
}

function closeChangesModal() {
  document.getElementById('changesModal').classList.add('hidden');
}

window.showChangesModal = showChangesModal;
window.closeChangesModal = closeChangesModal;

async function populateActionTypeFilter() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('action')
    .neq('action', null);

  if (error) {
    console.error('Error fetching action types:', error.message);
    return;
  }

  const uniqueActions = [...new Set(data.map(item => item.action))].sort();
  const actionDropdown = document.getElementById('actionTypeFilter');

  actionDropdown.innerHTML = `<option value="">All Actions</option>`;
  uniqueActions.forEach(action => {
    const option = document.createElement('option');
    option.value = action;
    option.textContent = action.replace(/_/g, ' ');
    actionDropdown.appendChild(option);
  });
}

function updateFilters() {
  filterState.actionType = document.getElementById('actionTypeFilter')?.value || '';
  filterState.startDate = document.getElementById('startDate')?.value || '';
  filterState.endDate = document.getElementById('endDate')?.value || '';
  filterState.searchQuery = document.getElementById('searchQuery')?.value || '';
  currentPage = 1;
  fetchAuditLogs();
}

window.changePage = function (direction) {
  if (direction === 'prev' && currentPage > 1) {
    currentPage--;
  } else if (direction === 'next') {
    currentPage++;
  }
  fetchAuditLogs();
};

document.addEventListener('DOMContentLoaded', () => {
  populateActionTypeFilter();
  fetchAuditLogs();

  document.getElementById('actionTypeFilter')?.addEventListener('change', updateFilters);
  document.getElementById('filterButton')?.addEventListener('click', updateFilters);
});
