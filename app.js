import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://wyocoumpglwroyzbrvsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- Modal Helpers ----------------
window.showTab = function(tabName, event) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(tabName)?.classList.add("active");
  if (event) event.currentTarget.classList.add("active");
};

["Group","Member","Attendance","Event","Announcement","Contribution","Birthday"].forEach(type => {
  window[`showAdd${type}Modal`] = () => document.getElementById(`add${type}Modal`)?.classList.add("show");
});
window.closeModal = (id) => document.getElementById(id)?.classList.remove("show");

// ---------------- Dashboard Stats ----------------
async function loadDashboardStats() {
  const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? 0; };

  const { count: groupsCount } = await supabase.from("groups").select("*",{ count:"exact", head:true });
  const { count: membersCount } = await supabase.from("members").select("*",{ count:"exact", head:true });
  const today = new Date().toISOString().split("T")[0];
  const { count: eventsCount } = await supabase.from("events").select("*",{ count:"exact", head:true }).gte("date", today);
  const { data: contributions } = await supabase.from("contributions").select("amount");
  const totalContributions = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

  safeSet("totalGroups", groupsCount);
  safeSet("totalMembers", membersCount);
  safeSet("upcomingEvents", eventsCount);
  safeSet("totalContributions", totalContributions.toLocaleString());
}

// ---------------- Groups ----------------
async function loadGroups() {
  const { data: groups, error } = await supabase
    .from("groups")
    .select("id,name,leader_name,leader_phone,members(id,name)");

  if (error) return console.error(error);

  const list = document.getElementById("groupsList");
  if (list) {
    list.innerHTML = "";
    groups.forEach(g => {
      const div = document.createElement("div");
      div.className = "dashboard-card";
      div.innerHTML = `
        <div class="card-header">
          <h3>${g.name}</h3><span>👥 ${g.members?.length || 0} members</span>
        </div>
        <div class="card-content">Leader: ${g.leader_name}<br>Phone: ${g.leader_phone}</div>
        <div class="card-actions">
          <button class="btn btn-primary" onclick="openAddMemberModal(${g.id})">➕ Add Member</button>
          <button class="btn btn-secondary" onclick="toggleMembers('ml-${g.id}')">👁 Show Members</button>
          <button class="btn btn-danger" onclick="deleteGroup(${g.id})">🗑 Remove</button>
        </div>
        <div id="ml-${g.id}" class="member-list" style="display:none;margin-top:8px;">
          ${g.members?.map(m => `<div class="member-item"><span>• ${m.name}</span><button onclick="deleteMember(${m.id})" class="btn btn-sm btn-danger">🗑</button></div>`).join("") || "No members yet"}
        </div>`;
      list.appendChild(div);
    });
  }

  // fill selects
  const gSelects = [document.getElementById("memberGroup"), document.getElementById("attendanceGroup"), document.getElementById("contributionGroup")];
  gSelects.forEach(sel => {
    if (sel) {
      sel.innerHTML = "";
      groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.id; opt.textContent = g.name; sel.appendChild(opt);
      });
    }
  });
}

// ---------------- Members for Contributions ----------------
async function loadMembersForContributions(groupId) {
  const sel = document.getElementById("contributionMember");
  if (!sel) return;
  sel.innerHTML = "";

  if (!groupId) {
    sel.innerHTML = `<option value="">Select group first</option>`;
    return;
  }

  const { data: members, error } = await supabase.from("members").select("id,name").eq("group_id", groupId);
  if (error) return console.error(error);

  if (!members?.length) {
    sel.innerHTML = `<option value="">No members in this group</option>`;
    return;
  }
  members.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id; opt.textContent = m.name; sel.appendChild(opt);
  });
}
document.getElementById("contributionGroup")?.addEventListener("change", e => {
  loadMembersForContributions(e.target.value);
});

// ---------------- Delete ----------------
window.deleteGroup = async(id)=>{ if(confirm("Delete group?")) await supabase.from("groups").delete().eq("id",id); };
window.deleteMember = async(id)=>{ if(confirm("Delete member?")) await supabase.from("members").delete().eq("id",id); };
window.deleteEvent = async(id)=>{ if(confirm("Delete event?")) await supabase.from("events").delete().eq("id",id); };

// ---------------- Form Submissions ----------------
document.getElementById("addGroupForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  const name=document.getElementById("groupName").value, leader_name=document.getElementById("leaderName").value, leader_phone=document.getElementById("leaderPhone").value;
  if(!name||!leader_name||!leader_phone) return alert("All fields required");
  const {error}=await supabase.from("groups").insert([{name,leader_name,leader_phone}]);
  if(error) return alert(error.message);
  closeModal("addGroupModal");
});

document.getElementById("addMemberForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  const name=document.getElementById("memberName").value, phone=document.getElementById("memberPhone").value, birthday=document.getElementById("memberBirthday").value||null, group_id=document.getElementById("memberGroup").value;
  if(!name||!phone||!group_id) return alert("All fields required");
  const {error}=await supabase.from("members").insert([{name,phone,birthday,group_id}]);
  if(error) return alert(error.message);
  closeModal("addMemberModal");
});

document.getElementById("contributionForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  const member_id=document.getElementById("contributionMember").value, amount=Number(document.getElementById("contributionAmount").value), type=document.getElementById("contributionType").value, date=document.getElementById("contributionDate").value, notes=document.getElementById("contributionNotes").value||"";
  if(!member_id||!amount||!type||!date) return alert("All required");
  const {error}=await supabase.from("contributions").insert([{member_id,amount,type,date,notes}]);
  if(error) return alert(error.message);
  closeModal("contributionModal");
});

// ---------------- Realtime ----------------
supabase.channel("db-sync")
  .on("postgres_changes",{event:"*",schema:"public",table:"groups"},()=>{loadGroups();loadDashboardStats();})
  .on("postgres_changes",{event:"*",schema:"public",table:"members"},()=>{loadGroups();loadDashboardStats();})
  .on("postgres_changes",{event:"*",schema:"public",table:"events"},()=>{loadDashboardStats();})
  .on("postgres_changes",{event:"*",schema:"public",table:"contributions"},()=>{loadDashboardStats();})
  .subscribe();

// ---------------- Init ----------------
loadDashboardStats();
loadGroups();

// Helpers
window.openAddMemberModal=(gid)=>{const sel=document.getElementById("memberGroup");if(sel) sel.value=gid; showAddMemberModal();};
window.toggleMembers=(id)=>{const el=document.getElementById(id);if(el) el.style.display=el.style.display==="none"?"block":"none";};
