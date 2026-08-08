const mongoose = require('mongoose');

const DATABASE_URL = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const AwardConfig = mongoose.model('AwardConfig', new mongoose.Schema({}, { strict: false }));
  const Award = mongoose.model('Award', new mongoose.Schema({}, { strict: false }));

  const user = await User.findOne({ email: 'mohosinali075@gmail.com' });
  console.log('User ID:', user ? user._id : 'Not found');
  console.log('User points:', user ? user.points : 'Not found');

  const configs = await AwardConfig.find({});
  console.log('Award Configs count:', configs.length);
  for (const c of configs) {
    console.log(`Config: _id: ${c._id}, type: ${c.type}, title: ${c.title}, target: ${c.target}`);
  }

  if (user) {
    const awards = await Award.find({ userId: user._id });
    console.log('User Awards count:', awards.length);
    for (const a of awards) {
      console.log(`Award: _id: ${a._id}, type: ${a.type}, progress: ${a.progress}, target: ${a.target}, isUnlocked: ${a.isUnlocked}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
