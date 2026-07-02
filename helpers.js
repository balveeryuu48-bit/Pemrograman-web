// Helpers for SiPinjam UPT

// Robust token & user storage helper with error guards and cookie fallback
const StorageHelper = {
  get: function(key) {
    try {
      const val = localStorage.getItem(key);
      if (val) return val;
    } catch (e) {
      console.warn("StorageHelper: localStorage read blocked", e);
    }
    // Fallback: Read from document.cookie
    const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (match) return match[2];
    
    // Fallback 2: Window memory
    return window[`__mem_${key}`] || null;
  },
  set: function(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("StorageHelper: localStorage write blocked", e);
    }
    // Write cookie fallback (with SameSite=None; Secure for iframe compatibility)
    document.cookie = `${key}=${value}; path=/; max-age=86400; SameSite=None; Secure`;
    
    // Window memory fallback
    window[`__mem_${key}`] = value;
  },
  remove: function(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("StorageHelper: localStorage remove blocked", e);
    }
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
    delete window[`__mem_${key}`];
  }
};

// Intercept all fetch requests to automatically send the session token from StorageHelper in an X-Session-Token header.
// This works around modern browser privacy policies that block third-party cookies inside iframes.
(function() {
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    options = options || {};
    options.headers = options.headers || {};
    const token = StorageHelper.get("sessionToken");
    console.log(`[Interceptor] Fetching URL: ${url} | Token: ${token}`);
    if (token) {
      // 1. Add as headers
      if (options.headers instanceof Headers) {
        options.headers.set("X-Session-Token", token);
        options.headers.set("x-session-token", token);
      } else if (Array.isArray(options.headers)) {
        options.headers.push(["X-Session-Token", token]);
        options.headers.push(["x-session-token", token]);
      } else {
        options.headers["X-Session-Token"] = token;
        options.headers["x-session-token"] = token;
      }
      console.log(`[Interceptor] Added X-Session-Token header for ${url}`);
      
      // 2. Add as URL query parameter for absolute reliability in iframes
      if (typeof url === "string" && (url.includes("/api/") || url.includes("api/"))) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}token=${token}`;
        console.log(`[Interceptor] Appended token query param. New URL: ${url}`);
      }
    }
    return originalFetch(url, options);
  };
})();


// Format Date to Indonesian format: e.g. "22 Mei 2026"
function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const tgl = date.getDate();
  const bln = bulan[date.getMonth()];
  const thn = date.getFullYear();
  
  return `${tgl} ${bln} ${thn}`;
}

// Calculate days remaining or late (returns positive/negative number)
function hariTersisa(targetDateStr) {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr);
  target.setHours(0,0,0,0);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Label for days remaining or late: e.g., "2 hari lagi" / "1 hari terlambat"
function labelHariTersisa(targetDateStr) {
  const diff = hariTersisa(targetDateStr);
  if (diff > 0) {
    return `${diff} hari lagi`;
  } else if (diff === 0) {
    return `Hari ini batas kembali`;
  } else {
    return `${Math.abs(diff)} hari terlambat`;
  }
}

// Generate HTML badge for loan status
function badgeStatus(status) {
  const s = (status || "").toLowerCase();
  let label = status || "Pending";
  let badgeClass = "badge-pending";
  
  switch(s) {
    case "pending":
      badgeClass = "badge-pending";
      label = "Menunggu";
      break;
    case "approved":
      badgeClass = "badge-approved";
      label = "Disetujui";
      break;
    case "rejected":
      badgeClass = "badge-rejected";
      label = "Ditolak";
      break;
    case "borrowed":
      badgeClass = "badge-borrowed";
      label = "Dipinjam";
      break;
    case "returned":
      badgeClass = "badge-returned";
      label = "Dikembalikan";
      break;
    case "late":
      badgeClass = "badge-late";
      label = "Terlambat";
      break;
  }
  
  return `<span class="badge ${badgeClass}">${label}</span>`;
}

// Generate HTML badge for borrower type
function badgeTipe(tipe) {
  const t = (tipe || "").toLowerCase();
  if (t === "organisasi") {
    return `<span class="badge badge-organisasi">Organisasi</span>`;
  }
  return `<span class="badge badge-individu">Individu</span>`;
}

// Toast notification container and logic
function showToast(msg, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = "ti-circle-check";
  if (type === "danger") icon = "ti-circle-x";
  if (type === "warning") icon = "ti-alert-circle";
  if (type === "info") icon = "ti-info-circle";
  
  toast.innerHTML = `
    <i class="ti ${icon}"></i>
    <span>${msg}</span>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  
  // Auto remove after 3s
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 3000);
}

// Modals management
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("open");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("open");
  }
}

// Get standard base path dynamically
function getApiPrefix() {
  const isSubfolder = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
  return isSubfolder ? '../' : '';
}

// Session check guards
async function requireAdmin() {
  const prefix = getApiPrefix();
  try {
    const res = await fetch(`${prefix}api/auth/check.php`);
    const data = await res.json();
    if (!data.loggedIn || !data.user || (data.user.role !== 'admin' && data.user.role !== 'super_admin')) {
      StorageHelper.remove("user_session");
      StorageHelper.remove("sessionToken");
      window.location.href = `${prefix}login.html`;
      return { id: 1, nama: "Admin", role: "admin" };
    }
    return data.user;
  } catch (err) {
    console.error("Auth check failed:", err);
    const localUser = getUser();
    if (localUser && (localUser.role === 'admin' || localUser.role === 'super_admin')) {
      return localUser;
    }
    window.location.href = `${prefix}login.html`;
    return { id: 1, nama: "Admin", role: "admin" };
  }
}

async function requireLogin() {
  const prefix = getApiPrefix();
  try {
    const res = await fetch(`${prefix}api/auth/check.php`);
    const data = await res.json();
    if (!data.loggedIn || !data.user) {
      StorageHelper.remove("user_session");
      StorageHelper.remove("sessionToken");
      window.location.href = `${prefix}login.html`;
      return { id: 1, nama: "User", role: "peminjam" };
    }
    return data.user;
  } catch (err) {
    console.error("Auth check failed:", err);
    const localUser = getUser();
    if (localUser) {
      return localUser;
    }
    window.location.href = `${prefix}login.html`;
    return { id: 1, nama: "User", role: "peminjam" };
  }
}

// Store / Retrieve dummy StorageHelper user for legacy reference
function setUser(data) {
  StorageHelper.set("user_session", JSON.stringify(data));
}

function getUser() {
  const data = StorageHelper.get("user_session");
  return data ? JSON.parse(data) : null;
}

// Form validation helper
function validateForm(formElement) {
  if (!formElement) return true;
  let isValid = true;
  const requiredFields = formElement.querySelectorAll("[required]");
  
  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.style.borderColor = "#ef4444";
      isValid = false;
    } else {
      field.style.borderColor = "";
    }
  });
  
  if (!isValid) {
    showToast("Harap isi semua field wajib!", "danger");
  }
  return isValid;
}

// Live table filter helper
function filterTable(tableSelector, query) {
  const table = document.querySelector(tableSelector);
  if (!table) return;
  
  const rows = table.querySelectorAll("tbody tr");
  const q = query.toLowerCase().trim();
  
  rows.forEach(row => {
    // skip empty states
    if (row.classList.contains("empty-row")) return;
    
    const text = row.textContent.toLowerCase();
    if (text.includes(q)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Export CSV helper
function exportCSV(rows, filename = "data_export.csv") {
  if (!rows || !rows.length) return;
  
  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(",")];
  
  for (const row of rows) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }
  
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Sidebar markup generator to avoid repeating HTML in every page
function renderSidebar(activePage) {
  const user = getUser() || { nama: "User", role: "peminjam" };
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const prefix = getApiPrefix();
  
  const menuItems = isAdmin ? [
    { id: "dashboard", label: "Dashboard", url: "dashboard.html", icon: "ti-layout-dashboard" },
    { id: "approval", label: "Approval", url: "approval.html", icon: "ti-checkbox" },
    { id: "barang", label: "Kelola Barang", url: "barang.html", icon: "ti-box" },
    { id: "pengembalian", label: "Pengembalian", url: "pengembalian.html", icon: "ti-arrow-back-up" },
    { id: "laporan", label: "Laporan", url: "laporan.html", icon: "ti-file-report" },
    { id: "profile", label: "Profil Saya", url: "profile.html", icon: "ti-user" }
  ] : [
    { id: "dashboard", label: "Beranda", url: "dashboard.html", icon: "ti-home" },
    { id: "katalog", label: "Katalog Alat", url: "katalog.html", icon: "ti-search" },
    { id: "form-pinjam", label: "Form Pinjam", url: "form-pinjam.html", icon: "ti-edit" },
    { id: "riwayat", label: "Riwayat Pinjam", url: "riwayat.html", icon: "ti-history" },
    { id: "profile", label: "Profil Saya", url: "profile.html", icon: "ti-user" },
    { id: "kontak", label: "Kontak UPT", url: "kontak.html", icon: "ti-headset" },
    { id: "aturan", label: "Aturan Pinjam", url: "aturan.html", icon: "ti-shield-alert" }
  ];

  if (user.role === "super_admin") {
    menuItems.push({ id: "kelola-admin", label: "Kelola Admin", url: "kelola-admin.html", icon: "ti-users" });
  } else if (user.role === "admin") {
    menuItems.push({ id: "kelola-peminjam", label: "Kelola Peminjam", url: "kelola-peminjam.html", icon: "ti-users-group" });
  }

  const listItemsHtml = menuItems.map(item => `
    <li class="sidebar-item ${activePage === item.id ? 'active' : ''}">
      <a href="${prefix}${isAdmin ? 'admin' : 'user'}/${item.url}">
        <i class="ti ${item.icon}"></i>
        <span>${item.label}</span>
      </a>
    </li>
  `).join("");

  const sidebarHtml = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <i class="ti ti-building-warehouse"></i>
        <span>SiPinjam UPT</span>
      </div>
      <p class="sidebar-subtitle">Sistem Informasi Peminjaman</p>
    </div>
    <ul class="sidebar-menu">
      ${listItemsHtml}
    </ul>
    <div class="sidebar-footer">
      <div class="user-info">
        <span class="user-name" id="sidebar-user-name">${user.nama}</span>
        <span class="user-role">${user.role === 'super_admin' ? 'Super Admin' : (user.role === 'admin' ? 'Administrator' : 'Peminjam')}</span>
      </div>
      <button class="btn btn-secondary btn-sm w-full" onclick="handleLogout()">
        <i class="ti ti-logout"></i> Keluar
      </button>
    </div>
  `;
  
  const sidebarEl = document.getElementById("sidebar-app");
  if (sidebarEl) {
    sidebarEl.innerHTML = sidebarHtml;
  }
}

// Global function to navigate back or to dashboard
function goBackOrDashboard() {
  // If we can go back in history, do so, but check if the previous page was actually part of our app
  if (document.referrer && (document.referrer.includes(window.location.host))) {
    window.history.back();
  } else {
    const isSubfolder = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
    window.location.href = isSubfolder ? 'dashboard.html' : '../landing.html';
  }
}

// Header/Topbar markup generator
function renderTopbar(title) {
  const user = getUser() || { nama: "User" };
  const isDashboard = window.location.pathname.endsWith("dashboard.html") || window.location.pathname.endsWith("/");
  
  let backBtnHtml = "";
  if (!isDashboard) {
    backBtnHtml = `
      <button onclick="goBackOrDashboard()" style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border-radius: 6px; margin-right: 12px; background: #f1f5f9; border: 1px solid var(--border-color); cursor: pointer; color: var(--text-primary); transition: all 0.2s;" onmouseover="this.style.backgroundColor='#e2e8f0'" onmouseout="this.style.backgroundColor='#f1f5f9'" title="Kembali">
        <i class="ti ti-arrow-left" style="font-size: 16px;"></i>
      </button>
    `;
  }

  const topbarHtml = `
    <div style="display: flex; align-items: center;">
      ${backBtnHtml}
      <div class="topbar-title">${title}</div>
    </div>
    <div class="topbar-actions">
      <div style="font-size: 13px; color: var(--text-secondary)">
        <i class="ti ti-calendar" style="margin-right: 4px;"></i>
        <span id="topbar-date">${formatTanggal(new Date())}</span>
      </div>
    </div>
  `;
  
  const topbarEl = document.getElementById("topbar-app");
  if (topbarEl) {
    topbarEl.innerHTML = topbarHtml;
  }
}

// Global handle logout
async function handleLogout() {
  const prefix = getApiPrefix();
  try {
    const res = await fetch(`${prefix}api/auth/logout.php`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      StorageHelper.remove("user_session");
      StorageHelper.remove("sessionToken");
      window.location.href = `${prefix}login.html`;
    } else {
      showToast("Gagal logout", "danger");
    }
  } catch (err) {
    console.error("Logout error:", err);
    StorageHelper.remove("user_session");
    StorageHelper.remove("sessionToken");
    window.location.href = `${prefix}login.html`;
  }
}

// Initialize template layout on DOM load
document.addEventListener("DOMContentLoaded", () => {
  // Sync topbar dates etc if element is present
  const topbarDate = document.getElementById("topbar-date");
  if (topbarDate) {
    topbarDate.textContent = formatTanggal(new Date());
  }
});

// Dynamic non-blocking custom confirmation modal
function showConfirm(title, message, onConfirm) {
  const modalId = "custom-confirm-modal-" + Date.now();
  const overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.className = "modal-overlay";
  overlay.style.zIndex = "1100"; // Higher than normal modals

  overlay.innerHTML = `
    <div class="modal" style="max-width: 400px; padding: 24px; background-color: #ffffff; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--accent-light); color: var(--accent-color); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
          <i class="ti ti-help-circle"></i>
        </div>
        <div>
          <h4 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px 0;">${title}</h4>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5;">${message}</p>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary btn-sm" id="${modalId}-cancel" style="padding: 6px 12px; font-size: 12px;">Batal</button>
        <button type="button" class="btn btn-primary btn-sm" id="${modalId}-confirm" style="padding: 6px 12px; font-size: 12px;">Konfirmasi</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger CSS transitions
  setTimeout(() => {
    overlay.classList.add("open");
  }, 10);

  const cancelBtn = document.getElementById(`${modalId}-cancel`);
  const confirmBtn = document.getElementById(`${modalId}-confirm`);

  const close = () => {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  };

  cancelBtn.addEventListener("click", () => {
    close();
  });

  confirmBtn.addEventListener("click", () => {
    close();
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  });
}
