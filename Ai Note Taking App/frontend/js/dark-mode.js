// Dark Mode Functionality
(function() {
    // Function to get DOM elements after they're loaded
    function initDarkMode() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        
        if (!themeToggle || !themeIcon) {
            console.error('Theme toggle elements not found, retrying in 500ms');
            setTimeout(initDarkMode, 500);
            return;
        }
        
        console.log('Dark mode initialized with toggle button:', themeToggle);
        
        // Check for saved theme preference or use the system preference
        const getPreferredTheme = () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                return savedTheme;
            }
            
            // Check if system prefers dark mode
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };
        
        // Apply the theme
        const applyTheme = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            
            // Update the icon
            themeIcon.className = theme === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
            
            // Save the preference
            localStorage.setItem('theme', theme);
            console.log('Theme applied:', theme);
        };
        
        // Toggle theme
        const toggleTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        };
        
        // Event listeners
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
        
        // Initialize theme
        const preferredTheme = getPreferredTheme();
        applyTheme(preferredTheme);
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
        
        // Expose functions to window for potential use in other scripts
        window.themeUtils = {
            getPreferredTheme,
            applyTheme,
            toggleTheme
        };
    }
    
    // Initialize when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkMode);
    } else {
        initDarkMode();
    }
})();