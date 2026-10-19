// frontend/src/api.js

const API_BASE = 'http://127.0.0.1:8000/api';
const ENGINE_BASE = 'http://127.0.0.1:8001';

async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Settings
  getSettings: () => request(`${API_BASE}/settings.php`),
  saveSettings: (settings) => request(`${API_BASE}/settings.php`, {
    method: 'POST',
    body: JSON.stringify(settings)
  }),

  // Attendance
  getDashboardStats: (date) => request(`${API_BASE}/attendance.php?action=dashboard_stats&date=${date || ''}`),
  getDailySummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${API_BASE}/attendance.php?action=summary&${query}`);
  },
  getUserTimeline: (userId, date) => request(`${API_BASE}/attendance.php?action=user_timeline&user_id=${userId}&date=${date || ''}`),
  punch: (payload) => request(`${API_BASE}/attendance.php?action=punch`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  recalculate: (date) => request(`${API_BASE}/attendance.php?action=recalculate&date=${date || ''}`, {
    method: 'POST'
  }),

  // Users
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${API_BASE}/users.php?${query}`);
  },
  getUser: (id) => request(`${API_BASE}/users.php?id=${id}`),
  saveUser: (user) => request(`${API_BASE}/users.php`, {
    method: 'POST',
    body: JSON.stringify(user)
  }),
  deleteUser: (id) => request(`${API_BASE}/users.php?id=${id}`, {
    method: 'DELETE'
  }),
  uploadUserPhoto: (payload) => request(`${API_BASE}/users.php?action=upload_photo`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Cameras & Pairs
  getCameras: () => request(`${API_BASE}/cameras.php`),
  saveCamera: (camera) => request(`${API_BASE}/cameras.php`, {
    method: 'POST',
    body: JSON.stringify(camera)
  }),
  testPing: (ip, port, cameraId) => request(`${API_BASE}/cameras.php?action=test_ping`, {
    method: 'POST',
    body: JSON.stringify({ ip_address: ip, port: port || 554, camera_id: cameraId })
  }),
  getCameraPairs: () => request(`${API_BASE}/cameras.php?action=pairs`),
  saveCameraPair: (pair) => request(`${API_BASE}/cameras.php?action=save_pair`, {
    method: 'POST',
    body: JSON.stringify(pair)
  }),
  deleteCameraOrPair: (id, type = 'camera') => request(`${API_BASE}/cameras.php?id=${id}&type=${type}`, {
    method: 'DELETE'
  }),

  // Shifts
  getShifts: () => request(`${API_BASE}/shifts.php`),
  saveShift: (shift) => request(`${API_BASE}/shifts.php`, {
    method: 'POST',
    body: JSON.stringify(shift)
  }),
  deleteShift: (id) => request(`${API_BASE}/shifts.php?id=${id}`, {
    method: 'DELETE'
  }),

  // HR Sync
  getHrStatus: () => request(`${API_BASE}/hr_sync.php?action=status`),
  importHrEmployees: () => request(`${API_BASE}/hr_sync.php?action=import_employees`, { method: 'POST' }),
  exportHrAttendance: (date) => request(`${API_BASE}/hr_sync.php?action=export_attendance&date=${date || ''}`, { method: 'POST' }),
  getHrHistory: () => request(`${API_BASE}/hr_sync.php?action=history`),

  // Reports
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${API_BASE}/reports.php?${query}`);
  },

  // Version 2.0: Blacklist & Security Management
  getBlacklist: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${API_BASE}/blacklist.php?${query}`);
  },
  getBlacklistBreaches: (status = 'all') => {
    return request(`${API_BASE}/blacklist.php?breaches=1&status=${status}`);
  },
  saveBlacklistedPerson: (person) => {
    if (person.id) {
      return request(`${API_BASE}/blacklist.php?id=${person.id}`, {
        method: 'PUT',
        body: JSON.stringify(person)
      });
    }
    return request(`${API_BASE}/blacklist.php`, {
      method: 'POST',
      body: JSON.stringify(person)
    });
  },
  deleteBlacklistedPerson: (id) => request(`${API_BASE}/blacklist.php?id=${id}`, {
    method: 'DELETE'
  }),
  resolveBreach: (breachId, resolvedBy, resolvedNotes) => request(`${API_BASE}/blacklist.php?action=resolve`, {
    method: 'POST',
    body: JSON.stringify({ breach_id: breachId, resolved_by: resolvedBy, resolved_notes: resolvedNotes })
  }),

  // Version 2.0: Guests & Customer Movement Tracking
  getGuests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${API_BASE}/guests.php?${query}`);
  },
  getGuestTimeline: (id) => request(`${API_BASE}/guests.php?id=${id}&logs=1`),
  saveGuest: (id, guest) => request(`${API_BASE}/guests.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(guest)
  }),
  deleteGuest: (id) => request(`${API_BASE}/guests.php?id=${id}`, {
    method: 'DELETE'
  }),

  // Version 2.0: Real-Time Security Alert Stream
  pollSecurityAlerts: (lastId = 0) => request(`${API_BASE}/security_alerts.php?last_id=${lastId}`),

  // Offline Face AI Engine Bridge
  extractFaceEmbedding: async (base64Image) => {
    return request(`${ENGINE_BASE}/extract_embedding`, {
      method: 'POST',
      body: JSON.stringify({ image: base64Image })
    });
  },
  getEngineStatus: () => request(`${ENGINE_BASE}/status`)
};
