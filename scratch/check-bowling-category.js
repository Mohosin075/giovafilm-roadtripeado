const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const Place = mongoose.model('Place', new mongoose.Schema({}, { strict: false }));
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  
  // Find the category "Bowling, Arcade, Game & P..."
  const cat = await Category.findOne({ name: /Bowling/i });
  if (cat) {
    console.log(`Found category: name: ${cat.name}, _id: ${cat._id}`);
    const places = await Place.find({ category: cat._id });
    console.log(`Places in this category:`, places.length);
    for (const p of places) {
      console.log(`- Place: ${p.name}, type: ${p.type}`);
    }
  } else {
    console.log('Category not found');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
