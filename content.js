// Check session storage to see where we are in the loop
if (!sessionStorage.getItem('speedBumpCleared')) {
    createSpeedBump();
} else if (sessionStorage.getItem('speedBumpCleared') && !sessionStorage.getItem('timerFinished')) {
    // If they cleared the bump but the timer hasn't finished, start/resume the timer
    startTenMinuteTimer();
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
    // Prevent multiple timers if the script runs twice
    if (document.getElementById('speed-bump-timer')) return;

    // Create and inject the timer element
    const timerEl = document.createElement('div');
    timerEl.id = 'speed-bump-timer';
    document.documentElement.appendChild(timerEl);

    // 10 minutes in seconds (Change this to 5 to test it quickly!)
    let timeLeft = 600; 

    // Update the clock immediately before the first second ticks
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
    // Pad with leading zeros (e.g., 09:05)
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    element.innerText = `${formattedMinutes}:${formattedSeconds}`;
}

function showTenMinuteModal() {
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