import { NextRequest, NextResponse } from "next/server";
import { CartSyncService } from "@/lib/sync/cart-sync";

/**
 * Sync a cart with Shopify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartId, storeId } = body;

    if (!cartId || !storeId) {
      return NextResponse.json(
        { error: "Cart ID and Store ID are required" },
        { status: 400 }
      );
    }

    // Initialize cart sync service
    const cartSyncService = new CartSyncService(storeId);
    const initialized = await cartSyncService.initialize();

    if (!initialized) {
      return NextResponse.json(
        { error: "Failed to initialize cart sync service. Shopify integration may not be configured." },
        { status: 500 }
      );
    }

    // Sync cart to Shopify
    const shopifyCartId = await cartSyncService.syncCartToShopify(cartId);

    if (!shopifyCartId) {
      return NextResponse.json(
        { error: "Failed to sync cart to Shopify" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shopifyCartId,
    });
  } catch (error) {
    console.error("Error syncing cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get abandoned carts from Shopify
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const action = searchParams.get("action");

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // Initialize cart sync service
    const cartSyncService = new CartSyncService(storeId);
    const initialized = await cartSyncService.initialize();

    if (!initialized) {
      return NextResponse.json(
        { error: "Failed to initialize cart sync service. Shopify integration may not be configured." },
        { status: 500 }
      );
    }

    // Handle different actions
    if (action === "import") {
      // Import abandoned carts from Shopify
      const importedCount = await cartSyncService.importAbandonedCarts();
      
      return NextResponse.json({
        success: true,
        imported: importedCount,
      });
    } else if (action === "stats") {
      // Get recovery statistics
      const stats = await cartSyncService.getRecoveryStats();
      
      return NextResponse.json({
        success: true,
        stats,
      });
    } else {
      // Default: Get abandoned carts from Shopify
      const abandonedCarts = await cartSyncService.getAbandonedCarts();
      
      return NextResponse.json({
        success: true,
        carts: abandonedCarts,
      });
    }
  } catch (error) {
    console.error("Error getting abandoned carts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
