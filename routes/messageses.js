const express = require('express');
const router = express.Router();
const Message = require('../models/Messages');
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middlewire/fetchuser');
const checkFriends = require('../middlewire/checkFriends');

//Route 1: fetch all user messages using: GET "/api/messages/fetchallmessages". Login required
router.get('/fetchallmessages', fetchuser, async (req, res) => {
   
    try {
        const messages = await Message.find({
            $or:[
                { sender: req.user.id },
                { receiver: req.user.id }
             ]}
        ).populate('receiver', 'name').populate('sender', 'name');
        if (!messages) {
            return res.status(404).json({ error: "No messages found" });
        }
        res.json(messages);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

//Route 2: send a message using: POST "/api/messages/sendmessage". Login required
router.post("/sendmessage", fetchuser, checkFriends, [
    body('message', "Enter a valid message").isLength({ min: 1 }),
    
], async(req,res)=>{
    const validationErrors= validationResult(req);
    if(!validationErrors.isEmpty()){
        return res.status(400).json({errors: validationErrors.array()});
    }
    try {
        let success = false;
        const {receiver, message}= req.body;
        
        if(!receiver){
            return res.status(400).json({ error: "Receiver not found" });
        }
        if(!message){
            return res.status(400).json({ error: "Message content cannot be empty" });
        }
        const newMessage = new Message({
            sender: req.user.id,
            receiver: receiver,
            message: message
        });
        const savemessage = await newMessage.save();
        if(!savemessage) {
            return res.status(400).json({ success: success, error: "Unable to send message" });
        }
        success = true;
        return res.status(200).json({ success: success, message: savemessage });
        
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
        
    }
})

//Route 3: markasread a mesage using: POST "/api/messages/markasread". Login required
router.put('/markasread/:senderId', fetchuser, async(req,res)=>{
    try {
        let success = false;
        const { senderId } = req.params;
        if (!senderId) {
            return res.status(400).json({ error: "Sender ID not found" });
        }
       
        const updateMessage = await Message.updateMany({
            sender: senderId,
            receiver: req.user.id,
            status: false
        }, { $set: { status: true } });
        if (updateMessage.modifiedCount === 0) {
            return res.status(404).json({ success: success, error: "No messages found" });
        }
        success = true;
        res.json({ success: success, updateMessage, message: "Messages marked as read" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})

module.exports = router;