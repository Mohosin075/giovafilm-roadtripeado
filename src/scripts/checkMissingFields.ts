import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

async function checkRawMissingFields() {
  try {
    await mongoose.connect(DATABASE_URL!);
    console.log('Connected to database successfully.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established properly');
    }

    // 1. Analyze Places Raw
    console.log('\n--- Analyzing Places (Raw MongoDB Documents) ---');
    const rawPlaces = await db.collection('places').find({}).toArray();
    console.log(`Total raw Places found: ${rawPlaces.length}`);

    let placesWithMissingFields = 0;
    const placeMissingSummary: Record<string, number> = {};

    rawPlaces.forEach((doc) => {
      let isMissing = false;

      // Check fields that are expected to exist
      const fieldsToCheck = [
        { name: 'type', defaultVal: 'Regular' },
        { name: 'media', defaultVal: [] },
        { name: 'services', defaultVal: [] },
        { name: 'difficulty', defaultVal: 'Easy' },
        { name: 'status', defaultVal: 'Draft' },
        { name: 'rating', defaultVal: 0 },
        { name: 'totalReview', defaultVal: 0 },
        { name: 'openCount', defaultVal: 0 }
      ];

      fieldsToCheck.forEach((f) => {
        const val = doc[f.name];
        if (val === undefined || val === null || (Array.isArray(f.defaultVal) && !Array.isArray(val))) {
          placeMissingSummary[f.name] = (placeMissingSummary[f.name] || 0) + 1;
          isMissing = true;
        }
      });

      // Special check for accessibility features
      if (!doc.accessibility || doc.accessibility.features === undefined || doc.accessibility.features === null) {
        placeMissingSummary['accessibility.features'] = (placeMissingSummary['accessibility.features'] || 0) + 1;
        isMissing = true;
      }

      if (isMissing) {
        placesWithMissingFields++;
      }
    });

    console.log('Missing/Null/Malformed fields in Places (Raw):', placeMissingSummary);
    console.log(`Places with one or more missing fields: ${placesWithMissingFields}`);

    // 2. Analyze Offers Raw
    console.log('\n--- Analyzing Offers (Raw MongoDB Documents) ---');
    const rawOffers = await db.collection('offers').find({}).toArray();
    console.log(`Total raw Offers found: ${rawOffers.length}`);

    let offersWithMissingFields = 0;
    const offerMissingSummary: Record<string, number> = {};

    rawOffers.forEach((doc) => {
      let isMissing = false;

      const fieldsToCheck = [
        { name: 'noExpiration', defaultVal: false },
        { name: 'redemptionRules', defaultVal: [] },
        { name: 'buttonLabel', defaultVal: 'Redeem Offer' },
        { name: 'redemptionDuration', defaultVal: 5 },
        { name: 'status', defaultVal: 'Active' },
        { name: 'redemptionsCount', defaultVal: 0 }
      ];

      fieldsToCheck.forEach((f) => {
        const val = doc[f.name];
        if (val === undefined || val === null || (Array.isArray(f.defaultVal) && !Array.isArray(val))) {
          offerMissingSummary[f.name] = (offerMissingSummary[f.name] || 0) + 1;
          isMissing = true;
        }
      });

      if (isMissing) {
        offersWithMissingFields++;
      }
    });

    console.log('Missing/Null/Malformed fields in Offers (Raw):', offerMissingSummary);
    console.log(`Offers with one or more missing fields: ${offersWithMissingFields}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from database.');
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

checkRawMissingFields();
