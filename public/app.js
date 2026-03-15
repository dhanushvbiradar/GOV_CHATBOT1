// ── Config ────────────────────────────────────────────────────────────────────
// In production, set window.API_URL to your deployed backend URL.
// e.g. add <script>window.API_URL = "https://your-app.railway.app"</script> before this script.
const API_URL = window.API_URL || "";
const API_KEY = window.API_KEY || "dev-key";
const SESSION_KEY = "cgsa_session_id";

// ── State ─────────────────────────────────────────────────────────────────────
let sessionId = sessionStorage.getItem(SESSION_KEY);
let language = "en";
let isLoading = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const langSelect = document.getElementById("lang-select");

// ── Language ──────────────────────────────────────────────────────────────────
langSelect.addEventListener("change", () => {
  language = langSelect.value;
});

// ── Suggestion buttons ────────────────────────────────────────────────────────
document.querySelectorAll(".suggestion-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const msg = btn.getAttribute("data-msg");
    if (msg) sendMessage(msg);
  });
});

// ── Input handling ────────────────────────────────────────────────────────────
sendBtn.addEventListener("click", () => sendMessage(inputEl.value));
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) sendMessage(inputEl.value);
});

// ── Core send ─────────────────────────────────────────────────────────────────
async function sendMessage(text) {
  text = text.trim();
  if (!text || isLoading) return;

  inputEl.value = "";
  appendMessage("user", text);

  const typingId = showTyping();
  setLoading(true);

  try {
    const body = {
      sessionId: sessionId,
      message: text,
      ...(language !== "en" ? { languageOverride: language } : {}),
    };

    const res = await fetch(`${API_URL}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(body),
    });

    removeTyping(typingId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      appendMessage("assistant", err.error || `Server error (${res.status})`, "error");
      return;
    }

    const data = await res.json();

    // Persist session
    if (data.sessionId && data.sessionId !== sessionId) {
      sessionId = data.sessionId;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    renderResponse(data);
  } catch (err) {
    removeTyping(typingId);
    appendMessage("assistant", "Unable to reach the server. Please check your connection and try again.", "error");
  } finally {
    setLoading(false);
  }
}

// ── Render response ───────────────────────────────────────────────────────────
function renderResponse(data) {
  if (data.replyType === "navigation" && data.metadata?.navigationSteps?.length) {
    const steps = data.metadata.navigationSteps;
    const html = `<div>${escapeHtml(data.reply)}</div>
      <ol class="nav-steps">
        ${steps.map(s => `
          <li>
            <span class="step-num">${s.order}</span>
            <span>${escapeHtml(s.instruction)}${s.elementLabel ? ` <em>(${escapeHtml(s.elementLabel)})</em>` : ""}</span>
          </li>`).join("")}
      </ol>`;
    appendMessageHtml("assistant", html);
  } else if (data.replyType === "list" && data.metadata?.documentList) {
    const docs = data.metadata.documentList.documents;
    const mandatory = docs.filter(d => d.isMandatory);
    const conditional = docs.filter(d => !d.isMandatory);
    let html = `<strong>Required Documents:</strong><ul>`;
    mandatory.forEach(d => { html += `<li>✅ <strong>${escapeHtml(d.name)}</strong> — ${escapeHtml(d.description)}</li>`; });
    conditional.forEach(d => { html += `<li>⚠️ ${escapeHtml(d.name)} <em>(if applicable: ${escapeHtml(d.condition || "")})</em></li>`; });
    html += `</ul>`;
    appendMessageHtml("assistant", html);
  } else if (data.replyType === "clarification") {
    const services = data.metadata?.matchedServices || [];
    let html = `${escapeHtml(data.reply)}<ul>`;
    services.forEach(s => { html += `<li><button class="suggestion-btn" onclick="sendMessage('${escapeHtml(s)}')">${escapeHtml(s)}</button></li>`; });
    html += `</ul>`;
    appendMessageHtml("assistant", html);
  } else if (data.replyType === "error") {
    appendMessage("assistant", data.reply, "error");
  } else {
    appendMessage("assistant", data.reply);
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
function appendMessage(role, text, type = "") {
  const div = document.createElement("div");
  div.className = `msg ${role} ${type}`.trim();
  div.innerHTML = `
    <div class="avatar">${role === "assistant" ? "🤖" : "👤"}</div>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  messagesEl.appendChild(div);
  scrollToBottom();
}

function appendMessageHtml(role, html) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="avatar">🤖</div>
    <div class="bubble">${html}</div>
  `;
  messagesEl.appendChild(div);
  scrollToBottom();
}

function showTyping() {
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.className = "msg assistant typing";
  div.id = id;
  div.innerHTML = `
    <div class="avatar">🤖</div>
    <div class="bubble"><div class="dot-flashing"><span></span><span></span><span></span></div></div>
  `;
  messagesEl.appendChild(div);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(val) {
  isLoading = val;
  sendBtn.disabled = val;
  inputEl.disabled = val;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
