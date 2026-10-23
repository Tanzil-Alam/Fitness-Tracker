// Profile and Heatmap Management for FitPulse
const STORAGE_KEY_LOGS = 'minimal_fitness_logs_v3';
const STORAGE_KEY_USER = 'fitpulse_user_profile';

const DEFAULT_USER = {
    fullname: "Jane Doe",
    username: "jdoemobbin",
    bio: "I'm a fitness enthusiast with a passion for long-distance running. My current goal is a sub-3 hour marathon. Tracking my workouts to build consistent habits.",
    website: "https://mobbin.com/",
    twitter: "@Jdddmobbin",
    instagram: "jdoe.mobbin",
    followers: 0,
    following: 1,
    avatar: null,
    isLoggedIn: true
};
function checkUserRegistration() {
    const isRegistered = localStorage.getItem('userRegistered') === 'true';
    const loginCard = document.getElementById('first-time-login-card');
    const profileSidebar = document.querySelector('.profile-sidebar');
    const profileContent = document.querySelector('.profile-content');
    const bannerWrapper = document.querySelector('.banner-wrapper');

    if (!isRegistered) {
        // Show login/setup form, hide profile contents
        if (loginCard) loginCard.style.display = 'block';
        if (profileSidebar) profileSidebar.style.display = 'none';
        if (profileContent) profileContent.style.display = 'none';
        if (bannerWrapper) bannerWrapper.style.display = 'none';
    } else {
        // User exists: show profile
        if (loginCard) loginCard.style.display = 'none';
        if (profileSidebar) profileSidebar.style.display = 'block';
        if (profileContent) profileContent.style.display = 'flex';
        if (bannerWrapper) bannerWrapper.style.display = 'flex';
        renderUserProfile();
    }
}

// Handle First-Time Form Submission
const onboardingForm = document.getElementById('onboarding-form');
if (onboardingForm) {
    onboardingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('setup-name').value.trim();
        const email = document.getElementById('setup-email').value.trim();
        const age = document.getElementById('setup-age').value.trim();
        const height = document.getElementById('setup-height').value.trim();
        const weight = document.getElementById('setup-weight').value.trim();

        // 1. Save individual fields to localStorage
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userAge', age);
        localStorage.setItem('userHeight', height);
        localStorage.setItem('userWeight', weight);
        localStorage.setItem('userRegistered', 'true');

        // 2. Immediately update currentUser and render to screen
        currentUser.fullname = name;
        currentUser.username = email ? email.split('@')[0] : name.toLowerCase().replace(/\s+/g, '');
        currentUser.isLoggedIn = true;
        saveUserData();
        loadUserData();
        renderUserProfile();

        // 3. Reveal profile page
        checkUserRegistration();
    });
}
let currentUser = { ...DEFAULT_USER };
let logs = [];

// DOM Elements
const displayFullname = document.getElementById('display-fullname');
const displayUsername = document.getElementById('display-username');
const displayBio = document.getElementById('display-bio');
const displayWebsite = document.getElementById('display-website');
const displayTwitter = document.getElementById('display-twitter');
const displayInstagram = document.getElementById('display-instagram');
const displayFollowers = document.getElementById('display-followers');
const displayFollowing = document.getElementById('display-following');
const userAvatarImg = document.getElementById('user-avatar-img');
const btnAuthToggle = document.getElementById('btn-auth-toggle');

const editModal = document.getElementById('edit-profile-modal');
const openEditBtn = document.getElementById('open-edit-modal');
const closeEditBtn = document.getElementById('close-edit-modal');
const editForm = document.getElementById('edit-profile-form');

const authModal = document.getElementById('auth-modal');
const closeAuthBtn = document.getElementById('close-auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-modal-title');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleText = document.getElementById('auth-toggle-text');
const authNameGroup = document.getElementById('auth-name-group');
const authSubmitBtn = document.getElementById('btn-auth-submit');

const tooltip = document.getElementById('tooltip');
let isSignUpMode = false;

// 24-hour Heatmap elements
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const grid24 = document.getElementById('heatmap-grid');

function initProfile() {
    loadUserData();
    loadLogs();
    checkUserRegistration();
    build24HourHeatmap();
    update24HourHeatmapActivity();
    setupProfileEvents();
}

// User Profile Management - Reads from both login.html and custom profile
function loadUserData() {
    const reg = localStorage.getItem('userRegistered');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    const bio = localStorage.getItem('userBio');
    const avatar = localStorage.getItem('userProfileImage');

    try {
        const saved = localStorage.getItem(STORAGE_KEY_USER);
        if (saved) {
            currentUser = { ...DEFAULT_USER, ...JSON.parse(saved) };
        } else {
            currentUser = { ...DEFAULT_USER };
        }
    } catch (e) {
        currentUser = { ...DEFAULT_USER };
    }

    if (reg === 'true' && name) {
        currentUser.fullname = name;
        currentUser.username = email ? email.split('@')[0] : (name.toLowerCase().replace(/\s+/g, '') || 'jdoemobbin');
        currentUser.bio = (bio && bio !== 'ADD BIO') ? bio : currentUser.bio;
        if (avatar && avatar !== 'default-profile.png') {
            currentUser.avatar = avatar;
        }
        currentUser.isLoggedIn = true;
    }
}

function saveUserData() {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    localStorage.setItem('userName', currentUser.fullname);
    localStorage.setItem('userBio', currentUser.bio);
    if (currentUser.avatar) {
        localStorage.setItem('userProfileImage', currentUser.avatar);
    }
}

function renderUserProfile() {
    displayFullname.textContent = currentUser.fullname || 'Jane Doe';
    displayUsername.textContent = currentUser.username || 'jdoemobbin';
    displayBio.textContent = currentUser.bio || '';

    if (displayWebsite) {
        displayWebsite.textContent = currentUser.website || 'https://mobbin.com/';
        displayWebsite.href = currentUser.website || '#';
    }
    if (displayTwitter) {
        displayTwitter.textContent = currentUser.twitter || '@Jdddmobbin';
        displayTwitter.href = currentUser.twitter ? `https://twitter.com/${currentUser.twitter.replace('@', '')}` : '#';
    }
    if (displayInstagram) {
        displayInstagram.textContent = currentUser.instagram || 'jdoe.mobbin';
        displayInstagram.href = currentUser.instagram ? `https://instagram.com/${currentUser.instagram}` : '#';
    }

    if (displayFollowers) displayFollowers.textContent = currentUser.followers ?? 0;
    if (displayFollowing) displayFollowing.textContent = currentUser.following ?? 1;

    if (currentUser.avatar && userAvatarImg) {
        userAvatarImg.src = currentUser.avatar;
    } else if (userAvatarImg) {
        userAvatarImg.src = 'default-profile.png';
    }

    if (btnAuthToggle) {
        btnAuthToggle.textContent = currentUser.isLoggedIn ? 'Logout' : 'Login';
    }
}

function loadLogs() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_LOGS);
        logs = saved ? JSON.parse(saved) : [];
    } catch (e) {
        logs = [];
    }
}

// Build Year Consistency Heatmap (Months across top, Mon/Wed/Fri on left)
function renderYearConsistencyHeatmap() {
    const container = document.getElementById('year-heatmap');
    if (!container) return;
    container.innerHTML = '';

    const today = new Date();
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

    // Header row for months
    const monthHeader = document.createElement('div');
    monthHeader.className = 'year-month-labels';
    monthHeader.innerHTML = '<div></div>'; // empty for day label column
    months.forEach(m => {
        const span = document.createElement('div');
        span.textContent = m;
        monthHeader.appendChild(span);
    });
    container.appendChild(monthHeader);

    // Body with day labels on left and 52-week column grid
    const gridBody = document.createElement('div');
    gridBody.className = 'year-grid-body';

    // Day labels
    const dayLabelsDiv = document.createElement('div');
    dayLabelsDiv.className = 'year-day-labels';
    dayLabelsDiv.innerHTML = `
        <div></div>
        <div>Mon</div>
        <div></div>
        <div>Wed</div>
        <div></div>
        <div>Fri</div>
        <div></div>
    `;
    gridBody.appendChild(dayLabelsDiv);

    // Prepare date lookup for logs
    const logDateMap = {};
    logs.forEach(l => {
        let dt;
        if (l.timestamp) {
            dt = new Date(l.timestamp);
        } else {
            dt = new Date();
        }
        const dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        logDateMap[dateKey] = (logDateMap[dateKey] || 0) + (l.seconds || 30);
    });

    // Generate 48 weeks
    const weeksContainer = document.createElement('div');
    weeksContainer.className = 'year-weeks-container';

    const numWeeks = 48;
    const startDate = new Date();
    startDate.setDate(today.getDate() - (numWeeks * 7));

    // Align to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let w = 0; w < numWeeks; w++) {
        const weekCol = document.createElement('div');
        weekCol.className = 'year-week-col';

        for (let d = 0; d < 7; d++) {
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + (w * 7) + d);

            const cell = document.createElement('div');
            cell.className = 'year-cell';

            const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
            const totalSec = logDateMap[dateKey] || 0;

            let lvl = 'lvl-0';
            if (cellDate > today) {
                lvl = 'lvl-0';
            } else if (totalSec > 0) {
                if (totalSec >= 1200) lvl = 'lvl-3';
                else if (totalSec >= 300) lvl = 'lvl-2';
                else lvl = 'lvl-1';
            } else {
                // Populate sample consistency pattern for demo consistency matching design
                if ((d === 1 || d === 3 || d === 5) && cellDate <= today) {
                    lvl = (w % 3 === 0) ? 'lvl-3' : (w % 2 === 0 ? 'lvl-2' : 'lvl-1');
                }
            }

            cell.classList.add(lvl);
            cell.dataset.date = cellDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            cell.dataset.activity = totalSec > 0 ? `${Math.round(totalSec / 60)} min logged` : (lvl !== 'lvl-0' ? 'Active session' : 'No workout');

            cell.addEventListener('mouseover', (e) => {
                tooltip.innerHTML = `<strong>${cell.dataset.date}</strong><br>${cell.dataset.activity}`;
                tooltip.style.display = 'block';
            });
            cell.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.clientX + 14) + 'px';
                tooltip.style.top = (e.clientY + 14) + 'px';
            });
            cell.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });

            weekCol.appendChild(cell);
        }
        weeksContainer.appendChild(weekCol);
    }

    gridBody.appendChild(weeksContainer);
    container.appendChild(gridBody);
}

// Render Workout Activities Breakdown & Progress
function renderWorkoutActivities() {
    const summary = document.getElementById('activities-summary');
    const fill = document.getElementById('activity-fill');
    if (!summary || !fill) return;

    const totalLogs = logs.length;
    let totalSeconds = logs.reduce((acc, l) => acc + (l.seconds || 0), 0);

    const counts = {};
    logs.forEach(l => {
        counts[l.name] = (counts[l.name] || 0) + 1;
    });

    let topExercise = 'Running';
    let maxCount = 0;
    for (const [name, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            topExercise = name;
        }
    }

    const totalMinutes = Math.round(totalSeconds / 60);
    const progressPct = Math.min(100, Math.max(25, totalLogs > 0 ? (totalLogs * 10) : 78));
    fill.style.width = `${progressPct}%`;

    summary.innerHTML = `
        <div>Total Sessions: <strong>${totalLogs || 14}</strong></div>
        <div>Total Time: <strong>${totalMinutes || 185} mins</strong></div>
        <div>Primary Activity: <strong>${topExercise}</strong></div>
        <div>Current Streak: <strong>5 days</strong></div>
    `;
}

// 24-Hour Weekly Heatmap (Moved from Home)
function getHourRangeLabel(h) {
    const startHour12 = h % 12 === 0 ? 12 : h % 12;
    const startAmPm = h < 12 ? 'AM' : 'PM';
    const nextH = (h + 1) % 24;
    const endHour12 = nextH % 12 === 0 ? 12 : nextH % 12;
    const endAmPm = nextH < 12 ? 'AM' : 'PM';
    return `${startHour12} ${startAmPm}–${endHour12} ${endAmPm}`;
}

function build24HourHeatmap() {
    if (!grid24) return;
    grid24.innerHTML = '';

    const emptyCorner = document.createElement('div');
    emptyCorner.className = 'hour-header-cell';
    grid24.appendChild(emptyCorner);

    for (let h = 0; h < 24; h++) {
        const headerCell = document.createElement('div');
        headerCell.className = 'hour-header-cell';
        if (h % 3 === 0) {
            const h12 = h % 12 === 0 ? 12 : h % 12;
            const ampm = h < 12 ? 'AM' : 'PM';
            headerCell.textContent = `${h12}${ampm}`;
        }
        grid24.appendChild(headerCell);
    }

    for (let d = 0; d < 7; d++) {
        const dayLabel = document.createElement('div');
        dayLabel.className = 'day-label-cell';
        dayLabel.textContent = dayLabels[d];
        grid24.appendChild(dayLabel);

        for (let h = 0; h < 24; h++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.day = d;
            cell.dataset.dayName = dayFullNames[d];
            cell.dataset.hour = h;
            cell.dataset.hourLabel = getHourRangeLabel(h);
            cell.dataset.seconds = 0;
            grid24.appendChild(cell);
        }
    }

    const now = new Date();
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const monthLabel = document.getElementById('month-label');
    if (monthLabel) monthLabel.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function update24HourHeatmapActivity() {
    if (!grid24) return;
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('low', 'mid', 'high');
        c.dataset.seconds = 0;
    });

    let totalAllSeconds = 0;
    let sessionCount = 0;
    const hourMap = {};

    logs.forEach(log => {
        const s = log.seconds || 0;
        if (s > 0) {
            totalAllSeconds += s;
            sessionCount++;

            let d = log.dayIdx;
            let h = log.hour;
            if (d === undefined || h === undefined) {
                const dt = log.timestamp ? new Date(log.timestamp) : new Date();
                d = (dt.getDay() + 6) % 7;
                h = dt.getHours();
            }
            const key = `${d}_${h}`;
            hourMap[key] = (hourMap[key] || 0) + s;
        }
    });

    const avgSeconds = sessionCount > 0 ? Math.round(totalAllSeconds / sessionCount) : 0;

    document.querySelectorAll('.cell').forEach(cell => {
        const d = cell.dataset.day;
        const h = cell.dataset.hour;
        const key = `${d}_${h}`;
        const sec = hourMap[key] || 0;

        cell.dataset.seconds = sec;

        if (sec > 0) {
            let intensityClass = 'mid';
            if (sessionCount > 1) {
                if (sec < 0.75 * avgSeconds) {
                    intensityClass = 'low';
                } else if (sec > 1.25 * avgSeconds) {
                    intensityClass = 'high';
                } else {
                    intensityClass = 'mid';
                }
            } else {
                intensityClass = sec >= 300 ? 'high' : 'mid';
            }
            cell.classList.add(intensityClass);
        }
    });
}

function formatDisplayDuration(s) {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    return remSec > 0 ? `${m}m ${remSec}s` : `${m}m`;
}

// Events & Modals
function setupProfileEvents() {
    // Edit Profile Modal
    openEditBtn.addEventListener('click', () => {
        document.getElementById('input-fullname').value = currentUser.fullname || '';
        document.getElementById('input-username').value = currentUser.username || '';
        document.getElementById('input-bio').value = currentUser.bio || '';
        editModal.classList.add('active');
    });

    closeEditBtn.addEventListener('click', () => {
        editModal.classList.remove('active');
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser.fullname = document.getElementById('input-fullname').value.trim();
        currentUser.username = document.getElementById('input-username').value.trim();
        currentUser.bio = document.getElementById('input-bio').value.trim();

        saveUserData();
        renderUserProfile();
        editModal.classList.remove('active');
    });

    // Login / Logout / Register
btnAuthToggle.addEventListener('click', () => {
    if (currentUser.isLoggedIn) {
        // Logout
        currentUser.isLoggedIn = false;
        localStorage.removeItem('userRegistered');
        saveUserData();
        renderUserProfile();
    } else {
        // Go to login page or open modal
        window.location.href = 'login.html';
    }
});

closeAuthBtn.addEventListener('click', () => {
    authModal.classList.remove('active');
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailOrUser = document.getElementById('auth-email').value.trim();
    const fullNameInput = document.getElementById('auth-fullname').value.trim();

    currentUser.isLoggedIn = true;
    if (fullNameInput) {
        currentUser.fullname = fullNameInput;
    }
    if (emailOrUser) {
        currentUser.username = emailOrUser.split('@')[0];
    }
    localStorage.setItem('userRegistered', 'true');
    saveUserData();
    renderUserProfile();
    authModal.classList.remove('active');
});

// Tooltip for 24-hr heatmap
if (grid24) {
    grid24.addEventListener('mouseover', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        const sec = parseInt(cell.dataset.seconds || 0, 10);
        const timeStr = sec > 0 ? formatDisplayDuration(sec) : '0m';
        const dayName = cell.dataset.dayName || '';
        const hourLabel = cell.dataset.hourLabel || '';
        tooltip.innerHTML = `${dayName}, ${hourLabel} · ${timeStr}`;
        tooltip.style.display = 'block';
    });

    grid24.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY + 14) + 'px';
    });

    grid24.addEventListener('mouseout', (e) => {
        if (e.target.closest('.cell')) {
            tooltip.style.display = 'none';
        }
    });
}

// AI Assistant
setupAiAssistant();
}

// AI Assistant with Vercel API, local fallback, and chat persistence
function setupAiAssistant() {
    const aiBtn = document.getElementById("ai-assistant-btn");
    const aiOverlay = document.getElementById("ai-chatbox-overlay");
    const aiClose = document.getElementById("close-ai-chat");
    const aiSend = document.getElementById("ai-chat-send");
    const aiInput = document.getElementById("ai-chat-input");
    const aiMessages = document.getElementById("ai-chat-messages");

    if (!aiBtn || !aiOverlay) return;

    // ---- Chat Persistence (sessionStorage) ----
    const CHAT_STORAGE_KEY = 'fitpulse_chat_history';

    function saveChatHistory() {
        if (!aiMessages) return;
        const msgs = [];
        aiMessages.querySelectorAll('.ai-msg-user, .ai-msg-bot').forEach(el => {
            msgs.push({
                text: el.innerText,
                sender: el.classList.contains('ai-msg-user') ? 'user' : 'bot'
            });
        });
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs));
    }

    function restoreChatHistory() {
        if (!aiMessages) return;
        try {
            const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
            if (!saved) return;
            const msgs = JSON.parse(saved);
            if (!msgs.length) return;
            // Clear the default welcome message and replace with saved history
            aiMessages.innerHTML = '';
            msgs.forEach(m => {
                const div = document.createElement('div');
                div.className = m.sender === 'user' ? 'ai-msg-user' : 'ai-msg-bot';
                div.innerText = m.text;
                aiMessages.appendChild(div);
            });
            aiMessages.scrollTop = aiMessages.scrollHeight;
        } catch (_) {}
    }

    // Restore chat on page load
    restoreChatHistory();

    aiBtn.addEventListener("click", () => {
        aiOverlay.style.display = "flex";
    });

    aiClose.addEventListener("click", () => {
        aiOverlay.style.display = "none";
    });

    const appendMessage = (text, sender) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = sender === "user" ? "ai-msg-user" : "ai-msg-bot";
        msgDiv.innerText = text;
        aiMessages.appendChild(msgDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;
        saveChatHistory();
    };

    const sendToGemini = async (userText) => {
        appendMessage(userText, "user");
        aiInput.value = "";

        const loadingDiv = document.createElement("div");
        loadingDiv.className = "ai-msg-bot";
        loadingDiv.innerText = "Thinking...";
        aiMessages.appendChild(loadingDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;

        // Try Vercel Serverless Function first
        try {
            const apiRes = await fetch('/api/chat', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText })
            });

            if (apiRes.status !== 404) {
                const apiData = await apiRes.json();
                if (loadingDiv.parentNode) aiMessages.removeChild(loadingDiv);
                if (apiRes.ok && apiData.reply) {
                    appendMessage(apiData.reply, "bot");
                    return;
                } else if (apiData.error) {
                    appendMessage(apiData.error, "bot");
                    return;
                }
            }
        } catch (e) { }

        // Fallback key check
        const apiKey = window.CONFIG?.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            if (loadingDiv.parentNode) aiMessages.removeChild(loadingDiv);
            appendMessage("AI assistant requires GEMINI_API_KEY. Configure it on Vercel or in config.js.", "bot");
            return;
        }

        const uName = localStorage.getItem('userName') || 'User';
        const uAge = localStorage.getItem('userAge') ? `${localStorage.getItem('userAge')} years old` : 'unspecified age';
        const uHeight = localStorage.getItem('userHeight') ? `${localStorage.getItem('userHeight')} cm` : 'unspecified height';
        const uWeight = localStorage.getItem('userWeight') ? `${localStorage.getItem('userWeight')} kg` : 'unspecified weight';

        const systemPrompt = `You are the AI assistant inside FitPulse, an Activity Heatmap & Fitness Tracker app. You are speaking to ${uName} (${uAge}, Height: ${uHeight}, Weight: ${uWeight}). Keep answers short and fitness-focused (2-3 sentences max).`;
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: userText }] }]
                })
            });
            const data = await res.json();
            if (loadingDiv.parentNode) aiMessages.removeChild(loadingDiv);
            if (data.candidates && data.candidates[0].content) {
                appendMessage(data.candidates[0].content.parts[0].text, "bot");
            } else {
                appendMessage("Sorry, could not process request.", "bot");
            }
        } catch (err) {
            if (loadingDiv.parentNode) aiMessages.removeChild(loadingDiv);
            appendMessage("Error connecting to Gemini API.", "bot");
        }
    };

    if (aiSend && aiInput) {
        aiSend.addEventListener("click", () => {
            const text = aiInput.value.trim();
            if (text) sendToGemini(text);
        });

        aiInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const text = aiInput.value.trim();
                if (text) sendToGemini(text);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", initProfile);
