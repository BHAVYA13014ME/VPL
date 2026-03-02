const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-learning';

mongoose.set('strictQuery', false);

async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected:', mongoose.connection.host);
}

module.exports = { connectDB };
