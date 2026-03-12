let currentAggression = 'neutral'; // Default
const currentSiteKey = getCurrentSiteKey();

chrome.storage.local.get({ isSnoozed: false, aggressionLevel: 'neutral' }, (config) => {
    if (config.isSnoozed) return; // Emergency switch is on. Let YouTube load normally.
    currentAggression = config.aggressionLevel;
    initSpeedBump();
});

let sessionStartTime = Date.now();
let hitTenMinuteMark = false;
let sessionLogged = false;

// Aggression Settings Map
const settings = {
    soft: { bumpDelay: 1000, timerSeconds: 900, allowStay: true, autoClose: false }, // 15 mins
    neutral: { bumpDelay: 2000, timerSeconds: 600, allowStay: true, autoClose: false }, // 10 mins
    harsh: { bumpDelay: 3000, timerSeconds: 300, allowStay: false, autoClose: false }, // 5 mins
    aggressive: { bumpDelay: 5000, timerSeconds: 300, allowStay: false, autoClose: true } // 5 mins
};

function getCurrentSiteKey() {
    const hostname = window.location.hostname.replace(/^www\./, '');

    if (hostname.endsWith('youtube.com')) return 'youtube';
    if (hostname.endsWith('instagram.com')) return 'instagram';
    if (hostname.endsWith('tiktok.com')) return 'tiktok';
    if (hostname.endsWith('x.com') || hostname.endsWith('twitter.com')) return 'twitter';
    if (hostname.endsWith('snapchat.com')) return 'snapchat';

    return null;
}

function normalizeSiteStat(siteStat) {
    return {
        totalMinutes: siteStat?.totalMinutes || 0,
        totalSessions: siteStat?.totalSessions || 0,
        ignoredWarnings: siteStat?.ignoredWarnings || 0,
        timeMap: siteStat?.timeMap || {}
    };
}

function initSpeedBump() {
    if (!sessionStorage.getItem('speedBumpCleared')) {
        createSpeedBump();
    } else if (sessionStorage.getItem('speedBumpCleared') && !sessionStorage.getItem('timerFinished')) {
        startTimer();
    }
}

function createSpeedBump() {
    document.documentElement.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.id = 'speed-bump-overlay';

    const text = document.createElement('div');
    text.id = 'speed-bump-text';
    text.innerText = 'break time. did you earn it?';

    const btnContainer = document.createElement('div');
    btnContainer.className = 'speed-bump-btn-container';

    const btnYes = document.createElement('button');
    btnYes.className = 'speed-bump-btn';
    btnYes.innerText = 'yes';

    const btnNo = document.createElement('button');
    btnNo.className = 'speed-bump-btn';
    btnNo.innerText = 'not really';

    btnContainer.appendChild(btnYes);
    btnContainer.appendChild(btnNo);

    overlay.appendChild(text);
    overlay.appendChild(btnContainer);
    document.documentElement.appendChild(overlay);

    const handleChoice = () => {
        text.style.opacity = '0';
        
        setTimeout(() => {
            text.innerText = 'okay. be intentional.';
            text.style.opacity = '1';
            btnContainer.style.display = 'none';
        }, 300);

        const delay = settings[currentAggression].bumpDelay;

        setTimeout(() => {
            overlay.remove();
            document.documentElement.style.overflow = '';
            sessionStorage.setItem('speedBumpCleared', 'true');
            startTimer();
        }, delay);
    };

    btnYes.addEventListener('click', handleChoice);
    btnNo.addEventListener('click', handleChoice);
}

function startTimer() {
    if (document.getElementById('speed-bump-timer')) return;

    const timerEl = document.createElement('div');
    timerEl.id = 'speed-bump-timer';
    document.documentElement.appendChild(timerEl);

    let timeLeft = settings[currentAggression].timerSeconds; 
    updateDisplay(timeLeft, timerEl);

    const countdown = setInterval(() => {
        timeLeft--;
        updateDisplay(timeLeft, timerEl);

        if (timeLeft <= 0) {
            clearInterval(countdown);
            timerEl.remove();
            sessionStorage.setItem('timerFinished', 'true');
            triggerTimeUp();
        }
    }, 1000);
}

function updateDisplay(secondsLeft, element) {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    element.innerText = `${formattedMinutes}:${formattedSeconds}`;
}

function triggerTimeUp() {
    hitTenMinuteMark = true; // Track that the user hit their time limit
    
    // If aggressive, close immediately. No modal.
    if (settings[currentAggression].autoClose) {
        window.location.href = "about:blank";
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'ten-min-modal-wrapper';

    const modal = document.createElement('div');
    modal.id = 'ten-min-modal';

    const text = document.createElement('div');
    text.style.fontSize = '24px';
    text.style.marginBottom = '30px';
    text.innerText = 'time\'s up.';

    const btnContainer = document.createElement('div');
    btnContainer.className = 'speed-bump-btn-container';
    btnContainer.style.justifyContent = 'center';

    if (settings[currentAggression].allowStay) {
        const btnStay = document.createElement('button');
        btnStay.className = 'speed-bump-btn';
        btnStay.innerText = 'stay';
        btnStay.addEventListener('click', () => {
            wrapper.remove();
        });
        btnContainer.appendChild(btnStay);
    }

    const btnClose = document.createElement('button');
    btnClose.className = 'speed-bump-btn';
    btnClose.innerText = 'close tab';
    btnClose.addEventListener('click', () => {
        window.location.href = "about:blank"; 
    });
    btnContainer.appendChild(btnClose);

    modal.appendChild(text);
    modal.appendChild(btnContainer);
    wrapper.appendChild(modal);
    document.documentElement.appendChild(wrapper);
}

// --- TRACKING LOGIC ---
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !sessionLogged) {
        recordSessionData();
        sessionLogged = true;
    }
});

window.addEventListener('beforeunload', () => {
    if (!sessionLogged) {
        recordSessionData();
        sessionLogged = true;
    }
});

function recordSessionData() {
    if (!currentSiteKey) return;

    const sessionDurationMins = (Date.now() - sessionStartTime) / 60000;
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours(); 
    const timeKey = `${day}-${hour}`;

    chrome.storage.local.get({
        totalMinutes: 0,
        totalSessions: 0,
        ignoredWarnings: 0,
        timeMap: {},
        siteStats: {}
    }, (data) => {
        const updatedTimeMap = { ...data.timeMap };
        updatedTimeMap[timeKey] = (updatedTimeMap[timeKey] || 0) + 1;

        const updatedSiteStats = { ...data.siteStats };
        const currentSiteStats = normalizeSiteStat(updatedSiteStats[currentSiteKey]);
        const updatedSiteTimeMap = { ...currentSiteStats.timeMap };
        updatedSiteTimeMap[timeKey] = (updatedSiteTimeMap[timeKey] || 0) + 1;

        updatedSiteStats[currentSiteKey] = {
            totalMinutes: currentSiteStats.totalMinutes + sessionDurationMins,
            totalSessions: currentSiteStats.totalSessions + 1,
            ignoredWarnings: currentSiteStats.ignoredWarnings + (hitTenMinuteMark ? 1 : 0),
            timeMap: updatedSiteTimeMap
        };

        chrome.storage.local.set({
            totalMinutes: data.totalMinutes + sessionDurationMins,
            totalSessions: data.totalSessions + 1,
            ignoredWarnings: data.ignoredWarnings + (hitTenMinuteMark ? 1 : 0),
            timeMap: updatedTimeMap,
            siteStats: updatedSiteStats
        });
    });
}