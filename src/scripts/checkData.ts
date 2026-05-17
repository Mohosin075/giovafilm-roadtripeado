import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function checkData() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env');
    return;
  }

  try {
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to database');

    const Map = mongoose.model('Map', new mongoose.Schema({}, { strict: false }), 'maps');
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }), 'categories');

    const maps = await Map.find({}, { name: 1 });
    const categories = await Category.find({}, { name: 1 });

    console.log('--- Maps ---');
    console.log(JSON.stringify(maps, null, 2));

    console.log('--- Categories ---');
    console.log(JSON.stringify(categories, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
