// ===== ADMIN PANEL DASHBOARD JAVASCRIPT =====

class AdminPanel {
    static instance = null;

    static getInstance() {
        return AdminPanel.instance;
    }

    constructor() {
        if (AdminPanel.instance) {
            console.warn('AdminPanel instance already exists. Returning existing instance.');
            return AdminPanel.instance;
        }

        AdminPanel.instance = this;

        this.currentSection = 'dashboard';
        this.initialized = false;

        // Message queue system
        this.messageQueue = [];
        this.isShowingMessage = false;
        this.currentToast = null;
        this.messageTimeout = null;

        this.init();
    }

    async init() {
        if (this.initialized) {
            console.log('AdminPanel already initialized, skipping...');
            return;
        }

        try {
            // Setup event listeners
            this.setupEventListeners();

            // Load dashboard data
            await this.loadDashboardData();

            this.initialized = true;
            console.log('Admin panel dashboard initialized successfully');

        } catch (error) {
            console.error('Error initializing admin panel:', error);
        }
    }

    setupEventListeners() {
        // Remove existing event listeners to prevent duplicates
        this.removeEventListeners();

        // Store bound functions for later removal
        this.boundFunctions = {
            logout: () => this.logout()
        };

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.boundFunctions.logout);
        }

        // Dashboard refresh button
        const refreshDashboard = document.getElementById('refreshDashboard');
        if (refreshDashboard) {
            refreshDashboard.addEventListener('click', () => this.loadDashboardData());
        }



        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    removeEventListeners() {
        if (!this.boundFunctions) return;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.removeEventListener('click', this.boundFunctions.logout);
        }
    }





    // ===== DASHBOARD FUNCTIONALITY =====
    
    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');

            // Load actual statistics
            const stats = await this.loadCollectionStats();

            // Update stat cards
            document.getElementById('totalCourses').textContent = stats.courses;
            document.getElementById('totalStudents').textContent = stats.students;
            document.getElementById('totalFaculty').textContent = stats.faculty;
            document.getElementById('totalNotices').textContent = stats.notices;

            // Calculate changes (no historical data available)
            await this.calculateStatChanges();

            console.log('Dashboard data loaded successfully');
        } catch (error) {
            console.error('Error in loadDashboardData:', error);
            // Don't show error message for dashboard - just log it
            console.log('Dashboard will show empty data until records are added');
        }
    }

    async loadCollectionStats() {
        // Return actual statistics from localStorage or 0 if no data
        const stats = {
            courses: this.getStoredData('courses').length,
            students: this.getStoredData('students').length,
            faculty: this.getStoredData('faculty').length,
            notices: this.getStoredData('notices').length
        };

        console.log('Loaded actual statistics:', stats);
        return stats;
    }

    async calculateStatChanges() {
        try {
            // Show no change data since we don't track historical data
            const noChangeText = 'No change data';

            const collections = ['courses', 'students', 'faculty', 'notices'];

            for (const collectionName of collections) {
                const elementId = `${collectionName}Change`;
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = noChangeText;
                    element.className = 'stat-change neutral'; // Remove positive/negative styling
                } else {
                    console.warn(`Element ${elementId} not found in DOM`);
                }
            }
        } catch (error) {
            console.error('Error calculating stat changes:', error);
        }
    }

    // ===== DATA MANAGEMENT METHODS =====

    getStoredData(collection) {
        try {
            const data = localStorage.getItem(`admin_${collection}`);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error getting stored data for ${collection}:`, error);
            return [];
        }
    }

    async loadData(collection) {
        try {
            console.log(`Loading data for collection: ${collection}`);
            const data = this.getStoredData(collection);
            console.log(`Loaded ${data.length} items from ${collection}`);
            return data;
        } catch (error) {
            console.error(`Error loading data for ${collection}:`, error);
            return [];
        }
    }

    async saveData(collection, data) {
        try {
            console.log(`Saving data for collection: ${collection}`, data);

            // Get existing data
            const existingData = this.getStoredData(collection);

            // Add new data with ID if not present
            if (!data.id) {
                data.id = this.generateId();
            }

            // Add timestamp
            data.createdAt = data.createdAt || new Date().toISOString();
            data.updatedAt = new Date().toISOString();

            // Add to existing data
            existingData.push(data);

            // Save back to localStorage
            localStorage.setItem(`admin_${collection}`, JSON.stringify(existingData));

            console.log(`Data saved successfully to ${collection}`);
            return data;
        } catch (error) {
            console.error(`Error saving data to ${collection}:`, error);
            throw error;
        }
    }

    async updateData(collection, id, updatedData) {
        try {
            console.log(`Updating data in collection: ${collection}, ID: ${id}`);

            const existingData = this.getStoredData(collection);
            const index = existingData.findIndex(item => item.id === id);

            if (index === -1) {
                throw new Error(`Item with ID ${id} not found in ${collection}`);
            }

            // Update the item
            existingData[index] = { ...existingData[index], ...updatedData, updatedAt: new Date().toISOString() };

            // Save back to localStorage
            localStorage.setItem(`admin_${collection}`, JSON.stringify(existingData));

            console.log(`Data updated successfully in ${collection}`);
            return existingData[index];
        } catch (error) {
            console.error(`Error updating data in ${collection}:`, error);
            throw error;
        }
    }

    async deleteData(collection, id) {
        try {
            console.log(`Deleting data from collection: ${collection}, ID: ${id}`);

            const existingData = this.getStoredData(collection);
            const filteredData = existingData.filter(item => item.id !== id);

            if (filteredData.length === existingData.length) {
                throw new Error(`Item with ID ${id} not found in ${collection}`);
            }

            // Save back to localStorage
            localStorage.setItem(`admin_${collection}`, JSON.stringify(filteredData));

            console.log(`Data deleted successfully from ${collection}`);
            return true;
        } catch (error) {
            console.error(`Error deleting data from ${collection}:`, error);
            throw error;
        }
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    // ===== MESSAGE SYSTEM =====

    showMessage(message, type = 'info', duration = 3000) {
        // Add message to queue
        this.messageQueue.push({ message, type, duration });

        // Process queue if not already showing a message
        if (!this.isShowingMessage) {
            this.processMessageQueue();
        }
    }

    processMessageQueue() {
        if (this.messageQueue.length === 0) {
            this.isShowingMessage = false;
            return;
        }

        this.isShowingMessage = true;
        const { message, type, duration } = this.messageQueue.shift();

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        // Add to DOM
        document.body.appendChild(toast);
        this.currentToast = toast;

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hideCurrentToast());

        // Auto-hide after duration
        this.messageTimeout = setTimeout(() => {
            this.hideCurrentToast();
        }, duration);
    }

    hideCurrentToast() {
        if (this.currentToast) {
            this.currentToast.classList.remove('show');
            setTimeout(() => {
                if (this.currentToast && this.currentToast.parentNode) {
                    this.currentToast.parentNode.removeChild(this.currentToast);
                }
                this.currentToast = null;
                // Process next message in queue
                this.processMessageQueue();
            }, 300);
        }

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ===== UTILITY METHODS =====

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '../index.html';
        }
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!window.adminPanel) {
        window.adminPanel = new AdminPanel();
    }
});
