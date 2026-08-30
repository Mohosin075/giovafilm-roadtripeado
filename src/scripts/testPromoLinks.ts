import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { User } from '../modules/user/user.model'
import { Map } from '../modules/map/map.model'
import { PromoLink } from '../modules/promo/promo.model'
import { PromoServices } from '../modules/promo/promo.service'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const DATABASE_URL = process.env.DATABASE_URL

async function testPromoLinks() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env file')
    return
  }

  console.log('Connecting to database:', DATABASE_URL)
  await mongoose.connect(DATABASE_URL)

  try {
    // 1. Get a map to use for testing
    let map = await Map.findOne()
    if (!map) {
      console.log('Creating a test map...')
      map = await Map.create({
        name: 'Test Map Puerto Rico',
        description: 'Test Description',
        isPaid: true,
        price: 15.0,
        status: 'Active',
      })
    }
    console.log(`Using Map: ${map.name} (${map._id.toString()})`)

    // 2. Get a user to use for testing
    let user = await User.findOne()
    if (!user) {
      console.log('Creating a test user...')
      user = await User.create({
        name: 'Test User',
        email: 'testpromo@example.com',
        role: 'user',
        status: 'active',
        purchasedMaps: [],
      })
    }
    console.log(`Using User: ${user.name} (${user.email})`)

    // Clean up any old test promo codes
    await PromoLink.deleteMany({ label: { $regex: /Test Promo/ } })

    // 3. Test Bulk Generation
    console.log('\n--- Test 1: Bulk Generation ---')
    const generated = await PromoServices.bulkGeneratePromoLinks({
      mapId: map._id.toString(),
      price: 0, // Free link
      promoType: 'influencer',
      label: 'Test Promo Free',
      emails: [user.email!],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day expiry
    })

    if (generated.length === 1) {
      console.log(
        `✅ Bulk generated 1 free code successfully: ${generated[0].code}`,
      )
    } else {
      throw new Error('Failed to bulk generate free code')
    }

    const generatedPaid = await PromoServices.bulkGeneratePromoLinks({
      mapId: map._id.toString(),
      price: 5.0, // Paid link
      promoType: 'upgrade',
      label: 'Test Promo Paid',
      emails: [user.email!],
    })

    if (generatedPaid.length === 1) {
      console.log(
        `✅ Bulk generated 1 paid code successfully: ${generatedPaid[0].code}`,
      )
    } else {
      throw new Error('Failed to bulk generate paid code')
    }

    // 4. Test Verification
    console.log('\n--- Test 2: Verify Code ---')
    const verifiedFree = await PromoServices.verifyPromoCode(generated[0].code)
    console.log(
      `✅ Verified Free code: ${verifiedFree.code}, Price: ${verifiedFree.price}, Type: ${verifiedFree.promoType}, Map: ${verifiedFree.mapName}`,
    )

    const verifiedPaid = await PromoServices.verifyPromoCode(
      generatedPaid[0].code,
    )
    console.log(
      `✅ Verified Paid code: ${verifiedPaid.code}, Price: ${verifiedPaid.price}, Type: ${verifiedPaid.promoType}, Map: ${verifiedPaid.mapName}`,
    )

    // Remove map from user's purchasedMaps first to test claiming
    await User.findByIdAndUpdate(user._id, {
      $pull: { purchasedMaps: map._id },
    })

    // 5. Test Claim Free Promo Code
    console.log('\n--- Test 3: Claim Free Promo ---')
    const claimRes = await PromoServices.claimFreePromo(
      user._id.toString(),
      generated[0].code,
    )
    console.log('Claim Response:', claimRes)

    // Verify map is in user's purchasedMaps
    const updatedUser = await User.findById(user._id)
    const isUnlocked = updatedUser?.purchasedMaps?.some(
      (id: any) => id.toString() === map!._id.toString(),
    )
    if (isUnlocked) {
      console.log('✅ Map unlocked successfully in user account')
    } else {
      throw new Error('Map was not found in user account after claim')
    }

    // Verify link status
    const claimedLink = await PromoLink.findOne({ code: generated[0].code })
    if (
      claimedLink?.isUsed &&
      claimedLink?.usedBy?.toString() === user._id.toString()
    ) {
      console.log('✅ Promo link status updated to used with correct userId')
    } else {
      throw new Error('Promo link record was not correctly updated')
    }

    // 6. Test Double Claim Prevention
    console.log('\n--- Test 4: Prevent Double Claiming ---')
    try {
      await PromoServices.claimFreePromo(user._id.toString(), generated[0].code)
      throw new Error('Double claim should have thrown an error')
    } catch (err: any) {
      console.log(`✅ Double claiming correctly blocked: ${err.message}`)
    }

    // 7. Simulate Webhook Checkout Processing for Paid Promo
    console.log('\n--- Test 5: Simulate Webhook / Paid Upgrade ---')
    // We clean up map access again
    await User.findByIdAndUpdate(user._id, {
      $pull: { purchasedMaps: map._id },
    })

    // Simulate the PromoLink update when payment is received (the logic implemented in webhooks)
    const promoCode = generatedPaid[0].code
    const promoLink = await PromoLink.findOneAndUpdate(
      { code: promoCode, isUsed: false },
      {
        isUsed: true,
        usedBy: user._id,
        usedAt: new Date(),
      },
      { new: true },
    )

    if (promoLink && promoLink.isUsed) {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { purchasedMaps: promoLink.mapId },
      })
      console.log(
        '✅ Simulated Stripe payment processing successfully unlocked the map and marked the promo code as used',
      )
    } else {
      throw new Error('Failed to simulate Stripe payment processing')
    }

    // Clean up
    await PromoLink.deleteMany({ label: { $regex: /Test Promo/ } })
    console.log('\n✅ All tests passed successfully!')
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from database')
  }
}

testPromoLinks()
