// ── nebrix.js — shared auth, nav, theme ──────────────────────────────────────

const API = "https://nebrixgames.com";

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getToken()    { return localStorage.getItem("nebrix_token"); }
function getUsername() { return localStorage.getItem("nebrix_username"); }
function isLoggedIn()  { return !!getToken(); }

function saveSession(token, username) {
    localStorage.setItem("nebrix_token", token);
    localStorage.setItem("nebrix_username", username);
}

function clearSession() {
    localStorage.removeItem("nebrix_token");
    localStorage.removeItem("nebrix_username");
}

// ── Theme ────────────────────────────────────────────────────────────────────

const THEMES = {
    dark:  { "--bg": "#111111", "--bg-card": "#1c1c1c", "--bg-input": "#2a2a2a", "--text": "#ffffff", "--muted": "#aaaaaa", "--border": "rgba(255,255,255,0.1)" },
    midnight: { "--bg": "#0a0a14", "--bg-card": "#13131f", "--bg-input": "#1e1e2e", "--text": "#e8e8ff", "--muted": "#8888aa", "--border": "rgba(120,120,255,0.15)" },
    slate: { "--bg": "#0f1117", "--bg-card": "#181c24", "--bg-input": "#222836", "--text": "#f0f4ff", "--muted": "#7a8499", "--border": "rgba(255,255,255,0.08)" },
};

function applyTheme(name) {
    const theme = THEMES[name] || THEMES.dark;
    const root = document.documentElement;
    Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
    localStorage.setItem("nebrix_theme", name);
}

function loadTheme() {
    const saved = localStorage.getItem("nebrix_theme") || "dark";
    applyTheme(saved);
    return saved;
}

// ── Nav rendering ─────────────────────────────────────────────────────────────
// Call renderNav(activePage) where activePage is one of:
// "home" | "roadmap" | "docs" | "github" | "discord"

function renderNav(activePage) {
    const loggedIn = isLoggedIn();
    const username = getUsername();

    const links = [
        { label: "Home",     href: "index.html",    key: "home"    },
        { label: "Roadmap",  href: "progression.html", key: "roadmap" },
        { label: "Docs",     href: "documentation.html", key: "docs" },
        { label: "GitHub",   href: "https://github.com/Puppyrjcw/Nebrix/releases", key: "github", external: true },
        { label: "Discord",  href: "https://discord.com/invite/XTa4GwaJFY", key: "discord", external: true },
    ];

    const navLinksHtml = links.map(l => {
        const active = l.key === activePage ? ' class="active"' : '';
        const ext = l.external ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${l.href}"${active}${ext}>${l.label}</a>`;
    }).join("");

    const navRightHtml = loggedIn
        ? `<a href="home.html" class="nav-username">👤 ${username}</a>
           <button class="btn-login" onclick="logout()">Sign Out</button>`
        : `<button class="btn-login" onclick="showLoginModal()">→ Login</button>
           <button class="btn-register" onclick="showRegisterModal()">+ Register</button>`;

    document.getElementById("nebrix-nav").innerHTML = `
        <a href="${loggedIn ? 'home.html' : 'index.html'}" class="logo">
            <img src="nebrixlogo.png" alt="Nebrix Logo" onerror="this.style.display='none'">
            <span>Nebrix</span>
        </a>
        <div class="nav-links">${navLinksHtml}</div>
        <div class="nav-right">${navRightHtml}</div>
    `;
}

// ── Login modal ──────────────────────────────────────────────────────────────

function showLoginModal() {
    document.getElementById("auth-modal-overlay").style.display = "flex";
    document.getElementById("auth-modal-login").style.display = "block";
    document.getElementById("auth-modal-register").style.display = "none";
    document.getElementById("auth-error").textContent = "";
}

function showRegisterModal() {
    document.getElementById("auth-modal-overlay").style.display = "flex";
    document.getElementById("auth-modal-login").style.display = "none";
    document.getElementById("auth-modal-register").style.display = "block";
    document.getElementById("auth-error").textContent = "";
}

function closeAuthModal() {
    document.getElementById("auth-modal-overlay").style.display = "none";
}

async function doLogin() {
    const username = document.getElementById("modal-login-user").value.trim();
    const password = document.getElementById("modal-login-pass").value;
    const err = document.getElementById("auth-error");
    if (!username || !password) { err.textContent = "Please fill in all fields."; return; }

    try {
        const res = await fetch(API + "/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.token) {
            saveSession(data.token, username);
            closeAuthModal();
            window.location.href = "home.html";
        } else {
            err.textContent = data.error || "Invalid credentials.";
        }
    } catch { err.textContent = "Could not reach server."; }
}

async function doRegister() {
    const username = document.getElementById("modal-reg-user").value.trim();
    const email    = document.getElementById("modal-reg-email").value.trim();
    const password = document.getElementById("modal-reg-pass").value;
    const err = document.getElementById("auth-error");
    if (!username || !email || !password) { err.textContent = "Please fill in all fields."; return; }

    try {
        const res = await fetch(API + "/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.message) {
            // Auto-login after register
            const loginRes = await fetch(API + "/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const loginData = await loginRes.json();
            if (loginData.token) {
                saveSession(loginData.token, username);
                closeAuthModal();
                window.location.href = "home.html";
            } else {
                err.textContent = "Account created! Please log in.";
                showLoginModal();
            }
        } else {
            err.textContent = data.error || "Registration failed.";
        }
    } catch { err.textContent = "Could not reach server."; }
}

function logout() {
    clearSession();
    window.location.href = "index.html";
}

// ── Auth modal HTML (injected into every page) ───────────────────────────────

function injectAuthModal() {
    const html = `
    <div id="auth-modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:1000;align-items:center;justify-content:center;">
        <div style="background:#1c1c1c;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:2rem;width:340px;position:relative;">
            <button onclick="closeAuthModal()" style="position:absolute;top:14px;right:14px;background:none;border:none;color:#888;font-size:1.2rem;cursor:pointer;">✕</button>

            <div id="auth-modal-login">
                <h2 style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:1.2rem;">Sign In to Nebrix</h2>
                <input id="modal-login-user" type="text" placeholder="Username" style="width:100%;padding:11px 14px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-family:inherit;font-size:0.9rem;margin-bottom:10px;outline:none;">
                <input id="modal-login-pass" type="password" placeholder="Password" style="width:100%;padding:11px 14px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-family:inherit;font-size:0.9rem;margin-bottom:10px;outline:none;" onkeydown="if(event.key==='Enter')doLogin()">
                <p id="auth-error" style="color:#ff4d7e;font-size:0.82rem;min-height:18px;margin-bottom:8px;"></p>
                <button onclick="doLogin()" style="width:100%;padding:11px;background:#3ecf5a;border:none;border-radius:8px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit;font-size:0.9rem;">Sign In</button>
                <p style="text-align:center;margin-top:14px;font-size:0.83rem;color:#777;">No account? <a href="#" onclick="showRegisterModal()" style="color:#3ecf5a;">Create one</a></p>
            </div>

            <div id="auth-modal-register" style="display:none;">
                <h2 style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:1.2rem;">Create Account</h2>
                <input id="modal-reg-user" type="text" placeholder="Username" style="width:100%;padding:11px 14px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-family:inherit;font-size:0.9rem;margin-bottom:10px;outline:none;">
                <input id="modal-reg-email" type="email" placeholder="Email" style="width:100%;padding:11px 14px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-family:inherit;font-size:0.9rem;margin-bottom:10px;outline:none;">
                <input id="modal-reg-pass" type="password" placeholder="Password" style="width:100%;padding:11px 14px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-family:inherit;font-size:0.9rem;margin-bottom:10px;outline:none;">
                <p id="auth-error" style="color:#ff4d7e;font-size:0.82rem;min-height:18px;margin-bottom:8px;"></p>
                <button onclick="doRegister()" style="width:100%;padding:11px;background:#3ecf5a;border:none;border-radius:8px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit;font-size:0.9rem;">Create Account</button>
                <p style="text-align:center;margin-top:14px;font-size:0.83rem;color:#777;">Have an account? <a href="#" onclick="showLoginModal()" style="color:#3ecf5a;">Sign in</a></p>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
}

// ── Redirect logic ───────────────────────────────────────────────────────────

// Call on index.html — if already logged in, go to home
function redirectIfLoggedIn() {
    if (isLoggedIn()) window.location.replace("home.html");
}

// Call on home/settings — if not logged in, go to index
function requireAuth() {
    if (!isLoggedIn()) window.location.replace("index.html");
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    injectAuthModal();
});
