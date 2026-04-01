const express = require('express');
const router = express.Router();
const Message = require('../models/Messages');
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const checkFriends = require('../middleware/checkFriends');
const upload = require('../middleware/uploadFiles');
const cloudinary = require('../configuration/cloudinaryConfig');
const fs = require('fs');

// Route 1: Fetch all messages (for sidebar preview)
router.get('/fetchallmessages', fetchuser, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ sender: req.user.id }, { receiver: req.user.id }]
        }).populate('receiver', 'name').populate('sender', 'name');
        if (!messages) return res.status(404).json({ success: false, error: "No messages found" });
        return res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Route 2: Fetch paginated conversation with a specific user (for chat window)
router.get('/conversation/:otherUserId', fetchuser, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = Math.max(1, Math.min(50, rawLimit || 20));
        const skip  = (page - 1) * limit;

        const filter = {
            $or: [
                { sender: req.user.id, receiver: otherUserId },
                { sender: otherUserId, receiver: req.user.id }
            ]
        };
        const total = await Message.countDocuments(filter);

        // Sort newest-first, skip for pagination, then reverse to chronological
        const messages = await Message.find(filter)
            .populate('receiver', 'name')
            .populate('sender', 'name')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            messages: messages.reverse(), // chronological order for UI
            total,
            page,
            hasMore: skip + limit < total
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Route 3: Send a message
router.post("/sendmessage", fetchuser, upload.array('files', 5), checkFriends, [
    body('message').custom((value, { req }) => {
        if ((!req.files || req.files.length === 0) && (!value || value.trim() === ''))
            throw new Error('Message cannot be empty');
        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { receiver, message } = req.body;
        if (!receiver) return res.status(400).json({ success: false, error: "Receiver not found" });

        const newMessage = new Message({ sender: req.user.id, receiver, status: 'sent' });

        if (req.files && req.files.length > 0) {
            const allowed = f => f.mimetype.startsWith('image/') || f.mimetype.startsWith('video/');
            if (!req.files.every(allowed)) {
                for (const f of req.files) await fs.promises.unlink(f.path);
                return res.status(400).json({ error: "Only image and video files are supported." });
            }

            let uploaded = [];
            for (const file of req.files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        resource_type: "auto", folder: "chatbox_files"
                    });
                    uploaded.push({
                        url: result.secure_url, public_id: result.public_id,
                        type: file.mimetype.startsWith("image") ? "image"
                             : file.mimetype.startsWith("video") ? "video" : "file"
                    });
                } catch (err) {
                    console.error("Cloudinary upload failed:", file.originalname, err);
                    return res.status(500).json({ success: false, error: `Failed to upload ${file.originalname}` });
                }
            }

            if (uploaded.length === 1) {
                newMessage.message  = uploaded[0].url;
                newMessage.types    = uploaded[0].type;
                newMessage.public_id = uploaded[0].public_id;
            } else {
                newMessage.message = JSON.stringify(uploaded);
                newMessage.types   = "multiple";
            }
        } else {
            newMessage.message = message;
            newMessage.types   = "text";
        }

        let saved = await newMessage.save();
        saved = await saved.populate('receiver', 'name');
        saved = await saved.populate('sender', 'name');

        if (req.files?.length) for (const f of req.files) await fs.promises.unlink(f.path);

        if (!saved) return res.status(400).json({ success: false, error: "Unable to send message" });
        return res.status(200).json({ success: true, message: saved });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// Route 4: Mark messages as read + emit socket event
router.put('/markasread/:senderId', fetchuser, async (req, res) => {
    try {
        const { senderId } = req.params;
        if (!senderId) return res.status(400).json({ success: false, error: "Sender ID required" });

        await Message.updateMany(
            { sender: senderId, receiver: req.user.id, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );

        // Emit real-time event so sender's ticks turn blue instantly
        const io = req.io || req.app.get('io');
        if (io) io.to(senderId).emit('messagesRead', { by: req.user.id });

        return res.status(200).json({ success: true, message: "Messages marked as read" });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

module.exports = router;