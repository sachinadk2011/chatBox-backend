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
        let filter = {};

        if (isProduction) {
            console.log('[Migration] Running Production Mode...');
            // In production, only target documents matching your specific condition
            filter = { otpExpiry: { $type: "bool" } };
        } else {
            console.log('[Migration] Running Local/Dev Mode (Full Clean-up)...');
            // Locally, match EVERYTHING ({}) to make sure all legacy validation fields are wiped clean
            filter = {};
        }
        const countBefore = await User.collection.countDocuments({ 
  emailValidationProvider: { $exists: true } 
});
console.log(`[Migration] Documents with old email fields: ${countBefore}`);

    const result = await User.collection.updateMany(
       filter,
  
  // 2. UPDATE: Set those fields to null (or a default date)
  { 
    $set: { 
        otpExpiry: null,
        passwordResetVerified: false,
        isPasswordResetRequest: false
    
    }
  }
); 
        console.log(`[Migration] User documents updated: ${result.modifiedCount}`);
        
    } catch (error) {
        console.error("Error updating schema:", error.message);
        process.exit(1);

        
        
    }
    
}


module.exports = updateSchema; //call the fuunction to update the schema

