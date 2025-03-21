import { NextResponse } from "next/server";
import { CartSyncService } from "@/lib/sync/cart-sync";
import prisma from "@/lib/prisma";

// This endpoint is designed to be called by a cron job service
// It will process abandoned carts, import from Shopify, and send recovery messages
export async function GET() {
  try {
    const startTime = Date.now();
    const results = {
      stores: 0,
      imported: 0,
      abandoned: 0,
      notified: 0,
      followUp: 0,
      recovered: 0,
      lost: 0,
      errors: 0,
    };

    // Get all active stores with Shopify integration
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
        shopifyAccessToken: { not: null },
        shopifyStoreUrl: { not: null },
      },
      select: {
        id: true,
      },
    });

    results.stores = stores.length;
    console.log(`Found ${stores.length} active stores with Shopify integration`);

    // Process each store
    for (const store of stores) {
      try {
        // Initialize cart sync service
        const cartSyncService = new CartSyncService(store.id);
        const initialized = await cartSyncService.initialize();

        if (!initialized) {
          console.error(`Failed to initialize cart sync service for store ${store.id}`);
          results.errors++;
          continue;
        }

        // 1. Import abandoned carts from Shopify
        const importedCount = await cartSyncService.importAbandonedCarts();
        results.imported += importedCount;
        console.log(`Imported ${importedCount} carts from Shopify for store ${store.id}`);

        // 2. Process abandoned carts
        // Find carts that have been inactive for more than 1 hour and not marked as abandoned
        const abandonedCarts = await prisma.cart.findMany({
          where: {
            storeId: store.id,
            updatedAt: {
              lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            },
            recoveryStatus: "NONE",
            customerPhone: {
              not: null,
            },
          },
        });

        results.abandoned += abandonedCarts.length;
        console.log(`Found ${abandonedCarts.length} abandoned carts for store ${store.id}`);

        // Process each abandoned cart
        for (const cart of abandonedCarts) {
          try {
            // Mark the cart as abandoned
            await prisma.cart.update({
              where: { id: cart.id },
              data: {
                abandonedAt: new Date(),
                recoveryStatus: "ABANDONED",
              },
            });

            // Send recovery message
            if (cart.customerPhone) {
              const sent = await cartSyncService.sendCartRecoveryMessage(cart.id);
              if (sent) {
                results.notified++;
              }
            }
          } catch (cartError) {
            console.error(`Error processing abandoned cart ${cart.id}:`, cartError);
            results.errors++;
          }
        }

        // 3. Process follow-up carts
        // Find carts that were notified 24 hours ago and have not been recovered
        const followUpCarts = await prisma.cart.findMany({
          where: {
            storeId: store.id,
            recoveryStatus: "NOTIFIED_FIRST",
            lastNotifiedAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
            customerPhone: {
              not: null,
            },
          },
        });

        results.followUp += followUpCarts.length;
        console.log(`Found ${followUpCarts.length} carts for follow-up for store ${store.id}`);

        // Process each follow-up cart
        for (const cart of followUpCarts) {
          try {
            // Send final reminder message
            if (cart.customerPhone) {
              const sent = await cartSyncService.sendCartRecoveryMessage(cart.id);
              if (sent) {
                results.notified++;
              }
            }
          } catch (cartError) {
            console.error(`Error processing follow-up cart ${cart.id}:`, cartError);
            results.errors++;
          }
        }

        // 4. Mark carts as lost if they were notified with the final reminder 48 hours ago
        const lostCartsResult = await prisma.cart.updateMany({
          where: {
            storeId: store.id,
            recoveryStatus: "NOTIFIED_FINAL",
            lastNotifiedAt: {
              lt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
            },
          },
          data: {
            recoveryStatus: "LOST",
          },
        });

        results.lost += lostCartsResult.count;
        console.log(`Marked ${lostCartsResult.count} carts as lost for store ${store.id}`);

        // 5. Get recovery stats
        const stats = await cartSyncService.getRecoveryStats();
        results.recovered += stats.recovered;
      } catch (storeError) {
        console.error(`Error processing store ${store.id}:`, storeError);
        results.errors++;
      }
    }

    const duration = (Date.now() - startTime) / 1000; // in seconds
    console.log(`Cart recovery cron job completed in ${duration.toFixed(2)} seconds`);

    // Return the results
    return NextResponse.json({
      success: true,
      message: "Cart recovery process completed successfully",
      duration: `${duration.toFixed(2)} seconds`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CART_RECOVERY_CRON]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Cart recovery process failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
