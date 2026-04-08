const API_KEY = 'AIzaSyD9fbG0h0yaElx89KK-nB5iPTv-kvHW6xw';
const BASE_URL = 'https://identitytoolkit.googleapis.com/v1';

const users = [
  { email: 'admin@hunter-lease-test.com', password: 'TestPass2024' },
  { email: 'dealer@hunter-lease-test.com', password: 'TestPass2024' },
];

for (const user of users) {
  console.log(`\n=== ${user.email} ===`);

  // Try sign in first
  const signInRes = await fetch(`${BASE_URL}/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
  });
  const signInData = await signInRes.json();

  if (signInRes.ok) {
    console.log('Already works! UID:', signInData.localId);
    continue;
  }

  console.log('Sign-in failed:', signInData.error?.message);

  if (signInData.error?.message === 'EMAIL_NOT_FOUND') {
    // Create new user
    console.log('Creating user...');
    const createRes = await fetch(`${BASE_URL}/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
    });
    const createData = await createRes.json();
    if (createRes.ok) {
      console.log('Created! UID:', createData.localId);
    } else {
      console.log('Create failed:', createData.error?.message);
    }
  } else if (signInData.error?.message === 'INVALID_LOGIN_CREDENTIALS' || signInData.error?.message === 'INVALID_PASSWORD') {
    // User exists but no password (magic link user). Need admin SDK to set password.
    console.log('User exists without password. Trying to lookup...');
    
    // Try sending password reset email
    const resetRes = await fetch(`${BASE_URL}/accounts:sendOobCode?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: user.email })
    });
    const resetData = await resetRes.json();
    if (resetRes.ok) {
      console.log('Password reset email sent to', user.email);
    } else {
      console.log('Reset failed:', resetData.error?.message);
      // Last resort: delete and recreate
      console.log('Trying to create fresh user with signUp...');
      const createRes = await fetch(`${BASE_URL}/accounts:signUp?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
      });
      const createData = await createRes.json();
      console.log(createRes.ok ? `Created! UID: ${createData.localId}` : `Failed: ${createData.error?.message}`);
    }
  }
}
