const { initializeApp, cert, getApps } = require("firebase-admin/app");
const fs = require("fs");
const path = require("path");

let serviceAccount;

// Render Secret File path
const renderSecretPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

//console.log("admin ", admin);
// Local file path
const localPath = path.join(
  __dirname,
  "..",
  "credentials",
  "firebase-service-account.json"
);
console.log("Loading from:", localPath);
console.log("Exists:", fs.existsSync(localPath));

try {
  if (renderSecretPath && fs.existsSync(renderSecretPath)) {
    console.log("Using Firebase service account from Render Secret File");
    serviceAccount = require(renderSecretPath);
  } else {
    console.log("Using local Firebase service account file");
    serviceAccount = require(localPath);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:");
  console.error(error);
  throw error;
}

module.exports = {};