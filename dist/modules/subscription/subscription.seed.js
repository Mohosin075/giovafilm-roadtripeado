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
        name: {
            en: 'Monthly Business Plan',
            es: 'Plan de Negocio Mensual',
        },
        description: {
            en: 'Perfect for growing your business visibility. Billed monthly, cancel anytime.',
            es: 'Perfecto para aumentar la visibilidad de tu negocio. Facturado mensualmente, cancela cuando quieras.',
        },
        price: 6,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 0,
        features: [
            {
                en: "Add 1 business to the selected country's map",
                es: 'Añade 1 negocio al mapa del país seleccionado',
            },
            {
                en: 'Complete business information',
                es: 'Información comercial completa',
            },
            {
                en: 'Edit your own registered business details',
                es: 'Edita los detalles de tu negocio registrado',
            },
            {
                en: 'Add photos, descriptions, operating hours & contact info',
                es: 'Añade fotos, descripciones, horarios de atención e información de contacto',
            },
            {
                en: 'Configure exclusive discounts & offers',
                es: 'Configura descuentos y ofertas exclusivas',
            },
            {
                en: 'Track business profile visits & views',
                es: 'Monitorea las visitas y visualizaciones del perfil de tu negocio',
            },
            {
                en: 'Monitor exclusive discount redemptions',
                es: 'Monitorea los canjes de descuentos exclusivos',
            },
        ],
        maxPhotos: 10,
        priority: 1,
    },
    {
        name: {
            en: 'Yearly Business Plan',
            es: 'Plan de Negocio Anual',
        },
        description: {
            en: 'Best value for long-term growth. Save 16.67% compared to the monthly plan.',
            es: 'El mejor valor para el crecimiento a largo plazo. Ahorra 16.67% comparado con el plan mensual.',
        },
        price: 60,
        currency: 'usd',
        interval: 'year',
        intervalCount: 1,
        trialPeriodDays: 0,
        features: [
            {
                en: "Add 1 business to the selected country's map",
                es: 'Añade 1 negocio al mapa del país seleccionado',
            },
            {
                en: 'Complete business information',
                es: 'Información comercial completa',
            },
            {
                en: 'Edit your own registered business details',
                es: 'Edita los detalles de tu negocio registrado',
            },
            {
                en: 'Add photos, descriptions, operating hours & contact info',
                es: 'Añade fotos, descripciones, horarios de atención e información de contacto',
            },
            {
                en: 'Configure exclusive discounts & offers',
                es: 'Configura descuentos y ofertas exclusivas',
            },
            {
                en: 'Track business profile visits & views',
                es: 'Monitorea las visitas y visualizaciones del perfil de tu negocio',
            },
            {
                en: 'Monitor exclusive discount redemptions',
                es: 'Monitorea los canjes de descuentos exclusivos',
            },
        ],
        maxPhotos: 10,
        priority: 2,
    },
];
async function seedSubscriptionPlans() {
    try {
        console.log('Starting subscription plans seeding...');
        // Clear old/existing plans to avoid duplication/unprofessional names
        console.log('Clearing existing subscription plans from database...');
        await subscription_plan_model_1.SubscriptionPlan.deleteMany({});
        // Create plans in Stripe and database
        for (const planData of defaultPlans) {
            try {
                const rawName = typeof planData.name === 'string' ? planData.name : planData.name.en;
                const rawDesc = typeof planData.description === 'string' ? planData.description : planData.description.en;
                // Check if plan already exists by name
                const existingPlan = await subscription_plan_model_1.SubscriptionPlan.findOne({
                    $or: [
                        { 'name.en': rawName },
                        { name: rawName },
                    ],
                });
                if (existingPlan) {
                    existingPlan.description = planData.description;
                    existingPlan.features = planData.features;
                    await existingPlan.save();
                    console.log(`Subscription plan ${rawName} already exists. Updated features and description.`);
                    continue;
                }
                // Create Stripe product
                const stripeProduct = await stripe_service_1.stripeService.createProduct({
                    name: rawName,
                    description: rawDesc,
                    metadata: {
                        maxPhotos: planData.maxPhotos.toString(),
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
                        planName: rawName,
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
