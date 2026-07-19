const mongoose = require('mongoose');

async function run() {
  const uri = 'mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/giovafilm-roadtripeado?appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const Category = mongoose.model('Category', new mongoose.Schema({
    name: String,
    type: String,
    status: String
  }, { collection: 'categories' }));

  const categories = await Category.find({});
  console.log('All Categories:', JSON.stringify(categories, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
