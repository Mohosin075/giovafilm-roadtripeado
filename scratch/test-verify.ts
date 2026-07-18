import mongoose from 'mongoose';
import { PaymentServices } from '../src/modules/payment/payment.service';

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB');
  
  const sessionId = 'cs_test_a10a6ofcUpylySlH2vpm9zVsy3lSUWw4pC7n8dCVtI6EdPqzVNRORZkiR0';
  
  try {
    const result = await PaymentServices.verifyCheckoutSession(sessionId);
    console.log('Verification successful! Result:', JSON.stringify(result, null, 2));
    
    // Check user's purchasedMaps
    const userSchema = new mongoose.Schema({
      email: String,
      purchasedMaps: Array
    }, { strict: false });
    const User = mongoose.model('User', userSchema);
    
    const user = await User.findById(result.userId);
    console.log('User status after verification:', JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Verification failed:', error);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
