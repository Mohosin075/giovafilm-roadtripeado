const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const Map = mongoose.model('Map', new mongoose.Schema({}, { strict: false }));
  
  const list = await Map.find({});
  console.log('Maps count:', list.length);
  for (const m of list) {
    console.log(`Map: _id: ${m._id}, name: ${m.name}, isPaid: ${m.isPaid}, price: ${m.price}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
