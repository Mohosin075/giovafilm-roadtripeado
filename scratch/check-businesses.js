const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }));
  
  const list = await Business.find({}).populate('category');
  for (const b of list) {
    console.log(`Business Name: ${b.name}`);
    console.log(`Category field:`, b.category);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
