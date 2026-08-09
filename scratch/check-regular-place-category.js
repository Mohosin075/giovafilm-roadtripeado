const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const Place = mongoose.model('Place', new mongoose.Schema({}, { strict: false }));
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  
  const place = await Place.findById("69e9776d668604cc97523054");
  if (place) {
    console.log(`Place: name: ${place.name}, type: ${place.type}, category ID: ${place.category}`);
    const cat = await Category.findById(place.category);
    console.log(`Category: name: ${cat ? cat.name : 'Not found'}`);
  } else {
    console.log('Place not found');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
