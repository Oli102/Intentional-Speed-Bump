chrome.storage.local.get(['isSnoozed'], (config) => {
    if (config.isSnoozed) {
        return; // Emergency switch is on. Let YouTube load normally.
    }
    initSpeedBump();
});

let sessionStartTime = Date.now();
let hitTenMinuteMark = false;
let sessionLogged = false;

function initSpeedBump() {
    if (!sessionStorage.getItem('speedBumpCleared')) {
        createSpeedBump();
    } else if (sessionStorage.getItem('speedBumpCleared') && !sessionStorage.getItem('timerFinished')) {
        startTenMinuteTimer();
    }
}

function createSpeedBump() {
    document.documentElement.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.id = 'speed-bump-overlay';

    const text = document.createElement('div');
    text.id = 'speed-bump-text';
    text.innerText = '10 minute break. did you earn it?';

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

        setTimeout(() => {
            overlay.remove();
            document.documentElement.style.overflow = '';
            sessionStorage.setItem('speedBumpCleared', 'true');
            startTenMinuteTimer();
        }, 2000);
    };

    btnYes.addEventListener('click', handleChoice);
    btnNo.addEventListener('click', handleChoice);
}

function startTenMinuteTimer() {
    if (document.getElementById('speed-bump-timer')) return;

    const timerEl = document.createElement('div');
    timerEl.id = 'speed-bump-timer';
    document.documentElement.appendChild(timerEl);

    let timeLeft = 600; 
    updateDisplay(timeLeft, timerEl);

    const countdown = setInterval(() => {
        timeLeft--;
        updateDisplay(timeLeft, timerEl);

        if (timeLeft <= 0) {
            clearInterval(countdown);
            timerEl.remove();
            sessionStorage.setItem('timerFinished', 'true');
            showTenMinuteModal();
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

function showTenMinuteModal() {
    hitTenMinuteMark = true; // TRACKING: Flag that user hit the 10 min mark

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

    const btnStay = document.createElement('button');
    btnStay.className = 'speed-bump-btn';
    btnStay.innerText = 'stay';
    btnStay.addEventListener('click', () => {
        wrapper.remove();
    });

    const btnClose = document.createElement('button');
    btnClose.className = 'speed-bump-btn';
    btnClose.innerText = 'close tab';
    btnClose.addEventListener('click', () => {
        window.location.href = "about:blank"; 
    });

    btnContainer.appendChild(btnStay);
    btnContainer.appendChild(btnClose);

    modal.appendChild(text);
    modal.appendChild(btnContainer);
    wrapper.appendChild(modal);
    document.documentElement.appendChild(wrapper);
}

// --- NEW TRACKING LOGIC ---
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !sessionLogged) {
        recordSessionData();
        sessionLogged = true;
    }
});

// Fallback for closing the window completely
window.addEventListener('beforeunload', () => {
    if (!sessionLogged) {
        recordSessionData();
        sessionLogged = true;
    }
});

function getSiteName() {
    const host = window.location.hostname;
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('x.com')) return 'x';
    return 'other';
}

function recordSessionData() {
    const sessionDurationMins = (Date.now() - sessionStartTime) / 60000;
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours(); 
    const timeKey = `${day}-${hour}`;
    const siteName = getSiteName();

    chrome.storage.local.get({
        totalMinutes: 0,
        totalSessions: 0,
        ignoredWarnings: 0,
        timeMap: {},
        siteMinutes: {}
    }, (data) => {
        
        let updatedTimeMap = data.timeMap;
        updatedTimeMap[timeKey] = (updatedTimeMap[timeKey] || 0) + 1;

        let updatedSiteMinutes = data.siteMinutes;
        updatedSiteMinutes[siteName] = (updatedSiteMinutes[siteName] || 0) + sessionDurationMins;

        chrome.storage.local.set({
            totalMinutes: data.totalMinutes + sessionDurationMins,
            totalSessions: data.totalSessions + 1,
            ignoredWarnings: data.ignoredWarnings + (hitTenMinuteMark ? 1 : 0),
            timeMap: updatedTimeMap,
            siteMinutes: updatedSiteMinutes
        });
    });
}