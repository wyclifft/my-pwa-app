import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase credentials
const SUPABASE_URL = "https://zlslqpsnstvmfjnrqeeew.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- UI Helpers ----------
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  setTimeout(() => {
    notification.className = "notification";
  }, 3000);
}

function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(tabId).classList.add("active");
  document
    .querySelector(`.nav-tab[onclick="showTab('${tabId}')"]`)
    .classList.add("active");
}

function showContributionModal() {
  document.getElementById("contributionModal").style.display = "block";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

// ---------- Load Groups & Members ----------
async function loadGroups() {
  const { data, error } = await supabase.from("groups").select("id, name");
  const groupSelect = document.getElementById("contributionGroup");

  if (error) {
    console.error(error);
    showNotification("Failed to load groups", "error");
    return;
  }

  groupSelect.innerHTML = `<option value="">Select group</option>`;
  data.forEach((group) => {
    groupSelect.innerHTML += `<option value="${group.id}">${group.name}</option>`;
  });
}

async function loadMembers(groupId) {
  const { data, error } = await supabase
    .from("members")
    .select("id, name")
    .eq("group_id", groupId);

  const memberSelect = document.getElementById("contributionMember");

  if (error) {
    console.error(error);
    showNotification("Failed to load members", "error");
    return;
  }

  memberSelect.innerHTML = `<option value="">Select member</option>`;
  data.forEach((member) => {
    memberSelect.innerHTML += `<option value="${member.id}">${member.name}</option>`;
  });
}

document
  .getElementById("contributionGroup")
  .addEventListener("change", (e) => {
    const groupId = e.target.value;
    if (groupId) {
      loadMembers(groupId);
    } else {
      document.getElementById(
        "contributionMember"
      ).innerHTML = `<option value="">Select a group first</option>`;
    }
  });

// ---------- Save Contribution ----------
document
  .getElementById("contributionForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const group_id = document.getElementById("contributionGroup").value;
    const member_id = document.getElementById("contributionMember").value;
    const amount = parseFloat(document.getElementById("contributionAmount").value);
    const type = document.getElementById("contributionType").value;
    const date = document.getElementById("contributionDate").value;
    const notes = document.getElementById("contributionNotes").value || null;

    if (!group_id || !member_id || !amount || !type || !date) {
      showNotification("Please fill all required fields", "error");
      return;
    }

    const { error } = await supabase.from("contributions").insert([
      {
        member_id, // ✅ only member_id goes here
        amount,
        type,
        date,
        notes,
      },
    ]);

    if (error) {
      console.error(error);
      showNotification("Error saving contribution", "error");
    } else {
      showNotification("Contribution recorded successfully 🎉");
      document.getElementById("contributionForm").reset();
      closeModal("contributionModal");
      loadContributions();
    }
  });

// ---------- Load Contributions ----------
async function loadContributions() {
  const { data, error } = await supabase
    .from("contributions")
    .select(`
      id, amount, type, date, notes,
      members (
        name,
        groups (name)
      )
    `)
    .order("date", { ascending: false });

  const list = document.getElementById("contributionsList");

  if (error) {
    console.error(error);
    list.innerHTML = `<p class="error">Failed to load contributions</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p>No contributions recorded yet.</p>`;
    return;
  }

  list.innerHTML = data
    .map(
      (c) => `
    <div class="content-card">
      <strong>${c.members?.name || "Unknown Member"}</strong> 
      (${c.members?.groups?.name || "Unknown Group"}) <br>
      💰 ${c.amount} KSH - ${c.type} <br>
      📅 ${c.date} <br>
      📝 ${c.notes || "No notes"}
    </div>
  `
    )
    .join("");
}

// ---------- Initialize ----------
document.addEventListener("DOMContentLoaded", () => {
  loadGroups();
  loadContributions();
});
