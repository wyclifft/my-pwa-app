// app.js (ES module)
// Uses Supabase JS ESM: https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/*
  IMPORTANT: only use anon/public key in client-side code.
  Do NOT put a service_role key here.
*/
const SUPABASE_URL = "https://wyocoumpglwroyzbrvsb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5b2NvdW1wZ2x3cm95emJydnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTE0ODgsImV4cCI6MjA3MjIyNzQ4OH0.ghId1cDHHfyR9C_VmSCGxcE-aqW7kfbbJQ_F7aWan70";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------- UI Helpers ----------------------
const toastContainer = () => document.getElementById("toast-container");
function toast(message, opts = {}) {
  const c = toastContainer();
  if (!c) return alert(message);
  const el = document.createElement("div");
  el.className = "toast bg-white p-3 rounded shadow-md";
  el.style.minWidth = "220px";
  el.innerHTML = `<div class="text-sm">${message}</div>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add("opacity-0", "transition", "duration-300");
    setTimeout(() => el.remove(), 350);
  }, opts.duration || 3000);
}

function showModal(title = "", content = "", onConfirm = null) {
  const modal = document.getElementById("modal-container");
  if (!modal) return;
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-content").innerHTML = content;
  modal.classList.remove("hidden");
  const closeBtn = document.getElementById("close-modal");
  const cancelBtn = document.getElementById("cancel-modal");
  const confirmBtn = document.getElementById("confirm-modal");

  function cleanup() {
    modal.classList.add("hidden");
    closeBtn.removeEventListener("click", cleanup);
    cancelBtn.removeEventListener("click", cleanup);
    confirmBtn.removeEventListener("click", onConfirmClick);
  }

  function onConfirmClick(e) {
    if (typeof onConfirm === "function") onConfirm(e);
    cleanup();
  }

  closeBtn.addEventListener("click", cleanup);
  cancelBtn.addEventListener("click", cleanup);
  confirmBtn.addEventListener("click", onConfirmClick);
}

// ---------------------- Tab Switching ----------------------
function activateTab(tabId) {
  // update page title if exists
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
  }
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.classList.remove("bg-indigo-50", "text-indigo-600");
    if (btn.dataset.tab === tabId) {
      btn.classList.add("bg-indigo-50", "text-indigo-600");
    }
  });

  // panes:
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
  const pane = document.getElementById(`${tabId}-content`);
  if (pane) pane.classList.remove("hidden");
}
window.showTab = activateTab; // expose if any inline calls

document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) {
    e.preventDefault();
    const tabId = tabBtn.dataset.tab;
    activateTab(tabId);
  }
});

// ---------------------- Data Loaders ----------------------

async function loadGroups() {
  try {
    // fetch groups
    const { data: groups, error: groupsErr } = await supabase.from("groups").select("id, name").order("name");
    if (groupsErr) throw groupsErr;

    // fetch members once
    const { data: allMembers, error: membersErr } = await supabase.from("members").select("id, name, group_id").order("name");
    if (membersErr) throw membersErr;

    // group members by group_id
    const membersByGroup = {};
    (allMembers || []).forEach(m => {
      if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
      membersByGroup[m.group_id].push(m);
    });

    // populate groups list cards
    const groupsList = document.getElementById("groups-list");
    if (groupsList) {
      groupsList.innerHTML = "";
      groups.forEach(g => {
        const memberListHtml = (membersByGroup[g.id] || [])
          .map(m => `<div class="flex justify-between items-center"><span class="text-sm">${escapeHtml(m.name)}</span><button data-member-id="${m.id}" data-group-id="${g.id}" class="delete-member-btn text-xs text-red-500">Delete</button></div>`)
          .join("") || `<div class="text-sm text-gray-500">No members</div>`;

        const memberCount = (membersByGroup[g.id] || []).length;

        const card = document.createElement("div");
        card.className = "p-4 border rounded-md";
        card.dataset.groupId = g.id;
        card.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-medium">${escapeHtml(g.name)}</h4>
              <div class="text-xs text-gray-500">${memberCount} member(s)</div>
            </div>
            <div class="space-x-2">
              <button class="view-members-btn px-2 py-1 text-xs border rounded" data-group-id="${g.id}" data-group-name="${escapeHtml(g.name)}">View Members</button>
              <button class="add-member-btn px-2 py-1 text-xs bg-indigo-600 text-white rounded" data-group-id="${g.id}" data-group-name="${escapeHtml(g.name)}">Add Member</button>
            </div>
          </div>
          <div class="members-preview text-sm space-y-1">
            ${memberListHtml}
          </div>
        `;
        groupsList.appendChild(card);
      });

      // attach handlers
      groupsList.querySelectorAll(".view-members-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const gid = btn.dataset.groupId;
          const gname = btn.dataset.groupName;
          showMembersModal(gid, gname);
        });
      });
      groupsList.querySelectorAll(".add-member-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const gid = btn.dataset.groupId;
          const gname = btn.dataset.groupName;
          openAddMemberModalForGroup(gid, gname);
        });
      });
      groupsList.querySelectorAll(".delete-member-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const memberId = btn.dataset.memberId;
          if (!confirm("Delete member?")) return;
          try {
            const { error } = await supabase.from("members").delete().eq("id", memberId);
            if (error) throw error;
            toast("Member deleted");
            await loadGroups();
            await loadCountsAndTotals();
            await loadRecentContributions(8);
          } catch (err) {
            console.error("delete member error:", err);
            toast("Failed to delete member");
          }
        });
      });
    }

    // contribution group select
    const groupSelect = document.getElementById("contribution-group");
    if (groupSelect) {
      const prevValue = groupSelect.value || "";
      groupSelect.innerHTML = `<option value="">Select Group</option>`;
      groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = g.name;
        groupSelect.appendChild(opt);
      });
      if (prevValue) groupSelect.value = prevValue;
    }

    // total groups
    const tg = document.getElementById("total-groups");
    if (tg) tg.textContent = groups.length ?? 0;

    return groups;
  } catch (err) {
    console.error("loadGroups error:", err);
    toast("Failed to load groups");
    return [];
  }
}

async function loadMembersForGroup(groupId) {
  if (!groupId) return [];
  try {
    const { data, error } = await supabase.from("members").select("id, name").eq("group_id", groupId).order("name");
    if (error) throw error;
    const memberSelect = document.getElementById("contribution-member");
    if (memberSelect) {
      memberSelect.disabled = false;
      memberSelect.innerHTML = `<option value="">Select Member</option>`;
      data.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        memberSelect.appendChild(opt);
      });
    }
    return data;
  } catch (err) {
    console.error("loadMembers error:", err);
    toast("Failed to load members");
    return [];
  }
}

async function loadCountsAndTotals() {
  try {
    const { count: membersCount, error: membersErr } = await supabase.from("members").select("*", { head: true, count: "exact" });
    if (membersErr) throw membersErr;
    const tm = document.getElementById("total-members");
    if (tm) tm.textContent = membersCount ?? 0;

    const { data: contribs, error: contribErr } = await supabase.from("contributions").select("amount");
    if (contribErr) throw contribErr;
    const total = (contribs || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const tc = document.getElementById("total-contributions");
    if (tc) tc.textContent = Intl.NumberFormat().format(total);

    const today = new Date().toISOString().slice(0, 10);
    const { count: eventsCount, error: eventsErr } = await supabase.from("events").select("*", { head: true, count: "exact" }).gte("date", today);
    if (eventsErr) throw eventsErr;
    const ue = document.getElementById("upcoming-events");
    if (ue) ue.textContent = eventsCount ?? 0;
  } catch (err) {
    console.error("loadCounts error:", err);
  }
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
}

// ---------------------- Contributions ----------------------
async function loadRecentContributions(limit = 8) {
  try {
    const { data, error } = await supabase
      .from("contributions")
      .select(`
        id,
        amount,
        type,
        date,
        notes,
        members (
          id,
          name,
          groups (
            id,
            name
          )
        )
      `)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const recentContainer = document.getElementById("recent-contributions");
    const allContainer = document.getElementById("all-contributions-list");
    const contributionsList = document.getElementById("contributions-list");

    const renderItem = (c) => {
      const memberName = c.members?.name ?? "Unknown";
      const groupName = c.members?.groups?.name ?? "—";
      return `
        <div class="p-3 border rounded-md">
          <div class="flex justify-between items-start">
            <div>
              <div class="text-sm font-medium">${escapeHtml(memberName)} <span class="text-xs text-gray-500">(${escapeHtml(groupName)})</span></div>
              <div class="text-sm">${escapeHtml(c.type)} • ${escapeHtml(c.date)}</div>
            </div>
            <div class="text-lg font-semibold">${Number(c.amount).toLocaleString()}</div>
          </div>
          <div class="text-xs text-gray-600 mt-2">${escapeHtml(c.notes || "")}</div>
        </div>
      `;
    };

    if (recentContainer) recentContainer.innerHTML = (data || []).map(renderItem).join("") || "<div class='text-sm text-gray-500'>No contributions yet</div>";
    if (allContainer) allContainer.innerHTML = (data || []).map(renderItem).join("") || "<div class='text-sm text-gray-500'>No contributions yet</div>";
    if (contributionsList) contributionsList.innerHTML = (data || []).map(d => `<li>${escapeHtml(d.members?.name || "Unknown")} — ${d.amount} (${escapeHtml(d.type)})</li>`).join("");
  } catch (err) {
    console.error("loadRecentContributions error:", err);
    toast("Failed to load contributions");
  }
}

async function handleContributionFormSubmit(e) {
  e.preventDefault();
  const groupId = document.getElementById("contribution-group")?.value;
  const memberId = document.getElementById("contribution-member")?.value;
  const amountRaw = document.getElementById("contribution-amount")?.value;
  const type = document.getElementById("contribution-type")?.value;
  const notes = document.getElementById("contribution-notes")?.value;

  const amount = parseFloat(amountRaw || 0);
  if (!groupId || !memberId || !amount || !type) {
    toast("Please complete required fields");
    return;
  }

  try {
    const { error } = await supabase.from("contributions").insert([{
      member_id: memberId,
      amount,
      type,
      date: new Date().toISOString().slice(0, 10),
      notes: notes || null
    }]);
    if (error) throw error;
    toast("Contribution saved");
    document.getElementById("contribution-form")?.reset();
    document.getElementById("contribution-member")?.setAttribute("disabled", "true");
    await loadRecentContributions(12);
    await loadCountsAndTotals();
  } catch (err) {
    console.error("save contribution error:", err);
    toast("Failed to save contribution");
  }
}

// ---------------------- Events & Announcements ----------------------
async function loadEvents(limit = 6) {
  try {
    const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true }).limit(limit);
    if (error) throw error;
    const recentEvents = document.getElementById("recent-events");
    const eventsList = document.getElementById("events-list");
    if (recentEvents) recentEvents.innerHTML = (data || []).map(e => `<div class="p-2 border rounded">${escapeHtml(e.title)} — ${escapeHtml(e.date)}</div>`).join("") || "<div class='text-sm text-gray-500'>No events</div>";
    if (eventsList) eventsList.innerHTML = (data || []).map(e => `<li>${escapeHtml(e.title)} — ${escapeHtml(e.date)}</li>`).join("");
  } catch (err) {
    console.error("loadEvents error:", err);
  }
}

async function loadAnnouncements(limit = 10) {
  try {
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    const list = document.getElementById("announcements-list");
    if (list) list.innerHTML = (data || []).map(a => `<div class="p-2 border rounded"><div class="font-medium">${escapeHtml(a.title)}</div><div class="text-sm text-gray-600">${escapeHtml(a.message)}</div></div>`).join("") || "<div class='text-sm text-gray-500'>No announcements</div>";
  } catch (err) {
    console.error("loadAnnouncements error:", err);
  }
}

// ---------------------- Real-time Announcements ----------------------
async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

async function showPushNotification(title, body) {
  try {
    const options = {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      tag: "announcement",
      renotify: true,       // allow multiple notifications
      requireInteraction: true // stay until dismissed
    };

    // Attempt to show via Service Worker if registered
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        reg.showNotification(title, options);
        return;
      }
    }

    // fallback for current page
    new Notification(title, options);

    // optional: play sound manually
    const audio = new Audio("/sounds/notification.mp3"); // add this file in your project
    audio.play().catch(err => console.warn("sound play error:", err));
  } catch (err) {
    console.error("showPushNotification error:", err);
  }
}


function subscribeRealtimeAnnouncements() {
  try {
    supabase.channel("public:announcements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, payload => {
        const rec = payload.new;
        const title = rec.title || "Announcement";
        const msg = rec.message || "";
        toast(`Announcement: ${title}`);
        if (Notification.permission === "granted") {
          showPushNotification(title, msg);
        }
        loadAnnouncements(10);
      })
      .subscribe();
  } catch (err) {
    console.error("subscribeRealtimeAnnouncements error:", err);
  }
}

// ---------------------- Init ----------------------
document.addEventListener("DOMContentLoaded", async () => {
  const groupSelect = document.getElementById("contribution-group");
  const memberSelect = document.getElementById("contribution-member");
  if (groupSelect) {
    groupSelect.addEventListener("change", (e) => {
      const gid = e.target.value;
      if (!gid) {
        if (memberSelect) {
          memberSelect.innerHTML = `<option value="">Select Member</option>`;
          memberSelect.disabled = true;
        }
        return;
      }
      loadMembersForGroup(gid);
    });
  }

  const contribForm = document.getElementById("contribution-form");
  if (contribForm) contribForm.addEventListener("submit", handleContributionFormSubmit);

  window.showModal = showModal;

  await loadGroups();
  await loadCountsAndTotals();
  await loadRecentContributions(8);
  await loadEvents(6);
  await loadAnnouncements(10);

  try {
    await requestNotificationPermission();
  } catch (err) {
    console.warn("Notification permission error:", err);
  }

  try {
    subscribeRealtimeAnnouncements();
  } catch (err) {
    console.warn("Realtime subscribe failed:", err);
  }

  document.getElementById("close-modal")?.addEventListener("click", () => document.getElementById("modal-container")?.classList.add("hidden"));
  document.getElementById("cancel-modal")?.addEventListener("click", () => document.getElementById("modal-container")?.classList.add("hidden"));

  activateTab("dashboard");

  // Bind extra add buttons if they exist
  document.getElementById("add-group-btn")?.addEventListener("click", openAddGroupModal);
  document.getElementById("add-event-btn")?.addEventListener("click", openAddEventModal);
  document.getElementById("add-announcement-btn")?.addEventListener("click", openAddAnnouncementModal);
});

// ---------------------- Extra Modals ----------------------
function openAddGroupModal() {
  const formHtml = `
    <form id="add-group-form" class="space-y-2">
      <input type="text" id="new-group-name" placeholder="Group Name" class="w-full border p-2 rounded" required>
      <input type="text" id="new-leader-name" placeholder="Leader Name" class="w-full border p-2 rounded" required>
      <input type="tel" id="new-leader-phone" placeholder="Leader Phone" class="w-full border p-2 rounded" required>
    </form>`;
  
  showModal("Add Group", formHtml, async () => {
    const name = document.getElementById("new-group-name")?.value.trim();
    const leader_name = document.getElementById("new-leader-name")?.value.trim();
    const lead_phone = document.getElementById("new-leader-phone")?.value.trim();
    if (!name || !leader_name || !lead_phone) return toast("Fill all fields");

    try {
      const { error } = await supabase.from("groups").insert([{ name, leader_name, lead_phone }]);
      if (error) throw error;
      toast("Group added");
      await loadGroups();
      await loadCountsAndTotals();
    } catch (err) {
      console.error("add group error:", err);
      toast("Failed to add group");
    }
  });
}


function openAddMemberModalForGroup(groupId, groupName) {
  const formHtml = `
    <form id="add-member-form" class="space-y-2">
      <input type="text" id="new-member-name" placeholder="Member Name" class="w-full border p-2 rounded" required>
      <input type="tel" id="new-member-phone" placeholder="Member Phone" class="w-full border p-2 rounded" required>
    </form>`;
  
  showModal(`Add Member to ${groupName}`, formHtml, async () => {
    const name = document.getElementById("new-member-name")?.value.trim();
    const phone = document.getElementById("new-member-phone")?.value.trim();
    if (!name || !phone) return toast("Fill all fields");

    try {
      const { error } = await supabase.from("members").insert([{ name, phone, group_id: groupId }]);
      if (error) throw error;
      toast("Member added");
      await loadGroups();
      await loadCountsAndTotals();
    } catch (err) {
      console.error("add member error:", err);
      toast("Failed to add member");
    }
  });
}


async function showMembersModal(groupId, groupName) {
  try {
    const { data, error } = await supabase.from("members").select("id, name").eq("group_id", groupId).order("name");
    if (error) throw error;
    const content = (data || []).map(m => `<div class="flex justify-between items-center"><span>${escapeHtml(m.name)}</span><button data-member-id="${m.id}" class="text-xs text-red-500 delete-member-btn">Delete</button></div>`).join("") || "<div>No members</div>";
    showModal(`Members of ${groupName}`, content);
  } catch (err) {
    console.error("showMembersModal error:", err);
    toast("Failed to load members");
  }
}

function openAddEventModal() {
  const formHtml = `
    <form id="add-event-form" class="space-y-2">
      <input type="text" id="new-event-title" placeholder="Event Title" class="w-full border p-2 rounded" required>
      <textarea id="new-event-description" placeholder="Event Description" class="w-full border p-2 rounded" required></textarea>
      <input type="date" id="new-event-date" class="w-full border p-2 rounded" required>
      <input type="time" id="new-event-time" class="w-full border p-2 rounded" required>
    </form>`;
  
  showModal("Add Event", formHtml, async () => {
    const title = document.getElementById("new-event-title")?.value.trim();
    const description = document.getElementById("new-event-description")?.value.trim();
    const date = document.getElementById("new-event-date")?.value;
    const time = document.getElementById("new-event-time")?.value;
    if (!title || !description || !date || !time) return toast("Fill all fields");

    try {
      const { error } = await supabase.from("events").insert([{ title, description, date, time }]);
      if (error) throw error;
      toast("Event added");
      await loadEvents(6);
      await loadCountsAndTotals();
    } catch (err) {
      console.error("add event error:", err);
      toast("Failed to add event");
    }
  });
}


function openAddAnnouncementModal() {
  const formHtml = `
    <form id="add-announcement-form" class="space-y-2">
      <input type="text" id="new-announcement-title" placeholder="Title" class="w-full border p-2 rounded" required>
      <textarea id="new-announcement-message" placeholder="Message" class="w-full border p-2 rounded" required></textarea>
    </form>`;
  showModal("Add Announcement", formHtml, async () => {
    const title = document.getElementById("new-announcement-title")?.value.trim();
    const message = document.getElementById("new-announcement-message")?.value.trim();
    if (!title || !message) return toast("Fill all fields");
    try {
      const { error } = await supabase.from("announcements").insert([{ title, message }]);
      if (error) throw error;
      toast("Announcement added");
      await loadAnnouncements(10);
    } catch (err) {
      console.error("add announcement error:", err);
      toast("Failed to add announcement");
    }
  });
}

navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.data?.type === "PLAY_NOTIFICATION_SOUND") {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(err => console.warn("sound play error:", err));
  }
});
