/* ==========================================================================
   TYPING SPEED PUNISHER - POLICE DEPARTMENT JAVASCRIPT ENGINE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // --- Application State ---
    const state = {
        currentWPM: 0,
        previousWPM: 0,
        acceleration: 0,
        maxWPM: 0,
        punishmentLevel: 0,
        punishmentCount: 0,
        charCount: 0,
        startTime: null,
        elapsedSeconds: 0,
        soundEnabled: true,
        isLevel4PopupOpen: false,
        isLevel5Lockdown: false,
        
        // Keystroke timestamp array for real-time WPM
        keystrokes: [], // { time: ms }
        lastTypingTime: null,
        timerInterval: null
    };

    // --- DOM Elements ---
    const typingBox = document.getElementById("typingBox");
    const wpmDisplay = document.getElementById("wpm");
    const accelerationDisplay = document.getElementById("acceleration");
    const levelDisplay = document.getElementById("punishment-level");
    const punishmentsDisplay = document.getElementById("punishments");
    const charCountDisplay = document.getElementById("char-count");
    const timeSpentDisplay = document.getElementById("time-spent");
    const maxWpmDisplay = document.getElementById("max-wpm");

    const statusBar = document.getElementById("status-bar");
    const statusText = document.getElementById("status");
    const punishmentMsgBox = document.getElementById("punishment");
    const flashOverlay = document.getElementById("flash-overlay");
    const practiceNoteText = document.getElementById("practice-note");
    const btnNextNote = document.getElementById("btn-next-note");

    // Controls
    const btnSound = document.getElementById("btn-sound");
    const btnReset = document.getElementById("btn-reset");

    // Modals
    const modalLevel4 = document.getElementById("modal-level4");
    const level4Msg = document.getElementById("level4-msg");
    const btnCloseLevel4 = document.getElementById("btn-close-level4");

    const modalLevel5 = document.getElementById("modal-level5");
    const captchaInput = document.getElementById("captcha-input");
    const btnSubmitCaptcha = document.getElementById("btn-submit-captcha");
    const captchaFeedback = document.getElementById("captcha-feedback");

    // --- Practice Notes Library ---
    const PRACTICE_NOTES = [
        "The quick brown fox jumps over the lazy dog. Typing with steady rhythm is an art form. Do not rush your fingers or exceed thirty words per minute, or the typing speed police department will issue a fine.",
        "Speed is a virtue in sports, but in typing class, speed is a crime. Keep your fingers calm, breathe deeply, and refrain from reckless keyboard driving.",
        "A quiet keypress makes a happy computer. When you type like a maniac, your mechanical switches cry out for mercy and your keyboard warranty is voided.",
        "Maintain a steady rate of thirty words per minute. Anything faster is considered reckless keyboard operation by order of the Typing Speed Police Department.",
        "Precision beats velocity every single time. Take your time, hit each key with care, and enjoy the peaceful art of slow typing."
    ];

    let currentNoteIndex = 0;
    btnNextNote.addEventListener("click", () => {
        currentNoteIndex = (currentNoteIndex + 1) % PRACTICE_NOTES.length;
        practiceNoteText.textContent = PRACTICE_NOTES[currentNoteIndex];
    });

    // --- Web Audio API Synthesizer ---
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playWarningBeep() {
        if (!state.soundEnabled) return;
        initAudio();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }

    function playSirenAlarm() {
        if (!state.soundEnabled) return;
        initAudio();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        osc.frequency.linearRampToValueAtTime(600, now + 0.4);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(now + 0.4);
    }

    // --- Level 3 Random Messages ---
    const LEVEL3_MESSAGES = [
        "WHY ARE YOU TYPING SO FAST?",
        "CALM DOWN BRO",
        "ARE YOU BEING CHASED?",
        "THIS IS NOT A RACE"
    ];

    // --- Level 4 Random Funny Punishment Messages ---
    const LEVEL4_MESSAGES = [
        "🚨 RECKLESS TYPING TICKET ISSUED! $500 FINE!",
        "🔥 YOUR FINGERNAILS ARE OVERHEATING! CALL 911!",
        "⚠️ SLOW DOWN OR YOUR KEYBOARD WILL EXPLODE!",
        "🚓 POLICE OFFICERS ARE PURSUING YOUR KEYBOARD!",
        "💀 YOU ARE BREAKING THE SOUND BARRIER! STOP!"
    ];

    function getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- Snappy Real-Time WPM Engine ---
    function calculateWPM() {
        const now = Date.now();
        // 2.5 second rolling window for quick responsive feedback
        state.keystrokes = state.keystrokes.filter(t => now - t < 2500);

        if (state.keystrokes.length < 2) return 0;

        const charCount = state.keystrokes.length;
        const windowTimeMs = Math.max(600, now - state.keystrokes[0]);
        const timeSpanMinutes = windowTimeMs / 1000 / 60;

        // Standard formula: (characters / 5) / minutes
        const rawWPM = (charCount / 5) / timeSpanMinutes;
        return Math.round(rawWPM);
    }

    // --- Active Timer ---
    function startTimerIfNeeded() {
        if (!state.startTime) {
            state.startTime = Date.now();
            state.timerInterval = setInterval(() => {
                if (state.startTime) {
                    state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
                    updateTimeDisplay();
                }
            }, 1000);
        }
    }

    function updateTimeDisplay() {
        const mins = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
        const secs = String(state.elapsedSeconds % 60).padStart(2, '0');
        timeSpentDisplay.textContent = `${mins}:${secs}`;
    }

    // --- Keystroke Listener ---
    typingBox.addEventListener("input", () => {
        if (state.isLevel5Lockdown) return;

        initAudio();
        startTimerIfNeeded();

        const now = Date.now();
        state.lastTypingTime = now;
        state.keystrokes.push(now);

        state.charCount = typingBox.value.length;
        charCountDisplay.textContent = state.charCount;

        const wpm = calculateWPM();
        state.currentWPM = wpm;

        if (wpm > state.maxWPM) {
            state.maxWPM = wpm;
        }

        updateDashboard();
        evaluatePunishmentLevel();
    });

    // Fast decay interval (300ms) to reset WPM & calculate acceleration quickly
    setInterval(() => {
        const now = Date.now();
        if (state.lastTypingTime && (now - state.lastTypingTime > 1200)) {
            state.keystrokes = [];
        }

        const wpm = calculateWPM();
        state.currentWPM = wpm;

        // Acceleration calculation
        state.acceleration = wpm - state.previousWPM;
        state.previousWPM = wpm;

        updateDashboard();
        evaluatePunishmentLevel();
    }, 300);

    // --- Dashboard UI Updates ---
    function updateDashboard() {
        wpmDisplay.textContent = state.currentWPM;
        accelerationDisplay.textContent = (state.acceleration > 0 ? `+${state.acceleration}` : state.acceleration);
        levelDisplay.textContent = `L${state.punishmentLevel}`;
        punishmentsDisplay.textContent = state.punishmentCount;
        charCountDisplay.textContent = state.charCount;
        maxWpmDisplay.textContent = state.maxWPM;
    }

    // --- Punishment Level Evaluator (RESTORED EXACT INTENSE LEVELS) ---
    let lastEvaluatedLevel = -1;

    function evaluatePunishmentLevel() {
        const wpm = state.currentWPM;
        let newLevel = 0;

        // RESTORED INTENSE PUNISHMENT LIMITS:
        // L0: < 30 WPM (Safe)
        // L1: 30 - 50 WPM (Warning)
        // L2: 50 - 70 WPM (Flash & Sound)
        // L3: 70 - 90 WPM (Mild Shake & Messages)
        // L4: 90 - 110 WPM (Strong Shake & Popup Ticket)
        // L5: > 110 WPM (Max Chaos & Maniac Captcha Lockdown)

        if (wpm < 30) {
            newLevel = 0;
        } else if (wpm >= 30 && wpm < 50) {
            newLevel = 1;
        } else if (wpm >= 50 && wpm < 70) {
            newLevel = 2;
        } else if (wpm >= 70 && wpm < 90) {
            newLevel = 3;
        } else if (wpm >= 90 && wpm <= 110) {
            newLevel = 4;
        } else if (wpm > 110) {
            newLevel = 5;
        }

        // Increment punishment counter when transitioning up to a higher level
        if (newLevel > lastEvaluatedLevel && newLevel >= 1) {
            state.punishmentCount++;
        }
        state.punishmentLevel = newLevel;
        lastEvaluatedLevel = newLevel;

        updateDashboard();
        applyLevelEffects(newLevel);
    }

    // --- Apply Level Specific Effects & Punishments ---
    function applyLevelEffects(level) {
        // Reset classes on body and textarea
        document.body.className = "";
        typingBox.className = "";
        statusBar.className = "status-bar lvl-" + level;

        if (level === 0) {
            // Level 0: Below 30 WPM - Safe
            statusText.textContent = "You're safe 🟢";
            punishmentMsgBox.textContent = "You're typing at a safe speed. Keep it up.";
        }
        else if (level === 1) {
            // Level 1: 30-50 WPM - Warning
            statusText.textContent = "⚠️ Slow down!";
            typingBox.classList.add("border-lvl-1");
            punishmentMsgBox.textContent = "⚠️ Warning: Speed limit approaching. Please slow down!";
        }
        else if (level === 2) {
            // Level 2: 50-70 WPM - Flash screen & warning sound
            statusText.textContent = "⚡ SPEED LIMIT VIOLATION";
            typingBox.classList.add("border-lvl-2");
            punishmentMsgBox.textContent = "⚡ SPEED TRAP FLASHED! SLOW DOWN IMMEDIATELY!";
            
            triggerScreenFlash();
            playWarningBeep();
        }
        else if (level === 3) {
            // Level 3: 70-90 WPM - Shake screen & random funny messages
            statusText.textContent = "🚨 RECKLESS TYPING ENFORCEMENT";
            document.body.classList.add("shake-level3", "siren-active");
            typingBox.classList.add("border-lvl-3");
            
            const msg = getRandomItem(LEVEL3_MESSAGES);
            punishmentMsgBox.textContent = `😡 ${msg}`;
            playSirenAlarm();
        }
        else if (level === 4) {
            // Level 4: 90-110 WPM - Strong screen shake & Large popup
            statusText.textContent = "💀 DANGER: CRITICAL SPEED";
            document.body.classList.add("shake-level4", "siren-active");
            typingBox.classList.add("border-lvl-4");
            
            const msg = getRandomItem(LEVEL4_MESSAGES);
            punishmentMsgBox.textContent = msg;
            
            triggerLevel4Popup(msg);
            playSirenAlarm();
        }
        else if (level === 5) {
            // Level 5: Above 110 WPM - Maximum chaos & Maniac Captcha
            statusText.textContent = "🔥 MAXIMUM CHAOS MODE 🔥";
            document.body.classList.add("shake-level5", "siren-active");
            typingBox.classList.add("border-lvl-5");
            
            punishmentMsgBox.textContent = "🔥 MAXIMUM CHAOS! TYPING LOCKED!";
            
            triggerLevel5Lockdown();
            playSirenAlarm();
        }
    }

    // --- Screen Flash Trigger ---
    function triggerScreenFlash() {
        flashOverlay.classList.add("flash-active");
        setTimeout(() => {
            flashOverlay.classList.remove("flash-active");
        }, 120);
    }

    // --- Level 4 Popup Trigger ---
    function triggerLevel4Popup(msgText) {
        if (state.isLevel4PopupOpen || state.isLevel5Lockdown) return;
        state.isLevel4PopupOpen = true;

        level4Msg.textContent = msgText;
        modalLevel4.classList.remove("hidden");
    }

    btnCloseLevel4.addEventListener("click", () => {
        modalLevel4.classList.add("hidden");
        state.isLevel4PopupOpen = false;
        state.keystrokes = [];
        typingBox.focus();
    });

    // --- Level 5 Maniac Captcha Lockdown ---
    function triggerLevel5Lockdown() {
        if (state.isLevel5Lockdown) return;
        state.isLevel5Lockdown = true;

        if (!modalLevel4.classList.contains("hidden")) {
            modalLevel4.classList.add("hidden");
            state.isLevel4PopupOpen = false;
        }

        modalLevel5.classList.remove("hidden");
        typingBox.blur();

        captchaInput.value = "";
        captchaFeedback.textContent = "";
        btnSubmitCaptcha.disabled = true;
        captchaInput.focus();
    }

    captchaInput.addEventListener("input", () => {
        const val = captchaInput.value.trim();
        const target = "I WILL NOT TYPE LIKE A MANIAC";

        if (val.toUpperCase() === target) {
            btnSubmitCaptcha.disabled = false;
            captchaFeedback.textContent = "✅ Correct! Click unlock to resume typing.";
            captchaFeedback.style.color = "#00ff66";
        } else {
            btnSubmitCaptcha.disabled = true;
            if (val.length > 0 && target.indexOf(val.toUpperCase()) !== 0) {
                captchaFeedback.textContent = "❌ Typo detected! Match exact case.";
                captchaFeedback.style.color = "#ff0055";
            } else {
                captchaFeedback.textContent = "";
            }
        }
    });

    btnSubmitCaptcha.addEventListener("click", () => {
        modalLevel5.classList.add("hidden");
        state.isLevel5Lockdown = false;
        state.keystrokes = [];
        state.currentWPM = 0;
        updateDashboard();
        typingBox.focus();
    });

    // --- Action Buttons ---
    btnSound.addEventListener("click", () => {
        state.soundEnabled = !state.soundEnabled;
        btnSound.textContent = state.soundEnabled ? "🔊 Sound: ON" : "🔇 Sound: OFF";
    });

    btnReset.addEventListener("click", () => {
        typingBox.value = "";
        state.keystrokes = [];
        state.currentWPM = 0;
        state.previousWPM = 0;
        state.acceleration = 0;
        state.maxWPM = 0;
        state.punishmentLevel = 0;
        state.punishmentCount = 0;
        state.charCount = 0;
        state.elapsedSeconds = 0;
        state.startTime = null;
        state.isLevel4PopupOpen = false;
        state.isLevel5Lockdown = false;

        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }

        modalLevel4.classList.add("hidden");
        modalLevel5.classList.add("hidden");

        updateDashboard();
        updateTimeDisplay();
        applyLevelEffects(0);
        typingBox.focus();
    });
});