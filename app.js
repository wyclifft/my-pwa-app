import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://wyocoumpglwroyzbrvsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70";
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
  const attendanceGroup = document.getElementById("attendanceGroup");

  [groupSelect, attendanceGroup].forEach(selectEl => {
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

  if (attendanceGroup?.value) loadAttendanceMembers(attendanceGroup.value);
  if (groupSelect?.value) loadMembersForContributions(groupSelect.value);
}

// --------------- Attendance Tab ---------------

// Populate groups in the attendance tab select
async function loadAttendanceGroups() {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*');

  if (error) {
    console.error('Error fetching groups:', error);
    return;
  }

  const select = document.getElementById('attendanceGroupSelect');
  select.innerHTML = '<option value="">Select a group</option>';
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    select.appendChild(option);
  });
}

// When a group is selected in the tab, display its members
document.getElementById('attendanceGroupSelect').addEventListener('change', async (e) => {
  const groupId = e.target.value;
  const membersDiv = document.getElementById('attendanceMembersList');
  membersDiv.innerHTML = '';

  if (!groupId) return;

  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    console.error('Error fetching members:', error);
    return;
  }

  members.forEach(member => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `attendance-${member.id}`;
    checkbox.value = member.id;

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = member.name;

    const div = document.createElement('div');
    div.appendChild(checkbox);
    div.appendChild(label);

    membersDiv.appendChild(div);
  });
});


// --------------- Attendance Modal ---------------

// Populate groups in the modal select
async function loadAttendanceGroupsModal() {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*');

  if (error) {
    console.error('Error fetching groups:', error);
    return;
  }

  const select = document.getElementById('attendanceGroupModel');
  select.innerHTML = '<option value="">Select a group</option>';
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    select.appendChild(option);
  });
}

// When a group is selected in the modal, display members with checkboxes
document.getElementById('attendanceGroupModel').addEventListener('change', async (e) => {
  const groupId = e.target.value;
  const membersDiv = document.getElementById('attendanceMembersModel');
  membersDiv.innerHTML = '';

  if (!groupId) return;

  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    console.error('Error fetching members:', error);
    return;
  }

  members.forEach(member => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `modal-attendance-${member.id}`;
    checkbox.value = member.id;

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = member.name;

    const div = document.createElement('div');
    div.appendChild(checkbox);
    div.appendChild(label);

    membersDiv.appendChild(div);
  });
});


// --------------- Submit Attendance ---------------

document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const groupId = document.getElementById('attendanceGroupModel').value;
  const memberCheckboxes = document.querySelectorAll('#attendanceMembersModel input[type="checkbox"]');
  const attendedMemberIds = Array.from(memberCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (!groupId || attendedMemberIds.length === 0) {
    alert('Select a group and at least one member.');
    return;
  }

  const records = attendedMemberIds.map(memberId => ({
    group_id: groupId,
    member_id: memberId,
    date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
  }));

  const { error } = await supabase.from('attendance').insert(records);

  if (error) {
    console.error('Error saving attendance:', error);
    alert('Failed to save attendance.');
  } else {
    alert('Attendance saved successfully!');
    closeModal('attendanceModal');
  }
});


// Load both tab and modal groups on page load
window.addEventListener('DOMContentLoaded', () => {
  loadAttendanceGroups();
  loadAttendanceGroupsModal();
});

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

// --- Members for Contributions ---
async function loadMembersForContributions(groupId) {
  let query = supabase.from("members").select("id, name");
  if (groupId) query = query.eq("group_id", groupId);
  const { data: members, error } = await query;
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

// --- Delete Functions ---
window.deleteGroup = async (id) => { if (!confirm("Are you sure?")) return; await supabase.from("groups").delete().eq("id", id); };
window.deleteMember = async (id) => { if (!confirm("Are you sure?")) return; await supabase.from("members").delete().eq("id", id); };
window.deleteEvent = async (id) => { if (!confirm("Are you sure?")) return; await supabase.from("events").delete().eq("id", id); };

// --- Announcement Form (merged) ---
const announcementForm = document.getElementById("announcementForm");
if (announcementForm) {
  announcementForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("announcementTitle")?.value;
    const message = document.getElementById("announcementMessage")?.value;
    const target = document.getElementById("announcementTarget")?.value;
    const date = document.getElementById("announcementDate")?.value;

    if (!title || !message || !target || !date) return alert("All fields required");

    const { error } = await supabase.from("announcements").insert([{ title, message, target, date }]);
    if (error) return alert("Error adding announcement: " + error.message);
    alert("Announcement added!");
    closeModal("announcementModal");
    loadAnnouncements();
  });
}

// --- Attach change listeners instead of inline ---
document.addEventListener("DOMContentLoaded", () => {
  const attendanceGroup = document.getElementById("attendanceGroup");
  if (attendanceGroup) {
    attendanceGroup.addEventListener("change", (e) => {
      loadAttendanceMembers(e.target.value);
    });
  }

  const groupSelect = document.getElementById("memberGroup");
  if (groupSelect) {
    groupSelect.addEventListener("change", (e) => {
      loadMembersForContributions(e.target.value);
    });
  }
});

// Export globals for reuse
window.loadAttendanceMembers = loadAttendanceMembers;
window.loadMembersForContributions = loadMembersForContributions;
