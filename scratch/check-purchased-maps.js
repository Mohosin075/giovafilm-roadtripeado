const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const user = await User.findOne({ email: 'mohosinali075@gmail.com' });
  if (user) {
    console.log('User purchasedMaps:', user.purchasedMaps);
  } else {
    console.log('User not found');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
