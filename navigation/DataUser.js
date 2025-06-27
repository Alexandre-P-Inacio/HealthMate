// DataUser.js - Simple user data management utility

class DataUser {
  constructor() {
    this.userData = null;
  }

  // Set user data
  setUserData(data) {
    this.userData = data;
    console.log('DataUser: User data set', data?.id ? `for user ${data.id}` : '');
  }

  // Get user data
  getUserData() {
    return this.userData;
  }

  // Clear user data
  clearUserData() {
    this.userData = null;
    console.log('DataUser: User data cleared');
  }

  // Check if user is logged in
  isLoggedIn() {
    return this.userData !== null && this.userData.id;
  }

  // Get user ID
  getUserId() {
    return this.userData?.id || null;
  }

  // Get user role
  getUserRole() {
    return this.userData?.role || 'patient';
  }

  // Update specific user data fields
  updateUserData(updates) {
    if (this.userData) {
      this.userData = { ...this.userData, ...updates };
      console.log('DataUser: User data updated');
    }
  }
}

// Export singleton instance
export default new DataUser(); 