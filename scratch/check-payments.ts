import mongoose from 'mongoose';

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB');
  
  const paymentSchema = new mongoose.Schema({}, { strict: false });
  const Payment = mongoose.model('Payment', paymentSchema);
  
  const payments = await Payment.find().sort({ createdAt: -1 }).limit(5);
  console.log('Latest Payments:', JSON.stringify(payments, null, 2));
  
  const userSchema = new mongoose.Schema({
    email: String,
    purchasedMaps: Array
  }, { strict: false });
  const User = mongoose.model('User', userSchema);
  
  const users = await User.find({ email: 'web.mohosin@gmail.com' });
  console.log('User status:', JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
