// app.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Init ---
const SUPABASE_URL = "https://wyocoumpglwroyzbrvsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Helpers ---
function showNotification(msg, isError = false) {
  const notification = document.getElementById("notification");
  notification.textContent = msg;
  notification.style.background = isError ? "#dc3545" : "#28a745";
  notification.style.display = "block";
  setTimeout(() => (notification.style.display = "none"), 3000);
}

// --- Groups ---
async function loadGroups() {
  try {
    const { data, error } = await supabase.from("groups").select("id, name");
    if (error) throw error;

    const groupSelect = document.getElementById("contributionGroup");
    if (!groupSelect) return;

    groupSelect.innerHTML = `<option value="">Select group</option>`;
    data.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      groupSelect.appendChild(opt);
    });

    // Also load dashboard cards
    const groupsList = document.getElementById("groupsList");
    if (groupsList) {
      groupsList.innerHTML = "";
      data.forEach(g => {
        groupsList.innerHTML += `
          <div class="content-card">
            <h3>${g.name}</h3>
          </div>`;
      });
    }

    document.getElementById("totalGroups").textContent = data.length;
  } catch (err) {
    console.error("loadGroups error:", err.message);
    showNotification("Failed to load groups", true);
  }
}

// --- Members ---
async function loadMembers(groupId) {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("id, name")
      .eq("group_id", groupId);
    if (error) throw error;

    const memberSelect = document.getElementById("contributionMember");
    if (!memberSelect) return;

    memberSelect.innerHTML = `<option value="">Select member</option>`;
    data.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      memberSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("loadMembers error:", err.message);
    showNotification("Failed to load members", true);
  }
}

// --- Contributions ---
async function loadContributions() {
  try {
    const { data, error } = await supabase
      .from("contributions")
      .select(`
        id,
        amount,
        type,
        date,
        notes,
        members(id, name, groups(id, name))
      `)
      .order("date", { ascending: false });

    if (error) throw error;

    const list = document.getElementById("contributionsList");
    if (!list) return;

    list.innerHTML = "";
    let total = 0;
    data.forEach(c => {
      total += c.amount;
      list.innerHTML += `
        <div class="content-card">
          <p><strong>${c.members?.name || "Unknown"}</strong> (${c.members?.groups?.name || "No Group"})</p>
          <p>💰 ${c.amount} KSH - ${c.type}</p>
          <p>📅 ${c.date}</p>
          <p>📝 ${c.notes || ""}</p>
        </div>`;
    });

    document.getElementById("totalContributions").textContent = total;
  } catch (err) {
    console.error("loadContributions error:", err.message);
    showNotification("Failed to load contributions", true);
  }
}

// --- Handle Contribution Form ---
document.addEventListener("DOMContentLoaded", () => {
  loadGroups();
  loadContributions();

  // When group changes → load members
  const groupSelect = document.getElementById("contributionGroup");
  if (groupSelect) {
    groupSelect.addEventListener("change", e => {
      if (e.target.value) {
        loadMembers(e.target.value);
      }
    });
  }

  // Form submit
  const form = document.getElementById("contributionForm");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const memberId = document.getElementById("contributionMember").value;
      const amount = parseFloat(document.getElementById("contributionAmount").value);
      const type = document.getElementById("contributionType").value;
      const date = document.getElementById("contributionDate").value;
      const notes = document.getElementById("contributionNotes").value;

      try {
        const { error } = await supabase.from("contributions").insert([{
          member_id: memberId,
          amount,
          type,
          date,
          notes
        }]);
        if (error) throw error;

        showNotification("✅ Contribution recorded!");
        form.reset();
        closeModal("contributionModal");
        loadContributions();
      } catch (err) {
        console.error("insert error:", err.message);
        showNotification("Failed to record contribution", true);
      }
    });
  }
});
