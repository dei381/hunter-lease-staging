const API_KEY = 'AIzaSyD9fbG0h0yaElx89KK-nB5iPTv-kvHW6xw';

for (const email of ['admin@hunter-lease-test.com', 'dealer@hunter-lease-test.com']) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass2024', returnSecureToken: true })
  });
  const data = await res.json();
  console.log(`${email}: ${res.ok ? '✅ OK, UID=' + data.localId : '❌ ' + data.error?.message}`);
}
