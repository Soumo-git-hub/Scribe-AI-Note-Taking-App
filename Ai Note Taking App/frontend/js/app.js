// Add this to your document ready function or at the end of your JS file

// Set the user name in the navbar
function updateUserProfile() {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.name) {
        document.getElementById('user-name').textContent = userData.name;
    }
}

// Call this function when the page loads
updateUserProfile();

// Add event listener for logout button
document.getElementById('logout-button').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Clear user data from localStorage
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = 'login.html';
});

// For now, just show an alert for the settings option
document.getElementById('profile-settings').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Settings functionality will be implemented in a future update.');
});