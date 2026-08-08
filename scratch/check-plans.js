const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const SubscriptionPlan = mongoose.model('SubscriptionPlan', new mongoose.Schema({}, { strict: false }));
  
  const list = await SubscriptionPlan.find({});
  console.log('Subscription Plans count:', list.length);
  for (const p of list) {
    console.log(`Plan Name: ${p.name}, _id: ${p._id}, stripePriceId: ${p.stripePriceId}, stripeProductId: ${p.stripeProductId}, price: ${p.price}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
