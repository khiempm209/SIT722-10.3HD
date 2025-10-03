const mongoose = require('mongoose');

const {
  MONGODB_APP_USER,
  MONGODB_APP_PASSWORD,
  MONGODB_HOST,
  MONGODB_PORT,
  MONGODB_DB_NAME,
} = process.env;

const mongoUri = `mongodb://${encodeURIComponent(MONGODB_APP_USER)}:${encodeURIComponent(MONGODB_APP_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB_NAME}?authSource=${MONGODB_DB_NAME}`;

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

module.exports = mongoose;

