import admin from 'firebase-admin';
import fs from 'fs';

const envContent = fs.readFileSync('C:/Users/noobi/Downloads/render_env.txt', 'utf8');
const saLine = envContent.split('\n').find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));
const saJson = saLine!.replace('FIREBASE_SERVICE_ACCOUNT_KEY=', '');
const serviceAccount = JSON.parse(saJson);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const users = [
  { email: 'admin@hunter-lease-test.com', password: 'TestPass2024' },
  { email: 'dealer@hunter-lease-test.com', password: 'TestPass2024' },
];

for (const u of users) {
  try {
    // Find existing user
    const userRecord = await admin.auth().getUserByEmail(u.email);
    console.log(`Found ${u.email} — UID: ${userRecord.uid}`);
    
    // Update password
    await admin.auth().updateUser(userRecord.uid, { password: u.password });
    console.log(`✅ Password set for ${u.email}`);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      // Create new user
      const newUser = await admin.auth().createUser({ email: u.email, password: u.password, emailVerified: true });
      console.log(`✅ Created ${u.email} — UID: ${newUser.uid}`);
    } else {
      console.error(`❌ Error for ${u.email}:`, err.message);
    }
  }
}

process.exit(0);
