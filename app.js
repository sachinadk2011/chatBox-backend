const connecttomoongo = require('./db');
const express = require('express');
const cors = require('cors');
//const updateSchema = require('./scripts/migration')

connecttomoongo();
//updateSchema(); // Run the migration script to add new fields to the User schema in database
 const app = express();
 const port = process.env.PORT;

app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public')); // for serving static files

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// available routes
app.use('/api/auth', require('./routes/auths'));
app.use('/api/messages', require('./routes/messageses')); // added route for messages
app.use('/api/users', require('./routes/users')); // added route for users
app.use('/api/friends', require('./routes/friend')); // added route for friends

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});




