const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middlewire/fetchuser');
const checkFriends = require('../middlewire/checkFriends');

//Route 1: fetch all Friends list using get: "/api/friends/fetchallfriends". Login required
router.get('/fetchallfriends', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const user = await User.findById(userId).populate('friends', 'name'); // Populate friends with name
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user.friends); // Return the friends list
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

//Route 2: receive friend request using post: "/api/friends/receivefriendrequest". Login required
router.post('/receivefriendrequest', fetchuser, checkFriends, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const { friendId, action } = req.body; // Get the friend ID from the request body

        if (!friendId || !action) {
            return res.status(400).json({ error: "Friend ID and action are required" });
            
        }


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Add friendId to the user's friends list when user accepts the request
        if (action === 'accept') {
            user.friends.push(friendId);
            user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId); // Remove from friend requests
        }
        if (action === 'reject') {
            user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId); // Remove from friend requests
        }
        await user.save();

        res.json({ message: "Friend request accepted", friends: user.friends });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

//Route 3: Send friend request using post: "/api/friends/sendfriendrequest". Login required 
router.post('/sendfriendrequest', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const { friendId } = req.body; // Get the friend ID from the request body

        const friend = await User.findById(friendId);

        const user = await User.findById(userId);
        if (!user || !friend) {
            return res.status(404).json({ error: "User or friend not found" });
        }

        // Add friendId to the user's sent requests list
        user.sentRequests.push(friendId);
        await user.save();

        res.json({ message: "Friend request sent", sentRequests: user.sentRequests });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
