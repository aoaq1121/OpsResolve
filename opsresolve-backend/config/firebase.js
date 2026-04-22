const admin = require('firebase-admin');

// For development/demo purposes, we'll use a mock database instead of Firebase
// Uncomment the lines below and add your serviceAccountKey.json for production

// const serviceAccount = require('../serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
// const db = admin.firestore();

// Mock database for development
class MockFirestore {
  constructor() {
    this.collections = {
      records: [],
      conflicts: [],
      decisions: [],
      reviews: []
    };
  }

  collection(name) {
    let _orderByField = null;
    let _orderByDir = 'desc';
    let _limit = null;
    return {
      add: async (data) => {
        const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const doc = { id, ...data };
        this.collections[name].push(doc);
        console.log(`✅ Added to ${name}:`, id);
        return { id };
      },
      orderBy: function(field, dir = 'desc') {
        _orderByField = field;
        _orderByDir = dir;
        return this;
      },
      limit: function(n) {
        _limit = n;
        return this;
      },
      get: async () => {
        let docs = this.collections[name].slice();
        if (_orderByField) {
          docs.sort((a, b) => {
            if (_orderByDir === 'desc') {
              return (b[_orderByField] || '').localeCompare(a[_orderByField] || '');
            } else {
              return (a[_orderByField] || '').localeCompare(b[_orderByField] || '');
            }
          });
        }
        if (_limit !== null) {
          docs = docs.slice(0, _limit);
        }
        return {
          docs: docs.map(doc => ({
            id: doc.id,
            data: () => doc
          }))
        };
      },
      doc: (id) => ({
        get: async () => {
          const doc = this.collections[name].find(d => d.id === id);
          return {
            exists: !!doc,
            data: () => doc
          };
        },
        update: async (updates) => {
          const index = this.collections[name].findIndex(d => d.id === id);
          if (index !== -1) {
            this.collections[name][index] = { ...this.collections[name][index], ...updates };
            console.log(`✅ Updated ${name}:`, id);
          }
        }
      })
    };
  }
}

const db = new MockFirestore();

// Optional: Use emulator for local development (skip if not using)
// process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

module.exports = { admin, db };
