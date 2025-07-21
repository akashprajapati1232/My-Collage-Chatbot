// DOM Elements
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const typingIndicator = document.getElementById('typingIndicator');
const themeToggle = document.getElementById('themeToggle');

// Bot responses - now handled by query classification system
const botResponses = [
    "I'm currently in development phase. Soon I'll be able to help you with all your college queries!",
    "Thank you for your question! I'm being trained to provide accurate information about college services.",
    "Great question! Once fully deployed, I'll have access to all college databases to assist you better.",
    "I appreciate your interest! My full functionality will be available soon with real-time data access.",
    "I'm learning about Bhagwant Institute of Technology to serve you better. Stay tuned for updates!",
    "Your query is noted! I'll be able to provide detailed information about fees, timetables, and more very soon."
];

// Add message to chat
function addMessage(content, isUser = false, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    if (typeof content === 'string') {
        const p = document.createElement('p');
        p.textContent = content;
        messageContent.appendChild(p);
    } else {
        messageContent.appendChild(content);
    }

    messageBubble.appendChild(messageContent);
    messageDiv.appendChild(messageBubble);

    if (animate) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
    }

    chatMessages.appendChild(messageDiv);

    if (animate) {
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
            messageDiv.style.transition = 'all 0.3s ease-out';
        }, 50);
    }

    // Scroll to bottom
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, animate ? 100 : 0);
}

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.classList.add('show');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    typingIndicator.classList.remove('show');
}

// Handle sending message
function handleSendMessage() {
    const message = chatInput.value.trim();
    if (message === '') return;

    // Add user message
    addMessage(message, true);

    // Clear input
    chatInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Process query based on current page and authentication state
    const responseDelay = Math.random() * 1000 + 1500; // 1.5-2.5 seconds

    setTimeout(() => {
        hideTypingIndicator();

        // Check if we're on the public page and if query is private
        const currentPage = window.location.pathname;
        const isPublicPage = currentPage.includes('index.html') || currentPage === '/' || currentPage === '';

        if (isPublicPage && typeof isPrivateQuery === 'function' && isPrivateQuery(message)) {
            // Handle private query on public page
            const privateResponse = handlePrivateQueryResponse(message);
            addMessageHTML(privateResponse.response);
        } else if (isPublicPage && typeof handlePublicQuery === 'function') {
            // Handle public query
            const publicResponse = handlePublicQuery(message);
            addMessageHTML(publicResponse);
        } else {
            // Default response for authenticated pages or fallback
            const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
            addMessage(randomResponse);
        }
    }, responseDelay);
}

// Add message with HTML content
function addMessageHTML(htmlContent) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = htmlContent;

    messageBubble.appendChild(messageContent);
    messageDiv.appendChild(messageBubble);

    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';

    chatMessages.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
        messageDiv.style.transition = 'all 0.3s ease-out';
    }, 50);

    // Scroll to bottom
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

// Handle suggestion chip clicks
function handleChipClick(query) {
    chatInput.value = query;
    handleSendMessage();
}

// Event listeners
sendBtn.addEventListener('click', handleSendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
    }
});

// Theme toggle functionality
let isDarkMode = false;

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);

    // Save preference to localStorage
    localStorage.setItem('darkMode', isDarkMode);

    // Update theme toggle icon
    updateThemeIcon();

    // Add rotation animation
    themeToggle.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        themeToggle.style.transform = 'rotate(0deg)';
    }, 300);
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector('svg');

    if (isDarkMode) {
        // Moon icon for dark mode
        icon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `;
    } else {
        // Sun icon for light mode
        icon.innerHTML = `
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
    }
}

function initializeTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('darkMode');

    if (savedTheme !== null) {
        isDarkMode = savedTheme === 'true';
    } else {
        // Check system preference
        isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    document.body.classList.toggle('dark-mode', isDarkMode);
    updateThemeIcon();
}

themeToggle.addEventListener('click', toggleTheme);

// Handle suggestion chips
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
        const query = e.target.getAttribute('data-query');
        handleChipClick(query);
    }
});

// Input focus effects
chatInput.addEventListener('focus', function() {
    this.parentElement.style.transform = 'scale(1.02)';
});

chatInput.addEventListener('blur', function() {
    this.parentElement.style.transform = 'scale(1)';
});

// Send button animation
sendBtn.addEventListener('mousedown', function() {
    this.style.transform = 'scale(0.95)';
});

sendBtn.addEventListener('mouseup', function() {
    this.style.transform = 'scale(1.1)';
    setTimeout(() => {
        this.style.transform = 'scale(1)';
    }, 150);
});

// Auto-resize input on mobile
function adjustInputHeight() {
    if (window.innerWidth <= 768) {
        chatInput.style.fontSize = '16px'; // Prevents zoom on iOS
    }
}

// Initialize
window.addEventListener('load', () => {
    adjustInputHeight();
    initializeTheme();

    // Focus on input for better UX
    setTimeout(() => {
        if (window.innerWidth > 768) {
            chatInput.focus();
        }
    }, 500);
});

// Listen for system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        if (localStorage.getItem('darkMode') === null) {
            isDarkMode = e.matches;
            document.body.classList.toggle('dark-mode', isDarkMode);
            updateThemeIcon();
        }
    });
}

window.addEventListener('resize', adjustInputHeight);

// Prevent zoom on iOS when focusing input
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    chatInput.addEventListener('focus', function() {
        this.style.fontSize = '16px';
    });
}
