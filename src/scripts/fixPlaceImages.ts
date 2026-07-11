/**
 * fixPlaceImages.ts
 *
 * এই script টি DB তে সব Place এর media[] array চেক করে।
 * যেসব Place এর image নেই বা Google My Maps private URL আছে,
 * সেগুলোর জন্য Google Places API দিয়ে real photo URL খুঁজে DB update করে।
 *
 * Run: npx ts-node src/scripts/fixPlaceImages.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;
const GOOGLE_API_KEY = process.env.SERVER_MAP_API_KEY!;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const PlaceSchema = new mongoose.Schema({
  name: { type: String },
  media: { type: [String], default: [] },
  location: {
    type: { type: String },
    coordinates: { type: [Number] },
  },
  country: { type: String },
});

const Place = mongoose.model('Place', PlaceSchema, 'places');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Google private URL কিনা check করে
 */
function isGooglePrivateUrl(url: string): boolean {
  return (
    url.includes('mymaps.usercontent.google.com') ||
    url.includes('authuser=') ||
    url.includes('fife=s') ||
    url.startsWith('/images/')
  );
}

/**
 * কোনো place এর media array fix করা দরকার কিনা
 */
function needsFix(media: string[]): boolean {
  if (!media || media.length === 0) return true;
  return media.some((url) => isGooglePrivateUrl(url));
}

/**
 * Google Places API → Text Search → Place Photos
 * Place এর নাম দিয়ে search করে photo URL return করে
 */
async function fetchGooglePlacePhotos(
  placeName: string,
  country: string,
  maxPhotos = 3,
): Promise<string[]> {
  try {
    // Step 1: Text Search দিয়ে place খুঁজি
    const searchRes = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json`,
      {
        params: {
          query: `${placeName} ${country}`,
          key: GOOGLE_API_KEY,
        },
        timeout: 10000,
      },
    );

    const results = searchRes.data.results;
    if (!results || results.length === 0) {
      console.log(`  ⚠️  No Google Places result for: "${placeName}"`);
      return [];
    }

    const placeId = results[0].place_id;

    // Step 2: Place Details দিয়ে photos নিই
    const detailsRes = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id: placeId,
          fields: 'photos',
          key: GOOGLE_API_KEY,
        },
        timeout: 10000,
      },
    );

    const photos = detailsRes.data.result?.photos;
    if (!photos || photos.length === 0) {
      console.log(`  ⚠️  No photos found for: "${placeName}"`);
      return [];
    }

    // Step 3: Photo Reference থেকে actual photo URL তৈরি করি
    const photoUrls: string[] = [];
    const photosToFetch = photos.slice(0, maxPhotos);

    for (const photo of photosToFetch) {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
      photoUrls.push(photoUrl);
    }

    return photoUrls;
  } catch (error: any) {
    console.error(`  ❌ Google API error for "${placeName}": ${error.message}`);
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function fixPlaceImages() {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  if (!GOOGLE_API_KEY) {
    console.error('❌ SERVER_MAP_API_KEY not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(DATABASE_URL);
  console.log('✅ Connected!\n');

  // সব Place এনে filter করি
  const allPlaces = await Place.find({}).lean();
  console.log(`📍 Total places in DB: ${allPlaces.length}`);

  const placesNeedingFix = allPlaces.filter((p) =>
    needsFix(p.media as string[]),
  );
  console.log(`🔧 Places needing image fix: ${placesNeedingFix.length}\n`);

  if (placesNeedingFix.length === 0) {
    console.log('🎉 All places already have valid images!');
    await mongoose.disconnect();
    return;
  }

  let fixed = 0;
  let skipped = 0;

  for (let i = 0; i < placesNeedingFix.length; i++) {
    const place = placesNeedingFix[i];
    const name = place.name as string;
    const country = (place.country as string) || 'Puerto Rico';

    console.log(
      `[${i + 1}/${placesNeedingFix.length}] 🔍 Searching: "${name}"`,
    );

    const photoUrls = await fetchGooglePlacePhotos(name, country, 3);

    if (photoUrls.length > 0) {
      await Place.findByIdAndUpdate(place._id, {
        $set: { media: photoUrls },
      });
      console.log(`  ✅ Updated with ${photoUrls.length} photo(s)\n`);
      fixed++;
    } else {
      console.log(`  ⏭️  Skipped (no photos found)\n`);
      skipped++;
    }

    // Rate limiting: প্রতি 10 place এ 2s delay, বাকিতে 300ms
    if ((i + 1) % 10 === 0) {
      console.log('⏳ Rate limit pause (2s)...\n');
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Fixed:   ${fixed} places`);
  console.log(`⏭️  Skipped: ${skipped} places (no Google result)`);
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

fixPlaceImages().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
