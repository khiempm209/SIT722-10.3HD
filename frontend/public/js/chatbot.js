const convContainer = document.getElementById("conversations");
const homeView = document.getElementById("homeView");
const chatShell = document.getElementById("chatShell");
const chatArea = document.getElementById("chatArea");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

const homeInput = document.getElementById("homeInput");
const homeSend = document.getElementById("homeSend");
const newChatBtn = document.getElementById("newChatBtn");

const authArea = document.getElementById("authArea");
const authPanel = document.getElementById("authPanel");
const authForm = document.getElementById("authForm");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const switchModeBtn = document.getElementById("switchMode");
const authModeSpan = document.getElementById("authMode");
const authError = document.getElementById("authError");
const brandLogo = document.getElementById("brandLogo");
const sidebar = document.querySelector(".sidebar");

const CRUD_SERVICE_URL = "";
// in-memory conversations (simulate DB)
let conversations = null;
let currentId = null;
let addNewChat = false;

//  filled from /api/me
let me = { fullName: "Guest", email: null, jti: null };
let userid = null;

let socket = null;

let mode = "login"; // or 'signup'
let panelOpen = false;

async function getCredential(){
  try {
    const res = await fetch(`${CRUD_SERVICE_URL}/api/me`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    console.log(data.user)
    if (res.ok && data.ok && data.user) {
      if (data.user.jti){
        me = data.user;          
        userid = data.user.username;
        homeInput.style.display = "block";
        homeSend.style.display = "block";
      }
    }
  } catch {
  }
}

function renderAuthArea() {
  authArea.innerHTML = "";

  if (userid) {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.gap = "8px";
    wrapper.style.alignItems = "center";

    const nameEl = document.createElement("div");
    nameEl.className = "auth-username";
    nameEl.textContent = userid;

    const logoutBtn = document.createElement("button");
    logoutBtn.className = "auth-btn";
    logoutBtn.type = "button";
    logoutBtn.id = "logoutBtn";
    logoutBtn.textContent = "Logout";

    logoutBtn.addEventListener("click", async (ev) => {
      try {
        const res = await fetch(`${CRUD_SERVICE_URL}/api/logout`, {
          method: "POST",
        });
        window.location.href = "/";
      } catch (err) {
        console.log("Logout: Server error")
      }
    });

    wrapper.appendChild(nameEl);
    wrapper.appendChild(logoutBtn);
    authArea.appendChild(wrapper);
  } else {
    const loginBtn = document.createElement("button");
    loginBtn.className = "auth-btn";
    loginBtn.id = "showLoginBtn";
    loginBtn.type = "button";
    loginBtn.textContent = "Login";
    loginBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleAuthPanel();
    });
    authArea.appendChild(loginBtn);
  }
}

function toggleAuthPanel() {
  if (panelOpen) hideAuthPanel();
  else openAuthPanel();
}

function openAuthPanel() {
  const brandRect = brandLogo.getBoundingClientRect();
  const sideRect = sidebar.getBoundingClientRect();
  const left = Math.max(8, brandRect.left - sideRect.left);
  const top = brandRect.bottom - sideRect.top + 8;
  authPanel.style.left = left + "px";
  authPanel.style.top = top + "px";

  authPanel.style.display = "block";
  authPanel.setAttribute("aria-hidden", "false");
  authError.textContent = "";
  authModeSpan.textContent = mode;
  authUsername.value = "";
  authPassword.value = "";
  authUsername.focus();
  panelOpen = true;
}
function hideAuthPanel() {
  authPanel.style.display = "none";
  authPanel.setAttribute("aria-hidden", "true");
  panelOpen = false;
}

switchModeBtn.addEventListener("click", (ev) => {
  ev.stopPropagation();
  mode = mode === "login" ? "signup" : "login";
  authModeSpan.textContent = mode;
  authSubmit.textContent = mode === "login" ? "Login" : "Create";
});

async function login(username, password) {
  try {
    const res = await fetch(`${CRUD_SERVICE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      return 1;
    }
    if (res.status === 404) return -1;
    else if (res.status === 401) return -2;
  } catch (_err) {
    return -1;
  }
}

async function signup(username, password) {
  const body = {
    username: username.trim(),
    password: password,
  };

  try {
    const res = await fetch(`${CRUD_SERVICE_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    if (res.ok) return 1;
    if (res.status === 409) return -1;
  } catch (err) {
    return -2;
  }
}

authForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  const u = (authUsername.value || "").trim();
  const p = authPassword.value || "";
  if (!u || !p) {
    authError.textContent = "Please enter username and password.";
    return;
  }
  if (mode === "login") {
    resLogin = await login(u, p);
    if (resLogin == -1) {
      authError.textContent = "Username doesn't exist";
      return;
    }
    if (resLogin == -2) {
      authError.textContent = "Wrong password";
      return;
    }
    await getCredential();
    hideAuthPanel();
    renderAuthArea();
    conversations = await fetchConversationFromServer();
    renderList();
  } else {
    resSignup = await signup(u, p);
    if (resSignup == -1) {
      authError.textContent = "User already exists. Please login.";
      return;
    }
    if (resSignup == -2) {
      authError.textContent = "Internal server error during signup.";
      return;
    }
    hideAuthPanel();
    renderAuthArea();
  }
});

// close panel when clicking outside authPanel or authArea
window.addEventListener("click", (e) => {
  if (!panelOpen) return;
  if (authPanel.contains(e.target) || authArea.contains(e.target)) return;
  hideAuthPanel();
});
// stop clicks inside panel from bubbling to window
authPanel.addEventListener("click", (e) => {
  e.stopPropagation();
});
authArea.addEventListener("click", (e) => {
  e.stopPropagation();
});

// --- Backend fetch helper: GET /api/conversations/:id ---
async function fetchConversationFromServer() {
  try {
    // ensure we have a userid
    const uid = userid;
    const res = await fetch(`${CRUD_SERVICE_URL}/api/findConversationByUser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: uid }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Network response not ok");
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn("Fetch conv fail", err);
    return fallbackData;
  }
}

async function deleteConversation(cid) {
  try {
    const res = await fetch(`${CRUD_SERVICE_URL}/api/deleteConversationById`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cid }),
      credentials: "include",
    });
    if (!res.ok) {
      console.log("Network response not ok");
      return;
    }
    conversations = conversations.filter((c) => c.id != cid);
    if (currentId == cid) {
      goHome();
    }
    renderList();
  } catch (err) {
    console.warn("Delete conv fail", err);
  }
}

function renderList() {
  convContainer.innerHTML = "";
  conversations.forEach((c) => {
    const el = document.createElement("div");
    el.className = "conv";
    el.dataset.id = c.id;

    // meta (title + snippet)
    const meta = document.createElement("div");
    meta.className = "meta";
    const h = document.createElement("h4");
    h.textContent = c.name;
    const p = document.createElement("p");
    p.textContent = c.edit_time;
    meta.appendChild(h);
    meta.appendChild(p);

    const actions = document.createElement("div");
    actions.className = "actions";

    const trash = document.createElement("div");
    trash.className = "trash-btn";
    trash.type = "button";
    trash.title = "Delete conversation";

    const img = document.createElement("img");
    img.src = "../images/trash-solid-full.svg";
    img.alt = "delete";
    img.className = "trash-icon";
    img.draggable = false;

    trash.appendChild(img);

    trash.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const ok = window.confirm("Are you sure to delete this conversation?");
      if (!ok) return;
      deleteConversation(c.id);
    });

    actions.appendChild(trash);
    el.appendChild(meta);
    el.appendChild(actions);
    el.addEventListener("click", () => selectConversation(c.id, true));

    convContainer.appendChild(el);
  });
  updateSelectedInList();
}

function updateSelectedInList() {
  document
    .querySelectorAll(".conv")
    .forEach((el) =>
      el.classList.toggle("selected", el.dataset.id === currentId)
    );
}

// get id from URL (support /?id= or /chat/:id)
function idFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) return params.get("id");
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts[0] === "chat" && parts[1]) return parts[1];
  return null;
}

// render chat messages into chatArea
function renderMessages(conv) {
  chatArea.innerHTML = "";
  if (!conv || !conv.history) return;
  conv.history.forEach((m) => {
    const mEl = document.createElement("div");
    mEl.className = "message" + (m[0] == "USER" ? " me" : "");
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${m[0]}`;
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = m[1];
    mEl.appendChild(meta);
    mEl.appendChild(body);
    chatArea.appendChild(mEl);
  });
  // scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
}

// select conversation; if push true, update history
async function selectConversation(id, push = false) {
  currentId = id;
  updateSelectedInList();
  // show chat view
  homeView.style.display = "none";
  chatShell.style.display = "flex";

  // push state
  if (push) {
    history.pushState({ id }, "", `/${encodeURIComponent(id)}`);
  }

  // Try to find locally first
  let conv = conversations.find((c) => c.id === id);
  if (conv) {
    chatTitle.textContent = conv.name;
    chatSubtitle.textContent = conv.edit_time || "";
    renderMessages(conv);
  } else {
    goHome();
  }
}

// go home / new chat
function goHome(push = true) {
  currentId = null;
  updateSelectedInList();
  // show home
  chatShell.style.display = "none";
  homeView.style.display = "flex";
  // push clean URL (no id)
  if (push) history.pushState({}, "", "/chat");
}

// create new conversation and optionally send initial message
function createConversation(initialText) {
  const id = crypto.randomUUID();
  const now = new Date();
  const timeStr = now.toLocaleString();
  const name = initialText
    ? initialText.slice(0, 30) + (initialText.length > 30 ? "..." : "")
    : "New conversation";
  const conv = {
    id: id,
    name,
    edit_time: timeStr,
    history: [],
  };
  if (initialText) conv.history.push(["USER", initialText]);
  conversations.unshift(conv); // newest on top
  renderList();
  addNewChat = true;
  return conv;
}

// handle sending from home (creates conversation and opens it)
homeSend.addEventListener("click", () => {
  const text = homeInput.value.trim();
  if (!text) return;
  const conv = createConversation(text);
  homeInput.value = "";
  selectConversation(conv.id, true);
  setTimeout(() => chatInput.focus(), 120);
  const params = { text, history: [] };
  // socket is created in init(); this handler runs later
  socket.emit("message_chatbot", params);
});

// handle send in chat view (append message to existing conversation)
chatSend.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text || !currentId) return;
  const conv = conversations.find((c) => c.id === currentId);
  if (!conv) return;
  const now = new Date().toLocaleString();
  const params = { text, history: conv.history };
  conv.history.push(["USER", text]);
  conv.edit_time = now;
  conversations = conversations.filter((c) => c.id != currentId);
  conversations.unshift(conv);
  renderList();
  renderMessages(conv);
  chatInput.value = "";
  chatInput.focus();
  socket.emit("message_chatbot", params);
});

// All socket listeners will be attached after we open the socket in init()

newChatBtn.addEventListener("click", () => {
  goHome();
  homeInput.focus();
});

window.addEventListener("popstate", (e) => {
  const id = (e.state && e.state.id) || idFromUrl();
  if (id) selectConversation(id, false);
  else goHome(false);
});

(async function init() {
  await getCredential();
  renderAuthArea();
  socket = io();

  socket.on("chunk_response", ({ process_chunk }) => {
    let conv = conversations.find((c) => c.id === currentId);
    if (!conv) {
      const newConv = createConversation("");
      currentId = newConv.id;
      conv = newConv;
      homeView.style.display = "none";
      chatShell.style.display = "flex";
      chatTitle.textContent = conv.name;
      chatSubtitle.textContent = conv.time || "";
      updateSelectedInList();
    }
    const lastIdx = conv.history.length - 1;
    let lastMsg = conv.history[lastIdx];

    const now = new Date().toLocaleString();
    if (!lastMsg || lastMsg[0] !== "BOT") {
      const assistantMsg = ["BOT", process_chunk || ""];
      conv.history.push(assistantMsg);
      lastMsg = assistantMsg;
    } else {
      lastMsg[1] = (lastMsg[1] || "") + (process_chunk || "");
    }
    conv.edit_time = now;
    renderList();
    renderMessages(conv);
  });

  socket.on("done", async () => {
    let conv = conversations.find((c) => c.id === currentId);
    if (!conv) return;
    const lastIdx = conv.history.length - 1;

    if (addNewChat) {
      const convPush = {
        id: conv.id,
        user_id: userid,
        edit_time: conv.edit_time,
        name: conv.name,
        user_text: conv.history[lastIdx - 1][1],
        bot_text: conv.history[lastIdx][1],
      };
      const response = await fetch(`${CRUD_SERVICE_URL}/api/pushConversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convPush),
        credentials: "include",
      });
      if (response.status != 200) {
        console.log(`Push error: ${response.status}`);
      }
    } else {
      const convUpdate = {
        id: conv.id,
        user_text: conv.history[lastIdx - 1][1],
        bot_text: conv.history[lastIdx][1],
        edit_time: conv.edit_time,
      };
      const response = await fetch(`${CRUD_SERVICE_URL}/api/updateConversation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convUpdate),
        credentials: "include",
      });
      if (response.status != 200) {
        console.log(`Update error: ${response.status}`);
      }
    }
    addNewChat = false;
  });

  socket.on("error", (e) => console.error("err", e));

  //  4) Load conversations and route
  conversations = await fetchConversationFromServer();
  renderList();

  const urlId = idFromUrl();
  if (urlId) {
    await selectConversation(urlId, false);
  } else {
    goHome(false);
  }
})();

// Keyboard shortcuts: Enter to send when focused in inputs (Ctrl+Enter for newline)
[homeInput, chatInput].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (el === homeInput) homeSend.click();
      else chatSend.click();
    }
  });
});
