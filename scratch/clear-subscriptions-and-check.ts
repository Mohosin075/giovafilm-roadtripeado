import mongoose from 'mongoose';

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB');
  
  // 1. Delete all subscriptions
  console.log('Deleting all subscriptions...');
  const subscriptionSchema = new mongoose.Schema({}, { strict: false });
  const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
  const deleteSubResult = await Subscription.deleteMany({});
  console.log(`Deleted ${deleteSubResult.deletedCount} subscriptions.`);
  
  // 2. Reset user subscription flags
  console.log('Resetting user subscription statuses...');
  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.models.User || mongoose.model('User', userSchema);
  const resetUserResult = await User.updateMany({}, {
    $set: {
      subscriptionStatus: 'none',
      subscriptionTier: 'free',
      subscriptionExpiresAt: null
    }
  });
  console.log(`Updated ${resetUserResult.modifiedCount} users.`);

  // 3. Reset business hasActiveSubscription flags
  console.log('Resetting business subscription flags...');
  const businessSchema = new mongoose.Schema({}, { strict: false });
  const Business = mongoose.models.Business || mongoose.model('Business', businessSchema);
  const resetBusinessResult = await Business.updateMany({}, {
    $set: {
      hasActiveSubscription: false
    }
  });
  console.log(`Updated ${resetBusinessResult.modifiedCount} businesses.`);

  // 4. Verify status
  const totalSubs = await Subscription.countDocuments({});
  const activeSubs = await Subscription.countDocuments({ status: { $in: ['active', 'trialing'] } });
  const activeBusinesses = await Business.countDocuments({ hasActiveSubscription: true });
  const totalBusinesses = await Business.countDocuments({});

  console.log('--- Verification ---');
  console.log(`Total Subscriptions: ${totalSubs}`);
  console.log(`Active Subscriptions: ${activeSubs}`);
  console.log(`Businesses with Active Subscription: ${activeBusinesses} / ${totalBusinesses}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

main().catch(console.error);
