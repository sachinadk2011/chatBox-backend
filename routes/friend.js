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
        return res.status(200).json(user.friends); // Return the friends list
    } catch (error) {
        
        res.status(500).send("Internal Server Error");
    }
});

// Route 2: fetch all received friend requests using gets: "/api/friends/fetchallfriendrequests". Login required
router.get('/fetchallfriendrequests', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const user = await User.findById(userId).populate('friendRequests', 'name'); // Populate friend requests with name
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user.friendRequests); // Return the friend requests list
    } catch (error) {
        
        res.status(500).send("Internal Server Error");
    }
});

//Route 3: receive friend request using post: "/api/friends/receivefriendrequest". Login required
router.post('/receivefriendrequest', fetchuser, checkFriends, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const { friendId, action } = req.body; // Get the friend ID from the request body

        if (!friendId || !action) {
            return res.status(400).json({ error: "Friend ID and action are required" });
            
        }

        const sender = await User.findById(friendId); // Find the sender of the friend request
        if (!sender) {  
            
            return res.status(404).json({ error: "Sender not found" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Add friendId to the user's friends list when user accepts the request
        if (action === 'accept') {
            user.friends.push(friendId);
            sender.friends.push(userId); // Add userId to the sender's friends list
            user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId); // Remove from friend requests
            sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== userId); // Remove from sent requests
        }
        if (action === 'reject') {
            user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId); // Remove from friend requests
            sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== userId); // Remove from sent requests  
        }
        if(user.friends.includes(friendId)){
            
            return res.status(400).json({ error: "Already friends" });
        }
        await user.save();
        await sender.save(); // Save the sender document to update the friends list

        res.json({ message: "Friend request accepted", friends: user.friends });
    } catch (error) {
       
        res.status(500).send("Internal Server Error");
    }
});

//Route 4: see send frd requests using get: "/api/friends/sentfriendrequests". Login required
router.get('/sentfriendrequests', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const user = await User.findById(userId); // Populate sent requests with name
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user.sentRequests); // Return the sent requests list
    } catch (error) {
       
        res.status(500).send("Internal Server Error");
    }
});

//Route 5: Send friend request using post: "/api/friends/sendfriendrequest". Login required 
router.post('/sendfriendrequest', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const { friendId } = req.body; // Get the friend ID from the request body

        const friend = await User.findById(friendId);

        const user = await User.findById(userId);
        if (!user || !friend) {
            return res.status(404).json({ error: "User or friend not found" });
        }
        if(user.friends.includes(friendId)){
           
            return res.status(400).json({ error: "Already friends" });
        }
        if(user.sentRequests.includes(friendId)){
            return res.status(400).json({ error: "Friend request already sent" });
        }
        // Add friendId to the user's sent requests list
        user.sentRequests.push(friendId);
        friend.friendRequests.push(userId); // Add userId to the friend's friend requests list
        
        await user.save();
        await friend.save(); // Save the friend document to update the friend requests list
        

        res.json({ message: "Friend request sent", sentRequests: user.sentRequests });
    } catch (error) {
       
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
