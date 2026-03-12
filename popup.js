document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    checkSnoozeStatus();
    initAggressionSelector();

    // Hidden Emergency Switch
    document.getElementById('secret-switch').addEventListener('dblclick', () => {
        chrome.storage.local.get(['isSnoozed'], (data) => {
            const newState = !data.isSnoozed;
            chrome.storage.local.set({ isSnoozed: newState }, () => {
                checkSnoozeStatus();
            });
        });
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        chrome.storage.local.clear(() => {
            loadStats();
            checkSnoozeStatus();
            document.getElementById('aggression-select').value = 'neutral';
        });
    });
});

const trackedSites = [
    { key: 'youtube', label: 'YouTube' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'twitter', label: 'Twitter / X' },
    { key: 'snapchat', label: 'Snapchat' }
];

function initAggressionSelector() {
    const selectEl = document.getElementById('aggression-select');
    
    // Load saved level, default to neutral
    chrome.storage.local.get({ aggressionLevel: 'neutral' }, (data) => {
        selectEl.value = data.aggressionLevel;
    });

    // Save new level when changed
    if (!selectEl.dataset.bound) {
        selectEl.addEventListener('change', (e) => {
            chrome.storage.local.set({ aggressionLevel: e.target.value });
        });
        selectEl.dataset.bound = 'true';
    }
}

function checkSnoozeStatus() {
    chrome.storage.local.get(['isSnoozed'], (data) => {
        document.getElementById('snooze-status').style.display = data.isSnoozed ? 'inline' : 'none';
    });
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatAmPm(hour) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour} ${ampm}`;
}

function loadStats() {
    chrome.storage.local.get({
        totalMinutes: 0,
        totalSessions: 0,
        ignoredWarnings: 0,
        timeMap: {},
        siteStats: {}
    }, (data) => {
        
        // Total Time formatting
        let totalTimeStr = `${Math.round(data.totalMinutes)}m`;
        if (data.totalMinutes > 60) {
            totalTimeStr = `${(data.totalMinutes / 60).toFixed(1)}h`;
        }

        // Avg Time
        let avgTimeMins = data.totalSessions === 0 ? 0 : data.totalMinutes / data.totalSessions;
        
        // Peak Time Calculation
        let peakTimeStr = "--";
        if (Object.keys(data.timeMap).length > 0) {
            let peakKey = Object.keys(data.timeMap).reduce((a, b) => data.timeMap[a] > data.timeMap[b] ? a : b);
            let [dayStr, hourStr] = peakKey.split('-');
            peakTimeStr = `${daysOfWeek[parseInt(dayStr, 10)]}, ${formatAmPm(parseInt(hourStr, 10))}`;
        }

        document.getElementById('val-total-time').innerText = totalTimeStr;
        document.getElementById('val-avg-time').innerText = `${Math.round(avgTimeMins)}m`;
        document.getElementById('val-ignored').innerText = data.ignoredWarnings;
        document.getElementById('val-peak-time').innerText = peakTimeStr;

        renderSiteBreakdown(data.siteStats);
    });
}

function renderSiteBreakdown(siteStats) {
    const container = document.getElementById('site-analytics-list');
    container.innerHTML = '';

    trackedSites.forEach((site) => {
        const siteData = normalizeSiteStat(siteStats[site.key]);

        const card = document.createElement('div');
        card.className = 'site-card';

        const headerRow = document.createElement('div');
        headerRow.className = 'site-card-header';

        const name = document.createElement('span');
        name.className = 'site-name';
        name.innerText = site.label;

        const total = document.createElement('span');
        total.className = 'site-total';
        total.innerText = formatMinutes(siteData.totalMinutes);

        headerRow.appendChild(name);
        headerRow.appendChild(total);

        const metaRow = document.createElement('div');
        metaRow.className = 'site-card-meta';
        metaRow.innerText = `${siteData.totalSessions} visits  •  ${siteData.ignoredWarnings} ignored  •  ${getPeakTimeLabel(siteData.timeMap)}`;

        const averageRow = document.createElement('div');
        averageRow.className = 'site-card-average';
        averageRow.innerText = `avg ${formatAverage(siteData.totalMinutes, siteData.totalSessions)} / visit`;

        card.appendChild(headerRow);
        card.appendChild(metaRow);
        card.appendChild(averageRow);
        container.appendChild(card);
    });
}

function normalizeSiteStat(siteStat) {
    return {
        totalMinutes: siteStat?.totalMinutes || 0,
        totalSessions: siteStat?.totalSessions || 0,
        ignoredWarnings: siteStat?.ignoredWarnings || 0,
        timeMap: siteStat?.timeMap || {}
    };
}

function formatMinutes(totalMinutes) {
    if (totalMinutes <= 0) return '0m';
    if (totalMinutes > 60) return `${(totalMinutes / 60).toFixed(1)}h`;
    return `${Math.round(totalMinutes)}m`;
}

function formatAverage(totalMinutes, totalSessions) {
    if (!totalSessions) return '0m';
    return `${Math.round(totalMinutes / totalSessions)}m`;
}

function getPeakTimeLabel(timeMap) {
    if (!Object.keys(timeMap).length) return 'no peak yet';

    const peakKey = Object.keys(timeMap).reduce((a, b) => timeMap[a] > timeMap[b] ? a : b);
    const [dayStr, hourStr] = peakKey.split('-');
    return `${daysOfWeek[parseInt(dayStr, 10)]}, ${formatAmPm(parseInt(hourStr, 10))}`;
}