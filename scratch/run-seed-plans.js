const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  database_url: process.env.DATABASE_URL,
  stripe: {
    stripeSecretKey: process.env.STRIPE_API_SECRET,
  }
};

const Stripe = require('stripe');
const stripe = new Stripe(config.stripe.stripeSecretKey);

const SubscriptionPlanSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  currency: String,
  interval: String,
  intervalCount: Number,
  trialPeriodDays: Number,
  features: [String],
  maxPhotos: Number,
  priority: Number,
  stripeProductId: String,
  stripePriceId: String,
  isActive: Boolean,
}, { timestamps: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

const defaultPlans = [
  {
    name: 'Monthly Business Plan',
    description: 'Perfect for growing your business visibility. Billed monthly, cancel anytime.',
    price: 6,
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    trialPeriodDays: 0,
    features: [
      'Add 1 business to the selected country\'s map',
      'Complete business information',
      'Edit your own registered business details',
      'Add photos, descriptions, operating hours & contact info',
      'Configure exclusive discounts & offers',
      'Track business profile visits & views',
      'Monitor exclusive discount redemptions',
    ],
    maxPhotos: 10,
    priority: 1,
  },
  {
    name: 'Yearly Business Plan',
    description: 'Best value for long-term growth. Save 16.67% compared to the monthly plan.',
    price: 60,
    currency: 'usd',
    interval: 'year',
    intervalCount: 1,
    trialPeriodDays: 0,
    features: [
      'Add 1 business to the selected country\'s map',
      'Complete business information',
      'Edit your own registered business details',
      'Add photos, descriptions, operating hours & contact info',
      'Configure exclusive discounts & offers',
      'Track business profile visits & views',
      'Monitor exclusive discount redemptions',
    ],
    maxPhotos: 10,
    priority: 2,
  },
];

async function run() {
  await mongoose.connect(config.database_url);
  console.log('Connected to DB');

  console.log('Clearing existing subscription plans from database...');
  await SubscriptionPlan.deleteMany({});

  for (const planData of defaultPlans) {
    try {
      console.log(`Creating Stripe product for ${planData.name}...`);
      const stripeProduct = await stripe.products.create({
        name: planData.name,
        description: planData.description,
        metadata: {
          maxPhotos: planData.maxPhotos.toString(),
        },
      });

      console.log(`Creating Stripe price for ${planData.name}...`);
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(planData.price * 100),
        currency: planData.currency,
        recurring: {
          interval: planData.interval,
          interval_count: planData.intervalCount,
        },
        metadata: {
          planName: planData.name,
        },
      });

      const plan = new SubscriptionPlan({
        ...planData,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        isActive: true,
      });
      await plan.save();
      console.log(`Successfully created plan: ${plan.name} with Price ID: ${stripePrice.id}`);
    } catch (err) {
      console.error(`Failed to create plan ${planData.name}:`, err.message);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
