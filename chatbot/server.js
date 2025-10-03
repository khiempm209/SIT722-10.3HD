// server.js
require('./configs/db');
const express = require('express');
// const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3030;

// app.use(express.static(__dirname+'/public'))
app.use(express.json({ limit: '1mb' }));           // parse application/json
app.use(express.urlencoded({ extended: true }));   // parse application/x-www-form-urlencoded

const routes = require('./routes/api');
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});