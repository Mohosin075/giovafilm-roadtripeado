import mongoose from 'mongoose';

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB');

  // Let's check subscriptions
  const subscriptionSchema = new mongoose.Schema({}, { strict: false });
  const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
  
  const latestSubs = await Subscription.find().sort({ createdAt: -1 }).limit(3);
  console.log('\n--- Latest 3 Subscriptions ---');
  console.log(JSON.stringify(latestSubs, null, 2));

  // Let's check payments (map purchases)
  const paymentSchema = new mongoose.Schema({}, { strict: false });
  const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
  
  const latestPayments = await Payment.find().sort({ createdAt: -1 }).limit(3);
  console.log('\n--- Latest 3 Payments (Map Purchases) ---');
  console.log(JSON.stringify(latestPayments, null, 2));

  // Let's check businesses
  const businessSchema = new mongoose.Schema({}, { strict: false });
  const Business = mongoose.models.Business || mongoose.model('Business', businessSchema);
  
  const activeBusinesses = await Business.find({ hasActiveSubscription: true });
  console.log('\n--- Businesses with hasActiveSubscription = true ---');
  console.log(JSON.stringify(activeBusinesses.map((b: any) => ({ _id: b._id, name: b.name, hasActiveSubscription: b.hasActiveSubscription })), null, 2));

  const allBusinesses = await Business.find().sort({ createdAt: -1 }).limit(5);
  console.log('\n--- Latest 5 Businesses ---');
  console.log(JSON.stringify(allBusinesses.map((b: any) => ({ _id: b._id, name: b.name, hasActiveSubscription: b.hasActiveSubscription, createdAt: b.createdAt })), null, 2));

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

main().catch(console.error);
