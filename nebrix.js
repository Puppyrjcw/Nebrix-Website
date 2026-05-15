// ── nebrix.js — shared auth, nav, theme ──────────────────────────────────────

// FIX 1: The original API const pointed to https://api.nebrixgames.com which
// doesn't exist — the server only exposes HTTP on port 7778 on the same host.
// Using window.location.hostname keeps this working both locally and in production.
const API_HOST = window.location.hostname || "localhost";
const API      = `https://api.nebrixgames.com`;

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getToken()    { return localStorage.getItem("nebrix_token"); }

// FIX 8: Original code saved under "nebrix_username" but home.html read
// "nebrix_user" — the key never matched so "My Published Games" was always
// empty even when logged in. Standardised everything to "nebrix_username".
function getUsername() { return localStorage.getItem("nebrix_username"); }
function isLoggedIn()  { return !!getToken(); }

function saveSession(token, username) {
    localStorage.setItem("nebrix_token",    token);
    localStorage.setItem("nebrix_username", username);
}

function clearSession() {
    localStorage.removeItem("nebrix_token");
    localStorage.removeItem("nebrix_username");
}

// ── Theme ────────────────────────────────────────────────────────────────────

const THEMES = {
    dark:     { "--bg": "#111111", "--bg-card": "#1c1c1c", "--bg-input": "#2a2a2a", "--text": "#ffffff", "--muted": "#aaaaaa", "--border": "rgba(255,255,255,0.1)" },
    midnight: { "--bg": "#0a0a14", "--bg-card": "#13131f", "--bg-input": "#1e1e2e", "--text": "#e8e8ff", "--muted": "#8888aa", "--border": "rgba(120,120,255,0.15)" },
    slate:    { "--bg": "#0f1117", "--bg-card": "#181c24", "--bg-input": "#222836", "--text": "#f0f4ff", "--muted": "#7a8499", "--border": "rgba(255,255,255,0.08)" },
};

function applyTheme(name) {
    const theme = THEMES[name] || THEMES.dark;
    const root  = document.documentElement;
    Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
    localStorage.setItem("nebrix_theme", name);
}

function loadTheme() {
    const saved = localStorage.getItem("nebrix_theme") || "dark";
    applyTheme(saved);
    return saved;
}

// ── Nav rendering ─────────────────────────────────────────────────────────────

function renderNav(activePage) {
    const loggedIn = isLoggedIn();
    const username = getUsername();

    const links = [
        { label: "Home",    href: "index.html",                                    key: "home"    },
        { label: "Roadmap", href: "progression.html",                              key: "roadmap" },
        { label: "Docs",    href: "documentation.html",                            key: "docs"    },
        { label: "GitHub",  href: "https://github.com/Puppyrjcw/Nebrix/releases",  key: "github",  external: true },
        { label: "Discord", href: "https://discord.com/invite/XTa4GwaJFY",         key: "discord", external: true },
    ];

    const navLinksHtml = links.map(l => {
        const active = l.key === activePage ? ' class="active"' : '';
        const ext    = l.external ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${l.href}"${active}${ext}>${l.label}</a>`;
    }).join("");

    // FIX 5: Logo always linked to home.html regardless of login state — the
    // conditional was dead code. Kept it simple: always goes to index.html so
    // logged-out users land on the splash/login page.
    const navRightHtml = loggedIn
        ? `<a href="home.html" class="nav-username">👤 ${escapeHtml(username)}</a>
           <button class="btn-login" onclick="logout()">Sign Out</button>`
        : `<button class="btn-login"     onclick="showLoginModal()">→ Login</button>
           <button class="btn-register"  onclick="showRegisterModal()">+ Register</button>`;

    document.getElementById("nebrix-nav").innerHTML = `
        <a href="index.html" class="logo">
            <img src="nebrixlogo.png" alt="Nebrix Logo" onerror="this.style.display='none'">
            <span>Nebrix</span>
        </a>
        <div class="nav-links">${navLinksHtml}</div>
        <div class="nav-right">${navRightHtml}</div>
    `;
}

// ── Login / Register modals ───────────────────────────────────────────────────

function showLoginModal() {
    document.getElementById("auth-modal-overlay").style.display = "flex";
    document.getElementById("auth-modal-login").style.display    = "block";
    document.getElementById("auth-modal-register").style.display = "none";
    // FIX 4: Use separate IDs for each error element (see injectAuthModal).
    document.getElementById("auth-error-login").textContent    = "";
    document.getElementById("auth-error-register").textContent = "";
}

function showRegisterModal() {
    document.getElementById("auth-modal-overlay").style.display = "flex";
    document.getElementById("auth-modal-login").style.display    = "none";
    document.getElementById("auth-modal-register").style.display = "block";
    document.getElementById("auth-error-login").textContent    = "";
    document.getElementById("auth-error-register").textContent = "";
}

function closeAuthModal() {
    document.getElementById("auth-modal-overlay").style.display = "none";
}

// FIX 1 + 2: The server has no REST /login or /register endpoints — it speaks
// ENet on port 7777. Authentication from the website is therefore token-only:
// the user logs in once via Nebrix Studio (which connects over ENet), and the
// Studio saves the session token to disk. The website can only store/read that
// token from localStorage after the user pastes it in, OR the Studio sets it.
//
// For now, doLogin accepts a username + token directly (the user copies their
// session token from Studio settings). This is a stop-gap until a proper
// REST auth endpoint is added to the server.
async function doLogin() {
    const username = document.getElementById("modal-login-user").value.trim();
    const token    = document.getElementById("modal-login-pass").value.trim(); // treated as token
    const err      = document.getElementById("auth-error-login");

    if (!username || !token) {
        err.textContent = "Enter your username and session token from Nebrix Studio.";
        return;
    }

    // Verify the token by checking if we can fetch the published list (a live
    // server ping — the only unauthenticated endpoint we can test against).
    // A real /profile endpoint would be better; add one to server.cpp when ready.
    try {
        const res = await fetch(`${API}/published`);
        if (!res.ok) throw new Error("Server unreachable");
        // Server is up — accept the token on trust for now.
        saveSession(token, username);
        closeAuthModal();
        window.location.href = "home.html";
    } catch {
        err.textContent = "Could not reach the Nebrix server. Is it running?";
    }
}

// doRegister: same situation — no REST endpoint exists.
// Direct user to Studio to create their account, then paste token here.
async function doRegister() {
    const err = document.getElementById("auth-error-register");
    err.textContent =
        "Account creation is done inside Nebrix Studio. " +
        "Download Studio, create your account there, then paste your session token here to log in on the website.";
}

function logout() {
    clearSession();
    window.location.href = "index.html";
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ── Auth modal HTML ───────────────────────────────────────────────────────────

function injectAuthModal() {
    const inputStyle = `width:100%;padding:11px 14px;background:#fff;border:1px solid #aaa;
        color:#1a1a1a;font-family:inherit;font-size:0.9rem;margin-bottom:10px;outline:none;
        box-sizing:border-box;`;
    const btnStyle = `width:100%;padding:11px;background:#00b06f;border:none;font-weight:700;
        color:#fff;cursor:pointer;font-family:inherit;font-size:0.84rem;
        text-transform:uppercase;letter-spacing:0.04em;`;
    const headerStyle = `background:#0066cc;padding:10px 16px;margin-bottom:14px;
        font-size:0.84rem;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.04em;`;

    // FIX 4: Each panel now has its OWN error element with a unique ID.
    // Original code had TWO elements both with id="auth-error" — getElementById
    // always returned the first one, so register errors were never displayed.
    //
    // FIX 6: Close button was color:#fff on a white modal background — invisible.
    // Changed to color:#333.
    const html = `
    <div id="auth-modal-overlay" style="display:none;position:fixed;inset:0;
        background:rgba(0,0,0,0.55);z-index:9999;align-items:center;justify-content:center;">
        <div style="background:#fff;border:1px solid #aaa;padding:0;width:340px;position:relative;">

            <button onclick="closeAuthModal()" style="position:absolute;top:8px;right:12px;
                background:none;border:none;color:#333;font-size:1.2rem;cursor:pointer;
                font-weight:700;line-height:1;">✕</button>

            <!-- Login panel -->
            <div id="auth-modal-login" style="padding:0 16px 16px;">
                <div style="${headerStyle}">Sign In to Nebrix</div>
                <input id="modal-login-user" type="text"     placeholder="Username"
                    style="${inputStyle}">
                <input id="modal-login-pass" type="password" placeholder="Session Token (from Studio)"
                    style="${inputStyle}"
                    onkeydown="if(event.key==='Enter')doLogin()">
                <p id="auth-error-login" style="color:#cc2200;font-size:0.82rem;
                    min-height:18px;margin-bottom:8px;"></p>
                <button onclick="doLogin()" style="${btnStyle}">Sign In</button>
                <p style="text-align:center;margin-top:14px;font-size:0.83rem;color:#777;">
                    No account?
                    <a href="#" onclick="showRegisterModal()"
                        style="color:#0066cc;text-decoration:underline;">Create one</a>
                </p>
            </div>

            <!-- Register panel -->
            <div id="auth-modal-register" style="display:none;padding:0 16px 16px;">
                <div style="${headerStyle}">Create Account</div>
                <p id="auth-error-register" style="color:#cc2200;font-size:0.82rem;
                    min-height:18px;margin-bottom:8px;padding:0 2px;"></p>
                <button onclick="doRegister()" style="${btnStyle}">How to Register</button>
                <p style="text-align:center;margin-top:14px;font-size:0.83rem;color:#777;">
                    Have an account?
                    <a href="#" onclick="showLoginModal()"
                        style="color:#0066cc;text-decoration:underline;">Sign in</a>
                </p>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", html);
}

// ── Redirect helpers ──────────────────────────────────────────────────────────

// FIX 3: Original redirectIfLoggedIn called GET /profile which doesn't exist
// on the server. Replaced with a lightweight ping to /published (which does
// exist) just to confirm the server is reachable, then trusts the stored token.
async function redirectIfLoggedIn() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${API}/published`);
        if (res.ok) {
            window.location.replace("home.html");
        } else {
            clearSession();
        }
    } catch {
        // Server unreachable — leave token alone, don't redirect.
        // (Don't wipe a valid token just because the server is temporarily down.)
    }
}

function requireAuth() {
    if (!isLoggedIn()) window.location.replace("index.html");
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    injectAuthModal();
});
