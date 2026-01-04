// Backend API URL - Replace if needed
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzsia3a2FqqEKB9x4UZIBHi-ibD7BMsYLRfNZOo8TcISim5ruL6MR4tHyuMff6zipoL/exec";

// Constants
const MAX_LIMIT = 15;
const MIN_LIMIT = 10;

// State
let currentData = {
    counts: { "Group A": 0, "Group B": 0 },
    registrations: []
};
let filteredData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    injectChatbot();
});

function injectLoadingOverlay() {
    // ONLY show overlay on Index page (Dashboard)
    if (window.PAGE_CONTEXT === 'GROUP_A' || window.PAGE_CONTEXT === 'GROUP_B') return;

    if (document.getElementById('global-overlay')) return; // Prevent duplicates

    const overlayHTML = `
        <div id="global-overlay" class="loading-overlay">
            <div class="spinner"></div>
            <div class="loading-text">CONNECTING TO NCK SERVER...</div>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', overlayHTML);
}

// fetch data
async function fetchData() {
    // Ensure overlay exists and show it
    injectLoadingOverlay();
    const overlay = document.getElementById('global-overlay');
    if (overlay) overlay.classList.remove('hidden');

    const tableBody = document.getElementById('table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="loading">Refreshing data...</td></tr>';

    if (WEB_APP_URL.includes("REPLACE")) {
        console.warn("API URL not set. Using dummy data.");
        setTimeout(() => {
            processData(getDummyData());
            if (overlay) overlay.classList.add('hidden');
        }, 1000); // Fake delay
        return;
    }

    try {
        const response = await fetch(WEB_APP_URL);
        const result = await response.json();

        if (result.status === 'success') {
            processData({
                registrations: result.data,
                counts: result.counts
            });
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="loading error">Failed to load data. Please refresh using button.</td></tr>';
    } finally {
        if (overlay) overlay.classList.add('hidden');
        // Trigger Greeting
        if (window.showChatGreeting) window.showChatGreeting();
    }
}

function processData(data) {
    currentData = data;

    // Determine context dynamically
    const context = window.PAGE_CONTEXT || 'INDEX';

    if (context === 'INDEX') {
        renderDashboard(data);
    } else if (context === 'GROUP_A') {
        renderGroupPage('Group A');
    } else if (context === 'GROUP_B') {
        renderGroupPage('Group B');
    }
}

// ----------------------------------------------------
// DASHBOARD LOGIC (INDEX)
// ----------------------------------------------------
function renderDashboard(data) {
    updateGroupCard('A', data.counts["Group A"]);
    updateGroupCard('B', data.counts["Group B"]);

    // Recent 5
    const recent = [...data.registrations].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    renderTable(recent);
}

function updateGroupCard(groupSuffix, count) {
    const countEl = document.getElementById(`count-${groupSuffix.toLowerCase()}`);
    const badgeEl = document.getElementById(`badge-${groupSuffix.toLowerCase()}`);
    const progressEl = document.getElementById(`progress-${groupSuffix.toLowerCase()}`);
    const btnEl = document.getElementById(`btn-join-${groupSuffix.toLowerCase()}`);
    const warningEl = document.getElementById(`warning-${groupSuffix.toLowerCase()}`);

    if (!countEl) return;

    countEl.textContent = count;

    const percentage = Math.min((count / MAX_LIMIT) * 100, 100);
    progressEl.style.width = `${percentage}%`;

    // Limit Check
    if (count >= MAX_LIMIT) {
        // FULL STATE - RED
        badgeEl.textContent = "FULL";
        badgeEl.className = "badge full";
        badgeEl.style.backgroundColor = "#ff0000";

        progressEl.className = "progress-bar full";
        progressEl.style.backgroundColor = "#ff0000";

        btnEl.disabled = true;
        btnEl.textContent = "Group Full";
        btnEl.style.backgroundColor = "#ff0000";
        btnEl.style.color = "white";

        warningEl.textContent = "Registration Closed: Limit Reached";
        warningEl.style.color = "#ff0000";
    } else {
        // OPEN STATE
        badgeEl.textContent = "OPEN";
        badgeEl.className = "badge";
        badgeEl.style.backgroundColor = ""; // reset

        progressEl.className = "progress-bar";
        progressEl.style.backgroundColor = ""; // reset

        btnEl.disabled = false;
        btnEl.textContent = `Join Group ${groupSuffix}`;
        btnEl.style.backgroundColor = ""; // reset
        btnEl.style.color = "";

        if (count < MIN_LIMIT) {
            warningEl.textContent = `Need ${MIN_LIMIT - count} more.`;
            warningEl.style.color = "#ffa000";
        } else {
            warningEl.textContent = "";
        }
    }
}

// ----------------------------------------------------
// DETAIL PAGE LOGIC
// ----------------------------------------------------
function renderGroupPage(groupName) {
    // Filter (Safe & Case Insensitive)
    const groupData = currentData.registrations.filter(r =>
        String(r.group).trim().toLowerCase() === groupName.toLowerCase()
    );

    // Update Badge
    const countEl = document.getElementById('total-count');
    if (countEl) countEl.textContent = groupData.length;

    // Search Logic
    const searchInput = document.getElementById('searchInput');
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';

    filteredData = groupData.filter(item => {
        // Safe string conversion before checking match
        const n = item.name ? String(item.name).toLowerCase() : '';
        const r = item.rollNo ? String(item.rollNo) : '';
        return n.includes(searchVal) || r.includes(searchVal);
    });

    renderTable(filteredData, true);
}

function filterTable() {
    const context = window.PAGE_CONTEXT;
    if (context === 'GROUP_A') renderGroupPage('Group A');
    if (context === 'GROUP_B') renderGroupPage('Group B');
}

// ----------------------------------------------------
// TABLE RENDER
// ----------------------------------------------------
function renderTable(registrations, isDetailView = false) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (registrations.length === 0) {
        // More helpful empty state
        const colSpan = isDetailView ? 5 : 5;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; padding: 2rem;">
            No records found.
        </td></tr>`;
        return;
    }

    // Sort newest first
    registrations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    registrations.forEach(row => {
        const tr = document.createElement('tr');
        const time = new Date(row.timestamp).toLocaleTimeString();
        const date = row.date || '8/1/2026';

        if (isDetailView) {
            tr.innerHTML = `
                <td>${time}</td>
                <td><strong>${row.rollNo}</strong></td>
                <td>${row.name}</td>
                <td>${date}</td>
                <td><span class="badge" style="background:var(--success)">Confirmed</span></td>
            `;
        } else {
            tr.innerHTML = `
                <td>${time}</td>
                <td><span class="badge ${row.group === 'Group A' ? '' : 'full'}" style="background:${row.group === 'Group A' ? 'var(--primary)' : 'var(--primary-light)'}">${row.group}</span></td>
                <td>${row.rollNo}</td>
                <td>${row.name}</td>
                <td>${date}</td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// ----------------------------------------------------
// MODAL LOGIC
// ----------------------------------------------------
const modal = document.getElementById('modal');

function openModal(groupName) {
    if (currentData.counts[groupName] >= MAX_LIMIT) {
        alert("This group is already full!");
        return;
    }

    document.getElementById('modal-title').textContent = `Join ${groupName}`;
    document.getElementById('input-group').value = groupName;
    document.getElementById('form-message').textContent = '';

    const form = document.getElementById('regGroupForm');
    if (form) form.reset();

    if (modal) modal.style.display = "flex";
}

function closeModal() {
    if (modal) modal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target == modal) {
        closeModal();
    }
}

// Form Submit
const regForm = document.getElementById('regGroupForm');
if (regForm) {
    regForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (WEB_APP_URL.includes("REPLACE")) {
            alert("Backend URL not configured.");
            return;
        }

        const startBtn = document.getElementById('btn-submit');
        const msg = document.getElementById('form-message');

        startBtn.disabled = true;
        startBtn.textContent = "Processing...";

        const formData = {
            group: document.getElementById('input-group').value,
            rollNo: document.getElementById('input-roll').value,
            name: document.getElementById('input-name').value
        };

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                msg.className = "message success";
                msg.textContent = "Registration Successful!";
                msg.style.color = "var(--success)";

                setTimeout(() => {
                    fetchData();
                    closeModal();
                    startBtn.disabled = false;
                    startBtn.textContent = "Confirm Registration";
                }, 1500);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            msg.className = "message error";
            msg.textContent = error.message.replace("Registration Rejected:", "") || "Registration failed.";
            msg.style.color = "#ff0000"; // Red error

            startBtn.disabled = false;
            startBtn.textContent = "Confirm Registration";
        }
    });
}

function getDummyData() {
    return {
        counts: { "Group A": 8, "Group B": 15 },
        registrations: [
            { timestamp: new Date(), group: "Group A", rollNo: 101, name: "Student One", date: "8/1/2026" },
            { timestamp: "2026-01-03T10:00:00", group: "Group B", rollNo: 202, name: "Student Two", date: "8/1/2026" }
        ]
    };
}

// ==========================================
// CHATBOT LOGIC
// ==========================================
// Listener moved to top of file

function injectChatbot() {
    const chatHTML = `
        <div class="chatbot-tooltip" id="chatTooltip">
            Need any help? Just ask me! 👋
        </div>
        <button class="chatbot-toggle" onclick="toggleChat()">
            💬
        </button>
        <div class="chat-window" id="chatWindow">
            <div class="chat-header">
                <div class="bot-avatar">🤖</div>
                <h3>Seminar Guide</h3>
                <button class="chat-close" onclick="toggleChat()">×</button>
            </div>
            <div class="chat-body" id="chatBody">
                <div class="chat-msg bot">
                    Hello! I can help you with registration details. Ask me about seats or dates!
                </div>
            </div>
            <div class="chat-footer">
                <input type="text" id="chatInput" placeholder="Type a message..." onkeypress="handleEnter(event)">
                <button onclick="sendMessage()">➤</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);
}

let isChatOpen = false;
let hasGreeted = false;
let hasShownPopup = false;

function toggleChat() {
    const win = document.getElementById('chatWindow');
    const tooltip = document.getElementById('chatTooltip');

    // Hide tooltip when opened
    if (tooltip) tooltip.classList.remove('visible');

    isChatOpen = !isChatOpen;

    if (isChatOpen) {
        win.classList.add('active');
        if (!hasGreeted) {
            speak("Welcome to the Seminar Registration Portal developed by BCS Department at The New College Kolhapur under copy right by harshtech. How can I help you?");
            hasGreeted = true;
        }
    } else {
        win.classList.remove('active');
        window.speechSynthesis.cancel();
    }
}

// Expose function to show greeting
window.showChatGreeting = function () {
    // Only show once per page load
    if (hasShownPopup) return;

    setTimeout(() => {
        const tooltip = document.getElementById('chatTooltip');
        if (tooltip) {
            tooltip.classList.add('visible');

            // Auto-hide after 3 seconds
            setTimeout(() => {
                tooltip.classList.remove('visible');
            }, 3000);
        }
        hasShownPopup = true;
    }, 1000);
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    // Add User Message
    addMsg(msg, 'user');
    input.value = '';

    // Process Response
    setTimeout(() => {
        const response = processUserMsg(msg.toLowerCase());
        addMsg(response, 'bot');
        speak(response);
    }, 500);
}

function addMsg(text, sender) {
    const body = document.getElementById('chatBody');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function processUserMsg(text) {
    const data = currentData || { counts: { "Group A": 0, "Group B": 0 } };

    if (text.includes('hi') || text.includes('hello'))
        return "Hello there! How can I assist you today?";

    if (text.includes('date') || text.includes('when'))
        return "The seminar is scheduled for Thursday, January 8th, 2026.";

    if (text.includes('group a') && (text.includes('seat') || text.includes('count') || text.includes('left'))) {
        const count = data.counts["Group A"];
        const left = 15 - count;
        return `Group A has ${count} students registered. There are ${left} seats remaining.`;
    }

    if (text.includes('group b') && (text.includes('seat') || text.includes('count') || text.includes('left'))) {
        const count = data.counts["Group B"];
        const left = 15 - count;
        return `Group B has ${count} students registered. There are ${left} seats remaining.`;
    }

    if (text.includes('seat') || text.includes('count') || text.includes('left')) {
        const a = 15 - data.counts["Group A"];
        const b = 15 - data.counts["Group B"];
        return `There are ${a} seats left in Group A and ${b} seats left in Group B.`;
    }

    if (text.includes('full') || text.includes('limit'))
        return "The maximum limit is 15 students per group.";

    return "I'm not sure about that. Try asking about seats, dates, or specific groups.";
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }
}
