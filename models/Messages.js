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
        required: true
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
        type: Boolean,
        default: false
    }
});
const Message = mongose.model('message', MessageSchema);
module.exports = Message;