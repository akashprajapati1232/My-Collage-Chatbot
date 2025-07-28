/**
 * Sidebar & Navbar JavaScript - Handles dynamic navbar/sidebar loading, theme switching,
 * sidebar expansion/collapse, and profile dropdown functionality
 * Supports both light and dark themes with smooth transitions
 */

class NavbarManager {
    constructor() {
        console.log('NavbarManager constructor called');
        this.navbarLoaded = false;
        this.sidebarExpanded = {};
        this.isMobile = window.innerWidth <= 768;
        this.sidebarVisible = false;
        this.init();
    }

    async init() {
        console.log('NavbarManager init started');
        await this.loadNavbar();

        // Wait a bit for DOM to update after navbar insertion
        await new Promise(resolve => setTimeout(resolve, 50));

        this.setupElements();
        this.setupEventListeners();
        this.loadTheme();
        this.loadSidebarState();
        this.setupClickOutside();
        this.handleResize();
        this.setActivePageFromURL();
        console.log('NavbarManager init completed');
    }

    async loadNavbar() {
        try {
            console.log('Starting navbar load...');
            const navbarContainer = document.getElementById('navbar');
            if (!navbarContainer) {
                console.warn('Navbar container with id="navbar" not found');
                return;
            }
            console.log('Navbar container found:', navbarContainer);

            // Fetch the navbar HTML
            console.log('Fetching navbar.html...');
            const response = await fetch('navbar.html');
            console.log('Fetch response:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`Failed to load navbar: ${response.status}`);
            }

            const navbarHTML = await response.text();
            console.log('Navbar HTML loaded, length:', navbarHTML.length);
            navbarContainer.innerHTML = navbarHTML;
            this.navbarLoaded = true;
            console.log('Navbar HTML inserted into container');

            // Add a small delay to ensure DOM is updated
            await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
            console.error('Error loading navbar:', error);
            // Fallback: create a basic navbar structure
            this.createFallbackNavbar();
        }
    }

    createFallbackNavbar() {
        const navbarContainer = document.getElementById('navbar');
        if (!navbarContainer) return;

        navbarContainer.innerHTML = `
            <!-- Top Navigation Bar -->
            <nav class="top-navbar" id="topNavbar">
                <div class="top-navbar-container">
                    <button class="mobile-menu-toggle" id="mobileMenuToggle">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="navbar-brand">
                        <div class="brand-logo">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div class="brand-text">
                            <span class="brand-name">BitBot Admin</span>
                        </div>
                    </div>
                    <div class="navbar-actions">
                        <button class="theme-toggle" id="themeToggle" title="Toggle Theme">
                            <i class="fas fa-sun light-icon"></i>
                            <i class="fas fa-moon dark-icon"></i>
                        </button>
                        <div class="profile-dropdown" id="profileDropdown">
                            <button class="profile-trigger" id="profileTrigger">
                                <div class="profile-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <i class="fas fa-chevron-down dropdown-arrow"></i>
                            </button>
                            <div class="dropdown-menu" id="dropdownMenu">
                                <div class="dropdown-header">
                                    <div class="dropdown-avatar">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="dropdown-info">
                                        <span class="dropdown-name">Admin User</span>
                                        <span class="dropdown-email">admin@bitcollege.edu</span>
                                    </div>
                                </div>
                                <div class="dropdown-divider"></div>
                                <a href="#settings" class="dropdown-item" id="settingsOption">
                                    <i class="fas fa-cog"></i>
                                    <span>Settings</span>
                                </a>
                                <a href="#logout" class="dropdown-item logout-item" id="logoutOption">
                                    <i class="fas fa-sign-out-alt"></i>
                                    <span>Log Out</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Sidebar Navigation -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-container">
                    <a href="#dashboard" class="sidebar-item active" data-section="dashboard">
                        <div class="sidebar-icon">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <span class="sidebar-text">Dashboard</span>
                    </a>
                    <!-- Add other sidebar items here -->
                </div>
            </aside>

            <div class="sidebar-overlay" id="sidebarOverlay"></div>
        `;
        this.navbarLoaded = true;
    }

    setupElements() {
        if (!this.navbarLoaded) {
            console.warn('Navbar not loaded yet, skipping element setup');
            return;
        }

        // Theme toggle elements
        this.themeToggle = document.getElementById('themeToggle');
        this.body = document.body;

        // Hamburger menu elements
        this.hamburgerToggle = document.getElementById('hamburgerToggle');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');

        // Profile dropdown elements
        this.profileTrigger = document.getElementById('profileTrigger');
        this.dropdownMenu = document.getElementById('dropdownMenu');
        this.profileDropdown = document.getElementById('profileDropdown');

        // Dropdown menu items
        this.settingsOption = document.getElementById('settingsOption');
        this.logoutOption = document.getElementById('logoutOption');

        // Sidebar elements
        this.sidebarLinks = document.querySelectorAll('.sidebar-link');
        this.sidebarGroups = document.querySelectorAll('.sidebar-group');
        this.sidebarGroupToggles = document.querySelectorAll('.sidebar-group-toggle');
        this.sidebarSublinks = document.querySelectorAll('.sidebar-sublink');



        // Verify critical elements are found
        if (!this.themeToggle || !this.profileTrigger || !this.dropdownMenu || !this.sidebar) {
            console.warn('Some navbar/sidebar elements not found, functionality may be limited');
        }
    }

    setupEventListeners() {
        // Theme toggle functionality
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Hamburger menu toggle
        if (this.hamburgerToggle) {
            this.hamburgerToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Sidebar close button
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', () => this.closeSidebar());
        }

        // Sidebar overlay click
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        }

        // Profile dropdown functionality
        if (this.profileTrigger) {
            this.profileTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Dropdown menu item clicks
        if (this.settingsOption) {
            this.settingsOption.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSettingsClick();
            });
        }

        if (this.logoutOption) {
            this.logoutOption.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogoutClick();
            });
        }

        // Sidebar link clicks using event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-link')) {
                const link = e.target.closest('.sidebar-link');
                const href = link.getAttribute('href');
                // Only prevent default for hash links or empty hrefs
                if (!href || href === '#' || href.startsWith('#')) {
                    e.preventDefault();
                }
                this.handleSidebarLinkClick(link);
            }
        });

        // Sidebar group toggle clicks
        this.sidebarGroupToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSidebarGroup(toggle);
            });
        });

        // Sidebar sublink clicks using event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-sublink')) {
                const sublink = e.target.closest('.sidebar-sublink');
                const href = sublink.getAttribute('href');
                // Only prevent default for hash links or empty hrefs
                if (!href || href === '#' || href.startsWith('#')) {
                    e.preventDefault();
                }
                this.handleSidebarSublinkClick(sublink);
            }
        });

        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    setupClickOutside() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.profileDropdown && !this.profileDropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    // Sidebar Management
    toggleSidebar() {
        if (this.sidebarVisible) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        if (this.sidebar && this.sidebarOverlay) {
            this.sidebar.classList.add('active');
            this.sidebarOverlay.classList.add('active');
            if (this.hamburgerToggle) {
                this.hamburgerToggle.classList.add('active');
            }
            this.sidebarVisible = true;
            document.body.style.overflow = 'hidden';
        }
    }

    closeSidebar() {
        if (this.sidebar && this.sidebarOverlay) {
            this.sidebar.classList.remove('active');
            this.sidebarOverlay.classList.remove('active');
            if (this.hamburgerToggle) {
                this.hamburgerToggle.classList.remove('active');
            }
            this.sidebarVisible = false;
            document.body.style.overflow = '';
        }
    }

    toggleSidebarGroup(toggle) {
        const targetId = toggle.dataset.target;
        const group = toggle.closest('.sidebar-group');
        const submenu = document.getElementById(targetId);

        if (group && submenu) {
            const isExpanded = group.classList.contains('expanded');

            if (isExpanded) {
                group.classList.remove('expanded');
                submenu.style.maxHeight = '0';
                this.sidebarExpanded[targetId] = false;
            } else {
                // Close other expanded groups for accordion effect (optional)
                // Uncomment the following lines if you want accordion behavior
                /*
                this.sidebarGroupToggles.forEach(otherToggle => {
                    if (otherToggle !== toggle) {
                        const otherGroup = otherToggle.closest('.sidebar-group');
                        const otherTargetId = otherToggle.dataset.target;
                        const otherSubmenu = document.getElementById(otherTargetId);

                        if (otherGroup && otherSubmenu && otherGroup.classList.contains('expanded')) {
                            otherGroup.classList.remove('expanded');
                            otherSubmenu.style.maxHeight = '0';
                            this.sidebarExpanded[otherTargetId] = false;
                        }
                    }
                });
                */

                group.classList.add('expanded');
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                this.sidebarExpanded[targetId] = true;
            }

            // Save expansion state
            this.saveSidebarState();
        }
    }

    handleSidebarLinkClick(link) {
        // Remove active class from all links
        this.sidebarLinks.forEach(l => l.classList.remove('active'));
        this.sidebarSublinks.forEach(l => l.classList.remove('active'));

        // Add active class to clicked link
        link.classList.add('active');

        // Close sidebar after navigation (both mobile and desktop)
        setTimeout(() => {
            this.closeSidebar();
        }, 150);

        // Handle navigation - allow normal link behavior
        const href = link.getAttribute('href');

        if (href && href !== '#' && !href.startsWith('#')) {
            // For actual page navigation, allow the default behavior
            // Don't prevent default, let the browser navigate
            setTimeout(() => {
                window.location.href = href;
            }, 200); // Small delay for visual feedback and sidebar close
        }
    }

    handleSidebarSublinkClick(sublink) {
        // Remove active class from all links
        this.sidebarLinks.forEach(l => l.classList.remove('active'));
        this.sidebarSublinks.forEach(l => l.classList.remove('active'));

        // Add active class to clicked sublink
        sublink.classList.add('active');

        // Ensure parent group is expanded
        const parentGroup = sublink.closest('.sidebar-group');
        if (parentGroup && !parentGroup.classList.contains('expanded')) {
            parentGroup.classList.add('expanded');
            const submenu = parentGroup.querySelector('.sidebar-submenu');
            if (submenu) {
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
            }
        }

        // Close sidebar after navigation (both mobile and desktop)
        setTimeout(() => {
            this.closeSidebar();
        }, 150);

        // Handle navigation - allow normal link behavior
        const href = sublink.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('#')) {
            // For actual page navigation, allow the default behavior
            setTimeout(() => {
                window.location.href = href;
            }, 200); // Small delay for visual feedback and sidebar close
        }
    }

    handleSidebarItemClick(item) {
        // Remove active class from all sidebar items
        this.sidebarItems.forEach(sidebarItem => {
            sidebarItem.classList.remove('active');
        });

        // Remove active class from all sublinks
        this.sidebarSublinks.forEach(sublink => {
            sublink.classList.remove('active');
        });

        // Add active class to clicked item
        item.classList.add('active');

        // Get the section
        const section = item.dataset.section;
        console.log(`Navigating to: ${section}`);

        // Navigate to section
        this.navigateToSection(section);

        // Close sidebar on mobile after navigation
        if (this.isMobile) {
            this.closeSidebar();
        }
    }

    // Legacy method - keeping for compatibility
    handleSidebarSubitemClick(subitem) {
        // This method is now handled by handleSidebarSublinkClick
        this.handleSidebarSublinkClick(subitem);

        // Get the href
        const href = subitem.getAttribute('href');
        console.log(`Navigating to: ${href}`);

        // Navigate to section
        this.navigateToSection(href);

        // Close sidebar on mobile after navigation
        if (this.isMobile) {
            this.closeSidebar();
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        // If switching from mobile to desktop, close sidebar
        if (wasMobile && !this.isMobile) {
            this.closeSidebar();
        }
    }

    saveSidebarState() {
        try {
            localStorage.setItem('sidebar-expanded', JSON.stringify(this.sidebarExpanded));
        } catch (error) {
            console.warn('Could not save sidebar state:', error);
        }
    }

    loadSidebarState() {
        try {
            const saved = localStorage.getItem('sidebar-expanded');
            if (saved) {
                this.sidebarExpanded = JSON.parse(saved);

                // Apply saved states
                this.expandableItems.forEach(item => {
                    const section = item.dataset.section;
                    if (this.sidebarExpanded[section]) {
                        item.classList.add('expanded');
                    }
                });
            }
        } catch (error) {
            console.warn('Could not load sidebar state:', error);
        }
    }

    // Theme Management
    toggleTheme() {
        const currentTheme = this.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        this.setTheme(newTheme);
        this.saveTheme(newTheme);
        
        // Add a subtle animation effect
        this.animateThemeChange();
    }

    setTheme(theme) {
        if (theme === 'dark') {
            this.body.classList.remove('light-theme');
            this.body.classList.add('dark-theme');
        } else {
            this.body.classList.remove('dark-theme');
            this.body.classList.add('light-theme');
        }
    }

    saveTheme(theme) {
        try {
            localStorage.setItem('navbar-theme', theme);
        } catch (error) {
            console.warn('Could not save theme preference:', error);
        }
    }

    loadTheme() {
        try {
            const savedTheme = localStorage.getItem('navbar-theme');
            if (savedTheme) {
                this.setTheme(savedTheme);
            } else {
                // Default to light theme
                this.setTheme('light');
            }
        } catch (error) {
            console.warn('Could not load theme preference:', error);
            this.setTheme('light');
        }
    }

    animateThemeChange() {
        // Add a subtle pulse effect to the theme toggle button
        if (this.themeToggle) {
            this.themeToggle.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.themeToggle.style.transform = 'scale(1)';
            }, 150);
        }
    }

    // Dropdown Management
    toggleDropdown() {
        const isOpen = this.dropdownMenu.classList.contains('show');
        
        if (isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.dropdownMenu.classList.add('show');
        this.profileTrigger.classList.add('active');
        
        // Focus management for accessibility
        setTimeout(() => {
            const firstItem = this.dropdownMenu.querySelector('.dropdown-item');
            if (firstItem) {
                firstItem.focus();
            }
        }, 100);
    }

    closeDropdown() {
        this.dropdownMenu.classList.remove('show');
        this.profileTrigger.classList.remove('active');
    }

    // Navigation Management
    handleNavClick(clickedLink) {
        // Remove active class from all links
        this.navLinks.forEach(link => link.classList.remove('active'));
        
        // Add active class to clicked link
        clickedLink.classList.add('active');
        
        // Get the href attribute to determine the section
        const href = clickedLink.getAttribute('href');
        console.log(`Navigating to: ${href}`);
        
        // You can add custom navigation logic here
        // For example, showing/hiding different sections of the admin panel
        this.navigateToSection(href);
    }

    navigateToSection(section) {
        // Custom navigation logic
        // This is where you would implement the actual navigation
        // For now, we'll just log the navigation
        console.log(`Navigation to ${section} would be implemented here`);
        
        // Example: You could emit a custom event that other parts of your app can listen to
        const navigationEvent = new CustomEvent('navbar-navigate', {
            detail: { section: section }
        });
        document.dispatchEvent(navigationEvent);
    }

    // Menu Item Handlers
    handleSettingsClick() {
        console.log('Settings clicked');
        this.closeDropdown();
        
        // You can implement settings modal or navigation here
        this.showNotification('Settings panel would open here', 'info');
        
        // Example: Open settings modal or navigate to settings page
        // this.openSettingsModal();
        // or
        // window.location.href = 'settings.html';
    }

    handleLogoutClick() {
        console.log('Logout clicked');
        this.closeDropdown();
        
        // Show confirmation dialog
        this.showLogoutConfirmation();
    }

    showLogoutConfirmation() {
        // Simple confirmation dialog
        const confirmed = confirm('Are you sure you want to log out?');
        
        if (confirmed) {
            this.performLogout();
        }
    }

    performLogout() {
        // Clear any stored authentication data
        try {
            localStorage.removeItem('auth-token');
            sessionStorage.clear();
        } catch (error) {
            console.warn('Could not clear storage:', error);
        }
        
        // Show logout message
        this.showNotification('Logging out...', 'info');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            // Replace with your actual login page URL
            window.location.href = '../index.html';
        }, 1000);
    }

    // Keyboard Navigation
    handleKeydown(e) {
        // Handle Escape key to close dropdown
        if (e.key === 'Escape') {
            this.closeDropdown();
        }
        
        // Handle Enter key on profile trigger
        if (e.key === 'Enter' && e.target === this.profileTrigger) {
            this.toggleDropdown();
        }
    }

    // Utility Methods
    showNotification(message, type = 'info') {
        // Simple notification system
        // You can replace this with your preferred notification library
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // If you have a notification system like Toastify, you can use it here
        // Example:
        // if (typeof Toastify !== 'undefined') {
        //     Toastify({
        //         text: message,
        //         duration: 3000,
        //         gravity: "top",
        //         position: "center",
        //         className: `toast-${type}`
        //     }).showToast();
        // }
    }

    // Public API Methods
    getCurrentTheme() {
        return this.body.classList.contains('dark-theme') ? 'dark' : 'light';
    }

    setActiveSidebarItem(section) {
        // Remove active from all items
        this.sidebarLinks.forEach(link => {
            link.classList.remove('active');
        });
        this.sidebarSublinks.forEach(sublink => {
            sublink.classList.remove('active');
        });

        // Find and activate the correct item
        const targetItem = document.querySelector(`[data-section="${section}"]`) ||
                          document.querySelector(`[href="#${section}"]`);

        if (targetItem) {
            targetItem.classList.add('active');

            // If it's a subitem, also expand its parent
            if (targetItem.classList.contains('sidebar-subitem')) {
                const parentExpandable = targetItem.closest('.sidebar-item.expandable');
                if (parentExpandable) {
                    parentExpandable.classList.add('expanded');
                    const section = parentExpandable.dataset.section;
                    this.sidebarExpanded[section] = true;
                    this.saveSidebarState();
                }
            }
        }
    }

    updateProfileInfo(name, role, email) {
        // Update profile information in the navbar
        const profileName = document.querySelector('.profile-name');
        const profileRole = document.querySelector('.profile-role');
        const dropdownName = document.querySelector('.dropdown-name');
        const dropdownEmail = document.querySelector('.dropdown-email');

        if (profileName) profileName.textContent = name;
        if (profileRole) profileRole.textContent = role;
        if (dropdownName) dropdownName.textContent = name;
        if (dropdownEmail) dropdownEmail.textContent = email;
    }

    // Utility method to expand a specific sidebar section
    expandSidebarSection(section) {
        const item = document.querySelector(`[data-section="${section}"]`);
        if (item && item.classList.contains('expandable')) {
            item.classList.add('expanded');
            this.sidebarExpanded[section] = true;
            this.saveSidebarState();
        }
    }

    // Utility method to collapse a specific sidebar section
    collapseSidebarSection(section) {
        const item = document.querySelector(`[data-section="${section}"]`);
        if (item && item.classList.contains('expandable')) {
            item.classList.remove('expanded');
            this.sidebarExpanded[section] = false;
            this.saveSidebarState();
        }
    }

    // Set active page based on current URL
    setActivePageFromURL() {
        const currentPage = window.location.pathname.split('/').pop();

        // Remove active class from all links
        if (this.sidebarLinks) {
            this.sidebarLinks.forEach(l => l.classList.remove('active'));
        }
        if (this.sidebarSublinks) {
            this.sidebarSublinks.forEach(l => l.classList.remove('active'));
        }

        // Find and activate the matching link
        const allLinks = [...(this.sidebarLinks || []), ...(this.sidebarSublinks || [])];
        const activeLink = allLinks.find(link => {
            const href = link.getAttribute('href');
            return href && href.includes(currentPage);
        });

        if (activeLink) {
            activeLink.classList.add('active');

            // If it's a sublink, expand its parent group
            const parentGroup = activeLink.closest('.sidebar-group');
            if (parentGroup && activeLink.classList.contains('sidebar-sublink')) {
                parentGroup.classList.add('expanded');
                const submenu = parentGroup.querySelector('.sidebar-submenu');
                if (submenu) {
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                }
            }
        }
    }
}

// Initialize the navbar when the DOM is loaded (with conflict prevention)
document.addEventListener('DOMContentLoaded', async () => {
    // Only initialize if not already initialized
    if (!window.navbarManager) {
        try {
            window.navbarManager = new NavbarManager();
            console.log('NavbarManager auto-initialized');
        } catch (error) {
            console.error('Failed to auto-initialize navbar:', error);
        }
    } else {
        console.log('NavbarManager already exists, skipping auto-initialization');
    }
});

// Utility function to load navbar into any page
window.loadNavbar = async function() {
    if (!window.navbarManager) {
        window.navbarManager = new NavbarManager();
    }
    return window.navbarManager;
};

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavbarManager;
}
