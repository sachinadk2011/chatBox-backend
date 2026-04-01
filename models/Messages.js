const mongose = require('mongoose');
const { Schema } = mongose;

const MessageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    types:{
        type: String,
        enum: ['text', 'image', 'video', 'file', 'audio', "multiple"],
        default: 'text'
        
    },
    message: {
        type: String,
        required: false,
        default: null
    },
    public_id:{
        type: String,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    }
});
const Message = mongose.model('message', MessageSchema);
module.exports = Message;