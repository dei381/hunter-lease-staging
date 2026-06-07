import admin from 'firebase-admin';

// Initialize firebase if not already
if (!admin.apps.length) {
  admin.initializeApp();
}

async function run() {
  const db = admin.firestore();
  
  // mc_inventory
  const invSnap = await db.collection('mc_inventory').get();
  console.log('mc_inventory count:', invSnap.size);
  
  const batch = db.batch();
  invSnap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log('Deleted mc_inventory');

  // mc_incentives
  const incSnap = await db.collection('mc_incentives').get();
  console.log('mc_incentives count:', incSnap.size);
  const batch2 = db.batch();
  incSnap.docs.forEach(d => batch2.delete(d.ref));
  await batch2.commit();
  console.log('Deleted mc_incentives');

}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
