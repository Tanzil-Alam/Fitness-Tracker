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
const workoutAmount = document.getElementById('workout-amount');
const workoutAmountRow = document.getElementById('workout-amount-row');
const workoutAmountLabel = document.getElementById('workout-amount-label');
const workoutAmountHelp = document.getElementById('workout-amount-help');

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
    ensureWorkoutPlans();
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
    window.dispatchEvent(new Event('fitpulse:logs-updated'));
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
    if (!grid) return;
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
        const amount = Number(item.reps) > 0
            ? `${Number(item.reps).toLocaleString()} reps`
            : Number(item.distanceKm) > 0
                ? `${Number(item.distanceKm).toFixed(1)} km`
                : '';
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
                ${amount ? `<div class="meta-row"><span>Completed:</span><span>${amount}</span></div>` : ''}
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
    reconcileDailyCompletions();
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
        updateWorkoutAmountField();
    });
    updateWorkoutAmountField();

    btnStart.addEventListener('click', startStopwatch);
    btnPause.addEventListener('click', pauseStopwatch);
    btnReset.addEventListener('click', resetStopwatch);

    btnLogWorkout.addEventListener('click', logWorkout);

    if (grid) grid.addEventListener('mouseover', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        const sec = parseInt(cell.dataset.seconds || 0, 10);
        const timeStr = sec > 0 ? formatDisplayDuration(sec) : '0m';
        const dayName = cell.dataset.dayName || '';
        const hourLabel = cell.dataset.hourLabel || '';
        tooltip.innerHTML = `${dayName}, ${hourLabel} · ${timeStr}`;
        tooltip.style.display = 'block';
    });

    if (grid) grid.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY + 14) + 'px';
    });

    if (grid) grid.addEventListener('mouseout', (e) => {
        if (e.target.closest('.cell')) {
            tooltip.style.display = 'none';
        }
    });
}

function openWorkoutModal() {
    resetStopwatch();
    if (workoutAmount) workoutAmount.value = '';
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

function updateWorkoutAmountField() {
    if (!workoutAmountRow || !workoutAmount || !workoutAmountLabel || !workoutAmountHelp) return;
    const exercise = selectExercise?.value;
    const amountType = exercise === 'Running'
        ? 'distanceKm'
        : ['Push up', 'Squats', 'Pull-ups', 'Deadlift'].includes(exercise)
            ? 'reps'
            : null;

    workoutAmountRow.hidden = !amountType;
    workoutAmount.required = Boolean(amountType);
    workoutAmount.value = '';
    workoutAmount.step = amountType === 'distanceKm' ? '0.1' : '1';
    if (amountType === 'distanceKm') {
        workoutAmountLabel.textContent = 'Distance completed (km)';
        workoutAmountHelp.textContent = 'Enter the distance you ran, for example 2.5 km.';
        workoutAmount.placeholder = 'e.g. 2.5';
    } else if (amountType === 'reps') {
        workoutAmountLabel.textContent = 'Reps completed';
        workoutAmountHelp.textContent = 'Enter the total number of repetitions in this session.';
        workoutAmount.placeholder = 'e.g. 20';
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

    const amount = Number.parseFloat(workoutAmount?.value || '');
    const amountType = name === 'Running'
        ? 'distanceKm'
        : ['Push up', 'Squats', 'Pull-ups', 'Deadlift'].includes(name)
            ? 'reps'
            : null;
    if (amountType && (!Number.isFinite(amount) || amount <= 0 || (amountType === 'reps' && !Number.isInteger(amount)))) {
        alert(`Enter the ${amountType === 'distanceKm' ? 'distance in km' : 'number of reps'} you completed.`);
        workoutAmount?.focus();
        return;
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
        timestamp: now.getTime(),
        ...(amountType === 'reps' ? { reps: amount } : {}),
        ...(amountType === 'distanceKm' ? { distanceKm: amount } : {})
    };

    logs.unshift(newLog);
    saveLogs();
    renderLogs();
    updateHeatmapActivity();

    try {
        const todayKey = TODAY_DATE_KEY;
        let completedTasks = JSON.parse(localStorage.getItem(todayKey) || '[]');
        const currentRoutine = getPersonalizedRoutine();
        const matchedTask = currentRoutine.find(t => t.name === name && !completedTasks.includes(t.id));
        if (matchedTask) {
            completedTasks.push(matchedTask.id);
            localStorage.setItem(todayKey, JSON.stringify(completedTasks));
        }
        renderDailyRoutine();
    } catch (error) {
        console.warn('Could not update today’s workout completion.', error);
    }

    renderMonthlyGoals();
    closeWorkoutModal();
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.fitPulseChatInitialized) return;

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

// Personalized AI workout and monthly plans
const getLocalDateKey = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const TODAY_DATE_KEY = `fitpulse_routine_${getLocalDateKey(new Date())}`;
const DAILY_PLAN_KEY = `fitpulse_daily_plan_${getLocalDateKey(new Date())}`;
const MONTHLY_PLAN_KEY = `fitpulse_monthly_plan_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
const ALLOWED_EXERCISES = ['Push up', 'Squats', 'Plank', 'Pull-ups', 'Deadlift', 'Running'];
let dailyPlan = null;
let monthlyPlan = null;
let plansRequestInProgress = false;

function getFallbackDailyPlan() {
    return [
        { name: 'Push up', target: '3 sets of 10 reps', reason: 'Build upper-body strength.' },
        { name: 'Squats', target: '3 sets of 12 reps', reason: 'Train your legs with controlled repetitions.' },
        { name: 'Plank', target: '3 holds of 30 seconds', reason: 'Build core stability while keeping good form.' },
        { name: 'Running', target: '2 km at a comfortable pace', reason: 'Add an easy cardio session.' }
    ];
}

function getFallbackMonthlyPlan() {
    return [
        { name: 'Push up', target: 1000, unit: 'reps' },
        { name: 'Squats', target: 1000, unit: 'reps' },
        { name: 'Running', target: 100, unit: 'km' },
        { name: 'Plank', target: 120, unit: 'minutes' }
    ];
}

function normalizeGeneratedPlans(value) {
    if (!value || !Array.isArray(value.dailyWorkouts) || value.dailyWorkouts.length !== 4 ||
        !Array.isArray(value.monthlyGoals) || value.monthlyGoals.length < 3) {
        throw new Error('AI returned an incomplete workout plan.');
    }

    const dailyWorkouts = value.dailyWorkouts.map(item => {
        if (!item || !ALLOWED_EXERCISES.includes(item.name) || typeof item.target !== 'string') {
            throw new Error('AI returned an invalid daily workout.');
        }
        return {
            name: item.name,
            target: item.target.slice(0, 100),
            reason: typeof item.reason === 'string' ? item.reason.slice(0, 180) : ''
        };
    });
    const monthlyGoals = value.monthlyGoals.map(item => {
        const unit = item?.unit;
        const target = Number(item?.target);
        if (!item || !ALLOWED_EXERCISES.includes(item.name) ||
            !['reps', 'km', 'minutes'].includes(unit) || !Number.isFinite(target) || target <= 0) {
            throw new Error('AI returned an invalid monthly goal.');
        }
        if ((unit === 'km' && item.name !== 'Running') ||
            (unit === 'reps' && !['Push up', 'Squats', 'Pull-ups', 'Deadlift'].includes(item.name)) ||
            (unit === 'minutes' && item.name !== 'Plank')) {
            throw new Error('AI returned a goal with the wrong measurement.');
        }
        return { name: item.name, target: unit === 'km' ? Math.round(target * 10) / 10 : Math.round(target), unit };
    });
    const hasRequiredGoals = [
        monthlyGoals.some(goal => goal.name === 'Push up' && goal.unit === 'reps'),
        monthlyGoals.some(goal => goal.name === 'Squats' && goal.unit === 'reps'),
        monthlyGoals.some(goal => goal.name === 'Running' && goal.unit === 'km')
    ].every(Boolean);
    if (!hasRequiredGoals) throw new Error('AI plan is missing a core monthly goal.');

    return { dailyWorkouts, monthlyGoals };
}

function getStoredPlan(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.warn(`Could not read saved plan (${key}).`, error);
        return null;
    }
}

function getPlanRequestData() {
    const profile = {
        name: localStorage.getItem('userName') || 'Athlete',
        age: localStorage.getItem('userAge') || '',
        height: localStorage.getItem('userHeight') || '',
        weight: localStorage.getItem('userWeight') || ''
    };
    const recentWorkouts = logs.slice(0, 40).map(log => ({
        name: String(log.name || '').slice(0, 40),
        date: Number.isFinite(Number(log.timestamp)) && Number(log.timestamp) > 0
            ? new Date(Number(log.timestamp)).toISOString().slice(0, 10)
            : '',
        durationMinutes: Math.round((Number(log.seconds) || 0) / 60),
        reps: Number(log.reps) || 0,
        distanceKm: Number(log.distanceKm) || 0
    }));
    return { profile, recentWorkouts };
}

async function requestPlansFromAI() {
    const requestData = getPlanRequestData();
    const endpoint = new URL('api/chat', document.baseURI);
    let serverError;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate_plans', ...requestData })
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) return normalizeGeneratedPlans(data.plans);
        serverError = data.error || `Plan generation failed (${response.status}).`;
    } catch (error) {
        serverError = error.message || 'Could not connect to the plan service.';
    }

    const apiKey = window.CONFIG?.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error(serverError || 'AI plans are not configured.');
    }

    const prompt = `Create a safe, practical fitness plan for today and monthly goals based on this profile and recent logged workouts. Return ONLY valid JSON with this schema: {"dailyWorkouts":[{"name":"Push up|Squats|Plank|Pull-ups|Deadlift|Running","target":"short measurable target","reason":"short reason"}],"monthlyGoals":[{"name":"Push up|Squats|Plank|Pull-ups|Deadlift|Running","target":1000,"unit":"reps|km|minutes"}]}. Include exactly four daily workouts. Include at least three monthly goals, preferably push-ups and squats measured in reps, running measured in km, and plank measured in minutes. Set achievable targets based on the user's recent consistency and profile. Do not invent workout history. Profile and workout history: ${JSON.stringify(requestData)}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: 'You are FitPulse’s fitness planner. Give beginner-safe, balanced workout plans. Return only the requested JSON, with no markdown.' }]
            },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });
    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!response.ok || !responseText) {
        throw new Error(data.error?.message || serverError || 'AI could not create a plan.');
    }
    return normalizeGeneratedPlans(JSON.parse(responseText));
}

async function ensureWorkoutPlans() {
    if (localStorage.getItem('userRegistered') !== 'true') return;
    dailyPlan = getStoredPlan(DAILY_PLAN_KEY);
    monthlyPlan = getStoredPlan(MONTHLY_PLAN_KEY);
    renderDailyRoutine();
    renderMonthlyGoals();
    if ((dailyPlan && Array.isArray(dailyPlan.dailyWorkouts)) &&
        (monthlyPlan && Array.isArray(monthlyPlan.monthlyGoals))) return;
    if (plansRequestInProgress) return;

    plansRequestInProgress = true;
    const planStatus = document.getElementById('plans-status');
    if (planStatus) planStatus.textContent = 'Personalizing your plans from your workout history…';
    try {
        const generated = await requestPlansFromAI();
        const today = new Date();
        const dateKey = getLocalDateKey(today);
        const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        if (!dailyPlan || !Array.isArray(dailyPlan.dailyWorkouts)) {
            dailyPlan = { date: dateKey, dailyWorkouts: generated.dailyWorkouts };
            localStorage.setItem(`fitpulse_daily_plan_${dateKey}`, JSON.stringify(dailyPlan));
        }
        if (!monthlyPlan || !Array.isArray(monthlyPlan.monthlyGoals)) {
            monthlyPlan = { month: monthKey, monthlyGoals: generated.monthlyGoals };
            localStorage.setItem(`fitpulse_monthly_plan_${monthKey}`, JSON.stringify(monthlyPlan));
        }
        if (planStatus) planStatus.textContent = 'AI plans are personalized to your profile and recent workouts.';
    } catch (error) {
        console.warn('Could not generate AI workout plans.', error);
        dailyPlan = dailyPlan?.dailyWorkouts ? dailyPlan : { dailyWorkouts: getFallbackDailyPlan() };
        monthlyPlan = monthlyPlan?.monthlyGoals ? monthlyPlan : { monthlyGoals: getFallbackMonthlyPlan() };
        if (planStatus) planStatus.textContent = 'Showing starter plans; AI personalization will retry when available.';
    } finally {
        plansRequestInProgress = false;
        renderDailyRoutine();
        renderMonthlyGoals();
    }
}

function getPersonalizedRoutine() {
    const tasks = dailyPlan?.dailyWorkouts;
    if (Array.isArray(tasks) && tasks.length === 4) {
        return tasks.map((task, index) => ({
            ...task,
            id: `task_${index + 1}`
        }));
    }
    return getFallbackDailyPlan().map((task, index) => ({ ...task, id: `task_${index + 1}` }));
}

function reconcileDailyCompletions() {
    const todayLogs = logs.filter(log => {
        const timestamp = Number(log.timestamp);
        if (!Number.isFinite(timestamp)) return false;
        return getLocalDateKey(new Date(timestamp)) === getLocalDateKey(new Date());
    });
    const completed = [];
    getPersonalizedRoutine().forEach(task => {
        const matchingIndex = todayLogs.findIndex(log => log.name === task.name);
        if (matchingIndex !== -1) {
            completed.push(task.id);
            todayLogs.splice(matchingIndex, 1);
        }
    });
    localStorage.setItem(TODAY_DATE_KEY, JSON.stringify(completed));
    renderDailyRoutine();
}

function renderDailyRoutine() {
    const isRegistered = localStorage.getItem('userRegistered') === 'true';
    const lockedCard = document.getElementById('routine-locked');
    const unlockedCard = document.getElementById('routine-unlocked');
    const blocksGrid = document.getElementById('daily-blocks-grid');
    const counter = document.getElementById('daily-progress-counter');
    const subtitle = document.getElementById('routine-user-subtitle');

    if (!lockedCard || !unlockedCard || !blocksGrid) return;
    if (!isRegistered) {
        lockedCard.style.display = 'block';
        unlockedCard.style.display = 'none';
        return;
    }

    lockedCard.style.display = 'none';
    unlockedCard.style.display = 'block';
    const uName = localStorage.getItem('userName') || 'Athlete';
    if (subtitle) subtitle.textContent = `AI plan for ${uName} · Four workouts selected from your recent activity`;

    const routine = getPersonalizedRoutine();
    let completedTasks = [];
    try {
        completedTasks = JSON.parse(localStorage.getItem(TODAY_DATE_KEY) || '[]');
        if (!Array.isArray(completedTasks)) completedTasks = [];
    } catch (error) {
        console.warn('Could not restore today’s workout completion.', error);
    }

    blocksGrid.innerHTML = '';
    let doneCount = 0;
    routine.forEach(task => {
        const isDone = completedTasks.includes(task.id);
        if (isDone) doneCount++;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = `routine-block ${isDone ? 'completed' : ''}`;

        const top = document.createElement('div');
        top.className = 'routine-block-top';
        const name = document.createElement('span');
        name.className = 'routine-block-name';
        name.textContent = task.name;
        const badge = document.createElement('span');
        badge.className = `routine-badge ${isDone ? 'done' : 'pending'}`;
        badge.textContent = isDone ? 'Done' : 'Start';
        top.append(name, badge);

        const target = document.createElement('div');
        target.className = 'routine-block-goal';
        target.textContent = `Target: ${task.target}`;
        const reason = document.createElement('div');
        reason.className = 'routine-block-reason';
        reason.textContent = isDone ? 'Completed today' : task.reason || 'Tap to start this workout.';
        card.append(top, target, reason);
        card.addEventListener('click', () => {
            if (selectExercise) {
                selectExercise.value = task.name;
                selectExercise.dispatchEvent(new Event('change'));
            }
            openWorkoutModal();
        });
        blocksGrid.appendChild(card);
    });

    if (counter) {
        counter.textContent = `${doneCount} / ${routine.length} Completed`;
        counter.style.background = doneCount === routine.length ? '#10b981' : '#000';
        if (doneCount === routine.length) counter.textContent = 'All Done Today!';
    }
}

function generateMonthlyGoals() {
    const goals = monthlyPlan?.monthlyGoals;
    return Array.isArray(goals) && goals.length >= 3 ? goals : getFallbackMonthlyPlan();
}

function getMonthlyProgress(goal) {
    const now = new Date();
    return logs.reduce((total, log) => {
        if (log.name !== goal.name) return total;
        const timestamp = Number(log.timestamp);
        if (!Number.isFinite(timestamp)) return total;
        const date = new Date(timestamp);
        if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return total;
        if (goal.unit === 'reps') return total + (Number(log.reps) || 0);
        if (goal.unit === 'km') return total + (Number(log.distanceKm) || 0);
        if (goal.unit === 'minutes') return total + (Number(log.seconds) || 0) / 60;
        return total;
    }, 0);
}

function renderMonthlyGoals() {
    const section = document.getElementById('monthly-goals-section');
    const goalsList = document.getElementById('goals-list');
    const monthLabel = document.getElementById('goals-month-label');
    if (!section || !goalsList) return;

    if (localStorage.getItem('userRegistered') !== 'true') {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthLabel) monthLabel.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()} · AI goals based on your workouts`;

    goalsList.innerHTML = '';
    generateMonthlyGoals().forEach(goal => {
        const current = getMonthlyProgress(goal);
        const pct = Math.min(100, Math.round(current / goal.target * 100));
        const isComplete = current >= goal.target;
        const unitLabel = goal.unit === 'km' ? 'km' : goal.unit;
        const currentText = goal.unit === 'km' ? current.toFixed(1) : Math.floor(current).toLocaleString();

        const card = document.createElement('article');
        card.className = 'goal-card';
        const top = document.createElement('div');
        top.className = 'goal-card-top';
        const name = document.createElement('span');
        name.className = 'goal-name';
        name.textContent = `${isComplete ? '✓ ' : ''}${goal.target.toLocaleString()} ${unitLabel} ${goal.name}`;
        const count = document.createElement('span');
        count.className = 'goal-count';
        count.textContent = `${currentText} / ${goal.target.toLocaleString()} ${unitLabel}`;
        top.append(name, count);
        const bar = document.createElement('div');
        bar.className = 'goal-progress-bar-bg';
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-label', `${goal.name} monthly goal`);
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', String(goal.target));
        bar.setAttribute('aria-valuenow', String(Math.min(goal.target, current)));
        const fill = document.createElement('div');
        fill.className = `goal-progress-bar-fill ${isComplete ? 'complete' : ''}`;
        fill.style.width = `${pct}%`;
        bar.appendChild(fill);
        card.append(top, bar);
        goalsList.appendChild(card);
    });
}

window.addEventListener('fitpulse:user-registered', ensureWorkoutPlans);

init();
