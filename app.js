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
    holidays: [],
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
 * Saves the current appData to localStorage.
 */
function saveData() {
    localStorage.setItem('magliflexAppData', JSON.stringify(appData));
    console.log("Dati salvati localmente.");
}

/**
 * Loads appData from localStorage.
 * @returns {object} The loaded data or an empty structure if no data found.
 */
function loadData() {
    const storedData = localStorage.getItem('magliflexAppData');
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            // Basic validation to ensure it's a valid appData structure
            if (parsedData && typeof parsedData === 'object' &&
                Array.isArray(parsedData.users) &&
                Array.isArray(parsedData.phases) &&
                Array.isArray(parsedData.holidays)) { // Check for a few key arrays
                console.log("Dati caricati localmente.");
                return parsedData;
            } else {
                console.warn("Dati in localStorage non validi o incompleti. Caricamento dati di default.");
                localStorage.removeItem('magliflexAppData'); // Clear invalid data
                return null; // Indicate no valid data was loaded
            }
        } catch (e) {
            console.error("Errore nel parsing dei dati da localStorage:", e);
            localStorage.removeItem('magliflexAppData'); // Clear corrupted data
            return null; // Indicate no valid data was loaded
        }
    }
    console.log("Nessun dato trovato in localStorage. Inizializzazione dati vuoti.");
    return null; // Indicate no data was loaded
}

/**
 * Initializes app data, ensuring default admin user exists and setting up initial week dates.
 */
function loadAndInitializeAppData() {
    let loadedData = loadData();

    if (!loadedData) {
        console.log("Inizializzazione con dati di esempio.");
        appData = {
            phases: [
                { id: 101, name: 'Tessitura', departmentId: 1, departmentName: 'Reparto Tessitura', duration: 2.5 },
                { id: 102, name: 'Tintura', departmentId: 2, departmentName: 'Reparto Tintoria', duration: 1.0 },
                { id: 103, name: 'Taglio', departmentId: 3, departmentName: 'Reparto Taglio', duration: 0.5 },
                { id: 104, name: 'Cucito', departmentId: 4, departmentName: 'Reparto Cucito', duration: 1.5 },
                { id: 105, name: 'Controllo Qualità', departmentId: 5, departmentName: 'Reparto Controllo Qualità', duration: 0.2 },
                { id: 106, name: 'Stampa Digitale', departmentId: 6, departmentName: 'Reparto Stampa', duration: 0.8 },
                { id: 107, name: 'Ricamo', departmentId: 4, departmentName: 'Reparto Cucito', duration: 0.3 }
            ],
            machines: [
                { id: 201, name: 'Telaio Rapido X1', departmentId: 1, departmentName: 'Reparto Tessitura', capacity: 150 },
                { id: 202, name: 'Telaio Standard Y2', departmentId: 1, departmentName: 'Reparto Tessitura', capacity: 100 },
                { id: 203, name: 'Tintore a Ciclo Continuo', departmentId: 2, departmentName: 'Reparto Tintoria', capacity: 600 },
                { id: 204, name: 'Tintore a Lotti Piccolo', departmentId: 2, departmentName: 'Reparto Tintoria', capacity: 200 },
                { id: 205, name: 'Taglierina Automatica Z3', departmentId: 3, departmentName: 'Reparto Taglio', capacity: 250 },
                { id: 206, name: 'Macchina Cucito Industriale A', departmentId: 4, departmentName: 'Reparto Cucito', capacity: 120 },
                { id: 207, name: 'Macchina Cucito Industriale B', departmentId: 4, departmentName: 'Reparto Cucito', capacity: 120 },
                { id: 208, name: 'Stampante Tessuti Grande Formato', departmentId: 6, departmentName: 'Reparto Stampa', capacity: 80 },
                { id: 209, name: 'Ricamatrice Multi-testa', departmentId: 4, departmentName: 'Reparto Cucito', capacity: 50 }
            ],
            departments: [
                { id: 1, name: 'Reparto Tessitura', description: 'Produzione di tessuti grezzi' },
                { id: 2, name: 'Reparto Tintoria', description: 'Tintura e finissaggio dei tessuti' },
                { id: 3, name: 'Reparto Taglio', description: 'Taglio di precisione dei tessuti' },
                { id: 4, name: 'Reparto Cucito', description: 'Assemblaggio e confezionamento capi' },
                { id: 5, name: 'Reparto Controllo Qualità', description: 'Ispezione finale dei prodotti' },
                { id: 6, name: 'Reparto Stampa', description: 'Stampa digitale su tessuti' },
                { id: 7, name: 'Magazzino Materie Prime', description: 'Gestione stock di materie prime' },
                { id: 8, name: 'Magazzino Prodotti Finiti', description: 'Gestione stock di prodotti finiti' }
            ],
            rawMaterials: [
                { id: 301, name: 'Filato di Cotone Biologico', unit: 'kg', currentStock: 2500 },
                { id: 302, name: 'Filato di Poliestere Riciclato', unit: 'kg', currentStock: 1200 },
                { id: 303, name: 'Colorante Rosso Azo-Free', unit: 'litri', currentStock: 300 },
                { id: 304, name: 'Colorante Blu Indaco', unit: 'litri', currentStock: 150 },
                { id: 305, name: 'Etichette Tessute', unit: 'pezzi', currentStock: 10000 },
                { id: 306, name: 'Bottoni in Legno', unit: 'pezzi', currentStock: 5000 },
                { id: 307, name: 'Cerniere Zip Metallo', unit: 'pezzi', currentStock: 3000 },
                { id: 308, name: 'Inchiostro Stampa Tessile Nero', unit: 'litri', currentStock: 50 }
            ],
            warehouseJournal: [],
            articles: [
                {
                    id: 401,
                    name: 'T-shirt Classica Uomo',
                    description: 'Maglietta girocollo in cotone biologico 180g/mq',
                    cycle: [
                        { phaseId: 101, phaseName: 'Tessitura', departmentId: 1, departmentName: 'Reparto Tessitura', duration: 0.15 },
                        { phaseId: 102, phaseName: 'Tintura', departmentId: 2, departmentName: 'Reparto Tintoria', duration: 0.08 },
                        { phaseId: 103, phaseName: 'Taglio', departmentId: 3, departmentName: 'Reparto Taglio', duration: 0.03 },
                        { phaseId: 104, phaseName: 'Cucito', departmentId: 4, departmentName: 'Reparto Cucito', duration: 0.12 },
                        { phaseId: 105, phaseName: 'Controllo Qualità', departmentId: 5, departmentName: 'Reparto Controllo Qualità', duration: 0.01 }
                    ],
                    bom: [
                        { rawMaterialId: 301, rawMaterialName: 'Filato di Cotone Biologico', unit: 'kg', quantity: 0.25 },
                        { rawMaterialId: 303, rawMaterialName: 'Colorante Rosso Azo-Free', unit: 'litri', quantity: 0.015 },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', unit: 'pezzi', quantity: 1 }
                    ]
                },
                {
                    id: 402,
                    name: 'Felpa con Cappuccio Unisex',
                    description: 'Felpa in poliestere riciclato con interno felpato',
                    cycle: [
                        { phaseId: 101, phaseName: 'Tessitura', departmentId: 1, departmentName: 'Reparto Tessitura', duration: 0.3 },
                        { phaseId: 102, phaseName: 'Tintura', departmentId: 2, departmentName: 'Reparto Tintoria', duration: 0.15 },
                        { phaseId: 103, phaseName: 'Taglio', departmentId: 3, departmentName: 'Reparto Taglio', duration: 0.05 },
                        { phaseId: 104, phaseName: 'Cucito', departmentId: 4, departmentName: 'Reparto Cucito', duration: 0.25 },
                        { phaseId: 105, phaseName: 'Controllo Qualità', departmentId: 5, departmentName: 'Reparto Controllo Qualità', duration: 0.02 }
                    ],
                    bom: [
                        { rawMaterialId: 302, rawMaterialName: 'Filato di Poliestere Riciclato', unit: 'kg', quantity: 0.5 },
                        { rawMaterialId: 304, rawMaterialName: 'Colorante Blu Indaco', unit: 'litri', quantity: 0.03 },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', unit: 'pezzi', quantity: 1 }
                    ]
                },
                {
                    id: 403,
                    name: 'Polo Piqué',
                    description: 'Polo in cotone piqué con colletto e bottoni',
                    cycle: [
                        { phaseId: 101, phaseName: 'Tessitura', departmentId: 1, departmentName: 'Reparto Tessitura', duration: 0.2 },
                        { phaseId: 102, phaseName: 'Tintura', departmentId: 2, departmentName: 'Reparto Tintoria', duration: 0.1 },
                        { phaseId: 103, phaseName: 'Taglio', departmentId: 3, departmentName: 'Reparto Taglio', duration: 0.04 },
                        { phaseId: 104, phaseName: 'Cucito', departmentId: 4, departmentName: 'Reparto Cucito', duration: 0.18 },
                        { phaseId: 105, phaseName: 'Controllo Qualità', departmentId: 5, departmentName: 'Reparto Controllo Qualità', duration: 0.015 }
                    ],
                    bom: [
                        { rawMaterialId: 301, rawMaterialName: 'Filato di Cotone Biologico', unit: 'kg', quantity: 0.3 },
                        { rawMaterialId: 303, rawMaterialName: 'Colorante Rosso Azo-Free', unit: 'litri', quantity: 0.02 },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', unit: 'pezzi', quantity: 1 },
                        { rawMaterialId: 306, rawMaterialName: 'Bottoni in Legno', unit: 'pezzi', quantity: 2 }
                    ]
                },
                {
                    id: 404,
                    name: 'T-shirt Stampa Personalizzata',
                    description: 'T-shirt in cotone con stampa digitale fronte/retro',
                    cycle: [
                        { phaseId: 101, phaseName: 'Tessitura', departmentId: 1, departmentName: 'Reparto Tessitura', duration: 0.15 },
                        { phaseId: 102, phaseName: 'Tintura', departmentId: 2, departmentName: 'Reparto Tintoria', duration: 0.08 },
                        { phaseId: 106, phaseName: 'Stampa Digitale', departmentId: 6, departmentName: 'Reparto Stampa', duration: 0.05 },
                        { phaseId: 103, phaseName: 'Taglio', departmentId: 3, departmentName: 'Reparto Taglio', duration: 0.03 },
                        { phaseId: 104, phaseName: 'Cucito', departmentId: 4, departmentName: 'Reparto Cucito', duration: 0.12 },
                        { phaseId: 105, phaseName: 'Controllo Qualità', departmentId: 5, departmentName: 'Reparto Controllo Qualità', duration: 0.01 }
                    ],
                    bom: [
                        { rawMaterialId: 301, rawMaterialName: 'Filato di Cotone Biologico', unit: 'kg', quantity: 0.25 },
                        { rawMaterialId: 303, rawMaterialName: 'Colorante Rosso Azo-Free', unit: 'litri', quantity: 0.015 },
                        { rawMaterialId: 308, rawMaterialName: 'Inchiostro Stampa Tessile Nero', unit: 'litri', quantity: 0.005 },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', unit: 'pezzi', quantity: 1 }
                    ]
                }
            ],
            productionPlan: [
                // Example production lots
                {
                    id: 501,
                    articleId: 401,
                    articleName: 'T-shirt Classica Uomo',
                    quantity: 500,
                    priority: 'high',
                    type: 'production',
                    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0], // 10 days from now
                    suggestedStartDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
                    suggestedEndDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0],
                    totalWorkingDays: 5,
                    workloadDetails: [
                        { departmentName: 'Reparto Tessitura', totalHours: 75 },
                        { departmentName: 'Reparto Tintoria', totalHours: 40 },
                        { departmentName: 'Reparto Taglio', totalHours: 15 },
                        { departmentName: 'Reparto Cucito', totalHours: 60 },
                        { departmentName: 'Reparto Controllo Qualità', totalHours: 5 }
                    ],
                    materialsNeeded: [
                        { rawMaterialId: 301, rawMaterialName: 'Filato di Cotone Biologico', totalQuantity: 125, unit: 'kg' },
                        { rawMaterialId: 303, rawMaterialName: 'Colorante Rosso Azo-Free', totalQuantity: 7.5, unit: 'litri' },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', totalQuantity: 500, unit: 'pezzi' }
                    ],
                    status: 'pending'
                },
                {
                    id: 502,
                    articleId: 402,
                    articleName: 'Felpa con Cappuccio Unisex',
                    quantity: 200,
                    priority: 'medium',
                    type: 'production',
                    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0], // 15 days from now
                    suggestedStartDate: new Date(new Date().setDate(new Date().getDate() + 8)).toISOString().split('T')[0],
                    suggestedEndDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0],
                    totalWorkingDays: 7,
                    workloadDetails: [
                        { departmentName: 'Reparto Tessitura', totalHours: 60 },
                        { departmentName: 'Reparto Tintoria', totalHours: 30 },
                        { departmentName: 'Reparto Taglio', totalHours: 10 },
                        { departmentName: 'Reparto Cucito', totalHours: 50 },
                        { departmentName: 'Reparto Controllo Qualità', totalHours: 4 }
                    ],
                    materialsNeeded: [
                        { rawMaterialId: 302, rawMaterialName: 'Filato di Poliestere Riciclato', totalQuantity: 100, unit: 'kg' },
                        { rawMaterialId: 304, rawMaterialName: 'Colorante Blu Indaco', totalQuantity: 6, unit: 'litri' },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', totalQuantity: 200, unit: 'pezzi' }
                    ],
                    status: 'pending'
                },
                {
                    id: 503,
                    articleId: 401,
                    articleName: 'T-shirt Classica Uomo',
                    quantity: 10,
                    priority: 'low',
                    type: 'sample',
                    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0], // 5 days from now
                    suggestedStartDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
                    suggestedEndDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
                    totalWorkingDays: 2,
                    workloadDetails: [
                        { departmentName: 'Reparto Tessitura', totalHours: 1.5 },
                        { departmentName: 'Reparto Tintoria', totalHours: 0.8 },
                        { departmentName: 'Reparto Taglio', totalHours: 0.3 },
                        { departmentName: 'Reparto Cucito', totalHours: 1.2 },
                        { departmentName: 'Reparto Controllo Qualità', totalHours: 0.1 }
                    ],
                    materialsNeeded: [
                        { rawMaterialId: 301, rawMaterialName: 'Filato di Cotone Biologico', totalQuantity: 2.5, unit: 'kg' },
                        { rawMaterialId: 303, rawMaterialName: 'Colorante Rosso Azo-Free', totalQuantity: 0.15, unit: 'litri' },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', totalQuantity: 10, unit: 'pezzi' }
                    ],
                    status: 'completed' // Example of a completed sample lot
                },
                {
                    id: 504,
                    articleId: 404,
                    articleName: 'T-shirt Stampa Personalizzata',
                    quantity: 100,
                    priority: 'high',
                    type: 'production',
                    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], // 7 days from now
                    suggestedStartDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
                    suggestedEndDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
                    totalWorkingDays: 5,
                    workloadDetails: [
                        { departmentName: 'Reparto Tessitura', totalHours: 15 },
                        { departmentName: 'Reparto Tintoria', totalHours: 8 },
                        { departmentName: 'Reparto Stampa', totalHours: 5 },
                        { departmentName: 'Reparto Taglio', totalHours: 3 },
                        { departmentName: 'Reparto Cucito', totalHours: 12 },
                        { departmentName: 'Reparto Controllo Qualità', totalHours: 1 }
                    ],
                    materialsNeeded: [
                        { rawMaterialId: 301, rawMaterialName: 'Filato di Cotone Biologico', totalQuantity: 25, unit: 'kg' },
                        { rawMaterialId: 303, rawMaterialName: 'Colorante Rosso Azo-Free', totalQuantity: 1.5, unit: 'litri' },
                        { rawMaterialId: 308, rawMaterialName: 'Inchiostro Stampa Tessile Nero', totalQuantity: 0.5, unit: 'litri' },
                        { rawMaterialId: 305, rawMaterialName: 'Etichette Tessute', totalQuantity: 100, unit: 'pezzi' }
                    ],
                    status: 'pending'
                }
            ],
            notifications: [],
            users: [
                {
                    id: 1,
                    username: 'admin',
                    password: 'admin',
                    roles: ['admin', 'planner', 'production', 'warehouse'],
                    forcePasswordChange: false
                },
                {
                    id: 2,
                    username: 'planner1',
                    password: 'password',
                    roles: ['planner'],
                    forcePasswordChange: false
                },
                {
                    id: 3,
                    username: 'production1',
                    password: 'password',
                    roles: ['production'],
                    forcePasswordChange: false
                },
                {
                    id: 4,
                    username: 'warehouse1',
                    password: 'password',
                    roles: ['warehouse'],
                    forcePasswordChange: false
                }
            ],
            holidays: [
                { id: 1, date: '2025-01-01', description: 'Capodanno' },
                { id: 2, date: '2025-01-06', description: 'Epifania' },
                { id: 3, date: '2025-04-21', description: 'Pasquetta' },
                { id: 4, date: '2025-04-25', description: 'Festa della Liberazione' },
                { id: 5, date: '2025-05-01', description: 'Festa del Lavoro' },
                { id: 6, date: '2025-06-02', description: 'Festa della Repubblica' },
                { id: 7, date: '2025-08-15', description: 'Ferragosto' },
                { id: 8, date: '2025-11-01', description: 'Ognissanti' },
                { id: 9, date: '2025-12-08', description: 'Immacolata Concezione' },
                { id: 10, date: '2025-12-25', description: 'Natale' },
                { id: 11, date: '2025-12-26', description: 'Santo Stefano' }
            ],
            currentDeliveryWeekStartDate: getStartOfWeek(new Date()).toISOString().split('T')[0],
            currentWorkloadWeekStartDate: getStartOfWeek(new Date()).toISOString().split('T')[0]
        };
        saveData(); // Save initial example data
    } else {
        appData = loadedData;
    }

    // Ensure default admin user exists if it was somehow removed from loaded data
    // This part ensures that even if local storage is cleared or corrupted, an admin user is always available.
    const adminUserExists = appData.users.some(u => u.username === 'admin');
    if (!adminUserExists) {
        appData.users.push({
            id: generateId(),
            username: 'admin',
            password: 'admin',
            roles: ['admin', 'planner', 'production', 'warehouse'],
            forcePasswordChange: false
        });
        saveData();
    }

    // Initialize current week start dates if not set (could be null if loadedData was old format)
    if (!appData.currentDeliveryWeekStartDate) {
        appData.currentDeliveryWeekStartDate = getStartOfWeek(new Date()).toISOString().split('T')[0];
    }
    if (!appData.currentWorkloadWeekStartDate) {
        appData.currentWorkloadWeekStartDate = getStartOfWeek(new Date()).toISOString().split('T')[0];
    }

    // Update UI elements - ensure these are called AFTER appData is fully initialized
    updatePhasesTable();
    updateMachinesTable();
    updateDepartmentsTable();
    updateRawMaterialsTable();
    updateArticlesTable();
    updateProductionLotsTable();
    updateHolidaysTable();
    updateWarehouseJournalTable();
    updateUsersTable(); // Update users table on load
    updateNotificationBadge();
    updateDashboardSummary();
    renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
    renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
}

/**
 * Displays a specific page and updates active navigation button.
 * @param {string} pageId The ID of the page to display.
 */
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show the requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }


    // Update active navigation button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === pageId) {
            btn.classList.add('active');
        }
    });

    // Close nav menu on mobile after selection
    if (window.innerWidth <= 768) {
        toggleNavMenu();
    }

    // Specific updates for certain pages when shown
    if (pageId === 'rawMaterialsPage') {
        populateRawMaterialSelects();
    } else if (pageId === 'articlesPage') {
        // When articles page is shown, ensure initial selects are populated if forms are visible
        // This is primarily for the 'add new article' form, not for dynamic rows
        // The resetArticleForm() or editArticle() will handle populating the selects
        // by calling addCycleStep() and addBomItem() which then call the populate functions.
        // No direct call needed here.
    } else if (pageId === 'phasesPage') {
        populateDepartmentSelects(); // For phase department
    } else if (pageId === 'machinesPage') {
        populateDepartmentSelects(); // For machine department
    } else if (pageId === 'planningCalendarPage') {
        populatePlanningArticleSelect();
        renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
        renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
    } else if (pageId === 'dashboardPage') {
        updateDashboardSummary();
    }
}

/**
 * Toggles the navigation menu visibility on mobile.
 */
function toggleNavMenu() {
    const navMenu = document.getElementById('navMenu');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const body = document.body;
    const backdrop = document.querySelector('.menu-backdrop');

    if (navMenu) navMenu.classList.toggle('open');
    if (hamburgerBtn) hamburgerBtn.classList.toggle('open');
    if (body) body.classList.toggle('nav-open'); // Add/remove class to body to prevent scroll
    if (backdrop) backdrop.classList.toggle('show'); // Show/hide the backdrop
}


/**
 * Toggles between light and dark themes.
 */
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    // Optionally save theme preference to localStorage
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

/**
 * Applies the saved theme preference on load.
 */
function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

/**
 * Displays a toast notification.
 * @param {string} message The message to display.
 * @param {string} type The type of notification (success, error, warning, info).
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.warn("Notification container not found.");
        return;
    }
    const notification = document.createElement('div');
    notification.classList.add('notification-message', type);
    notification.textContent = message;

    container.appendChild(notification);

    // Trigger reflow to ensure animation plays
    void notification.offsetWidth;

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        }, { once: true });
    }, 5000); // Notification disappears after 5 seconds
}

/**
 * Adds a notification to the appData and updates the badge.
 * @param {string} message The notification message.
 * @param {string} type The type of notification (e.g., 'info', 'warning', 'error').
 * @param {string} relatedId An optional ID related to the notification (e.g., lot ID).
 */
function addAppNotification(message, type = 'info', relatedId = null) {
    const notification = {
        id: generateId(),
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: relatedId
    };
    appData.notifications.unshift(notification); // Add to the beginning
    saveData();
    updateNotificationBadge();
}

/**
 * Updates the notification badge count.
 */
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    const unreadCount = appData.notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex'; // Use flex to center content
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Opens the notifications modal and displays notifications based on the current filter.
 */
function openNotificationsModal() {
    const notificationsModal = document.getElementById('notificationsModal');
    if (notificationsModal) {
        notificationsModal.classList.add('show');
        filterNotifications(currentNotificationFilter); // Apply current filter on open
    }
}

/**
 * Closes the notifications modal.
 */
function closeNotificationsModal() {
    const notificationsModal = document.getElementById('notificationsModal');
    if (notificationsModal) {
        notificationsModal.classList.remove('show');
    }
}

/**
 * Filters and displays notifications in the modal.
 * @param {string} filter 'unread' or 'all'.
 */
function filterNotifications(filter) {
    currentNotificationFilter = filter;
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    notificationsList.innerHTML = ''; // Clear current list

    const filteredNotifications = appData.notifications.filter(n => {
        return filter === 'all' || !n.read;
    });

    if (filteredNotifications.length === 0) {
        notificationsList.innerHTML = '<p style="text-align: center; color: #888;">Nessun messaggio.</p>';
        return;
    }

    filteredNotifications.forEach(notification => {
        const item = document.createElement('div');
        item.classList.add('notification-item', notification.read ? 'read' : 'unread');
        item.innerHTML = `
            <div class="notification-item-content">
                ${notification.message}
                <small>${new Date(notification.timestamp).toLocaleString()}</small>
            </div>
            <div class="notification-item-actions">
                ${!notification.read ? `<button class="btn btn-sm btn-info" onclick="markNotificationAsRead(${notification.id})">Segna come letto</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteNotification(${notification.id})">Elimina</button>
            </div>
        `;
        notificationsList.appendChild(item);
    });

    // Update active state of filter buttons
    const filterUnreadBtn = document.getElementById('filterUnread');
    const filterAllBtn = document.getElementById('filterAll');
    if (filterUnreadBtn) filterUnreadBtn.classList.toggle('active', filter === 'unread');
    if (filterAllBtn) filterAllBtn.classList.toggle('active', filter === 'all');
}

/**
 * Marks a notification as read.
 * @param {number} id The ID of the notification to mark as read.
 */
function markNotificationAsRead(id) {
    const notification = appData.notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        saveData();
        filterNotifications(currentNotificationFilter); // Re-render with updated status
        updateNotificationBadge();
    }
}

/**
 * Deletes a notification.
 * @param {number} id The ID of the notification to delete.
 */
function deleteNotification(id) {
    appData.notifications = appData.notifications.filter(n => n.id !== id);
    saveData();
    filterNotifications(currentNotificationFilter); // Re-render with updated list
    updateNotificationBadge();
}

/**
 * Generic cancel edit function to hide cancel button and reset relevant form.
 * @param {string} sectionKey The key for the section (e.g., 'phases', 'articles').
 */
function cancelEdit(sectionKey) {
    switch (sectionKey) {
        case 'phases':
            resetPhaseForm();
            break;
        case 'machines':
            resetMachineForm();
            break;
        case 'departments':
            resetDepartmentForm();
            break;
        case 'articles':
            resetArticleForm();
            break;
        case 'rawMaterials': // For raw materials, it's about adding stock vs new RM
            resetRawMaterialForm();
            break;
        case 'planning':
            resetPlanningForm();
            break;
        case 'users':
            resetUserForm();
            break;
        default:
            console.warn('Funzione cancelEdit non definita per la sezione:', sectionKey);
    }
    // This line might cause issues if the button ID is not perfectly matched
    // document.getElementById(`cancel${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}Btn`).style.display = 'none';
    currentEditingId[sectionKey] = null;
}


// --- Funzioni di Autenticazione e Autorizzazione ---

/**
 * Handles user login.
 */
function loginUser() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');

    if (!usernameInput || !passwordInput) {
        showNotification('Errore: Campi di login non trovati.', 'error');
        return;
    }

    const username = usernameInput.value;
    const password = passwordInput.value;

    const user = appData.users.find(u => normalizeString(u.username) === normalizeString(username));

    if (user && user.password === password) { // Check password
        currentUser = user;
        const loginOverlay = document.getElementById('loginOverlay');
        const appContent = document.getElementById('appContent');
        if (loginOverlay) loginOverlay.classList.remove('show');
        if (appContent) appContent.style.display = 'flex';
        updateLoggedInUserDisplay();
        applyTheme(); // Apply theme on successful login
        showPage('dashboardPage'); // Show dashboard after login

        // Check if password change is forced
        if (currentUser.forcePasswordChange) {
            showMessageBox(
                'Cambio Password Richiesto',
                'La tua password è stata resettata o è richiesto un cambio. Per favore, imposta una nuova password.',
                'passwordChangePrompt', // Special type for password change
                () => {
                    // This callback will be executed when the user clicks "OK" on the prompt
                    // Open the user management page and pre-fill the form for the current user
                    showPage('userManagementPage');
                    editUser(currentUser.id); // Pre-fill form for current user
                    // Optionally, disable other navigation until password is changed
                }
            );
        }
        showNotification(`Benvenuto, ${currentUser.username}!`, 'success');
    } else {
        showNotification('Nome utente o password non validi.', 'error');
    }
}

/**
 * Handles user logout.
 */
function logoutUser() {
    currentUser = null;
    const appContent = document.getElementById('appContent');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginOverlay = document.getElementById('loginOverlay');

    if (appContent) appContent.style.display = 'none';
    if (usernameInput) usernameInput.value = ''; // Clear username
    if (passwordInput) passwordInput.value = ''; // Clear password
    if (loginOverlay) loginOverlay.classList.add('show');
    showNotification('Disconnessione effettuata.', 'info');
}

/**
 * Updates the display of the currently logged-in user's username and roles.
 */
function updateLoggedInUserDisplay() {
    const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');
    const currentUserRoleDisplay = document.getElementById('currentUserRoleDisplay');

    if (currentUser && currentUsernameDisplay && currentUserRoleDisplay) {
        currentUsernameDisplay.textContent = currentUser.username;
        currentUserRoleDisplay.textContent = currentUser.roles.map(role => {
            // Capitalize first letter for display
            return role.charAt(0).toUpperCase() + role.slice(1);
        }).join(', ');
    } else if (currentUsernameDisplay && currentUserRoleDisplay) {
        currentUsernameDisplay.textContent = 'N/A';
        currentUserRoleDisplay.textContent = 'N/A';
    }
}

/**
 * Checks if the current user has the required role(s).
 * @param {string|string[]} requiredRoles A single role string or an array of role strings.
 * @returns {boolean} True if the user has at least one of the required roles, false otherwise.
 */
function hasRole(requiredRoles) {
    if (!currentUser || !currentUser.roles) {
        return false;
    }
    if (typeof requiredRoles === 'string') {
        requiredRoles = [requiredRoles];
    }
    return requiredRoles.some(role => currentUser.roles.includes(role));
}

/**
 * Displays a custom message box instead of alert/confirm.
 * @param {string} title The title of the message box.
 * @param {string} message The message content.
 * @param {string} type 'alert', 'confirm', or 'passwordChangePrompt'.
 * @param {function} onConfirm Callback for 'confirm' or 'passwordChangePrompt'.
 * @param {function} onCancel Callback for 'confirm'.
 */
function showMessageBox(title, message, type = 'alert', onConfirm = null, onCancel = null) {
    let modalId = 'messageBoxModal'; // Generic modal for alerts and confirms
    let modalHtml = `
        <div id="${modalId}" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">
            <div class="modal-content">
                <h3 id="${modalId}-title">${title}</h3>
                <p>${message}</p>
                <div class="modal-buttons">
    `;

    if (type === 'confirm') {
        modalHtml += `
            <button class="btn btn-primary" id="messageBoxConfirmBtn">Conferma</button>
            <button class="btn btn-danger" id="messageBoxCancelBtn">Annulla</button>
        `;
    } else if (type === 'passwordChangePrompt') {
        modalHtml += `
            <button class="btn btn-primary" id="messageBoxConfirmBtn">OK</button>
        `;
    } else { // type === 'alert'
        modalHtml += `
            <button class="btn btn-primary" id="messageBoxCloseBtn">Chiudi</button>
        `;
    }

    modalHtml += `
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById(modalId);

    // Show the modal
    modal.classList.add('show');

    // Add event listeners
    if (type === 'confirm' || type === 'passwordChangePrompt') {
        const confirmBtn = document.getElementById('messageBoxConfirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                modal.classList.remove('show');
                if (onConfirm) onConfirm();
                modal.remove();
            };
        }

        if (type === 'confirm') {
            const cancelBtn = document.getElementById('messageBoxCancelBtn');
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    modal.classList.remove('show');
                    if (onCancel) onCancel();
                    modal.remove();
                };
            }
        }
    } else {
        const closeBtn = document.getElementById('messageBoxCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.remove('show');
                modal.remove();
            };
        }
    }
}


// --- Funzioni per la Gestione Utenti (Nuove) ---

/**
 * Resets the user form.
 */
function resetUserForm() {
    const usernameInputForm = document.getElementById('usernameInputForm');
    const passwordInputForm = document.getElementById('passwordInputForm');
    const cancelEditUserBtn = document.getElementById('cancelEditUserBtn');

    if (usernameInputForm) usernameInputForm.value = '';
    if (passwordInputForm) passwordInputForm.value = '';
    document.querySelectorAll('#userRoles input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    if (cancelEditUserBtn) cancelEditUserBtn.style.display = 'none';
    currentEditingId.users = null;
}

/**
 * Saves a new user or updates an existing one.
 */
function saveUser() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per gestire gli utenti.', 'error');
        return;
    }

    const usernameInputForm = document.getElementById('usernameInputForm');
    const passwordInputForm = document.getElementById('passwordInputForm');

    if (!usernameInputForm || !passwordInputForm) {
        showNotification('Errore: Campi utente non trovati.', 'error');
        return;
    }

    const username = usernameInputForm.value;
    const password = passwordInputForm.value;
    const selectedRoles = Array.from(document.querySelectorAll('#userRoles input[type="checkbox"]:checked'))
                               .map(cb => cb.value);

    if (!username) {
        showNotification('Il nome utente è obbligatorio.', 'error');
        return;
    }

    if (currentEditingId.users) {
        // Editing existing user
        const userIndex = appData.users.findIndex(u => u.id === currentEditingId.users);
        if (userIndex !== -1) {
            const user = appData.users[userIndex];
            user.username = username;
            if (password) { // Only update password if a new one is provided
                user.password = password;
                user.forcePasswordChange = false; // Reset force change if password is manually updated
            }
            user.roles = selectedRoles;
            saveData();
            showNotification('Utente aggiornato con successo!', 'success');
        } else {
            showNotification('Errore: Utente non trovato per l\'aggiornamento.', 'error');
        }
    } else {
        // Adding new user
        if (!password) {
            showNotification('La password è obbligatoria per un nuovo utente.', 'error');
            return;
        }
        if (appData.users.some(u => normalizeString(u.username) === normalizeString(username))) {
            showNotification('Errore: Esiste già un utente con questo nome.', 'error');
            return;
        }
        const newUser = {
            id: generateId(),
            username: username,
            password: password,
            roles: selectedRoles,
            forcePasswordChange: false
        };
        appData.users.push(newUser);
        saveData();
        showNotification('Nuovo utente aggiunto con successo!', 'success');
    }
    updateUsersTable();
    resetUserForm();
}

/**
 * Populates the user form for editing.
 * @param {number} userId The ID of the user to edit.
 */
function editUser(userId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per modificare gli utenti.', 'error');
        return;
    }

    const user = appData.users.find(u => u.id === userId);
    if (user) {
        const usernameInputForm = document.getElementById('usernameInputForm');
        const passwordInputForm = document.getElementById('passwordInputForm');
        const cancelEditUserBtn = document.getElementById('cancelEditUserBtn');

        if (usernameInputForm) usernameInputForm.value = user.username;
        if (passwordInputForm) passwordInputForm.value = ''; // Don't pre-fill password for security
        document.querySelectorAll('#userRoles input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = user.roles.includes(checkbox.value);
        });
        if (cancelEditUserBtn) cancelEditUserBtn.style.display = 'inline-block';
        currentEditingId.users = userId;
    } else {
        showNotification('Utente non trovato per la modifica.', 'error');
    }
}

/**
 * Deletes a user.
 * @param {number} userId The ID of the user to delete.
 */
function deleteUser(userId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare gli utenti.', 'error');
        return;
    }
    if (currentUser && currentUser.id === userId) {
        showMessageBox('Errore', 'Non puoi eliminare l\'utente attualmente loggato.', 'alert');
        return;
    }

    showMessageBox('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo utente?', 'confirm', () => {
        appData.users = appData.users.filter(u => u.id !== userId);
        saveData();
        updateUsersTable();
        showNotification('Utente eliminato con successo!', 'success');
        resetUserForm();
    });
}

/**
 * Resets a user's password and forces a change on next login.
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
            'confirm',
            () => {
                const newPassword = Math.random().toString(36).substring(2, 10); // Generate a simple temporary password
                user.password = newPassword; // For simulation, update directly
                user.forcePasswordChange = true;
                saveData();
                updateUsersTable(); // Refresh table to show forcePasswordChange flag updated
                showNotification(`Password per ${user.username} resettata a "${newPassword}". L'utente dovrà cambiarla al prossimo accesso.`, 'warning');
            }
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
            'confirm',
            () => {
                user.forcePasswordChange = true;
                saveData();
                updateUsersTable(); // Refresh table to show forcePasswordChange flag updated
                showNotification(`Cambio password forzato impostato per ${user.username}.`, 'info');
            }
        );
    } else {
        showNotification('Utente non trovato per l\'impostazione del cambio password forzato.', 'error');
    }
}

/**
 * Updates the users table display.
 */
function updateUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nessun utente registrato.</td></tr>';
        return;
    }

    appData.users.forEach(user => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = user.username;
        row.insertCell().textContent = user.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ');
        row.insertCell().textContent = user.forcePasswordChange ? 'Sì' : 'No';

        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        editBtn.textContent = 'Modifica';
        editBtn.onclick = () => editUser(user.id);
        actionsCell.appendChild(editBtn);

        const resetPasswordBtn = document.createElement('button');
        resetPasswordBtn.classList.add('btn', 'btn-sm', 'btn-warning');
        resetPasswordBtn.textContent = 'Reset Password';
        resetPasswordBtn.onclick = () => resetUserPassword(user.id);
        actionsCell.appendChild(resetPasswordBtn);

        const forceChangeBtn = document.createElement('button');
        forceChangeBtn.classList.add('btn', 'btn-sm', 'btn-info');
        forceChangeBtn.textContent = 'Forza Cambio';
        forceChangeBtn.onclick = () => forcePasswordChangeOnNextLogin(user.id);
        actionsCell.appendChild(forceChangeBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteUser(user.id);
        actionsCell.appendChild(deleteBtn);
    });
}


// --- Funzioni per la Gestione delle Fasi ---

/**
 * Resets the phase form.
 */
function resetPhaseForm() {
    const phaseNameInput = document.getElementById('phaseNameInput');
    const phaseDepartmentSelect = document.getElementById('phaseDepartmentSelect');
    const phaseDurationInput = document.getElementById('phaseDurationInput');
    const cancelEditPhaseBtn = document.getElementById('cancelEditPhaseBtn');

    if (phaseNameInput) phaseNameInput.value = '';
    if (phaseDepartmentSelect) phaseDepartmentSelect.value = '';
    if (phaseDurationInput) phaseDurationInput.value = '';
    if (cancelEditPhaseBtn) cancelEditPhaseBtn.style.display = 'none';
    currentEditingId.phases = null;
}

/**
 * Saves a new phase or updates an existing one.
 */
function savePhase() {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per gestire le fasi.', 'error');
        return;
    }

    const phaseNameInput = document.getElementById('phaseNameInput');
    const phaseDepartmentSelect = document.getElementById('phaseDepartmentSelect');
    const phaseDurationInput = document.getElementById('phaseDurationInput');

    if (!phaseNameInput || !phaseDepartmentSelect || !phaseDurationInput) {
        showNotification('Errore: Campi fase non trovati.', 'error');
        return;
    }

    const name = phaseNameInput.value;
    const departmentId = phaseDepartmentSelect.value;
    const duration = parseFloat(phaseDurationInput.value);

    if (!name || !departmentId || isNaN(duration) || duration <= 0) {
        showNotification('Per favor, compila tutti i campi correttamente per la fase.', 'error');
        return;
    }

    const department = appData.departments.find(d => d.id === parseInt(departmentId));
    if (!department) {
        showNotification('Reparto selezionato non valido.', 'error');
        return;
    }

    if (currentEditingId.phases) {
        // Editing existing phase
        const phaseIndex = appData.phases.findIndex(p => p.id === currentEditingId.phases);
        if (phaseIndex !== -1) {
            appData.phases[phaseIndex] = {
                id: currentEditingId.phases,
                name: name,
                departmentId: parseInt(departmentId),
                departmentName: department.name, // Store department name for easier display
                duration: duration
            };
            showNotification('Fase aggiornata con successo!', 'success');
        } else {
            showNotification('Errore: Fase non trovata per l\'aggiornamento.', 'error');
        }
    } else {
        // Adding new phase
        if (appData.phases.some(p => normalizeString(p.name) === normalizeString(name))) {
            showNotification('Errore: Esiste già una fase con questo nome.', 'error');
            return;
        }
        const newPhase = {
            id: generateId(),
            name: name,
            departmentId: parseInt(departmentId),
            departmentName: department.name,
            duration: duration
        };
        appData.phases.push(newPhase);
        showNotification('Nuova fase aggiunta con successo!', 'success');
    }
    saveData();
    updatePhasesTable();
    resetPhaseForm();
    updateDashboardSummary(); // Update dashboard after phase changes
}

/**
 * Populates the phase form for editing.
 * @param {number} phaseId The ID of the phase to edit.
 */
function editPhase(phaseId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per modificare le fasi.', 'error');
        return;
    }
    const phase = appData.phases.find(p => p.id === phaseId);
    if (phase) {
        const phaseNameInput = document.getElementById('phaseNameInput');
        const phaseDepartmentSelect = document.getElementById('phaseDepartmentSelect');
        const phaseDurationInput = document.getElementById('phaseDurationInput');
        const cancelEditPhaseBtn = document.getElementById('cancelEditPhaseBtn');

        if (phaseNameInput) phaseNameInput.value = phase.name;
        if (phaseDepartmentSelect) phaseDepartmentSelect.value = phase.departmentId;
        if (phaseDurationInput) phaseDurationInput.value = phase.duration;
        if (cancelEditPhaseBtn) cancelEditPhaseBtn.style.display = 'inline-block';
        currentEditingId.phases = phaseId;
    } else {
        showNotification('Fase non trovata per la modifica.', 'error');
    }
}

/**
 * Deletes a phase.
 * @param {number} phaseId The ID of the phase to delete.
 */
function deletePhase(phaseId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per eliminare le fasi.', 'error');
        return;
    }
    // Check if any article uses this phase in its cycle
    const isPhaseUsed = appData.articles.some(article =>
        article.cycle.some(step => step.phaseId === phaseId)
    );

    if (isPhaseUsed) {
        showMessageBox('Errore', 'Impossibile eliminare la fase: è utilizzata in almeno un ciclo di lavorazione di un articolo.', 'alert');
        return;
    }

    showMessageBox('Conferma Eliminazione', 'Sei sicuro di voler eliminare questa fase?', 'confirm', () => {
        appData.phases = appData.phases.filter(p => p.id !== phaseId);
        saveData();
        updatePhasesTable();
        resetPhaseForm();
        updateDashboardSummary(); // Update dashboard after phase changes
        showNotification('Fase eliminata con successo!', 'success');
    });
}

/**
 * Updates the phases table display.
 */
function updatePhasesTable() {
    const tableBody = document.getElementById('phasesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.phases.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nessuna fase registrata.</td></tr>';
        return;
    }

    appData.phases.forEach(phase => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = phase.name;
        row.insertCell().textContent = phase.departmentName;
        row.insertCell().textContent = phase.duration;

        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        editBtn.textContent = 'Modifica';
        editBtn.onclick = () => editPhase(phase.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deletePhase(phase.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Populates the department select dropdowns for phases and machines.
 */
function populateDepartmentSelects() {
    const phaseDepartmentSelect = document.getElementById('phaseDepartmentSelect');
    const machineDepartmentSelect = document.getElementById('machineDepartmentSelect');

    // Clear existing options, keep the default "Select a department"
    if (phaseDepartmentSelect) {
        phaseDepartmentSelect.innerHTML = '<option value="">Seleziona un reparto</option>';
        appData.departments.forEach(dept => {
            const option1 = document.createElement('option');
            option1.value = dept.id;
            option1.textContent = dept.name;
            phaseDepartmentSelect.appendChild(option1);
        });
    }

    if (machineDepartmentSelect) {
        machineDepartmentSelect.innerHTML = '<option value="">Seleziona un reparto</option>';
        appData.departments.forEach(dept => {
            const option2 = document.createElement('option');
            option2.value = dept.id;
            option2.textContent = dept.name;
            machineDepartmentSelect.appendChild(option2);
        });
    }
}


// --- Funzioni per la Gestione dei Macchinari ---

/**
 * Resets the machine form.
 */
function resetMachineForm() {
    const machineNameInput = document.getElementById('machineNameInput');
    const machineDepartmentSelect = document.getElementById('machineDepartmentSelect');
    const machineCapacityInput = document.getElementById('machineCapacityInput');
    const cancelEditMachineBtn = document.getElementById('cancelEditMachineBtn');

    if (machineNameInput) machineNameInput.value = '';
    if (machineDepartmentSelect) machineDepartmentSelect.value = '';
    if (machineCapacityInput) machineCapacityInput.value = '';
    if (cancelEditMachineBtn) cancelEditMachineBtn.style.display = 'none';
    currentEditingId.machines = null;
}

/**
 * Saves a new machine or updates an existing one.
 */
function saveMachine() {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per gestire i macchinari.', 'error');
        return;
    }

    const machineNameInput = document.getElementById('machineNameInput');
    const machineDepartmentSelect = document.getElementById('machineDepartmentSelect');
    const machineCapacityInput = document.getElementById('machineCapacityInput');

    if (!machineNameInput || !machineDepartmentSelect || !machineCapacityInput) {
        showNotification('Errore: Campi macchinario non trovati.', 'error');
        return;
    }

    const name = machineNameInput.value;
    const departmentId = machineDepartmentSelect.value;
    const capacity = parseFloat(machineCapacityInput.value);

    if (!name || !departmentId || isNaN(capacity) || capacity <= 0) {
        showNotification('Per favore, compila tutti i campi correttamente per il macchinario.', 'error');
        return;
    }

    const department = appData.departments.find(d => d.id === parseInt(departmentId));
    if (!department) {
        showNotification('Reparto selezionato non valido.', 'error');
        return;
    }

    if (currentEditingId.machines) {
        // Editing existing machine
        const machineIndex = appData.machines.findIndex(m => m.id === currentEditingId.machines);
        if (machineIndex !== -1) {
            appData.machines[machineIndex] = {
                id: currentEditingId.machines,
                name: name,
                departmentId: parseInt(departmentId),
                departmentName: department.name, // Store department name for easier display
                capacity: capacity
            };
            showNotification('Macchinario aggiornato con successo!', 'success');
        } else {
            showNotification('Errore: Macchinario non trovato per l\'aggiornamento.', 'error');
        }
    } else {
        // Adding new machine
        if (appData.machines.some(m => normalizeString(m.name) === normalizeString(name))) {
            showNotification('Errore: Esiste già un macchinario con questo nome.', 'error');
            return;
        }
        const newMachine = {
            id: generateId(),
            name: name,
            departmentId: parseInt(departmentId),
            departmentName: department.name,
            capacity: capacity
        };
        appData.machines.push(newMachine);
        showNotification('Nuovo macchinario aggiunto con successo!', 'success');
    }
    saveData();
    updateMachinesTable();
    resetMachineForm();
    updateDashboardSummary(); // Update dashboard after machine changes
}

/**
 * Populates the machine form for editing.
 * @param {number} machineId The ID of the machine to edit.
 */
function editMachine(machineId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per modificare i macchinari.', 'error');
        return;
    }
    const machine = appData.machines.find(m => m.id === machineId);
    if (machine) {
        const machineNameInput = document.getElementById('machineNameInput');
        const machineDepartmentSelect = document.getElementById('machineDepartmentSelect');
        const machineCapacityInput = document.getElementById('machineCapacityInput');
        const cancelEditMachineBtn = document.getElementById('cancelEditMachineBtn');

        if (machineNameInput) machineNameInput.value = machine.name;
        if (machineDepartmentSelect) machineDepartmentSelect.value = machine.departmentId;
        if (machineCapacityInput) machineCapacityInput.value = machine.capacity;
        if (cancelEditMachineBtn) cancelEditMachineBtn.style.display = 'inline-block';
        currentEditingId.machines = machineId;
    } else {
        showNotification('Macchinario non trovato per la modifica.', 'error');
    }
}

/**
 * Deletes a machine.
 * @param {number} machineId The ID of the machine to delete.
 */
function deleteMachine(machineId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per eliminare i macchinari.', 'error');
        return;
    }
    showMessageBox('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo macchinario?', 'confirm', () => {
        appData.machines = appData.machines.filter(m => m.id !== machineId);
        saveData();
        updateMachinesTable();
        resetMachineForm();
        updateDashboardSummary(); // Update dashboard after machine changes
        showNotification('Macchinario eliminato con successo!', 'success');
    });
}

/**
 * Updates the machines table display.
 */
function updateMachinesTable() {
    const tableBody = document.getElementById('machinesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.machines.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nessun macchinario registrato.</td></tr>';
        return;
    }

    appData.machines.forEach(machine => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = machine.name;
        row.insertCell().textContent = machine.departmentName;
        row.insertCell().textContent = machine.capacity;

        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        editBtn.textContent = 'Modifica';
        editBtn.onclick = () => editMachine(machine.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteMachine(machine.id);
        actionsCell.appendChild(deleteBtn);
    });
}


// --- Funzioni per la Gestione dei Reparti ---

/**
 * Resets the department form.
 */
function resetDepartmentForm() {
    const departmentNameInput = document.getElementById('departmentNameInput');
    const departmentDescriptionInput = document.getElementById('departmentDescriptionInput');
    const cancelEditDepartmentBtn = document.getElementById('cancelEditDepartmentBtn');

    if (departmentNameInput) departmentNameInput.value = '';
    if (departmentDescriptionInput) departmentDescriptionInput.value = '';
    if (cancelEditDepartmentBtn) cancelEditDepartmentBtn.style.display = 'none';
    currentEditingId.departments = null;
}

/**
 * Saves a new department or updates an existing one.
 */
function saveDepartment() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per gestire i reparti.', 'error');
        return;
    }

    const departmentNameInput = document.getElementById('departmentNameInput');
    const departmentDescriptionInput = document.getElementById('departmentDescriptionInput');

    if (!departmentNameInput || !departmentDescriptionInput) {
        showNotification('Errore: Campi reparto non trovati.', 'error');
        return;
    }

    const name = departmentNameInput.value;
    const description = departmentDescriptionInput.value;

    if (!name) {
        showNotification('Il nome del reparto è obbligatorio.', 'error');
        return;
    }

    if (currentEditingId.departments) {
        // Editing existing department
        const deptIndex = appData.departments.findIndex(d => d.id === currentEditingId.departments);
        if (deptIndex !== -1) {
            appData.departments[deptIndex] = {
                id: currentEditingId.departments,
                name: name,
                description: description
            };
            showNotification('Reparto aggiornato con successo!', 'success');
        } else {
            showNotification('Errore: Reparto non trovato per l\'aggiornamento.', 'error');
        }
    } else {
        // Adding new department
        if (appData.departments.some(d => normalizeString(d.name) === normalizeString(name))) {
            showNotification('Errore: Esiste già un reparto con questo nome.', 'error');
            return;
        }
        const newDepartment = {
            id: generateId(),
            name: name,
            description: description
        };
        appData.departments.push(newDepartment);
        showNotification('Nuovo reparto aggiunto con successo!', 'success');
    }
    saveData();
    updateDepartmentsTable();
    populateDepartmentSelects(); // Update selects for phases/machines
    resetDepartmentForm();
    updateDashboardSummary(); // Update dashboard after department changes
}

/**
 * Populates the department form for editing.
 * @param {number} departmentId The ID of the department to edit.
 */
function editDepartment(departmentId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per modificare i reparti.', 'error');
        return;
    }
    const department = appData.departments.find(d => d.id === departmentId);
    if (department) {
        const departmentNameInput = document.getElementById('departmentNameInput');
        const departmentDescriptionInput = document.getElementById('departmentDescriptionInput');
        const cancelEditDepartmentBtn = document.getElementById('cancelEditDepartmentBtn');

        if (departmentNameInput) departmentNameInput.value = department.name;
        if (departmentDescriptionInput) departmentDescriptionInput.value = department.description;
        if (cancelEditDepartmentBtn) cancelEditDepartmentBtn.style.display = 'inline-block';
        currentEditingId.departments = departmentId;
    } else {
        showNotification('Reparto non trovato per la modifica.', 'error');
    }
}

/**
 * Deletes a department.
 * @param {number} departmentId The ID of the department to delete.
 */
function deleteDepartment(departmentId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare i reparti.', 'error');
        return;
    }
    // Check if any phases or machines are associated with this department
    const isDepartmentUsedInPhases = appData.phases.some(phase => phase.departmentId === departmentId);
    const isDepartmentUsedInMachines = appData.machines.some(machine => machine.departmentId === departmentId);

    if (isDepartmentUsedInPhases || isDepartmentUsedInMachines) {
        showMessageBox('Errore', 'Impossibile eliminare il reparto: è associato a fasi di lavorazione o macchinari.', 'alert');
        return;
    }

    showMessageBox('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo reparto?', 'confirm', () => {
        appData.departments = appData.departments.filter(d => d.id !== departmentId);
        saveData();
        updateDepartmentsTable();
        populateDepartmentSelects(); // Update selects for phases/machines
        resetDepartmentForm();
        updateDashboardSummary(); // Update dashboard after department changes
        showNotification('Reparto eliminato con successo!', 'success');
    });
}

/**
 * Updates the departments table display.
 */
function updateDepartmentsTable() {
    const tableBody = document.getElementById('departmentsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.departments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nessun reparto registrato.</td></tr>';
        return;
    }

    appData.departments.forEach(department => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = department.name;
        row.insertCell().textContent = department.description;

        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        editBtn.textContent = 'Modifica';
        editBtn.onclick = () => editDepartment(department.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteDepartment(department.id);
        actionsCell.appendChild(deleteBtn);
    });
}


// --- Funzioni per la Gestione delle Materie Prime ---

/**
 * Resets the raw material form.
 */
function resetRawMaterialForm() {
    const rawMaterialNameInput = document.getElementById('rawMaterialNameInput');
    const rawMaterialUnitInput = document.getElementById('rawMaterialUnitInput');
    const cancelEditRawMaterialBtn = document.getElementById('cancelEditRawMaterialBtn');

    if (rawMaterialNameInput) rawMaterialNameInput.value = '';
    if (rawMaterialUnitInput) rawMaterialUnitInput.value = '';
    if (cancelEditRawMaterialBtn) cancelEditRawMaterialBtn.style.display = 'none';
    currentEditingId.rawMaterials = null;
}

/**
 * Saves a new raw material or updates an existing one.
 */
function saveRawMaterial() {
    if (!hasRole(['admin', 'warehouse'])) {
        showNotification('Non hai i permessi per gestire le materie prime.', 'error');
        return;
    }

    const rawMaterialNameInput = document.getElementById('rawMaterialNameInput');
    const rawMaterialUnitInput = document.getElementById('rawMaterialUnitInput');

    if (!rawMaterialNameInput || !rawMaterialUnitInput) {
        showNotification('Errore: Campi materia prima non trovati.', 'error');
        return;
    }

    const name = rawMaterialNameInput.value;
    const unit = rawMaterialUnitInput.value;

    if (!name || !unit) {
        showNotification('Per favor, compila tutti i campi per la materia prima.', 'error');
        return;
    }

    if (currentEditingId.rawMaterials) {
        // Editing existing raw material
        const rmIndex = appData.rawMaterials.findIndex(rm => rm.id === currentEditingId.rawMaterials);
        if (rmIndex !== -1) {
            appData.rawMaterials[rmIndex] = {
                id: currentEditingId.rawMaterials,
                name: name,
                unit: unit,
                currentStock: appData.rawMaterials[rmIndex].currentStock // Keep current stock
            };
            showNotification('Materia prima aggiornata con successo!', 'success');
        } else {
            showNotification('Errore: Materia prima non trovata per l\'aggiornamento.', 'error');
        }
    } else {
        // Adding new raw material
        if (appData.rawMaterials.some(rm => normalizeString(rm.name) === normalizeString(name))) {
            showNotification('Errore: Esiste già una materia prima con questo nome.', 'error');
            return;
        }
        const newRawMaterial = {
            id: generateId(),
            name: name,
            unit: unit,
            currentStock: 0 // New raw materials start with 0 stock
        };
        appData.rawMaterials.push(newRawMaterial);
        showNotification('Nuova materia prima aggiunta con successo!', 'success');
    }
    saveData();
    updateRawMaterialsTable();
    populateRawMaterialSelects(); // Update selects for stock management and BOM
    resetRawMaterialForm();
    updateDashboardSummary(); // Update dashboard after raw material changes
}

/**
 * Populates the raw material form for editing.
 * @param {number} rawMaterialId The ID of the raw material to edit.
 */
function editRawMaterial(rawMaterialId) {
    if (!hasRole(['admin', 'warehouse'])) {
        showNotification('Non hai i permessi per modificare le materie prime.', 'error');
        return;
    }
    const rawMaterial = appData.rawMaterials.find(rm => rm.id === rawMaterialId);
    if (rawMaterial) {
        const rawMaterialNameInput = document.getElementById('rawMaterialNameInput');
        const rawMaterialUnitInput = document.getElementById('rawMaterialUnitInput');
        const cancelEditRawMaterialBtn = document.getElementById('cancelEditRawMaterialBtn');

        if (rawMaterialNameInput) rawMaterialNameInput.value = rawMaterial.name;
        if (rawMaterialUnitInput) rawMaterialUnitInput.value = rawMaterial.unit;
        if (cancelEditRawMaterialBtn) cancelEditRawMaterialBtn.style.display = 'inline-block';
        currentEditingId.rawMaterials = rawMaterialId;
    } else {
        showNotification('Materia prima non trovata per la modifica.', 'error');
    }
}

/**
 * Deletes a raw material.
 * @param {number} rawMaterialId The ID of the raw material to delete.
 */
function deleteRawMaterial(rawMaterialId) {
    if (!hasRole(['admin', 'warehouse'])) {
        showNotification('Non hai i permessi per eliminare le materie prime.', 'error');
        return;
    }
    // Check if any article uses this raw material in its BOM
    const isRawMaterialUsed = appData.articles.some(article =>
        article.bom.some(item => item.rawMaterialId === rawMaterialId)
    );

    if (isRawMaterialUsed) {
        showMessageBox('Errore', 'Impossibile eliminare la materia prima: è utilizzata in almeno una distinta base di un articolo.', 'alert');
        return;
    }

    showMessageBox('Conferma Eliminazione', 'Sei sicuro di voler eliminare questa materia prima?', 'confirm', () => {
        appData.rawMaterials = appData.rawMaterials.filter(rm => rm.id !== rawMaterialId);
        // Also remove related warehouse journal entries
        appData.warehouseJournal = appData.warehouseJournal.filter(entry => entry.rawMaterialId !== rawMaterialId);
        saveData();
        updateRawMaterialsTable();
        updateWarehouseJournalTable();
        populateRawMaterialSelects(); // Update selects for stock management and BOM
        resetRawMaterialForm();
        updateDashboardSummary(); // Update dashboard after raw material changes
        showNotification('Materia prima eliminata con successo!', 'success');
    });
}

/**
 * Adds a stock movement (entry or exit) for a raw material.
 */
function addStockMovement() {
    if (!hasRole(['admin', 'warehouse'])) {
        showNotification('Non hai i permessi per registrare movimenti di magazzino.', 'error');
        return;
    }

    const stockRawMaterialSelect = document.getElementById('stockRawMaterialSelect');
    const stockQuantityInput = document.getElementById('stockQuantityInput');
    const stockTypeSelect = document.getElementById('stockTypeSelect');

    if (!stockRawMaterialSelect || !stockQuantityInput || !stockTypeSelect) {
        showNotification('Errore: Campi movimento stock non trovati.', 'error');
        return;
    }

    const rawMaterialId = parseInt(stockRawMaterialSelect.value);
    const quantity = parseFloat(stockQuantityInput.value);
    const type = stockTypeSelect.value;

    if (!rawMaterialId || isNaN(quantity) || quantity <= 0) {
        showNotification('Per favore, seleziona una materia prima e inserisci una quantità valida.', 'error');
        return;
    }

    const rawMaterial = appData.rawMaterials.find(rm => rm.id === rawMaterialId);
    if (!rawMaterial) {
        showNotification('Materia prima selezionata non valida.', 'error');
        return;
    }

    let actualQuantityChange = quantity;
    if (type === 'exit') {
        if (rawMaterial.currentStock < quantity) {
            showNotification(`Stock insufficiente per ${rawMaterial.name}. Disponibile: ${rawMaterial.currentStock} ${rawMaterial.unit}.`, 'error');
            return;
        }
        actualQuantityChange = -quantity;
    }

    rawMaterial.currentStock += actualQuantityChange;

    const journalEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        rawMaterialId: rawMaterial.id,
        rawMaterialName: rawMaterial.name,
        type: type,
        quantity: quantity,
        unit: rawMaterial.unit,
        notes: `Movimento manuale: ${type === 'entry' ? 'Entrata' : 'Uscita'} di ${quantity} ${rawMaterial.unit}`
    };
    appData.warehouseJournal.unshift(journalEntry); // Add to the beginning

    saveData();
    updateRawMaterialsTable();
    updateWarehouseJournalTable();
    updateDashboardSummary(); // Update dashboard after stock changes
    showNotification(`Movimento di stock registrato per ${rawMaterial.name}.`, 'success');

    // Reset stock movement form
    stockRawMaterialSelect.value = '';
    stockQuantityInput.value = '';
    stockTypeSelect.value = 'entry';
}

/**
 * Updates the raw materials table display (current stock).
 */
function updateRawMaterialsTable() {
    const tableBody = document.getElementById('rawMaterialsStockTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.rawMaterials.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nessuna materia prima in stock.</td></tr>';
        return;
    }

    appData.rawMaterials.forEach(rm => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = rm.name;
        row.insertCell().textContent = rm.currentStock;
        row.insertCell().textContent = rm.unit;
        // Find last movement date
        const lastMovement = appData.warehouseJournal
            .filter(entry => entry.rawMaterialId === rm.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        row.insertCell().textContent = lastMovement ? new Date(lastMovement.timestamp).toLocaleString() : 'N/A';

        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        editBtn.textContent = 'Modifica';
        editBtn.onclick = () => editRawMaterial(rm.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteRawMaterial(rm.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Updates the warehouse journal table display.
 */
function updateWarehouseJournalTable() {
    const tableBody = document.getElementById('warehouseJournalTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.warehouseJournal.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nessun movimento registrato.</td></tr>';
        return;
    }

    // Sort journal by timestamp descending
    const sortedJournal = [...appData.warehouseJournal].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedJournal.forEach(entry => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = entry.id; // Display ID for tracking
        row.insertCell().textContent = new Date(entry.timestamp).toLocaleString();
        row.insertCell().textContent = entry.rawMaterialName;
        row.insertCell().textContent = entry.type === 'entry' ? 'Entrata' : 'Uscita';
        row.insertCell().textContent = `${entry.quantity} ${entry.unit}`;
        row.insertCell().textContent = entry.notes || '-';

        const actionsCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteJournalEntry(entry.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Deletes a journal entry and reverses its effect on stock.
 * @param {number} entryId The ID of the journal entry to delete.
 */
function deleteJournalEntry(entryId) {
    if (!hasRole(['admin', 'warehouse'])) {
        showNotification('Non hai i permessi per eliminare movimenti di magazzino.', 'error');
        return;
    }

    const entryIndex = appData.warehouseJournal.findIndex(e => e.id === entryId);
    if (entryIndex === -1) {
        showNotification('Movimento di magazzino non trovato.', 'error');
        return;
    }

    const entryToDelete = appData.warehouseJournal[entryIndex];
    const rawMaterial = appData.rawMaterials.find(rm => rm.id === entryToDelete.rawMaterialId);

    if (!rawMaterial) {
        showNotification('Materia prima associata al movimento non trovata. Impossibile annullare lo stock.', 'error');
        return;
    }

    showMessageBox('Conferma Eliminazione Movimento', `Sei sicuro di voler eliminare questo movimento di magazzino? Lo stock di ${rawMaterial.name} verrà ripristinato.`, 'confirm', () => {
        // Reverse the stock change
        if (entryToDelete.type === 'entry') {
            rawMaterial.currentStock -= entryToDelete.quantity;
            if (rawMaterial.currentStock < 0) rawMaterial.currentStock = 0; // Prevent negative stock
        } else { // type === 'exit'
            rawMaterial.currentStock += entryToDelete.quantity;
        }

        appData.warehouseJournal.splice(entryIndex, 1); // Remove the entry

        saveData();
        updateRawMaterialsTable();
        updateWarehouseJournalTable();
        updateDashboardSummary();
        showNotification('Movimento di magazzino eliminato e stock ripristinato.', 'success');
    });
}

/**
 * Populates the raw material select dropdowns for stock management and BOM.
 */
function populateRawMaterialSelects() {
    const stockRawMaterialSelect = document.getElementById('stockRawMaterialSelect');
    // Clear existing options, keep the default "Select raw material"
    if (stockRawMaterialSelect) {
        stockRawMaterialSelect.innerHTML = '<option value="">Seleziona materia prima</option>';
        appData.rawMaterials.forEach(rm => {
            const option = document.createElement('option');
            option.value = rm.id;
            option.textContent = rm.name;
            stockRawMaterialSelect.appendChild(option);
        });
    }
}

/**
 * Populates the raw material select dropdowns for BOM items in article creation/editing.
 */
function populateRawMaterialSelectsForBom() {
    // This function is called dynamically for each new BOM item row
    // It will be handled by the addBomItem and populateBomItemRow functions
}


// --- Funzioni per la Gestione degli Articoli ---

/**
 * Resets the article form.
 */
function resetArticleForm() {
    const articleNameInput = document.getElementById('articleNameInput');
    const articleDescriptionInput = document.getElementById('articleDescriptionInput');
    const cycleStepsContainer = document.getElementById('cycleStepsContainer');
    const bomItemsContainer = document.getElementById('bomItemsContainer');
    const cancelEditArticleBtn = document.getElementById('cancelEditArticleBtn');

    if (articleNameInput) articleNameInput.value = '';
    if (articleDescriptionInput) articleDescriptionInput.value = '';

    if (cycleStepsContainer) {
        cycleStepsContainer.innerHTML = ''; // Clear existing
        addCycleStep(); // Always add at least one empty step for new articles
    }

    if (bomItemsContainer) {
        bomItemsContainer.innerHTML = ''; // Clear existing
        addBomItem(); // Always add at least one empty item for new articles
    }

    if (cancelEditArticleBtn) cancelEditArticleBtn.style.display = 'none';
    currentEditingId.articles = null;
}

/**
 * Adds a new cycle step input row to the article form.
 */
function addCycleStep(phaseId = '', duration = '') {
    const container = document.getElementById('cycleStepsContainer');
    if (!container) return; // Exit if container not found

    // Remove placeholder if present
    const placeholder = container.querySelector('p');
    if (placeholder && container.children.length === 1) { // Only remove if it's the only child
        container.innerHTML = '';
    }

    const stepDiv = document.createElement('div');
    stepDiv.classList.add('cycle-step');
    stepDiv.innerHTML = `
        <div class="form-group-inline">
            <label>Fase:</label>
            <select class="phase-select" aria-label="Seleziona Fase"></select>
        </div>
        <div class="form-group-inline">
            <label>Durata (ore/unità):</label>
            <input type="number" class="step-duration-input" placeholder="Durata" min="0" step="0.1" aria-label="Durata Fase">
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeCycleStep(this)">Rimuovi</button>
    `;
    container.appendChild(stepDiv);

    // Populate phase select for the new row
    const phaseSelect = stepDiv.querySelector('.phase-select');
    if (phaseSelect) { // Ensure select element exists before populating
        populatePhaseSelects(phaseSelect, phaseId);
    }

    // Set duration if provided (for editing)
    if (duration !== '') {
        const durationInput = stepDiv.querySelector('.step-duration-input');
        if (durationInput) {
            durationInput.value = duration;
        }
    }
}

/**
 * Populates a single phase select dropdown.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {number} selectedPhaseId The ID of the phase to pre-select.
 */
function populatePhaseSelects(selectElement, selectedPhaseId = null) {
    if (!selectElement) {
        console.error("populatePhaseSelects: selectElement is null or undefined.");
        return;
    }
    selectElement.innerHTML = '<option value="">Seleziona fase</option>';
    appData.phases.forEach(phase => {
        const option = document.createElement('option');
        option.value = phase.id;
        option.textContent = `${phase.name} (${phase.departmentName}, ${phase.duration} ore/unità)`;
        if (selectedPhaseId && phase.id === selectedPhaseId) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

/**
 * Removes a cycle step input row.
 * @param {HTMLButtonElement} button The remove button clicked.
 */
function removeCycleStep(button) {
    const stepDiv = button.closest('.cycle-step');
    if (stepDiv) stepDiv.remove();
    const container = document.getElementById('cycleStepsContainer');
    if (container && container.children.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888;">Aggiungi fasi al ciclo di lavorazione.</p>';
    }
}

/**
 * Adds a new BOM item input row to the article form.
 */
function addBomItem(rawMaterialId = '', quantity = '') {
    const container = document.getElementById('bomItemsContainer');
    if (!container) return; // Exit if container not found

    // Remove placeholder if present
    const placeholder = container.querySelector('p');
    if (placeholder && container.children.length === 1) { // Only remove if it's the only child
        container.innerHTML = '';
    }

    const itemDiv = document.createElement('div');
    itemDiv.classList.add('bom-item');
    itemDiv.innerHTML = `
        <div class="form-group-inline">
            <label>Materia Prima:</label>
            <select class="raw-material-select" aria-label="Seleziona Materia Prima"></select>
        </div>
        <div class="form-group-inline">
            <label>Quantità:</label>
            <input type="number" class="item-quantity-input" placeholder="Quantità" min="0" step="0.01" aria-label="Quantità Materia Prima">
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeBomItem(this)">Rimuovi</button>
    `;
    container.appendChild(itemDiv);

    // Populate raw material select for the new row
    const rawMaterialSelect = itemDiv.querySelector('.raw-material-select');
    if (rawMaterialSelect) { // Ensure select element exists before populating
        populateRawMaterialSelectsForBomItem(rawMaterialSelect, rawMaterialId);
    }

    // Set quantity if provided (for editing)
    if (quantity !== '') {
        const quantityInput = itemDiv.querySelector('.item-quantity-input');
        if (quantityInput) {
            quantityInput.value = quantity;
        }
    }
}

/**
 * Populates a single raw material select dropdown for BOM items.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {number} selectedRawMaterialId The ID of the raw material to pre-select.
 */
function populateRawMaterialSelectsForBomItem(selectElement, selectedRawMaterialId = null) {
    if (!selectElement) {
        console.error("populateRawMaterialSelectsForBomItem: selectElement is null or undefined.");
        return;
    }
    selectElement.innerHTML = '<option value="">Seleziona materia prima</option>';
    appData.rawMaterials.forEach(rm => {
        const option = document.createElement('option');
        option.value = rm.id;
        option.textContent = `${rm.name} (${rm.unit})`;
        if (selectedRawMaterialId && rm.id === selectedRawMaterialId) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

/**
 * Removes a BOM item input row.
 * @param {HTMLButtonElement} button The remove button clicked.
 */
function removeBomItem(button) {
    const itemDiv = button.closest('.bom-item');
    if (itemDiv) itemDiv.remove();
    const container = document.getElementById('bomItemsContainer');
    if (container && container.children.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888;">Aggiungi materie prime alla distinta base.</p>';
    }
}

/**
 * Saves a new article or updates an existing one.
 */
function saveArticle() {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per gestire gli articoli.', 'error');
        return;
    }

    const articleNameInput = document.getElementById('articleNameInput');
    const articleDescriptionInput = document.getElementById('articleDescriptionInput');

    if (!articleNameInput || !articleDescriptionInput) {
        showNotification('Errore: Campi articolo non trovati.', 'error');
        return;
    }

    const name = articleNameInput.value;
    const description = articleDescriptionInput.value;

    if (!name) {
        showNotification('Il nome dell\'articolo è obbligatorio.', 'error');
        return;
    }

    // Get cycle steps
    const cycleSteps = [];
    const cycleStepElements = document.querySelectorAll('#cycleStepsContainer .cycle-step');
    for (const stepEl of cycleStepElements) {
        const phaseSelect = stepEl.querySelector('.phase-select');
        const durationInput = stepEl.querySelector('.step-duration-input');

        if (!phaseSelect || !durationInput) {
            showNotification('Errore: Elementi fase del ciclo non trovati in una riga.', 'error');
            return;
        }

        const phaseId = parseInt(phaseSelect.value);
        const duration = parseFloat(durationInput.value);

        if (isNaN(phaseId) || isNaN(duration) || duration <= 0) {
            showNotification('Per favor, completa tutte le fasi del ciclo di lavorazione con valori validi.', 'error');
            return;
        }
        const phase = appData.phases.find(p => p.id === phaseId);
        if (!phase) {
            showNotification('Fase di lavorazione non valida selezionata.', 'error');
            return;
        }
        cycleSteps.push({
            phaseId: phaseId,
            phaseName: phase.name,
            departmentId: phase.departmentId,
            departmentName: phase.departmentName,
            duration: duration
        });
    }

    // Get BOM items
    const bomItems = [];
    const bomItemElements = document.querySelectorAll('#bomItemsContainer .bom-item');
    for (const itemEl of bomItemElements) {
        const rawMaterialSelect = itemEl.querySelector('.raw-material-select');
        const quantityInput = itemEl.querySelector('.item-quantity-input');

        if (!rawMaterialSelect || !quantityInput) {
            showNotification('Errore: Elementi materia prima della distinta base non trovati in una riga.', 'error');
            return;
        }

        const rawMaterialId = parseInt(rawMaterialSelect.value);
        const quantity = parseFloat(quantityInput.value);

        if (isNaN(rawMaterialId) || isNaN(quantity) || quantity <= 0) {
            showNotification('Per favor, completa tutte le materie prime della distinta base con valori validi.', 'error');
            return;
        }
        const rawMaterial = appData.rawMaterials.find(rm => rm.id === rawMaterialId);
        if (!rawMaterial) {
            showNotification('Materia prima non valida selezionata.', 'error');
            return;
        }
        bomItems.push({
            rawMaterialId: rawMaterialId,
            rawMaterialName: rawMaterial.name,
            unit: rawMaterial.unit,
            quantity: quantity
        });
    }

    if (currentEditingId.articles) {
        // Editing existing article
        const articleIndex = appData.articles.findIndex(a => a.id === currentEditingId.articles);
        if (articleIndex !== -1) {
            appData.articles[articleIndex] = {
                id: currentEditingId.articles,
                name: name,
                description: description,
                cycle: cycleSteps,
                bom: bomItems
            };
            showNotification('Articolo aggiornato con successo!', 'success');
        } else {
            showNotification('Errore: Articolo non trovato per l\'aggiornamento.', 'error');
        }
    } else {
        // Adding new article
        if (appData.articles.some(a => normalizeString(a.name) === normalizeString(name))) {
            showNotification('Errore: Esiste già un articolo con questo nome.', 'error');
            return;
        }
        const newArticle = {
            id: generateId(),
            name: name,
            description: description,
            cycle: cycleSteps,
            bom: bomItems
        };
        appData.articles.push(newArticle);
        showNotification('Nuovo articolo aggiunto con successo!', 'success');
    }
    saveData();
    updateArticlesTable();
    resetArticleForm();
    populatePlanningArticleSelect(); // Update planning select
    updateDashboardSummary(); // Update dashboard after article changes
}

/**
 * Populates the article form for editing.
 * @param {number} articleId The ID of the article to edit.
 */
function editArticle(articleId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per modificare gli articoli.', 'error');
        return;
    }
    const article = appData.articles.find(a => a.id === articleId);
    if (article) {
        const articleNameInput = document.getElementById('articleNameInput');
        const articleDescriptionInput = document.getElementById('articleDescriptionInput');
        const cycleStepsContainer = document.getElementById('cycleStepsContainer');
        const bomItemsContainer = document.getElementById('bomItemsContainer');
        const cancelEditArticleBtn = document.getElementById('cancelEditArticleBtn');

        if (articleNameInput) articleNameInput.value = article.name;
        if (articleDescriptionInput) articleDescriptionInput.value = article.description;

        // Populate cycle steps
        if (cycleStepsContainer) {
            cycleStepsContainer.innerHTML = ''; // Clear existing
            if (article.cycle.length === 0) {
                addCycleStep(); // Add an empty step if none exist
            } else {
                article.cycle.forEach(step => {
                    addCycleStep(step.phaseId, step.duration);
                });
            }
        }


        // Populate BOM items
        if (bomItemsContainer) {
            bomItemsContainer.innerHTML = ''; // Clear existing
            if (article.bom.length === 0) {
                addBomItem(); // Add an empty item if none exist
            } else {
                article.bom.forEach(item => {
                    addBomItem(item.rawMaterialId, item.quantity);
                });
            }
        }


        if (cancelEditArticleBtn) cancelEditArticleBtn.style.display = 'inline-block';
        currentEditingId.articles = articleId;
    } else {
        showNotification('Articolo non trovato per la modifica.', 'error');
    }
}

/**
 * Deletes an article.
 * @param {number} articleId The ID of the article to delete.
 */
function deleteArticle(articleId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per eliminare gli articoli.', 'error');
        return;
    }
    // Check if any production lot uses this article
    const isArticleUsed = appData.productionPlan.some(lot => lot.articleId === articleId);

    if (isArticleUsed) {
        showMessageBox('Errore', 'Impossibile eliminare l\'articolo: è utilizzato in almeno un lotto di produzione/campionatura.', 'alert');
        return;
    }

    showMessageBox('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo articolo?', 'confirm', () => {
        appData.articles = appData.articles.filter(a => a.id !== articleId);
        saveData();
        updateArticlesTable();
        resetArticleForm();
        populatePlanningArticleSelect(); // Update planning select
        updateDashboardSummary(); // Update dashboard after article changes
        showNotification('Articolo eliminato con successo!', 'success');
    });
}

/**
 * Updates the articles table display.
 */
function updateArticlesTable() {
    const tableBody = document.getElementById('articlesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.articles.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nessun articolo registrato.</td></tr>';
        return;
    }

    appData.articles.forEach(article => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = article.name;
        row.insertCell().textContent = article.description || 'N/A';

        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        editBtn.textContent = 'Modifica';
        editBtn.onclick = () => editArticle(article.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteArticle(article.id);
        actionsCell.appendChild(deleteBtn);
    });
}

/**
 * Populates the article select dropdown for planning.
 */
function populatePlanningArticleSelect() {
    const selectElement = document.getElementById('planningArticleSelect');
    if (selectElement) {
        selectElement.innerHTML = '<option value="">Seleziona un articolo</option>'; // Clear existing options

        appData.articles.forEach(article => {
            const option = document.createElement('option');
            option.value = article.id;
            option.textContent = article.name;
            selectElement.appendChild(option);
        });
    }

    const editPlanningArticleSelect = document.getElementById('editPlanningArticleSelect');
    if (editPlanningArticleSelect) { // Check if it exists (only in modal)
        editPlanningArticleSelect.innerHTML = ''; // Clear existing options
        appData.articles.forEach(article => {
            const option = document.createElement('option');
            option.value = article.id;
            option.textContent = article.name;
            editPlanningArticleSelect.appendChild(option);
        });
    }
}


// --- Funzioni per la Pianificazione della Produzione ---

/**
 * Resets the planning form and hides results.
 */
function resetPlanningForm() {
    const planningArticleSelect = document.getElementById('planningArticleSelect');
    const planningQuantityInput = document.getElementById('planningQuantityInput');
    const planningPrioritySelect = document.getElementById('planningPrioritySelect');
    const planningTypeSelect = document.getElementById('planningTypeSelect');
    const planningDeliveryDateInput = document.getElementById('planningDeliveryDateInput');
    const planningResult = document.getElementById('planningResult');
    const savePlanningBtn = document.getElementById('savePlanningBtn');
    const cancelPlanningBtn = document.getElementById('cancelPlanningBtn');


    if (planningArticleSelect) planningArticleSelect.value = '';
    if (planningQuantityInput) planningQuantityInput.value = '';
    if (planningPrioritySelect) planningPrioritySelect.value = 'low';
    if (planningTypeSelect) planningTypeSelect.value = 'production';
    if (planningDeliveryDateInput) planningDeliveryDateInput.value = '';
    if (planningResult) planningResult.style.display = 'none';
    if (savePlanningBtn) savePlanningBtn.style.display = 'none';
    if (cancelPlanningBtn) cancelPlanningBtn.style.display = 'none';
    currentCalculatedPlanningDetails = null;
}

/**
 * Calculates the production planning based on selected article, quantity, and delivery date.
 */
function calculatePlanning() {
    if (!hasRole('planner')) {
        showNotification('Non hai i permessi per calcolare la pianificazione.', 'error');
        return;
    }

    const planningArticleSelect = document.getElementById('planningArticleSelect');
    const planningQuantityInput = document.getElementById('planningQuantityInput');
    const planningPrioritySelect = document.getElementById('planningPrioritySelect');
    const planningTypeSelect = document.getElementById('planningTypeSelect');
    const planningDeliveryDateInput = document.getElementById('planningDeliveryDateInput');

    if (!planningArticleSelect || !planningQuantityInput || !planningPrioritySelect || !planningTypeSelect || !planningDeliveryDateInput) {
        showNotification('Errore: Campi pianificazione non trovati.', 'error');
        return;
    }

    const articleId = parseInt(planningArticleSelect.value);
    const quantity = parseInt(planningQuantityInput.value);
    const priority = planningPrioritySelect.value;
    const type = planningTypeSelect.value;
    const deliveryDateStr = planningDeliveryDateInput.value;

    if (!articleId || isNaN(quantity) || quantity <= 0 || !deliveryDateStr) {
        showNotification('Per favore, seleziona un articolo, inserisci una quantità valida e una data di consegna.', 'error');
        return;
    }

    const article = appData.articles.find(a => a.id === articleId);
    if (!article) {
        showNotification('Articolo selezionato non valido.', 'error');
        return;
    }

    const deliveryDate = new Date(deliveryDateStr);
    deliveryDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // 1. Calculate total hours needed per department for the given quantity
    const departmentWorkloadHours = {}; // { departmentId: totalHours }
    article.cycle.forEach(step => {
        const totalStepHours = step.duration * quantity;
        if (!departmentWorkloadHours[step.departmentId]) {
            departmentWorkloadHours[step.departmentId] = 0;
        }
        departmentWorkloadHours[step.departmentId] += totalStepHours;
    });

    // 2. Estimate required working days backwards from delivery date
    let requiredWorkingDays = 0;
    for (const deptId in departmentWorkloadHours) {
        const department = appData.departments.find(d => d.id === parseInt(deptId));
        if (!department) continue; // Should not happen if data is consistent

        // Assuming 8 working hours per day for simplicity for department capacity
        // In a real scenario, this would come from department's available capacity
        const dailyDepartmentCapacityHours = 8; // Example: 8 hours per day per department
        const daysForDepartment = departmentWorkloadHours[deptId] / dailyDepartmentCapacityHours;
        requiredWorkingDays = Math.max(requiredWorkingDays, Math.ceil(daysForDepartment));
    }

    // Add a buffer for inter-departmental transfers/queue times
    requiredWorkingDays += Math.ceil(article.cycle.length / 2); // Example: half a day buffer per phase

    // 3. Find the actual start date by counting back working days
    let startDate = new Date(deliveryDate);
    let daysCounted = 0;
    while (daysCounted < requiredWorkingDays) {
        startDate.setDate(startDate.getDate() - 1); // Go back one day
        if (isWorkingDay(startDate)) {
            daysCounted++;
        }
    }
    startDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // 4. Calculate total workload per department for display
    const workloadDetails = [];
    for (const deptId in departmentWorkloadHours) {
        const department = appData.departments.find(d => d.id === parseInt(deptId));
        const totalHours = departmentWorkloadHours[deptId];
        workloadDetails.push({
            departmentName: department ? department.name : 'Sconosciuto',
            totalHours: totalHours
        });
    }

    // 5. Calculate raw materials needed
    const materialsNeeded = [];
    article.bom.forEach(item => {
        const totalQuantity = item.quantity * quantity;
        materialsNeeded.push({
            rawMaterialId: item.rawMaterialId, // Include rawMaterialId for stock check
            rawMaterialName: item.rawMaterialName,
            totalQuantity: totalQuantity,
            unit: item.unit
        });
    });

    // Store calculated details globally for saving
    currentCalculatedPlanningDetails = {
        id: generateId(),
        articleId: article.id,
        articleName: article.name,
        quantity: quantity,
        priority: priority,
        type: type, // 'production' or 'sample'
        deliveryDate: deliveryDate.toISOString().split('T')[0],
        suggestedStartDate: startDate.toISOString().split('T')[0],
        suggestedEndDate: deliveryDate.toISOString().split('T')[0], // End date is delivery date
        totalWorkingDays: requiredWorkingDays,
        workloadDetails: workloadDetails,
        materialsNeeded: materialsNeeded,
        status: 'pending' // Initial status
    };

    // Display results
    const suggestedStartDateEl = document.getElementById('suggestedStartDate');
    const suggestedEndDateEl = document.getElementById('suggestedEndDate');
    const totalWorkingDaysEl = document.getElementById('totalWorkingDays');
    const workloadUl = document.getElementById('workloadDetails');
    const materialsUl = document.getElementById('materialsNeeded');
    const planningResult = document.getElementById('planningResult');
    const savePlanningBtn = document.getElementById('savePlanningBtn');
    const cancelPlanningBtn = document.getElementById('cancelPlanningBtn');


    if (suggestedStartDateEl) suggestedStartDateEl.textContent = new Date(currentCalculatedPlanningDetails.suggestedStartDate).toLocaleDateString('it-IT');
    if (suggestedEndDateEl) suggestedEndDateEl.textContent = new Date(currentCalculatedPlanningDetails.suggestedEndDate).toLocaleDateString('it-IT');
    if (totalWorkingDaysEl) totalWorkingDaysEl.textContent = currentCalculatedPlanningDetails.totalWorkingDays;

    if (workloadUl) {
        workloadUl.innerHTML = '';
        workloadDetails.forEach(detail => {
            const li = document.createElement('li');
            li.textContent = `${detail.departmentName}: ${detail.totalHours.toFixed(2)} ore`;
            workloadUl.appendChild(li);
        });
    }


    if (materialsUl) {
        materialsUl.innerHTML = '';
        materialsNeeded.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.rawMaterialName}: ${item.totalQuantity.toFixed(2)} ${item.unit}`;
            materialsUl.appendChild(li);

            // Check stock and add notification if insufficient
            const rawMaterialInStock = appData.rawMaterials.find(rm => rm.id === item.rawMaterialId);
            if (rawMaterialInStock && rawMaterialInStock.currentStock < item.totalQuantity) {
                addAppNotification(
                    `Stock insufficiente per ${item.rawMaterialName}. Necessari: ${item.totalQuantity} ${item.unit}, Disponibili: ${rawMaterialInStock.currentStock} ${rawMaterialInStock.unit}.`,
                    'warning'
                );
            }
        });
    }


    if (planningResult) planningResult.style.display = 'block';
    if (savePlanningBtn) savePlanningBtn.style.display = 'inline-block';
    if (cancelPlanningBtn) cancelPlanningBtn.style.display = 'inline-block';
    showNotification('Pianificazione calcolata con successo!', 'success');
}

/**
 * Saves the currently calculated planning lot to the production plan.
 */
function saveCalculatedPlanning() {
    if (!hasRole('planner')) {
        showNotification('Non hai i permessi per salvare la pianificazione.', 'error');
        return;
    }

    if (!currentCalculatedPlanningDetails) {
        showNotification('Nessuna pianificazione da salvare. Calcola prima una pianificazione.', 'error');
        return;
    }

    // Add to production plan
    appData.productionPlan.push(currentCalculatedPlanningDetails);
    saveData();
    updateProductionLotsTable();
    renderDeliveryCalendar(appData.currentDeliveryWeekStartDate); // Re-render calendars
    renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
    resetPlanningForm();
    updateDashboardSummary(); // Update dashboard after saving planning
    showNotification('Pianificazione salvata con successo!', 'success');
    addAppNotification(`Nuovo lotto di ${currentCalculatedPlanningDetails.type === 'production' ? 'produzione' : 'campionatura'} per ${currentCalculatedPlanningDetails.articleName} (ID: ${currentCalculatedPlanningDetails.id}) aggiunto.`, 'info', currentCalculatedPlanningDetails.id);
}

/**
 * Updates the production lots table display.
 */
function updateProductionLotsTable() {
    const tableBody = document.getElementById('productionLotsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.productionPlan.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Nessun lotto di produzione registrato.</td></tr>';
        return;
    }

    // Sort by delivery date, then priority (high to low)
    const sortedPlan = [...appData.productionPlan].sort((a, b) => {
        const dateA = new Date(a.deliveryDate);
        const dateB = new Date(b.deliveryDate);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority]; // High priority first
    });

    sortedPlan.forEach(lot => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = lot.id;
        row.insertCell().textContent = lot.articleName;
        row.insertCell().textContent = lot.quantity;
        row.insertCell().innerHTML = `<span class="priority-text priority-${lot.priority}">${lot.priority.charAt(0).toUpperCase() + lot.priority.slice(1)}</span>`;
        row.insertCell().textContent = lot.type === 'production' ? 'Produzione' : 'Campionatura';
        row.insertCell().textContent = new Date(lot.suggestedStartDate).toLocaleDateString('it-IT');
        row.insertCell().textContent = new Date(lot.suggestedEndDate).toLocaleDateString('it-IT');
        row.insertCell().textContent = lot.status.charAt(0).toUpperCase() + lot.status.slice(1);

        const actionsCell = row.insertCell();

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        editBtn.textContent = 'Modifica';
        editBtn.onclick = () => openEditPlanningLotModal(lot.id);
        actionsCell.appendChild(editBtn);

        // Complete button (only for pending lots)
        if (lot.status === 'pending') {
            const completeBtn = document.createElement('button');
            completeBtn.classList.add('btn', 'btn-sm', 'btn-success');
            completeBtn.textContent = 'Completa';
            completeBtn.onclick = () => completeProductionLot(lot.id);
            actionsCell.appendChild(completeBtn);

            // Consume Materials button (only for pending production lots)
            if (lot.type === 'production') {
                const consumeBtn = document.createElement('button');
                consumeBtn.classList.add('btn', 'btn-sm', 'btn-info');
                consumeBtn.textContent = 'Consuma MP';
                consumeBtn.onclick = () => openConfirmConsumptionModal(lot.id);
                actionsCell.appendChild(consumeBtn);
            }
        }

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteProductionLot(lot.id);
        actionsCell.appendChild(deleteBtn);
    });
    updateDashboardSummary(); // Ensure dashboard is updated after lot changes
}

/**
 * Marks a production lot as complete.
 * @param {number} lotId The ID of the lot to complete.
 */
function completeProductionLot(lotId) {
    if (!hasRole(['admin', 'production'])) {
        showNotification('Non hai i permessi per completare i lotti.', 'error');
        return;
    }

    const lot = appData.productionPlan.find(l => l.id === lotId);
    if (lot) {
        showMessageBox('Conferma Completamento', `Sei sicuro di voler segnare come completato il lotto ${lot.id} per l'articolo ${lot.articleName}?`, 'confirm', () => {
            lot.status = 'completed';
            saveData();
            updateProductionLotsTable();
            renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
            renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
            updateDashboardSummary();
            showNotification(`Lotto ${lot.id} completato con successo!`, 'success');
            addAppNotification(`Lotto ${lot.id} per ${lot.articleName} è stato completato.`, 'info', lot.id);
        });
    } else {
        showNotification('Lotto di produzione non trovato.', 'error');
    }
}

/**
 * Deletes a production lot.
 * @param {number} lotId The ID of the lot to delete.
 */
function deleteProductionLot(lotId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per eliminare i lotti.', 'error');
        return;
    }
    showMessageBox('Conferma Eliminazione Lotto', 'Sei sicuro di voler eliminare questo lotto di produzione/campionatura?', 'confirm', () => {
        appData.productionPlan = appData.productionPlan.filter(l => l.id !== lotId);
        saveData();
        updateProductionLotsTable();
        renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
        renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
        updateDashboardSummary();
        showNotification('Lotto eliminato con successo!', 'success');
    });
}

/**
 * Opens the modal to confirm raw material consumption for a production lot.
 * @param {number} lotId The ID of the production lot.
 */
function openConfirmConsumptionModal(lotId) {
    if (!hasRole(['admin', 'warehouse', 'production'])) {
        showNotification('Non hai i permessi per registrare il consumo di materie prime.', 'error');
        return;
    }

    const lot = appData.productionPlan.find(l => l.id === lotId);
    if (!lot) {
        showNotification('Lotto di produzione non trovato.', 'error');
        return;
    }

    currentModalJournalEntryId = lotId; // Store lot ID for consumption

    const consumptionLotIdDisplay = document.getElementById('consumptionLotIdDisplay');
    const materialsToConsumeList = document.getElementById('materialsToConsumeList');
    const confirmConsumptionModal = document.getElementById('confirmConsumptionModal');

    if (!consumptionLotIdDisplay || !materialsToConsumeList || !confirmConsumptionModal) {
        showNotification('Errore: Elementi modale consumo non trovati.', 'error');
        return;
    }

    consumptionLotIdDisplay.textContent = lot.id;
    materialsToConsumeList.innerHTML = '';

    if (lot.materialsNeeded && lot.materialsNeeded.length > 0) {
        lot.materialsNeeded.forEach(item => {
            const rawMaterialInStock = appData.rawMaterials.find(rm => rm.id === item.rawMaterialId);
            const currentStock = rawMaterialInStock ? rawMaterialInStock.currentStock : 0;
            const li = document.createElement('p');
            li.innerHTML = `<strong>${item.rawMaterialName}:</strong> ${item.totalQuantity} ${item.unit} (Disponibile: ${currentStock} ${item.unit})`;
            if (currentStock < item.totalQuantity) {
                li.style.color = 'var(--error-color)';
                li.style.fontWeight = 'bold';
            }
            materialsToConsumeList.appendChild(li);
        });
    } else {
        materialsToConsumeList.innerHTML = '<p>Nessuna materia prima richiesta per questo lotto.</p>';
    }

    confirmConsumptionModal.classList.add('show');
}

/**
 * Closes the raw material consumption confirmation modal.
 */
function closeConfirmConsumptionModal() {
    const confirmConsumptionModal = document.getElementById('confirmConsumptionModal');
    const consumptionNotes = document.getElementById('consumptionNotes');
    if (confirmConsumptionModal) confirmConsumptionModal.classList.remove('show');
    if (consumptionNotes) consumptionNotes.value = '';
    currentModalJournalEntryId = null;
}

/**
 * Confirms and registers the consumption of raw materials for a production lot.
 */
function confirmConsumption() {
    if (!hasRole(['admin', 'warehouse', 'production'])) {
        showNotification('Non hai i permessi per registrare il consumo di materie prime.', 'error');
        return;
    }

    const lotId = currentModalJournalEntryId;
    const lot = appData.productionPlan.find(l => l.id === lotId);
    const consumptionNotes = document.getElementById('consumptionNotes');

    if (!lot) {
        showNotification('Errore: Lotto di produzione non trovato per il consumo.', 'error');
        return;
    }
    if (!consumptionNotes) {
        showNotification('Errore: Campo note consumo non trovato.', 'error');
        return;
    }
    const notes = consumptionNotes.value;

    let allMaterialsAvailable = true;
    const consumptionEntries = [];

    lot.materialsNeeded.forEach(item => {
        const rawMaterialInStock = appData.rawMaterials.find(rm => rm.id === item.rawMaterialId);
        if (!rawMaterialInStock || rawMaterialInStock.currentStock < item.totalQuantity) {
            allMaterialsAvailable = false;
            addAppNotification(
                `Tentativo di consumo per lotto ${lot.id} fallito: stock insufficiente per ${item.rawMaterialName}.`,
                'error',
                lot.id
            );
        } else {
            consumptionEntries.push({
                rawMaterial: rawMaterialInStock,
                quantity: item.totalQuantity
            });
        }
    });

    if (!allMaterialsAvailable) {
        showNotification('Impossibile consumare le materie prime: stock insufficiente per uno o più articoli.', 'error');
        return;
    }

    // Proceed with consumption
    consumptionEntries.forEach(entry => {
        entry.rawMaterial.currentStock -= entry.quantity;
        const journalEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            rawMaterialId: entry.rawMaterial.id,
            rawMaterialName: entry.rawMaterial.name,
            type: 'exit',
            quantity: entry.quantity,
            unit: entry.rawMaterial.unit,
            notes: `Consumo per lotto di produzione ID: ${lot.id}. ${notes ? 'Note: ' + notes : ''}`
        };
        appData.warehouseJournal.unshift(journalEntry); // Add to the beginning
    });

    // Mark the lot as materials consumed (or add a separate flag if needed)
    // For now, let's just add a note to the lot's status or a new field
    if (!lot.consumptionStatus) {
        lot.consumptionStatus = [];
    }
    lot.consumptionStatus.push({
        timestamp: new Date().toISOString(),
        consumedBy: currentUser ? currentUser.username : 'Sistema',
        notes: notes || 'Consumo materie prime registrato.'
    });

    saveData();
    updateRawMaterialsTable();
    updateWarehouseJournalTable();
    updateProductionLotsTable(); // Refresh lot status if needed
    updateDashboardSummary();
    closeConfirmConsumptionModal();
    showNotification(`Consumo materie prime registrato per il lotto ${lot.id}.`, 'success');
    addAppNotification(`Consumo materie prime registrato per lotto ${lot.id} (${lot.articleName}).`, 'info', lot.id);
}

/**
 * Opens the modal to edit an existing planning lot.
 * @param {number} lotId The ID of the lot to edit.
 */
function openEditPlanningLotModal(lotId) {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per modificare i lotti di pianificazione.', 'error');
        return;
    }

    const lot = appData.productionPlan.find(l => l.id === lotId);
    if (!lot) {
        showNotification('Lotto di pianificazione non trovato.', 'error');
        return;
    }

    currentEditingId.planning = lotId;

    // Populate the modal form
    const editPlanningArticleSelect = document.getElementById('editPlanningArticleSelect');
    const editPlanningQuantityInput = document.getElementById('editPlanningQuantityInput');
    const editPlanningPrioritySelect = document.getElementById('editPlanningPrioritySelect');
    const editPlanningTypeSelect = document.getElementById('editPlanningTypeSelect');
    const editPlanningDeliveryDateInput = document.getElementById('editPlanningDeliveryDateInput');
    const editPlanningLotModal = document.getElementById('editPlanningLotModal');

    if (editPlanningArticleSelect) editPlanningArticleSelect.value = lot.articleId;
    if (editPlanningQuantityInput) editPlanningQuantityInput.value = lot.quantity;
    if (editPlanningPrioritySelect) editPlanningPrioritySelect.value = lot.priority;
    if (editPlanningTypeSelect) editPlanningTypeSelect.value = lot.type;
    if (editPlanningDeliveryDateInput) editPlanningDeliveryDateInput.value = lot.deliveryDate;
    if (editPlanningLotModal) editPlanningLotModal.classList.add('show');
}

/**
 * Saves the changes made to a planning lot from the modal.
 */
function saveEditedPlanningLot() {
    if (!hasRole(['admin', 'planner'])) {
        showNotification('Non hai i permessi per salvare le modifiche ai lotti di pianificazione.', 'error');
        return;
    }

    const lotId = currentEditingId.planning;
    const lotIndex = appData.productionPlan.findIndex(l => l.id === lotId);

    if (lotIndex === -1) {
        showNotification('Errore: Lotto di pianificazione non trovato per l\'aggiornamento.', 'error');
        return;
    }

    const editPlanningArticleSelect = document.getElementById('editPlanningArticleSelect');
    const editPlanningQuantityInput = document.getElementById('editPlanningQuantityInput');
    const editPlanningPrioritySelect = document.getElementById('editPlanningPrioritySelect');
    const editPlanningTypeSelect = document.getElementById('editPlanningTypeSelect');
    const editPlanningDeliveryDateInput = document.getElementById('editPlanningDeliveryDateInput');

    if (!editPlanningArticleSelect || !editPlanningQuantityInput || !editPlanningPrioritySelect || !editPlanningTypeSelect || !editPlanningDeliveryDateInput) {
        showNotification('Errore: Campi modale modifica pianificazione non trovati.', 'error');
        return;
    }

    const articleId = parseInt(editPlanningArticleSelect.value);
    const quantity = parseInt(editPlanningQuantityInput.value);
    const priority = editPlanningPrioritySelect.value;
    const type = editPlanningTypeSelect.value;
    const deliveryDateStr = editPlanningDeliveryDateInput.value;

    if (!articleId || isNaN(quantity) || quantity <= 0 || !deliveryDateStr) {
        showNotification('Per favore, compila tutti i campi correttamente nel modulo di modifica.', 'error');
        return;
    }

    const article = appData.articles.find(a => a.id === articleId);
    if (!article) {
        showNotification('Articolo selezionato non valido.', 'error');
        return;
    }

    // Update the lot properties
    const updatedLot = { ...appData.productionPlan[lotIndex] };
    updatedLot.articleId = articleId;
    updatedLot.articleName = article.name;
    updatedLot.quantity = quantity;
    updatedLot.priority = priority;
    updatedLot.type = type;
    updatedLot.deliveryDate = deliveryDateStr;

    // Recalculate suggested dates and workload based on new values
    const deliveryDate = new Date(deliveryDateStr);
    deliveryDate.setHours(0, 0, 0, 0);

    const departmentWorkloadHours = {};
    article.cycle.forEach(step => {
        const totalStepHours = step.duration * quantity;
        if (!departmentWorkloadHours[step.departmentId]) {
            departmentWorkloadHours[step.departmentId] = 0;
        }
        departmentWorkloadHours[step.departmentId] += totalStepHours;
    });

    let requiredWorkingDays = 0;
    for (const deptId in departmentWorkloadHours) {
        const dailyDepartmentCapacityHours = 8; // Assuming 8 hours per day
        const daysForDepartment = departmentWorkloadHours[deptId] / dailyDepartmentCapacityHours;
        requiredWorkingDays = Math.max(requiredWorkingDays, Math.ceil(daysForDepartment));
    }
    requiredWorkingDays += Math.ceil(article.cycle.length / 2); // Buffer

    let startDate = new Date(deliveryDate);
    let daysCounted = 0;
    while (daysCounted < requiredWorkingDays) {
        startDate.setDate(startDate.getDate() - 1);
        if (isWorkingDay(startDate)) {
            daysCounted++;
        }
    }
    startDate.setHours(0, 0, 0, 0);

    updatedLot.suggestedStartDate = startDate.toISOString().split('T')[0];
    updatedLot.suggestedEndDate = deliveryDate.toISOString().split('T')[0];
    updatedLot.totalWorkingDays = requiredWorkingDays;
    updatedLot.workloadDetails = Object.keys(departmentWorkloadHours).map(deptId => {
        const department = appData.departments.find(d => d.id === parseInt(deptId));
        return {
            departmentName: department ? department.name : 'Sconosciuto',
            totalHours: departmentWorkloadHours[deptId]
        };
    });

    // Recalculate materials needed
    updatedLot.materialsNeeded = article.bom.map(item => ({
        rawMaterialId: item.rawMaterialId, // Include rawMaterialId for stock check
        rawMaterialName: item.rawMaterialName,
        unit: item.unit,
        totalQuantity: item.quantity * quantity
    }));

    appData.productionPlan[lotIndex] = updatedLot;
    saveData();
    updateProductionLotsTable();
    renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
    renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
    updateDashboardSummary();
    closeEditPlanningLotModal();
    showNotification(`Lotto di pianificazione ${lotId} aggiornato con successo!`, 'success');
}

/**
 * Closes the edit planning lot modal.
 */
function closeEditPlanningLotModal() {
    const editPlanningLotModal = document.getElementById('editPlanningLotModal');
    if (editPlanningLotModal) editPlanningLotModal.classList.remove('show');
    currentEditingId.planning = null;
}


// --- Funzioni per il Calendario e Workload ---

/**
 * Checks if a given date is a working day (not weekend or holiday).
 * @param {Date} date The date to check.
 * @returns {boolean} True if it's a working day, false otherwise.
 */
function isWorkingDay(date) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false; // Weekend
    }
    const dateString = date.toISOString().split('T')[0];
    return !appData.holidays.some(holiday => holiday.date === dateString);
}

/**
 * Gets the start of the week (Monday) for a given date.
 * @param {Date} date The date.
 * @returns {Date} The Monday of the week.
 */
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday (0) to be last day of prev week
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Renders the delivery calendar for a given week.
 * @param {string} startDateString The ISO string of the start date of the week.
 */
function renderDeliveryCalendar(startDateString) {
    const calendarGrid = document.getElementById('deliveryCalendarGrid');
    if (!calendarGrid) return; // Exit if element not found
    calendarGrid.innerHTML = ''; // Clear existing days

    const startDate = new Date(startDateString);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // End of the week

    const currentDeliveryWeekDisplay = document.getElementById('currentDeliveryWeekDisplay');
    if (currentDeliveryWeekDisplay) {
        currentDeliveryWeekDisplay.textContent =
            `${startDate.toLocaleDateString('it-IT')} - ${endDate.toLocaleDateString('it-IT')}`;
    }


    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + i);
        const dayString = currentDay.toISOString().split('T')[0];

        const dayColumn = document.createElement('div');
        dayColumn.classList.add('day-column');
        if (!isWorkingDay(currentDay)) {
            dayColumn.classList.add('non-working-day');
        }

        const dayHeader = document.createElement('div');
        dayHeader.classList.add('day-header');
        dayHeader.textContent = `${currentDay.toLocaleDateString('it-IT', { weekday: 'short' })} ${currentDay.getDate()}`;
        if (!isWorkingDay(currentDay)) {
            dayHeader.classList.add('non-working-day');
        }
        dayColumn.appendChild(dayHeader);

        // Filter production lots due on this day
        const lotsDueToday = appData.productionPlan.filter(lot =>
            lot.suggestedEndDate === dayString && lot.status === 'pending'
        ).sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority]; // High priority first
        });

        if (lotsDueToday.length === 0) {
            const p = document.createElement('p');
            p.style.textAlign = 'center';
            p.style.color = 'var(--text-color-light)';
            p.style.fontSize = '0.8em';
            p.textContent = 'Nessun lotto';
            dayColumn.appendChild(p);
        } else {
            lotsDueToday.forEach(lot => {
                const lotDiv = document.createElement('div');
                lotDiv.classList.add('day-task');
                lotDiv.classList.add(`priority-${lot.priority}`);
                if (lot.type === 'sample') {
                    lotDiv.classList.add('plan-type-sample');
                }
                lotDiv.textContent = `${lot.articleName} (${lot.quantity}pz)`;
                lotDiv.title = `Lotto ID: ${lot.id}\nArticolo: ${lot.articleName}\nQuantità: ${lot.quantity}\nPriorità: ${lot.priority}\nTipo: ${lot.type === 'production' ? 'Produzione' : 'Campionatura'}\nInizio: ${new Date(lot.suggestedStartDate).toLocaleDateString('it-IT')}\nFine: ${new Date(lot.suggestedEndDate).toLocaleDateString('it-IT')}\nStato: ${lot.status}`;
                lotDiv.onclick = () => openEditPlanningLotModal(lot.id); // Allow editing from calendar
                dayColumn.appendChild(lotDiv);
            });
        }
        calendarGrid.appendChild(dayColumn);
    }
}

/**
 * Renders the workload calendar for a given week.
 * @param {string} startDateString The ISO string of the start date of the week.
 */
function renderWorkloadCalendar(startDateString) {
    const calendarGrid = document.getElementById('workloadCalendarGrid');
    if (!calendarGrid) return; // Exit if element not found
    calendarGrid.innerHTML = ''; // Clear existing days

    const startDate = new Date(startDateString);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // End of the week

    const currentWorkloadWeekDisplay = document.getElementById('currentWorkloadWeekDisplay');
    if (currentWorkloadWeekDisplay) {
        currentWorkloadWeekDisplay.textContent =
            `${startDate.toLocaleDateString('it-IT')} - ${endDate.toLocaleDateString('it-IT')}`;
    }


    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + i);
        const dayString = currentDay.toISOString().split('T')[0];

        const dayColumn = document.createElement('div');
        dayColumn.classList.add('day-column');
        if (!isWorkingDay(currentDay)) {
            dayColumn.classList.add('non-working-day');
        }

        const dayHeader = document.createElement('div');
        dayHeader.classList.add('day-header');
        dayHeader.textContent = `${currentDay.toLocaleDateString('it-IT', { weekday: 'short' })} ${currentDay.getDate()}`;
        if (!isWorkingDay(currentDay)) {
            dayHeader.classList.add('non-working-day');
        }
        dayColumn.appendChild(dayHeader);

        // Calculate daily workload per department
        const dailyWorkload = {}; // { departmentId: totalHours }
        appData.productionPlan.forEach(lot => {
            // Check if this lot's production span includes currentDay
            const lotStartDate = new Date(lot.suggestedStartDate);
            const lotEndDate = new Date(lot.suggestedEndDate);

            if (currentDay >= lotStartDate && currentDay <= lotEndDate && lot.status === 'pending') {
                lot.workloadDetails.forEach(detail => {
                    const department = appData.departments.find(d => d.name === detail.departmentName);
                    if (department) {
                        if (!dailyWorkload[department.id]) {
                            dailyWorkload[department.id] = 0;
                        }
                        // Distribute workload evenly over the lot's duration for simplicity
                        const lotDurationDays = getWorkingDaysBetween(lotStartDate, lotEndDate);
                        const hoursPerDayPerDept = lotDurationDays > 0 ? detail.totalHours / lotDurationDays : detail.totalHours;
                        dailyWorkload[department.id] += hoursPerDayPerDept;
                    }
                });
            }
        });

        if (Object.keys(dailyWorkload).length === 0) {
            const p = document.createElement('p');
            p.style.textAlign = 'center';
            p.style.color = 'var(--text-color-light)';
            p.style.fontSize = '0.8em';
            p.textContent = 'Nessun workload';
            dayColumn.appendChild(p);
        } else {
            for (const deptId in dailyWorkload) {
                const department = appData.departments.find(d => d.id === parseInt(deptId));
                if (department) {
                    const workloadDiv = document.createElement('div');
                    workloadDiv.classList.add('daily-workload-department');
                    workloadDiv.innerHTML = `
                        <h5>${department.name}</h5>
                        <div class="daily-workload-detail">Carico: ${dailyWorkload[deptId].toFixed(2)} ore</div>
                    `;
                    dayColumn.appendChild(workloadDiv);
                }
            }
        }
        calendarGrid.appendChild(dayColumn);
    }
}

/**
 * Calculates the number of working days between two dates (inclusive).
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
function getWorkingDaysBetween(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
        if (isWorkingDay(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}


/**
 * Navigates to the previous week for a given calendar type.
 * @param {string} calendarType 'delivery' or 'workload'.
 */
function prevWeek(calendarType) {
    let currentStartDate;
    if (calendarType === 'delivery') {
        currentStartDate = new Date(appData.currentDeliveryWeekStartDate);
    } else {
        currentStartDate = new Date(appData.currentWorkloadWeekStartDate);
    }
    currentStartDate.setDate(currentStartDate.getDate() - 7);
    if (calendarType === 'delivery') {
        appData.currentDeliveryWeekStartDate = currentStartDate.toISOString().split('T')[0];
        renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
    } else {
        appData.currentWorkloadWeekStartDate = currentStartDate.toISOString().split('T')[0];
        renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
    }
    saveData();
}

/**
 * Navigates to the next week for a given calendar type.
 * @param {string} calendarType 'delivery' or 'workload'.
 */
function nextWeek(calendarType) {
    let currentStartDate;
    if (calendarType === 'delivery') {
        currentStartDate = new Date(appData.currentDeliveryWeekStartDate);
    } else {
        currentStartDate = new Date(appData.currentWorkloadWeekStartDate);
    }
    currentStartDate.setDate(currentStartDate.getDate() + 7);
    if (calendarType === 'delivery') {
        appData.currentDeliveryWeekStartDate = currentStartDate.toISOString().split('T')[0];
        renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
    } else {
        appData.currentWorkloadWeekStartDate = currentStartDate.toISOString().split('T')[0];
        renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
    }
    saveData();
}


// --- Funzioni per la Gestione Giorni Rossi (Holidays) ---

/**
 * Adds a new holiday.
 */
function addHoliday() {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per gestire i giorni rossi.', 'error');
        return;
    }

    const dateInput = document.getElementById('holidayDateInput');
    const descriptionInput = document.getElementById('holidayDescriptionInput');

    if (!dateInput || !descriptionInput) {
        showNotification('Errore: Campi giorno rosso non trovati.', 'error');
        return;
    }

    const date = dateInput.value;
    const description = descriptionInput.value;

    if (!date || !description) {
        showNotification('Per favore, inserisci sia la data che la descrizione del giorno rosso.', 'error');
        return;
    }

    // Check for duplicates
    if (appData.holidays.some(h => h.date === date)) {
        showNotification('Errore: Un giorno rosso con questa data esiste già.', 'error');
        return;
    }

    const newHoliday = {
        id: generateId(),
        date: date,
        description: description
    };
    appData.holidays.push(newHoliday);
    saveData();
    updateHolidaysTable();
    // Re-render calendars to reflect new holiday
    renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
    renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
    showNotification('Giorno rosso aggiunto con successo!', 'success');
    dateInput.value = '';
    descriptionInput.value = '';
}

/**
 * Deletes a holiday.
 * @param {number} holidayId The ID of the holiday to delete.
 */
function deleteHoliday(holidayId) {
    if (!hasRole('admin')) {
        showNotification('Non hai i permessi per eliminare i giorni rossi.', 'error');
        return;
    }
    showMessageBox('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo giorno rosso?', 'confirm', () => {
        appData.holidays = appData.holidays.filter(h => h.id !== holidayId);
        saveData();
        updateHolidaysTable();
        // Re-render calendars to reflect deleted holiday
        renderDeliveryCalendar(appData.currentDeliveryWeekStartDate);
        renderWorkloadCalendar(appData.currentWorkloadWeekStartDate);
        showNotification('Giorno rosso eliminato con successo!', 'success');
    });
}

/**
 * Updates the holidays table display.
 */
function updateHolidaysTable() {
    const tableBody = document.getElementById('holidaysTableBody');
    if (!tableBody) return; // Exit if element not found
    tableBody.innerHTML = ''; // Clear existing rows

    if (appData.holidays.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nessun giorno rosso registrato.</td></tr>';
        return;
    }

    // Sort holidays by date
    const sortedHolidays = [...appData.holidays].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedHolidays.forEach(holiday => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = new Date(holiday.date).toLocaleDateString('it-IT');
        row.insertCell().textContent = holiday.description;

        const actionsCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Elimina';
        deleteBtn.onclick = () => deleteHoliday(holiday.id);
        actionsCell.appendChild(deleteBtn);
    });
}


// --- Funzioni Dashboard ---

/**
 * Updates the dashboard summary statistics.
 */
function updateDashboardSummary() {
    // General Counts
    const dashboardArticlesCount = document.getElementById('dashboardArticlesCount');
    if (dashboardArticlesCount) dashboardArticlesCount.textContent = appData.articles.length;
    const dashboardPhasesCount = document.getElementById('dashboardPhasesCount');
    if (dashboardPhasesCount) dashboardPhasesCount.textContent = appData.phases.length;
    const dashboardMachinesCount = document.getElementById('dashboardMachinesCount');
    if (dashboardMachinesCount) dashboardMachinesCount.textContent = appData.machines.length;
    const dashboardPendingLotsCount = document.getElementById('dashboardPendingLotsCount');
    if (dashboardPendingLotsCount) dashboardPendingLotsCount.textContent = appData.productionPlan.filter(l => l.status === 'pending' && l.type === 'production').length;
    const dashboardPendingSamplesCount = document.getElementById('dashboardPendingSamplesCount');
    if (dashboardPendingSamplesCount) dashboardPendingSamplesCount.textContent = appData.productionPlan.filter(l => l.status === 'pending' && l.type === 'sample').length;
    const dashboardRawMaterialsCount = document.getElementById('dashboardRawMaterialsCount');
    if (dashboardRawMaterialsCount) dashboardRawMaterialsCount.textContent = appData.rawMaterials.length;

    // Raw Materials Summary
    const rawMaterialsSummaryUl = document.getElementById('dashboardRawMaterialsSummary');
    if (rawMaterialsSummaryUl) {
        rawMaterialsSummaryUl.innerHTML = '';
        if (appData.rawMaterials.length === 0) {
            rawMaterialsSummaryUl.innerHTML = '<p style="text-align: center; color: #888;">Nessuna materia prima registrata.</p>';
        } else {
            appData.rawMaterials.forEach(rm => {
                const li = document.createElement('li');
                li.textContent = `${rm.name}: ${rm.currentStock} ${rm.unit}`;
                rawMaterialsSummaryUl.appendChild(li);
            });
        }
    }


    // Machine Usage (simplified for dashboard)
    const machineUsageDiv = document.getElementById('dashboardMachineUsage');
    if (machineUsageDiv) {
        machineUsageDiv.innerHTML = '';
        if (appData.machines.length === 0) {
            machineUsageDiv.innerHTML = '<p style="text-align: center; color: #888;">Nessun macchinario registrato o dati di utilizzo.</p>';
        } else {
            appData.machines.forEach(machine => {
                // Calculate a very simplified "usage" based on pending lots assigned to its department
                let totalAssignedHours = 0;
                appData.productionPlan.filter(lot => lot.status === 'pending').forEach(lot => {
                    lot.workloadDetails.forEach(detail => {
                        const department = appData.departments.find(d => d.name === detail.departmentName);
                        if (department && department.id === machine.departmentId) {
                            totalAssignedHours += detail.totalHours;
                        }
                    });
                });

                // Assuming a standard working period, e.g., 160 hours/month per machine
                const maxCapacityHours = machine.capacity * 8 * 20; // Example: daily capacity * 20 working days/month
                const usagePercentage = maxCapacityHours > 0 ? (totalAssignedHours / maxCapacityHours) * 100 : 0;

                const machineDiv = document.createElement('div');
                machineDiv.innerHTML = `
                    <p>${machine.name} (${machine.departmentName}): ${usagePercentage.toFixed(1)}% (Carico: ${totalAssignedHours.toFixed(0)} pz / Capacità giornaliera: ${machine.capacity * 8} pz)</p>
                    <div class="machine-usage">
                        <div class="machine-usage-bar" style="width: ${Math.min(usagePercentage, 100)}%;"></div>
                    </div>
                `;
                machineUsageDiv.appendChild(machineDiv);
            });
        }
    }


    // Workload per Department (Current Week)
    const departmentWorkloadDiv = document.getElementById('dashboardDepartmentWorkload');
    if (departmentWorkloadDiv) {
        departmentWorkloadDiv.innerHTML = '';
        const currentWeekWorkload = {}; // { departmentName: totalHours }

        const startOfCurrentWeek = getStartOfWeek(new Date());
        const endOfCurrentWeek = new Date(startOfCurrentWeek);
        endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 6);

        appData.productionPlan.filter(lot => lot.status === 'pending').forEach(lot => {
            const lotStartDate = new Date(lot.suggestedStartDate);
            const lotEndDate = new Date(lot.suggestedEndDate);

            // Consider only lots that overlap with the current week
            if ((lotStartDate <= endOfCurrentWeek && lotEndDate >= startOfCurrentWeek) ||
                (lotStartDate >= startOfCurrentWeek && lotStartDate <= endOfCurrentWeek)) {

                lot.workloadDetails.forEach(detail => {
                    if (!currentWeekWorkload[detail.departmentName]) {
                        currentWeekWorkload[detail.departmentName] = 0;
                    }
                    // For dashboard, sum up total workload for overlapping lots
                    currentWeekWorkload[detail.departmentName] += detail.totalHours;
                });
            }
        });

        if (Object.keys(currentWeekWorkload).length === 0) {
            departmentWorkloadDiv.innerHTML = '<p style="text-align: center; color: #888;">Nessun dato di workload per la settimana corrente.</p>';
        } else {
            for (const deptName in currentWeekWorkload) {
                const p = document.createElement('p');
                p.textContent = `${deptName}: ${currentWeekWorkload[deptName].toFixed(2)} ore`;
                departmentWorkloadDiv.appendChild(p);
            }
        }
    }
}


// Inizializzazione: Carica i dati salvati e aggiorna l'UI quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded: Inizio caricamento app.");

    // Load and initialize app data, including users
    loadAndInitializeAppData();

    // Set up event listeners for login
    const loginButton = document.getElementById('loginButton');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');

    if (loginButton) loginButton.addEventListener('click', loginUser);
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                loginUser();
            }
        });
    }
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                loginUser();
            }
        });
    }


    // Initial theme application
    applyTheme();

    // Hide app content until login
    const appContent = document.getElementById('appContent');
    if (appContent) appContent.style.display = 'none';

    console.log("DOMContentLoaded: Caricamento app completato.");
});
