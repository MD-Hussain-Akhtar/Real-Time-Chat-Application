document.addEventListener('keydown', (event) => {
    const msgInput = document.getElementById('msgInput');
    const startCallBtn = document.getElementById('startCallBtn');
    const endCallBtn = document.getElementById('endCallBtn');

    // 1. Ctrl + M -> Focus message text bar instantly
    if (event.ctrlKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        msgInput.focus();
    }

    // 2. Ctrl + V -> Direct Video Dial Trigger
    if (event.ctrlKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        if (!startCallBtn.disabled) startCallBtn.click();
    }

    // 3. Escape (Esc) -> Instantly disconnect current ongoing active room call
    if (event.key === 'Escape') {
        event.preventDefault();
        endCallBtn.click();
    }
});