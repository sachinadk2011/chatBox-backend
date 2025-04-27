const moongoose = require('mongoose');
const { ref } = require('process');
const { Schema } = moongoose;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    friends: {
        type: [moongoose.Schema.Types.ObjectId],
        ref: 'user',
        default: []
    },
    friendRequests:{
        type:[moongoose.Schema.Types.ObjectId],
        ref: 'user',
        default: []
    },
    sentRequests:{
        type:[moongoose.Schema.Types.ObjectId],
        ref: 'user',
        default: []
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
UserSchema.index({ name: 'text' });//only name field is indexed for searching
const User = moongoose.model('user', UserSchema);
module.exports = User;