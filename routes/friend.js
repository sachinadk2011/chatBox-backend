const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const checkFriends = require('../middleware/checkFriends');



const mutualFriends = (user,otherUser) => {
    const mutualfrd = otherUser.friends.filter(frd=>user.friends.map(uf=> uf._id.toString()).includes(frd._id.toString())).map(frd=> ({name: frd.name, id: frd._id, email: frd.email}));
    return {...otherUser._doc, mutualfriends: mutualfrd, mutualfrdlen: mutualfrd.length} ;

}

//Route 1: fetch all Friends list using get: "/api/friends/fetchallfriends". Login required
router.get('/fetchallfriends', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const user = await User.findById(userId).populate('friends', 'name friends email'); // Populate friends with name, theirs friends and email
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        let userFriends = user.friends;
            userFriends = userFriends.map(frd => mutualFriends(user, frd)); // Map friends to include mutual friends
            console.log("Friends with Mutual Friends:", userFriends);

        return res.status(200).json({ success: true, friends: userFriends }); // Return the friends list
    } catch (error) {

        return res.status(500).send({success: false, error:"Internal Server Error"});
    }
});

// Route 2: fetch all received friend requests using gets: "/api/friends/fetchallfriendrequests". Login required
router.get('/fetchallreceivedrequests', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const user = await User.findById(userId).populate('friendRequests', 'name email'); // Populate friend requests with name
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        const friendRequests = user.friendRequests;
        console.log("Received Friend Requests:", friendRequests);
        res.status(200).json({success: true, friendRequests: friendRequests}); // Return the friend requests list
        
    } catch (error) {
        console.error("Error in fetchallreceivedrequests:", error);
        res.status(500).send({success: false, error:"Internal Server Error"});
    }
});

//Route 3: receive friend request using post: "/api/friends/actiononfriendrequest". Login required
router.post('/actiononfriendrequest', fetchuser, checkFriends, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const { friendId, action } = req.body; // Get the friend ID from the request body

        if (!friendId || !action) {
            return res.status(400).json({success: false, error: "Friend ID and action are required" });
            
        }

        const sender = await User.findById(friendId); // Find the sender of the friend request
        if (!sender) {
            return res.status(404).json({ success: false, error: "Sender not found" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        if(user.friends.includes(friendId)){

            return res.status(400).json({success: false, error: "Already friends" });
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
        if (action !== 'accept' && action !== 'reject') {
            user.friendRequests.push(friendId); // Re-add to friend requests if action is invalid
            sender.sentRequests.push(userId); // Re-add to sent requests if action is invalid
        }
        await user.save();
        await sender.save(); // Save the sender document to update the friends list

        res.status(200).json({success: true, message: "Friend request accepted", friends: user.friends , friendRequests: user.friendRequests });
    } catch (error) {

        res.status(500).send({success: false, error:"Internal Server Error"});
    }
});

//Route 4: see send frd requests using get: "/api/friends/sentfriendrequests". Login required
router.get('/fetchallsentrequests', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id; // Get the user ID from the request
        const user = await User.findById(userId).populate('sentRequests', 'name'); // Populate sent requests with name
        if (!user) {
            return res.status(404).json({success: false, error: "User not found" });
        }
        const sentRequests = user.sentRequests.map(req => req.name);
        console.log("Sent Friend Requests:", sentRequests);
        res.status(200).json({success: true, sentRequests: sentRequests}); // Return the sent requests list
    } catch (error) {
        console.error("Error in fetchallsentrequests:", error);
        res.status(500).send({success: false, error:"Internal Server Error"});
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
            return res.status(404).json({success: false, error: "User or friend not found" });
        }
        if(user.friends.includes(friendId)){
           
            return res.status(400).json({ success: false, error: "Already friends" });
        }
        if(user.sentRequests.includes(friendId)){
            return res.status(400).json({ success: false, error: "Friend request already sent" });
        }
        // Add friendId to the user's sent requests list
        user.sentRequests.push(friendId);
        friend.friendRequests.push(userId); // Add userId to the friend's friend requests list
        
        await user.save();
        await friend.save(); // Save the friend document to update the friend requests list
        

        return res.status(200).json({success: true, message: "Friend request sent", sentRequests: user.sentRequests });
    } catch (error) {

        res.status(500).send({success: false, error:"Internal Server Error"});
    }
});

// Route-6: Suggest friends using: GET "/api/friends/suggestfriends". Login required
router.get('/suggestfriends', fetchuser, async(req,res)=>{
    try {
        const userId = req.user.id;
        const userFriend = await User.findById(userId);
        console.log(userFriend);

        const excludedFrd = [
            userId,
            ...userFriend.friends,
            ...userFriend.sentRequests,
            ...userFriend.friendRequests

        ];
        console.log(excludedFrd);

        let suggestionFriends = await User.find({_id: {$nin: excludedFrd}}).select('name _id email friends').populate('friends', 'name');
        
        suggestionFriends= suggestionFriends.map(friend=>{
            const mutualFriends = friend.friends.filter(frd=> 
                userFriend.friends.map(uf=> uf._id.toString()).includes(frd._id.toString())).map(frd=> ({name: frd.name, id: frd._id}));
                return {...friend._doc, mutualFriends, mutualfrdlen: mutualFriends.length};
            })
            console.log(suggestionFriends);


        res.status(200).json({success:true, suggestionFriends: suggestionFriends});
        
    } catch (error) {
        console.error("Error in suggestfriends:", error);
        res.status(500).send({success:false ,error:"Internal Server Error"});
    }
})

module.exports = router;
