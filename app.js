import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ==============================
// Supabase client setup
// ==============================
const SUPABASE_URL = "https://zlslqpsnstvmfjnrqeeew.supabase.co"; // replace if wrong
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsc2xxcHNuc3R2bWZqbnJxZWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTAyMTMsImV4cCI6MjA2OTQ2NjIxM30.oK2aiMsHOKS50TVFHppAudWqikQkJN8nizXFcnT340w"; // replace with your anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==============================
// Tab switching
// ==============================
function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });
  document.getElementById(tabId).classList.remove("hidden");
}

// ==============================
// Modal handling
// ==============================
function showContributionModal() {
  document.getElementById("contributionModal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("contributionModal").classList.add("hidden");
}

// ==============================
// Load groups
// ==============================
async function loadGroups() {
  const groupSelect = document.getElementById("groupSelect");
  groupSelect.innerHTML = `<option value="">Loading...</option>`;

  const { data, error } = await supabase.from("groups").select("id, name");

  if (error) {
    console.error("loadGroups error:", error);
    groupSelect.innerHTML = `<option value="">Error loading groups</option>`;
    return;
  }

  if (!data || data.length === 0) {
    groupSelect.innerHTML = `<option value="">No groups found</option>`;
    return;
  }

  groupSelect.innerHTML = data
    .map((g) => `<option value="${g.id}">${g.name}</option>`)
    .join("");
}

// ==============================
// Load contributions
// ==============================
async function loadContributions() {
  const contributionsList = document.getElementById("contributionsList");
  contributionsList.innerHTML = `<li class="p-2">Loading...</li>`;

  const { data, error } = await supabase
    .from("contributions")
    .select(
      `
      id,
      amount,
      type,
      date,
      notes,
      members (
        id, name,
        groups (id, name)
      )
    `
    )
    .order("date", { ascending: false });

  if (error) {
    console.error("loadContributions error:", error);
    contributionsList.innerHTML = `<li class="p-2 text-red-500">Error loading contributions</li>`;
    return;
  }

  if (!data || data.length === 0) {
    contributionsList.innerHTML = `<li class="p-2">No contributions yet</li>`;
    return;
  }

  contributionsList.innerHTML = data
    .map(
      (c) => `
      <li class="p-2 border-b">
        <div class="font-semibold">${c.members?.name || "Unknown member"}</div>
        <div>Group: ${c.members?.groups?.name || "No group"}</div>
        <div>Amount: ${c.amount}</div>
        <div>Type: ${c.type}</div>
        <div>Date: ${c.date}</div>
        ${
          c.notes
            ? `<div class="text-sm text-gray-600">Notes: ${c.notes}</div>`
            : ""
        }
      </li>
    `
    )
    .join("");
}

// ==============================
// Contribution form submission
// ==============================
document
  .getElementById("contributionForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const memberId = document.getElementById("memberSelect").value;
    const amount = document.getElementById("amount").value;
    const type = document.getElementById("type").value;
    const date = document.getElementById("date").value;
    const notes = document.getElementById("notes").value;

    if (!memberId || !amount || !type || !date) {
      alert("Please fill all required fields");
      return;
    }

    const { error } = await supabase.from("contributions").insert([
      {
        member_id: memberId,
        amount,
        type,
        date,
        notes,
      },
    ]);

    if (error) {
      console.error("Insert error:", error);
      alert("Error saving contribution");
      return;
    }

    closeModal();
    loadContributions();
  });

// ==============================
// Expose functions for inline HTML
// ==============================
window.showTab = showTab;
window.showContributionModal = showContributionModal;
window.closeModal = closeModal;

// ==============================
// Init
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("App initialized!");
  loadGroups();
  loadContributions();
});
