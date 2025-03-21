"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle, Store as StoreIcon, ShoppingBag, Globe } from "lucide-react";

interface ShopifySetupProps {
  storeId: string;
}

interface ShopifyConnection {
  connected: boolean;
  shopifyStoreUrl?: string;
  lastSyncTime?: string;
  productsSynced?: number;
  totalProducts?: number;
  webhookStatus?: "active" | "inactive";
}

export function ShopifySetup({ storeId }: ShopifySetupProps) {
  const [shopifyStore, setShopifyStore] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<ShopifyConnection>({
    connected: false,
  });
  const [error, setError] = useState("");

  // Fetch current connection status
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/integrations/shopify?storeId=${storeId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.connected) {
            setConnection({
              connected: true,
              shopifyStoreUrl: data.shopifyStoreUrl,
              lastSyncTime: data.lastSyncTime,
              productsSynced: data.productsSynced,
              totalProducts: data.totalProducts,
              webhookStatus: data.webhookStatus,
            });
            setShopifyStore(data.shopifyStoreUrl || "");
          }
        }
      } catch (error) {
        console.error("Error fetching Shopify connection:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectionStatus();
  }, [storeId]);

  // Handle Shopify connection
  const handleConnectShopify = async () => {
    if (!shopifyStore) {
      setError("Shopify store URL is required");
      return;
    }

    try {
      setError("");
      setConnecting(true);

      // Validate Shopify store format
      const shopPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
      if (!shopPattern.test(shopifyStore)) {
        setError("Invalid Shopify store URL format. Please use format: your-store.myshopify.com");
        setConnecting(false);
        return;
      }

      // Redirect to Shopify OAuth flow
      window.location.href = `/api/shopify/auth?shop=${shopifyStore}&storeId=${storeId}`;
    } catch (error) {
      console.error("Error connecting to Shopify:", error);
      setError("Failed to initialize Shopify connection. Please try again.");
      setConnecting(false);
    }
  };

  // Handle disconnect from Shopify
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect from Shopify? This will remove all product mappings and integration settings.")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/shopify?storeId=${storeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConnection({
          connected: false,
        });
        setShopifyStore("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to disconnect from Shopify");
      }
    } catch (error) {
      console.error("Error disconnecting from Shopify:", error);
      setError("Failed to disconnect from Shopify. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle product import
  const handleImportProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/shopify/products/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to import products");
      }

      const data = await response.json();
      
      // Update connection status with new product count
      setConnection(prev => ({
        ...prev,
        productsSynced: data.imported,
        lastSyncTime: new Date().toISOString(),
      }));

      alert(`Successfully imported ${data.imported} products from Shopify`);
    } catch (error) {
      console.error("Error importing products:", error);
      setError("Failed to import products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-500" />
            Connect Your Shopify Store
          </CardTitle>
          <CardDescription>
            Link your Shopify store to enable product synchronization and abandoned cart recovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopify-store">Shopify Store URL</Label>
              <div className="flex gap-2">
                <Input
                  id="shopify-store"
                  placeholder="your-store.myshopify.com"
                  value={shopifyStore}
                  onChange={(e) => setShopifyStore(e.target.value)}
                  disabled={connecting || connection.connected || loading}
                />
                {connection.connected ? (
                  <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleConnectShopify} disabled={!shopifyStore || connecting || loading}>
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
              </div>
            </div>

            {connection.connected && (
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md text-green-700 dark:text-green-300">
                <p className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Connected to {connection.shopifyStoreUrl}
                </p>
              </div>
            )}

            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>
                Connecting your Shopify store enables:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Product synchronization between Metastore and Shopify</li>
                <li>Abandoned cart recovery via WhatsApp</li>
                <li>Order synchronization between platforms</li>
                <li>Customer data integration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {connection.connected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <p className="font-medium">Connection Status</p>
                  <Badge variant="success">Connected</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <p className="font-medium">Last Sync</p>
                  <div className="text-gray-500">
                    {connection.lastSyncTime 
                      ? new Date(connection.lastSyncTime).toLocaleString() 
                      : "Never"}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <p className="font-medium">Products Synced</p>
                  <div className="text-gray-500">
                    {connection.productsSynced !== undefined && connection.totalProducts !== undefined
                      ? `${connection.productsSynced} / ${connection.totalProducts}`
                      : "Not synced yet"}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <p className="font-medium">Webhook Status</p>
                  <Badge 
                    variant={connection.webhookStatus === "active" ? "success" : "secondary"}
                  >
                    {connection.webhookStatus === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-green-500" />
                  Product Import
                </CardTitle>
                <CardDescription>
                  Import products from your Shopify store
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Import all or selected products from your Shopify store. This will create mappings between Metastore and Shopify products.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={handleImportProducts} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Products"
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <StoreIcon className="h-5 w-5 mr-2 text-purple-500" />
                  WhatsApp Integration
                </CardTitle>
                <CardDescription>
                  Connect WhatsApp with Shopify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  The Shopify integration works with WhatsApp to enable seamless abandoned cart recovery and order notifications.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Configure WhatsApp Integration
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
