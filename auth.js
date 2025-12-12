// Authentication Helper
const AUTH_API = 'http://localhost:3002/api/auth';

class AuthManager {
    static getToken() {
        return localStorage.getItem('token');
    }
    
    static setToken(token) {
        localStorage.setItem('token', token);
    }
    
    static removeToken() {
        localStorage.removeItem('token');
    }
    
    static getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    static setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    static removeUser() {
        localStorage.removeItem('user');
    }
    
    static isLoggedIn() {
        return !!this.getToken();
    }
    
    static isStudent() {
        const user = this.getUser();
        return user && user.role === 'student';
    }
    
    static isFaculty() {
        const user = this.getUser();
        return user && user.role === 'faculty';
    }
    
    static isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }
    
    static async logout() {
        try {
            await fetch(`${AUTH_API}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.removeToken();
        this.removeUser();
        window.location.href = 'login-page.html';
    }
    
    static getAuthHeader() {
        return {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json'
        };
    }
}

// Protect pages - redirect to login if not authenticated
function checkAuthentication() {
    if (!AuthManager.isLoggedIn()) {
        window.location.href = 'login-page.html';
        return false;
    }
    
    return true;
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages that don't require authentication
    const publicPages = ['login-page.html', 'register.html', 'index.html', 'home.html'];
    
    // Check if current page requires authentication
    if (!publicPages.includes(currentPage) && !currentPage.includes('login') && !currentPage.includes('register')) {
        checkAuthentication();
    }
    
    // Setup authentication buttons (login/logout) on navbar
    setupAuthButtons();
});

function setupAuthButtons() {
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navMenu) return;
    
    // Remove existing auth buttons if any
    const existingAuthItem = document.getElementById('authNavItem');
    if (existingAuthItem) {
        existingAuthItem.remove();
    }
    
    const isLoggedIn = AuthManager.isLoggedIn();
    const user = AuthManager.getUser();
    
    const authItem = document.createElement('li');
    authItem.id = 'authNavItem';
    
    if (isLoggedIn) {
        // Show logged-in user info and logout button
        authItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; color: white; padding: 8px 16px; border-radius: 25px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);">
                <span style="font-weight: 500; font-size: 14px;">
                    <i class="fas fa-user-circle"></i> ${user?.name || 'User'}
                </span>
                <button id="logoutBtn" style="background: #e74c3c; border: none; color: white; cursor: pointer; font-size: 13px; padding: 6px 12px; border-radius: 6px; font-weight: 600; transition: all 0.3s ease;" onclick="AuthManager.logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
    } else {
        // Show login and register buttons
        authItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <a href="login-page.html" style="background: #3498db; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.3s ease;" onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
                <a href="register.html" style="background: #27ae60; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.3s ease;" onmouseover="this.style.background='#229954'" onmouseout="this.style.background='#27ae60'">
                    <i class="fas fa-user-plus"></i> Register
                </a>
            </div>
        `;
    }
    
    navMenu.appendChild(authItem);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
