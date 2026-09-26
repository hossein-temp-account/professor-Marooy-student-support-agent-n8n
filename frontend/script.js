// Student Support Desk — frontend
//
// Talks to the n8n webhook (node 01) directly from the browser.
// No framework, no build step: this is a university-project
// frontend, kept small enough to read top to bottom.

const WEBHOOK_URL = "http://localhost:5678/webhook/student-support";

const STRINGS = {
  fa: {
    "site.title": "پیشخوان پشتیبانی دانشجویی",
    "site.subtitle": "دانشگاه — سامانه هوشمند رسیدگی به درخواست‌ها",
    "form.heading": "طرح درخواست جدید",
    "form.lede": "درخواست خود را با جزئیات کافی بنویسید. اگر پاسخ در پایگاه دانش دانشگاه موجود باشد، بلافاصله پاسخ می‌گیرید؛ در غیر این صورت، درخواست شما برای کارشناسان ثبت می‌شود.",
    "form.name": "نام و نام خانوادگی",
    "form.studentId": "شماره دانشجویی",
    "form.email": "ایمیل دانشگاهی",
    "form.question": "متن درخواست",
    "form.questionPlaceholder": "مثلاً: برای حذف اضطراری یک درس باید چه کاری انجام بدهم؟",
    "form.submit": "ثبت درخواست",
    "form.errorEmpty": "لطفاً همهٔ فیلدها را تکمیل کنید.",
    "form.errorEmail": "ایمیل واردشده معتبر نیست.",
    "result.idle": "پاسخ به درخواست شما اینجا نمایش داده می‌شود.",
    "result.loading": "در حال بررسی درخواست...",
    "result.ticket": "شماره درخواست",
    "result.status": "وضعیت",
    "result.error": "در ارتباط با سامانه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
    "result.notFound": "پاسخ این سوال هنوز در پایگاه دانش ثبت نشده است. درخواست شما برای بررسی کارشناس ثبت شد.",
    "status.auto_resolved": "پاسخ خودکار",
    "status.waiting_for_human": "در انتظار بررسی کارشناس",
    "footer.note": "این سامانه یک پروژهٔ دانشگاهی برای نمایش گردش‌کار هوشمند n8n است.",
  },
  en: {
    "site.title": "Student Support Desk",
    "site.subtitle": "University — Intelligent Request Handling System",
    "form.heading": "Submit a new request",
    "form.lede": "Describe your request with enough detail. If the university knowledge base has a reliable answer, you'll get it immediately; otherwise your request is registered for staff review.",
    "form.name": "Full name",
    "form.studentId": "Student ID",
    "form.email": "University email",
    "form.question": "Your request",
    "form.questionPlaceholder": "e.g. What do I need to do to withdraw from a course after the deadline?",
    "form.submit": "Submit request",
    "form.errorEmpty": "Please fill in every field.",
    "form.errorEmail": "That email address doesn't look valid.",
    "result.idle": "The response to your request will appear here.",
    "result.loading": "Reviewing your request...",
    "result.ticket": "Request ID",
    "result.status": "Status",
    "result.error": "Something went wrong reaching the system. Please try again.",
    "result.notFound": "This question hasn't been added to the knowledge base yet. Your request has been logged for staff review.",
    "status.auto_resolved": "Answered automatically",
    "status.waiting_for_human": "Waiting for staff review",
    "footer.note": "This is a university project demonstrating an n8n-based intelligent workflow.",
  },
};

let lang = "fa";

// ---------- Theme (dark / light) ----------
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

function getStoredTheme() {
  try { return localStorage.getItem("theme"); } catch { return null; }
}
function storeTheme(value) {
  try { localStorage.setItem("theme", value); } catch { /* ignore */ }
}
function applyTheme(theme) {
  if (theme === "dark" || theme === "light") {
    root.setAttribute("data-theme", theme);
  } else {
    root.removeAttribute("data-theme"); // follow system preference
  }
}

applyTheme(getStoredTheme());

themeToggle.addEventListener("click", () => {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const current = root.getAttribute("data-theme") || (systemPrefersDark ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  storeTheme(next);
});

function applyLang() {
  const dict = STRINGS[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.setAttribute("placeholder", dict[key]);
  });

  document.getElementById("langToggle").textContent = lang === "fa" ? "EN" : "فا";
}

document.getElementById("langToggle").addEventListener("click", () => {
  lang = lang === "fa" ? "en" : "fa";
  applyLang();
});

const questionEl = document.getElementById("question");
const charCountEl = document.getElementById("charCount");
questionEl.addEventListener("input", () => {
  charCountEl.textContent = String(questionEl.value.length);
});

const form = document.getElementById("requestForm");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");

const stubIdle = document.getElementById("stubIdle");
const stubLoading = document.getElementById("stubLoading");
const stubOutcome = document.getElementById("stubOutcome");
const stubError = document.getElementById("stubError");

function showStub(which) {
  [stubIdle, stubLoading, stubOutcome, stubError].forEach((s) => (s.hidden = true));
  which.hidden = false;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const payload = {
    student_name: document.getElementById("studentName").value.trim(),
    student_id: document.getElementById("studentId").value.trim(),
    student_email: document.getElementById("email").value.trim(),
    question: questionEl.value.trim(),
  };

  if (!payload.student_name || !payload.student_id || !payload.student_email || !payload.question) {
    formError.textContent = STRINGS[lang]["form.errorEmpty"];
    formError.hidden = false;
    return;
  }
  if (!isValidEmail(payload.student_email)) {
    formError.textContent = STRINGS[lang]["form.errorEmail"];
    formError.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  showStub(stubLoading);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderOutcome(data);
  } catch (err) {
    console.error("Request failed:", err);
    showStub(stubError);
  } finally {
    submitBtn.disabled = false;
  }
});

function renderOutcome(data) {
  const dict = STRINGS[lang];
  document.getElementById("ticketCode").textContent = data.ticket_code || "—";

  const badge = document.getElementById("statusBadge");
  const status = data.status || "waiting_for_human";
  badge.dataset.state = status;
  badge.textContent = dict[`status.${status}`] || status;

  const answerEl = document.getElementById("answerText");
  const notFound = status === "waiting_for_human";

  if (notFound) {
    answerEl.innerHTML =
      '<div class="stub__notfound">' +
        '<svg class="stub__notfound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="9"/>' +
          '<path d="M12 8v5" stroke-linecap="round"/>' +
          '<circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>' +
        '</svg>' +
        '<p class="stub__notfound-text"></p>' +
      '</div>';
    answerEl.querySelector(".stub__notfound-text").textContent = data.answer || dict["result.notFound"];
  } else {
    answerEl.textContent = data.answer || "";
  }

  showStub(stubOutcome);
}

applyLang();
