const moongoose = require('mongoose');
const moongose_url = process.env.DB_URL;

const connecttomoongo = async ()=>{
  try {
    await moongoose.connect(moongose_url);
    console.log("Connected to MongoDB successfully");
  
    
  } catch (error) {
    console.log("Error connecting to MongoDB:", error.message);
    
  }
}

module.exports = connecttomoongo;