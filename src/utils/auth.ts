import { auth } from '../firebase';

export const getAuthToken = async (): Promise<string> => {
  // First try to get Firebase token
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      return token;
    } catch (error) {
      console.error('Failed to get Firebase token:', error);
    }
  }
  
  // Fallback to legacy admin token if Firebase is not available
  return localStorage.getItem('admin_token') || '';
};
