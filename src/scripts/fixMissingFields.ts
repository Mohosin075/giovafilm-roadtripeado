import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

async function fixMissingFields() {
  try {
    await mongoose.connect(DATABASE_URL!);
    console.log('Connected to database successfully.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established properly');
    }

    console.log('\n--- Migrating Places ---');

    // 1. type -> default 'Regular'
    const typeRes = await db.collection('places').updateMany(
      { $or: [{ type: { $exists: false } }, { type: null }] },
      { $set: { type: 'Regular' } }
    );
    console.log(`- Updated 'type' in ${typeRes.modifiedCount} documents.`);

    // 2. media -> default []
    const mediaRes = await db.collection('places').updateMany(
      { $or: [{ media: { $exists: false } }, { media: null }] },
      { $set: { media: [] } }
    );
    console.log(`- Updated 'media' in ${mediaRes.modifiedCount} documents.`);

    // 3. services -> default []
    const servicesRes = await db.collection('places').updateMany(
      { $or: [{ services: { $exists: false } }, { services: null }] },
      { $set: { services: [] } }
    );
    console.log(`- Updated 'services' in ${servicesRes.modifiedCount} documents.`);

    // 4. difficulty -> default 'Easy'
    const difficultyRes = await db.collection('places').updateMany(
      { $or: [{ difficulty: { $exists: false } }, { difficulty: null }, { difficulty: '' }] },
      { $set: { difficulty: 'Easy' } }
    );
    console.log(`- Updated 'difficulty' in ${difficultyRes.modifiedCount} documents.`);

    // 5. status -> default 'Draft'
    const statusRes = await db.collection('places').updateMany(
      { $or: [{ status: { $exists: false } }, { status: null }] },
      { $set: { status: 'Draft' } }
    );
    console.log(`- Updated 'status' in ${statusRes.modifiedCount} documents.`);

    // 6. rating -> default 0
    const ratingRes = await db.collection('places').updateMany(
      { $or: [{ rating: { $exists: false } }, { rating: null }] },
      { $set: { rating: 0 } }
    );
    console.log(`- Updated 'rating' in ${ratingRes.modifiedCount} documents.`);

    // 7. totalReview -> default 0
    const totalReviewRes = await db.collection('places').updateMany(
      { $or: [{ totalReview: { $exists: false } }, { totalReview: null }] },
      { $set: { totalReview: 0 } }
    );
    console.log(`- Updated 'totalReview' in ${totalReviewRes.modifiedCount} documents.`);

    // 8. openCount -> default 0
    const openCountRes = await db.collection('places').updateMany(
      { $or: [{ openCount: { $exists: false } }, { openCount: null }] },
      { $set: { openCount: 0 } }
    );
    console.log(`- Updated 'openCount' in ${openCountRes.modifiedCount} documents.`);

    // 9. accessibility features and notes
    // First set accessibility object if it doesn't exist
    const accObjRes = await db.collection('places').updateMany(
      { $or: [{ accessibility: { $exists: false } }, { accessibility: null }] },
      { $set: { accessibility: { features: [], notes: '' } } }
    );
    console.log(`- Created 'accessibility' object in ${accObjRes.modifiedCount} documents.`);

    // Then ensure accessibility.features is an array
    const accFeatRes = await db.collection('places').updateMany(
      { $or: [{ 'accessibility.features': { $exists: false } }, { 'accessibility.features': null }] },
      { $set: { 'accessibility.features': [] } }
    );
    console.log(`- Updated 'accessibility.features' in ${accFeatRes.modifiedCount} documents.`);

    // Ensure accessibility.notes is a string
    const accNotesRes = await db.collection('places').updateMany(
      { $or: [{ 'accessibility.notes': { $exists: false } }, { 'accessibility.notes': null }] },
      { $set: { 'accessibility.notes': '' } }
    );
    console.log(`- Updated 'accessibility.notes' in ${accNotesRes.modifiedCount} documents.`);


    console.log('\n--- Migrating Offers ---');

    // 1. noExpiration -> default false
    const noExpRes = await db.collection('offers').updateMany(
      { $or: [{ noExpiration: { $exists: false } }, { noExpiration: null }] },
      { $set: { noExpiration: false } }
    );
    console.log(`- Updated 'noExpiration' in ${noExpRes.modifiedCount} documents.`);

    // 2. redemptionRules -> default []
    const redRulesRes = await db.collection('offers').updateMany(
      { $or: [{ redemptionRules: { $exists: false } }, { redemptionRules: null }] },
      { $set: { redemptionRules: [] } }
    );
    console.log(`- Updated 'redemptionRules' in ${redRulesRes.modifiedCount} documents.`);

    // 3. buttonLabel -> default 'Redeem Offer'
    const btnLabelRes = await db.collection('offers').updateMany(
      { $or: [{ buttonLabel: { $exists: false } }, { buttonLabel: null }] },
      { $set: { buttonLabel: 'Redeem Offer' } }
    );
    console.log(`- Updated 'buttonLabel' in ${btnLabelRes.modifiedCount} documents.`);

    // 4. redemptionDuration -> default 5
    const redDurRes = await db.collection('offers').updateMany(
      { $or: [{ redemptionDuration: { $exists: false } }, { redemptionDuration: null }] },
      { $set: { redemptionDuration: 5 } }
    );
    console.log(`- Updated 'redemptionDuration' in ${redDurRes.modifiedCount} documents.`);

    // 5. status -> default 'Active'
    const offerStatusRes = await db.collection('offers').updateMany(
      { $or: [{ status: { $exists: false } }, { status: null }] },
      { $set: { status: 'Active' } }
    );
    console.log(`- Updated 'status' in ${offerStatusRes.modifiedCount} documents.`);

    // 6. redemptionsCount -> default 0
    const redCountRes = await db.collection('offers').updateMany(
      { $or: [{ redemptionsCount: { $exists: false } }, { redemptionsCount: null }] },
      { $set: { redemptionsCount: 0 } }
    );
    console.log(`- Updated 'redemptionsCount' in ${redCountRes.modifiedCount} documents.`);

    await mongoose.disconnect();
    console.log('\nMigration complete. Disconnected from database.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixMissingFields();
