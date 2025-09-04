import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ----------------------
// App Version
// ----------------------
const APP_VERSION = "6.0.0";
console.log("MCK First Service App Version:", APP_VERSION);

// ----------------------
// Supabase Setup
// ----------------------
const SUPABASE_URL = "https://wyocoumpglwroyzbrvsb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------------------
// Tab Switching
// ----------------------
function showTab(tabName, event) {
  document.querySelectorAll(".tab-content").forEach((tab) =>
    tab.classList.remove("active")
  );
  document.querySelectorAll(".nav-tab").forEach((tab) =>
    tab.classList.remove("active")
  );
  document.getElementById(tabName)?.classList.add("active");
  if (event) event.currentTarget.classList.add("active");
}
window.showTab = showTab;

// ----------------------
// Modals
// ----------------------
window.showAddGroupModal = () =>
  document.getElementById("addGroupModal")?.classList.add("show");
window.showAddMemberModal = (groupId) => {
  const modal = document.getElementById("addMemberModal");
  if (modal) {
    modal.classList.add("show");
    modal.dataset.groupId = groupId;
  }
};
window.showAttendanceModal = () =>
  document.getElementById("attendanceModal")?.classList.add("show");
window.showEventModal = () =>
  document.getElementById("eventModal")?.classList.add("show");
window.showAnnouncementModal = () =>
  document.getElementById("announcementModal")?.classList.add("show");
window.showContributionModal = () =>
  document.getElementById("contributionModal")?.classList.add("show");
window.closeModal = (id) =>
  document.getElementById(id)?.classList.remove("show");

// ----------------------
// Dashboard Stats
// ----------------------
async function loadDashboardStats() {
  const safeSetText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? 0;
  };

  const { count: groupsCount } = await supabase
    .from("groups")
    .select("*", { count: "exact", head: true });
  const { count: membersCount } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true });
  const today = new Date().toISOString().split("T")[0];
  const { count: eventsCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .gte("date", today);
  const { data: contributions } = await supabase
    .from("contributions")
    .select("amount");
  const totalContributions =
    contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

  safeSetText("totalGroups", groupsCount);
  safeSetText("totalMembers", membersCount);
  safeSetText("upcomingEvents", eventsCount);
  safeSetText("totalContributions", totalContributions.toLocaleString());
}
window.loadDashboardStats = loadDashboardStats;

// ----------------------
// Groups
// ----------------------
async function loadGroups() {
  const { data: groups, error } = await supabase.from("groups").select("*");
  if (error) return console.error(error);

  const groupsList = document.getElementById("groupsList");
  if (groupsList) {
    groupsList.innerHTML = "";
    for (const group of groups) {
      const { data: members } = await supabase
        .from("members")
        .select("*")
        .eq("group_id", group.id);
      const memberCount = members?.length || 0;
      const memberListId = `memberList-${group.id}`;

      const div = document.createElement("div");
      div.className = "dashboard-card";
      div.innerHTML = `
        <div class="card-header">
          <h3 class="card-title">${group.name}</h3>
          <span class="member-count">👥 ${memberCount} members</span>
        </div>
        <div class="card-content">
          Leader: ${group.leader_name || "N/A"}<br>
          Phone: ${group.leader_phone || "N/A"}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" onclick="showAddMemberModal(${group.id})">➕ Add Member</button>
          <button class="btn btn-secondary" onclick="toggleMembers('${memberListId}')">👁 Show Members</button>
          <button class="btn btn-danger" onclick="deleteGroup(${group.id})">🗑 Remove Group</button>
        </div>
        <div id="${memberListId}" class="member-list" style="display:none; margin-top:8px;">
          ${
            members
              ?.map(
                (m) => `
            <div class="member-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span>• ${m.name}</span>
              <button onclick="deleteMember(${m.id})" class="btn btn-sm btn-danger">🗑 Remove</button>
            </div>
          `
              )
              .join("") || "No members yet"
          }
        </div>
      `;
      groupsList.appendChild(div);
    }
  }

  // Populate group selects
  const groupSelects = [
    document.getElementById("memberGroup"),
    document.getElementById("attendanceGroupSelect"),
    document.getElementById("attendanceGroupModel"),
  ];
  groupSelects.forEach((selectEl) => {
    if (selectEl) {
      selectEl.innerHTML = "";
      groups.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = g.name;
        selectEl.appendChild(opt);
      });
    }
  });
}
window.loadGroups = loadGroups;
window.toggleMembers = (id) => {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
};

// ----------------------
// Attendance
// ----------------------
async function loadAttendanceGroups() {
  const { data: groups } = await supabase.from("groups").select("*").order("name");
  const groupSelect = document.getElementById("attendanceGroupModel");
  if (!groupSelect) return;
  groupSelect.innerHTML = '<option value="">-- Select Group --</option>';
  groups?.forEach((g) => {
    const option = document.createElement("option");
    option.value = g.id;
    option.textContent = g.name;
    groupSelect.appendChild(option);
  });
}

async function loadAttendanceMembers(groupId) {
  const container = document.getElementById("attendanceMembersModel");
  if (!container) return;
  container.innerHTML = "";
  if (!groupId) return;
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("group_id", groupId)
    .order("name");
  members?.forEach((m) => {
    const div = document.createElement("div");
    div.innerHTML = `<label><input type="checkbox" value="${m.id}"> ${m.name}</label>`;
    container.appendChild(div);
  });
}

document
  .getElementById("attendanceGroupModel")
  ?.addEventListener("change", (e) => loadAttendanceMembers(e.target.value));

document
  .getElementById("attendanceForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const groupId = document.getElementById("attendanceGroupModel")?.value;
    const checkboxes = document.querySelectorAll(
      "#attendanceMembersModel input[type='checkbox']"
    );
    const attendees = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => Number(cb.value));
    if (!groupId) return alert("Please select a group.");
    if (attendees.length === 0) return alert("Select at least one member.");
    const { error } = await supabase.from("attendance").insert([
      {
        group_id: groupId,
        attendees,
        date: new Date().toISOString().split("T")[0],
        event: "General",
      },
    ]);
    if (error) return alert("Failed to save attendance: " + error.message);
    alert("Attendance saved!");
    closeModal("attendanceModal");
  });
loadAttendanceGroups();

// ----------------------
// Contributions
// ----------------------
async function loadContributions() {
  try {
    const { data: contributions, error: contributionsError } = await supabase
      .from("contributions")
      .select("id, amount, type, date, member_id")
      .order("date", { ascending: false });

    if (contributionsError) throw contributionsError;

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, name, group_id");
    if (membersError) throw membersError;

    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("id, name");
    if (groupsError) throw groupsError;

    const container = document.getElementById("contributionsList");
    if (!container) return;
    container.innerHTML = "";

    contributions.forEach((c) => {
      const member = members.find((m) => m.id === c.member_id);
      const group = groups.find((g) => g.id === member?.group_id);

      const div = document.createElement("div");
      div.className = "content-card";
      div.innerHTML = `
        <strong>${member?.name || "Unknown Member"}</strong> from 
        <em>${group?.name || "Unknown Group"}</em> contributed 
        <strong>KSH ${Number(c.amount).toLocaleString()}</strong><br>
        <small>Type: ${c.type || "N/A"} | ${new Date(
        c.date
      ).toLocaleDateString()}</small>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load contributions:", err.message);
  }
}
window.loadContributions = loadContributions;

document
  .getElementById("contributionForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const memberId = document.getElementById("contributionMember")?.value;
    const type = document.getElementById("contributionType")?.value;
    const amount = parseFloat(
      document.getElementById("contributionAmount")?.value
    );

    if (!memberId || !type || !amount) {
      return alert("All fields are required");
    }

    try {
      const { error } = await supabase.from("contributions").insert([
        {
          member_id: memberId,
          amount,
          type,
          date: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert("Contribution added!");
      closeModal("contributionModal");
      loadContributions();
    } catch (err) {
      alert("Failed to add contribution: " + err.message);
    }
  });

// ----------------------
// Events
// ----------------------
async function loadEvents() {
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  const container = document.getElementById("eventsList");
  if (!container) return;
  container.innerHTML = "";

  events?.forEach((ev) => {
    const div = document.createElement("div");
    div.className = "content-card";
    div.innerHTML = `
      <strong>${ev.title}</strong> for <em>${ev.target || "All Members"}</em><br>
      <p>${ev.description}</p>
      <small>${new Date(ev.date).toLocaleDateString()} at ${ev.time}</small>
    `;
    container.appendChild(div);
  });
}
window.loadEvents = loadEvents;

document.getElementById("eventForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const title = document.getElementById("eventTitle")?.value;
  const description = document.getElementById("eventDescription")?.value; // ✅ Added description
  const date = document.getElementById("eventDate")?.value;
  const time = document.getElementById("eventTime")?.value;
  const target = document.getElementById("eventTarget")?.value;

  if (!title || !description || !date || !time || !target) {
    return alert("All fields are required.");
  }

  const { error } = await supabase.from("events").insert([{ title, description, date, time, target }]);
  if (error) return alert("Failed to add event: " + error.message);

  alert("Event added!");
  closeModal("eventModal");
  loadEvents();

  // 🔔 Show local push notification
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("📅 New Event", {
        body: `${title} on ${new Date(date).toLocaleDateString()} at ${time}`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png"
      });
    });
  }
});


// ----------------------
// Announcements (with notifications)
// ----------------------
let lastAnnouncementId = null;
async function loadAnnouncements() {
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("date", { ascending: false });
  const container = document.getElementById("announcementsList");
  if (!container) return;
  container.innerHTML = "";
  announcements?.forEach((a) => {
    const div = document.createElement("div");
    div.className = "content-card";
    div.innerHTML = `<h4>${a.title ?? ""}</h4><p>${
      a.message ?? ""
    }</p><small>${a.date ?? ""}</small>`;
    container.appendChild(div);
  });
  if (announcements?.length && announcements[0].id !== lastAnnouncementId) {
    lastAnnouncementId = announcements[0].id;
    if (Notification.permission === "granted") {
      new Notification("New Announcement", { body: announcements[0].title });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted")
          new Notification("New Announcement", {
            body: announcements[0].title,
          });
      });
    }
  }
}
window.loadAnnouncements = loadAnnouncements;

document.getElementById("announcementForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const title = document.getElementById("announcementTitle")?.value;
  const message = document.getElementById("announcementMessage")?.value;
  const date = document.getElementById("announcementDate")?.value;

  if (!title || !message || !date) return alert("All fields are required.");

  const { error } = await supabase.from("announcements").insert([{ title, message, date }]);
  if (error) return alert("Failed to add announcement: " + error.message);

  alert("Announcement added!");
  closeModal("announcementModal");
  loadAnnouncements();

  // 🔔 Show local push notification
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("📢 New Announcement", {
        body: `${title}: ${message}`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png"
      });
    });
  }
});


// ----------------------
// Live Updates
// ----------------------
setInterval(() => {
  loadDashboardStats();
  loadGroups();
  loadAnnouncements();
  loadContributions();
  loadEvents();
}, 15000);

// ----------------------
// Initialize all on page load
// ----------------------
window.addEventListener("DOMContentLoaded", () => {
  loadDashboardStats();
  loadGroups();
  loadAttendanceGroups();
  loadAnnouncements();
  loadContributions();
  loadEvents();
});

// ----------------------
// SMS Send
// ----------------------
async function sendSMS() {
  const response = await fetch("http://localhost:5000/send-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumbers: ["+2547XXXXXXXX"],
      message: "Hello from MCK FIRST SERVICE MEN APP",
    }),
  });

  const result = await response.json();
  console.log(result);
}
window.sendSMS = sendSMS;
