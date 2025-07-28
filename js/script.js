// DOM Elements
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const typingIndicator = document.getElementById('typingIndicator');
const themeToggle = document.getElementById('themeToggle');

// Bot responses will be handled by mock query system

// Message queue for chatbot notifications
let chatbotMessageQueue = [];
let chatbotIsShowingMessage = false;
let chatbotCurrentToast = null;

// Toastify helper function for chatbot notifications
function showToast(message, type = 'success') {
    // Add message to queue
    chatbotMessageQueue.push({ message, type });

    // Process queue if not already showing a message
    if (!chatbotIsShowingMessage) {
        processChatbotMessageQueue();
    }
}

function processChatbotMessageQueue() {
    // Clear any existing toast first
    if (chatbotCurrentToast) {
        try {
            chatbotCurrentToast.hideToast();
        } catch (e) {
            // Ignore errors if toast is already hidden
        }
        chatbotCurrentToast = null;
    }

    // Remove any existing toasts from DOM
    const existingToasts = document.querySelectorAll('.toastify');
    existingToasts.forEach(toast => {
        try {
            toast.remove();
        } catch (e) {
            // Ignore errors
        }
    });

    if (chatbotMessageQueue.length === 0) {
        chatbotIsShowingMessage = false;
        return;
    }

    chatbotIsShowingMessage = true;
    const { message, type } = chatbotMessageQueue.shift();

    let backgroundColor;
    let icon;

    switch(type) {
        case 'success':
            backgroundColor = 'linear-gradient(to right, #00b09b, #96c93d)';
            icon = '✅';
            break;
        case 'error':
            backgroundColor = 'linear-gradient(to right, #ff5f6d, #ffc371)';
            icon = '❌';
            break;
        case 'warning':
            backgroundColor = 'linear-gradient(to right, #f093fb, #f5576c)';
            icon = '⚠️';
            break;
        case 'info':
            backgroundColor = 'linear-gradient(to right, #4facfe, #00f2fe)';
            icon = 'ℹ️';
            break;
        default:
            backgroundColor = 'linear-gradient(to right, #667eea, #764ba2)';
            icon = '📝';
    }

    chatbotCurrentToast = Toastify({
        text: `${icon} ${message}`,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "center",
        stopOnFocus: true,
        style: {
            background: backgroundColor,
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "12px 40px 12px 16px"
        },
        callback: () => {
            // When this message finishes, process the next one
            chatbotCurrentToast = null;
            setTimeout(() => {
                processChatbotMessageQueue();
            }, 300); // Small delay between messages
        },
        onClick: () => {
            // When clicked, immediately process next message
            if (chatbotCurrentToast) {
                chatbotCurrentToast.hideToast();
                chatbotCurrentToast = null;
            }
            setTimeout(() => {
                processChatbotMessageQueue();
            }, 100);
        }
    });

    chatbotCurrentToast.showToast();
}

// SweetAlert2 helper function for chatbot dialogs
function showAlert(title, text, icon = 'info', showConfirmButton = true) {
    return Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showConfirmButton: showConfirmButton,
        background: '#fff',
        color: '#333',
        customClass: {
            popup: 'swal-popup-chatbot',
            title: 'swal-title-chatbot',
            content: 'swal-content-chatbot'
        },
        timer: showConfirmButton ? null : 3000
    });
}

// Login required prompt - directly opens login popup
function showLoginRequired(message = "Please login to access this information") {
    // Show a brief toast notification
    showToast('Opening student login...', 'info');

    // Directly open the login popup
    setTimeout(() => {
        if (typeof openLoginPopup === 'function') {
            openLoginPopup('student');
        }
    }, 300);
}

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

        // Enhanced query processing with library integration
        if (isPublicPage && isPrivateQuery(message)) {
            // Handle private query on public page with SweetAlert2
            handlePrivateQueryWithAlert(message);
        } else if (isPublicPage && typeof handlePublicQuery === 'function') {
            // Handle public query with enhanced feedback
            const publicResponse = handlePublicQuery(message);
            addMessageHTML(publicResponse);

            // Show success toast for data retrieval
            if (message.toLowerCase().includes('timetable') ||
                message.toLowerCase().includes('fee') ||
                message.toLowerCase().includes('course')) {
                showToast('Data loaded successfully!', 'success');
            }
        } else {
            // Default response - mock functionality
            addMessage("I'm here to help! This is a demo version with mock data.");
        }
    }, responseDelay);
}

// Enhanced private query handler - directly open login popup
function handlePrivateQueryWithAlert(message) {
    // Add a message to chat indicating login is required
    addMessage("🔒 This information requires authentication. Opening login window...");

    // Show a brief toast notification
    showToast('Opening student login...', 'info');

    // Directly open the login popup after a short delay
    setTimeout(() => {
        if (typeof openLoginPopup === 'function') {
            openLoginPopup('student');
        }
    }, 500);
}

// Check if query requires authentication
function isPrivateQuery(message) {
    const privateKeywords = [
        'my fee', 'fee due', 'my result', 'my attendance',
        'my marks', 'personal', 'account', 'profile'
    ];

    return privateKeywords.some(keyword =>
        message.toLowerCase().includes(keyword)
    );
}

// Display timetable using Tabulator in chat
function displayTimetableInChat(timetableData) {
    const tableContainer = document.createElement('div');
    tableContainer.style.cssText = `
        margin: 10px 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 100%;
    `;

    const tableId = 'chatTimetable_' + Date.now();
    tableContainer.id = tableId;

    // Add the table container to chat
    addMessage(tableContainer);

    // Initialize Tabulator for timetable
    new Tabulator(`#${tableId}`, {
        height: "300px",
        data: timetableData,
        layout: "fitColumns",
        columns: [
            {title: "Time", field: "time", width: 100},
            {title: "Monday", field: "monday", width: 120},
            {title: "Tuesday", field: "tuesday", width: 120},
            {title: "Wednesday", field: "wednesday", width: 120},
            {title: "Thursday", field: "thursday", width: 120},
            {title: "Friday", field: "friday", width: 120},
            {title: "Saturday", field: "saturday", width: 120}
        ]
    });

    showToast('Timetable loaded successfully!', 'info');
}

// Display notices using Tabulator in chat
function displayNoticesInChat(noticesData) {
    const tableContainer = document.createElement('div');
    tableContainer.style.cssText = `
        margin: 10px 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 100%;
    `;

    const tableId = 'chatNotices_' + Date.now();
    tableContainer.id = tableId;

    // Add the table container to chat
    addMessage(tableContainer);

    // Initialize Tabulator for notices
    new Tabulator(`#${tableId}`, {
        height: "250px",
        data: noticesData,
        layout: "fitColumns",
        columns: [
            {title: "Date", field: "date", width: 100, sorter: "date"},
            {title: "Title", field: "title", width: 200},
            {title: "Category", field: "category", width: 100},
            {title: "Priority", field: "priority", width: 80,
             formatter: function(cell) {
                 const value = cell.getValue();
                 const color = value === 'High' ? '#ff4444' : value === 'Medium' ? '#ffaa00' : '#44ff44';
                 return `<span style="color: ${color}; font-weight: bold;">${value}</span>`;
             }
            }
        ]
    });

    showToast('Notices loaded successfully!', 'info');
}

// Enhanced login prompt function removed - now directly opens login popup

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
