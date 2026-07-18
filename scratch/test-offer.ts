import mongoose from 'mongoose';
import { Offer } from '../src/modules/offer/offer.model';
import { OfferService } from '../src/modules/offer/offer.service';

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB');
  
  // Find any offer
  let activeOffer = await Offer.findOne({ status: 'Active' });
  if (!activeOffer) {
    console.log('No active offer found. Searching for any offer...');
    const anyOffer = await Offer.findOne();
    if (!anyOffer) {
      console.log('No offers exist in database at all.');
      await mongoose.disconnect();
      return;
    }
    
    console.log('Found offer:', anyOffer._id, anyOffer.title, 'Status:', anyOffer.status);
    console.log('Activating it for test...');
    anyOffer.set('status', 'Active');
    await anyOffer.save();
    activeOffer = anyOffer;
  }
  
  console.log('Testing with active offer:', activeOffer._id, activeOffer.title);
  
  const testUserId = '69efc99a068577dcbd6d7f5a'; // Md. Mohosin
  
  try {
    const result = await OfferService.redeemOffer(activeOffer._id.toString(), testUserId);
    console.log('Offer Redemption successful! Record:', JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log('Redemption attempt result/error:', error.message || error);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
