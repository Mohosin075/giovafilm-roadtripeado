import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Map } from '../modules/map/map.model';
import { Place } from '../modules/place/place.model';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function checkMapPlaces() {
  await mongoose.connect(DATABASE_URL!);
  
  const maps = await Map.find({});
  for (const m of maps as any[]) {
    const count = await Place.countDocuments({ map: m._id });
    const regular = await Place.countDocuments({ map: m._id, type: 'Regular' });
    const business = await Place.countDocuments({ map: m._id, type: 'Business' });
    console.log(`Map: ${m.name} (${m._id.toString()}) - Total: ${count}, Regular: ${regular}, Business: ${business}`);
  }

  await mongoose.disconnect();
}

checkMapPlaces();
