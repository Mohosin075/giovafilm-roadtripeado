import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Place } from '../modules/place/place.model';
import { Map } from '../modules/map/map.model';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function findDonBistro() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env');
    return;
  }

  try {
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to database');

    // Force load models to ensure registration
    const mapModelName = Map.modelName;
    console.log('Registered Model:', mapModelName);

    // Find place with name "Don Bistro" or containing it
    const places = await Place.find({ name: /Don Bistro/i }).populate('map');
    console.log(`Found ${places.length} places matching 'Don Bistro':`);
    
    for (const place of places) {
      console.log('-----------------------------');
      console.log(`ID: ${place._id}`);
      console.log(`Name: ${place.name}`);
      console.log(`Type: ${place.type}`);
      console.log(`Address: ${place.address}`);
      console.log(`Map: ${place.map ? (place.map as any).name + ' (' + (place.map as any)._id + ')' : 'None'}`);
      console.log(`Map Status: ${place.map ? (place.map as any).status : 'N/A'}`);
      console.log(`Map isPaid: ${place.map ? (place.map as any).isPaid : 'N/A'}`);
      console.log(`Place Status/Details:`, {
        // any custom status if exists in schema
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

findDonBistro();
