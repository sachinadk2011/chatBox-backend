const express = require('express');
const router = express.Router();
const Message = require('../models/Messages');
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const checkFriends = require('../middleware/checkFriends');
const upload = require('../middleware/uploadFiles');
const cloudinary = require('../configuration/cloudinaryConfig');
const fs = require('fs');


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
            return res.status(404).json({ success: false, error: "No messages found" });
        }
       return  res.status(200).json({ success: true, messages: messages, message: "Messages fetched successfully" });
    } catch (error) {
        console.error(error);
       return  res.status(500).send({ success: false, error: "Internal Server Error" });
    }
});

//Route 2: send a message using: POST "/api/messages/sendmessage". Login required
router.post("/sendmessage", fetchuser,upload.array('files',5), checkFriends, [
    // Only validate message if no file exists
    body('message').custom((value, { req }) => {
      if ((!req.files || req.files.length === 0) && (!value || value.trim() === '')) {
        throw new Error('Message content cannot be empty');
      }
      return true;
    }),
    
], async(req,res)=>{
    const validationErrors= validationResult(req);
    if(!validationErrors.isEmpty()){
        return res.status(400).json({errors: validationErrors.array()});
    }
    try {
        
        const {receiver, message}= req.body;
        console.log("sendmessage api","Receiver: ", receiver, "Message: ", message, "File: ", req.files, req.body);  
        
        if(!receiver){
            return res.status(400).json({success: false, error: "Receiver not found" });
        }
        
        console.log("Receiver ID: ", receiver, "Message: ", message, "file: ", req.files);
        const newMessage = new Message({
            
            sender: req.user.id,
            receiver: receiver
        });
        if(req.files && req.files.length > 0){
            console.log("File uploaded: ", req.files);
        // Accept only images and videos
    if (!req.files.every(file => 
        file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') )) {
        // Delete uploaded temp files
        for (const file of req.files) {
            await fs.promises.unlink(file.path);
        }
        return res.status(400).json({ 
            error: "Only image and video files are supported." 
        });
    }
           // handle multiple files
    let uploadedFiles = [];
    for (const file of req.files) {
        try{
        const result = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
            folder: "chatbox_files"
        });
        
        console.log("Cloudinary upload result: ", result);
        uploadedFiles.push({
            url: result.secure_url,
            public_id: result.public_id,
            type: file.mimetype.startsWith("image") ? "image" :
                  file.mimetype.startsWith("video") ? "video" :
                  file.mimetype.startsWith("audio") ? "audio" : "file"
        });
    }catch(error){
        console.error("Cloudinary upload failed for", file.originalname, err);
        return res.status(500).json({ success: false, error: `Failed to upload ${file.originalname}` });
    }
    }

          // If only one file, save it as message
    if(uploadedFiles.length === 1){
        newMessage.message = uploadedFiles[0].url;
        newMessage.types = uploadedFiles[0].type;
        newMessage.public_id = uploadedFiles[0].public_id;
    } else {
        // For multiple files, you might want to save array of URLs
        newMessage.message = JSON.stringify(uploadedFiles); // save as JSON string
        newMessage.types = "multiple";
    }

}
        else{
            
            newMessage.message = message;
            newMessage.types = "text";
        }
        
       // Save first
let savedMessage = await newMessage.save();

// Then populate
savedMessage = await savedMessage.populate('receiver', 'name');
savedMessage = await savedMessage.populate('sender', 'name');
 // Delete all local temp files
for (const file of req.files) {
    await fs.promises.unlink(file.path);
}

        if(!savedMessage) {
            return res.status(400).json({ success: false, error: "Unable to send message" });
        }
        
        return res.status(200).json({ success: true, message: savedMessage });
        
    } catch (error) {
        console.error(error.message);
       return  res.status(500).send({ success: false, error: "Internal Server Error" });
        
    }
})

//Route 3: markasread a mesage using: POST "/api/messages/markasread". Login required
router.put('/markasread/:senderId', fetchuser, async(req,res)=>{
    try {
        
        const { senderId } = req.params;
        if (!senderId) {
            return res.status(400).json({success: false, error: "Sender ID not found" });
        }
       
        const updateMessage = await Message.updateMany({
            sender: senderId,
            receiver: req.user.id,
            status: false
        }, { $set: { status: true } });
        if (updateMessage.modifiedCount === 0) {
            return res.status(404).json({ success: false, error: "No messages found" });
        }
        
       return  res.status(200).json({ success: true, updateMessage:updateMessage, message: "Messages marked as read" });
    } catch (error) {
        console.error(error.message);
        return  res.status(500).send({"success": false, "error": "Internal Server Error"});
    }
})

module.exports = router;