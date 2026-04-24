const admin = require('firebase-admin');

let isInitialized = false;
let initError = null;

function initFirebaseAdmin() {
  if (isInitialized || admin.apps.length > 0) {
    isInitialized = true;
    return true;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return false;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    isInitialized = true;
    initError = null;
    return true;
  } catch (error) {
    isInitialized = false;
    initError = error instanceof Error ? error.message : 'Unknown Firebase Admin initialization error';
    return false;
  }
}

async function verifyFirebaseToken(req, res, next) {
  const authRequired = process.env.FIREBASE_AUTH_REQUIRED === 'true';
  const adminReady = initFirebaseAdmin();

  if (!authRequired) {
    return next();
  }

  if (!adminReady) {
    return res.status(500).json({
      success: false,
      message: 'Firebase Admin belum dikonfigurasi. Isi FIREBASE_ADMIN_* di env backend.',
    });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing Bearer token' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
  }
}

module.exports = {
  initFirebaseAdmin,
  verifyFirebaseToken,
  getFirebaseAdminInitError: () => initError,
};
