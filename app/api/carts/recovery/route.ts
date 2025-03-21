import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CartSyncService } from "@/lib/sync/cart-sync";
import { RecoveryStatus } from "@prisma/client";

/**
 * Process cart recovery
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get("cartId");
    const code = searchParams.get("code");

    if (!cartId) {
      return NextResponse.json(
        { error: "Cart ID is required" },
        { status: 400 }
      );
    }

    // Get the cart
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    // Validate discount code if provided
    if (code && cart.discountCode && code !== cart.discountCode) {
      return NextResponse.json(
        { error: "Invalid discount code" },
        { status: 400 }
      );
    }

    // Initialize cart sync service
    const cartSyncService = new CartSyncService(cart.storeId);
    const initialized = await cartSyncService.initialize();

    if (!initialized) {
      return NextResponse.json(
        { error: "Failed to initialize cart sync service" },
        { status: 500 }
      );
    }

    // Process recovery
    const recovered = await cartSyncService.processRecovery(cartId);

    if (!recovered) {
      return NextResponse.json(
        { error: "Failed to process recovery" },
        { status: 500 }
      );
    }

    // Get recovery URL
    const recoveryUrl = await cartSyncService.getCartRecoveryUrl(cartId);

    if (!recoveryUrl) {
      return NextResponse.json(
        { error: "Failed to get recovery URL" },
        { status: 500 }
      );
    }

    // Redirect to the recovery URL
    return NextResponse.redirect(recoveryUrl);
  } catch (error) {
    console.error("Error processing cart recovery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Send cart recovery messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, cartId } = body;

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
        { error: "Failed to initialize cart sync service" },
        { status: 500 }
      );
    }

    // If cartId is provided, send recovery message for a specific cart
    if (cartId) {
      const sent = await cartSyncService.sendCartRecoveryMessage(cartId);

      if (!sent) {
        return NextResponse.json(
          { error: "Failed to send recovery message" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Recovery message sent successfully",
      });
    }

    // Otherwise, process all abandoned carts for the store
    // Find carts that have been inactive for more than 1 hour
    // and have not been marked as abandoned or recovered
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        storeId,
        updatedAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
        recoveryStatus: RecoveryStatus.NONE,
        customerPhone: {
          not: null,
        },
      },
    });

    console.log(`Found ${abandonedCarts.length} abandoned carts`);

    // Process each abandoned cart
    const results = await Promise.all(
      abandonedCarts.map(async (cart) => {
        // Mark the cart as abandoned
        await prisma.cart.update({
          where: { id: cart.id },
          data: {
            abandonedAt: new Date(),
            recoveryStatus: RecoveryStatus.ABANDONED,
          },
        });

        // Send recovery message if the cart has a customer phone number
        if (cart.customerPhone) {
          const sent = await cartSyncService.sendCartRecoveryMessage(cart.id);

          return {
            cartId: cart.id,
            status: sent ? "notified" : "failed",
          };
        }

        return {
          cartId: cart.id,
          status: "no_phone_number",
        };
      })
    );

    // Find carts that were notified 24 hours ago and have not been recovered
    const followUpCarts = await prisma.cart.findMany({
      where: {
        storeId,
        recoveryStatus: RecoveryStatus.NOTIFIED_FIRST,
        lastNotifiedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
        customerPhone: {
          not: null,
        },
      },
    });

    console.log(`Found ${followUpCarts.length} carts for follow-up`);

    // Process each follow-up cart
    const followUpResults = await Promise.all(
      followUpCarts.map(async (cart) => {
        // Send final reminder message
        if (cart.customerPhone) {
          const sent = await cartSyncService.sendCartRecoveryMessage(cart.id);

          return {
            cartId: cart.id,
            status: sent ? "notified_final" : "failed",
          };
        }

        return {
          cartId: cart.id,
          status: "no_phone_number",
        };
      })
    );

    // Mark carts as lost if they were notified with the final reminder 48 hours ago
    // and have not been recovered
    const lostCarts = await prisma.cart.updateMany({
      where: {
        storeId,
        recoveryStatus: RecoveryStatus.NOTIFIED_FINAL,
        lastNotifiedAt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        },
      },
      data: {
        recoveryStatus: RecoveryStatus.LOST,
      },
    });

    return NextResponse.json({
      abandoned: results,
      followUp: followUpResults,
      lost: lostCarts.count,
    });
  } catch (error) {
    console.error("[CART_RECOVERY_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
