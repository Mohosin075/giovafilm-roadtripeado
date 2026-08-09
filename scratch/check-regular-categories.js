const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const Place = mongoose.model('Place', new mongoose.Schema({}, { strict: false }));
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  
  // Find places where type is not 'Business'
  const regularPlaces = await Place.find({ type: { $ne: 'Business' } });
  console.log('Total regular places:', regularPlaces.length);
  
  const categoryIds = Array.from(new Set(regularPlaces.map(p => p.category ? p.category.toString() : null).filter(Boolean)));
  
  console.log('Categories containing regular places:');
  for (const cid of categoryIds) {
    const cat = await Category.findById(cid);
    if (cat) {
      console.log(`- Category: "${cat.name}" (ID: ${cat._id})`);
      const placesInCat = regularPlaces.filter(p => p.category && p.category.toString() === cid);
      console.log(`  Has ${placesInCat.length} regular place(s): e.g. ${placesInCat.slice(0,3).map(p => p.name).join(', ')}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
