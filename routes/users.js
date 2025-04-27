const express = require('express');
const router = express.Router();
const User = require('../models/Users');

// Router to search the users name using: GET "/api/users/searchuser". Login required
router.get('/searchuser', async (req, res) => {
    const searchQuery = req.query.name; // Get the search query from the request
    if (!searchQuery) {
        return res.status(400).json({ error: "Search query is required" });
    }
    try {
        const users = await User.find({ 
            $text: {$search: searchQuery} // Use text search for the name field
        }).select('-password ') // Exclude sensitive fields
         .limit(10); // Limit to 10 results
        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }
        res.json(users);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;