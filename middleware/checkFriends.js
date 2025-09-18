const Users = require('../models/Users');


const checkFriends = async (req, res, next) => {
    try {
        const userId = req.user.id; // Assuming userId is passed in the request body
        const friendId= req.body.friendId || req.body.receiver;
        
        if(!friendId){
            return res.status(400).json({ error: "Friend ID not found" });
        }
        const user = await Users.findById(userId);
        if(!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const isFriend = user.friends.includes(friendId);
        const isFriendRequest = user.friendRequests.includes(friendId);
        const isSentRequest = user.sentRequests.includes(friendId);
        if (isFriend) {
            return next();  // Proceed to the next middleware/route handler if the users are friends
        }

        if (isFriendRequest || isSentRequest) {
            return next();  // Allow proceeding if there is a pending friend request
        }
       
        return res.status(400).json({ error: "You can't send message to this user" });
    } catch (error) {
        return res.status(500).send("Internal Server Error");
        
    }
}

module.exports = checkFriends;