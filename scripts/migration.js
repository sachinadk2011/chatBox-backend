const moongoose = require('mongoose');
const User = require('../models/Users');

const moongose_url = process.env.DB_URL;

const updateSchema = async()=>{
    try {
        await moongoose.connect(moongose_url,{
              useNewUrlParser: true,
              useUnifiedTopology: true
              
            }).catch((error) => {
            console.error("Error connecting to MongoDB:", error.message);
            process.exit(1); // Exit the process with failure
        });
        console.log("Connected to MongoDB successfully");
        // find all user and update their schema
        const users = await User.find();
        // Use a regular for loop to handle async operations properly
    for (let user of users) {
        // Add new fields to old users if they don't exist
        user.friends = user.friends || [];
        user.friendRequests = user.friendRequests || [];
        user.sentRequests = user.sentRequests || [];

                await user.save();
                console.log(`Updated user with new schema`);
            };
        
        console.log("All users updated with new schema successfully");
        process.exit(0);
        
    } catch (error) {
        console.error("Error updating schema:", error.message);
        process.exit(1);

        
        
    }
}

module.exports = updateSchema; //call the fuunction to update the schema