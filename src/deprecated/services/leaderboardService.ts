import { getUsersByPoints } from './for_removal/betStorageService';

// Function to get top users for the leaderboard
export const getTopUsers = async (isFullRefresh: boolean = false): Promise<any[]> => {
  try {
    // Get users sorted by DARE points
    const users = await getUsersByPoints();
    
    // Process users if needed
    return users.map(user => ({
      ...user,
      is_mock: false // Mark as real users
    }));
  } catch (error) {
    console.error('Error fetching top users for leaderboard:', error);
    return [];
  }
}; 