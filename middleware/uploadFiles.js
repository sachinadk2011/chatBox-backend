const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../uploads'); // relative to this file

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, uploadDir)},
  filename: (req, file, cb) => {
    return cb(null, Date.now() + path.extname(file.originalname))}
});

const upload = multer({ storage });
module.exports = upload;
