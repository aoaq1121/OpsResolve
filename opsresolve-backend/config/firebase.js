const admin = require('firebase-admin');

// Path to your service account key (downloaded from Firebase)
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Optional: Use emulator for local development (skip if not using)
// process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

module.exports = { admin, db };