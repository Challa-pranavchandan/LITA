import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function seedIndiaShipping({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  logger.info("Checking regions...")
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "payment_providers.id"],
  })

  logger.info(`Found ${regions.length} region(s): ${JSON.stringify(regions, null, 2)}`)

  const inRegion = regions.find(
    (r: any) =>
      r.currency_code === "inr" ||
      r.countries?.some((c: any) => c.iso_2?.toLowerCase() === "in")
  ) || regions[0]

  if (!inRegion) {
    logger.error("No region found.")
    return
  }

  logger.info(`Using target region: ${inRegion.name} (${inRegion.id}), currency: ${inRegion.currency_code}`)

  // 1. Check / ensure Razorpay payment provider is linked to region
  const hasRazorpay = inRegion.payment_providers?.some(
    (p: any) => p.id === "pp_razorpay_razorpay" || p.id === "razorpay"
  )
  if (!hasRazorpay) {
    logger.info("Linking pp_razorpay_razorpay to region...")
    try {
      await link.create({
        [Modules.REGION]: {
          region_id: inRegion.id,
        },
        [Modules.PAYMENT]: {
          payment_provider_id: "pp_razorpay_razorpay",
        },
      })
      logger.info("Successfully linked Razorpay to region!")
    } catch (e: any) {
      logger.warn(`Could not link Razorpay provider (might already exist or differ): ${e.message}`)
    }
  } else {
    logger.info("Razorpay payment provider is already linked to region.")
  }

  // 2. Query stock locations & fulfillment sets
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "fulfillment_sets.id", "fulfillment_sets.name", "fulfillment_sets.service_zones.*"],
  })

  logger.info(`Found ${stockLocations.length} stock location(s).`)

  let stockLocation: any = stockLocations[0]
  if (!stockLocation) {
    logger.info("Creating default stock location...")
    const stockLocationModule = container.resolve(ModuleRegistrationName.STOCK_LOCATION)
    stockLocation = await stockLocationModule.createStockLocations({
      name: "Main Art Studio & Warehouse",
      address: {
        city: "Hyderabad",
        country_code: "IN",
        address_1: "Studio Gallery",
      },
    })

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })
  }

  // 3. Find or create fulfillment set & service zone for India
  let fulfillmentSet: any = stockLocation.fulfillment_sets?.[0]
  let serviceZone: any = fulfillmentSet?.service_zones?.find(
    (sz: any) => sz.geo_zones?.some((gz: any) => gz.country_code?.toLowerCase() === "in")
  ) || fulfillmentSet?.service_zones?.[0]

  if (!fulfillmentSet) {
    logger.info("Creating fulfillment set for shipping...")
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Domestic & Art Courier Delivery",
      type: "shipping",
      service_zones: [
        {
          name: "India Delivery Zone",
          geo_zones: [
            {
              country_code: "in",
              type: "country",
            },
          ],
        },
      ],
    })

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })

    serviceZone = fulfillmentSet?.service_zones?.[0]
  } else if (!serviceZone) {
    logger.info("Adding service zone with India to existing fulfillment set...")
    const createdZone = await fulfillmentModuleService.createServiceZones({
      fulfillment_set_id: fulfillmentSet.id,
      name: "India Delivery Zone",
      geo_zones: [
        {
          country_code: "in",
          type: "country",
        },
      ],
    })
    serviceZone = Array.isArray(createdZone) ? createdZone[0] : createdZone
  } else {
    // Ensure 'in' country is in the service zone
    const hasIndia = serviceZone.geo_zones?.some(
      (gz: any) => gz.country_code?.toLowerCase() === "in"
    )
    if (!hasIndia) {
      logger.info("Adding country 'in' to service zone geo_zones...")
      try {
        await fulfillmentModuleService.createGeoZones({
          service_zone_id: serviceZone.id,
          country_code: "in",
          type: "country",
        })
      } catch (e: any) {
        logger.warn(`Could not add geo zone: ${e.message}`)
      }
    }
  }

  // Ensure fulfillment provider is linked to stock location
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })
  } catch {}

  // 4. Query shipping profile
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    logger.error("No shipping profile found!")
    return
  }

  // 5. Query existing shipping options
  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  })
  logger.info(`Existing shipping options: ${existingOptions.map((o: any) => o.name).join(", ") || "none"}`)

  const hasStandard = existingOptions.some((o: any) => o.name.toLowerCase().includes("standard"))

  if (!hasStandard) {
    logger.info("Creating Standard Delivery shipping option...")
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Artwork Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZone.id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Insured standard delivery in 3-5 business days.",
            code: "standard",
          },
          prices: [
            {
              currency_code: inRegion.currency_code || "inr",
              amount: 0, // Free delivery
            },
            {
              region_id: inRegion.id,
              amount: 0,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
        {
          name: "Express Insured Courier",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZone.id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: "Priority expedited art packaging and express transit (1-2 days).",
            code: "express",
          },
          prices: [
            {
              currency_code: inRegion.currency_code || "inr",
              amount: 250,
            },
            {
              region_id: inRegion.id,
              amount: 250,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    })
    logger.info("Successfully created Standard and Express shipping options for India!")
  } else {
    logger.info("Standard shipping option already exists.")
  }

  logger.info("=== SEEDING COMPLETED SUCCESSFULLY! ===")
}
