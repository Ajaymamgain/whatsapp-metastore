import prisma from "@/lib/prisma";
import { Cart, RecoveryStatus } from "@prisma/client";

interface ShopifyCartItem {
  quantity: number;
  merchandiseId: string; // Shopify variant ID
  attributes?: { key: string; value: string }[];
}

interface ShopifyCart {
  id: string;
  lines: ShopifyCartItem[];
  buyerIdentity?: {
    email?: string;
    phone?: string;
    customerAccessToken?: string;
  };
  note?: string;
  attributes?: { key: string; value: string }[];
  cost?: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
  discountCodes?: string[];
}

interface MetastoreCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export class CartSyncService {
  private storeId: string;
  private shopifyAccessToken: string;
  private shopifyStoreUrl: string;

  constructor(storeId: string) {
    this.storeId = storeId;
  }

  /**
   * Initialize the cart sync service by fetching necessary credentials
   */
  async initialize(): Promise<boolean> {
    try {
      // Get store Shopify credentials
      const store = await prisma.store.findUnique({
        where: { id: this.storeId },
        select: {
          shopifyAccessToken: true,
          shopifyStoreUrl: true,
        },
      });

      if (!store?.shopifyAccessToken || !store?.shopifyStoreUrl) {
        console.error("Shopify integration not configured for store:", this.storeId);
        return false;
      }

      this.shopifyAccessToken = store.shopifyAccessToken;
      this.shopifyStoreUrl = store.shopifyStoreUrl;
      return true;
    } catch (error) {
      console.error("Error initializing cart sync service:", error);
      return false;
    }
  }

  /**
   * Create a cart in Shopify
   */
  async createShopifyCart(items: MetastoreCartItem[], customerInfo?: { email?: string; phone?: string }): Promise<string | null> {
    try {
      const shopifyItems = await this.mapMetastoreItemsToShopify(items);
      
      // Create cart in Shopify via Storefront API
      const response = await fetch(`${this.shopifyStoreUrl}/api/2023-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.shopifyAccessToken,
        },
        body: JSON.stringify({
          query: `
            mutation cartCreate($input: CartInput!) {
              cartCreate(input: $input) {
                cart {
                  id
                  checkoutUrl
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            input: {
              lines: shopifyItems,
              buyerIdentity: customerInfo ? {
                email: customerInfo.email,
                phone: customerInfo.phone,
              } : undefined,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error creating Shopify cart:", errorData);
        return null;
      }

      const data = await response.json();
      
      if (data.errors || (data.data?.cartCreate?.userErrors && data.data.cartCreate.userErrors.length > 0)) {
        console.error("Error creating Shopify cart:", data.errors || data.data.cartCreate.userErrors);
        return null;
      }

      return data.data.cartCreate.cart.id;
    } catch (error) {
      console.error("Error creating Shopify cart:", error);
      return null;
    }
  }

  /**
   * Map Metastore cart items to Shopify cart items
   */
  private async mapMetastoreItemsToShopify(items: MetastoreCartItem[]): Promise<ShopifyCartItem[]> {
    try {
      const shopifyItems: ShopifyCartItem[] = [];
      
      for (const item of items) {
        // Find product mapping between Metastore and Shopify
        const productMapping = await prisma.productMapping.findFirst({
          where: {
            metastoreProductId: item.id,
            storeId: this.storeId,
          },
        });
        
        if (!productMapping) {
          console.error(`No Shopify mapping found for product ${item.id}`);
          continue;
        }
        
        shopifyItems.push({
          merchandiseId: productMapping.shopifyVariantId,
          quantity: item.quantity,
        });
      }
      
      return shopifyItems;
    } catch (error) {
      console.error("Error mapping Metastore items to Shopify:", error);
      return [];
    }
  }

  /**
   * Update a cart in Shopify
   */
  async updateShopifyCart(shopifyCartId: string, items: MetastoreCartItem[]): Promise<boolean> {
    try {
      const shopifyItems = await this.mapMetastoreItemsToShopify(items);
      
      // Update cart lines in Shopify
      const response = await fetch(`${this.shopifyStoreUrl}/api/2023-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.shopifyAccessToken,
        },
        body: JSON.stringify({
          query: `
            mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
              cartLinesUpdate(cartId: $cartId, lines: $lines) {
                cart {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            cartId: shopifyCartId,
            lines: shopifyItems.map(item => ({
              id: item.merchandiseId,
              quantity: item.quantity,
            })),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error updating Shopify cart:", errorData);
        return false;
      }

      const data = await response.json();
      
      if (data.errors || (data.data?.cartLinesUpdate?.userErrors && data.data.cartLinesUpdate.userErrors.length > 0)) {
        console.error("Error updating Shopify cart:", data.errors || data.data.cartLinesUpdate.userErrors);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error updating Shopify cart:", error);
      return false;
    }
  }

  /**
   * Get a Shopify cart by ID
   */
  async getShopifyCart(shopifyCartId: string): Promise<ShopifyCart | null> {
    try {
      const response = await fetch(`${this.shopifyStoreUrl}/api/2023-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.shopifyAccessToken,
        },
        body: JSON.stringify({
          query: `
            query getCart($cartId: ID!) {
              cart(id: $cartId) {
                id
                lines(first: 100) {
                  edges {
                    node {
                      id
                      quantity
                      merchandise {
                        ... on ProductVariant {
                          id
                        }
                      }
                    }
                  }
                }
                buyerIdentity {
                  email
                  phone
                }
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
                discountCodes {
                  code
                }
              }
            }
          `,
          variables: {
            cartId: shopifyCartId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching Shopify cart:", errorData);
        return null;
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error("Error fetching Shopify cart:", data.errors);
        return null;
      }
      
      if (!data.data?.cart) {
        console.error("Cart not found in Shopify:", shopifyCartId);
        return null;
      }
      
      const cart = data.data.cart;
      
      // Format the response to match the ShopifyCart interface
      return {
        id: cart.id,
        lines: cart.lines.edges.map((edge: any) => ({
          merchandiseId: edge.node.merchandise.id,
          quantity: edge.node.quantity,
        })),
        buyerIdentity: cart.buyerIdentity,
        cost: cart.cost,
        discountCodes: cart.discountCodes?.map((dc: any) => dc.code) || [],
      };
    } catch (error) {
      console.error("Error fetching Shopify cart:", error);
      return null;
    }
  }

  /**
   * Sync a Metastore cart to Shopify
   */
  async syncCartToShopify(cartId: string): Promise<string | null> {
    try {
      // Get the Metastore cart
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
      });
      
      if (!cart) {
        console.error(`Cart not found: ${cartId}`);
        return null;
      }
      
      const items = cart.items as MetastoreCartItem[];
      
      // Check if the cart already has a Shopify cart ID
      if (cart.shopifyCartId) {
        // Update existing Shopify cart
        const updated = await this.updateShopifyCart(cart.shopifyCartId, items);
        if (updated) {
          return cart.shopifyCartId;
        } else {
          // If update fails, try to create a new cart
          console.log(`Failed to update Shopify cart. Creating a new one...`);
        }
      }
      
      // Create a new Shopify cart
      const customerInfo = {
        email: cart.customerEmail || undefined,
        phone: cart.customerPhone || undefined,
      };
      
      const shopifyCartId = await this.createShopifyCart(items, customerInfo);
      
      if (shopifyCartId) {
        // Update the Metastore cart with the Shopify cart ID
        await prisma.cart.update({
          where: { id: cartId },
          data: { shopifyCartId },
        });
      }
      
      return shopifyCartId;
    } catch (error) {
      console.error(`Error syncing cart to Shopify: ${error}`);
      return null;
    }
  }

  /**
   * Get abandoned carts from Shopify
   */
  async getAbandonedCarts(): Promise<any[]> {
    try {
      // Query abandoned checkouts via Admin API
      const response = await fetch(`${this.shopifyStoreUrl}/admin/api/2023-10/checkouts.json?status=open&created_at_min=2023-01-01`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.shopifyAccessToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching abandoned checkouts from Shopify:", errorData);
        return [];
      }

      const data = await response.json();
      return data.checkouts || [];
    } catch (error) {
      console.error("Error fetching abandoned checkouts from Shopify:", error);
      return [];
    }
  }

  /**
   * Import abandoned carts from Shopify to Metastore
   */
  async importAbandonedCarts(): Promise<number> {
    try {
      const abandonedCheckouts = await this.getAbandonedCarts();
      let importedCount = 0;
      
      for (const checkout of abandonedCheckouts) {
        // Check if this checkout is already imported
        const existingCart = await prisma.cart.findFirst({
          where: {
            shopifyCartId: checkout.id.toString(),
            storeId: this.storeId,
          },
        });
        
        if (existingCart) {
          continue; // Skip already imported carts
        }
        
        // Map Shopify line items to Metastore format
        const cartItems = await this.mapShopifyItemsToMetastore(checkout.line_items);
        
        if (cartItems.length === 0) {
          console.log(`Skipping checkout ${checkout.id} with no mappable items`);
          continue;
        }
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create cart in Metastore
        await prisma.cart.create({
          data: {
            storeId: this.storeId,
            shopifyCartId: checkout.id.toString(),
            customerName: checkout.customer?.first_name ? `${checkout.customer.first_name} ${checkout.customer.last_name || ''}`.trim() : null,
            customerEmail: checkout.email,
            customerPhone: checkout.phone,
            items: cartItems,
            total,
            recoveryStatus: RecoveryStatus.ABANDONED,
            abandonedAt: new Date(checkout.created_at),
            updatedAt: new Date(checkout.updated_at),
          },
        });
        
        importedCount++;
      }
      
      return importedCount;
    } catch (error) {
      console.error("Error importing abandoned carts from Shopify:", error);
      return 0;
    }
  }

  /**
   * Map Shopify line items to Metastore format
   */
  private async mapShopifyItemsToMetastore(lineItems: any[]): Promise<MetastoreCartItem[]> {
    try {
      const cartItems: MetastoreCartItem[] = [];
      
      for (const item of lineItems) {
        // Find product mapping between Shopify and Metastore
        const productMapping = await prisma.productMapping.findFirst({
          where: {
            shopifyVariantId: item.variant_id.toString(),
            storeId: this.storeId,
          },
        });
        
        if (!productMapping) {
          console.log(`No Metastore mapping found for Shopify variant ${item.variant_id}`);
          continue;
        }
        
        // Get the Metastore product
        const product = await prisma.product.findUnique({
          where: { id: productMapping.metastoreProductId },
        });
        
        if (!product) {
          console.log(`Metastore product not found: ${productMapping.metastoreProductId}`);
          continue;
        }
        
        cartItems.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          image: product.images[0] || undefined,
        });
      }
      
      return cartItems;
    } catch (error) {
      console.error("Error mapping Shopify items to Metastore:", error);
      return [];
    }
  }

  /**
   * Get cart recovery URL
   */
  async getCartRecoveryUrl(cartId: string): Promise<string | null> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
      });
      
      if (!cart || !cart.shopifyCartId) {
        return null;
      }
      
      // Sync cart to ensure it's up to date
      await this.syncCartToShopify(cartId);
      
      // Get checkout URL from Shopify
      const shopifyCart = await this.getShopifyCart(cart.shopifyCartId);
      
      if (!shopifyCart) {
        return null;
      }
      
      // Generate a checkout URL
      const checkoutUrl = await this.getShopifyCheckoutUrl(cart.shopifyCartId);
      
      // Apply discount code if present
      if (cart.discountCode && checkoutUrl) {
        return `${checkoutUrl}&discount=${cart.discountCode}`;
      }
      
      return checkoutUrl;
    } catch (error) {
      console.error("Error getting cart recovery URL:", error);
      return null;
    }
  }

  /**
   * Get Shopify checkout URL
   */
  private async getShopifyCheckoutUrl(shopifyCartId: string): Promise<string | null> {
    try {
      // Query the checkout URL using the Storefront API
      const response = await fetch(`${this.shopifyStoreUrl}/api/2023-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.shopifyAccessToken,
        },
        body: JSON.stringify({
          query: `
            query getCheckoutUrl($cartId: ID!) {
              cart(id: $cartId) {
                checkoutUrl
              }
            }
          `,
          variables: {
            cartId: shopifyCartId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching checkout URL:", errorData);
        return null;
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error("Error fetching checkout URL:", data.errors);
        return null;
      }
      
      return data.data?.cart?.checkoutUrl || null;
    } catch (error) {
      console.error("Error getting checkout URL:", error);
      return null;
    }
  }

  /**
   * Send cart recovery message via WhatsApp
   */
  async sendCartRecoveryMessage(cartId: string): Promise<boolean> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          store: {
            select: {
              name: true,
              whatsappPhoneNumberId: true,
              whatsappAccessToken: true,
            },
          },
        },
      });
      
      if (!cart || !cart.customerPhone || !cart.store.whatsappPhoneNumberId || !cart.store.whatsappAccessToken) {
        console.error("Missing required information for recovery message");
        return false;
      }
      
      // Get recovery URL
      const recoveryUrl = await this.getCartRecoveryUrl(cartId);
      
      if (!recoveryUrl) {
        console.error("Failed to get recovery URL");
        return false;
      }
      
      // Format cart items for display
      const items = cart.items as MetastoreCartItem[];
      const itemsSummary = items
        .map((item) => `• ${item.name} (${item.quantity}x): $${item.price.toFixed(2)}`)
        .join("\n");
      
      // Create message text
      const message = `Hi${cart.customerName ? ` ${cart.customerName}` : ""}! 👋\n\nWe noticed you left some items in your cart at ${cart.store.name}:\n\n${itemsSummary}\n\nTotal: $${cart.total.toFixed(2)}\n\n${
        cart.discountCode
          ? `Use code ${cart.discountCode} for ${cart.discountAmount ? (cart.discountAmount/cart.total*100).toFixed(0) : ""}% off! 🎉`
          : "Would you like to complete your purchase?"
      }\n\nCheckout now: ${recoveryUrl}`;
      
      // Send WhatsApp message
      const response = await fetch(`https://graph.facebook.com/v18.0/${cart.store.whatsappPhoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cart.store.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cart.customerPhone,
          type: "text",
          text: {
            preview_url: true, // Enable URL preview
            body: message,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send WhatsApp recovery message:", errorData);
        return false;
      }
      
      // Update cart with notification info
      await prisma.cart.update({
        where: { id: cartId },
        data: {
          lastNotifiedAt: new Date(),
          recoveryStatus: cart.recoveryStatus === RecoveryStatus.ABANDONED ? RecoveryStatus.NOTIFIED_FIRST : RecoveryStatus.NOTIFIED_FINAL,
        },
      });
      
      return true;
    } catch (error) {
      console.error("Error sending cart recovery message:", error);
      return false;
    }
  }

  /**
   * Process a cart recovery when customer clicks recovery link
   */
  async processRecovery(cartId: string): Promise<boolean> {
    try {
      // Update the cart status to RECOVERED
      await prisma.cart.update({
        where: { id: cartId },
        data: {
          recoveryStatus: RecoveryStatus.RECOVERED,
          recoveredAt: new Date(),
        },
      });
      
      return true;
    } catch (error) {
      console.error("Error processing cart recovery:", error);
      return false;
    }
  }

  /**
   * Get recovery stats for the store
   */
  async getRecoveryStats(): Promise<{
    abandoned: number;
    notified: number;
    recovered: number;
    lost: number;
    recoveryRate: number;
    revenue: number;
  }> {
    try {
      // Get counts by status
      const abandoned = await prisma.cart.count({
        where: {
          storeId: this.storeId,
          recoveryStatus: RecoveryStatus.ABANDONED,
        },
      });
      
      const notifiedFirst = await prisma.cart.count({
        where: {
          storeId: this.storeId,
          recoveryStatus: RecoveryStatus.NOTIFIED_FIRST,
        },
      });
      
      const notifiedFinal = await prisma.cart.count({
        where: {
          storeId: this.storeId,
          recoveryStatus: RecoveryStatus.NOTIFIED_FINAL,
        },
      });
      
      const recovered = await prisma.cart.count({
        where: {
          storeId: this.storeId,
          recoveryStatus: RecoveryStatus.RECOVERED,
        },
      });
      
      const lost = await prisma.cart.count({
        where: {
          storeId: this.storeId,
          recoveryStatus: RecoveryStatus.LOST,
        },
      });
      
      // Calculate recovery rate
      const notified = notifiedFirst + notifiedFinal;
      const recoveryRate = notified > 0 ? (recovered / notified) * 100 : 0;
      
      // Calculate recovered revenue
      const recoveredCarts = await prisma.cart.findMany({
        where: {
          storeId: this.storeId,
          recoveryStatus: RecoveryStatus.RECOVERED,
        },
        select: {
          total: true,
          discountAmount: true,
        },
      });
      
      const revenue = recoveredCarts.reduce((sum, cart) => {
        // Subtract discount if present
        const cartTotal = cart.discountAmount ? cart.total - cart.discountAmount : cart.total;
        return sum + cartTotal;
      }, 0);
      
      return {
        abandoned,
        notified: notified,
        recovered,
        lost,
        recoveryRate,
        revenue,
      };
    } catch (error) {
      console.error("Error getting recovery stats:", error);
      return {
        abandoned: 0,
        notified: 0,
        recovered: 0,
        lost: 0,
        recoveryRate: 0,
        revenue: 0,
      };
    }
  }
}