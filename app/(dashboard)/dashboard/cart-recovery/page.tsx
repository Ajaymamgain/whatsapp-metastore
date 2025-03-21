"use client";

import { useState } from "react";
import { CartRecoveryManager } from "@/components/cart/cart-recovery-manager";

export default function CartRecoveryPage() {
  // In a real implementation, we would fetch the store ID from the user's session
  const [storeId] = useState("store123");
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cart Recovery</h1>
        <p className="text-muted-foreground">
          Automatically recover abandoned shopping carts via WhatsApp and Shopify integration
        </p>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
        <h2 className="text-lg font-semibold mb-2">About Cart Recovery</h2>
        <p className="text-sm">
          The Cart Recovery System uses WhatsApp to automatically send personalized messages to customers who have abandoned their shopping carts. 
          The system provides a seamless integration with Shopify, allowing you to manage abandoned carts across platforms and increase your conversion rates.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
            <div className="font-medium mb-1">Two-Stage Recovery</div>
            <p className="text-gray-600 dark:text-gray-400">
              First message sent after 1 hour with a 10% discount, followed by a final reminder after 24 hours with a 15% discount.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
            <div className="font-medium mb-1">WhatsApp Integration</div>
            <p className="text-gray-600 dark:text-gray-400">
              Messages are sent via WhatsApp for high visibility and open rates, increasing the chances of cart recovery.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
            <div className="font-medium mb-1">Shopify Synchronization</div>
            <p className="text-gray-600 dark:text-gray-400">
              Import abandoned carts from Shopify and sync recovery actions between platforms automatically.
            </p>
          </div>
        </div>
      </div>
      
      <CartRecoveryManager storeId={storeId} />
    </div>
  );
}
