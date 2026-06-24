const mongoose = require('mongoose');
const {Schema } = mongoose;


const UserSessionSchema = new Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    deviceId: {
        type: String,
        required: true
    },
    deviceName: {
        type: String,
        default: null
    },
    browser: {
        type: String,
        default: null
    },
    OS: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    refreshToken: {
        type: String,
        default: null
    },
    fcmToken: {
        type: String,
        default: null
    },
    isActive:{
        type: Boolean,
        default: true
    },
    lastLogin:{
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    
    timestamps: true
    

});

UserSessionSchema.index({
    userId: 1,
    deviceId: 1
    }, 
    { unique: true }
);

const Session = mongoose.model('session', UserSessionSchema);
module.exports = Session;