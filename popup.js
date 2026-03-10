document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    checkSnoozeStatus();

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
        });
    });
});

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
        timeMap: {}
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
            peakTimeStr = `${daysOfWeek[parseInt(dayStr)]}, ${formatAmPm(parseInt(hourStr))}`;
        }

        document.getElementById('val-total-time').innerText = totalTimeStr;
        document.getElementById('val-avg-time').innerText = `${Math.round(avgTimeMins)}m`;
        document.getElementById('val-ignored').innerText = data.ignoredWarnings;
        document.getElementById('val-peak-time').innerText = peakTimeStr;
    });
}