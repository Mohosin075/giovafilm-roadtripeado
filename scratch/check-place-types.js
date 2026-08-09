const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const Place = mongoose.model('Place', new mongoose.Schema({}, { strict: false }));
  
  const list = await Place.find({ name: { $in: ["Wendy's", "HardRock Cafe", "Pa Onde Sea"] } });
  console.log('Found places:', list.length);
  for (const p of list) {
    console.log(`Place: _id: ${p._id}, name: ${p.name}, type: ${p.type}, map: ${p.map}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
