import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../modules/user/user.model';
import { Map } from '../modules/map/map.model';
import { Place } from '../modules/place/place.model';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function testUserAndMap() {
  await mongoose.connect(DATABASE_URL!);
  
  const email = 'mohosinali075@gmail.com';
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`User not found: ${email}`);
    await mongoose.disconnect();
    return;
  }

  console.log(`User found: ${user.name} (${user.email})`);
  console.log('Purchased Maps in DB:', user.purchasedMaps);

  const maps = await Map.find({});
  console.log('Available Maps in DB:');
  maps.forEach((m: any) => {
    console.log(`- ${m.name} (${m._id.toString()}) - isPaid: ${m.isPaid}`);
  });

  // Let's test the accessible map IDs logic
  const freeMaps = await Map.find({ isPaid: false }, '_id');
  const freeMapIds = freeMaps.map((m: any) => m._id.toString());
  const purchasedMapIds = user.purchasedMaps?.map((id: any) => id.toString()) || [];
  const accessibleMapIds = Array.from(new Set([...freeMapIds, ...purchasedMapIds]));
  console.log('User Accessible Map IDs:', accessibleMapIds);

  const usaMap = maps.find((m: any) => m.name.includes('Estados Unidos'));
  if (usaMap) {
    const usaMapId = usaMap._id.toString();
    const isUsaPurchased = accessibleMapIds.includes(usaMapId);
    console.log(`Is Estados Unidos Map Purchased/Accessible? ${isUsaPurchased}`);

    // Let's count places on USA map
    const places = await Place.find({ map: usaMap._id });
    console.log(`Total places on USA Map: ${places.length}`);
    const regularPlaces = places.filter((p: any) => p.type === 'Regular');
    const businessPlaces = places.filter((p: any) => p.type === 'Business');
    console.log(`- Regular Places: ${regularPlaces.length}`);
    console.log(`- Business Places: ${businessPlaces.length}`);

    // Check locking simulation
    const paidMaps = await Map.find({ isPaid: true }, '_id');
    const paidMapIds = paidMaps.map((m: any) => m._id.toString());
    const lockedMapIds = paidMapIds.filter((id: any) => !accessibleMapIds.includes(id));
    console.log('Locked Map IDs for User:', lockedMapIds);

    const isUsaLocked = lockedMapIds.includes(usaMapId);
    console.log(`Is USA Map Locked for User? ${isUsaLocked}`);
  }

  await mongoose.disconnect();
}

testUserAndMap();
