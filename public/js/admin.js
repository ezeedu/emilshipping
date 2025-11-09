// Emil Shipping Admin Panel - Complete Rewrite
// Initialize Supabase client
let supabase;

// Global variables
let packages = [];
let currentUser = null;
let isAuthenticated = false;

// Configuration
const CONFIG = {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    API_BASE_URL: window.location.origin
};

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing Admin Panel...');
    
    try {
        // Initialize Supabase
        await initializeSupabase();
        
        // Check authentication
        await checkAuthentication();
        
        // Initialize navigation
        initializeAdminNavigation();
        
        // Setup form handlers
        setupFormHandlers();
        
        // Load initial data if authenticated
        if (isAuthenticated) {
            await loadPackages();
            updateStats();
        }
        
        console.log('✅ Admin Panel initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize admin panel:', error);
        showAlert('error', 'Failed to initialize admin panel: ' + error.message);
    }
});

// Initialize Supabase
async function initializeSupabase() {
    try {
        // Wait for Supabase CDN to load
        let retries = 0;
        while (typeof window.supabase === 'undefined' && retries < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase CDN failed to load');
        }
        
        // Fetch configuration from server
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) {
            throw new Error('Failed to fetch configuration');
        }
        
        const config = await configResponse.json();
        CONFIG.SUPABASE_URL = config.supabaseUrl;
        CONFIG.SUPABASE_ANON_KEY = config.supabaseAnonKey;
        
        // Initialize Supabase client
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        
        console.log('✅ Supabase initialized');
        
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        throw error;
    }
}

// Authentication functions
async function checkAuthentication() {
    try {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Auth error:', error);
            redirectToLogin();
            return;
        }

        if (!session) {
            console.log('No active session found');
            redirectToLogin();
            return;
        }

        currentUser = session.user;
        isAuthenticated = true;
        updateUserInfo();
        
        console.log('✅ User authenticated:', currentUser.email);
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'SIGNED_OUT' || !session) {
                handleLogout();
            }
        });

    } catch (error) {
        console.error('❌ Authentication check failed:', error);
        redirectToLogin();
    }
}

function updateUserInfo() {
    if (currentUser) {
        const userNameElements = document.querySelectorAll('.user-name');
        const userRoleElements = document.querySelectorAll('.user-role');
        
        userNameElements.forEach(element => {
            element.textContent = currentUser.email || 'Admin User';
        });
        
        userRoleElements.forEach(element => {
            element.textContent = 'Administrator';
        });
    }
}

function redirectToLogin() {
    console.log('Redirecting to login...');
    isAuthenticated = false;
    currentUser = null;
    window.location.href = '/signin.html';
}

async function logout() {
    console.log('🔓 Logging out...');
    
    try {
        if (supabase) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Logout error:', error);
            }
        }
        
        handleLogout();
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        handleLogout(); // Force logout even if there's an error
    }
}

function handleLogout() {
    // Clear user data
    currentUser = null;
    isAuthenticated = false;
    packages = [];
    
    // Clear UI
    clearPackagesTable();
    clearStats();
    
    // Redirect to login
    redirectToLogin();
}

// Navigation functionality
function initializeAdminNavigation() {
    const navToggle = document.querySelector('.admin-nav-toggle');
    const navMenu = document.querySelector('.admin-nav');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.admin-nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }
}

// Form handlers
function setupFormHandlers() {
    // Create package form
    const createForm = document.getElementById('createPackageForm');
    if (createForm) {
        createForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createPackage();
        });
    }

    // Update location form
    const updateForm = document.getElementById('updateLocationForm');
    if (updateForm) {
        updateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updatePackageLocation();
        });
    }
}

// Package management functions
async function createPackage() {
    console.log('📦 Creating new package...');
    
    if (!isAuthenticated) {
        showAlert('error', 'Please log in to create packages');
        return;
    }
    
    const form = document.getElementById('createPackageForm');
    const formData = new FormData(form);
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    
    const packageData = {
        // Sender Information
        senderName: formData.get('senderName'),
        senderEmail: formData.get('senderEmail') || currentUser?.email || 'admin@emilshipping.com',
        senderAddress: formData.get('senderAddress'),
        senderPhone: formData.get('senderPhone'),
        origin: formData.get('origin'),
        
        // Receiver Information
        receiverName: formData.get('receiverName'),
        receiverEmail: formData.get('receiverEmail'),
        receiverAddress: formData.get('receiverAddress'),
        receiverPhone: formData.get('receiverPhone'),
        destination: formData.get('destination'),
        
        // Package Details
        packageDescription: formData.get('packageDescription'),
        packageQuantity: parseInt(formData.get('quantity')) || 1,
        weight: parseFloat(formData.get('weight')?.replace(/[^\d.]/g, '')) || 0,
        totalCharges: parseFloat(formData.get('totalCharges')?.replace(/[^\d.]/g, '')) || 0
    };

    try {
        const response = await fetch('/api/packages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(packageData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert('success', `Package created successfully! Tracking ID: ${result.trackingId}`);
            form.reset();
            await loadPackages(); // Refresh the packages list
            updateStats();
            
            // Switch to manage tab to show the new package
            switchTab('manage');
        } else {
            showAlert('error', result.error || 'Error creating package');
        }
    } catch (error) {
        console.error('❌ Error creating package:', error);
        showAlert('error', 'Network error. Please try again.');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function loadPackages() {
    console.log('📋 Loading packages...');
    
    if (!isAuthenticated) {
        console.log('Not authenticated, skipping package load');
        return;
    }
    
    try {
        const response = await fetch('/api/packages', {
            headers: {
                'Authorization': `Bearer ${currentUser?.access_token || ''}`
            }
        });
        
        if (response.ok) {
            packages = await response.json();
            console.log(`✅ Loaded ${packages.length} packages`);
            updatePackagesTable();
            updateStats();
        } else {
            console.error('❌ Error loading packages:', response.status, response.statusText);
            
            if (response.status === 401) {
                showAlert('error', 'Session expired. Please log in again.');
                redirectToLogin();
                return;
            }
            
            showAlert('error', `Failed to load packages (${response.status})`);
            packages = [];
            updatePackagesTable();
            updateStats();
        }
    } catch (error) {
        console.error('❌ Error loading packages:', error);
        showAlert('error', 'Network error loading packages. Please check your connection.');
        packages = [];
        updatePackagesTable();
        updateStats();
    }
}

function updatePackagesTable() {
    const tbody = document.getElementById('packagesTableBody');
    
    if (!tbody) {
        console.warn('Packages table body not found');
        return;
    }
    
    if (packages.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">
                    <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    No packages found. Create your first package to get started.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = packages.map(pkg => `
        <tr>
            <td>
                <span class="tracking-id" style="font-family: monospace; font-weight: bold; color: #3b82f6;">
                    ${pkg.tracking_id}
                </span>
            </td>
            <td>
                <div>
                    <div style="font-weight: 500; color: #1f2937;">${pkg.receiver_name || 'N/A'}</div>
                    <div style="font-size: 0.8rem; color: #6b7280;">${pkg.receiver_email || 'N/A'}</div>
                </div>
            </td>
            <td>
                <span class="status-badge ${getStatusClass(pkg.status)}">
                    ${pkg.status || 'pending'}
                </span>
            </td>
            <td>
                <div style="font-size: 0.9rem; color: #4b5563;">
                    ${pkg.destination || 'N/A'}
                </div>
            </td>
            <td>${formatDate(pkg.created_at)}</td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn-sm btn-primary" onclick="openUpdateModal('${pkg.tracking_id}')" title="Update Location">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                    <button class="btn-sm btn-warning" onclick="viewTimeline('${pkg.tracking_id}')" title="View Timeline">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="btn-sm btn-success" onclick="generatePackagePDF('${pkg.tracking_id}')" title="Download PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn-sm btn-danger" onclick="deletePackage('${pkg.tracking_id}')" title="Delete Package">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to dynamically created action buttons
    setTimeout(() => {
        const actionButtons = document.querySelectorAll('.action-buttons button[onclick]');
        actionButtons.forEach(btn => {
            if (!btn.hasAttribute('data-listener-added')) {
                btn.setAttribute('data-listener-added', 'true');
                const onclick = btn.getAttribute('onclick');
                
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    try {
                        // Extract function name and parameter from onclick
                        if (onclick.includes('openUpdateModal')) {
                            const match = onclick.match(/openUpdateModal\('([^']+)'\)/);
                            if (match) {
                                console.log('🔧 Opening update modal for:', match[1]);
                                openUpdateModal(match[1]);
                            }
                        } else if (onclick.includes('viewTimeline')) {
                            const match = onclick.match(/viewTimeline\('([^']+)'\)/);
                            if (match) {
                                console.log('🔧 Viewing timeline for:', match[1]);
                                viewTimeline(match[1]);
                            }
                        } else if (onclick.includes('generatePackagePDF')) {
                            const match = onclick.match(/generatePackagePDF\('([^']+)'\)/);
                            if (match) {
                                console.log('🔧 Generating PDF for:', match[1]);
                                generatePackagePDF(match[1]);
                            }
                        } else if (onclick.includes('deletePackage')) {
                            const match = onclick.match(/deletePackage\('([^']+)'\)/);
                            if (match) {
                                console.log('🔧 Deleting package:', match[1]);
                                deletePackage(match[1]);
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error executing action button:', error);
                    }
                });
            }
        });
    }, 100);
}

function clearPackagesTable() {
    const tbody = document.getElementById('packagesTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">
                    Please log in to view packages.
                </td>
            </tr>
        `;
    }
}

function updateStats() {
    if (!packages || packages.length === 0) {
        clearStats();
        return;
    }
    
    const total = packages.length;
    const delivered = packages.filter(pkg => pkg.status && pkg.status.toLowerCase().includes('delivered')).length;
    const transit = packages.filter(pkg => pkg.status && (
        pkg.status.toLowerCase().includes('transit') || 
        pkg.status.toLowerCase().includes('shipping') ||
        pkg.status.toLowerCase().includes('delivery')
    )).length;
    const pending = packages.filter(pkg => pkg.status && (
        pkg.status.toLowerCase().includes('pending') || 
        pkg.status.toLowerCase().includes('created') ||
        pkg.status.toLowerCase().includes('processing')
    )).length;

    updateStatElement('totalPackages', total);
    updateStatElement('deliveredPackages', delivered);
    updateStatElement('transitPackages', transit);
    updateStatElement('pendingPackages', pending);
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function clearStats() {
    updateStatElement('totalPackages', 0);
    updateStatElement('deliveredPackages', 0);
    updateStatElement('transitPackages', 0);
    updateStatElement('pendingPackages', 0);
}

function getStatusClass(status) {
    if (!status) return 'pending';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return 'delivered';
    if (statusLower.includes('transit') || statusLower.includes('shipping') || statusLower.includes('delivery')) return 'transit';
    return 'pending';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid Date';
    }
}

// Tab switching
function switchTab(tabName, event) {
    console.log(`🔄 Switching to ${tabName} tab`);
    
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Find and activate the clicked tab
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find the tab by tabName
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            if ((tabName === 'create' && tab.textContent.includes('Create Package')) ||
                (tabName === 'manage' && tab.textContent.includes('Manage Packages'))) {
                tab.classList.add('active');
            }
        });
    }

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Reload packages if switching to manage tab
    if (tabName === 'manage' && isAuthenticated) {
        loadPackages();
    }
}

// Modal functions
function openUpdateModal(trackingId) {
    console.log(`📝 Opening update modal for ${trackingId}`);
    
    const pkg = packages.find(p => p.tracking_id === trackingId);
    if (!pkg) {
        showAlert('error', 'Package not found');
        return;
    }

    // Populate modal fields
    document.getElementById('updatePackageId').value = pkg.tracking_id;
    document.getElementById('updateTrackingId').value = pkg.tracking_id;
    document.getElementById('updateStatus').value = '';
    document.getElementById('updateLocation').value = '';
    document.getElementById('updateNote').value = '';

    // Show modal
    const modal = document.getElementById('updateModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('updateModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function updatePackageLocation() {
    console.log('📍 Updating package location...');
    
    if (!isAuthenticated) {
        showAlert('error', 'Please log in to update packages');
        return;
    }
    
    const form = document.getElementById('updateLocationForm');
    const formData = new FormData(form);
    
    const trackingId = formData.get('packageId');
    const updateData = {
        status: formData.get('status'),
        location: formData.get('location'),
        description: formData.get('note') || ''
    };

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`/api/packages/${trackingId}/location`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser?.access_token || ''}`
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('success', 'Package location updated successfully!');
            closeModal();
            await loadPackages(); // Refresh the packages list
            updateStats();
        } else {
            showAlert('error', result.error || 'Error updating package location');
        }
    } catch (error) {
        console.error('❌ Error updating package:', error);
        showAlert('error', 'Network error. Please try again.');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function viewTimeline(trackingId) {
    console.log(`📅 Viewing timeline for ${trackingId}`);
    
    try {
        const response = await fetch(`/api/tracking/${trackingId}`);
        
        if (!response.ok) {
            showAlert('error', 'Failed to load package timeline');
            return;
        }
        
        const pkg = await response.json();
        const timelineContent = document.getElementById('packageTimelineContent');
        
        if (!timelineContent) {
            showAlert('error', 'Timeline modal not found');
            return;
        }
        
        timelineContent.innerHTML = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 0.5rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">Package: ${pkg.trackingId}</h4>
                <p style="margin: 0; color: #6b7280; font-weight: 500;">${pkg.packageDescription || 'No description'}</p>
                <div style="margin-top: 0.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <p style="margin: 0; color: #6b7280;"><strong>From:</strong> ${pkg.origin || 'N/A'}</p>
                    <p style="margin: 0; color: #6b7280;"><strong>To:</strong> ${pkg.destination || 'N/A'}</p>
                </div>
            </div>
            
            <div class="timeline">
                ${pkg.locationHistory && pkg.locationHistory.length > 0 ? 
                    pkg.locationHistory.map((item, index) => `
                        <div class="timeline-item ${item.status && item.status.toLowerCase().includes('delivered') ? 'delivered' : ''} ${index === 0 ? 'latest' : ''}">
                            <div class="timeline-content">
                                <div class="timeline-status" style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem;">
                                    ${item.status || 'Status Update'}
                                </div>
                                <div class="timeline-location" style="margin-bottom: 0.25rem;">
                                    <i class="fas fa-map-marker-alt" style="margin-right: 0.5rem; color: #ef4444;"></i>
                                    ${item.location || 'Location not specified'}
                                </div>
                                <div class="timeline-time" style="margin-bottom: 0.5rem; color: #6b7280; font-size: 0.9rem;">
                                    <i class="fas fa-clock" style="margin-right: 0.5rem;"></i>
                                    ${formatDate(item.timestamp)}
                                </div>
                                ${item.description ? `<div class="timeline-note" style="padding: 0.5rem; background: #f3f4f6; border-radius: 0.25rem; font-style: italic;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `).join('') :
                    '<div style="text-align: center; padding: 2rem; color: #6b7280;"><i class="fas fa-clock" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>No timeline updates available yet.</div>'
                }
            </div>
        `;

        const timelineModal = document.getElementById('timelineModal');
        if (timelineModal) {
            timelineModal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Error loading timeline:', error);
        showAlert('error', 'Network error loading timeline');
    }
}

function closeTimelineModal() {
    const modal = document.getElementById('timelineModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function deletePackage(trackingId) {
    console.log(`🗑️ Deleting package ${trackingId}`);
    
    if (!isAuthenticated) {
        showAlert('error', 'Please log in to delete packages');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete package ${trackingId}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/packages/${trackingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentUser?.access_token || ''}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('success', 'Package deleted successfully!');
            await loadPackages(); // Refresh the packages list
            updateStats();
        } else {
            showAlert('error', result.error || 'Error deleting package');
        }
    } catch (error) {
        console.error('❌ Error deleting package:', error);
        showAlert('error', 'Network error. Please try again.');
    }
}

// Utility functions
function showAlert(type, message) {
    console.log(`📢 Alert (${type}): ${message}`);
    
    // Try to find specific alert elements first
    let alertElement = null;
    let textElement = null;
    
    if (type === 'success') {
        alertElement = document.getElementById('createSuccess') || document.getElementById('updateSuccess');
        textElement = document.getElementById('createSuccessText') || document.getElementById('updateSuccessText');
    } else if (type === 'error') {
        alertElement = document.getElementById('createError') || document.getElementById('updateError');
        textElement = document.getElementById('createErrorText') || document.getElementById('updateErrorText');
    }
    
    // If specific elements not found, create a generic alert
    if (!alertElement) {
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.admin-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `admin-alert alert ${type === 'success' ? 'success' : 'error'}`;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
        `;
        
        alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; margin-left: auto;">&times;</button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
        
        return;
    }
    
    // Use existing alert elements
    if (textElement) {
        textElement.textContent = message;
    }
    
    if (alertElement) {
        alertElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const updateModal = document.getElementById('updateModal');
    const timelineModal = document.getElementById('timelineModal');
    
    if (event.target === updateModal) {
        closeModal();
    }
    if (event.target === timelineModal) {
        closeTimelineModal();
    }
}

// Make functions globally available
window.switchTab = switchTab;
window.logout = logout;
window.openUpdateModal = openUpdateModal;
window.closeModal = closeModal;
window.viewTimeline = viewTimeline;
window.closeTimelineModal = closeTimelineModal;
window.deletePackage = deletePackage;
window.createPackage = createPackage;
window.updatePackageLocation = updatePackageLocation;

// Debug: Ensure functions are accessible
console.log('🔧 Admin functions exposed:', {
    switchTab: typeof window.switchTab,
    logout: typeof window.logout,
    openUpdateModal: typeof window.openUpdateModal,
    closeModal: typeof window.closeModal,
    viewTimeline: typeof window.viewTimeline,
    closeTimelineModal: typeof window.closeTimelineModal,
    deletePackage: typeof window.deletePackage,
    createPackage: typeof window.createPackage,
    updatePackageLocation: typeof window.updatePackageLocation
});

// Ensure DOM is loaded before binding events
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded, binding backup event listeners...');
    
    // Add click event listeners as backup for logout buttons
    const logoutBtns = document.querySelectorAll('[onclick*="logout"]');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔓 Logout button clicked via event listener');
            logout();
        });
    });
    
    // Add click event listeners as backup for tab buttons
    const tabBtns = document.querySelectorAll('[onclick*="switchTab"]');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const onclick = btn.getAttribute('onclick');
            const match = onclick.match(/switchTab\('([^']+)',\s*event\)/);
            if (match) {
                console.log('🔄 Tab button clicked via event listener:', match[1]);
                switchTab(match[1], e);
            }
        });
    });
    
    // Add backup listeners for other action buttons
    setTimeout(() => {
        const actionBtns = document.querySelectorAll('[onclick]');
        actionBtns.forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            if (onclick && !btn.hasAttribute('data-backup-listener')) {
                btn.setAttribute('data-backup-listener', 'true');
                btn.addEventListener('click', function(e) {
                    try {
                        // Try to execute the onclick function
                        const func = new Function('event', onclick);
                        func.call(this, e);
                    } catch (error) {
                        console.error('❌ Error executing onclick:', error);
                    }
                });
            }
        });
    }, 1000);
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeSupabase,
        checkAuthentication,
        loadPackages,
        createPackage,
        updatePackageLocation,
        deletePackage
    };
}

// PDF Generation Function
async function generatePackagePDF(trackingId) {
    try {
        console.log('🔄 Generating PDF for tracking ID:', trackingId);
        
        // Check if jsPDF is available
        if (!window.jspdf) {
            throw new Error('jsPDF library not loaded');
        }
        
        // Get package data
        const { data: packageData, error } = await supabase
            .from('packages')
            .select('*')
            .eq('tracking_id', trackingId)
            .single();

        if (error || !packageData) {
            throw new Error('Package not found');
        }

        console.log('📦 Package data retrieved:', packageData);

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        console.log('📄 jsPDF initialized successfully');
        
        // Set up colors and fonts
        const primaryColor = [41, 128, 185]; // #2980b9
        const textColor = [51, 51, 51]; // #333333
        const lightGray = [128, 128, 128]; // #808080
        
        // Company Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 25, 'F');
        
        // Company Logo (Text-based for now)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('EMIL SHIPPING', 20, 17);
        
        // Company Info
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Head Office: 65 Ramsgate Rd, Wigginton, YO32 2WX, United Kingdom', 20, 22);
        
        // Generate QR Code (with fallback)
        try {
            if (typeof QRCode !== 'undefined') {
                const qrCodeDataURL = await QRCode.toDataURL('https://www.emilshipping.com', {
                    width: 60,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                // Add QR Code to PDF
                doc.addImage(qrCodeDataURL, 'PNG', 150, 5, 15, 15);
            } else {
                // Fallback: Draw a simple QR code placeholder
                doc.setFillColor(0, 0, 0);
                doc.rect(150, 5, 15, 15, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(6);
                doc.text('QR', 155, 13);
            }
        } catch (error) {
            console.warn('QR Code generation failed, using placeholder:', error);
            // Fallback: Draw a simple QR code placeholder
            doc.setFillColor(0, 0, 0);
            doc.rect(150, 5, 15, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6);
            doc.text('QR', 155, 13);
        }
        
        // Contact Information (right side)
        doc.setTextColor(...textColor);
        doc.setFontSize(8);
        doc.text('Email: contact247@totalairtrustservices.com', 170, 8);
        doc.text('Website: https://totalairtrustservices.com', 170, 12);
        doc.text('Tel: +61745489229', 170, 16);
        
        // Tracking Number
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Tracking Number: ${trackingId}`, 20, 40);
        
        // FROM (SENDER) Section
        doc.setFillColor(41, 128, 185);
        doc.rect(20, 50, 80, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('FROM (SENDER)', 22, 56);
        
        // Sender Information
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        let yPos = 65;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Sender:', 22, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(packageData.sender_name || 'N/A', 45, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Address:', 22, yPos);
        doc.setFont('helvetica', 'normal');
        const senderAddress = packageData.sender_address || 'N/A';
        const senderAddressLines = doc.splitTextToSize(senderAddress, 50);
        doc.text(senderAddressLines, 45, yPos);
        yPos += senderAddressLines.length * 4 + 2;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Phone No:', 22, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(packageData.sender_phone || 'N/A'), 45, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Origin:', 22, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(packageData.origin || 'N/A', 45, yPos);
        
        // TO (RECEIVER) Section
        doc.setFillColor(41, 128, 185);
        doc.rect(110, 50, 80, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TO (RECEIVER)', 112, 56);
        
        // Receiver Information
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        yPos = 65;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Receiver:', 112, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(packageData.receiver_name || 'N/A', 135, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Address:', 112, yPos);
        doc.setFont('helvetica', 'normal');
        const receiverAddress = packageData.receiver_address || packageData.destination || 'N/A';
        const receiverAddressLines = doc.splitTextToSize(receiverAddress, 50);
        doc.text(receiverAddressLines, 135, yPos);
        yPos += receiverAddressLines.length * 4 + 2;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Email:', 112, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(packageData.receiver_email || 'N/A', 135, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Phone No:', 112, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(packageData.receiver_phone || 'N/A'), 135, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Destination:', 112, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(packageData.destination || 'N/A', 135, yPos);
        
        // SIZE AND WEIGHT Section
        doc.setFillColor(41, 128, 185);
        doc.rect(20, 130, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('SIZE AND WEIGHT', 22, 136);
        
        // Package Details
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        yPos = 145;
        
        doc.setFont('helvetica', 'bold');
        doc.text('No of Pieces:', 22, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(packageData.package_quantity || 1), 55, yPos);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Weight:', 110, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(packageData.weight || 0) + 'kg', 135, yPos);
        yPos += 10;
        
        // Shipment Details
        doc.setFont('helvetica', 'bold');
        doc.text('Shipment:', 22, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(packageData.package_description || 'Package shipment', 55, yPos);
        yPos += 10;
        
        // Total Charges
        // Total Charges with Custom Duties
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(220, 53, 69); // Red color for emphasis
        if (packageData.total_charges) {
            doc.text(`Total Charges: Receiver to pay $${packageData.total_charges} for customs duties`, 22, yPos);
        } else {
            doc.text('Total Charges: Contact for pricing', 22, yPos);
        }
        
        // Date only (status removed since DISPATCHED stamp is included)
        yPos += 10;
        doc.setTextColor(...textColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Created:', 22, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(packageData.created_at).toLocaleDateString(), 55, yPos);
        
        // Footer with terms
        yPos = 220;
        doc.setFontSize(8);
        doc.setTextColor(...lightGray);
        doc.text('Any shortage or damage must be notified within 72hours of receipt of goods. Complaints can only be accepted if made in writing', 20, yPos);
        doc.text('within 30days of receipt of goods. No goods may be returned without prior authorization from Total Air Trust Services', 20, yPos + 4);
        
        // Signature section (left side)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textColor); // Reset to normal text color
        doc.text('Signature:', 20, 190);
        
        // Add signature line
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(20, 200, 80, 200); // Horizontal line for signature
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Authorized Officer', 20, 210);
        
        // DISPATCHED stamp (right side)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69); // Red color
        doc.text('DISPATCHED', 130, 200);
        
        // Save the PDF
        const fileName = `Emil_Shipping_${trackingId}.pdf`;
        console.log('💾 Attempting to save PDF:', fileName);
        doc.save(fileName);
        
        console.log('✅ PDF generated successfully:', fileName);
        
        // Show success message
        showAlert('PDF downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        showAlert('Error generating PDF: ' + error.message, 'error');
    }
}

console.log('📋 Admin.js loaded successfully');