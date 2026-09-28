const API = "/admin/api";
const TOKEN_KEY = "admin_token";

const loginScreen = document.getElementById("loginScreen");
const panelScreen = document.getElementById("panelScreen");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const ticketList = document.getElementById("ticketList");
const emptyState = document.getElementById("emptyState");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

const modal = document.getElementById("answerModal");
const answerForm = document.getElementById("answerForm");
const modalQuestion = document.getElementById("modalQuestion");
const answerError = document.getElementById("answerError");
const cancelAnswerBtn = document.getElementById("cancelAnswerBtn");
const submitAnswerBtn = answerForm.querySelector('button[type="submit"]');

// The single source of truth for "which ticket is the modal answering".
// Read this via getActiveTicketId()/setActiveTicketId() only, never a
// bare variable, so every call site behaves the same way.
let _activeTicketId = null;
function setActiveTicketId(id) {
  _activeTicketId = id;
}
function getActiveTicketId() {
  return _activeTicketId;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function showScreen(name) {
  loginScreen.hidden = name !== "login";
  panelScreen.hidden = name !== "panel";
}

// Session expiry (401) is handled in exactly one place: it clears the
// token, force-closes the answer modal (so it can never sit open on top
// of a login screen with a stale ticket id behind it), and shows login.
function handleSessionExpired() {
  clearToken();
  closeAnswerModal();
  showScreen("login");
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(API + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch (networkErr) {
    throw new Error("امکان اتصال به سرور نیست. آیا سرویس admin در حال اجراست؟");
  }
  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- Boot ----------
async function boot() {
  if (!getToken()) {
    showScreen("login");
    return;
  }
  try {
    await apiFetch("/me");
    showScreen("panel");
    loadTickets();
  } catch {
    showScreen("login");
  }
}

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    // /login is called directly with fetch (not apiFetch): it must work
    // with no token present, and a 401 here is a real bad-password
    // response, not a session-expiry event, so it must NOT trigger
    // handleSessionExpired().
    const res = await fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "ورود ناموفق بود");

    setToken(data.token);
    showScreen("panel");
    loadTickets();
    loginForm.reset();
  } catch (err) {
    loginError.textContent = err.message || "ورود ناموفق بود";
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  closeAnswerModal();
  showScreen("login");
});

refreshBtn.addEventListener("click", loadTickets);

// ---------- Ticket list ----------
function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("fa-IR");
  } catch {
    return iso;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

const PRIORITY_LABEL = { low: "کم", normal: "معمولی", high: "بالا", urgent: "فوری" };

async function loadTickets() {
  ticketList.innerHTML = "";
  emptyState.hidden = true;
  try {
    const { tickets } = await apiFetch("/tickets");
    if (!tickets.length) {
      emptyState.hidden = false;
      return;
    }
    tickets.forEach(renderTicketCard);
  } catch (err) {
    if (err.message !== "Session expired") {
      ticketList.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    }
  }
}

function renderTicketCard(t) {
  // Guard against a malformed row (missing id) ever reaching the modal:
  // without an id we cannot answer it, so don't render it as clickable.
  if (t == null || t.id == null) {
    console.warn("[admin] skipping ticket with no id:", t);
    return;
  }

  const card = document.createElement("div");
  card.className = "ticket-card";

  const who = t.student_name || t.student_email || "دانشجوی ناشناس";
  const priority = PRIORITY_LABEL[t.priority] || t.priority || "—";

  card.innerHTML = `
    <div class="ticket-card__meta">
      <span>${escapeHtml(who)}</span>
      <span>اولویت: ${escapeHtml(priority)} · ${escapeHtml(fmtDate(t.created_at))}</span>
    </div>
    <p class="ticket-card__question"></p>
    <div class="ticket-card__footer">
      <button type="button" class="btn-primary">پاسخ دادن</button>
    </div>
  `;
  card.querySelector(".ticket-card__question").textContent = t.question;
  // Capture the ticket's own fields explicitly (not the shared loop
  // variable) so each button always answers the correct ticket.
  const ticketId = t.id;
  const ticketQuestion = t.question;
  const ticketCategory = t.category;
  card.querySelector("button").addEventListener("click", () => {
    openAnswerModal({ id: ticketId, question: ticketQuestion, category: ticketCategory });
  });
  ticketList.appendChild(card);
}

// ---------- Answer modal ----------
function openAnswerModal(ticket) {
  if (!getToken()) {
    // Session is already gone (e.g. expired between page load and this
    // click). Don't open a modal that can never submit successfully.
    showScreen("login");
    return;
  }
  if (ticket == null || ticket.id == null) {
    console.warn("[admin] refusing to open answer modal without a ticket id");
    return;
  }
  setActiveTicketId(ticket.id);
  modalQuestion.textContent = ticket.question;
  document.getElementById("ansTitle").value = "";
  document.getElementById("ansContent").value = "";
  document.getElementById("ansKeywords").value = "";
  document.getElementById("ansCategory").value = ticket.category || "general";
  answerError.hidden = true;
  submitAnswerBtn.disabled = false;
  submitAnswerBtn.textContent = "ثبت پاسخ";
  modal.hidden = false;
}

function closeAnswerModal() {
  modal.hidden = true;
  setActiveTicketId(null);
}

cancelAnswerBtn.addEventListener("click", closeAnswerModal);
modal.querySelector(".modal__backdrop").addEventListener("click", closeAnswerModal);

answerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  answerError.hidden = true;

  const ticketId = getActiveTicketId();
  if (ticketId == null) {
    // Nothing sensible to submit. Tell the user rather than send a
    // request with a null id that the server would only 400/404 on.
    answerError.textContent = "این پنجره دیگر معتبر نیست. لطفاً دوباره تلاش کنید.";
    answerError.hidden = false;
    return;
  }
  if (!getToken()) {
    handleSessionExpired();
    return;
  }

  // Prevent double-submit (e.g. an impatient double-click) from firing
  // a second request while the first is still in flight.
  submitAnswerBtn.disabled = true;
  submitAnswerBtn.textContent = "در حال ثبت...";

  const payload = {
    title: document.getElementById("ansTitle").value.trim(),
    content: document.getElementById("ansContent").value.trim(),
    keywords: document.getElementById("ansKeywords").value.trim(),
    category: document.getElementById("ansCategory").value,
  };

  try {
    await apiFetch(`/tickets/${ticketId}/answer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closeAnswerModal();
    loadTickets();
  } catch (err) {
    if (err.message !== "Session expired") {
      answerError.textContent = err.message;
      answerError.hidden = false;
      submitAnswerBtn.disabled = false;
      submitAnswerBtn.textContent = "ثبت پاسخ";
    }
    // On "Session expired", handleSessionExpired() already closed the
    // modal and returned to the login screen — nothing more to do here.
  }
});

boot();
