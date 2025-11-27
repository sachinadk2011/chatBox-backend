const { profile } = require('console');
const moongoose = require('mongoose');
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
    googleUser:{
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        default: null,
        required: function() {
            return !this.googleUser;
        } 
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
      },
      onlineStatus:{
        type: Boolean,
        default: false
      },
      lastActive:{
        type: Date,
        default: null
      },
      profile_Url:{
        type: String,
        default: null
      },
      public_id:{
        type: String,
        default: null
    }
});
UserSchema.index({ name: 'text' });//only name field is indexed for searching
const User = moongoose.model('user', UserSchema);
module.exports = User;