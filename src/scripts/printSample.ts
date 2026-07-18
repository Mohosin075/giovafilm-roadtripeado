import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Place } from '../modules/place/place.model';
import { Offer } from '../modules/offer/offer.model';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function printSample() {
  await mongoose.connect(DATABASE_URL!);
  const place = await Place.findOne({});
  const offer = await Offer.findOne({});
  console.log('--- Sample Place Doc ---');
  console.log(JSON.stringify(place, null, 2));
  console.log('--- Sample Offer Doc ---');
  console.log(JSON.stringify(offer, null, 2));
  await mongoose.disconnect();
}

printSample();
