const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  // Set user's points to 150 XP
  const result = await User.findOneAndUpdate(
    { email: 'mohosinali075@gmail.com' },
    { $set: { points: 150 } },
    { new: true }
  );
  
  if (result) {
    console.log('Successfully updated user points. New points:', result.points);
  } else {
    console.log('User not found');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
