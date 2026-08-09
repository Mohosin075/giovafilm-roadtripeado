const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const mapId = '69e93d53668604cc97522f47'; // Republica Dominicana
  
  const result = await User.findOneAndUpdate(
    { email: 'mohosinali075@gmail.com' },
    { $pull: { purchasedMaps: new mongoose.Types.ObjectId(mapId) } },
    { new: true }
  );
  
  if (result) {
    console.log('Successfully updated user purchasedMaps:', result.purchasedMaps);
  } else {
    console.log('User not found');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
