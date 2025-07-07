// Global state for tracking current item being edited
let currentEditingId = {
    phases: null,
    machines: null,
    departments: null,
    rawMaterials: null,
    articles: null,
    planning: null,
    users: null // New: for user management
};

// Global variable to store the current logged-in user
let currentUser = null; // Stores user object including roles

// Gestione dati dell'applicazione
let appData = {
    phases: [],
    machines: [],
    departments: [],
    rawMaterials: [],
    warehouseJournal: [],
    articles: [],
    productionPlan: [],
    notifications: [],
    users: [], // New: users data
    currentDeliveryWeekStartDate: null,
    currentWorkloadWeekStartDate: null
};

// Variabile globale per la pianificazione corrente calcolata ma non ancora salvata
let currentCalculatedPlanningDetails = null;

// Global variable to store the journal entry ID for the consumption modal
let currentModalJournalEntryId = null;

// Global variable to store the currently active notification filter ('unread' or 'all')
let currentNotificationFilter = 'unread';

// --- Funzioni di Utilità Generali ---

/**
 * Generates a unique ID for new items.
 * @returns {number} A unique timestamp-based ID.
 */
function generateId() {
    return Date.now();
}

/**
 * Normalizes a string for comparison (lowercase, trim).
 * @param {string} str The string to normalize.
 * @returns {string} The normalized string.
 */
function normalizeString(str) {
    return str.toLowerCase().trim();
}

/**
 * Displays a custom message box instead of alert/confirm.
 * @param {string} title The title of the message box.
 * @param {string} message The message to display.
 * @param {Array<Object>} buttons An array of button objects {text: string, className: string, onClick: function, isPrimary: boolean}.
 */
function showMessageBox(title, message, buttons) {
    const modal = document.getElementById('messageBoxModal');
    const modalTitle = document.getElementById('message-box-title');
    const modalText = document.getElementById('message-box-text');
    const modalButtons = document.getElementById('message-box-buttons');

    if (!modal || !modalTitle || !modalText || !modalButtons) {
        console.error('MessageBox elements not found.');
        // Fallback to native alert if elements are missing, though this should not happen.
        alert(`${title}\n\n${message}`);
        return;
    }

    modalTitle.textContent = title;
    modalText.textContent = message;
    modalButtons.innerHTML = ''; // Clear previous buttons

    buttons.forEach(btnConfig => {
        const button = document.createElement('button');
        button.textContent = btnConfig.text;
        button.className = `btn ${btnConfig.className || 'btn-secondary'}`;
        if (btnConfig.isPrimary) {
            button.classList.add('btn-primary');
        }
        button.onclick = () => {
            closeMessageBox();
            if (btnConfig.onClick) {
                btnConfig.onClick();
            }
        };
        modalButtons.appendChild(button);
    });

    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

/**
 * Closes the custom message box.
 */
function closeMessageBox() {
    const modal = document.getElementById('messageBoxModal');
    if (modal) {
        modal.classList.remove('show');
    }
    document.body.classList.remove('modal-open');
}

/**
 * Shows a toast notification.
 * @param {string} message The message to display.
 * @param {string} type The type of notification (success, error, info, warning).
 * @param {number} duration The duration in milliseconds before the toast disappears.
 */
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.error('Notification container not found.');
        return;
    }
    const notification = document.createElement('div');
    notification.className = `notification-message ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Force reflow to enable transition
    notification.offsetWidth;

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, duration);
}

/**
 * Toggles the theme between light and dark.
 */
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    // Save theme preference to localStorage
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
    updateThemeIcon();
}

/**
 * Updates the theme toggle icon based on the current theme.
 */
function updateThemeIcon() {
    const themeToggleButtons = document.querySelectorAll('.theme-toggle-btn');
    themeToggleButtons.forEach(button => {
        const icon = button.querySelector('i');
        if (icon) { // Defensive check
            if (document.body.classList.contains('dark-theme')) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            } else {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    });
}

/**
 * Exports app data to a JSON file.
 */
function exportDataAsJson() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magliflex_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Dati esportati con successo!', 'success');
}

/**
 * Imports app data from a JSON file.
 */
document.getElementById('importDataFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                // Basic validation for imported data structure
                if (importedData.phases && importedData.machines && importedData.articles) {
                    // Merge or replace data based on preference. For simplicity, we'll replace.
                    appData = { ...appData, ...importedData };
                    saveData(); // Save imported data to localStorage
                    loadAndInitializeAppData(); // Re-initialize appData from localStorage (now containing imported data)
                    updateAllUI(); // Refresh UI with new data
                    showNotification('Dati importati con successo!', 'success');
                } else {
                    showNotification('File JSON non valido o struttura dati errata.', 'error');
                }
            } catch (error) {
                console.error('Errore durante l\'importazione del file JSON:', error);
                showNotification('Errore durante l\'importazione dei dati. Assicurati che sia un file JSON valido.', 'error');
            }
        };
        reader.readAsText(file);
    }
});


// --- Gestione Login e Utenti ---

/**
 * Handles login attempt.
 */
function loginUser() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginOverlay = document.getElementById('loginOverlay');
    const appContent = document.getElementById('appContent');

    const username = usernameInput ? usernameInput.value : '';
    const password = passwordInput ? passwordInput.value : '';

    const user = appData.users.find(u =>
        normalizeString(u.username) === normalizeString(username) && u.password === password
    );

    if (user) {
        currentUser = user;
        showNotification(`Benvenuto, ${currentUser.username}!`, 'success');
        if (loginOverlay) loginOverlay.classList.remove('show');
        document.body.classList.remove('modal-open');
        if (appContent) appContent.style.display = 'flex'; // Use flex for the main container

        // IMPORTANT: Call updateAllUI *after* appContent is visible
        updateAllUI(); // Populate all tables and selects with data

        showPage('dashboard'); // Show dashboard after successful login (this will also reset its form if any)

        // Check for forced password change
        if (currentUser.forcePasswordChange) {
            openChangePasswordModal();
        }

    } else {
        showNotification('Nome utente o password errati.', 'error');
    }
}

/**
 * Handles the Enter key press on the password input for login.
 * @param {KeyboardEvent} event The keyboard event.
 */
function handleLoginEnter(event) {
    if (event.key === 'Enter') {
        loginUser();
    }
}

/**
 * Logs out the current user.
 */
function logoutUser() {
    showMessageBox(
        'Conferma Logout',
        'Sei sicuro di voler effettuare il logout?',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Logout',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    currentUser = null;
                    const appContent = document.getElementById('appContent');
                    if (appContent) {
                        appContent.style.display = 'none';
                    }
                    const loginOverlay = document.getElementById('loginOverlay');
                    if (loginOverlay) {
                        loginOverlay.classList.add('show');
                    }
                    document.body.classList.add('modal-open');
                    showNotification('Logout effettuato con successo.', 'info');
                    // Clear form fields
                    const usernameInput = document.getElementById('usernameInput');
                    const passwordInput = document.getElementById('passwordInput');
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                }
            }
        ]
    );
}

/**
 * Opens the change password modal.
 */
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const oldPwdInput = document.getElementById('oldPasswordChange');
    const newPwdInput = document.getElementById('newPasswordChange');
    const confirmNewPwdInput = document.getElementById('confirmNewPasswordChange');

    if (modal) modal.classList.add('show');
    document.body.classList.add('modal-open');
    if (oldPwdInput) oldPwdInput.value = '';
    if (newPwdInput) newPwdInput.value = '';
    if (confirmNewPwdInput) confirmNewPwdInput.value = '';
}

/**
 * Handles password change from the modal.
 */
function handleChangePassword() {
    const oldPassword = document.getElementById('oldPasswordChange')?.value;
    const newPassword = document.getElementById('newPasswordChange')?.value;
    const confirmNewPassword = document.getElementById('confirmNewPasswordChange')?.value;

    if (!currentUser) {
        showNotification('Nessun utente loggato.', 'error');
        return;
    }

    if (oldPassword !== currentUser.password) {
        showNotification('La vecchia password non è corretta.', 'error');
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        showNotification('La nuova password deve essere lunga almeno 6 caratteri.', 'error');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showNotification('La nuova password e la conferma non corrispondono.', 'error');
        return;
    }

    currentUser.password = newPassword;
    currentUser.forcePasswordChange = false; // Reset flag after successful change
    saveData();
    closeChangePasswordModal();
    showNotification('Password cambiata con successo!', 'success');
}

/**
 * Closes the change password modal.
 */
function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.remove('show');
    document.body.classList.remove('modal-open');
}

/**
 * Checks if the current user has the required role(s).
 * @param {string|Array<string>} requiredRoles The role(s) to check against.
 * @returns {boolean} True if the user has at least one of the required roles, false otherwise.
 */
function hasRole(requiredRoles) {
    if (!currentUser) return false;
    if (typeof requiredRoles === 'string') {
        requiredRoles = [requiredRoles];
    }
    return requiredRoles.some(role => currentUser.roles.includes(role));
}

// --- Gestione Dati e Local Storage ---

/**
 * Loads data from local storage or initializes with sample data.
 */
function loadAndInitializeAppData() {
    const storedData = localStorage.getItem('magliflexAppData');
    if (storedData) {
        appData = JSON.parse(storedData);
        // Ensure all top-level arrays exist even if empty in stored data
        appData.phases = appData.phases || [];
        appData.machines = appData.machines || [];
        appData.departments = appData.departments || [];
        appData.rawMaterials = appData.rawMaterials || [];
        appData.warehouseJournal = appData.warehouseJournal || [];
        appData.articles = appData.articles || [];
        appData.productionPlan = appData.productionPlan || [];
        appData.notifications = appData.notifications || [];
        appData.users = appData.users || [];
        
        // Ensure nested arrays within departments are also initialized
        appData.departments.forEach(dept => {
            dept.machineTypes = dept.machineTypes || [];
            dept.finenesses = dept.finenesses || [];
            dept.phaseIds = dept.phaseIds || [];
        });

        // Ensure default dates are set if not present
        appData.currentDeliveryWeekStartDate = appData.currentDeliveryWeekStartDate ? new Date(appData.currentDeliveryWeekStartDate) : startOfWeek(new Date());
        appData.currentWorkloadWeekStartDate = appData.currentWorkloadWeekStartDate ? new Date(appData.currentWorkloadWeekStartDate) : startOfWeek(new Date());

        // Ensure notifications have a 'read' status if missing from old data
        appData.notifications.forEach(n => {
            if (typeof n.read === 'undefined') {
                n.read = false;
            }
        });

    } else {
        // Initialize with sample data if no data is found
        initializeSampleData();
    }
}

/**
 * Saves current app data to local storage.
 */
function saveData() {
    localStorage.setItem('magliflexAppData', JSON.stringify(appData));
    console.log("Dati salvati.");
}

/**
 * Initializes appData with sample data.
 */
function initializeSampleData() {
    console.log("Inizializzazione dati di esempio.");
    // Helper to calculate pieces per hour from pieces per day (assuming 8-hour workday)
    const dailyToHourlyCapacity = (piecesPerDay) => piecesPerDay / 8;
    const today = new Date(); // Get today's date for dynamic sample data

    appData = {
        phases: [
            { id: 1, name: "Preparazione Filati", time: 5, dailyCapacity: 1000 }, // Added dailyCapacity for manual/generic phases
            { id: 2, name: "Tessitura", time: 60 }, // Machine-specific, capacity derived from machines
            { id: 3, name: "Rammaglio", time: 45, dailyCapacity: 800 },
            { id: 4, name: "Cucitura", time: 20, dailyCapacity: 1200 },
            { id: 5, name: "Controllo Qualità", time: 10, dailyCapacity: 1500 },
            { id: 6, name: "Rifinitura e Stiro", time: 15, dailyCapacity: 1000 },
            { id: 7, name: "Etichettatura e Confezionamento", time: 5, dailyCapacity: 2000 }
        ],
        machines: [
            // Rettilinee
            { id: 101, name: "Rettilinea Finezza 3 A", capacity: dailyToHourlyCapacity(8), currentUsage: 0, fineness: 3 },
            { id: 102, name: "Rettilinea Finezza 3 B", capacity: dailyToHourlyCapacity(8), currentUsage: 0, fineness: 3 },
            { id: 103, name: "Rettilinea Finezza 5 A", capacity: dailyToHourlyCapacity(15), currentUsage: 0, fineness: 5 },
            { id: 104, name: "Rettilinea Finezza 5 B", capacity: dailyToHourlyCapacity(15), currentUsage: 0, fineness: 5 },
            { id: 105, name: "Rettilinea Finezza 7 A", capacity: dailyToHourlyCapacity(25), currentUsage: 0, fineness: 7 },
            { id: 106, name: "Rettilinea Finezza 7 B", capacity: dailyToHourlyCapacity(25), currentUsage: 0, fineness: 7 },
            { id: 107, name: "Rettilinea Finezza 7 C", capacity: dailyToHourlyCapacity(25), currentUsage: 0, fineness: 7 },
            { id: 108, name: "Rettilinea Finezza 12 A", capacity: dailyToHourlyCapacity(35), currentUsage: 0, fineness: 12 },
            { id: 109, name: "Rettilinea Finezza 12 B", capacity: dailyToHourlyCapacity(35), currentUsage: 0, fineness: 12 },
            { id: 110, name: "Rettilinea Finezza 12 C", capacity: dailyToHourlyCapacity(35), currentUsage: 0, fineness: 12 },
            { id: 111, name: "Rettilinea Finezza 12 D", capacity: dailyToHourlyCapacity(35), currentUsage: 0, fineness: 12 },
            { id: 112, name: "Rettilinea Finezza 12 E", capacity: dailyToHourlyCapacity(35), currentUsage: 0, fineness: 12 },
            { id: 113, name: "Rettilinea Finezza 12 F", capacity: dailyToHourlyCapacity(35), currentUsage: 0, fineness: 12 },
            { id: 114, name: "Rettilinea Finezza 12 G", capacity: dailyToHourlyCapacity(35), currentUsage: 0, fineness: 12 },
            { id: 115, name: "Rettilinea Finezza 14 A", capacity: dailyToHourlyCapacity(40), currentUsage: 0, fineness: 14 },
            { id: 116, name: "Rettilinea Finezza 14 B", capacity: dailyToHourlyCapacity(40), currentUsage: 0, fineness: 14 },
            { id: 117, name: "Rettilinea Finezza 14 C", capacity: dailyToHourlyCapacity(40), currentUsage: 0, fineness: 14 },
            // Integrale
            { id: 118, name: "Integrale Finezza 7 A", capacity: dailyToHourlyCapacity(12), currentUsage: 0, fineness: 7 }
        ],
        departments: [
            { id: 1001, name: "Reparto Preparazione Filati", machineTypes: [], finenesses: [], phaseIds: [1] },
            { id: 1002, name: "Reparto Tessitura Rettilinea", machineTypes: ["Rettilinea"], finenesses: ["3", "5", "7", "12", "14"], phaseIds: [2] },
            { id: 1003, name: "Reparto Tessitura Integrale", machineTypes: ["Integrale"], finenesses: ["7"], phaseIds: [2] },
            { id: 1004, name: "Reparto Rammaglio", machineTypes: [], finenesses: [], phaseIds: [3] },
            { id: 1005, name: "Reparto Cucitura", machineTypes: [], finenesses: [], phaseIds: [4] },
            { id: 1006, name: "Reparto Controllo Qualità", machineTypes: [], finenesses: [], phaseIds: [5] },
            { id: 1007, name: "Reparto Rifinitura e Stiro", machineTypes: [], finenesses: [], phaseIds: [6] },
            { id: 1008, name: "Reparto Etichettatura e Confezionamento", machineTypes: [], finenesses: [7] }
        ],
        rawMaterials: [
            { id: 201, name: "Filato di Cotone", unit: "kg", currentStock: 500 },
            { id: 202, name: "Bottoni", unit: "pz", currentStock: 1000 },
            { id: 203, name: "Etichette", unit: "pz", currentStock: 2000 },
            { id: 204, name: "Filato di Lana Merino", unit: "kg", currentStock: 300 },
            { id: 205, name: "Cerniere", unit: "pz", currentStock: 500 }
        ],
        warehouseJournal: [
            { id: generateId(), date: today.toISOString().slice(0, 10), materialId: 201, type: "load", quantity: 500, reference: "Fornitore X" },
            { id: generateId(), date: today.toISOString().slice(0, 10), materialId: 202, type: "load", quantity: 1000, reference: "Fornitore Y" },
            { id: generateId(), date: today.toISOString().slice(0, 10), materialId: 204, type: "load", quantity: 300, reference: "Fornitore Z" }
        ],
        articles: [
            {
                id: 301,
                code: "ART-001",
                description: "Maglietta Basic Cotone",
                color: "Bianco",
                client: "Client A",
                cycle: [
                    { phaseId: 1, time: 5 }, // Preparazione Filati
                    { phaseId: 2, time: 60, machineType: "Rettilinea", fineness: 7 }, // Tessitura - Specificato macchina e finezza
                    { phaseId: 4, time: 20 }, // Cucitura
                    { phaseId: 5, time: 10 }, // Controllo Qualità
                    { phaseId: 6, time: 15 }, // Rifinitura e Stiro
                    { phaseId: 7, time: 5 }  // Etichettatura e Confezionamento
                ],
                bom: [{ materialId: 201, quantity: 0.2, unit: "kg" }]
            },
            {
                id: 302,
                code: "ART-002",
                description: "Felpa con Cappuccio Lana",
                color: "Grigio",
                client: "Client B",
                cycle: [
                    { phaseId: 1, time: 7 }, // Preparazione Filati
                    { phaseId: 2, time: 70, machineType: "Rettilinea", fineness: 12 }, // Tessitura - Specificato macchina e finezza
                    { phaseId: 3, time: 45 }, // Rammaglio
                    { phaseId: 4, time: 25 }, // Cucitura
                    { phaseId: 5, time: 12 }, // Controllo Qualità
                    { phaseId: 6, time: 20 }, // Rifinitura e Stiro
                    { phaseId: 7, time: 8 }  // Etichettatura e Confezionamento
                ],
                bom: [{ materialId: 204, quantity: 0.5, unit: "kg" }, { materialId: 205, quantity: 1, unit: "pz" }]
            },
            {
                id: 303,
                code: "ART-003",
                description: "Maglione Integrale",
                color: "Nero",
                client: "Client C",
                cycle: [
                    { phaseId: 1, time: 8 }, // Preparazione Filati
                    { phaseId: 2, time: 90, machineType: "Integrale", fineness: 7 }, // Tessitura (Integrale) - Specificato macchina e finezza
                    { phaseId: 5, time: 15 }, // Controllo Qualità
                    { phaseId: 6, time: 20 }, // Rifinitura e Stiro
                    { phaseId: 7, time: 10 }  // Etichettatura e Confezionamento
                ],
                bom: [{ materialId: 204, quantity: 0.7, unit: "kg" }]
            }
        ],
        productionPlan: [
            {
                id: generateId(),
                articleId: 301,
                quantity: 100,
                type: "production",
                priority: "high",
                startDate: today.toISOString().slice(0, 10),
                estimatedDeliveryDate: null, // Will be calculated
                status: "pending",
                notes: "Urgent order",
                dailyWorkload: {} // Will be calculated
            },
            {
                id: generateId(),
                articleId: 302,
                quantity: 50,
                type: "sample",
                priority: "medium",
                startDate: addDays(today, 7).toISOString().slice(0, 10),
                estimatedDeliveryDate: null, // Will be calculated
                status: "pending",
                notes: "New sample for client C",
                dailyWorkload: {} // Will be calculated
            },
            {
                id: generateId(),
                articleId: 303,
                quantity: 20,
                type: "production",
                priority: "low",
                startDate: addDays(today, 14).toISOString().slice(0, 10),
                estimatedDeliveryDate: null, // Will be calculated
                status: "pending",
                notes: "First batch of integral sweaters",
                dailyWorkload: {} // Will be calculated
            }
        ],
        notifications: [
            { id: generateId(), message: "Benvenuto in MagliFlex! Esplora le funzionalità.", date: today.toISOString(), type: "info", read: false },
            { id: generateId(), message: "Scorta minima per Filato di Cotone raggiunta. Ordina subito!", date: today.toISOString(), type: "warning", read: false }
        ],
        users: [
            { id: 1, username: "admin", password: "admin", roles: ["admin", "planning", "warehouse"], forcePasswordChange: false },
            { id: 2, username: "planner", password: "planner", roles: ["planning"], forcePasswordChange: false },
            { id: 3, username: "warehouse", password: "warehouse", roles: ["warehouse"], forcePasswordChange: false }
        ],
        currentDeliveryWeekStartDate: startOfWeek(today),
        currentWorkloadWeekStartDate: startOfWeek(today)
    };
    saveData();
    console.log("Dati di esempio caricati e salvati.");
}

/**
 * Calculates the daily workload and estimated delivery date for a given article and quantity.
 * @param {Object} article The article object.
 * @param {number} quantity The quantity to produce.
 * @param {Date} startDate The desired start date (Date object).
 * @returns {{dailyWorkload: Object, estimatedDeliveryDate: Date}} The calculated workload and delivery date.
 */
function calculateLotWorkload(article, quantity, startDate) {
    let remainingQuantityToProduce = quantity;
    let currentDate = new Date(startDate);
    let dailyWorkload = {};
    let estimatedDeliveryDate = null;
    const workingHoursPerDay = 8; // Assuming 8 working hours per day

    const MAX_PLANNING_DAYS = 365 * 2; // Max 2 years for planning calculation to prevent infinite loops
    let iterationCount = 0;

    // Loop day by day until all quantity is produced
    while (remainingQuantityToProduce > 0 && iterationCount < MAX_PLANNING_DAYS) {
        const dateKey = currentDate.toISOString().slice(0, 10);
        dailyWorkload[dateKey] = dailyWorkload[dateKey] || {};

        let minDailyPiecesAcrossPhases = Infinity; // This will be the bottleneck for the article's production today

        // Calculate daily capacity for each phase of the article
        article.cycle.forEach(cycleStep => {
            const phase = appData.phases.find(p => p.id === cycleStep.phaseId);
            if (!phase) return; // Skip if phase not found

            let totalPhaseDailyCapacityPieces = 0;

            // If the cycle step specifies a machine type and fineness, use machine capacity
            if (cycleStep.machineType && cycleStep.fineness) {
                const requiredMachineType = cycleStep.machineType;
                const requiredFineness = cycleStep.fineness;

                const suitableMachines = appData.machines.filter(m => {
                    // Check if machine type matches required type
                    const machineTypeMatches = m.name.split(' ')[0] === requiredMachineType;
                    // Check if fineness matches required fineness
                    const finenessMatches = m.fineness === requiredFineness;
                    return machineTypeMatches && finenessMatches;
                });

                suitableMachines.forEach(machine => {
                    const effectiveHourlyCapacityForThisArticlePhase = Math.min(machine.capacity, (cycleStep.time > 0 ? (60 / cycleStep.time) : Infinity));
                    totalPhaseDailyCapacityPieces += effectiveHourlyCapacityForThisArticlePhase * workingHoursPerDay;
                });
            } else if (phase.dailyCapacity !== undefined) {
                // If phase has a defined dailyCapacity (for manual/generic phases)
                totalPhaseDailyCapacityPieces = phase.dailyCapacity;
            } else {
                // Fallback: if no machine specified and no dailyCapacity, assume zero capacity
                console.warn(`Fase "${phase.name}" (ID: ${phase.id}) nel ciclo dell'articolo non ha capacità definita (né macchina specifica né dailyCapacity). Considerata capacità zero.`);
                totalPhaseDailyCapacityPieces = 0;
            }

            // Update the bottleneck for the article's production today
            if (totalPhaseDailyCapacityPieces < minDailyPiecesAcrossPhases) {
                minDailyPiecesAcrossPhases = totalPhaseDailyCapacityPieces;
            }
        });

        // If no capacity found for any phase, or capacity is zero, break to avoid infinite loop
        if (minDailyPiecesAcrossPhases === Infinity || minDailyPiecesAcrossPhases <= 0) {
            // This case should ideally be caught before calling this function or handled with a warning
            // For now, it will set estimatedDeliveryDate to current date and break.
            estimatedDeliveryDate = currentDate;
            break;
        }

        const piecesToProduceToday = Math.floor(Math.min(remainingQuantityToProduce, minDailyPiecesAcrossPhases)); // Round down to integer

        if (piecesToProduceToday > 0) {
            // Distribute these pieces across phases for the daily workload record
            article.cycle.forEach(cycleStep => {
                const phase = appData.phases.find(p => p.id === cycleStep.phaseId);
                if (!phase) return;

                let assignedMachineId = null;
                if (cycleStep.machineType && cycleStep.fineness) {
                    // Try to assign to a suitable machine if specified
                    const suitableMachines = appData.machines.filter(m =>
                        m.name.split(' ')[0] === cycleStep.machineType && m.fineness === cycleStep.fineness
                    );
                    if (suitableMachines.length > 0) {
                        assignedMachineId = suitableMachines[0].id; // Assign to the first suitable machine
                    }
                } else {
                    // For non-machine specific phases, assign to a dummy ID or a generic machine if available
                    if (appData.machines.length > 0) {
                         assignedMachineId = appData.machines[0].id; // Arbitrary assignment for display
                    } else {
                         assignedMachineId = 0; // Placeholder for "no machine"
                    }
                }

                dailyWorkload[dateKey][phase.id] = {
                    quantity: piecesToProduceToday,
                    machine: assignedMachineId // Store the assigned machine ID or placeholder
                };
            });
            remainingQuantityToProduce -= piecesToProduceToday;
        }

        if (remainingQuantityToProduce <= 0) {
            estimatedDeliveryDate = currentDate;
            break;
        }

        // Advance to the next working day
        do {
            currentDate = addDays(currentDate, 1);
        } while (currentDate.getDay() === 0 || currentDate.getDay() === 6); // Skip Sundays (0) and Saturdays (6)

        iterationCount++;
    }

    if (iterationCount >= MAX_PLANNING_DAYS && remainingQuantityToProduce > 0) {
        // If max iterations reached, it means planning is too long or impossible
        estimatedDeliveryDate = currentDate; // Fallback to current date
    } else if (!estimatedDeliveryDate) {
        estimatedDeliveryDate = currentDate; // Fallback if loop finishes without exact match (shouldn't happen with remainingQuantityToProduce check)
    }

    return { dailyWorkload, estimatedDeliveryDate };
}

/**
 * Recalculates the workload for all planning lots.
 * This is useful on app load to ensure all existing data has calculated workloads.
 */
function recalculateAllPlanningWorkloads() {
    let needsSave = false;
    appData.productionPlan.forEach(lot => {
        // Only recalculate if dailyWorkload is empty or if article/quantity/startDate might have changed
        // For simplicity, we'll recalculate if dailyWorkload is empty or if estimatedDeliveryDate is null.
        if (!lot.dailyWorkload || Object.keys(lot.dailyWorkload).length === 0 || !lot.estimatedDeliveryDate) {
            const article = appData.articles.find(a => a.id === lot.articleId);
            if (article) {
                const { dailyWorkload, estimatedDeliveryDate } = calculateLotWorkload(
                    article,
                    lot.quantity,
                    new Date(lot.startDate)
                );
                lot.dailyWorkload = dailyWorkload;
                lot.estimatedDeliveryDate = estimatedDeliveryDate.toISOString().slice(0, 10);
                needsSave = true;
            }
        }
    });
    if (needsSave) {
        saveData();
    }
}


/**
 * Updates all UI elements that depend on appData.
 * This function should be called after any data modification or on app load.
 */
function updateAllUI() {
    // Update tables and selects
    updatePhasesTable();
    updateMachinesTable();
    updateDepartmentsTable();
    updateRawMaterialsStockTable();
    updateWarehouseJournalTable();
    updateArticlesTable();
    populateArticleSelects();
    populateRawMaterialSelect();
    populateDepartmentPhaseSelect();
    updateUsersTable(); // New: Update users table
    updateDeliverySchedule(); // Update calendar for deliveries
    updateDailyWorkloadCalendar(); // Update calendar for workload
    updatePlanningList(); // Update detailed planning list
    updateDashboardStats(); // Update dashboard statistics
    updateNotificationBadge(); // Update notification badge
    updateThemeIcon(); // Ensure theme icon is correct

    // Set initial date for raw material load form (it's a single input, not a form reset)
    const rawMaterialLoadDateInput = document.getElementById('rawMaterialLoadDate');
    if (rawMaterialLoadDateInput) {
        rawMaterialLoadDateInput.value = new Date().toISOString().slice(0, 10);
    }

    // Add initial empty cycle step and BOM item for the Articles form
    // These are called here because they add elements to the DOM, not just reset values.
    // They are also called in resetArticleForm, but this ensures they exist on initial load.
    const cycleStepsContainer = document.getElementById('cycleSteps');
    const bomItemsContainer = document.getElementById('bomItems');
    if (cycleStepsContainer && cycleStepsContainer.children.length === 0) {
        addCycleStep();
    }
    if (bomItemsContainer && bomItemsContainer.children.length === 0) {
        addBomItem();
    }
}

// Attach event listeners for navigation buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const pageId = event.currentTarget.dataset.pageId;
            showPage(pageId);
        });
    });
    // Add event listener for the login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) loginButton.addEventListener('click', loginUser);

    // Attach handleLoginEnter to username and password inputs
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');

    if (usernameInput) {
        usernameInput.addEventListener('keydown', handleLoginEnter);
    }
    if (passwordInput) {
        passwordInput.addEventListener('keydown', handleLoginEnter);
    }

    // Add event listener for the confirm change password button
    const confirmChangePasswordBtn = document.getElementById('confirmChangePasswordBtn');
    if (confirmChangePasswordBtn) confirmChangePasswordBtn.addEventListener('click', handleChangePassword);
});


/**
 * Toggles the navigation menu visibility for mobile.
 */
function toggleNavMenu() {
    const navMenu = document.getElementById('mainNavMenu');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const body = document.body;

    if (navMenu) navMenu.classList.toggle('open');
    if (hamburgerBtn) hamburgerBtn.classList.toggle('open');
    body.classList.toggle('nav-open'); // Add/remove class to body to prevent scrolling
}

/**
 * Shows a specific page and updates active navigation button.
 * @param {string} pageId The ID of the page section to show.
 */
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show the requested page
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
    }

    // Update active navigation button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.nav-btn[data-page-id="${pageId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Close nav menu on mobile after selection
    if (window.innerWidth <= 768) {
        toggleNavMenu();
    }

    // Call specific update functions for the shown page to ensure data is fresh
    // And defer form resets to ensure elements are fully rendered.
    switch (pageId) {
        case 'dashboard':
            updateDashboardStats();
            break;
        case 'schedule':
            updateDeliverySchedule();
            updateDailyWorkloadCalendar();
            updatePlanningList();
            break;
        case 'planning':
            populateArticleSelects();
            setTimeout(() => resetPlanningForm(), 0); // Defer reset
            break;
        case 'articles':
            updateArticlesTable();
            populateArticleSelects(); // For the select dropdown in the form
            setTimeout(() => resetArticleForm(), 0); // Defer reset
            break;
        case 'rawMaterials':
            updateRawMaterialsStockTable();
            updateWarehouseJournalTable();
            populateRawMaterialSelect();
            setTimeout(() => resetRawMaterialForm(), 0); // Defer reset
            break;
        case 'phases':
            updatePhasesTable();
            setTimeout(() => resetPhaseForm(), 0); // Defer reset
            break;
        case 'machines':
            updateMachinesTable();
            setTimeout(() => resetMachineForm(), 0); // Defer reset
            break;
        case 'departments':
            updateDepartmentsTable();
            populateDepartmentPhaseSelect();
            setTimeout(() => resetDepartmentForm(), 0); // Defer reset
            break;
        case 'users':
            updateUsersTable();
            setTimeout(() => resetUserForm(), 0); // Defer reset
            break;
    }
}


// --- Funzioni per la Gestione delle Fasi (Phases) ---

/**
 * Adds a new phase or updates an existing one.
 */
function addPhase() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per aggiungere/modificare fasi.', 'error');
        return;
    }

    const phaseNameInput = document.getElementById('phaseName');
    const phaseTimeInput = document.getElementById('phaseTime');

    const name = phaseNameInput ? phaseNameInput.value.trim() : '';
    const time = phaseTimeInput ? parseFloat(phaseTimeInput.value) : 0;

    if (!name || isNaN(time) || time <= 0) {
        showNotification('Per favore, inserisci un nome valido e un tempo di lavorazione positivo per la fase.', 'error');
        return;
    }

    if (currentEditingId.phases) {
        // Update existing phase
        const phaseIndex = appData.phases.findIndex(p => p.id === currentEditingId.phases);
        if (phaseIndex > -1) {
            appData.phases[phaseIndex].name = name;
            appData.phases[phaseIndex].time = time;
            showNotification('Fase aggiornata con successo!', 'success');
        }
    } else {
        // Add new phase
        if (appData.phases.some(p => normalizeString(p.name) === normalizeString(name))) {
            showNotification('Esiste già una fase con questo nome.', 'error');
            return;
        }
        const newPhase = {
            id: generateId(),
            name: name,
            time: time
        };
        appData.phases.push(newPhase);
        showNotification('Fase aggiunta con successo!', 'success');
    }

    saveData();
    updatePhasesTable();
    populateDepartmentPhaseSelect(); // Update department phase select options
    resetPhaseForm();
}

/**
 * Populates the phases table.
 */
function updatePhasesTable() {
    const tableBody = document.getElementById('phasesTable');
    if (!tableBody) return; // Defensive check
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.phases.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nessuna fase registrata.</td></tr>';
        return;
    }

    appData.phases.forEach(phase => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = phase.name;
        row.insertCell().textContent = phase.time;
        const actionsCell = row.insertCell();

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Modifica Fase';
        editBtn.onclick = () => editPhase(phase.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Elimina Fase';
        deleteBtn.onclick = () => deletePhase(phase.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Loads a phase into the form for editing.
 * @param {number} phaseId The ID of the phase to edit.
 */
function editPhase(phaseId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per modificare fasi.', 'error');
        return;
    }

    const phase = appData.phases.find(p => p.id === phaseId);
    if (phase) {
        const phaseNameInput = document.getElementById('phaseName');
        const phaseTimeInput = document.getElementById('phaseTime');
        const saveBtn = document.getElementById('savePhaseBtn');
        const cancelBtn = document.getElementById('cancelPhaseBtn');

        if (phaseNameInput) phaseNameInput.value = phase.name;
        if (phaseTimeInput) phaseTimeInput.value = phase.time;
        if (saveBtn) {
            saveBtn.textContent = 'Salva Modifiche';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Modifiche';
        }
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        currentEditingId.phases = phaseId;
    } else {
        showNotification('Fase non trovata.', 'error');
    }
}

/**
 * Resets the phase form to its initial state.
 */
function resetPhaseForm() {
    const phaseNameInput = document.getElementById('phaseName');
    const phaseTimeInput = document.getElementById('phaseTime');
    const saveBtn = document.getElementById('savePhaseBtn');
    const cancelBtn = document.getElementById('cancelPhaseBtn');

    if (phaseNameInput) phaseNameInput.value = '';
    if (phaseTimeInput) phaseTimeInput.value = '';
    if (saveBtn) {
        saveBtn.textContent = 'Aggiungi Fase';
        saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Aggiungi Fase';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    currentEditingId.phases = null;
}

/**
 * Deletes a phase.
 * @param {number} phaseId The ID of the phase to delete.
 */
function deletePhase(phaseId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare fasi.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questa fase? Questa azione è irreversibile e potrebbe influenzare articoli e pianificazioni esistenti.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.phases = appData.phases.filter(p => p.id !== phaseId);
                    saveData();
                    updatePhasesTable();
                    populateDepartmentPhaseSelect(); // Update department phase select options
                    showNotification('Fase eliminata con successo!', 'success');
                }
            }
        ]
    );
}

// --- Funzioni per la Gestione dei Macchinari (Machines) ---

/**
 * Adds a new machine or updates an existing one.
 */
function addMachine() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per aggiungere/modificare macchinari.', 'error');
        return;
    }

    const machineNameInput = document.getElementById('machineName');
    const machineCapacityInput = document.getElementById('machineCapacity');

    const name = machineNameInput ? machineNameInput.value.trim() : '';
    const capacity = machineCapacityInput ? parseInt(machineCapacityInput.value) : 0;

    if (!name || isNaN(capacity) || capacity <= 0) {
        showNotification('Per favor, inserisci un nome valido e una capacità positiva per il macchinario.', 'error');
        return;
    }

    if (currentEditingId.machines) {
        // Update existing machine
        const machineIndex = appData.machines.findIndex(m => m.id === currentEditingId.machines);
        if (machineIndex > -1) {
            appData.machines[machineIndex].name = name;
            appData.machines[machineIndex].capacity = capacity;
            showNotification('Macchinario aggiornato con successo!', 'success');
        }
    } else {
        // Add new machine
        if (appData.machines.some(m => normalizeString(m.name) === normalizeString(name))) {
            showNotification('Esiste già un macchinario con questo nome.', 'error');
            return;
        }
        const newMachine = {
            id: generateId(),
            name: name,
            capacity: capacity,
            currentUsage: 0 // Initialize usage to 0
        };
        appData.machines.push(newMachine);
        showNotification('Macchinario aggiunto con successo!', 'success');
    }

    saveData();
    updateMachinesTable();
    resetMachineForm();
}

/**
 * Populates the machines table.
 */
function updateMachinesTable() {
    const tableBody = document.getElementById('machinesTable');
    if (!tableBody) return; // Defensive check
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.machines.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nessun macchinario registrato.</td></tr>';
        return;
    }

    appData.machines.forEach(machine => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = machine.name;
        row.insertCell().textContent = machine.capacity;
        // Simplified usage display for now
        row.insertCell().textContent = `${machine.currentUsage || 0} pz`; // Placeholder for actual usage
        const actionsCell = row.insertCell();

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Modifica Macchinario';
        editBtn.onclick = () => editMachine(machine.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Elimina Macchinario';
        deleteBtn.onclick = () => deleteMachine(machine.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Loads a machine into the form for editing.
 * @param {number} machineId The ID of the machine to edit.
 */
function editMachine(machineId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per modificare macchinari.', 'error');
        return;
    }

    const machine = appData.machines.find(m => m.id === machineId);
    if (machine) {
        const machineNameInput = document.getElementById('machineName');
        const machineCapacityInput = document.getElementById('machineCapacity');
        const saveBtn = document.getElementById('saveMachineBtn');
        const cancelBtn = document.getElementById('cancelMachineBtn');

        if (machineNameInput) machineNameInput.value = machine.name;
        if (machineCapacityInput) machineCapacityInput.value = machine.capacity;
        if (saveBtn) {
            saveBtn.textContent = 'Salva Modifiche';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Modifiche';
        }
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        currentEditingId.machines = machineId;
    } else {
        showNotification('Macchinario non trovato.', 'error');
    }
}

/**
 * Resets the machine form.
 */
function resetMachineForm() {
    const machineNameInput = document.getElementById('machineName');
    const machineCapacityInput = document.getElementById('machineCapacity');
    const saveBtn = document.getElementById('saveMachineBtn');
    const cancelBtn = document.getElementById('cancelMachineBtn');

    if (machineNameInput) machineNameInput.value = '';
    if (machineCapacityInput) machineCapacityInput.value = '';
    if (saveBtn) {
        saveBtn.textContent = 'Aggiungi Macchinario';
        saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Aggiungi Macchinario';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    currentEditingId.machines = null;
}

/**
 * Deletes a machine.
 * @param {number} machineId The ID of the machine to delete.
 */
function deleteMachine(machineId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare macchinari.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questo macchinario? Questa azione è irreversibile.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.machines = appData.machines.filter(m => m.id !== machineId);
                    saveData();
                    updateMachinesTable();
                    showNotification('Macchinario eliminato con successo!', 'success');
                }
            }
        ]
    );
}

// --- Funzioni per la Gestione dei Reparti (Departments) ---

/**
 * Populates the department select dropdown.
 */
function populateDepartmentSelect() {
    const select = document.getElementById('departmentId');
    if (!select) return; // Defensive check
    select.innerHTML = '<option value="new">-- Nuovo Reparto --</option>'; // Clear and add new option

    appData.departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        select.appendChild(option);
    });
}

/**
 * Populates the phases select dropdown within the department form.
 */
function populateDepartmentPhaseSelect() {
    const select = document.getElementById('departmentPhaseIds');
    if (!select) return; // Defensive check
    select.innerHTML = ''; // Clear existing options

    appData.phases.forEach(phase => {
        const option = document.createElement('option');
        option.value = phase.id;
        option.textContent = phase.name;
        select.appendChild(option);
    });
}

/**
 * Saves a new department or updates an existing one.
 */
function saveDepartment() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per aggiungere/modificare reparti.', 'error');
        return;
    }

    const departmentIdInput = document.getElementById('departmentId');
    const nameInput = document.getElementById('departmentName');
    const machineTypesInput = document.getElementById('departmentMachineTypes');
    const finenessesInput = document.getElementById('departmentFinenesses');
    const phaseSelect = document.getElementById('departmentPhaseIds');

    const departmentId = departmentIdInput ? departmentIdInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const machineTypes = machineTypesInput ? machineTypesInput.value.split(',').map(s => s.trim()).filter(s => s) : [];
    const finenesses = finenessesInput ? finenessesInput.value.split(',').map(s => s.trim()).filter(s => s) : [];
    const selectedPhaseOptions = phaseSelect ? Array.from(phaseSelect.selectedOptions) : [];
    const phaseIds = selectedPhaseOptions.map(option => parseInt(option.value));

    if (!name) {
        showNotification('Il nome del reparto non può essere vuoto.', 'error');
        return;
    }

    if (departmentId === 'new') {
        // Add new department
        if (appData.departments.some(d => normalizeString(d.name) === normalizeString(name))) {
            showNotification('Esiste già un reparto con questo nome.', 'error');
            return;
        }
        const newDepartment = {
            id: generateId(),
            name: name,
            machineTypes: machineTypes,
            finenesses: finenesses,
            phaseIds: phaseIds
        };
        appData.departments.push(newDepartment);
        showNotification('Reparto aggiunto con successo!', 'success');
    } else {
        // Update existing department
        const deptIndex = appData.departments.findIndex(d => d.id === parseInt(departmentId));
        if (deptIndex > -1) {
            appData.departments[deptIndex].name = name;
            appData.departments[deptIndex].machineTypes = machineTypes;
            appData.departments[deptIndex].finenesses = finenesses;
            appData.departments[deptIndex].phaseIds = phaseIds;
            showNotification('Reparto aggiornato con successo!', 'success');
        } else {
            showNotification('Reparto non trovato per l\'aggiornamento.', 'error');
            return;
        }
    }
    saveData();
    updateDepartmentsTable();
    populateDepartmentSelect(); // Refresh the select dropdown
    resetDepartmentForm();
}

/**
 * Loads a department into the form for editing.
 */
function loadDepartmentForEdit() {
    const departmentIdInput = document.getElementById('departmentId');
    if (!departmentIdInput) return; // Defensive check
    const departmentId = departmentIdInput.value;

    if (departmentId === 'new') {
        resetDepartmentForm();
        return;
    }

    const department = appData.departments.find(d => d.id === parseInt(departmentId));
    if (department) {
        const nameInput = document.getElementById('departmentName');
        const machineTypesInput = document.getElementById('departmentMachineTypes');
        const finenessesInput = document.getElementById('departmentFinenesses');
        const phaseSelect = document.getElementById('departmentPhaseIds');
        const saveBtn = document.getElementById('saveDepartmentBtn');
        const cancelBtn = document.getElementById('cancelDepartmentBtn');

        if (nameInput) nameInput.value = department.name;
        if (machineTypesInput) machineTypesInput.value = department.machineTypes.join(', ');
        if (finenessesInput) finenessesInput.value = department.finenesses.join(', ');

        // Select phases
        if (phaseSelect) {
            Array.from(phaseSelect.options).forEach(option => {
                option.selected = department.phaseIds.includes(parseInt(option.value));
            });
        }

        if (saveBtn) {
            saveBtn.textContent = 'Salva Modifiche';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Modifiche';
        }
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        currentEditingId.departments = parseInt(departmentId);
    } else {
        showNotification('Reparto non trovato.', 'error');
        resetDepartmentForm();
    }
}

/**
 * Populates the departments table.
 */
function updateDepartmentsTable() {
    const tableBody = document.getElementById('departmentsTable');
    if (!tableBody) return; // Defensive check
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.departments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nessun reparto registrato.</td></tr>';
        return;
    }

    appData.departments.forEach(dept => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = dept.name;
        row.insertCell().textContent = (dept.machineTypes || []).join(', '); // Ensure it's an array
        row.insertCell().textContent = (dept.finenesses || []).join(', '); // Ensure it's an array
        // Display phase names
        const phaseNames = (dept.phaseIds || []).map(id => { // Ensure it's an array
            const phase = appData.phases.find(p => p.id === id);
            return phase ? phase.name : `ID:${id}`;
        }).join('; ');
        row.insertCell().textContent = phaseNames;

        const actionsCell = row.insertCell();

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Modifica Reparto';
        editBtn.onclick = () => {
            const departmentIdInput = document.getElementById('departmentId');
            if (departmentIdInput) departmentIdInput.value = dept.id; // Set the select to the current department
            loadDepartmentForEdit(); // Load data into form
        };
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Elimina Reparto';
        deleteBtn.onclick = () => deleteDepartment(dept.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Resets the department form.
 */
function resetDepartmentForm() {
    const departmentIdInput = document.getElementById('departmentId');
    const nameInput = document.getElementById('departmentName');
    const machineTypesInput = document.getElementById('departmentMachineTypes');
    const finenessesInput = document.getElementById('departmentFinenesses');
    const phaseSelect = document.getElementById('departmentPhaseIds');
    const saveBtn = document.getElementById('saveDepartmentBtn');
    const cancelBtn = document.getElementById('cancelDepartmentBtn');

    if (departmentIdInput) departmentIdInput.value = 'new';
    if (nameInput) nameInput.value = '';
    if (machineTypesInput) machineTypesInput.value = '';
    if (finenessesInput) finenessesInput.value = '';
    if (phaseSelect) {
        Array.from(phaseSelect.options).forEach(option => {
            option.selected = false;
        });
    }
    if (saveBtn) {
        saveBtn.textContent = 'Aggiungi Reparto';
        saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Aggiungi Reparto';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    currentEditingId.departments = null;
}

/**
 * Deletes a department.
 * @param {number} departmentId The ID of the department to delete.
 */
function deleteDepartment(departmentId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare reparti.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questo reparto? Questa azione è irreversibile.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.departments = appData.departments.filter(d => d.id !== departmentId);
                    saveData();
                    updateDepartmentsTable();
                    populateDepartmentSelect();
                    showNotification('Reparto eliminato con successo!', 'success');
                }
            }
        ]
    );
}

// --- Funzioni per la Gestione delle Materie Prime (Raw Materials) ---

/**
 * Populates the raw material select dropdown.
 */
function populateRawMaterialSelect() {
    const select = document.getElementById('rawMaterialSelect');
    if (!select) return; // Defensive check
    select.innerHTML = '<option value="new">-- Aggiungi Nuova Materia Prima --</option>'; // Clear and add new option

    appData.rawMaterials.forEach(rm => {
        const option = document.createElement('option');
        option.value = rm.id;
        option.textContent = rm.name;
        select.appendChild(option);
    });
}

/**
 * Toggles visibility of new raw material name input based on select choice.
 */
function toggleNewRawMaterialInput() {
    const select = document.getElementById('rawMaterialSelect');
    const newRawMaterialNameGroup = document.getElementById('newRawMaterialNameGroup');
    const rawMaterialUnitInput = document.getElementById('rawMaterialUnit');
    const newRawMaterialNameInput = document.getElementById('newRawMaterialName');

    if (!select || !newRawMaterialNameGroup || !rawMaterialUnitInput || !newRawMaterialNameInput) {
        console.warn('One or more raw material form elements not found for toggleNewRawMaterialInput.');
        return;
    }

    if (select.value === 'new') {
        newRawMaterialNameGroup.style.display = 'block';
        rawMaterialUnitInput.value = ''; // Clear unit for new RM
        newRawMaterialNameInput.setAttribute('required', 'required');
        rawMaterialUnitInput.setAttribute('required', 'required');
        rawMaterialUnitInput.removeAttribute('readonly'); // Ensure it's editable for new RM
    } else {
        newRawMaterialNameGroup.style.display = 'none';
        newRawMaterialNameInput.removeAttribute('required');
        const selectedRm = appData.rawMaterials.find(rm => rm.id === parseInt(select.value));
        if (selectedRm) {
            rawMaterialUnitInput.value = selectedRm.unit; // Set unit for existing RM
            rawMaterialUnitInput.setAttribute('readonly', 'readonly'); // Make unit read-only for existing RM
        } else {
            rawMaterialUnitInput.value = '';
            rawMaterialUnitInput.removeAttribute('readonly');
        }
    }
}

/**
 * Adds a new raw material or adds stock to an existing one.
 */
function addRawMaterialOrStock() {
    if (!hasRole('warehouse')) {
        showNotification('Non hai i permessi per gestire le materie prime.', 'error');
        return;
    }

    const rawMaterialSelect = document.getElementById('rawMaterialSelect');
    const newRawMaterialNameInput = document.getElementById('newRawMaterialName');
    const rawMaterialUnitInput = document.getElementById('rawMaterialUnit');
    const rawMaterialQuantityInput = document.getElementById('rawMaterialQuantity');
    const rawMaterialLoadDateInput = document.getElementById('rawMaterialLoadDate');
    const rawMaterialBarcodeInput = document.getElementById('rawMaterialBarcode');

    if (!rawMaterialSelect || !newRawMaterialNameInput || !rawMaterialUnitInput || !rawMaterialQuantityInput || !rawMaterialLoadDateInput || !rawMaterialBarcodeInput) {
        showNotification('Errore: Impossibile trovare tutti i campi del modulo Materie Prime.', 'error');
        return;
    }

    const selectedId = rawMaterialSelect.value;
    let name = newRawMaterialNameInput.value.trim();
    const unit = rawMaterialUnitInput ? rawMaterialUnitInput.value.trim() : '';
    const quantity = parseFloat(rawMaterialQuantityInput.value);
    const loadDate = rawMaterialLoadDateInput.value;
    const barcode = rawMaterialBarcodeInput.value.trim();

    if (isNaN(quantity) || quantity <= 0) {
        showNotification('La quantità deve essere un numero positivo.', 'error');
        return;
    }
    if (!loadDate) {
        showNotification('Seleziona una data di carico.', 'error');
        return;
    }

    let materialId;
    let journalType;

    if (selectedId === 'new') {
        if (!name || !unit) {
            showNotification('Per una nuova materia prima, nome e unità di misura sono obbligatori.', 'error');
            return;
        }
        if (appData.rawMaterials.some(rm => normalizeString(rm.name) === normalizeString(name))) {
            showNotification('Esiste già una materia prima con questo nome. Selezionala dall\'elenco.', 'error');
            return;
        }
        materialId = generateId();
        const newRawMaterial = {
            id: materialId,
            name: name,
            unit: unit,
            currentStock: quantity
        };
        appData.rawMaterials.push(newRawMaterial);
        journalType = "load";
        showNotification('Nuova materia prima aggiunta e scorta caricata!', 'success');
    } else {
        materialId = parseInt(selectedId);
        const rm = appData.rawMaterials.find(r => r.id === materialId);
        if (rm) {
            rm.currentStock += quantity;
            name = rm.name; // Use existing name for journal entry
            journalType = "load";
            showNotification(`Scorta di ${rm.name} aggiornata!`, 'success');
        } else {
            showNotification('Materia prima selezionata non trovata.', 'error');
            return;
        }
    }

    // Add entry to warehouse journal
    const journalEntry = {
        id: generateId(),
        date: loadDate,
        materialId: materialId,
        type: journalType,
        quantity: quantity,
        reference: barcode || 'Carico Manuale'
    };
    appData.warehouseJournal.push(journalEntry);

    saveData();
    updateRawMaterialsStockTable();
    updateWarehouseJournalTable();
    populateRawMaterialSelect(); // Refresh select to include new RM if added
    resetRawMaterialForm();
}

/**
 * Handles barcode input for raw materials.
 * For simulation, it just shows a notification. In a real app, this would fetch RM data.
 * @param {Event} event The input event.
 */
function handleBarcodeInput(event) {
    const barcode = event.target.value.trim();
    if (barcode) {
        // In a real application, you would query your database for the raw material
        // associated with this barcode and pre-fill the form.
        // For this simulation, we'll just show a message.
        showNotification(`Barcode scansionato: ${barcode}. Funzionalità di ricerca non implementata.`, 'info', 2000);
    }
}

/**
 * Registers consumption of a raw material.
 * @param {number} journalEntryId The ID of the journal entry (load) to consume from.
 */
function registerConsumption(journalEntryId) {
    if (!hasRole('warehouse')) {
        showNotification('Non hai i permessi per registrare consumi.', 'error');
        return;
    }

    const entry = appData.warehouseJournal.find(e => e.id === journalEntryId);
    if (!entry || entry.type === 'consumption') {
        showNotification('Voce di magazzino non valida per la registrazione del consumo.', 'error');
        return;
    }

    const rawMaterial = appData.rawMaterials.find(rm => rm.id === entry.materialId);
    if (!rawMaterial) {
        showNotification('Materia prima associata non trovata.', 'error');
        return;
    }

    currentModalJournalEntryId = journalEntryId; // Store for modal confirmation

    const modalRmInfo = document.getElementById('modalRmInfo');
    const actualConsumedQuantityInput = document.getElementById('actualConsumedQuantity');
    const actualConsumptionModal = document.getElementById('actualConsumptionModal');

    if (modalRmInfo) modalRmInfo.textContent = `Materia Prima: ${rawMaterial.name} (${rawMaterial.currentStock} ${rawMaterial.unit} disponibili). Quantità caricata: ${entry.quantity} ${rawMaterial.unit}.`;
    if (actualConsumedQuantityInput) actualConsumedQuantityInput.value = entry.quantity; // Pre-fill with loaded quantity
    if (actualConsumptionModal) actualConsumptionModal.classList.add('show');
    document.body.classList.add('modal-open');
}

/**
 * Confirms the actual consumption from the modal.
 */
function confirmActualConsumption() {
    const actualConsumedQuantityInput = document.getElementById('actualConsumedQuantity');
    if (!actualConsumedQuantityInput) {
        showNotification('Errore: Campo quantità consumata non trovato.', 'error');
        return;
    }
    const actualConsumedQuantity = parseFloat(actualConsumedQuantityInput.value);

    if (isNaN(actualConsumedQuantity) || actualConsumedQuantity <= 0) {
        showNotification('La quantità consumata deve essere un numero positivo.', 'error');
        return;
    }

    const entry = appData.warehouseJournal.find(e => e.id === currentModalJournalEntryId);
    if (!entry) {
        showNotification('Errore: Voce di magazzino non trovata.', 'error');
        return;
    }

    const rawMaterial = appData.rawMaterials.find(rm => rm.id === entry.materialId);
    if (!rawMaterial) {
        showNotification('Errore: Materia prima non trovata.', 'error');
        return;
    }

    if (actualConsumedQuantity > rawMaterial.currentStock) {
        showNotification(`Errore: La quantità consumata (${actualConsumedQuantity} ${rawMaterial.unit}) supera la scorta disponibile (${rawMaterial.currentStock} ${rawMaterial.unit}).`, 'error');
        return;
    }

    // Update raw material stock
    rawMaterial.currentStock -= actualConsumedQuantity;

    // Mark the original load entry as 'consumed' or 'partially consumed'
    // For simplicity, we'll add a new 'consumption' entry and update the original load's status.
    // In a more complex system, you might track remaining quantity on the load entry.
    entry.status = 'consumed'; // Mark original load as consumed (or partially)

    // Add a new consumption entry
    const consumptionEntry = {
        id: generateId(),
        date: new Date().toISOString().slice(0, 10),
        materialId: rawMaterial.id,
        type: "consumption",
        quantity: actualConsumedQuantity,
        reference: `Consumo da Carico ID: ${entry.id}`
    };
    appData.warehouseJournal.push(consumptionEntry);

    saveData();
    updateRawMaterialsStockTable();
    updateWarehouseJournalTable();
    closeActualConsumptionModal();
    showNotification(`Consumo di ${actualConsumedQuantity} ${rawMaterial.unit} di ${rawMaterial.name} registrato con successo!`, 'success');
}

/**
 * Closes the actual consumption modal.
 */
function closeActualConsumptionModal() {
    const modal = document.getElementById('actualConsumptionModal');
    if (modal) modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    currentModalJournalEntryId = null;
}

/**
 * Populates the raw materials stock table.
 */
function updateRawMaterialsStockTable() {
    const tableBody = document.getElementById('rawMaterialsStockTable');
    if (!tableBody) return; // Defensive check
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.rawMaterials.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nessuna materia prima registrata.</td></tr>';
        return;
    }

    appData.rawMaterials.forEach(rm => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = rm.name;
        row.insertCell().textContent = rm.currentStock.toFixed(2); // Display with 2 decimal places
        row.insertCell().textContent = rm.unit;
        const actionsCell = row.insertCell();

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Modifica Materia Prima';
        editBtn.onclick = () => editRawMaterial(rm.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Elimina Materia Prima';
        deleteBtn.onclick = () => deleteRawMaterial(rm.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Loads a raw material into the form for editing.
 * @param {number} rmId The ID of the raw material to edit.
 */
function editRawMaterial(rmId) {
    if (!hasRole('warehouse')) {
        showNotification('Non hai i permessi per modificare materie prime.', 'error');
        return;
    }

    const rm = appData.rawMaterials.find(r => r.id === rmId);
    if (rm) {
        const rawMaterialSelect = document.getElementById('rawMaterialSelect');
        const newRawMaterialNameInput = document.getElementById('newRawMaterialName');
        const rawMaterialUnitInput = document.getElementById('rawMaterialUnit');
        const rawMaterialQuantityInput = document.getElementById('rawMaterialQuantity');
        const rawMaterialLoadDateInput = document.getElementById('rawMaterialLoadDate');
        const rawMaterialBarcodeInput = document.getElementById('rawMaterialBarcode');
        const saveBtn = document.getElementById('saveRawMaterialBtn');
        const cancelBtn = document.getElementById('cancelRawMaterialBtn');

        if (rawMaterialSelect) rawMaterialSelect.value = rm.id;
        toggleNewRawMaterialInput(); // Adjust form based on selection
        if (newRawMaterialNameInput) newRawMaterialNameInput.value = rm.name; // Still show name even if read-only
        if (rawMaterialUnitInput) rawMaterialUnitInput.value = rm.unit;
        if (rawMaterialQuantityInput) rawMaterialQuantityInput.value = rm.currentStock; // Show current stock as default quantity to add
        if (rawMaterialLoadDateInput) rawMaterialLoadDateInput.value = new Date().toISOString().slice(0, 10); // Default to today
        if (rawMaterialBarcodeInput) rawMaterialBarcodeInput.value = ''; // Clear barcode for new action

        // Change button text to indicate update action
        if (saveBtn) {
            saveBtn.textContent = 'Aggiorna Scorta';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Aggiorna Scorta';
        }
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        currentEditingId.rawMaterials = rmId; // Set current editing ID
    } else {
        showNotification('Materia prima non trovata.', 'error');
    }
}

/**
 * Resets the raw material form.
 */
function resetRawMaterialForm() {
    const saveBtn = document.getElementById('saveRawMaterialBtn');
    const cancelBtn = document.getElementById('cancelRawMaterialBtn');
    const rawMaterialSelect = document.getElementById('rawMaterialSelect');
    const newRawMaterialName = document.getElementById('newRawMaterialName');
    const rawMaterialUnit = document.getElementById('rawMaterialUnit');
    const rawMaterialQuantity = document.getElementById('rawMaterialQuantity');
    const rawMaterialLoadDate = document.getElementById('rawMaterialLoadDate');
    const rawMaterialBarcode = document.getElementById('rawMaterialBarcode');
    const newRawMaterialNameGroup = document.getElementById('newRawMaterialNameGroup');


    if (rawMaterialSelect) rawMaterialSelect.value = 'new';
    if (newRawMaterialName) newRawMaterialName.value = '';
    if (rawMaterialUnit) rawMaterialUnit.value = '';
    if (rawMaterialQuantity) rawMaterialQuantity.value = '0';
    if (rawMaterialLoadDate) rawMaterialLoadDate.value = new Date().toISOString().slice(0, 10); // Set to today's date
    if (rawMaterialBarcode) rawMaterialBarcode.value = '';

    // Call toggleNewRawMaterialInput only if rawMaterialSelect exists
    if (rawMaterialSelect) {
        toggleNewRawMaterialInput(); // Reset visibility of new RM input
    } else {
        // Fallback for newRawMaterialNameGroup if select is not found
        if (newRawMaterialNameGroup) newRawMaterialNameGroup.style.display = 'block';
        if (newRawMaterialName) newRawMaterialName.removeAttribute('required');
        if (rawMaterialUnit) rawMaterialUnit.removeAttribute('readonly');
    }

    if (saveBtn) {
        saveBtn.textContent = 'Aggiungi/Carica Scorta';
        saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Aggiungi/Carica Scorta';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';

    currentEditingId.rawMaterials = null;
}

/**
 * Deletes a raw material.
 * @param {number} rmId The ID of the raw material to delete.
 */
function deleteRawMaterial(rmId) {
    if (!hasRole('admin')) { // Only admin can fully delete RM
        showNotification('Non hai i permessi per eliminare materie prime.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questa materia prima? Questa azione è irreversibile e rimuoverà anche tutte le voci del giornale ad essa collegate.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.rawMaterials = appData.rawMaterials.filter(rm => rm.id !== rmId);
                    appData.warehouseJournal = appData.warehouseJournal.filter(entry => entry.materialId !== rmId);
                    // Also remove from articles' BOMs if necessary (more complex, might need a warning)
                    appData.articles.forEach(article => {
                        article.bom = article.bom.filter(bomItem => bomItem.materialId !== rmId);
                    });
                    saveData();
                    updateRawMaterialsStockTable();
                    updateWarehouseJournalTable();
                    populateRawMaterialSelect();
                    showNotification('Materia prima e relative voci di magazzino eliminate con successo!', 'success');
                }
            }
        ]
    );
}

/**
 * Populates the warehouse journal table.
 */
function updateWarehouseJournalTable() {
    const tableBody = document.getElementById('warehouseJournalTable');
    if (!tableBody) return; // Defensive check
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.warehouseJournal.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nessuna voce nel giornale di magazzino.</td></tr>';
        return;
    }

    // Sort journal by date, newest first
    const sortedJournal = [...appData.warehouseJournal].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedJournal.forEach(entry => {
        const row = tableBody.insertRow();
        const material = appData.rawMaterials.find(rm => rm.id === entry.materialId);
        const materialName = material ? material.name : 'Sconosciuto';
        const materialUnit = material ? material.unit : '';

        row.insertCell().textContent = entry.date;
        row.insertCell().textContent = materialName;
        row.insertCell().textContent = entry.type === 'load' ? 'Carico' : 'Consumo';
        row.insertCell().textContent = `${entry.quantity.toFixed(2)} ${materialUnit}`;
        row.insertCell().textContent = entry.status || '-'; // Display status if available
        row.insertCell().textContent = entry.reference;

        const actionsCell = row.insertCell();
        if (entry.type === 'load' && entry.status !== 'consumed' && hasRole('warehouse')) {
            const consumeBtn = document.createElement('button');
            consumeBtn.className = 'btn btn-sm btn-warning';
            consumeBtn.innerHTML = '<i class="fas fa-minus-circle"></i> Consuma';
            consumeBtn.title = 'Registra Consumo';
            consumeBtn.onclick = () => registerConsumption(entry.id);
            actionsCell.appendChild(consumeBtn);
        }
        // Add delete for journal entries (admin/warehouse role)
        if (hasRole('admin') || hasRole('warehouse')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Elimina Voce';
            deleteBtn.onclick = () => deleteJournalEntry(entry.id);
            actionsCell.appendChild(deleteBtn);
        }
    });
}

/**
 * Deletes a warehouse journal entry.
 * @param {number} entryId The ID of the journal entry to delete.
 */
function deleteJournalEntry(entryId) {
    if (!hasRole('admin') && !hasRole('warehouse')) {
        showNotification('Non hai i permessi per eliminare voci di magazzino.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questa voce dal giornale di magazzino? Questa azione è irreversibile.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    const entryIndex = appData.warehouseJournal.findIndex(e => e.id === entryId);
                    if (entryIndex > -1) {
                        const entry = appData.warehouseJournal[entryIndex];
                        // If it was a 'load' entry, revert stock if not consumed
                        if (entry.type === 'load' && entry.status !== 'consumed') {
                            const material = appData.rawMaterials.find(rm => rm.id === entry.materialId);
                            if (material) {
                                material.currentStock -= entry.quantity;
                            }
                        } else if (entry.type === 'consumption') {
                             // If it was a 'consumption' entry, add stock back (careful with this in real app)
                            const material = appData.rawMaterials.find(rm => rm.id === entry.materialId);
                            if (material) {
                                material.currentStock += entry.quantity;
                            }
                        }
                        appData.warehouseJournal.splice(entryIndex, 1);
                        saveData();
                        updateRawMaterialsStockTable();
                        updateWarehouseJournalTable();
                        showNotification('Voce di magazzino eliminata con successo!', 'success');
                    } else {
                        showNotification('Voce di magazzino non trovata.', 'error');
                    }
                }
            }
        ]
    );
}

// --- Funzioni per la Gestione degli Articoli (Articles) ---

/**
 * Populates the article select dropdowns.
 */
function populateArticleSelects() {
    const articleSelect = document.getElementById('articleId');
    const planningArticleSelect = document.getElementById('planningArticle');
    const editPlanningArticleSelect = document.getElementById('editPlanningArticle');

    if (!articleSelect || !planningArticleSelect || !editPlanningArticleSelect) {
        console.warn('One or more article select elements not found.');
        return;
    }

    // Clear existing options, but keep the "new" option for articleId
    articleSelect.innerHTML = '<option value="new">-- Nuovo Articolo --</option>';
    planningArticleSelect.innerHTML = '<option value="">Seleziona un articolo...</option>';
    editPlanningArticleSelect.innerHTML = ''; // This one will be populated when modal opens

    appData.articles.forEach(article => {
        const option1 = document.createElement('option');
        option1.value = article.id;
        option1.textContent = `${article.code} - ${article.description}`;
        articleSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = article.id;
        option2.textContent = `${article.code} - ${article.description}`;
        planningArticleSelect.appendChild(option2);

        const option3 = document.createElement('option');
        option3.value = article.id;
        option3.textContent = `${article.code} - ${article.description}`;
        editPlanningArticleSelect.appendChild(option3);
    });
}

/**
 * Adds a new cycle step input group to the article form.
 */
function addCycleStep(phaseId = '', time = '') {
    const cycleStepsContainer = document.getElementById('cycleSteps');
    if (!cycleStepsContainer) return; // Defensive check

    const newStepDiv = document.createElement('div');
    newStepDiv.className = 'cycle-step';
    newStepDiv.innerHTML = `
        <div class="form-group-inline">
            <label>Fase:</label>
            <select class="cycle-phase-select" aria-label="Fase">
                <option value="">Seleziona Fase</option>
                ${appData.phases.map(p => `<option value="${p.id}" ${p.id === phaseId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group-inline">
            <label>Tempo (min/pz):</label>
            <input type="number" class="cycle-time-input" min="0.1" step="0.1" value="${time}" placeholder="Tempo">
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeCycleStep(this)" aria-label="Rimuovi fase">
            <i class="fas fa-times"></i>
        </button>
    `;
    cycleStepsContainer.appendChild(newStepDiv);
}

/**
 * Removes a cycle step input group.
 * @param {HTMLElement} button The remove button element.
 */
function removeCycleStep(button) {
    const parent = button.closest('.cycle-step');
    if (parent) parent.remove();
}

/**
 * Adds a new BOM item input group to the article form.
 */
function addBomItem(materialId = '', quantity = '', unit = '') {
    const bomItemsContainer = document.getElementById('bomItems');
    if (!bomItemsContainer) return; // Defensive check

    const newBomDiv = document.createElement('div');
    newBomDiv.className = 'bom-item';
    newBomDiv.innerHTML = `
        <div class="form-group-inline">
            <label>Materia Prima:</label>
            <select class="bom-material-select" onchange="updateBomUnit(this)" aria-label="Materia Prima">
                <option value="">Seleziona MP</option>
                ${appData.rawMaterials.map(rm => `<option value="${rm.id}" ${rm.id === materialId ? 'selected' : ''}>${rm.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group-inline">
            <label>Quantità:</label>
            <input type="number" class="bom-quantity-input" min="0.01" step="0.01" value="${quantity}" placeholder="Quantità">
        </div>
        <div class="form-group-inline">
            <label>Unità:</label>
            <input type="text" class="bom-unit-input" value="${unit}" readonly aria-label="Unità di Misura">
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeBomItem(this)" aria-label="Rimuovi materia prima">
            <i class="fas fa-times"></i>
        </button>
    `;
    bomItemsContainer.appendChild(newBomDiv);

    // Manually trigger unit update for newly added item if materialId is present
    if (materialId) {
        const select = newBomDiv.querySelector('.bom-material-select');
        if (select) updateBomUnit(select);
    }
}

/**
 * Updates the unit input for a BOM item based on selected raw material.
 * @param {HTMLSelectElement} selectElement The select element that triggered the change.
 */
function updateBomUnit(selectElement) {
    const selectedRmId = parseInt(selectElement.value);
    const unitInput = selectElement.closest('.bom-item')?.querySelector('.bom-unit-input');
    if (!unitInput) return; // Defensive check
    const selectedRm = appData.rawMaterials.find(rm => rm.id === selectedRmId);
    unitInput.value = selectedRm ? selectedRm.unit : '';
}

/**
 * Removes a BOM item input group.
 * @param {HTMLElement} button The remove button element.
 */
function removeBomItem(button) {
    const parent = button.closest('.bom-item');
    if (parent) parent.remove();
}

/**
 * Saves a new article or updates an existing one.
 */
function saveArticle() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per aggiungere/modificare articoli.', 'error');
        return;
    }

    const articleIdInput = document.getElementById('articleId');
    const codeInput = document.getElementById('articleCode');
    const descriptionInput = document.getElementById('articleDescription');
    const colorInput = document.getElementById('articleColor');
    const clientInput = document.getElementById('articleClient');

    const articleId = articleIdInput ? articleIdInput.value : '';
    const code = codeInput ? codeInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const color = colorInput ? colorInput.value.trim() : '';
    const client = clientInput ? clientInput.value.trim() : '';

    if (!code || !description) {
        showNotification('Codice e descrizione dell\'articolo sono obbligatori.', 'error');
        return;
    }

    // Gather cycle steps
    const cycleSteps = [];
    document.querySelectorAll('#cycleSteps .cycle-step').forEach(stepDiv => {
        const phaseSelect = stepDiv.querySelector('.cycle-phase-select');
        const timeInput = stepDiv.querySelector('.cycle-time-input');
        const phaseId = phaseSelect ? parseInt(phaseSelect.value) : null;
        const time = timeInput ? parseFloat(timeInput.value) : 0;
        
        // For now, machineType and fineness are hardcoded in sample data.
        // In a real UI, these would be inputs in the cycle step form.
        // We'll retrieve them from the original phase definition if they exist,
        // or from the article's cycle if editing an existing article.
        let machineType, fineness;
        if (currentEditingId.articles) {
            const existingArticle = appData.articles.find(a => a.id === currentEditingId.articles);
            const existingStep = existingArticle?.cycle.find(s => s.phaseId === phaseId);
            machineType = existingStep?.machineType;
            fineness = existingStep?.fineness;
        } else {
            // For new articles, these would typically be selected in the UI.
            // For simplicity, we'll assume they are not set via UI when creating new,
            // and rely on sample data for now.
            // If the phase itself has these properties (e.g., if a phase is tied to a machine type),
            // we could retrieve them here. For now, they are on the article's cycle step.
        }

        if (phaseId && !isNaN(time) && time > 0) {
            const step = { phaseId: phaseId, time: time };
            if (machineType) step.machineType = machineType;
            if (fineness) step.fineness = fineness;
            cycleSteps.push(step);
        }
    });

    // Gather BOM items
    const bomItems = [];
    document.querySelectorAll('#bomItems .bom-item').forEach(itemDiv => {
        const materialSelect = itemDiv.querySelector('.bom-material-select');
        const quantityInput = itemDiv.querySelector('.bom-quantity-input');
        const unitInput = itemDiv.querySelector('.bom-unit-input');
        const materialId = materialSelect ? parseInt(materialSelect.value) : null;
        const quantity = quantityInput ? parseFloat(quantityInput.value) : 0;
        const unit = unitInput ? unitInput.value.trim() : '';
        if (materialId && !isNaN(quantity) && quantity > 0) {
            bomItems.push({ materialId: materialId, quantity: quantity, unit: unit });
        }
    });

    if (cycleSteps.length === 0) {
        showNotification('L\'articolo deve avere almeno una fase di lavorazione.', 'error');
        return;
    }

    if (articleId === 'new') {
        // Add new article
        if (appData.articles.some(a => normalizeString(a.code) === normalizeString(code))) {
            showNotification('Esiste già un articolo con questo codice.', 'error');
            return;
        }
        const newArticle = {
            id: generateId(),
            code: code,
            description: description,
            color: color,
            client: client,
            cycle: cycleSteps,
            bom: bomItems
        };
        appData.articles.push(newArticle);
        showNotification('Articolo aggiunto con successo!', 'success');
    } else {
        // Update existing article
        const articleIndex = appData.articles.findIndex(a => a.id === parseInt(articleId));
        if (articleIndex > -1) {
            // Check for code uniqueness if code changed
            if (normalizeString(appData.articles[articleIndex].code) !== normalizeString(code) &&
                appData.articles.some(a => normalizeString(a.code) === normalizeString(code) && a.id !== parseInt(articleId))) {
                showNotification('Esiste già un altro articolo con questo codice.', 'error');
                return;
            }
            appData.articles[articleIndex].code = code;
            appData.articles[articleIndex].description = description;
            appData.articles[articleIndex].color = color;
            appData.articles[articleIndex].client = client;
            appData.articles[articleIndex].cycle = cycleSteps;
            appData.articles[articleIndex].bom = bomItems;
            showNotification('Articolo aggiornato con successo!', 'success');
        } else {
            showNotification('Articolo non trovato per l\'aggiornamento.', 'error');
            return;
        }
    }
    saveData();
    updateArticlesTable();
    populateArticleSelects(); // Refresh select dropdowns
    resetArticleForm();
}

/**
 * Loads an article into the form for editing.
 */
function loadArticleForEdit() {
    const articleIdInput = document.getElementById('articleId');
    if (!articleIdInput) return; // Defensive check
    const articleId = articleIdInput.value;

    if (articleId === 'new') {
        resetArticleForm();
        return;
    }

    const article = appData.articles.find(a => a.id === parseInt(articleId));
    if (article) {
        const codeInput = document.getElementById('articleCode');
        const descriptionInput = document.getElementById('articleDescription');
        const colorInput = document.getElementById('articleColor');
        const clientInput = document.getElementById('articleClient');
        const cycleStepsContainer = document.getElementById('cycleSteps');
        const bomItemsContainer = document.getElementById('bomItems');
        const saveBtn = document.getElementById('saveArticleBtn');
        const cancelBtn = document.getElementById('cancelArticleBtn');

        if (codeInput) codeInput.value = article.code;
        if (descriptionInput) descriptionInput.value = article.description;
        if (colorInput) colorInput.value = article.color;
        if (clientInput) clientInput.value = article.client;

        // Populate cycle steps
        if (cycleStepsContainer) cycleStepsContainer.innerHTML = ''; // Clear existing
        article.cycle.forEach(step => addCycleStep(step.phaseId, step.time));

        // Populate BOM items
        if (bomItemsContainer) bomItemsContainer.innerHTML = ''; // Clear existing
        article.bom.forEach(item => addBomItem(item.materialId, item.quantity, item.unit));

        if (saveBtn) {
            saveBtn.textContent = 'Salva Modifiche';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Modifiche';
        }
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        currentEditingId.articles = parseInt(articleId);
    } else {
        showNotification('Articolo non trovato.', 'error');
        resetArticleForm();
    }
}

/**
 * Populates the articles table.
 */
function updateArticlesTable() {
    const tableBody = document.getElementById('articlesTable');
    if (!tableBody) return; // Defensive check
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.articles.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nessun articolo registrato.</td></tr>';
        return;
    }

    appData.articles.forEach(article => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = article.code;
        row.insertCell().textContent = article.description;
        row.insertCell().textContent = article.color;
        row.insertCell().textContent = article.client;

        // Display cycle steps
        const cycleText = article.cycle.map(step => {
            const phase = appData.phases.find(p => p.id === step.phaseId);
            let phaseInfo = phase ? `${phase.name} (${step.time}min)` : `Fase Sconosciuta (${step.time}min)`;
            if (step.machineType && step.fineness) {
                phaseInfo += ` [${step.machineType} F${step.fineness}]`;
            }
            return phaseInfo;
        }).join('; ');
        row.insertCell().textContent = cycleText;

        // Display BOM items
        const bomText = article.bom.map(item => {
            const material = appData.rawMaterials.find(rm => rm.id === item.materialId);
            return material ? `${item.quantity}${item.unit} ${material.name}` : `${item.quantity}${item.unit} MP Sconosciuta`;
        }).join('; ');
        row.insertCell().textContent = bomText;

        const actionsCell = row.insertCell();

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Modifica Articolo';
        editBtn.onclick = () => {
            const articleIdInput = document.getElementById('articleId');
            if (articleIdInput) articleIdInput.value = article.id; // Set the select to the current article
            loadArticleForEdit(); // Load data into form
        };
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Elimina Articolo';
        deleteBtn.onclick = () => deleteArticle(article.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Resets the article form.
 */
function resetArticleForm() {
    const articleIdInput = document.getElementById('articleId');
    const codeInput = document.getElementById('articleCode');
    const descriptionInput = document.getElementById('articleDescription');
    const colorInput = document.getElementById('articleColor');
    const clientInput = document.getElementById('articleClient');
    const cycleStepsContainer = document.getElementById('cycleSteps');
    const bomItemsContainer = document.getElementById('bomItems');
    const saveBtn = document.getElementById('saveArticleBtn');
    const cancelBtn = document.getElementById('cancelArticleBtn');

    if (articleIdInput) articleIdInput.value = 'new';
    if (codeInput) codeInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (colorInput) colorInput.value = '';
    if (clientInput) clientInput.value = '';
    if (cycleStepsContainer) cycleStepsContainer.innerHTML = ''; // Clear cycle steps
    addCycleStep(); // Add one empty step
    if (bomItemsContainer) bomItemsContainer.innerHTML = ''; // Clear BOM items
    addBomItem(); // Add one empty BOM item
    if (saveBtn) {
        saveBtn.textContent = 'Aggiungi Articolo';
        saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Aggiungi Articolo';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    currentEditingId.articles = null;
}

/**
 * Deletes an article.
 * @param {number} articleId The ID of the article to delete.
 */
function deleteArticle(articleId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare articoli.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questo articolo? Questa azione è irreversibile e rimuoverà anche tutte le pianificazioni ad esso collegate.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.articles = appData.articles.filter(a => a.id !== articleId);
                    // Also remove related planning entries
                    appData.productionPlan = appData.productionPlan.filter(p => p.articleId !== articleId);
                    saveData();
                    updateArticlesTable();
                    populateArticleSelects();
                    updateDeliverySchedule(); // Refresh calendars
                    updateDailyWorkloadCalendar();
                    updatePlanningList();
                    showNotification('Articolo eliminato con successo!', 'success');
                }
            }
        ]
    );
}

// --- Funzioni per la Pianificazione Produzione (Planning) ---

/**
 * Calculates the estimated delivery date and workload for a production batch.
 */
function calculateDelivery() {
    try {
        if (!hasRole('planning')) {
            showNotification('Non hai i permessi per calcolare la pianificazione.', 'error');
            return;
        }

        const planningArticleSelect = document.getElementById('planningArticle');
        const planningQuantityInput = document.getElementById('planningQuantity');
        const planningStartDateInput = document.getElementById('planningStartDate');
        const planningTypeInput = document.getElementById('planningType');
        const planningPriorityInput = document.getElementById('planningPriority');
        const planningNotesInput = document.getElementById('planningNotes');

        if (!planningArticleSelect || !planningQuantityInput || !planningStartDateInput || !planningTypeInput || !planningPriorityInput || !planningNotesInput) {
            showNotification('Errore: Impossibile trovare tutti i campi del modulo di pianificazione.', 'error');
            console.error('Missing planning form elements.');
            return;
        }

        const articleId = parseInt(planningArticleSelect.value);
        const quantity = parseInt(planningQuantityInput.value);
        const startDateStr = planningStartDateInput.value;

        if (!articleId || isNaN(quantity) || quantity <= 0 || !startDateStr) {
            showNotification('Per favore, compila tutti i campi obbligatori (Articolo, Quantità, Data Inizio Desiderata).', 'error');
            return;
        }

        const article = appData.articles.find(a => a.id === articleId);
        if (!article) {
            showNotification('Articolo selezionato non trovato.', 'error');
            console.error('Article not found for ID:', articleId);
            return;
        }

        const startDate = new Date(startDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today for comparison

        if (startDate < today) {
            showNotification('La data di inizio desiderata non può essere nel passato.', 'error');
            return;
        }

        // Check raw material availability
        let materialShortages = [];
        article.bom.forEach(bomItem => {
            const material = appData.rawMaterials.find(rm => rm.id === bomItem.materialId);
            if (!material || material.currentStock < (bomItem.quantity * quantity)) {
                materialShortages.push(`${bomItem.quantity * quantity} ${bomItem.unit} di ${material ? material.name : 'Materia Prima Sconosciuta (ID: ' + bomItem.materialId + ')'}`);
            }
        });

        if (materialShortages.length > 0) {
            showMessageBox(
                'Carenza Materie Prime',
                `Impossibile procedere con la pianificazione. Scorte insufficienti per: ${materialShortages.join(', ')}. Vuoi comunque procedere?`,
                [
                    {
                        text: 'Annulla',
                        className: 'btn-secondary',
                        onClick: () => {
                            const savePlanningBtn = document.getElementById('savePlanningBtn');
                            const cancelPlanningBtn = document.getElementById('cancelPlanningBtn');
                            const deliveryResultDiv = document.getElementById('deliveryResult');
                            if (savePlanningBtn) savePlanningBtn.style.display = 'none';
                            if (cancelPlanningBtn) cancelPlanningBtn.style.display = 'none';
                            if (deliveryResultDiv) deliveryResultDiv.innerHTML = '<p style="text-align: center; color: var(--text-color);">Pianificazione annullata a causa di carenza materie prime.</p>';
                            // Ensure currentCalculatedPlanningDetails is null if calculation is cancelled
                            currentCalculatedPlanningDetails = null;
                        }
                    },
                    {
                        text: 'Procedi Comunque',
                        className: 'btn-warning',
                        isPrimary: true,
                        onClick: () => {
                            const { dailyWorkload, estimatedDeliveryDate } = calculateLotWorkload(article, quantity, startDate);
                            updatePlanningResultDisplay(startDate, quantity, estimatedDeliveryDate, dailyWorkload);
                            currentCalculatedPlanningDetails = {
                                id: currentEditingId.planning || generateId(),
                                articleId: article.id,
                                quantity: quantity,
                                type: planningTypeInput.value,
                                priority: planningPriorityInput.value,
                                startDate: startDate.toISOString().slice(0, 10),
                                estimatedDeliveryDate: estimatedDeliveryDate.toISOString().slice(0, 10),
                                status: "pending",
                                notes: planningNotesInput.value.trim(),
                                dailyWorkload: dailyWorkload
                            };
                            const savePlanningBtn = document.getElementById('savePlanningBtn');
                            const cancelPlanningBtn = document.getElementById('cancelPlanningBtn');
                            if (savePlanningBtn) savePlanningBtn.style.display = 'inline-block';
                            if (cancelPlanningBtn) cancelPlanningBtn.style.display = 'inline-block';
                            showNotification('Calcolo completato. Rivedi i dettagli e salva la pianificazione.', 'info');
                        }
                    }
                ]
            );
        } else {
            const { dailyWorkload, estimatedDeliveryDate } = calculateLotWorkload(article, quantity, startDate);
            updatePlanningResultDisplay(startDate, quantity, estimatedDeliveryDate, dailyWorkload);
            currentCalculatedPlanningDetails = {
                id: currentEditingId.planning || generateId(),
                articleId: article.id,
                quantity: quantity,
                type: planningTypeInput.value,
                priority: planningPriorityInput.value,
                startDate: startDate.toISOString().slice(0, 10),
                estimatedDeliveryDate: estimatedDeliveryDate.toISOString().slice(0, 10),
                status: "pending",
                notes: planningNotesInput.value.trim(),
                dailyWorkload: dailyWorkload
            };
            const savePlanningBtn = document.getElementById('savePlanningBtn');
            const cancelPlanningBtn = document.getElementById('cancelPlanningBtn');
            if (savePlanningBtn) savePlanningBtn.style.display = 'inline-block';
            if (cancelPlanningBtn) cancelPlanningBtn.style.display = 'inline-block';
            showNotification('Calcolo completato. Rivedi i dettagli e salva la pianificazione.', 'info');
        }
    } catch (error) {
        console.error("Errore nella funzione calculateDelivery:", error);
        showNotification("Si è verificato un errore durante il calcolo della consegna. Controlla la console per i dettagli.", 'error');
    }
}

/**
 * Updates the display area for planning calculation results.
 * @param {Date} startDate The start date.
 * @param {number} quantity The total quantity.
 * @param {Date} estimatedDeliveryDate The estimated delivery date.
 * @param {Object} dailyWorkload The detailed daily workload.
 */
function updatePlanningResultDisplay(startDate, quantity, estimatedDeliveryDate, dailyWorkload) {
    const deliveryResultDiv = document.getElementById('deliveryResult');
    if (!deliveryResultDiv) return;

    deliveryResultDiv.innerHTML = `
        <p>Data di Inizio Desiderata: <strong>${formatDate(startDate)}</strong></p>
        <p>Quantità da Produre: <strong>${quantity} pz</strong></p>
        <p>Data di Consegna Stimata: <strong>${formatDate(estimatedDeliveryDate)}</strong></p>
        <p>Carico di Lavoro Dettagliato:</p>
        <ul id="calculatedWorkloadList"></ul>
    `;

    const workloadList = document.getElementById('calculatedWorkloadList');
    if (workloadList) {
        for (const date in dailyWorkload) {
            const dateLi = document.createElement('li');
            dateLi.innerHTML = `<strong>${formatDate(new Date(date))}</strong>:`;
            const phaseUl = document.createElement('ul');
            for (const phaseId in dailyWorkload[date]) {
                const phase = appData.phases.find(p => p.id === parseInt(phaseId));
                const machine = appData.machines.find(m => m.id === dailyWorkload[date][phaseId].machine);
                if (phase) {
                    const phaseLi = document.createElement('li');
                    phaseLi.textContent = `${phase.name}: ${Math.floor(dailyWorkload[date][phaseId].quantity)} pz ${machine ? 'su Macchina ' + machine.name : '(Nessuna macchina specifica)'}`;
                    phaseUl.appendChild(phaseLi);
                }
            }
            dateLi.appendChild(phaseUl);
            workloadList.appendChild(dateLi);
        }
    }
}


/**
 * Saves the calculated production planning to appData.
 * This function handles both adding new lots and updating existing ones.
 */
function savePlanning() {
    console.log("savePlanning() chiamata.");
    console.log("currentEditingId.planning:", currentEditingId.planning);
    console.log("currentCalculatedPlanningDetails:", currentCalculatedPlanningDetails);
    console.log("currentUser roles:", currentUser ? currentUser.roles : "Nessun utente loggato");


    if (!hasRole('planning')) {
        showNotification('Non hai i permessi per salvare la pianificazione.', 'error');
        console.error("Permessi insufficienti per salvare la pianificazione.");
        return;
    }

    if (!currentCalculatedPlanningDetails) {
        showNotification('Nessuna pianificazione calcolata da salvare.', 'error');
        console.error("currentCalculatedPlanningDetails è nullo o indefinito.");
        return;
    }

    // If editing, find and replace the existing lot
    if (currentEditingId.planning) {
        const index = appData.productionPlan.findIndex(p => p.id === currentEditingId.planning);
        if (index > -1) {
            appData.productionPlan[index] = { ...currentCalculatedPlanningDetails };
            showNotification('Lotto di pianificazione aggiornato con successo!', 'success');
            console.log("Lotto di pianificazione aggiornato:", appData.productionPlan[index]);
        } else {
            // Fallback if not found, add as new
            appData.productionPlan.push({ ...currentCalculatedPlanningDetails, id: generateId() });
            showNotification('Lotto di pianificazione aggiunto come nuovo (ID originale non trovato)!', 'warning');
            console.warn("Lotto di pianificazione aggiunto come nuovo (ID originale non trovato):", currentCalculatedPlanningDetails);
        }
    } else {
        // Add new lot
        appData.productionPlan.push({ ...currentCalculatedPlanningDetails });
        showNotification('Pianificazione salvata con successo!', 'success');
        console.log("Nuovo lotto di pianificazione aggiunto:", currentCalculatedPlanningDetails);
    }

    saveData();
    updateDeliverySchedule();
    updateDailyWorkloadCalendar();
    updatePlanningList();
    updateDashboardStats(); // Update dashboard after saving planning
    resetPlanningForm();
}

/**
 * Resets the planning form and clears calculated details.
 */
function resetPlanningForm() {
    const planningArticleSelect = document.getElementById('planningArticle');
    const planningQuantityInput = document.getElementById('planningQuantity');
    const planningTypeSelect = document.getElementById('planningType');
    const planningPrioritySelect = document.getElementById('planningPriority');
    const planningStartDateInput = document.getElementById('planningStartDate');
    const planningNotesTextarea = document.getElementById('planningNotes');
    const deliveryResultDiv = document.getElementById('deliveryResult');
    const savePlanningBtn = document.getElementById('savePlanningBtn');
    const cancelPlanningBtn = document.getElementById('cancelPlanningBtn');

    if (planningArticleSelect) planningArticleSelect.value = '';
    if (planningQuantityInput) planningQuantityInput.value = '';
    if (planningTypeSelect) planningTypeSelect.value = 'production';
    if (planningPrioritySelect) planningPrioritySelect.value = 'low';
    if (planningStartDateInput) planningStartDateInput.value = '';
    if (planningNotesTextarea) planningNotesTextarea.value = '';
    if (deliveryResultDiv) deliveryResultDiv.innerHTML = '<p style="text-align: center; color: var(--text-color);">Seleziona un articolo, quantità e data per calcolare la data di consegna stimata.</p>';
    if (savePlanningBtn) savePlanningBtn.style.display = 'none';
    if (cancelPlanningBtn) cancelPlanningBtn.style.display = 'none';
    currentCalculatedPlanningDetails = null;
    currentEditingId.planning = null; // Ensure no planning lot is in edit mode
}

/**
 * Opens the edit planning modal and populates it with data.
 * @param {number} lotId The ID of the planning lot to edit.
 */
function openEditPlanningModal(lotId) {
    if (!hasRole('planning')) {
        showNotification('Non hai i permessi per modificare i lotti di pianificazione.', 'error');
        return;
    }

    const lot = appData.productionPlan.find(p => p.id === lotId);
    if (lot) {
        const editPlanningModal = document.getElementById('editPlanningModal');
        const editPlanningLotIdInput = document.getElementById('editPlanningLotId');
        const editPlanningArticleSelect = document.getElementById('editPlanningArticle');
        const editPlanningQuantityInput = document.getElementById('editPlanningQuantity');
        const editPlanningTypeSelect = document.getElementById('editPlanningType');
        const editPlanningPrioritySelect = document.getElementById('editPlanningPriority');
        const editPlanningStartDateInput = document.getElementById('editPlanningStartDate');
        const editPlanningNotesTextarea = document.getElementById('editPlanningNotes');

        if (editPlanningLotIdInput) editPlanningLotIdInput.value = lot.id;
        if (editPlanningArticleSelect) editPlanningArticleSelect.value = lot.articleId;
        if (editPlanningQuantityInput) editPlanningQuantityInput.value = lot.quantity;
        if (editPlanningTypeSelect) editPlanningTypeSelect.value = lot.type;
        if (editPlanningPrioritySelect) editPlanningPrioritySelect.value = lot.priority;
        if (editPlanningStartDateInput) editPlanningStartDateInput.value = lot.startDate;
        if (editPlanningNotesTextarea) editPlanningNotesTextarea.value = lot.notes;

        if (editPlanningModal) editPlanningModal.classList.add('show');
        document.body.classList.add('modal-open');
        currentEditingId.planning = lotId;
    } else {
        showNotification('Lotto di pianificazione non trovato.', 'error');
    }
}

/**
 * Saves changes from the edit planning modal.
 */
function saveEditedPlanning() {
    if (!hasRole('planning')) {
        showNotification('Non hai i permessi per salvare le modifiche al lotto di pianificazione.', 'error');
        return;
    }

    const lotIdInput = document.getElementById('editPlanningLotId');
    if (!lotIdInput) {
        showNotification('Errore: ID lotto di pianificazione non trovato.', 'error');
        return;
    }
    const lotId = parseInt(lotIdInput.value);
    const lotIndex = appData.productionPlan.findIndex(p => p.id === lotId);

    if (lotIndex > -1) {
        const lot = appData.productionPlan[lotIndex];
        const newArticleId = parseInt(document.getElementById('editPlanningArticle').value);
        const newQuantity = parseInt(document.getElementById('editPlanningQuantity').value);
        const newType = document.getElementById('editPlanningType').value;
        const newPriority = document.getElementById('editPlanningPriority').value;
        const newStartDateStr = document.getElementById('editPlanningStartDate').value; // Get as string
        const newNotes = document.getElementById('editPlanningNotes').value.trim();

        // Basic validation
        if (!newArticleId || isNaN(newQuantity) || newQuantity <= 0 || !newStartDateStr) {
            showNotification('Per favor, compila tutti i campi obbligatori nel modulo di modifica.', 'error');
            return;
        }

        // Update fields
        lot.articleId = newArticleId;
        lot.quantity = newQuantity;
        lot.type = newType;
        lot.priority = newPriority;
        lot.startDate = newStartDateStr; // Store as string
        lot.notes = newNotes;

        // Re-calculate estimated delivery date and daily workload if article, quantity or start date changed
        const article = appData.articles.find(a => a.id === lot.articleId);
        if (article) {
            const { dailyWorkload, estimatedDeliveryDate } = calculateLotWorkload(
                article,
                lot.quantity,
                new Date(lot.startDate)
            );
            lot.dailyWorkload = dailyWorkload;
            lot.estimatedDeliveryDate = estimatedDeliveryDate.toISOString().slice(0, 10);
        } else {
            showNotification('Articolo non trovato per il ricalcolo del lotto di pianificazione.', 'error');
            // If article not found, clear workload and delivery date to avoid displaying incorrect data
            lot.dailyWorkload = {};
            lot.estimatedDeliveryDate = null;
        }

        saveData();
        updateDeliverySchedule();
        updateDailyWorkloadCalendar();
        updatePlanningList();
        updateDashboardStats();
        closeEditPlanningModal();
        showNotification('Lotto di pianificazione aggiornato con successo!', 'success');
    } else {
        showNotification('Errore durante l\'aggiornamento del lotto di pianificazione.', 'error');
    }
}

/**
 * Closes the edit planning modal.
 */
function closeEditPlanningModal() {
    const modal = document.getElementById('editPlanningModal');
    if (modal) modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    currentEditingId.planning = null;
}

/**
 * Updates the detailed planning list on the schedule page.
 */
function updatePlanningList() {
    const planningListContainer = document.getElementById('planningList');
    if (!planningListContainer) return; // Defensive check
    planningListContainer.innerHTML = ''; // Clear existing list

    if (appData.productionPlan.length === 0) {
        planningListContainer.innerHTML = '<p style="text-align: center; color: #888;">Nessun lotto di pianificazione registrato.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'planning-list-items';

    // Sort by estimated delivery date
    const sortedPlan = [...appData.productionPlan].sort((a, b) => new Date(a.estimatedDeliveryDate) - new Date(b.estimatedDeliveryDate));

    sortedPlan.forEach(lot => {
        const article = appData.articles.find(a => a.id === lot.articleId);
        const articleInfo = article ? `${article.code} - ${article.description}` : 'Articolo Sconosciuto';

        const li = document.createElement('li');
        li.className = `planning-list-item priority-${lot.priority} plan-type-${lot.type}`;
        li.innerHTML = `
            <div>
                <strong>Articolo:</strong> ${articleInfo} (${lot.quantity} pz)<br>
                <strong>Tipo:</strong> ${lot.type === 'production' ? 'Produzione' : 'Campionatura'}<br>
                <strong>Priorità:</strong> <span class="priority-text">${lot.priority.charAt(0).toUpperCase() + lot.priority.slice(1)}</span><br>
                <strong>Inizio Stimato:</strong> ${lot.startDate ? formatDate(new Date(lot.startDate)) : 'N/D'}<br>
                <strong>Consegna Stimata:</strong> ${lot.estimatedDeliveryDate ? formatDate(new Date(lot.estimatedDeliveryDate)) : 'N/D'}<br>
                <strong>Stato:</strong> ${lot.status.charAt(0).toUpperCase() + lot.status.slice(1)}<br>
                ${lot.notes ? `<strong>Note:</strong> ${lot.notes}` : ''}
            </div>
            <div class="planning-item-actions">
                <button class="btn btn-sm btn-primary" onclick="openEditPlanningModal(${lot.id})" aria-label="Modifica lotto"><i class="fas fa-edit"></i> Modifica</button>
                <button class="btn btn-sm btn-danger" onclick="deletePlanningLot(${lot.id})" aria-label="Elimina lotto"><i class="fas fa-trash"></i> Elimina</button>
                <button class="btn btn-sm btn-success" onclick="markPlanningAsCompleted(${lot.id})" aria-label="Segna come completato"><i class="fas fa-check-circle"></i> Completa</button>
            </div>
        `;
        ul.appendChild(li);
    });
    planningListContainer.appendChild(ul);
}

/**
 * Deletes a planning lot.
 * @param {number} lotId The ID of the planning lot to delete.
 */
function deletePlanningLot(lotId) {
    if (!hasRole('planning')) {
        showNotification('Non hai i permessi per eliminare i lotti di pianificazione.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questo lotto di pianificazione? Questa azione è irreversibile.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.productionPlan = appData.productionPlan.filter(p => p.id !== lotId);
                    saveData();
                    updatePlanningList();
                    updateDeliverySchedule();
                    updateDailyWorkloadCalendar();
                    updateDashboardStats();
                    showNotification('Lotto di pianificazione eliminato con successo!', 'success');
                }
            }
        ]
    );
}

/**
 * Marks a planning lot as completed.
 * @param {number} lotId The ID of the planning lot to mark as completed.
 */
function markPlanningAsCompleted(lotId) {
    if (!hasRole('planning')) {
        showNotification('Non hai i permessi per marcare i lotti come completati.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Completamento',
        'Sei sicuro di voler marcare questo lotto di pianificazione come "Completato"?',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Completa',
                className: 'btn-success',
                isPrimary: true,
                onClick: () => {
                    const lot = appData.productionPlan.find(p => p.id === lotId);
                    if (lot) {
                        lot.status = 'completed';
                        saveData();
                        updatePlanningList();
                        updateDeliverySchedule();
                        updateDailyWorkloadCalendar();
                        updateDashboardStats();
                        showNotification(`Lotto ${lot.id} marcato come completato!`, 'success');
                    } else {
                        showNotification('Lotto di pianificazione non trovato.', 'error');
                    }
                }
            }
        ]
    );
}


// --- Funzioni per il Calendario di Consegna (Schedule) ---

/**
 * Navigates the delivery schedule week.
 * @param {number} days The number of days to move (e.g., 7 for next week, -7 for previous).
 */
function navigateDeliveryWeek(days) {
    appData.currentDeliveryWeekStartDate = addDays(appData.currentDeliveryWeekStartDate, days);
    saveData();
    updateDeliverySchedule();
}

/**
 * Updates the delivery schedule calendar.
 */
function updateDeliverySchedule() {
    const deliveryScheduleDiv = document.getElementById('deliverySchedule');
    const currentDeliveryWeekRangeSpan = document.getElementById('currentDeliveryWeekRange');
    if (!deliveryScheduleDiv || !currentDeliveryWeekRangeSpan) return; // Defensive check

    deliveryScheduleDiv.innerHTML = ''; // Clear existing content

    const currentWeekStart = appData.currentDeliveryWeekStartDate;
    const currentWeekEnd = addDays(currentWeekStart, 6);

    currentDeliveryWeekRangeSpan.textContent =
        `${formatDate(currentWeekStart)} - ${formatDate(currentWeekEnd)}`;

    for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeekStart, i);
        const dayKey = day.toISOString().slice(0, 10);
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.innerHTML = `<div class="day-header">${formatDate(day, { weekday: 'short', day: 'numeric', month: 'short' })}</div>`;

        const deliveriesForDay = appData.productionPlan.filter(p =>
            p.estimatedDeliveryDate === dayKey && p.status !== 'completed'
        ).sort((a, b) => {
            // Sort by priority: high > medium > low
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        if (deliveriesForDay.length === 0) {
            dayColumn.innerHTML += '<p style="text-align: center; font-size: 0.9em; color: #aaa;">Nessuna consegna</p>';
        } else {
            deliveriesForDay.forEach(lot => {
                const article = appData.articles.find(a => a.id === lot.articleId);
                const articleCode = article ? article.code : 'Sconosciuto';
                const taskDiv = document.createElement('div');
                taskDiv.className = `day-task priority-${lot.priority} plan-type-${lot.type}`;
                taskDiv.innerHTML = `
                    <strong>${articleCode}</strong> - ${lot.quantity} pz<br>
                    Priorità: ${lot.priority.charAt(0).toUpperCase() + lot.priority.slice(1)}<br>
                    Tipo: ${lot.type === 'production' ? 'Prod.' : 'Camp.'}
                `;
                taskDiv.onclick = () => openEditPlanningModal(lot.id); // Make tasks clickable
                dayColumn.appendChild(taskDiv);
            });
        }
        deliveryScheduleDiv.appendChild(dayColumn);
    }
}

// --- Funzioni per il Calendario Carico di Lavoro (Workload) ---

/**
 * Navigates the workload schedule week.
 * @param {number} days The number of days to move.
 */
function navigateWorkloadWeek(days) {
    appData.currentWorkloadWeekStartDate = addDays(appData.currentWorkloadWeekStartDate, days);
    saveData();
    updateDailyWorkloadCalendar();
}

/**
 * Updates the daily workload calendar.
 */
function updateDailyWorkloadCalendar() {
    const dailyWorkloadCalendarDiv = document.getElementById('dailyWorkloadCalendar');
    const currentWorkloadWeekRangeSpan = document.getElementById('currentWorkloadWeekRange');
    if (!dailyWorkloadCalendarDiv || !currentWorkloadWeekRangeSpan) return; // Defensive check

    dailyWorkloadCalendarDiv.innerHTML = ''; // Clear existing content

    const currentWeekStart = appData.currentWorkloadWeekStartDate;
    const currentWeekEnd = addDays(currentWeekStart, 6);

    currentWorkloadWeekRangeSpan.textContent =
        `${formatDate(currentWeekStart)} - ${formatDate(currentWeekEnd)}`;

    for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeekStart, i);
        const dayKey = day.toISOString().slice(0, 10);
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.innerHTML = `<div class="day-header">${formatDate(day, { weekday: 'short', day: 'numeric', month: 'short' })}</div>`;

        // Aggregate workload for this day across all planning lots
        const dailyWorkloadAggregated = {}; // { departmentId: { phaseId: { quantity: X, machine: Y } } }

        appData.productionPlan.forEach(lot => {
            if (lot.dailyWorkload && lot.dailyWorkload[dayKey] && lot.status !== 'completed') {
                for (const phaseId in lot.dailyWorkload[dayKey]) {
                    const phaseData = lot.dailyWorkload[dayKey][phaseId];
                    const phase = appData.phases.find(p => p.id === parseInt(phaseId));
                    if (phase) {
                        // Find department that contains this phase.
                        // Note: A phase might be in multiple departments in a complex setup,
                        // but for simplicity, we'll pick the first department that includes this phase.
                        const department = appData.departments.find(d => (d.phaseIds || []).includes(phase.id));
                        if (department) {
                            dailyWorkloadAggregated[department.id] = dailyWorkloadAggregated[department.id] || {};
                            dailyWorkloadAggregated[department.id][phase.id] = dailyWorkloadAggregated[department.id][phase.id] || { quantity: 0, machine: phaseData.machine };
                            dailyWorkloadAggregated[department.id][phase.id].quantity += phaseData.quantity;
                        }
                    }
                }
            }
        });

        if (Object.keys(dailyWorkloadAggregated).length === 0) {
            dayColumn.innerHTML += '<p style="text-align: center; font-size: 0.9em; color: #aaa;">Nessun carico di lavoro</p>';
        } else {
            // Sort departments by name for consistent display
            const sortedDepartmentIds = Object.keys(dailyWorkloadAggregated).sort((a, b) => {
                const deptA = appData.departments.find(d => d.id === parseInt(a));
                const deptB = appData.departments.find(d => d.id === parseInt(b));
                return (deptA ? deptA.name : '').localeCompare(deptB ? deptB.name : '');
            });

            sortedDepartmentIds.forEach(deptId => {
                const department = appData.departments.find(d => d.id === parseInt(deptId));
                if (department) {
                    const deptDiv = document.createElement('div');
                    deptDiv.className = 'daily-workload-department';
                    deptDiv.innerHTML = `<h5>${department.name}</h5>`;
                    for (const phaseId in dailyWorkloadAggregated[deptId]) {
                        const phase = appData.phases.find(p => p.id === parseInt(phaseId));
                        const machine = appData.machines.find(m => m.id === dailyWorkloadAggregated[deptId][phaseId].machine);
                        if (phase) {
                            const detailDiv = document.createElement('div');
                            detailDiv.className = 'daily-workload-detail';
                            // Display quantity as integer
                            detailDiv.innerHTML = `${phase.name}: <strong>${Math.floor(dailyWorkloadAggregated[deptId][phaseId].quantity)} pz</strong> ${machine ? 'su ' + machine.name : '(Nessuna macchina specifica)'}`;
                            deptDiv.appendChild(detailDiv);
                        }
                    }
                    dayColumn.appendChild(deptDiv);
                }
            });
        }
        dailyWorkloadCalendarDiv.appendChild(dayColumn);
    }
}


// --- Funzioni per la Dashboard ---

/**
 * Updates the dashboard statistics.
 */
function updateDashboardStats() {
    const generalStatsDiv = document.getElementById('generalStats');
    const machineStatsDiv = document.getElementById('machineStats');
    const upcomingDeliveriesDiv = document.getElementById('upcomingDeliveries');
    const workloadChartDiv = document.getElementById('workloadChart');
    const rawMaterialStockSummaryDiv = document.getElementById('rawMaterialStockSummary');

    if (!generalStatsDiv || !machineStatsDiv || !upcomingDeliveriesDiv || !workloadChartDiv || !rawMaterialStockSummaryDiv) {
        console.warn('One or more dashboard elements not found.');
        return;
    }

    // General Stats
    const totalArticles = appData.articles.length;
    const totalPhases = appData.phases.length;
    const totalMachines = appData.machines.length;
    const pendingProductionLots = appData.productionPlan.filter(p => p.type === 'production' && p.status !== 'completed').length;
    const pendingSampleLots = appData.productionPlan.filter(p => p.type === 'sample' && p.status !== 'completed').length;
    const totalRawMaterials = appData.rawMaterials.length;

    generalStatsDiv.innerHTML = `
        <p>Articoli Registrati: <strong>${totalArticles}</strong></p>
        <p>Fasi di Lavorazione: <strong>${totalPhases}</strong></p>
        <p>Macchinari Registrati: <strong>${totalMachines}</strong></p>
        <p>Lotti di Produzione Pendenti: <strong>${pendingProductionLots}</strong></p>
        <p>Lotti di Campionatura Pendenti: <strong>${pendingSampleLots}</strong></p>
        <p>Materie Prime Registrate: <strong>${totalRawMaterials}</strong></p>
    `;

    // Raw Material Stock Summary
    rawMaterialStockSummaryDiv.innerHTML = '<h4>Riepilogo Scorte Materie Prime</h4>';
    if (appData.rawMaterials.length === 0) {
        rawMaterialStockSummaryDiv.innerHTML += '<p>Nessuna materia prima registrata.</p>';
    } else {
        const ul = document.createElement('ul');
        appData.rawMaterials.forEach(rm => {
            const li = document.createElement('li');
            li.textContent = `${rm.name}: ${rm.currentStock.toFixed(2)} ${rm.unit}`;
            ul.appendChild(li);
        });
        rawMaterialStockSummaryDiv.appendChild(ul);
    }


    // Machine Usage (Simplified)
    machineStatsDiv.innerHTML = '<h4>Utilizzo Macchinari</h4>';
    if (appData.machines.length === 0) {
        machineStatsDiv.innerHTML += '<p>Nessun macchinario registrato.</p>';
    } else {
        appData.machines.forEach(machine => {
            // Calculate a very simplified "current usage" based on pending production lots assigned to it
            let machineWorkload = 0;
            appData.productionPlan.filter(p => p.status !== 'completed').forEach(lot => {
                for (const dateKey in lot.dailyWorkload) {
                    for (const phaseId in lot.dailyWorkload[dateKey]) {
                        if (lot.dailyWorkload[dateKey][phaseId].machine === machine.id) {
                            machineWorkload += lot.dailyWorkload[dateKey][phaseId].quantity;
                        }
                    }
                }
            });

            // For a more accurate usage, we'd need to track allocated hours vs. available hours.
            // For now, we'll just show a simplified "workload" relative to its capacity.
            const totalMachineCapacityPerDay = machine.capacity * 8; // Assuming 8 hours/day
            const usagePercentage = totalMachineCapacityPerDay > 0 ? (machineWorkload / totalMachineCapacityPerDay) * 100 : 0;

            machineStatsDiv.innerHTML += `
                <p>${machine.name}: ${usagePercentage.toFixed(1)}% (Carico: ${Math.floor(machineWorkload)} pz / Capacità giornaliera: ${totalMachineCapacityPerDay} pz)</p>
                <div class="machine-usage">
                    <div class="machine-usage-bar" style="width: ${Math.min(100, usagePercentage)}%;"></div>
                </div>
            `;
        });
    }

    // Upcoming Deliveries
    upcomingDeliveriesDiv.innerHTML = '<h4>Consegne Imminenti (Prossimi 7 giorni)</h4>';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7Days = addDays(today, 7);

    const upcoming = appData.productionPlan.filter(p =>
        new Date(p.estimatedDeliveryDate) >= today &&
        new Date(p.estimatedDeliveryDate) <= next7Days &&
        p.status !== 'completed'
    ).sort((a, b) => new Date(a.estimatedDeliveryDate) - new Date(b.estimatedDeliveryDate));

    if (upcoming.length === 0) {
        upcomingDeliveriesDiv.innerHTML += '<p>Nessuna consegna imminente.</p>';
    } else {
        const ul = document.createElement('ul');
        upcoming.forEach(lot => {
            const article = appData.articles.find(a => a.id === lot.articleId);
            const articleInfo = article ? `${article.code} - ${article.description}` : 'Articolo Sconosciuto';
            const li = document.createElement('li');
            li.innerHTML = `<strong>${formatDate(new Date(lot.estimatedDeliveryDate))}</strong>: ${articleInfo} (${lot.quantity} pz) - Priorità: <span class="priority-text priority-${lot.priority}">${lot.priority.charAt(0).toUpperCase() + lot.priority.slice(1)}</span>`;
            ul.appendChild(li);
        });
        upcomingDeliveriesDiv.appendChild(ul);
    }

    // Workload Chart (Placeholder - actual chart implementation would use a library like Chart.js)
    workloadChartDiv.innerHTML = `
        <p class="chart-placeholder">Il grafico del carico di lavoro settimanale sarà visualizzato qui. <br> (Richiede una libreria di grafici come Chart.js)</p>
    `;
    // In a real application, you would initialize a Chart.js instance here
    // For example:
    // const ctx = document.createElement('canvas');
    // workloadChartDiv.innerHTML = '';
    // workloadChartDiv.appendChild(ctx);
    // new Chart(ctx, { /* chart configuration */ });
}


// --- Funzioni per la Gestione delle Notifiche ---

/**
 * Adds a new notification to the system.
 * @param {string} message The notification message.
 * @param {string} type The type of notification (info, warning, error, success).
 */
function addNotification(message, type = 'info') {
    const newNotification = {
        id: generateId(),
        message: message,
        date: new Date().toISOString(),
        type: type,
        read: false
    };
    appData.notifications.unshift(newNotification); // Add to the beginning
    saveData();
    updateNotificationBadge();
    // showNotification(message, type); // Optional: also show as toast
}

/**
 * Updates the notification badge count.
 */
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return; // Defensive check
    const unreadCount = appData.notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

/**
 * Opens the notifications modal.
 */
function openNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.classList.add('show');
    document.body.classList.add('modal-open');
    filterNotifications(currentNotificationFilter); // Refresh list based on current filter
}

/**
 * Closes the notifications modal.
 */
function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.classList.remove('show');
    document.body.classList.remove('modal-open');
}

/**
 * Filters and displays notifications in the modal.
 * @param {string} filter 'unread' or 'all'.
 */
function filterNotifications(filter) {
    currentNotificationFilter = filter;
    const notificationsList = document.getElementById('notificationsList');
    const filterUnreadBtn = document.getElementById('filterUnread');
    const filterAllBtn = document.getElementById('filterAll');

    if (!notificationsList || !filterUnreadBtn || !filterAllBtn) {
        console.warn('Notification modal elements not found for filtering.');
        return;
    }

    notificationsList.innerHTML = ''; // Clear existing list

    filterUnreadBtn.classList.remove('active');
    filterAllBtn.classList.remove('active');
    const activeFilterBtn = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
    if (activeFilterBtn) activeFilterBtn.classList.add('active');


    const filteredNotifications = appData.notifications.filter(n =>
        filter === 'all' || (filter === 'unread' && !n.read)
    ).sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    if (filteredNotifications.length === 0) {
        notificationsList.innerHTML = '<p style="text-align: center; color: #888;">Nessun messaggio.</p>';
        return;
    }

    filteredNotifications.forEach(notification => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        itemDiv.setAttribute('role', 'alert'); // For accessibility
        itemDiv.setAttribute('aria-live', 'polite'); // For accessibility

        itemDiv.innerHTML = `
            <div class="notification-item-content">
                ${notification.message}
                <small>${new Date(notification.date).toLocaleString()}</small>
            </div>
            <div class="notification-item-actions">
                ${!notification.read ? `<button class="btn btn-sm btn-secondary" onclick="markNotificationAsRead(${notification.id})" aria-label="Segna come letto"><i class="fas fa-eye"></i> Letto</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteNotification(${notification.id})" aria-label="Elimina notifica"><i class="fas fa-trash"></i> Elimina</button>
            </div>
        `;
        notificationsList.appendChild(itemDiv);
    });
}

/**
 * Marks a notification as read.
 * @param {number} notificationId The ID of the notification to mark as read.
 */
function markNotificationAsRead(notificationId) {
    const notification = appData.notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        saveData();
        filterNotifications(currentNotificationFilter); // Refresh list
        updateNotificationBadge();
    }
}

/**
 * Deletes a notification.
 * @param {number} notificationId The ID of the notification to delete.
 */
function deleteNotification(notificationId) {
    showMessageBox(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questa notifica?',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.notifications = appData.notifications.filter(n => n.id !== notificationId);
                    saveData();
                    filterNotifications(currentNotificationFilter); // Refresh list
                    updateNotificationBadge();
                    showNotification('Notifica eliminata.', 'info');
                }
            }
        ]
    );
}

// --- Funzioni per la Gestione Utenti (Users) ---

/**
 * Populates the users table.
 */
function updateUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return; // Defensive check
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nessun utente registrato.</td></tr>';
        return;
    }

    appData.users.forEach(user => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = user.username;
        row.insertCell().textContent = '********'; // Never display actual password
        row.insertCell().textContent = user.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ');
        row.insertCell().textContent = user.forcePasswordChange ? 'Sì' : 'No';

        const actionsCell = row.insertCell();

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Modifica Utente';
        editBtn.onclick = () => editUser(user.id);
        actionsCell.appendChild(editBtn);

        const resetPwdBtn = document.createElement('button');
        resetPwdBtn.className = 'btn btn-sm btn-warning';
        resetPwdBtn.innerHTML = '<i class="fas fa-key"></i>';
        resetPwdBtn.title = 'Reset Password';
        resetPwdBtn.onclick = () => resetUserPassword(user.id);
        actionsCell.appendChild(resetPwdBtn);

        const forcePwdChangeBtn = document.createElement('button');
        forcePwdChangeBtn.className = 'btn btn-sm btn-info';
        forcePwdChangeBtn.innerHTML = '<i class="fas fa-lock"></i>';
        forcePwdChangeBtn.title = 'Forza Cambio Password';
        forcePwdChangeBtn.onclick = () => forcePasswordChangeOnNextLogin(user.id);
        actionsCell.appendChild(forcePwdChangeBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Elimina Utente';
        deleteBtn.onclick = () => deleteUser(user.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Saves a new user or updates an existing one.
 */
function saveUser() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per gestire gli utenti.', 'error');
        return;
    }

    const usernameInput = document.getElementById('usernameInputForm');
    const passwordInput = document.getElementById('passwordInputForm');
    const forcePasswordChangeCheckbox = document.getElementById('forcePasswordChangeCheckbox');
    const userRolesCheckboxes = document.querySelectorAll('#userRolesCheckboxes input[type="checkbox"]:checked');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const forcePasswordChange = forcePasswordChangeCheckbox ? forcePasswordChangeCheckbox.checked : false;
    const selectedRoles = Array.from(userRolesCheckboxes).map(cb => cb.value);

    if (!username || (!currentEditingId.users && !password)) { // Password is required for new users
        showNotification('Nome utente e password (per nuovi utenti) sono obbligatori.', 'error');
        return;
    }

    if (currentEditingId.users) {
        // Update existing user
        const userIndex = appData.users.findIndex(u => u.id === currentEditingId.users);
        if (userIndex > -1) {
            // Check for username uniqueness if username changed
            if (normalizeString(appData.users[userIndex].username) !== normalizeString(username) &&
                appData.users.some(u => normalizeString(u.username) === normalizeString(username) && u.id !== currentEditingId.users)) {
                showNotification('Esiste già un altro utente con questo nome utente.', 'error');
                return;
            }
            appData.users[userIndex].username = username;
            if (password) { // Only update password if provided
                appData.users[userIndex].password = password;
            }
            appData.users[userIndex].roles = selectedRoles;
            appData.users[userIndex].forcePasswordChange = forcePasswordChange;
            showNotification('Utente aggiornato con successo!', 'success');
        } else {
            showNotification('Utente non trovato per l\'aggiornamento.', 'error');
            return;
        }
    } else {
        // Add new user
        if (appData.users.some(u => normalizeString(u.username) === normalizeString(username))) {
            showNotification('Esiste già un utente con questo nome utente.', 'error');
            return;
        }
        const newUser = {
            id: generateId(),
            username: username,
            password: password,
            roles: selectedRoles,
            forcePasswordChange: forcePasswordChange
        };
        appData.users.push(newUser);
        showNotification('Utente aggiunto con successo!', 'success');
    }
    saveData();
    updateUsersTable();
    resetUserForm();
}

/**
 * Loads a user into the form for editing.
 * @param {number} userId The ID of the user to edit.
 */
function editUser(userId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per modificare gli utenti.', 'error');
        return;
    }

    const user = appData.users.find(u => u.id === userId);
    if (user) {
        const usernameInput = document.getElementById('usernameInputForm');
        const passwordInput = document.getElementById('passwordInputForm');
        const forcePasswordChangeCheckbox = document.getElementById('forcePasswordChangeCheckbox');
        const saveBtn = document.getElementById('saveUserBtn');
        const cancelBtn = document.getElementById('cancelUserBtn');

        if (usernameInput) usernameInput.value = user.username;
        if (passwordInput) passwordInput.value = ''; // Don't pre-fill password for security
        if (forcePasswordChangeCheckbox) forcePasswordChangeCheckbox.checked = user.forcePasswordChange;

        // Set roles checkboxes
        document.querySelectorAll('#userRolesCheckboxes input[type="checkbox"]').forEach(cb => {
            cb.checked = user.roles.includes(cb.value);
        });

        if (saveBtn) {
            saveBtn.textContent = 'Salva Modifiche';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Modifiche';
        }
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        currentEditingId.users = userId;
    } else {
        showNotification('Utente non trovato.', 'error');
    }
}

/**
 * Resets the user form.
 */
function resetUserForm() {
    const usernameInput = document.getElementById('usernameInputForm');
    const passwordInput = document.getElementById('passwordInputForm');
    const forcePasswordChangeCheckbox = document.getElementById('forcePasswordChangeCheckbox');
    const saveBtn = document.getElementById('saveUserBtn');
    const cancelBtn = document.getElementById('cancelUserBtn');

    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (forcePasswordChangeCheckbox) forcePasswordChangeCheckbox.checked = false;
    document.querySelectorAll('#userRolesCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    if (saveBtn) {
        saveBtn.textContent = 'Aggiungi Utente';
        saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Aggiungi Utente';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    currentEditingId.users = null;
}

/**
 * Resets a user's password to a temporary one and forces a change on next login.
 * @param {number} userId The ID of the user.
 */
function resetUserPassword(userId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per resettare le password.', 'error');
        return;
    }

    const user = appData.users.find(u => u.id === userId);
    if (user) {
        showMessageBox(
            'Conferma Reset Password',
            `Sei sicuro di voler resettare la password per l'utente ${user.username}? Verrà impostata una password temporanea casuale e l'utente dovrà cambiarla al prossimo accesso.`,
            [
                {
                    text: 'Annulla',
                    className: 'btn-secondary',
                    onClick: () => {}
                },
                {
                    text: 'Reset Password',
                    className: 'btn-warning',
                    isPrimary: true,
                    onClick: () => {
                        const newPassword = Math.random().toString(36).substring(2, 10); // Generate a simple temporary password
                        user.password = newPassword; // For simulation, update directly
                        user.forcePasswordChange = true;
                        saveData();
                        updateUsersTable(); // Refresh table to show forcePasswordChange flag updated
                        showNotification(`Password per ${user.username} resettata a "${newPassword}". L'utente dovrà cambiarla al prossimo accesso.`, 'warning');
                    }
                }
            ]
        );
    } else {
        showNotification('Utente non trovato per il reset password.', 'error');
    }
}

/**
 * Sets the forcePasswordChange flag for a user.
 * @param {number} userId The ID of the user.
 */
function forcePasswordChangeOnNextLogin(userId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per forzare il cambio password.', 'error');
        return;
    }

    const user = appData.users.find(u => u.id === userId);
    if (user) {
        showMessageBox(
            'Conferma Forza Cambio Password',
            `Sei sicuro di voler forzare il cambio password per l'utente ${user.username} al prossimo accesso?`,
            [
                {
                    text: 'Annulla',
                    className: 'btn-secondary',
                    onClick: () => {}
                },
                {
                    text: 'Forza Cambio',
                    className: 'btn-info',
                    isPrimary: true,
                    onClick: () => {
                        user.forcePasswordChange = true;
                        saveData();
                        updateUsersTable(); // Refresh table to show forcePasswordChange flag updated
                        showNotification(`Cambio password forzato impostato per ${user.username}.`, 'info');
                    }
                }
            ]
        );
    } else {
        showNotification('Utente non trovato per l\'impostazione del cambio password forzato.', 'error');
    }
}

/**
 * Deletes a user.
 * @param {number} userId The ID of the user to delete.
 */
function deleteUser(userId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare utenti.', 'error');
        return;
    }

    if (currentUser && currentUser.id === userId) {
        showNotification('Non puoi eliminare il tuo stesso account mentre sei loggato.', 'error');
        return;
    }

    showMessageBox(
        'Conferma Eliminazione Utente',
        'Sei sicuro di voler eliminare questo utente? Questa azione è irreversibile.',
        [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                onClick: () => {}
            },
            {
                text: 'Elimina',
                className: 'btn-danger',
                isPrimary: true,
                onClick: () => {
                    appData.users = appData.users.filter(u => u.id !== userId);
                    saveData();
                    updateUsersTable();
                    showNotification('Utente eliminato con successo!', 'success');
                }
            }
        ]
    );
}

// --- Funzioni di Utilità per Date ---

/**
 * Adds days to a given date.
 * @param {Date} date The starting date.
 * @param {number} days The number of days to add.
 * @returns {Date} The new date.
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Formats a Date object into a readable string (e.g., "DD/MM/YYYY").
 * @param {Date} date The date object to format.
 * @param {Object} options Formatting options for toLocaleDateString.
 * @returns {string} The formatted date string.
 */
function formatDate(date, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
    return date.toLocaleDateString('it-IT', options);
}

/**
 * Gets the start of the week (Monday) for a given date.
 * @param {Date} date The date to get the start of the week for.
 * @returns {Date} The date representing the start of the week (Monday).
 */
function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday (make it previous Monday)
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Inizializzazione: Carica i dati salvati e aggiorna l'UI quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded: Inizio caricamento app.");

    // Load and initialize app data, including users
    loadAndInitializeAppData();

    // Recalculate workloads for all planning items on load to ensure calendar display
    recalculateAllPlanningWorkloads();

    // Apply saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateThemeIcon(); // Ensure correct icon on load

    // Initial display of notifications badge
    updateNotificationBadge();

    // Ensure the login overlay is shown initially
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.classList.add('show');
    document.body.classList.add('modal-open'); // Prevent scrolling while login is active
});

// Event listener for the "Salva Modifiche" button in the edit planning modal
const saveEditedPlanningBtn = document.getElementById('saveEditedPlanningBtn');
if (saveEditedPlanningBtn) saveEditedPlanningBtn.addEventListener('click', saveEditedPlanning);
// Event listener for the "Annulla" button in the edit planning modal
const cancelEditPlanningBtn = document.getElementById('cancelEditPlanningBtn');
if (cancelEditPlanningBtn) cancelEditPlanningBtn.addEventListener('click', closeEditPlanningModal);

// Event listener for the "Conferma Consumo" button in the actual consumption modal
const confirmActualConsumptionBtn = document.getElementById('confirmActualConsumptionBtn');
if (confirmActualConsumptionBtn) confirmActualConsumptionBtn.addEventListener('click', confirmActualConsumption);
// Event listener for the "Annulla" button in the actual consumption modal
const cancelActualConsumptionBtn = document.getElementById('cancelActualConsumptionBtn');
if (cancelActualConsumptionBtn) cancelActualConsumptionBtn.addEventListener('click', closeActualConsumptionModal);
