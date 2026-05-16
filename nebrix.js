// ── nebrix.js — shared auth, nav, theme ──────────────────────────────────────

const API = "https://api.nebrixgames.com";

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
    // This is now your main White/Green theme
    dark: { 
        "--bg": "#e2e2e2",       // Light grey background (from home.html)
        "--bg-card": "#ffffff",  // White panels
        "--bg-input": "#ffffff", 
        "--text": "#1a1a1a",     // Dark text
        "--muted": "#767676", 
        "--border": "#cccccc",
        "--nav-bg": "#00b06f"    // Nebrix Green
    }
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
    const navContainer = document.getElementById("nebrix-nav");
    if (!navContainer) return;

    const loggedIn = isLoggedIn();
    const user = getUsername();

    let rightSideHtml = `<button class="btn-login" onclick="showLoginModal()">Login</button>`;
    if (loggedIn && user) {
        rightSideHtml = `
            <span style="color:#fff;font-weight:700;display:flex;align-items:center;padding:0 20px;font-size:0.85rem;text-transform:uppercase;">Logged in as: ${user}</span>
            <button class="btn-login" onclick="logout()" style="background:rgba(0,0,0,0.15);">Logout</button>
        `;
    }

    navContainer.innerHTML = `
        <div class="logo">
            <img src="nebrixlogo.png" alt="Nebrix Logo">
            Nebrix
        </div>
        <div class="nav-links">
            <a href="progress.html" class="${activePage === 'progress' ? 'active' : ''}">Progress</a>
            <a href="documentation.html" class="${activePage === 'docs' ? 'active' : ''}">Docs</a>
            <a href="https://discord.com/invite/XTa4GwaJFY" target="_blank">Discord</a>
        </div>
        <div class="nav-right">
            ${rightSideHtml}
        </div>
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

async function doLogin() {
    const username = document.getElementById("modal-login-user").value.trim();
    const password = document.getElementById("modal-login-pass").value;
    const err      = document.getElementById("auth-error-login");
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
    const err      = document.getElementById("auth-error-register");
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

// FIX 3: Original called GET /profile but never checked the response correctly.
// Now properly clears the stale token if the server says it's invalid, but does
// NOT clear it if the server is simply unreachable (e.g. offline temporarily).
async function redirectIfLoggedIn() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(API + "/profile", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (res.ok) {
            window.location.replace("home.html");
        } else {
            // Token is expired or invalid — wipe it so user sees the login form
            clearSession();
        }
    } catch {
        // Server unreachable — leave the token alone, don't wipe a valid session
        // just because the network is temporarily down.
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
