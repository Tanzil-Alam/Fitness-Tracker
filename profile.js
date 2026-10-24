(() => {
const STORAGE_KEY_LOGS = 'minimal_fitness_logs_v3';
const STORAGE_KEY_USER = 'fitpulse_user_profile';

const DEFAULT_USER = {
    fullname: "Athlete",
    username: "athlete",
    bio: "",
    website: "",
    twitter: "",
    instagram: "",
    followers: 0,
    following: 0,
    avatar: null,
    isLoggedIn: false
};
function checkUserRegistration() {
    const isRegistered = localStorage.getItem('userRegistered') === 'true';
    const loginCard = document.getElementById('first-time-login-card');
    const profileSidebar = document.querySelector('.profile-sidebar');
    const profileContent = document.querySelector('.profile-content');
    const bannerWrapper = document.querySelector('.banner-wrapper');

    if (!isRegistered) {
        if (loginCard) loginCard.style.display = 'block';
        if (profileSidebar) profileSidebar.style.display = 'none';
        if (profileContent) profileContent.style.display = 'none';
        if (bannerWrapper) bannerWrapper.style.display = 'none';
    } else {
        if (loginCard) loginCard.style.display = 'none';
        if (profileSidebar) profileSidebar.style.display = 'block';
        if (profileContent) profileContent.style.display = 'flex';
        if (bannerWrapper) bannerWrapper.style.display = 'flex';
        renderUserProfile();
    }
}

const onboardingForm = document.getElementById('onboarding-form');
if (onboardingForm) {
    onboardingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('setup-name').value.trim();
        const email = document.getElementById('setup-email').value.trim();
        const age = document.getElementById('setup-age').value.trim();
        const height = document.getElementById('setup-height').value.trim();
        const weight = document.getElementById('setup-weight').value.trim();

        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userAge', age);
        localStorage.setItem('userHeight', height);
        localStorage.setItem('userWeight', weight);
        localStorage.setItem('userRegistered', 'true');

        currentUser.fullname = name;
        currentUser.username = email ? email.split('@')[0] : name.toLowerCase().replace(/\s+/g, '');
        currentUser.isLoggedIn = true;
        saveUserData();
        loadUserData();
        renderUserProfile();

        checkUserRegistration();
        window.dispatchEvent(new Event('fitpulse:user-registered'));
    });
}
let currentUser = { ...DEFAULT_USER };
let logs = [];

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
        currentUser.username = email ? email.split('@')[0] : (name.toLowerCase().replace(/\s+/g, '') || 'athlete');
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
    displayFullname.textContent = currentUser.fullname || 'Athlete';
    displayUsername.textContent = currentUser.username || 'athlete';
    displayBio.textContent = currentUser.bio || '';

    if (displayWebsite) {
        displayWebsite.textContent = currentUser.website || '';
        displayWebsite.href = currentUser.website || '#';
    }
    if (displayTwitter) {
        displayTwitter.textContent = currentUser.twitter || '';
        displayTwitter.href = currentUser.twitter ? `https://twitter.com/${currentUser.twitter.replace('@', '')}` : '#';
    }
    if (displayInstagram) {
        displayInstagram.textContent = currentUser.instagram || '';
        displayInstagram.href = currentUser.instagram ? `https://instagram.com/${currentUser.instagram}` : '#';
    }

    if (displayFollowers) displayFollowers.textContent = currentUser.followers ?? 0;
    if (displayFollowing) displayFollowing.textContent = currentUser.following ?? 0;

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

function renderYearConsistencyHeatmap() {
    const container = document.getElementById('year-heatmap');
    if (!container) return;
    container.innerHTML = '';

    const today = new Date();
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

    const monthHeader = document.createElement('div');
    monthHeader.className = 'year-month-labels';
    monthHeader.innerHTML = '<div></div>';
    months.forEach(m => {
        const span = document.createElement('div');
        span.textContent = m;
        monthHeader.appendChild(span);
    });
    container.appendChild(monthHeader);

    const gridBody = document.createElement('div');
    gridBody.className = 'year-grid-body';

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

    const logDateMap = {};
    logs.forEach(l => {
        const timestamp = Number(l.timestamp);
        const dt = Number.isFinite(timestamp) && timestamp > 0
            ? new Date(timestamp)
            : new Date(l.date);
        if (Number.isNaN(dt.getTime())) return;
        const dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        logDateMap[dateKey] = (logDateMap[dateKey] || 0) + Math.max(0, Number(l.seconds) || 0);
    });

    const weeksContainer = document.createElement('div');
    weeksContainer.className = 'year-weeks-container';

    const numWeeks = 48;
    const startDate = new Date();
    startDate.setDate(today.getDate() - (numWeeks * 7));

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
            if (cellDate <= today && totalSec > 0) {
                if (totalSec >= 1200) lvl = 'lvl-3';
                else if (totalSec >= 300) lvl = 'lvl-2';
                else lvl = 'lvl-1';
            }

            cell.classList.add(lvl);
            cell.dataset.date = cellDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            cell.dataset.activity = totalSec > 0 ? `${Math.round(totalSec / 60)} min logged` : 'No workout';

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

    let topExercise = 'No workouts yet';
    let maxCount = 0;
    for (const [name, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            topExercise = name;
        }
    }

    const totalMinutes = Math.round(totalSeconds / 60);
    const progressPct = Math.min(100, totalLogs * 10);
    fill.style.width = `${progressPct}%`;

    const workoutDates = new Set(logs.map(log => {
        const timestamp = Number(log.timestamp);
        const date = Number.isFinite(timestamp) && timestamp > 0
            ? new Date(timestamp)
            : new Date(log.date);
        return Number.isNaN(date.getTime())
            ? null
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }).filter(Boolean));
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const streakStart = new Date(today);
    if (!workoutDates.has(todayKey)) streakStart.setDate(streakStart.getDate() - 1);
    let streak = 0;
    while (true) {
        const dateKey = `${streakStart.getFullYear()}-${String(streakStart.getMonth() + 1).padStart(2, '0')}-${String(streakStart.getDate()).padStart(2, '0')}`;
        if (!workoutDates.has(dateKey)) break;
        streak++;
        streakStart.setDate(streakStart.getDate() - 1);
    }

    summary.innerHTML = `
        <div>Total Sessions: <strong>${totalLogs}</strong></div>
        <div>Total Time: <strong>${totalMinutes} mins</strong></div>
        <div>Primary Activity: <strong>${topExercise}</strong></div>
        <div>Current Streak: <strong>${streak} days</strong></div>
    `;
}

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

function setupProfileEvents() {
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

    if (btnAuthToggle) {
        btnAuthToggle.addEventListener('click', () => {
            if (currentUser.isLoggedIn) {
                currentUser.isLoggedIn = false;
                localStorage.removeItem('userRegistered');
                saveUserData();
                renderUserProfile();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    closeAuthBtn.addEventListener('click', () => {
        authModal.classList.remove('active');
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailOrUser = document.getElementById('auth-email').value.trim();
        const fullNameInput = document.getElementById('auth-fullname').value.trim();

        currentUser.isLoggedIn = true;
        if (fullNameInput) currentUser.fullname = fullNameInput;
        if (emailOrUser) currentUser.username = emailOrUser.split('@')[0];
        localStorage.setItem('userRegistered', 'true');
        saveUserData();
        renderUserProfile();
        authModal.classList.remove('active');
        window.dispatchEvent(new Event('fitpulse:user-registered'));
    });

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
            tooltip.style.left = `${e.clientX + 14}px`;
            tooltip.style.top = `${e.clientY + 14}px`;
        });

        grid24.addEventListener('mouseout', (e) => {
            if (e.target.closest('.cell')) tooltip.style.display = 'none';
        });
    }
}

document.addEventListener("DOMContentLoaded", initProfile);
window.addEventListener('fitpulse:logs-updated', () => {
    loadLogs();
    update24HourHeatmapActivity();
});
})();
