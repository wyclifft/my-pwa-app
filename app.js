import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://wyocoumpglwroyzbrvsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70"; // replace with your key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Tab Switching ---
function showTab(tabName, event) {
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
  const tabEl = document.getElementById(tabName);
  if (tabEl) tabEl.classList.add("active");
  if (event) event.currentTarget.classList.add("active");
}
window.showTab = showTab;

// --- Modal Helpers ---
window.showAddGroupModal = () => document.getElementById("addGroupModal")?.classList.add("show");
window.showAddMemberModal = () => document.getElementById("addMemberModal")?.classList.add("show");
window.showAttendanceModal = () => document.getElementById("attendanceModal")?.classList.add("show");
window.showEventModal = () => document.getElementById("eventModal")?.classList.add("show");
window.showAnnouncementModal = () => document.getElementById("announcementModal")?.classList.add("show");
window.showContributionModal = () => document.getElementById("contributionModal")?.classList.add("show");
window.closeModal = (id) => document.getElementById(id)?.classList.remove("show");

// --- Dashboard Stats ---
async function loadDashboardStats() {
  const safeSetText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? 0;
  };

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

// --- Groups ---
async function loadGroups() {
  const { data: groups, error } = await supabase
    .from("groups")
    .select("id, name, leader_name, leader_phone, members(id, name)");

  if (error) return console.error(error);

  const groupsList = document.getElementById("groupsList");
  if (groupsList) {
    groupsList.innerHTML = "";
    groups.forEach(group => {
      const memberCount = group.members?.length || 0;
      const memberListId = `memberList-${group.id}`;
      const div = document.createElement("div");
      div.className = "dashboard-card";
      div.innerHTML = `
        <div class="card-header">
          <h3 class="card-title">${group.name}</h3>
          <span class="member-count">👥 ${memberCount} members</span>
        </div>
        <div class="card-content">
          Leader: ${group.leader_name}<br>
          Phone: ${group.leader_phone}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" onclick="openAddMemberModal(${group.id})">➕ Add Member</button>
          <button class="btn btn-secondary" onclick="toggleMembers('${memberListId}')">👁 Show Members</button>
          <button class="btn btn-danger" onclick="deleteGroup(${group.id})">🗑 Remove Group</button>
        </div>
        <div id="${memberListId}" class="member-list" style="display:none; margin-top:8px;">
          ${group.members?.map(m => `
            <div class="member-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span>• ${m.name}</span>
              <button onclick="deleteMember(${m.id})" class="btn btn-sm btn-danger">🗑 Remove</button>
            </div>
          `).join("") || "No members yet"}
        </div>
      `;
      groupsList.appendChild(div);
    });
  }

  // Fill selects
  const groupSelect = document.getElementById("memberGroup");
  const attendanceGroupSelect = document.getElementById("attendanceGroup");
  [groupSelect, attendanceGroupSelect].forEach(selectEl => {
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

  if (attendanceGroupSelect?.value) loadAttendanceMembers(attendanceGroupSelect.value);

  loadMembersForContributions();
}

// --- Attendance Members ---
async function loadAttendanceMembers(groupId) {
  const { data: members, error } = await supabase.from("members").select("id, name").eq("group_id", groupId);
  const container = document.getElementById("attendanceMembers");
  if (!container) return;
  container.innerHTML = "";

  if (error) {
    container.innerHTML = "❌ Error loading members";
    return console.error(error);
  }

  if (members.length === 0) {
    container.innerHTML = "No members in this group yet";
    return;
  }

  members.forEach(m => {
    const div = document.createElement("div");
    div.innerHTML = `<label><input type="checkbox" value="${m.id}"> ${m.name}</label>`;
    container.appendChild(div);
  });
}

// --- Members for Contributions ---
async function loadMembersForContributions() {
  const { data: members, error } = await supabase.from("members").select("id, name");
  const select = document.getElementById("contributionMember");
  if (error || !select) return;
  select.innerHTML = "";
  members.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    select.appendChild(opt);
  });
}

// --- Load Events ---
async function loadEvents() {
  const { data: events, error } = await supabase.from("events").select("*").order("date", { ascending: true });
  const eventsList = document.getElementById("eventsList");
  if (!eventsList) return;

  if (error) {
    eventsList.innerHTML = "❌ Error loading events";
    return console.error(error);
  }

  if (events.length === 0) {
    eventsList.innerHTML = "No events yet";
    return;
  }

  eventsList.innerHTML = "";
  events.forEach(e => {
    const div = document.createElement("div");
    div.className = "content-item";
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.innerHTML = `<span>📅 ${e.name} on ${e.date}</span>
                     <button onclick="deleteEvent(${e.id})" class="btn btn-sm btn-danger">🗑 Remove</button>`;
    eventsList.appendChild(div);
  });
}

// --- Delete Functions ---
window.deleteGroup = async (id) => { if (!confirm("Are you sure?")) return; const { error } = await supabase.from("groups").delete().eq("id", id); if (error) alert("Error deleting group: " + error.message); };
window.deleteMember = async (id) => { if (!confirm("Are you sure?")) return; const { error } = await supabase.from("members").delete().eq("id", id); if (error) alert("Error deleting member: " + error.message); };
window.deleteEvent = async (id) => { if (!confirm("Are you sure?")) return; const { error } = await supabase.from("events").delete().eq("id", id); if (error) alert("Error deleting event: " + error.message); };

// --- Attendance History ---
async function loadAttendanceHistory() {
  const { data, error } = await supabase.from("attendance").select("id, event, date, groups(name), attendees").order("date", { ascending: false });
  const list = document.getElementById("attendanceList");
  if (!list) return;

  if (error) {
    list.innerHTML = "❌ Error loading attendance";
    return console.error(error);
  }

  if (data.length === 0) { list.innerHTML = "No attendance records yet"; return; }

  list.innerHTML = "";
  for (let record of data) {
    let memberNames = [];
    if (record.attendees?.length) {
      const { data: members } = await supabase.from("members").select("name").in("id", record.attendees);
      memberNames = members?.map(m => m.name) || [];
    }
    const div = document.createElement("div");
    div.className = "content-item";
    div.innerHTML = `<strong>${record.event}</strong> on ${record.date} (Group: ${record.groups?.name || "Unknown"})<br>
                     Attendees: ${memberNames.length ? memberNames.join(", ") : "None"}`;
    list.appendChild(div);
  }
}

// --- Realtime Updates ---
supabase.channel("db-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => { loadGroups(); loadDashboardStats(); })
  .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => { loadGroups(); loadDashboardStats(); loadMembersForContributions(); })
  .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => { loadEvents(); loadDashboardStats(); })
  .on("postgres_changes", { event: "*", schema: "public", table: "contributions" }, () => { loadDashboardStats(); })
  .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => { loadAttendanceHistory(); loadDashboardStats(); })
  .subscribe();

// --- Init Load ---
loadDashboardStats();
loadGroups();
loadAttendanceHistory();
loadEvents();

// --- Open Add Member Modal for Specific Group ---
window.openAddMemberModal = (groupId) => {
  const groupSelect = document.getElementById("memberGroup");
  if (groupSelect) groupSelect.value = groupId;
  showAddMemberModal();
};

// --- Form Submissions ---
// Add safety checks for each form
[
  ["addGroupForm", async (e) => {
    e.preventDefault();
    const name = document.getElementById("groupName")?.value;
    const leaderName = document.getElementById("leaderName")?.value;
    const leaderPhone = document.getElementById("leaderPhone")?.value;
    if (!name || !leaderName || !leaderPhone) return alert("All fields are required");
    const { error } = await supabase.from("groups").insert([{ name, leader_name: leaderName, leader_phone: leaderPhone }]);
    if (error) return alert(error.message);
    alert("Group created!");
    closeModal("addGroupModal");
    loadGroups();
    loadDashboardStats();
  }],
  ["addMemberForm", async (e) => {
    e.preventDefault();
    const name = document.getElementById("memberName")?.value;
    const phone = document.getElementById("memberPhone")?.value;
    const birthday = document.getElementById("memberBirthday")?.value || null;
    const groupId = document.getElementById("memberGroup")?.value;
    if (!name || !phone || !groupId) return alert("All fields are required");
    const { error } = await supabase.from("members").insert([{ name, phone, birthday, group_id: groupId }]);
    if (error) return alert(error.message);
    alert("Member added!");
    closeModal("addMemberModal");
    loadGroups();
    loadMembersForContributions();
    loadDashboardStats();
  }]
].forEach(([id, handler]) => {
  const form = document.getElementById(id);
  if (form) form.addEventListener("submit", handler);
});

// --- Event Form Submission ---
const eventForm = document.getElementById("eventForm");
if (eventForm) {
  eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("eventTitle")?.value;
    const date = document.getElementById("eventDate")?.value;
    const time = document.getElementById("eventTime")?.value;
    const description = document.getElementById("eventDescription")?.value || "";
    const target = document.getElementById("eventTarget")?.value;
    if (!title || !date) return alert("Event title and date are required");
    
    const { error } = await supabase.from("events").insert([{ name: title, date, time, description, target_group: target }]);
    if (error) return alert("Error adding event: " + error.message);

    alert("Event added!");
    closeModal("eventModal");
    loadEvents();
    loadDashboardStats();
  });
}

// --- Contribution Form Submission ---
const contributionForm = document.getElementById("contributionForm");
if (contributionForm) {
  contributionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const memberId = document.getElementById("contributionMember")?.value;
    const amount = Number(document.getElementById("contributionAmount")?.value);
    const type = document.getElementById("contributionType")?.value;
    const date = document.getElementById("contributionDate")?.value;
    const notes = document.getElementById("contributionNotes")?.value || "";
    if (!memberId || !amount || !type || !date) return alert("All contribution fields are required");

    const { error } = await supabase.from("contributions").insert([{ member_id: memberId, amount, type, date, notes }]);
    if (error) return alert("Error recording contribution: " + error.message);

    alert("Contribution recorded!");
    closeModal("contributionModal");
    loadGroups();
    loadDashboardStats();
  });
}

// --- Attendance Form Submission ---
const attendanceForm = document.getElementById("attendanceForm");

if (attendanceForm) {
  attendanceForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const groupId = document.getElementById("attendanceGroup")?.value;
    const eventName = document.getElementById("attendanceEvent")?.value;
    const date = document.getElementById("attendanceDate")?.value;

    if (!groupId || !eventName || !date) return alert("All fields required");

    // Collect checked members
    const checkedMembers = Array.from(
      document.querySelectorAll("#attendanceMembers input[type=checkbox]:checked")
    ).map(input => Number(input.value));

    if (checkedMembers.length === 0) return alert("Select at least one member");

    const { error } = await supabase.from("attendance").insert([{
      group_id: groupId,
      event: eventName,
      date,
      attendees: checkedMembers // make sure your column is type integer[]
    }]);

    if (error) return alert("Error saving attendance: " + error.message);

    alert("Attendance saved!");
    attendanceForm.reset();
    loadAttendanceHistory();
  });
}

// --- Birthday Form Submission ---
const birthdayForm = document.getElementById("birthdayForm");
if (birthdayForm) {
  birthdayForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const memberId = document.getElementById("birthdayMember")?.value;
    const date = document.getElementById("birthdayDate")?.value;
    if (!memberId || !date) return alert("Select member and date");

    const { error } = await supabase.from("birthdays").insert([{ member_id: memberId, date }]);
    if (error) return alert("Error adding birthday: " + error.message);

    alert("Birthday added!");
    closeModal("birthdayModal");
    loadDashboardStats();
  });
}

// --- Helper to open Add Member Modal for specific group ---
window.openAddMemberModal = (groupId) => {
  const groupSelect = document.getElementById("memberGroup");
  if (groupSelect) groupSelect.value = groupId;
  showAddMemberModal();
};

// --- Toggle Member List ---
window.toggleMembers = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === "none" ? "block" : "none";
};

