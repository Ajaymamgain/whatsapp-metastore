# WhatsApp Metastore: Integrated Digital Storefront Platform

A powerful e-commerce platform that seamlessly integrates with WhatsApp and Shopify to create enhanced shopping experiences and boost sales through automated cart recovery.

## Features

### WhatsApp Integration

- **Business API Connection**: Connect directly to WhatsApp Business API
- **Catalog Synchronization**: Keep products in sync between your store and WhatsApp catalog
- **QR Code Generation**: Create scannable QR codes for customer engagement
- **Automated Messaging**: Send order updates and marketing broadcasts
- **AI Chatbot**: Provide AI-powered customer support via WhatsApp

### Shopify Integration

- **OAuth Authentication**: Securely connect your Shopify store
- **Product Synchronization**: Sync products bidirectionally between platforms
- **Order Management**: Keep orders in sync across platforms
- **Customer Data Integration**: Unified view of customer data

### Abandoned Cart Recovery System

- **Automated Detection**: Identify abandoned carts in both Metastore and Shopify
- **WhatsApp Recovery Messages**: Send personalized recovery messages via WhatsApp
- **Two-Stage Recovery**: Use a two-stage approach with escalating discounts
- **Analytics Dashboard**: Track recovery rates and revenue impact

## Implementation Details

### Core Components

- **CartSyncService**: Manages cart synchronization between Metastore and Shopify
- **CatalogSyncService**: Handles product synchronization with WhatsApp catalog
- **OrderNotificationService**: Manages WhatsApp order notifications
- **BroadcastService**: Handles marketing campaign messaging

### Technical Architecture

- **Frontend**: Next.js with React and TypeScript
- **Backend**: Next.js API routes with Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk for secure user authentication
- **APIs**: WhatsApp Business API and Shopify Storefront/Admin APIs

## Getting Started

### Prerequisites

- Node.js v18+ and npm
- PostgreSQL database
- WhatsApp Business API access
- Shopify Partner account (for Shopify integration)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ajaymamgain/whatsapp-metastore.git
   cd whatsapp-metastore
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your credentials.

4. Set up the database:
   ```bash
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation

Detailed documentation is available in the `docs` directory:

- [Cart Recovery System](docs/shopify-cart-integration.md): Implementation of the Shopify integration and cart recovery system
- [WhatsApp Integration](docs/whatsapp-integration-overview.md): Overview of the WhatsApp integration features

## API Endpoints

### Cart Synchronization and Recovery

- `POST /api/carts/sync`: Sync a cart with Shopify
- `GET /api/carts/sync?storeId=X&action=import`: Import abandoned carts from Shopify
- `GET /api/carts/sync?storeId=X&action=stats`: Get recovery statistics
- `GET /api/carts/recovery?cartId=X`: Process a cart recovery (redirect to recovery URL)
- `POST /api/carts/recovery`: Send recovery messages for abandoned carts
- `GET /api/cron/cart-recovery`: Automated cart recovery processing (cron job endpoint)

### WhatsApp Integration

- `GET /api/webhooks/whatsapp/[storeId]`: WhatsApp webhook verification endpoint
- `POST /api/webhooks/whatsapp/[storeId]`: Webhook for incoming WhatsApp messages
- `GET /api/whatsapp/catalog`: Get catalog information
- `POST /api/whatsapp/catalog`: Create a new catalog
- `POST /api/whatsapp/catalog/sync`: Sync all products to WhatsApp catalog
- `POST /api/whatsapp/catalog/sync/[productId]`: Sync a specific product

### Shopify Integration

- `GET /api/shopify/auth`: Initiate Shopify OAuth flow
- `GET /api/shopify/callback`: OAuth callback handler
- `GET /api/integrations/shopify`: Get Shopify connection status
- `POST /api/integrations/shopify`: Configure Shopify connection
- `DELETE /api/integrations/shopify`: Disconnect from Shopify

## Key Components

### Cart Recovery Process

The cart recovery system operates as follows:

1. **Detection**: Carts inactive for more than 1 hour are marked as abandoned
2. **First Reminder**: An immediate WhatsApp message is sent with a 10% discount
3. **Final Reminder**: If not recovered within 24 hours, a second message is sent with a 15% discount
4. **Resolution**: The cart is either marked as recovered or lost after 48 hours

### Shopify Synchronization

Shopify synchronization includes:

1. **Auth Flow**: OAuth authentication with required scopes
2. **Product Mapping**: Creating mappings between products across platforms
3. **Cart Sync**: Bidirectional cart synchronization
4. **Webhook Integration**: Real-time updates via webhooks

## Customization

The system is designed to be highly customizable:

- **Message Templates**: Customize recovery message templates
- **Discount Strategy**: Configure discount percentages and types
- **Recovery Workflow**: Adjust timing and stages of the recovery process
- **UI Components**: Modular components for easy customization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/api/reference)
- [Shopify API](https://shopify.dev/api)
- [Tailwind CSS](https://tailwindcss.com/)
