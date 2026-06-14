const mongoose = require('mongoose');
const mongooseUrl = process.env.DB_URL;

let _connected = false;

/** True only when Mongoose is currently connected to MongoDB */
const isDbConnected = () => _connected;

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongooseUrl);
    _connected = true;
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    _connected = false;
    console.error('Error connecting to MongoDB:', error.message);
    // Do NOT crash the process — let the DB-health middleware return 503
    // instead of the server hanging with no response.
  }
};

// Track live disconnects (e.g. Atlas maintenance, network blip)
mongoose.connection.on('disconnected', () => { _connected = false; });
mongoose.connection.on('reconnected',  () => { _connected = true;  });

module.exports = connectToMongo;
module.exports.isDbConnected = isDbConnected;