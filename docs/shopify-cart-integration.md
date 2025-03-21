# Shopify Integration and Cart Recovery System

This document provides a comprehensive overview of the Shopify integration and Cart Recovery System in Metastore.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Setup Instructions](#setup-instructions)
- [Usage Guide](#usage-guide)
- [Configuration Options](#configuration-options)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [FAQs](#faqs)

## Overview

The Shopify integration allows Metastore to connect seamlessly with Shopify stores, enabling product synchronization, order management, and most importantly, a cross-platform cart recovery system. This integration leverages WhatsApp to automatically send personalized recovery messages to customers who have abandoned their shopping carts, significantly increasing recovery rates and boosting sales.

## Features

### Shopify Integration

- **Store Connection**: Connect your Shopify store with OAuth authentication
- **Product Synchronization**: Sync products bidirectionally between Metastore and Shopify
- **Product Mapping**: Map products and variants between platforms
- **Order Synchronization**: Keep orders in sync across platforms
- **Customer Data Integration**: Unified view of customer data

### Cart Recovery System

- **Abandoned Cart Detection**: Automatically identify abandoned shopping carts
- **Multi-platform Detection**: Detect abandoned carts in both Metastore and Shopify
- **WhatsApp Messaging**: Send personalized recovery messages via WhatsApp
- **Two-Stage Recovery**: Implement a two-stage approach with escalating incentives
- **Discount Codes**: Offer special discount codes to encourage completion
- **Recovery Analytics**: Track recovery rates, revenue impact, and ROI
- **Customizable Templates**: Personalize the recovery message templates

## System Architecture

The integration consists of several key components:

1. **CartSyncService**: Manages cart operations between Metastore and Shopify
   - Syncs cart contents bidirectionally
   - Handles cart creation, updating, and retrieval
   - Provides recovery URL generation

2. **API Endpoints**:
   - `/api/carts/sync`: Handles cart synchronization operations
   - `/api/carts/recovery`: Manages cart recovery process
   - `/api/integrations/shopify`: Handles Shopify OAuth and store setup
   - `/api/cron/cart-recovery`: Automated cron job for recovery processes

3. **Database Models**:
   - `ProductMapping`: Maps products between Metastore and Shopify
   - `Cart`: Enhanced with Shopify fields and recovery statuses
   - `Store`: Extended with Shopify credentials

4. **UI Components**:
   - Shopify setup interface
   - Cart recovery dashboard
   - Analytics and reporting views

## Setup Instructions

### 1. Prerequisites

- A Shopify store with Admin API access
- A WhatsApp Business account
- Metastore set up with WhatsApp integration

### 2. Create a Shopify App

1. Go to the Shopify Partner Dashboard
2. Create a new app
3. Set up App URL and allowed redirection URLs
4. Get API credentials (API Key and API Secret Key)

### 3. Environment Configuration

Add the following environment variables to your `.env` file:

```
# Shopify Integration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET_KEY=your_api_secret_key
SHOPIFY_CALLBACK_URL=https://your-domain.com/api/shopify/callback

# WhatsApp Integration (already set up)
WHATSAPP_BUSINESS_ID=your_business_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Cart Recovery Settings
CART_ABANDONMENT_THRESHOLD=3600000  # 1 hour in milliseconds
FIRST_REMINDER_DISCOUNT_PERCENT=10
FINAL_REMINDER_DISCOUNT_PERCENT=15
FINAL_REMINDER_DELAY=86400000  # 24 hours in milliseconds
LOST_CART_THRESHOLD=172800000  # 48 hours in milliseconds
```

### 4. Connect Shopify Store

1. Navigate to Dashboard > Integrations > Shopify
2. Enter your Shopify store URL (e.g., `your-store.myshopify.com`)
3. Click "Connect" and follow the OAuth flow
4. Grant the necessary permissions when prompted

### 5. Import Products

After connecting your store:

1. Click "Import Products" to sync your Shopify products
2. Wait for the synchronization to complete
3. Verify that products are properly mapped

### 6. Configure Cart Recovery

1. Go to Dashboard > Cart Recovery
2. Review and adjust default settings if needed
3. Customize the recovery message templates if desired
4. Set up the cron job for automated recovery

## Usage Guide

### Managing Abandoned Carts

1. **View Abandoned Carts**: Go to Dashboard > Cart Recovery > Abandoned tab
2. **Manual Recovery**: Click "Send Message" next to any cart to manually trigger a recovery message
3. **Run Recovery Process**: Click "Run Recovery Process" to process all eligible carts
4. **Import from Shopify**: Click "Import from Shopify" to retrieve abandoned carts from Shopify

### Monitoring Performance

1. **Dashboard Overview**: See key metrics at a glance
2. **Recovery Stats**: Track recovery rate and revenue impact
3. **Cart Statuses**: Monitor carts in different stages of the recovery process

### Customizing Recovery Messages

1. Navigate to Dashboard > Settings > Recovery Templates
2. Edit the templates for:
   - First reminder (1 hour after abandonment)
   - Final reminder (24 hours after first reminder)
3. Use available placeholders:
   - `{customerName}`: Customer's name
   - `{storeName}`: Your store name
   - `{items}`: List of cart items
   - `{total}`: Cart total
   - `{discountCode}`: Generated discount code
   - `{discountPercent}`: Discount percentage

## Configuration Options

The cart recovery system offers several configuration options:

### Recovery Timing

- **Abandonment Threshold**: How long a cart must be inactive to be considered abandoned (default: 1 hour)
- **First Reminder Delay**: When to send the first reminder (default: immediately after abandonment is detected)
- **Final Reminder Delay**: When to send the final reminder (default: 24 hours after first reminder)
- **Lost Cart Threshold**: When to mark a cart as lost (default: 48 hours after final reminder)

### Discount Strategies

- **First Reminder Discount**: Percentage discount for first reminder (default: 10%)
- **Final Reminder Discount**: Percentage discount for final reminder (default: 15%)
- **Discount Code Format**: Format for generated discount codes
- **Discount Validity**: How long the discount codes remain valid

### WhatsApp Message Settings

- **Include Cart Items**: Whether to include cart items in the message (default: yes)
- **Include Total**: Whether to include the cart total (default: yes)
- **Include Discount**: Whether to include discount information (default: yes)
- **Enable URL Preview**: Whether to enable URL preview in WhatsApp (default: yes)
- **Message Format**: Text-only or rich media messages

## Customization

The cart recovery system is designed to be highly customizable:

### Recovery Message Templates

You can customize the recovery message templates to match your brand voice. Edit the templates in Dashboard > Settings > Recovery Templates.

### Discount Strategy

You can configure different discount strategies:

- **Fixed Discount**: A fixed amount off the total
- **Percentage Discount**: A percentage off the total
- **Free Shipping**: Offer free shipping as an incentive
- **Product-Specific Discount**: Offer discounts on specific products

### Recovery Workflow

You can customize the recovery workflow:

- **Number of Reminders**: Configure how many reminders to send
- **Timing of Reminders**: Adjust when reminders are sent
- **Escalation Strategy**: Configure how discounts escalate between reminders

### Integration with Other Systems

The cart recovery system can be integrated with other systems:

- **CRM Integration**: Connect with your CRM system
- **Marketing Automation**: Connect with your marketing automation platform
- **Analytics Integration**: Feed data to your analytics platform

## Troubleshooting

### Common Issues

#### Shopify Connection Issues

- **Problem**: Unable to connect to Shopify
- **Solution**: Verify API credentials and scopes

#### Cart Sync Issues

- **Problem**: Carts not syncing between platforms
- **Solution**: Check webhook configuration and logs

#### WhatsApp Message Delivery Issues

- **Problem**: Recovery messages not being sent
- **Solution**: Verify WhatsApp Business API credentials and message templates

#### Recovery Process Not Running

- **Problem**: Automated recovery process not running
- **Solution**: Check cron job configuration and logs

### Logging and Debugging

- **API Logs**: Check API logs for errors
- **Webhook Logs**: Review webhook logs for delivery issues
- **Cron Job Logs**: Examine cron job logs for scheduling problems

## FAQs

### General Questions

**Q: How does the cart recovery system detect abandoned carts?**

A: The system tracks cart activity and considers a cart abandoned if it has been inactive for the configured abandonment threshold (default: 1 hour).

**Q: Can I use the cart recovery system without Shopify?**

A: Yes, the cart recovery system works with Metastore's native carts even without Shopify integration. However, connecting Shopify provides a more comprehensive solution.

**Q: How do the discount codes work?**

A: The system generates unique discount codes for each recovery attempt. These codes are linked to the specific cart and can be configured to expire after a certain period.

### Integration Questions

**Q: Does the integration support multiple Shopify stores?**

A: Yes, you can connect multiple Shopify stores to different Metastore stores.

**Q: Can I sync only certain products?**

A: Yes, you can choose which products to sync between platforms.

**Q: Will existing orders be synchronized?**

A: By default, only new orders are synchronized. You can manually import existing orders if needed.

### Performance Questions

**Q: What recovery rates can I expect?**

A: Recovery rates vary by industry, but our customers typically see recovery rates of 10-15% for abandoned carts.

**Q: How many WhatsApp messages will be sent?**

A: By default, up to two messages per abandoned cart (first reminder and final reminder).

**Q: Will this impact my WhatsApp messaging limits?**

A: The system is designed to respect WhatsApp messaging limits and uses templates to ensure compliance.

## Best Practices

### Message Timing

- Send the first reminder within 1-2 hours of cart abandonment
- Send the final reminder within 24 hours of the first reminder
- Respect local time zones and avoid sending messages at inappropriate hours

### Message Content

- Keep messages concise and focused
- Clearly mention the abandoned products
- Include a clear call-to-action
- Make the recovery process as seamless as possible

### Discount Strategy

- Start with a modest discount (e.g., 10%)
- Escalate the discount for the final reminder (e.g., 15%)
- Set appropriate expiration periods for urgency

### Analytics and Optimization

- Regularly review recovery performance metrics
- A/B test different message templates and discount strategies
- Adjust timing based on customer engagement patterns
- Segment customers for more targeted recovery approaches

## Support and Resources

For additional support and resources:

- **Documentation**: Visit the full documentation at [docs.metastore.com](https://docs.metastore.com)
- **Support**: Contact support at support@metastore.com
- **Community**: Join our community forum at [community.metastore.com](https://community.metastore.com)
- **GitHub**: Check our GitHub repository at [github.com/metastore](https://github.com/metastore)
