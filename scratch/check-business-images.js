const mongoose = require('mongoose');

async function run() {
  const uri = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const Business = mongoose.model('Business', new mongoose.Schema({
    name: String,
    media: {
      photos: [String],
      menu: String
    }
  }, { collection: 'businesses' }));

  const business = await Business.findOne({ name: /MONSUR ALAM/i });
  console.log('Business:', JSON.stringify(business, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
