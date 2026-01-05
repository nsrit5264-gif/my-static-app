/**
 * Notes Management App - Main JavaScript File
 * 
 * This script provides the core functionality for the Notes Management App,
 * including CRUD operations, search, filtering, theming, and more.
 */

// =============================================
// Constants and Configuration
// =============================================
const NOTES_STORAGE_KEY = 'notesApp_notes';
const THEME_STORAGE_KEY = 'notesApp_theme';
const CATEGORIES = ['Study', 'Work', 'Personal', 'Others'];
const DEFAULT_CATEGORY = 'Personal';
const DEBOUNCE_DELAY = 300; // ms

// DOM Elements
const elements = {
    mainContent: document.getElementById('mainContent'),
    createNoteBtn: document.getElementById('createNoteBtn'),
    viewNotesBtn: document.getElementById('viewNotesBtn'),
    exportNotesBtn: document.getElementById('exportNotesBtn'),
    searchInput: document.getElementById('searchNotes'),
    themeToggle: document.getElementById('themeToggle'),
    liveRegion: document.getElementById('liveRegion')
};

// App State
let state = {
    notes: [],
    currentSearchTerm: '',
    currentCategory: 'all',
    isDarkMode: false
};

// =============================================
// Initialization
// =============================================

/**
 * Initialize the application
 */
function initializeApp() {
    loadNotes();
    initTheme();
    setupEventListeners();
    showWelcomeScreen();
    updateLiveMessage('Application initialized');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Navigation
    elements.createNoteBtn?.addEventListener('click', () => navigateTo('create'));
    elements.viewNotesBtn?.addEventListener('click', () => navigateTo('view'));
    elements.exportNotesBtn?.addEventListener('click', handleExportNotes);
    
    // Theme toggle
    elements.themeToggle?.addEventListener('click', toggleTheme);
    
    // Search functionality
    elements.searchInput?.addEventListener('input', debounce(handleSearch, DEBOUNCE_DELAY));
    
    // Handle back/forward browser navigation
    window.addEventListener('popstate', handlePopState);
}

// =============================================
// Navigation
// =============================================

/**
 * Handle navigation between different views
 * @param {string} screen - The screen to navigate to
 * @param {Object} params - Optional parameters for the screen
 */
function navigateTo(screen, params = {}) {
    // Clear any existing messages
    clearMessages();
    
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('view', screen);
    window.history.pushState({ screen, params }, '', url);
    
    // Show loading state
    elements.mainContent.innerHTML = '<div class="loading">Loading...</div>';
    
    // Load the appropriate screen
    try {
        switch (screen) {
            case 'create':
                showNoteForm(params.noteId);
                break;
            case 'view':
                showNotesList();
                break;
            case 'welcome':
            default:
                showWelcomeScreen();
        }
        updateLiveMessage(`Navigated to ${screen} view`);
    } catch (error) {
        console.error('Navigation error:', error);
        showError('Failed to load the requested view');
    }
}

/**
 * Handle browser back/forward navigation
 */
function handlePopState(event) {
    if (event.state) {
        const { screen, params } = event.state;
        navigateTo(screen, params);
    } else {
        navigateTo('welcome');
    }
}

// =============================================
// Note Management
// =============================================

/**
 * Load notes from localStorage
 */
function loadNotes() {
    try {
        const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
        state.notes = savedNotes ? JSON.parse(savedNotes) : [];
        return state.notes;
    } catch (error) {
        console.error('Error loading notes:', error);
        showError('Failed to load notes');
        return [];
    }
}

/**
 * Save notes to localStorage
 */
function saveNotes() {
    try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(state.notes));
        return true;
    } catch (error) {
        console.error('Error saving notes:', error);
        showError('Failed to save notes');
        return false;
    }
}

/**
 * Create a new note
 * @param {Object} noteData - The note data
 * @returns {boolean} - Success status
 */
function createNote(noteData) {
    try {
        const newNote = {
            id: Date.now().toString(),
            title: noteData.title.trim(),
            content: noteData.content.trim(),
            category: noteData.category || DEFAULT_CATEGORY,
            isPinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        state.notes.unshift(newNote);
        const success = saveNotes();
        if (success) {
            updateLiveMessage('Note created successfully');
        }
        return success;
    } catch (error) {
        console.error('Error creating note:', error);
        showError('Failed to create note');
        return false;
    }
}

/**
 * Update an existing note
 * @param {string} noteId - The ID of the note to update
 * @param {Object} updates - The updates to apply
 * @returns {boolean} - Success status
 */
function updateNote(noteId, updates) {
    try {
        const noteIndex = state.notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return false;
        
        const updatedNote = {
            ...state.notes[noteIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        state.notes[noteIndex] = updatedNote;
        const success = saveNotes();
        if (success) {
            updateLiveMessage('Note updated successfully');
        }
        return success;
    } catch (error) {
        console.error('Error updating note:', error);
        showError('Failed to update note');
        return false;
    }
}

/**
 * Delete a note
 * @param {string} noteId - The ID of the note to delete
 * @returns {boolean} - Success status
 */
function deleteNote(noteId) {
    try {
        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return false;
        }
        
        const initialLength = state.notes.length;
        state.notes = state.notes.filter(note => note.id !== noteId);
        
        if (state.notes.length < initialLength) {
            const success = saveNotes();
            if (success) {
                updateLiveMessage('Note deleted successfully');
                showNotesList(); // Refresh the view
            }
            return success;
        }
        return false;
    } catch (error) {
        console.error('Error deleting note:', error);
        showError('Failed to delete note');
        return false;
    }
}

/**
 * Toggle the pinned status of a note
 * @param {string} noteId - The ID of the note to toggle
 */
function togglePinNote(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (note) {
        updateNote(noteId, { isPinned: !note.isPinned });
        showNotesList(); // Refresh the view
    }
}

// =============================================
// UI Rendering
// =============================================

/**
 * Show the welcome screen
 */
function showWelcomeScreen() {
    elements.mainContent.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to Notes App</h2>
            <p>Your personal space for all your notes and ideas.</p>
            <div class="welcome-illustration">
                <div class="note-paper"></div>
                <div class="pencil" aria-hidden="true">✏️</div>
            </div>
            <div class="mt-4">
                <button class="btn btn-primary" id="getStartedBtn">Get Started</button>
            </div>
        </div>
    `;
    
    // Add event listener to the Get Started button
    document.getElementById('getStartedBtn')?.addEventListener('click', () => navigateTo('create'));
    updateLiveMessage('Welcome to Notes App');
}

/**
 * Show the note form (for both create and edit)
 * @param {string} noteId - Optional note ID for editing
 */
function showNoteForm(noteId = null) {
    let formTitle = 'Create New Note';
    let note = {
        title: '',
        content: '',
        category: DEFAULT_CATEGORY
    };
    
    // If editing, load the existing note
    if (noteId) {
        const existingNote = state.notes.find(n => n.id === noteId);
        if (existingNote) {
            note = { ...existingNote };
            formTitle = 'Edit Note';
        }
    }
    
    // Generate category options
    const categoryOptions = CATEGORIES.map(cat => 
        `<option value="${cat}" ${note.category === cat ? 'selected' : ''}>${cat}</option>`
    ).join('');
    
    elements.mainContent.innerHTML = `
        <div class="form-container">
            <h2 class="text-center">${formTitle}</h2>
            <form id="noteForm" novalidate>
                <input type="hidden" id="noteId" value="${noteId || ''}">
                
                <div class="form-group">
                    <label for="noteTitle">Title</label>
                    <input type="text" 
                           id="noteTitle" 
                           class="form-control" 
                           value="${escapeHtml(note.title)}" 
                           required
                           maxlength="100"
                           aria-describedby="titleHelp">
                    <small id="titleHelp" class="form-text text-muted">Maximum 100 characters</small>
                    <div class="invalid-feedback">Please provide a title for your note</div>
                </div>
                
                <div class="form-group">
                    <label for="noteContent">Content</label>
                    <textarea id="noteContent" 
                              class="form-control" 
                              rows="8" 
                              required
                              aria-describedby="contentHelp">${escapeHtml(note.content)}</textarea>
                    <small id="contentHelp" class="form-text text-muted">Markdown is supported</small>
                    <div class="invalid-feedback">Please provide content for your note</div>
                </div>
                
                <div class="form-group">
                    <label for="noteCategory">Category</label>
                    <select id="noteCategory" class="form-control">
                        ${categoryOptions}
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        ${noteId ? 'Update' : 'Create'} Note
                    </button>
                    <button type="button" id="backToMenu" class="btn btn-outline">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Set up form submission
    const form = document.getElementById('noteForm');
    form.addEventListener('submit', handleNoteSubmit);
    
    // Set up back to menu button
    document.getElementById('backToMenu')?.addEventListener('click', () => navigateTo('view'));
    
    // Initialize form validation
    setupFormValidation(form);
    
    updateLiveMessage(`${formTitle} form loaded`);
}

/**
 * Show the list of notes with search and filter options
 */
function showNotesList() {
    const filteredNotes = filterNotes(state.notes, state.currentSearchTerm, state.currentCategory);
    const hasNotes = state.notes.length > 0;
    
    // Generate category filter buttons
    const categoryFilters = [
        { id: 'all', label: 'All', count: state.notes.length },
        ...CATEGORIES.map(cat => ({
            id: cat.toLowerCase(),
            label: cat,
            count: state.notes.filter(n => n.category === cat).length
        }))
    ].filter(cat => cat.count > 0 || cat.id === 'all');
    
    const categoryFilterButtons = categoryFilters.map(cat => `
        <button class="category-filter ${state.currentCategory === cat.id ? 'active' : ''}" 
                data-category="${cat.id}">
            ${cat.label} <span class="badge">${cat.count}</span>
        </button>
    `).join('');
    
    // Generate note cards
    const pinnedNotes = filteredNotes.filter(note => note.isPinned);
    const otherNotes = filteredNotes.filter(note => !note.isPinned);
    
    const pinnedNotesHTML = pinnedNotes.length > 0 ? `
        <div class="pinned-section">
            <h3 class="section-title">📌 Pinned Notes</h3>
            <div class="notes-grid">
                ${pinnedNotes.map(note => createNoteCard(note)).join('')}
            </div>
        </div>
    ` : '';
    
    const otherNotesHTML = otherNotes.length > 0 ? `
        <div class="other-notes-section">
            <h3 class="section-title">${pinnedNotes.length > 0 ? 'Other Notes' : 'All Notes'}</h3>
            <div class="notes-grid">
                ${otherNotes.map(note => createNoteCard(note)).join('')}
            </div>
        </div>
    ` : '';
    
    const noNotesHTML = !hasNotes ? `
        <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h3>No Notes Yet</h3>
            <p>Get started by creating your first note!</p>
            <button class="btn btn-primary mt-3" id="createFirstNoteBtn">Create Note</button>
        </div>
    ` : (filteredNotes.length === 0 ? `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>No Notes Found</h3>
            <p>Try adjusting your search or filter criteria.</p>
            <button class="btn btn-outline mt-3" id="clearSearchBtn">Clear Search</button>
        </div>
    ` : '');
    
    elements.mainContent.innerHTML = `
        <div class="notes-container">
            <div class="notes-header">
                <h2>My Notes</h2>
                <div class="notes-actions">
                    <div class="search-container">
                        <input type="search" 
                               id="searchNotes" 
                               class="search-input" 
                               placeholder="Search notes..." 
                               value="${escapeHtml(state.currentSearchTerm)}"
                               aria-label="Search notes">
                    </div>
                    <button class="btn btn-primary" id="createNewNoteBtn">
                        <span class="btn-icon">+</span> New Note
                    </button>
                </div>
            </div>
            
            ${hasNotes ? `
                <div class="category-filters">
                    ${categoryFilterButtons}
                </div>
            ` : ''}
            
            ${noNotesHTML || `
                ${pinnedNotesHTML}
                ${otherNotesHTML}
            `}
        </div>
    `;
    
    // Set up event listeners
    document.getElementById('createNewNoteBtn')?.addEventListener('click', () => navigateTo('create'));
    document.getElementById('createFirstNoteBtn')?.addEventListener('click', () => navigateTo('create'));
    document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
    
    // Set up category filter buttons
    document.querySelectorAll('.category-filter').forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            state.currentCategory = category === 'all' ? 'all' : category;
            showNotesList();
        });
    });
    
    updateLiveMessage('Notes list loaded');
}

/**
 * Create HTML for a single note card
 * @param {Object} note - The note object
 * @returns {string} - HTML string for the note card
 */
function createNoteCard(note) {
    if (!note) return '';
    
    const formattedDate = formatDateTime(note.updatedAt || note.createdAt);
    const isPinned = note.isPinned ? 'pinned' : '';
    
    return `
        <div class="note-card ${isPinned}" id="note-${note.id}">
            <div class="note-header">
                <h3 class="note-title">${escapeHtml(note.title)}</h3>
                <button class="pin-button" 
                        aria-label="${note.isPinned ? 'Unpin note' : 'Pin note'}"
                        data-note-id="${note.id}">
                    ${note.isPinned ? '📌' : '📍'}
                </button>
            </div>
            
            <div class="note-content">
                ${formatNoteContent(note.content)}
            </div>
            
            <div class="note-footer">
                <div class="note-meta">
                    <span class="note-date" title="${formatDateTime(note.createdAt, 'full')}">
                        ${formattedDate}
                    </span>
                    ${note.category ? `
                        <span class="note-category" 
                              style="background-color: ${getCategoryColor(note.category)}">
                            ${note.category}
                        </span>
                    ` : ''}
                </div>
                
                <div class="note-actions">
                    <button class="btn btn-sm btn-outline edit-note" 
                            data-note-id="${note.id}"
                            aria-label="Edit note">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-outline delete-note" 
                            data-note-id="${note.id}"
                            aria-label="Delete note">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `;
}

// =============================================
// Event Handlers
// =============================================

/**
 * Handle note form submission
 * @param {Event} e - The form submit event
 */
function handleNoteSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const noteId = form.querySelector('#noteId').value;
    const title = form.querySelector('#noteTitle').value.trim();
    const content = form.querySelector('#noteContent').value.trim();
    const category = form.querySelector('#noteCategory').value || DEFAULT_CATEGORY;
    
    // Client-side validation
    if (!title || !content) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (noteId) {
        // Update existing note
        const success = updateNote(noteId, { title, content, category });
        if (success) {
            showSuccess('Note updated successfully!');
            navigateTo('view');
        }
    } else {
        // Create new note
        const success = createNote({ title, content, category });
        if (success) {
            showSuccess('Note created successfully!');
            navigateTo('view');
        }
    }
}

/**
 * Handle search input
 * @param {Event} e - The input event
 */
function handleSearch(e) {
    state.currentSearchTerm = e.target.value.trim().toLowerCase();
    showNotesList();
}

/**
 * Clear the current search
 */
function clearSearch() {
    state.currentSearchTerm = '';
    state.currentCategory = 'all';
    elements.searchInput.value = '';
    showNotesList();
}

/**
 * Handle export notes
 */
function handleExportNotes() {
    try {
        if (state.notes.length === 0) {
            showInfo('No notes to export');
            return;
        }
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            totalNotes: state.notes.length,
            notes: state.notes.map(note => ({
                title: note.title,
                content: note.content,
                category: note.category,
                isPinned: note.isPinned,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        a.href = url;
        a.download = `notes-export-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showSuccess(`Exported ${state.notes.length} notes successfully`);
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export notes');
    }
}

// =============================================
// Helper Functions
// =============================================

/**
 * Filter notes by search term and category
 * @param {Array} notes - The notes to filter
 * @param {string} searchTerm - The search term
 * @param {string} category - The category to filter by
 * @returns {Array} - The filtered notes
 */
function filterNotes(notes, searchTerm, category) {
    return notes.filter(note => {
        const matchesSearch = !searchTerm || 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm);
        
        const matchesCategory = category === 'all' || 
            note.category?.toLowerCase() === category.toLowerCase();
        
        return matchesSearch && matchesCategory;
    });
}

/**
 * Format a date string into a readable format
 * @param {string} dateString - The date string to format
 * @param {string} format - The format to use (relative, short, full)
 * @returns {string} - The formatted date string
 */
function formatDateTime(dateString, format = 'relative') {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    // Relative time (e.g., "2 hours ago")
    if (format === 'relative') {
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
    
    // Short format (e.g., "Jan 1, 2023")
    if (format === 'short') {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Full format (e.g., "January 1, 2023, 12:00 PM")
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format note content for display
 * @param {string} content - The note content
 * @returns {string} - The formatted HTML
 */
function formatNoteContent(content) {
    if (!content) return '';
    
    // Simple markdown-like formatting
    let formatted = escapeHtml(content)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic*
        .replace(/`([^`]+)`/g, '<code>$1</code>') // `code`
        .replace(/\n/g, '<br>'); // Line breaks
    
    return formatted;
}

/**
 * Get a color for a category
 * @param {string} category - The category name
 * @returns {string} - The color in hex or hsl format
 */
function getCategoryColor(category) {
    const colors = [
        '#e3f2fd', '#e8f5e9', '#fff3e0', '#f3e5f5',
        '#e0f7fa', '#fce4ec', '#f1f8e9', '#fffde7'
    ];
    
    // Simple hash function to get a consistent color for each category
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

/**
 * Set up form validation
 * @param {HTMLElement} form - The form element
 */
function setupFormValidation(form) {
    // Add validation classes on blur
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateInput(input);
        });
    });
    
    // Validate on submit
    form.addEventListener('submit', (e) => {
        let isValid = true;
        inputs.forEach(input => {
            if (!validateInput(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            showError('Please fill in all required fields');
        }
    });
}

/**
 * Validate a single form input
 * @param {HTMLElement} input - The input element to validate
 * @returns {boolean} - Whether the input is valid
 */
function validateInput(input) {
    if (input.required && !input.value.trim()) {
        input.classList.add('is-invalid');
        return false;
    }
    
    // Additional validation can be added here (e.g., min/max length, pattern, etc.)
    
    input.classList.remove('is-invalid');
    return true;
}

// =============================================
// Theme Management
// =============================================

/**
 * Initialize the theme based on user preference or system settings
 */
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

/**
 * Set the theme
 * @param {string} theme - The theme to set ('light' or 'dark')
 */
function setTheme(theme) {
    state.isDarkMode = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeButton();
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const newTheme = state.isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
    showInfo(`Switched to ${newTheme} mode`);
}

/**
 * Update the theme toggle button
 */
function updateThemeButton() {
    if (!elements.themeToggle) return;
    
    elements.themeToggle.innerHTML = state.isDarkMode ? '🌞' : '🌙';
    elements.themeToggle.setAttribute('aria-label', 
        state.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
}

// =============================================
// Utility Functions
// =============================================

/**
 * Escape HTML to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Debounce a function
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// =============================================
// Notification and Feedback
// =============================================

/**
 * Show a success message
 * @param {string} message - The message to display
 */
function showSuccess(message) {
    showMessage(message, 'success');
    updateLiveMessage(`Success: ${message}`);
}

/**
 * Show an error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    showMessage(message, 'error');
    console.error(message);
    updateLiveMessage(`Error: ${message}`, 'assertive');
}

/**
 * Show an info message
 * @param {string} message - The info message to display
 */
function showInfo(message) {
    showMessage(message, 'info');
    updateLiveMessage(`Info: ${message}`);
}

/**
 * Show a message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, info)
 */
function showMessage(message, type = 'info') {
    // Remove any existing messages
    clearMessages();
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `alert alert-${type} fade-in`;
    messageEl.textContent = message;
    messageEl.setAttribute('role', 'alert');
    messageEl.setAttribute('aria-live', 'polite');
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close message');
    closeBtn.addEventListener('click', () => {
        messageEl.remove();
    });
    
    messageEl.appendChild(closeBtn);
    
    // Add to the top of the main content
    const firstChild = elements.mainContent.firstChild;
    if (firstChild) {
        elements.mainContent.insertBefore(messageEl, firstChild);
    } else {
        elements.mainContent.appendChild(messageEl);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.classList.add('fade-out');
            setTimeout(() => messageEl.remove(), 300);
        }
    }, 5000);
}

/**
 * Clear all messages
 */
function clearMessages() {
    const messages = elements.mainContent.querySelectorAll('.alert');
    messages.forEach(msg => msg.remove());
}

/**
 * Update the live region for screen readers
 * @param {string} message - The message to announce
 * @param {string} politeness - The politeness level (polite, assertive, off)
 */
function updateLiveMessage(message, politeness = 'polite') {
    if (!elements.liveRegion) return;
    
    elements.liveRegion.setAttribute('aria-live', politeness);
    // Clear previous message
    elements.liveRegion.textContent = '';
    // Force a reflow to ensure the screen reader announces the new message
    void elements.liveRegion.offsetWidth;
    // Set the new message
    elements.liveRegion.textContent = message;
}

// =============================================
// Initialize the application when the DOM is loaded
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // Add loaded class to body to prevent FOUC
    document.body.classList.add('loaded');
    
    // Initialize the app
    initializeApp();
    
    // Set up event delegation for dynamic content
    document.addEventListener('click', (e) => {
        // Handle edit button clicks
        if (e.target.closest('.edit-note')) {
            const noteId = e.target.closest('.edit-note').dataset.noteId;
            navigateTo('create', { noteId });
        }
        
        // Handle delete button clicks
        if (e.target.closest('.delete-note')) {
            const noteId = e.target.closest('.delete-note').dataset.noteId;
            deleteNote(noteId);
        }
        
        // Handle pin button clicks
        if (e.target.closest('.pin-button')) {
            const noteId = e.target.closest('.pin-button').dataset.noteId;
            togglePinNote(noteId);
        }
    });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Close messages with Escape key
        if (e.key === 'Escape') {
            clearMessages();
        }
        
        // Toggle theme with Ctrl+Alt+T
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            toggleTheme();
        }
    });
    
    // Handle system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
    
    // Initial live region update
    updateLiveMessage('Application ready');
});

// =============================================
// Expose functions to global scope for debugging (optional)
// =============================================
window.app = {
    state,
    notes: () => state.notes,
    clearData: () => {
        localStorage.removeItem(NOTES_STORAGE_KEY);
        localStorage.removeItem(THEME_STORAGE_KEY);
        state.notes = [];
        showSuccess('All app data has been cleared');
        showWelcomeScreen();
    }
};