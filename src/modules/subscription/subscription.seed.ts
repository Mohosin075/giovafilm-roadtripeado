import { SubscriptionPlan } from './subscription-plan.model'
import { stripeService } from './stripe.service'

// Default subscription plans
const defaultPlans = [
  {
    name: 'Monthly Business Plan',
    description: 'Perfect for growing your business visibility. Billed monthly, cancel anytime.',
    price: 6,
    currency: 'usd',
    interval: 'month' as const,
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
    interval: 'year' as const,
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
]

export async function seedSubscriptionPlans(): Promise<void> {
  try {
    console.log('Starting subscription plans seeding...')

    // Clear old/existing plans to avoid duplication/unprofessional names
    console.log('Clearing existing subscription plans from database...')
    await SubscriptionPlan.deleteMany({})

    // Create plans in Stripe and database
    for (const planData of defaultPlans) {
      try {
        // Check if plan already exists by name
        const existingPlan = await SubscriptionPlan.findOne({
          name: planData.name,
        })
        if (existingPlan) {
          existingPlan.description = planData.description
          existingPlan.features = planData.features
          await existingPlan.save()
          console.log(
            `Subscription plan ${planData.name} already exists. Updated features and description.`,
          )
          continue
        }

        // Create Stripe product
        const stripeProduct = await stripeService.createProduct({
          name: planData.name,
          description: planData.description,
          metadata: {
            maxPhotos: planData.maxPhotos.toString(),
          },
        })

        // Create Stripe price
        const stripePrice = await stripeService.createPrice({
          productId: stripeProduct.id,
          unitAmount: Math.round(planData.price * 100), // Convert to cents
          currency: planData.currency,
          interval: planData.interval,
          intervalCount: planData.intervalCount,
          metadata: {
            planName: planData.name,
          },
        })

        // Create local plan
        const plan = new SubscriptionPlan({
          ...planData,
          stripeProductId: stripeProduct.id,
          stripePriceId: stripePrice.id,
          isActive: true,
        })

        await plan.save()
        console.log(`Created subscription plan: ${planData.name}`)
      } catch (error) {
        console.error(`Error creating plan ${planData.name}:`, error)
        // Continue with other plans even if one fails
      }
    }

    console.log('Subscription plans seeding completed successfully')
  } catch (error) {
    console.error('Error seeding subscription plans:', error)
    throw error
  }
}

// Function to update existing plans (for migrations)
export async function updateSubscriptionPlans(): Promise<void> {
  try {
    console.log('Updating subscription plans...')

    // Add any plan updates here
    // Example: Update features for existing plans

    console.log('Subscription plans update completed')
  } catch (error) {
    console.error('Error updating subscription plans:', error)
    throw error
  }
}

// Function to create a specific plan (for testing or manual creation)
export async function createSpecificPlan(planData: any): Promise<void> {
  try {
    // Create Stripe product
    const stripeProduct = await stripeService.createProduct({
      name: planData.name,
      description: planData.description,
      metadata: planData.metadata || {},
    })

    // Create Stripe price
    const stripePrice = await stripeService.createPrice({
      productId: stripeProduct.id,
      unitAmount: Math.round(planData.price * 100),
      currency: planData.currency,
      interval: planData.interval,
      intervalCount: planData.intervalCount || 1,
    })

    // Create local plan
    const plan = new SubscriptionPlan({
      ...planData,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
    })

    await plan.save()
    console.log(`Created specific plan: ${planData.name}`)
  } catch (error) {
    console.error(`Error creating specific plan:`, error)
    throw error
  }
}
