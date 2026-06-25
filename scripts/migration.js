const mongoose = require('mongoose');
const User = require('../models/Users');
const Message = require('../models/Messages');

const mongoose_url = process.env.DB_URL;


const updateSchema = async()=>{
    if (process.env.EXECUTE_MIGRATION !== "true" ) {
        console.log("Migration not executed. Set Execution Migration to true in .env to run the migration script.");
        return; // exit without error if migration is not enabled
    }

    try {
        console.log('Connecting to database...');
    await mongoose.connect(mongoose_url);
    
    console.log('[Migration] Running Production: Converting otpExpiry to Date...');
    const isProduction = process.env.NODE_ENV === 'production';
        let filter = {
            

        };

        const messageResult = await Message.collection.updateMany(
            { 
                 status: {
                    $in: [true, false]
    }
             },
            {
                $set: {
                    status: "read"
                }
            }
        );

        console.log(
            `Updated ${messageResult.modifiedCount} messages`
        );

        const result = await User.collection.updateMany(
            {},
            [
                {
                $set: {
                    isOnline: "$onlineStatus",
                    isVerified: "$status"
                }
            },
                {
                    $unset: [
                    "onlineStatus",
                    "status",
                    "refreshToken"
                ]
            }
            ]
        )
        
        
        console.log(`[Migration] User documents updated: ${result.modifiedCount}`);
        
    } catch (error) {
        console.error("Error updating schema:", error.message);
        process.exit(1);

        
        
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database.');
    }
    
}


module.exports = updateSchema; //call the fuunction to update the schema

