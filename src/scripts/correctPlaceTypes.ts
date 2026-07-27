import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Place } from '../modules/place/place.model';
import { Category } from '../modules/category/category.model';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function correctPlaceTypes() {
  await mongoose.connect(DATABASE_URL!);
  
  // Register Category model
  const categoryModelName = Category.modelName;
  console.log(`Registered model: ${categoryModelName}`);

  const places = await Place.find({}).populate('category');
  
  let regularCount = 0;
  let businessCount = 0;

  for (const place of places as any[]) {
    const catName = place.category?.name || 'Unknown';
    // Define which categories should be treated as Business
    const isBusinessCategory = [
      'restaurant',
      'Business',
      'Kayak | Jetski | ATV | Go Kart | Caballos | Zipline',
      'Bowling, Arcade, Game & Park'
    ].includes(catName);

    const targetType = isBusinessCategory ? 'Business' : 'Regular';
    
    if (place.type !== targetType) {
      await Place.findByIdAndUpdate(place._id, { type: targetType });
      if (targetType === 'Regular') {
        regularCount++;
      } else {
        businessCount++;
      }
    }
  }

  console.log(`Updated ${regularCount} places to 'Regular' and ${businessCount} places to 'Business'.`);

  // Print final counts
  const finalTotal = await Place.countDocuments();
  const finalBusiness = await Place.countDocuments({ type: 'Business' });
  const finalRegular = await Place.countDocuments({ type: 'Regular' });
  console.log({ finalTotal, finalBusiness, finalRegular });

  await mongoose.disconnect();
}

correctPlaceTypes();
