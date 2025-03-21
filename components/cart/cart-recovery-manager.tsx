"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShoppingCart, AlertCircle, DollarSign, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface CartRecoveryManagerProps {
  storeId: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Cart {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  items: CartItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
  abandonedAt: string | null;
  recoveryStatus: string;
  lastNotifiedAt: string | null;
  recoveredAt: string | null;
  discountCode: string | null;
  discountAmount: number | null;
  shopifyCartId: string | null;
}

interface RecoveryStats {
  abandoned: number;
  notified: number;
  recovered: number;
  lost: number;
  recoveryRate: number;
  revenue: number;
}

export function CartRecoveryManager({ storeId }: CartRecoveryManagerProps) {
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RecoveryStats>({
    abandoned: 0,
    notified: 0,
    recovered: 0,
    lost: 0,
    recoveryRate: 0,
    revenue: 0,
  });
  const [carts, setCarts] = useState<{
    abandoned: Cart[];
    notified: Cart[];
    recovered: Cart[];
    lost: Cart[];
  }>({
    abandoned: [],
    notified: [],
    recovered: [],
    lost: [],
  });

  // Fetch recovery stats and carts
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get recovery stats
      const statsResponse = await fetch(`/api/carts/sync?storeId=${storeId}&action=stats`);
      
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch recovery stats");
      }
      
      const statsData = await statsResponse.json();
      setStats(statsData.stats);

      // Get carts for each status
      const responses = await Promise.all([
        fetch(`/api/carts?storeId=${storeId}&status=ABANDONED`),
        fetch(`/api/carts?storeId=${storeId}&status=NOTIFIED_FIRST,NOTIFIED_FINAL`),
        fetch(`/api/carts?storeId=${storeId}&status=RECOVERED`),
        fetch(`/api/carts?storeId=${storeId}&status=LOST`),
      ]);

      const [abandonedData, notifiedData, recoveredData, lostData] = await Promise.all(
        responses.map(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch carts: ${response.statusText}`);
          }
          return response.json();
        })
      );

      setCarts({
        abandoned: abandonedData.carts || [],
        notified: notifiedData.carts || [],
        recovered: recoveredData.carts || [],
        lost: lostData.carts || [],
      });
    } catch (error) {
      console.error("Error fetching cart recovery data:", error);
      setError(error instanceof Error ? error.message : "An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, [storeId]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ABANDONED":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Abandoned</Badge>;
      case "NOTIFIED_FIRST":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">First Notification</Badge>;
      case "NOTIFIED_FINAL":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Final Notification</Badge>;
      case "RECOVERED":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Recovered</Badge>;
      case "LOST":
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Lost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Send recovery message
  const handleSendRecoveryMessage = async (cartId: string) => {
    try {
      setSendingMessage(cartId);
      setError(null);
      
      const response = await fetch(`/api/carts/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          cartId,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send recovery message");
      }
      
      // Refresh data to show updated status
      await fetchData();
      
      alert("Recovery message sent successfully");
    } catch (error) {
      console.error("Error sending recovery message:", error);
      setError(error instanceof Error ? error.message : "Failed to send recovery message");
    } finally {
      setSendingMessage(null);
    }
  };

  // Run recovery process for all abandoned carts
  const handleRunRecoveryProcess = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/carts/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to run recovery process");
      }
      
      const data = await response.json();
      
      // Refresh data to show updated status
      await fetchData();
      
      alert(`Recovery process completed: ${data.abandoned?.length || 0} abandoned carts processed, ${data.followUp?.length || 0} follow-ups sent`);
    } catch (error) {
      console.error("Error running recovery process:", error);
      setError(error instanceof Error ? error.message : "Failed to run recovery process");
    } finally {
      setLoading(false);
    }
  };

  // Import abandoned carts from Shopify
  const handleImportFromShopify = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/carts/sync?storeId=${storeId}&action=import`, {
        method: "GET",
      });
      
      if (!response.ok) {
        throw new Error("Failed to import abandoned carts from Shopify");
      }
      
      const data = await response.json();
      
      // Refresh data to show updated status
      await fetchData();
      
      alert(`Successfully imported ${data.imported} abandoned carts from Shopify`);
    } catch (error) {
      console.error("Error importing from Shopify:", error);
      setError(error instanceof Error ? error.message : "Failed to import from Shopify");
    } finally {
      setLoading(false);
    }
  };

  // Render cart items
  const renderCartItems = (items: CartItem[]) => {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {items.slice(0, 3).map((item, index) => (
          <div key={index}>
            {item.quantity}x {item.name} - {formatCurrency(item.price)}
          </div>
        ))}
        {items.length > 3 && (
          <div className="text-sm text-gray-500 mt-1">
            +{items.length - 3} more items
          </div>
        )}
      </div>
    );
  };

  // Render cart table
  const renderCartTable = (cartsToRender: Cart[], showActions: boolean = false) => {
    if (cartsToRender.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <ShoppingCart className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-600 dark:text-gray-400">No carts found</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cartsToRender.map((cart) => (
            <TableRow key={cart.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{cart.customerName || "Guest"}</div>
                  <div className="text-sm text-gray-500">{cart.customerPhone || cart.customerEmail || "No contact info"}</div>
                </div>
              </TableCell>
              <TableCell>{renderCartItems(cart.items)}</TableCell>
              <TableCell>
                <div>{formatCurrency(cart.total)}</div>
                {cart.discountCode && (
                  <div className="text-sm text-gray-500">
                    Code: {cart.discountCode} ({formatCurrency(cart.discountAmount || 0)} off)
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div>Created: {formatDate(cart.createdAt)}</div>
                {cart.abandonedAt && <div className="text-sm text-gray-500">Abandoned: {formatDate(cart.abandonedAt)}</div>}
                {cart.lastNotifiedAt && <div className="text-sm text-gray-500">Notified: {formatDate(cart.lastNotifiedAt)}</div>}
                {cart.recoveredAt && <div className="text-sm text-gray-500">Recovered: {formatDate(cart.recoveredAt)}</div>}
              </TableCell>
              <TableCell>{getStatusBadge(cart.recoveryStatus)}</TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sendingMessage === cart.id || !cart.customerPhone}
                    onClick={() => handleSendRecoveryMessage(cart.id)}
                  >
                    {sendingMessage === cart.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative dark:bg-red-900 dark:border-red-800 dark:text-red-300" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cart Recovery</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleRunRecoveryProcess}
            disabled={loading}
          >
            Run Recovery Process
          </Button>
          <Button
            variant="secondary"
            onClick={handleImportFromShopify}
            disabled={loading}
          >
            Import from Shopify
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abandoned Carts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.abandoned}</div>
            <p className="text-xs text-muted-foreground">
              Carts pending recovery
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recoveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.recovered} of {stats.notified} notified carts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recovered Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.recovered} recovered carts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lost Carts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lost}</div>
            <p className="text-xs text-muted-foreground">
              Carts not recovered
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="abandoned" className="space-y-4">
        <TabsList>
          <TabsTrigger value="abandoned">
            Abandoned ({carts.abandoned.length})
          </TabsTrigger>
          <TabsTrigger value="notified">
            Notified ({carts.notified.length})
          </TabsTrigger>
          <TabsTrigger value="recovered">
            Recovered ({carts.recovered.length})
          </TabsTrigger>
          <TabsTrigger value="lost">
            Lost ({carts.lost.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="abandoned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Abandoned Carts</CardTitle>
              <CardDescription>
                Carts that have been inactive for more than 1 hour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderCartTable(carts.abandoned, true)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notified" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notified Carts</CardTitle>
              <CardDescription>
                Customers who have received recovery messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderCartTable(carts.notified, true)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recovered" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovered Carts</CardTitle>
              <CardDescription>
                Customers who returned and completed their purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderCartTable(carts.recovered)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="lost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lost Carts</CardTitle>
              <CardDescription>
                Abandoned carts that were not recovered despite reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderCartTable(carts.lost)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
