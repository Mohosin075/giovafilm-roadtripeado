const mongoose = require('mongoose');
require('dotenv').config();

async function inspectAndDelete() {
  await mongoose.connect(process.env.DATABASE_URL);
  const email = 'bebiwon164@backyr.com';
  const User = mongoose.connection.collection('users');
  const user = await User.findOne({ email });

  const collections = await mongoose.connection.db.listCollections().toArray();
  const Promo = mongoose.connection.collection('promolinks');

  if (!user) {
    console.log('User document not found with email:', email);
    const promoDel = await Promo.deleteMany({ recipientEmail: email });
    console.log(`Deleted ${promoDel.deletedCount} promo links matching email.`);
    await mongoose.disconnect();
    return;
  }

  const userId = user._id;
  console.log('Found user:', { _id: userId, name: user.name, email: user.email });

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const col = mongoose.connection.collection(colName);
    const delRes = await col.deleteMany({
      $or: [
        { _id: userId },
        { user: userId },
        { userId: userId },
        { usedBy: userId },
        { author: userId },
        { creator: userId },
        { createdBy: userId },
        { email: email },
        { recipientEmail: email }
      ]
    }).catch(() => ({ deletedCount: 0 }));

    if (delRes.deletedCount > 0) {
      console.log(`Deleted ${delRes.deletedCount} documents from ${colName}`);
    }
  }

  console.log('User and all associated data have been completely deleted.');
  await mongoose.disconnect();
}

inspectAndDelete().catch(console.error);
