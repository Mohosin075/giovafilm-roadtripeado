import mongoose from 'mongoose';
import { seedSubscriptionPlans } from '../src/modules/subscription/subscription.seed';

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB');
  
  await seedSubscriptionPlans();

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

main().catch(console.error);
