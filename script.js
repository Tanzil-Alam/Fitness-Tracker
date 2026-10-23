const EXERCISE_IMAGES = {
    'Push up': 'pushup.png',
    'Squats': 'squat.png',
    'Plank': 'plank.png',
    'Pull-ups': 'pullup.png',
    'Deadlift': 'deadlift.png',
    'Running': 'running.png',
    'CUSTOM': ''
};

const STORAGE_KEY = 'minimal_fitness_logs_v3';
let logs = [];

const MIN_SECONDS_REQUIRED = 30;
let swInterval = null;
let swSeconds = 0;
let swRunning = false;

const loggedList = document.getElementById('logged-list');
const addBox = document.getElementById('add-box');
const modal = document.getElementById('workout-modal');
const closeModal = document.getElementById('close-modal');
const selectExercise = document.getElementById('select-exercise');
const customNameRow = document.getElementById('custom-name-row');
const customExerciseName = document.getElementById('custom-exercise-name');

const swDisplay = document.getElementById('sw-display');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');
const btnLogWorkout = document.getElementById('btn-log-workout');

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const grid = document.getElementById('heatmap-grid');
const tooltip = document.getElementById('tooltip');

function init() {
    loadLogs();
    buildHeatmap();
    renderLogs();
    updateHeatmapActivity();
    renderDailyRoutine();
    renderMonthlyGoals();
    setupEvents();
}

function loadLogs() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        logs = saved ? JSON.parse(saved) : [];
    } catch (e) {
        logs = [];
    }
}

function saveLogs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function getHourRangeLabel(h) {
    const startHour12 = h % 12 === 0 ? 12 : h % 12;
    const startAmPm = h < 12 ? 'AM' : 'PM';
    const nextH = (h + 1) % 24;
    const endHour12 = nextH % 12 === 0 ? 12 : nextH % 12;
    const endAmPm = nextH < 12 ? 'AM' : 'PM';
    return `${startHour12} ${startAmPm}–${endHour12} ${endAmPm}`;
}

function buildHeatmap() {
    grid.innerHTML = '';

    const emptyCorner = document.createElement('div');
    emptyCorner.className = 'hour-header-cell';
    grid.appendChild(emptyCorner);

    for (let h = 0; h < 24; h++) {
        const headerCell = document.createElement('div');
        headerCell.className = 'hour-header-cell';
        if (h % 3 === 0) {
            const h12 = h % 12 === 0 ? 12 : h % 12;
            const ampm = h < 12 ? 'AM' : 'PM';
            headerCell.textContent = `${h12}${ampm}`;
        }
        grid.appendChild(headerCell);
    }

    for (let d = 0; d < 7; d++) {
        const dayLabel = document.createElement('div');
        dayLabel.className = 'day-label-cell';
        dayLabel.textContent = dayLabels[d];
        grid.appendChild(dayLabel);

        for (let h = 0; h < 24; h++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.day = d;
            cell.dataset.dayName = dayFullNames[d];
            cell.dataset.hour = h;
            cell.dataset.hourLabel = getHourRangeLabel(h);
            cell.dataset.seconds = 0;
            grid.appendChild(cell);
        }
    }

    const now = new Date();
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    document.getElementById('month-label').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function updateHeatmapActivity() {
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

function renderLogs() {
    loggedList.innerHTML = '';

    logs.forEach(item => {
        const box = document.createElement('div');
        box.className = 'exercise-log-box';

        const imgUrl = EXERCISE_IMAGES[item.name] || EXERCISE_IMAGES['CUSTOM'] || '';
        const imageHolderHtml = imgUrl
            ? `<img src="${imgUrl}" alt="${item.name}" onerror="this.parentElement.innerHTML='<div class=\\'box-image-placeholder\\'>IMAGE</div>'">`
            : `<div class="box-image-placeholder">IMAGE</div>`;

        box.innerHTML = `
            <div class="box-image-holder">
                ${imageHolderHtml}
            </div>
            <div class="box-title-holder">
                ${item.name}
            </div>
            <div class="box-meta-holder">
                <div class="meta-row">
                    <span>Time:</span>
                    <span>${item.time}</span>
                </div>
                <div class="meta-row">
                    <span>Date:</span>
                    <span>${item.date}</span>
                </div>
            </div>
            <button type="button" class="delete-log-btn" title="Delete" onclick="deleteLog('${item.id}')">&times;</button>
        `;

        loggedList.appendChild(box);
    });
}

window.deleteLog = function (id) {
    logs = logs.filter(l => l.id !== id);
    saveLogs();
    renderLogs();
    updateHeatmapActivity();
    renderMonthlyGoals();
};

function setupEvents() {
    addBox.addEventListener('click', openWorkoutModal);
    closeModal.addEventListener('click', closeWorkoutModal);

    selectExercise.addEventListener('change', () => {
        if (selectExercise.value === 'CUSTOM') {
            customNameRow.style.display = 'flex';
            customExerciseName.focus();
        } else {
            customNameRow.style.display = 'none';
        }
    });

    btnStart.addEventListener('click', startStopwatch);
    btnPause.addEventListener('click', pauseStopwatch);
    btnReset.addEventListener('click', resetStopwatch);

    btnLogWorkout.addEventListener('click', logWorkout);

    grid.addEventListener('mouseover', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        const sec = parseInt(cell.dataset.seconds || 0, 10);
        const timeStr = sec > 0 ? formatDisplayDuration(sec) : '0m';
        const dayName = cell.dataset.dayName || '';
        const hourLabel = cell.dataset.hourLabel || '';
        tooltip.innerHTML = `${dayName}, ${hourLabel} · ${timeStr}`;
        tooltip.style.display = 'block';
    });

    grid.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY + 14) + 'px';
    });

    grid.addEventListener('mouseout', (e) => {
        if (e.target.closest('.cell')) {
            tooltip.style.display = 'none';
        }
    });
}

function openWorkoutModal() {
    resetStopwatch();
    modal.classList.add('active');
}

function closeWorkoutModal() {
    pauseStopwatch();
    modal.classList.remove('active');
}

function formatTime(s) {
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

function formatDisplayDuration(s) {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    return remSec > 0 ? `${m}m ${remSec}s` : `${m}m`;
}

function checkMinTimeRequirement() {
    if (swSeconds >= MIN_SECONDS_REQUIRED) {
        btnLogWorkout.disabled = false;
        btnLogWorkout.textContent = 'Log Exercise';
    } else {
        btnLogWorkout.disabled = true;
        btnLogWorkout.textContent = 'Log Exercise (Cant post under 30s)';
    }
}

function startStopwatch() {
    if (swRunning) return;
    swRunning = true;
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnReset.disabled = false;

    swInterval = setInterval(() => {
        swSeconds++;
        swDisplay.textContent = formatTime(swSeconds);
        checkMinTimeRequirement();
    }, 1000);
}

function pauseStopwatch() {
    if (!swRunning) return;
    clearInterval(swInterval);
    swRunning = false;
    btnStart.disabled = false;
    btnPause.disabled = true;
}

function resetStopwatch() {
    clearInterval(swInterval);
    swRunning = false;
    swSeconds = 0;
    swDisplay.textContent = '00:00:00';
    btnStart.disabled = false;
    btnPause.disabled = true;
    btnReset.disabled = true;
    checkMinTimeRequirement();
}

function logWorkout() {
    if (swSeconds < MIN_SECONDS_REQUIRED) {
        alert(`Minimum ${MIN_SECONDS_REQUIRED} seconds required to log your exercise.`);
        return;
    }

    let name = selectExercise.value;
    if (name === 'CUSTOM') {
        name = customExerciseName.value.trim() || 'Workout';
    }

    const durationStr = formatDisplayDuration(swSeconds);

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()}`;
    const dayIdx = (now.getDay() + 6) % 7;
    const hour = now.getHours();

    const newLog = {
        id: 'log_' + Date.now(),
        name: name,
        seconds: swSeconds,
        time: durationStr,
        date: dateStr,
        dayIdx: dayIdx,
        hour: hour,
        timestamp: now.getTime()
    };

    logs.unshift(newLog);
    saveLogs();
    renderLogs();
    updateHeatmapActivity();

    try {
        const todayKey = 'fitpulse_routine_' + new Date().toISOString().slice(0, 10);
        let completedTasks = JSON.parse(localStorage.getItem(todayKey) || '[]');
        const currentRoutine = getPersonalizedRoutine();
        const matchedTask = currentRoutine.find(t => t.name === name);
        if (matchedTask && !completedTasks.includes(matchedTask.id)) {
            completedTasks.push(matchedTask.id);
            localStorage.setItem(todayKey, JSON.stringify(completedTasks));
        }
        renderDailyRoutine();
    } catch (_) {}

    renderMonthlyGoals();
    closeWorkoutModal();
}

document.addEventListener("DOMContentLoaded", () => {
    async function getApiKey() {
        if (window.CONFIG?.GEMINI_API_KEY && window.CONFIG.GEMINI_API_KEY !== "your_gemini_api_key_here") {
            return window.CONFIG.GEMINI_API_KEY;
        }
        if (window.ENV?.GEMINI_API_KEY && window.ENV.GEMINI_API_KEY !== "your_gemini_api_key_here") {
            return window.ENV.GEMINI_API_KEY;
        }

        try {
            const res = await fetch('.env');
            if (res.ok) {
                const text = await res.text();
                for (const line of text.split('\n')) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const [key, ...rest] = trimmed.split('=');
                        if (key.trim() === 'GEMINI_API_KEY') {
                            const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
                            if (val && val !== "your_gemini_api_key_here") {
                                return val;
                            }
                        }
                    }
                }
            }
        } catch (_) { }

        const storedKey = localStorage.getItem('GEMINI_API_KEY');
        if (storedKey) return storedKey;

        return null;
    }

    const aiBtn = document.getElementById("ai-assistant-btn");
    const aiOverlay = document.getElementById("ai-chatbox-overlay");
    const aiClose = document.getElementById("close-ai-chat");
    const aiSend = document.getElementById("ai-chat-send");
    const aiInput = document.getElementById("ai-chat-input");
    const aiMessages = document.getElementById("ai-chat-messages");

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

    if (aiBtn && aiOverlay) {
        aiBtn.addEventListener("click", () => {
            aiOverlay.style.display = "flex";
        });
    }

    if (aiClose && aiOverlay) {
        aiClose.addEventListener("click", () => {
            aiOverlay.style.display = "none";
        });
    }

    const appendMessage = (text, sender) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = sender === "user" ? "ai-msg-user" : "ai-msg-bot";
        msgDiv.innerText = text;
        aiMessages.appendChild(msgDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;
        saveChatHistory();
    };

    const promptForApiKey = () => {
        if (document.getElementById("manual-api-key-container")) return;
        const promptDiv = document.createElement("div");
        promptDiv.id = "manual-api-key-container";
        promptDiv.className = "ai-msg-bot";
        promptDiv.style.backgroundColor = "#241f12";
        promptDiv.style.border = "1px solid #d4a373";
        promptDiv.style.borderRadius = "8px";
        promptDiv.style.padding = "10px";
        promptDiv.innerHTML = `
            <div style="margin-bottom: 6px; font-weight: bold; color: #ffca28;">Gemini API Key Required</div>
            <div style="font-size: 12px; margin-bottom: 8px; opacity: 0.9; line-height: 1.4;">
                No API key was detected in .env or config.js. Enter your Gemini API key below to enable chat (saved in your browser's localStorage):
            </div>
            <div style="display: flex; gap: 6px;">
                <input type="password" id="manual-api-key" placeholder="Enter Gemini API key" style="flex: 1; padding: 6px 8px; background: #111; color: #fff; border: 1px solid #555; border-radius: 4px; font-size: 12px;">
                <button id="save-api-key-btn" style="padding: 6px 12px; background: #d4a373; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">Save</button>
            </div>
        `;
        aiMessages.appendChild(promptDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;

        const saveBtn = promptDiv.querySelector("#save-api-key-btn");
        const keyInput = promptDiv.querySelector("#manual-api-key");
        if (saveBtn && keyInput) {
            saveBtn.addEventListener("click", () => {
                const val = keyInput.value.trim();
                if (val) {
                    localStorage.setItem('GEMINI_API_KEY', val);
                    promptDiv.remove();
                    appendMessage("API key saved! You can now ask questions.", "bot");
                }
            });
        }
    };

    const sendToGemini = async (userText) => {
        appendMessage(userText, "user");
        aiInput.value = "";

        const loadingDiv = document.createElement("div");
        loadingDiv.className = "ai-msg-bot";
        loadingDiv.innerText = "Thinking...";
        aiMessages.appendChild(loadingDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;

        // 1. Try Vercel Serverless Function (/api/chat)
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
        } catch (e) {
            // Serverless endpoint not reachable (e.g. running purely on local file system)
        }

        // 2. Direct client-side fallback (reads config.js, .env, or localStorage)
        const apiKey = await getApiKey();
        if (!apiKey) {
            if (loadingDiv.parentNode) aiMessages.removeChild(loadingDiv);
            promptForApiKey();
            return;
        }

        // Fetch user details for personalized AI answers
        const uName = localStorage.getItem('userName') || 'User';
        const uAge = localStorage.getItem('userAge') ? `${localStorage.getItem('userAge')} years old` : 'unspecified age';
        const uHeight = localStorage.getItem('userHeight') ? `${localStorage.getItem('userHeight')} cm` : 'unspecified height';
        const uWeight = localStorage.getItem('userWeight') ? `${localStorage.getItem('userWeight')} kg` : 'unspecified weight';

        const systemPrompt = `You are the AI assistant inside FitPulse, an Activity Heatmap & Fitness Tracker app. 
You are speaking to ${uName} (${uAge}, Height: ${uHeight}, Weight: ${uWeight}).
Tailor your workout, health, and fitness advice to their body profile. Keep responses concise and direct (2-3 sentences max).`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: [
                        { role: "user", parts: [{ text: userText }] }
                    ]
                })
            });

            const data = await response.json();
            if (loadingDiv.parentNode) aiMessages.removeChild(loadingDiv);

            if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                const reply = data.candidates[0].content.parts[0].text;
                appendMessage(reply, "bot");
            } else if (data.error) {
                appendMessage("API Error: " + data.error.message, "bot");
            } else {
                appendMessage("Sorry, I could not process that.", "bot");
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
});

init();

// Personalized Daily Routine System
const TODAY_DATE_KEY = 'fitpulse_routine_' + new Date().toISOString().slice(0, 10);

function getPersonalizedRoutine() {
    const age = parseInt(localStorage.getItem('userAge') || '25', 10);
    const weight = parseInt(localStorage.getItem('userWeight') || '70', 10);

    if (age >= 50 || weight > 95) {
        return [
            { id: 'task_1', name: 'Plank', target: '30 seconds', seconds: 30 },
            { id: 'task_2', name: 'Squats', target: '45 seconds', seconds: 45 },
            { id: 'task_3', name: 'Running', target: '1 minute brisk walk', seconds: 60 }
        ];
    } else if (age < 30) {
        return [
            { id: 'task_1', name: 'Push up', target: '45 seconds', seconds: 45 },
            { id: 'task_2', name: 'Squats', target: '1 minute', seconds: 60 },
            { id: 'task_3', name: 'Plank', target: '45 seconds', seconds: 45 },
            { id: 'task_4', name: 'Running', target: '2 minutes', seconds: 120 }
        ];
    } else {
        return [
            { id: 'task_1', name: 'Push up', target: '30 seconds', seconds: 30 },
            { id: 'task_2', name: 'Squats', target: '45 seconds', seconds: 45 },
            { id: 'task_3', name: 'Plank', target: '30 seconds', seconds: 30 },
            { id: 'task_4', name: 'Running', target: '1 minute', seconds: 60 }
        ];
    }
}

function renderDailyRoutine() {
    const isRegistered = localStorage.getItem('userRegistered') === 'true';
    const lockedCard = document.getElementById('routine-locked');
    const unlockedCard = document.getElementById('routine-unlocked');
    const blocksGrid = document.getElementById('daily-blocks-grid');
    const counter = document.getElementById('daily-progress-counter');
    const subtitle = document.getElementById('routine-user-subtitle');

    if (!lockedCard || !unlockedCard) return;

    if (!isRegistered) {
        lockedCard.style.display = 'block';
        unlockedCard.style.display = 'none';
        return;
    }

    lockedCard.style.display = 'none';
    unlockedCard.style.display = 'block';

    const uName = localStorage.getItem('userName') || 'Athlete';
    const uAge = localStorage.getItem('userAge') || '25';
    const uWeight = localStorage.getItem('userWeight') || '70';
    if (subtitle) {
        subtitle.textContent = `Plan for ${uName} (${uAge} yrs, ${uWeight} kg) · Click any block to start`;
    }

    const routine = getPersonalizedRoutine();
    let completedTasks = JSON.parse(localStorage.getItem(TODAY_DATE_KEY) || '[]');

    blocksGrid.innerHTML = '';
    let doneCount = 0;

    routine.forEach(task => {
        const isDone = completedTasks.includes(task.id);
        if (isDone) doneCount++;

        const card = document.createElement('div');
        card.className = `routine-block ${isDone ? 'completed' : ''}`;
        card.innerHTML = `
            <div>
                <div class="routine-block-top">
                    <span class="routine-block-name">${task.name}</span>
                    <span class="routine-badge ${isDone ? 'done' : 'pending'}">${isDone ? 'Done ✅' : 'Start ▶'}</span>
                </div>
                <div class="routine-block-goal">Target: <strong>${task.target}</strong></div>
            </div>
            <div style="font-size: 0.75rem; color: #71717a;">${isDone ? 'Completed today' : 'Click to begin stopwatch'}</div>
        `;

        card.addEventListener('click', () => {
            if (selectExercise) selectExercise.value = task.name;
            openWorkoutModal();
        });

        blocksGrid.appendChild(card);
    });

    if (counter) {
        counter.textContent = `${doneCount} / ${routine.length} Completed`;
        if (doneCount === routine.length && routine.length > 0) {
            counter.textContent = '🎉 All Done Today!';
            counter.style.background = '#10b981';
        }
    }
}

// ===================== Monthly Goals System =====================

function generateMonthlyGoals() {
    const age = parseInt(localStorage.getItem('userAge') || '25', 10);
    const weight = parseInt(localStorage.getItem('userWeight') || '70', 10);

    // AI-tailored goals based on body profile
    if (age >= 50 || weight > 95) {
        return [
            { name: 'Squats', target: 300, unit: 'reps' },
            { name: 'Plank', target: 120, unit: 'min' },
            { name: 'Running', target: 200, unit: 'min' }
        ];
    } else if (age < 25) {
        return [
            { name: 'Push up', target: 1000, unit: 'reps' },
            { name: 'Squats', target: 800, unit: 'reps' },
            { name: 'Pull-ups', target: 300, unit: 'reps' },
            { name: 'Running', target: 500, unit: 'min' },
            { name: 'Plank', target: 200, unit: 'min' }
        ];
    } else if (age < 35) {
        return [
            { name: 'Push up', target: 750, unit: 'reps' },
            { name: 'Squats', target: 600, unit: 'reps' },
            { name: 'Pull-ups', target: 200, unit: 'reps' },
            { name: 'Running', target: 400, unit: 'min' },
            { name: 'Plank', target: 150, unit: 'min' }
        ];
    } else {
        return [
            { name: 'Push up', target: 500, unit: 'reps' },
            { name: 'Squats', target: 400, unit: 'reps' },
            { name: 'Running', target: 300, unit: 'min' },
            { name: 'Plank', target: 120, unit: 'min' }
        ];
    }
}

function getMonthlyProgress(exerciseName) {
    // Count matching exercise logs from current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalSeconds = 0;
    let sessionCount = 0;

    logs.forEach(log => {
        if (log.name !== exerciseName) return;
        const logDate = log.timestamp ? new Date(log.timestamp) : null;
        if (!logDate) return;
        if (logDate.getMonth() !== currentMonth || logDate.getFullYear() !== currentYear) return;
        totalSeconds += (log.seconds || 0);
        sessionCount++;
    });

    return { totalSeconds, sessionCount };
}

function renderMonthlyGoals() {
    const section = document.getElementById('monthly-goals-section');
    const goalsList = document.getElementById('goals-list');
    const monthLabel = document.getElementById('goals-month-label');
    if (!section || !goalsList) return;

    const isRegistered = localStorage.getItem('userRegistered') === 'true';

    if (!isRegistered) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const uName = localStorage.getItem('userName') || 'Athlete';
    const uAge = localStorage.getItem('userAge') || '25';
    const uWeight = localStorage.getItem('userWeight') || '70';

    if (monthLabel) {
        monthLabel.textContent = `AI plan for ${uName} (${uAge} yrs, ${uWeight} kg) · ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }

    const goals = generateMonthlyGoals();
    goalsList.innerHTML = '';

    goals.forEach(goal => {
        const progress = getMonthlyProgress(goal.name);

        let current = 0;
        if (goal.unit === 'reps') {
            // Estimate reps from time: ~1 rep per 2 seconds for most exercises
            current = Math.round(progress.totalSeconds / 2);
        } else if (goal.unit === 'min') {
            current = Math.round(progress.totalSeconds / 60);
        }

        const pct = Math.min(100, goal.target > 0 ? Math.round((current / goal.target) * 100) : 0);
        const isComplete = current >= goal.target;

        const card = document.createElement('div');
        card.className = 'goal-card';
        card.innerHTML = `
            <div class="goal-card-top">
                <span class="goal-name">${isComplete ? '✅ ' : '🎯 '}${goal.target} ${goal.name} ${goal.unit === 'min' ? 'minutes' : ''} this month</span>
                <span class="goal-count">${current} / ${goal.target} ${goal.unit === 'min' ? 'min' : ''} ${isComplete ? 'completed ✔' : 'completed'}</span>
            </div>
            <div class="goal-progress-bar-bg">
                <div class="goal-progress-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${pct}%;"></div>
            </div>
        `;
        goalsList.appendChild(card);
    });
}
