import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://qiasnpjpkhretlyymgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXNucGpwa2hyZXRseXltZ2giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOXVsWEgvsCnxB0FIVqZQvDNCuy3qYo';

console.log('Test Supabase connection with:');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 10) + '...');

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the connection
(async () => {
  console.log('Testing connection...');
  try {
    // First try a simple ping
    const { data: pingData, error: pingError } = await supabase.auth.getSession();
    console.log('Auth ping result:', pingError ? 'Error' : 'Success');
    
    if (pingError) {
      console.error('Auth ping error:', pingError);
    }
    
    // Try to fetch some data
    const { data, error } = await supabase
      .from('non_existent_table')
      .select('*')
      .limit(1);
      
    if (error && error.code === 'PGRST116') {
      console.log('Expected error for non-existent table - this is good!');
      console.log('Supabase connection is working correctly');
    } else if (error) {
      console.error('Unexpected error:', error);
    } else {
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('Exception during test:', err);
  }
})();

export {}; 