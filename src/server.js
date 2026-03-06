import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

await connectDB();

console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
