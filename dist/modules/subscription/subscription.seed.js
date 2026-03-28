"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSubscriptionPlans = seedSubscriptionPlans;
exports.updateSubscriptionPlans = updateSubscriptionPlans;
exports.createSpecificPlan = createSpecificPlan;
const subscription_plan_model_1 = require("./subscription-plan.model");
const stripe_service_1 = require("./stripe.service");
// Default subscription plans
const defaultPlans = [
    {
        name: 'Free Plan',
        description: 'Basic access for individuals',
        price: 0,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 0,
        features: [
            'Basic Features access',
            'Community support',
            'Standard analytics',
        ],
        maxTeamMembers: 1,
        maxServices: 5,
        userTypes: ['user'],
        priority: 1,
    },
    {
        name: 'Monthly Plan',
        description: 'Full access with monthly billing',
        price: 19.99,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 14,
        features: [
            'All Basic Features',
            'Priority support',
            'Advanced analytics',
            'Custom integrations',
        ],
        maxTeamMembers: 5,
        maxServices: 50,
        userTypes: ['user'],
        priority: 2,
    },
    {
        name: 'Yearly Plan',
        description: 'Best value for long-term usage',
        price: 199.99,
        currency: 'usd',
        interval: 'year',
        intervalCount: 1,
        trialPeriodDays: 14,
        features: [
            'Everything in Monthly',
            'Save 20% annually',
            'Dedicated account manager',
            'Early access to new features',
            'API access',
        ],
        maxTeamMembers: 20,
        maxServices: 999,
        userTypes: ['user'],
        priority: 3,
    },
];
async function seedSubscriptionPlans() {
    try {
        console.log('Starting subscription plans seeding...');
        // Check if plans already exist
        const existingPlansCount = await subscription_plan_model_1.SubscriptionPlan.countDocuments();
        if (existingPlansCount > 0) {
            console.log(`${existingPlansCount} subscription plans already exist. Skipping seed.`);
            return;
        }
        // Create plans in Stripe and database
        for (const planData of defaultPlans) {
            try {
                // Create Stripe product
                const stripeProduct = await stripe_service_1.stripeService.createProduct({
                    name: planData.name,
                    description: planData.description,
                    metadata: {
                        userTypes: planData.userTypes.join(','),
                        maxTeamMembers: planData.maxTeamMembers.toString(),
                        maxServices: planData.maxServices.toString(),
                    },
                });
                // Create Stripe price
                const stripePrice = await stripe_service_1.stripeService.createPrice({
                    productId: stripeProduct.id,
                    unitAmount: Math.round(planData.price * 100), // Convert to cents
                    currency: planData.currency,
                    interval: planData.interval,
                    intervalCount: planData.intervalCount,
                    metadata: {
                        planName: planData.name,
                    },
                });
                // Create local plan
                const plan = new subscription_plan_model_1.SubscriptionPlan({
                    ...planData,
                    stripeProductId: stripeProduct.id,
                    stripePriceId: stripePrice.id,
                    isActive: true,
                });
                await plan.save();
                console.log(`Created subscription plan: ${planData.name}`);
            }
            catch (error) {
                console.error(`Error creating plan ${planData.name}:`, error);
                // Continue with other plans even if one fails
            }
        }
        console.log('Subscription plans seeding completed successfully');
    }
    catch (error) {
        console.error('Error seeding subscription plans:', error);
        throw error;
    }
}
// Function to update existing plans (for migrations)
async function updateSubscriptionPlans() {
    try {
        console.log('Updating subscription plans...');
        // Add any plan updates here
        // Example: Update features for existing plans
        console.log('Subscription plans update completed');
    }
    catch (error) {
        console.error('Error updating subscription plans:', error);
        throw error;
    }
}
// Function to create a specific plan (for testing or manual creation)
async function createSpecificPlan(planData) {
    try {
        // Create Stripe product
        const stripeProduct = await stripe_service_1.stripeService.createProduct({
            name: planData.name,
            description: planData.description,
            metadata: planData.metadata || {},
        });
        // Create Stripe price
        const stripePrice = await stripe_service_1.stripeService.createPrice({
            productId: stripeProduct.id,
            unitAmount: Math.round(planData.price * 100),
            currency: planData.currency,
            interval: planData.interval,
            intervalCount: planData.intervalCount || 1,
        });
        // Create local plan
        const plan = new subscription_plan_model_1.SubscriptionPlan({
            ...planData,
            stripeProductId: stripeProduct.id,
            stripePriceId: stripePrice.id,
        });
        await plan.save();
        console.log(`Created specific plan: ${planData.name}`);
    }
    catch (error) {
        console.error(`Error creating specific plan:`, error);
        throw error;
    }
}
