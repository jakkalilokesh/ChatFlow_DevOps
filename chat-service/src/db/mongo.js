import mongoose from 'mongoose';

const connectMongo = async (retries = 10, delay = 3000) => {
  const user = process.env.MONGO_INITDB_ROOT_USERNAME || 'chatflow_user';
  const pass = process.env.MONGO_INITDB_ROOT_PASSWORD || 'password';
  const db = process.env.MONGO_INITDB_DATABASE || 'chatflow';
  const uri = process.env.MONGO_URI || `mongodb://${user}:${pass}@mongo:27017/${db}?authSource=admin`;
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
      });
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.warn(`MongoDB attempt ${i + 1}/${retries}: ${err.message}`);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('MongoDB failed to connect after all retries');
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected, retrying...');
  setTimeout(() => connectMongo(), 3000);
});

export default connectMongo;
