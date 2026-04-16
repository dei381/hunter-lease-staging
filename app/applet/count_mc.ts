import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccountPath = './firebase-service-account.json';
if (fs.existsSync(serviceAccountPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
} else {
  admin.initializeApp();
}

async function count() {
  const db = admin.firestore();
  const snapshot = await db.collection('mc_inventory').count().get();
  console.log('Total mc_inventory:', snapshot.data().count);
  
  const activeSnapshot = await db.collection('mc_inventory').where('status', '==', 'active').count().get();
  console.log('Active mc_inventory:', activeSnapshot.data().count);
}

count().catch(console.error);
