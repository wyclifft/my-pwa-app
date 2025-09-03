import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://wyocoumpglwroyzbrvsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
                      
// ----------------------
// Tab Switching
// ----------------------
function showTab(tabName, event) {
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
  document.getElementById(tabName)?.classList.add("active");
  if (event) event.currentTarget.classList.add("active");
}
window.showTab = showTab;

// ----------------------
// Modals
// ----------------------
window.showAddGroupModal = () => document.getElementById("addGroupModal")?.classList.add("show");
window.showAddMemberModal = (groupId) => {
  const modal = document.getElementById("addMemberModal");
  if (modal) { modal.classList.add("show"); modal.dataset.groupId = groupId; }
};
window.showAttendanceModal = () => document.getElementById("attendanceModal")?.classList.add("show");
window.showEventModal = () => document.getElementById("eventModal")?.classList.add("show");
window.showAnnouncementModal = () => document.getElementById("announcementModal")?.classList.add("show");
window.showContributionModal = () => document.getElementById("contributionModal")?.classList.add("show");
window.closeModal = (id) => document.getElementById(id)?.classList.remove("show");

// ----------------------
// Dashboard Stats
// ----------------------
async function loadDashboardStats() {
  const safeSetText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value ?? 0; };
  
  const { count: groupsCount } = await supabase.from("groups").select("*", { count: "exact", head: true });
  const { count: membersCount } = await supabase.from("members").select("*", { count: "exact", head: true });
  const today = new Date().toISOString().split("T")[0];
  const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true }).gte("date", today);
  const { data: contributions } = await supabase.from("contributions").select("amount");
  const totalContributions = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

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
      const { data: members } = await supabase.from("members").select("*").eq("group_id", group.id);
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
          ${members?.map(m => `
            <div class="member-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span>• ${m.name}</span>
              <button onclick="deleteMember(${m.id})" class="btn btn-sm btn-danger">🗑 Remove</button>
            </div>
          `).join("") || "No members yet"}
        </div>
      `;
      groupsList.appendChild(div);
    }
  }

  // Populate group selects
  const groupSelects = [document.getElementById("memberGroup"), document.getElementById("attendanceGroupSelect"), document.getElementById("attendanceGroupModel")];
  groupSelects.forEach(selectEl => {
    if (selectEl) {
      selectEl.innerHTML = "";
      groups.forEach(g => {
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

// Load groups into the select dropdown
async function loadAttendanceGroups() {
  const { data: groups, error } = await supabase.from("groups").select("*").order("name");
  const groupSelect = document.getElementById("attendanceGroupModel");
  if (!groupSelect) return;

  groupSelect.innerHTML = '<option value="">-- Select Group --</option>';

  if (error) return console.error("Failed to load groups:", error);

  groups.forEach(g => {
    const option = document.createElement("option");
    option.value = g.id;
    option.textContent = g.name;
    groupSelect.appendChild(option);
  });
}

// Load members for a selected group
async function loadAttendanceMembers(groupId) {
  const container = document.getElementById("attendanceMembersModel");
  if (!container) return;
  container.innerHTML = "";

  if (!groupId) return;

  const { data: members, error } = await supabase
    .from("members")
    .select("*")
    .eq("group_id", groupId)
    .order("name");

  if (error) {
    container.innerHTML = "❌ Error loading members";
    return console.error(error);
  }

  if (!members.length) {
    container.innerHTML = "No members in this group yet";
    return;
  }

  members.forEach(m => {
    const div = document.createElement("div");
    div.innerHTML = `<label><input type="checkbox" value="${m.id}"> ${m.name}</label>`;
    container.appendChild(div);
  });
}

// Initialize group change event
document.getElementById("attendanceGroupModel")?.addEventListener("change", (e) => {
  loadAttendanceMembers(e.target.value);
});

// Submit attendance form
document.getElementById("attendanceForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const groupId = document.getElementById("attendanceGroupModel")?.value;
  const checkboxes = document.querySelectorAll("#attendanceMembersModel input[type='checkbox']");
  const attendees = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => Number(cb.value));

  if (!groupId) return alert("Please select a group.");
  if (attendees.length === 0) return alert("Select at least one member.");

  const { error } = await supabase.from("attendance").insert([{
    group_id: groupId,
    attendees,
    date: new Date().toISOString().split("T")[0],
    event: "General"
  }]);

  if (error) return alert("Failed to save attendance: " + error.message);

  alert("Attendance saved!");
  closeModal("attendanceModal");

  // Optionally reload attendance list if you have one
});

// Load groups immediately on page load
loadAttendanceGroups();


// ----------------------
// Contributions
// ----------------------
async function loadMembersForContributions(groupId) {
  const { data: members } = await supabase.from("members").select("*").eq("group_id", groupId);
  const select = document.getElementById("contributionMember");
  if (!select) return;
  select.innerHTML = "";
  if (members?.length) members.forEach(m => { const opt = document.createElement("option"); opt.value = m.id; opt.textContent = m.name; select.appendChild(opt); });
}
window.loadMembersForContributions = loadMembersForContributions;

// ----------------------
// Announcements
// ----------------------
async function loadAnnouncements() {
  const { data: announcements, error } = await supabase
    .from("announcements")
    .select("*")
    .order("date", { ascending: false });

  const container = document.getElementById("announcementsList");
  if (!container) return;
  container.innerHTML = "";

  if (error) return console.error(error);

  announcements.forEach(a => {
    const div = document.createElement("div");
    div.className = "content-card";
    div.innerHTML = `
      <h4>${a.title ?? ""}</h4>
      <p>${a.message ?? ""}</p>
      <small>${a.date ?? ""}</small>
    `;
    container.appendChild(div);
  });
}
window.loadAnnouncements = loadAnnouncements;

// Submit announcement
document.getElementById("announcementForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Trim values to remove whitespace (mobile-safe)
  const title = document.getElementById("announcementTitle")?.value.trim();
  const message = document.getElementById("announcementMessage")?.value.trim();
  const date = document.getElementById("announcementDate")?.value;

  console.log("Debug:", { title, message, date }); // check values on mobile

  if (!title || !message || !date) return alert("All fields required");

  const { error } = await supabase.from("announcements").insert([{ title, message, date }]);
  if (error) return alert("Failed to add announcement: " + error.message);

  alert("Announcement added!");
  closeModal("announcementModal");
  loadAnnouncements();
});


// ----------------------
// Contributions
// ----------------------
async function loadContributions() {
  const { data: contributions, error } = await supabase
    .from("contributions")
    .select("id, amount, group_id, member_id, created_at, groups(name), members(name)")
    .order("created_at", { ascending: false });

  const container = document.getElementById("contributionsList");
  if (!container) return;
  container.innerHTML = "";

  if (error) return console.error(error);

  if (!contributions.length) {
    container.innerHTML = "No contributions recorded yet.";
    return;
  }

  contributions.forEach(c => {
    const div = document.createElement("div");
    div.className = "content-card";
    div.innerHTML = `
      <strong>${c.members?.name || "Unknown Member"}</strong> from <em>${c.groups?.name || "Unknown Group"}</em>
      contributed <strong>KSH ${Number(c.amount).toLocaleString()}</strong>
      <br><small>${new Date(c.created_at).toLocaleDateString()}</small>
    `;
    container.appendChild(div);
  });
}
window.loadContributions = loadContributions;

// Submit contribution
document.getElementById("contributionForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const groupId = document.getElementById("memberGroup")?.value;
  const memberId = document.getElementById("contributionMember")?.value;
  const amount = Number(document.getElementById("contributionAmount")?.value);

  if (!groupId || !memberId || !amount) return alert("All fields are required.");

  const { error } = await supabase.from("contributions").insert([{ group_id: groupId, member_id: memberId, amount }]);
  if (error) return alert("Failed to save contribution: " + error.message);

  alert("Contribution recorded!");
  closeModal("contributionModal");
  loadContributions();
});

// Update members dropdown when group changes
document.getElementById("memberGroup")?.addEventListener("change", (e) => {
  loadMembersForContributions(e.target.value);
});

// ----------------------
// Events
// ----------------------
async function loadEvents() {
  const { data: events, error } = await supabase.from("events").select("*").order("date", { ascending: true });
  const container = document.getElementById("eventsList");
  if (!container) return;
  container.innerHTML = "";

  if (error) return console.error(error);

  if (!events.length) {
    container.innerHTML = "No upcoming events.";
    return;
  }

  events.forEach(ev => {
    const div = document.createElement("div");
    div.className = "content-card";
    div.innerHTML = `
      <strong>${ev.title}</strong> for <em>${ev.target || "All Members"}</em>
      <br><small>${new Date(ev.date).toLocaleDateString()}</small>
    `;
    container.appendChild(div);
  });
}
window.loadEvents = loadEvents;

// Submit event
document.getElementById("eventForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("eventTitle")?.value;
  const date = document.getElementById("eventDate")?.value;
  const target = document.getElementById("eventTarget")?.value;

  if (!title || !date || !target) return alert("All fields are required.");

  const { error } = await supabase.from("events").insert([{ title, date, target }]);
  if (error) return alert("Failed to add event: " + error.message);

  alert("Event added!");
  closeModal("eventModal");
  loadEvents();
});

// ----------------------
// Initialize everything on page load
// ----------------------
window.addEventListener("DOMContentLoaded", () => {
  loadDashboardStats();
  loadGroups();
  loadAnnouncements();
  loadContributions();
  loadEvents();
});
