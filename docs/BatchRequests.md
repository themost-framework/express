# OData v4 Batch Requests with Content-ID Referencing

## Table of Contents

1. [Overview](#overview)
2. [Basic Batch Requests](#basic-batch-requests)
3. [Content-ID Referencing](#content-id-referencing)
4. [URL References with `$`](#url-references-with-)
5. [Body Property References with `$$`](#body-property-references-with-)
6. [Atomicity Groups (Changesets)](#atomicity-groups-changesets)
7. [Advanced Examples](#advanced-examples)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Overview

The `@themost/express` framework supports OData v4 batch requests, allowing multiple API operations to be executed in a single HTTP request. This feature includes:

- ✅ **Standard OData v4 batch processing**
- ✅ **Content-ID based URL referencing** (`$<id>`)
- ✅ **Extended body property referencing** (`$$<id>.<property>`)
- ✅ **Atomicity Groups (Changesets)** for transactional operations
- ✅ **Sequential execution** with dependency support
- ✅ **Error isolation** - one request failure doesn't stop others

### Key Benefits

- **Reduced network overhead** - Multiple operations in one HTTP call
- **Request dependencies** - Use results from previous requests
- **Transactional integrity** - Create related entities in sequence
- **Atomic operations** - All-or-nothing execution with atomicity groups
- **Better performance** - Reduced latency for complex operations

---

## Basic Batch Requests

### Endpoint

```
POST /api/$batch
Content-Type: application/json
```

### Request Structure

```json
{
  "requests": [
    {
      "id": "1",
      "method": "GET|POST|PUT|PATCH|DELETE",
      "url": "/api/EntitySet",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": { /* request body for POST/PUT/PATCH */ },
      "atomicityGroup": "group1"  // Optional: for transactional operations
    }
  ]
}
```

### Response Structure

```json
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": { /* response data */ }
    }
  ]
}
```

### Simple Example

**Request:**

```json
{
  "requests": [
    {
      "id": "1",
      "method": "GET",
      "url": "/api/Customers?$top=5"
    },
    {
      "id": "2",
      "method": "GET",
      "url": "/api/Products?$filter=price gt 100"
    }
  ]
}
```

**Response:**

```json
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "@odata.context": "/$metadata#Customers",
        "value": [
          {"id": 1, "name": "Customer A"},
          {"id": 2, "name": "Customer B"}
        ]
      }
    },
    {
      "id": "2",
      "status": 200,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "@odata.context": "/$metadata#Products",
        "value": [
          {"id": 101, "name": "Premium Widget", "price": 150}
        ]
      }
    }
  ]
}
```

---

## Content-ID Referencing

Content-ID allows subsequent requests to reference results from previous requests within the same batch.

### Three Key Features

| Feature | Purpose | OData Standard | Example |
|---------|---------|----------------|---------|
| `$<id>` | URL reference | ✅ Yes | `$1/Orders` |
| `$$<id>.<property>` | Body property reference | ❌ Extension | `$$1.id` |
| `atomicityGroup` | Transactional grouping | ✅ Yes | `"atomicityGroup": "g1"` |

---

## URL References with `$`

**Standard OData v4.0 feature** - References the Location header or @odata.id from a previous request.

### How It Works

1. A POST request creates an entity with `Content-ID: "1"`
2. The response includes `Location: /api/Customers(42)`
3. Subsequent requests use `$1` which resolves to `/api/Customers(42)`

### Example: Create Customer and Add Address

**Request:**

```json
{
  "requests": [
    {
      "id": "create-customer",
      "method": "POST",
      "url": "/api/Customers",
      "body": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "id": "create-address",
      "method": "POST",
      "url": "$create-customer/Addresses",
      "body": {
        "street": "123 Main St",
        "city": "New York",
        "zipCode": "10001"
      }
    }
  ]
}
```

**What Happens:**

1. Request `create-customer` creates a customer → Returns `Location: /api/Customers(42)`
2. Request `create-address` URL becomes: `/api/Customers(42)/Addresses`
3. Address is created for the new customer

**Response:**

```json
{
  "responses": [
    {
      "id": "create-customer",
      "status": 201,
      "headers": {
        "Location": "/api/Customers(42)"
      },
      "body": {
        "@odata.id": "/api/Customers(42)",
        "id": 42,
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "id": "create-address",
      "status": 201,
      "headers": {
        "Location": "/api/Customers(42)/Addresses(99)"
      },
      "body": {
        "@odata.id": "/api/Customers(42)/Addresses(99)",
        "id": 99,
        "customerId": 42,
        "street": "123 Main St",
        "city": "New York"
      }
    }
  ]
}
```

### Resolution Priority

When resolving `$<id>`:

1. ✅ `Location` header (HTTP standard)
2. ✅ `location` header (case-insensitive fallback)
3. ✅ `@odata.id` in response body
4. ✅ `value[0].@odata.id` (for collection responses)

---

## Body Property References with `$$`

**Custom extension** - Allows referencing specific properties from previous response bodies.

### Syntax

```
$$<content-id>.<property-path>
```

### Supported Path Formats

```javascript
$$1.id                    // Simple property
$$1.customer.name         // Nested property
$$1.value[0].id          // Array index
$$1.metadata.createdAt   // Deep nesting
```

### Example: Create Order with Customer Reference

**Request:**

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "url": "/api/Customers",
      "body": {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1234567890"
      }
    },
    {
      "id": "2",
      "method": "POST",
      "url": "/api/Orders",
      "body": {
        "customerId": "$$1.id",
        "customerEmail": "$$1.email",
        "items": [
          {
            "productId": 101,
            "quantity": 2
          }
        ],
        "totalAmount": 299.98
      }
    },
    {
      "id": "3",
      "method": "POST",
      "url": "/api/Notifications",
      "body": {
        "recipient": "$$1.email",
        "subject": "Order Confirmation",
        "message": "Your order #$$2.id has been placed successfully!",
        "metadata": {
          "orderId": "$$2.id",
          "customerId": "$$1.id"
        }
      }
    }
  ]
}
```

**Resolution Process:**

1. Request `1` creates customer with `id: 42`
2. Request `2`:
   - `$$1.id` → `42`
   - `$$1.email` → `"jane@example.com"`
   - Creates order with `orderId: 500`
3. Request `3`:
   - `$$1.email` → `"jane@example.com"`
   - `$$2.id` → `500`
   - Sends notification

---

## Atomicity Groups (Changesets)

### What is an Atomicity Group?

An **atomicity group** (also called a **changeset** in OData terminology) is a collection of requests that must **all succeed or all fail together**. This provides **transactional integrity** for related operations.

### Key Characteristics

| Feature | Behavior |
|---------|----------|
| **All or Nothing** | If any request fails, all requests in the group are rolled back |
| **Isolation** | Changes are not visible until the entire group succeeds |
| **Ordering** | Requests within a group execute in order |
| **Dependencies** | Can reference other requests in the same group |

### When to Use Atomicity Groups

✅ **Use atomicity groups when:**
- Creating related entities that must exist together
- Financial transactions (payment + order + inventory update)
- Data consistency is critical
- You need rollback capability

❌ **Don't use atomicity groups when:**
- Requests are independent
- You want partial success
- Read-only operations (GET requests)

### Syntax

Add the `atomicityGroup` property to requests:

```json
{
  "id": "request-id",
  "method": "POST",
  "url": "/api/EntitySet",
  "atomicityGroup": "group-name",
  "body": { ... }
}
```

### Important Rules

1. **GET requests should NOT be in atomicity groups** (read-only operations)
2. **All requests in a group must use the same group name**
3. **Groups are processed sequentially**
4. **Requests without `atomicityGroup` are processed independently**

---

## Atomicity Group Examples

### Example 1: Basic Transaction

Create customer and order atomically:

**Request:**

```json
{
  "requests": [
    {
      "id": "customer",
      "method": "POST",
      "url": "/api/Customers",
      "atomicityGroup": "transaction1",
      "body": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "id": "order",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "transaction1",
      "body": {
        "customerId": "$$customer.id",
        "amount": 500.00
      }
    }
  ]
}
```

**Success Scenario:**

Both requests succeed:

```json
{
  "responses": [
    {
      "id": "customer",
      "status": 201,
      "body": {"id": 42, "name": "John Doe"}
    },
    {
      "id": "order",
      "status": 201,
      "body": {"id": 100, "customerId": 42, "amount": 500.00}
    }
  ]
}
```

**Failure Scenario:**

If order creation fails (e.g., validation error), **both operations are rolled back**:

```json
{
  "responses": [
    {
      "id": "customer",
      "status": 424,
      "body": {
        "message": "Failed Dependency - Transaction rolled back"
      }
    },
    {
      "id": "order",
      "status": 400,
      "body": {
        "message": "Invalid amount"
      }
    }
  ]
}
```

❌ Customer is **NOT created** in the database
❌ Order is **NOT created** in the database

### Example 2: Financial Transaction

Transfer money between accounts:

**Request:**

```json
{
  "requests": [
    {
      "id": "debit",
      "method": "POST",
      "url": "/api/Transactions",
      "atomicityGroup": "transfer-001",
      "body": {
        "accountId": 123,
        "amount": -100.00,
        "type": "debit",
        "description": "Transfer to account 456"
      }
    },
    {
      "id": "credit",
      "method": "POST",
      "url": "/api/Transactions",
      "atomicityGroup": "transfer-001",
      "body": {
        "accountId": 456,
        "amount": 100.00,
        "type": "credit",
        "description": "Transfer from account 123"
      }
    },
    {
      "id": "update-balance-1",
      "method": "PATCH",
      "url": "/api/Accounts(123)",
      "atomicityGroup": "transfer-001",
      "body": {
        "balance": "$$debit.newBalance"
      }
    },
    {
      "id": "update-balance-2",
      "method": "PATCH",
      "url": "/api/Accounts(456)",
      "atomicityGroup": "transfer-001",
      "body": {
        "balance": "$$credit.newBalance"
      }
    }
  ]
}
```

**Guarantee:** Either all 4 operations succeed, or none do. No partial transfers!

### Example 3: E-commerce Order Processing

Complete order with inventory update:

**Request:**

```json
{
  "requests": [
    {
      "id": "create-order",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "order-12345",
      "body": {
        "customerId": 42,
        "items": [
          {"productId": 101, "quantity": 2},
          {"productId": 102, "quantity": 1}
        ]
      }
    },
    {
      "id": "reserve-inventory-1",
      "method": "POST",
      "url": "/api/Inventory/reserve",
      "atomicityGroup": "order-12345",
      "body": {
        "orderId": "$$create-order.id",
        "productId": 101,
        "quantity": 2
      }
    },
    {
      "id": "reserve-inventory-2",
      "method": "POST",
      "url": "/api/Inventory/reserve",
      "atomicityGroup": "order-12345",
      "body": {
        "orderId": "$$create-order.id",
        "productId": 102,
        "quantity": 1
      }
    },
    {
      "id": "create-payment",
      "method": "POST",
      "url": "/api/Payments",
      "atomicityGroup": "order-12345",
      "body": {
        "orderId": "$$create-order.id",
        "amount": "$$create-order.totalAmount",
        "status": "pending"
      }
    }
  ]
}
```

**If ANY operation fails:**
- ❌ Order is NOT created
- ❌ Inventory is NOT reserved
- ❌ Payment is NOT created
- ✅ Database remains consistent

### Example 4: Mixed Groups

Different atomicity groups in one batch:

**Request:**

```json
{
  "requests": [
    {
      "id": "query-products",
      "method": "GET",
      "url": "/api/Products?$top=10"
      // No atomicityGroup - independent operation
    },
    {
      "id": "customer-1",
      "method": "POST",
      "url": "/api/Customers",
      "atomicityGroup": "group-A",
      "body": {"name": "Customer A"}
    },
    {
      "id": "order-1",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "group-A",
      "body": {
        "customerId": "$$customer-1.id",
        "amount": 100
      }
    },
    {
      "id": "customer-2",
      "method": "POST",
      "url": "/api/Customers",
      "atomicityGroup": "group-B",
      "body": {"name": "Customer B"}
    },
    {
      "id": "order-2",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "group-B",
      "body": {
        "customerId": "$$customer-2.id",
        "amount": 200
      }
    }
  ]
}
```

**Processing:**
1. `query-products` executes independently
2. `group-A` executes as transaction (customer-1 + order-1)
3. `group-B` executes as transaction (customer-2 + order-2)

**Scenario: group-A fails, group-B succeeds:**

```json
{
  "responses": [
    {
      "id": "query-products",
      "status": 200,
      "body": {"value": [...]}  // ✅ Success
    },
    {
      "id": "customer-1",
      "status": 424,  // Failed Dependency
      "body": {"message": "Transaction rolled back"}
    },
    {
      "id": "order-1",
      "status": 400,  // Original failure
      "body": {"message": "Invalid amount"}
    },
    {
      "id": "customer-2",
      "status": 201,  // ✅ Success
      "body": {"id": 99, "name": "Customer B"}
    },
    {
      "id": "order-2",
      "status": 201,  // ✅ Success
      "body": {"id": 200, "customerId": 99, "amount": 200}
    }
  ]
}
```

**Result:**
- ✅ Products query succeeded
- ❌ Customer A and Order 1 rolled back (group-A failed)
- ✅ Customer B and Order 2 created (group-B succeeded)

---

## Atomicity Group Implementation

### Database Transaction Support

For atomicity groups to work properly, your implementation must support **database transactions**:

```javascript
// Example implementation with transaction support
async function executeAtomicityGroup(requests, groupName) {
  const transaction = await db.beginTransaction();
  
  try {
    const results = [];
    
    for (const request of requests) {
      if (request.atomicityGroup === groupName) {
        const result = await executeRequest(request, transaction);
        results.push(result);
        
        // If any request fails, throw to rollback
        if (result.status >= 400) {
          throw new Error(`Request ${request.id} failed`);
        }
      }
    }
    
    // All succeeded, commit transaction
    await transaction.commit();
    return results;
    
  } catch (error) {
    // Any failure rolls back entire group
    await transaction.rollback();
    
    // Return 424 (Failed Dependency) for all requests in group
    return requests
      .filter(r => r.atomicityGroup === groupName)
      .map(r => ({
        id: r.id,
        status: 424,
        body: {
          message: 'Failed Dependency - Transaction rolled back',
          error: error.message
        }
      }));
  }
}
```

### Status Codes

| Status | Meaning | When Used |
|--------|---------|-----------|
| **200-299** | Success | Request completed successfully |
| **400** | Bad Request | Original request failure (validation, etc.) |
| **424** | Failed Dependency | Request rolled back due to group failure |
| **500** | Server Error | Unexpected error during processing |

### Configuration

Enable transaction support in your batch middleware:

```javascript
import { batch } from '@themost/express';

app.use('/api/', batch(app, {
  min: 2,
  max: 25,
  
  // Enable atomicity group support
  atomicityGroups: true,
  
  // Transaction timeout (milliseconds)
  transactionTimeout: 30000,
  
  // Isolation level
  isolationLevel: 'READ_COMMITTED'
}));
```

---

## Comparing Approaches

### Independent Requests (No Atomicity Group)

```json
{
  "requests": [
    {"id": "1", "method": "POST", "url": "/api/Customers", "body": {...}},
    {"id": "2", "method": "POST", "url": "/api/Orders", "body": {...}}
  ]
}
```

**Behavior:**
- ✅ Request 1 creates customer → **committed immediately**
- ❌ Request 2 fails → customer **remains in database**
- ⚠️ Inconsistent state: customer exists without order

### With Atomicity Group

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "url": "/api/Customers",
      "atomicityGroup": "tx1",
      "body": {...}
    },
    {
      "id": "2",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "tx1",
      "body": {...}
    }
  ]
}
```

**Behavior:**
- ✅ Request 1 creates customer → **pending in transaction**
- ❌ Request 2 fails → **entire transaction rolls back**
- ✅ Consistent state: neither customer nor order exists

---

## Atomicity Group Best Practices

### 1. Keep Groups Small

✅ **Good:** 2-5 related operations
```json
{
  "atomicityGroup": "order-create",
  // Customer + Order + Payment
}
```

❌ **Avoid:** Large, complex transactions
```json
{
  "atomicityGroup": "huge-transaction",
  // 20+ operations - high chance of failure
}
```

### 2. Don't Mix Read and Write Operations

✅ **Correct:**
```json
[
  {"id": "1", "method": "GET", "url": "/api/Products"},  // No group
  {"id": "2", "method": "POST", "atomicityGroup": "g1", ...},
  {"id": "3", "method": "POST", "atomicityGroup": "g1", ...}
]
```

❌ **Incorrect:**
```json
[
  {"id": "1", "method": "GET", "atomicityGroup": "g1", ...},  // Don't include GETs
  {"id": "2", "method": "POST", "atomicityGroup": "g1", ...}
]
```

### 3. Use Descriptive Group Names

✅ **Good:**
```json
"atomicityGroup": "order-12345-payment"
"atomicityGroup": "customer-registration"
"atomicityGroup": "inventory-transfer-abc"
```

❌ **Avoid:**
```json
"atomicityGroup": "g1"
"atomicityGroup": "group"
"atomicityGroup": "tx"
```

### 4. Handle 424 Status (Failed Dependency)

```javascript
const responses = batchResponse.responses;

responses.forEach(response => {
  if (response.status === 424) {
    console.log(`Request ${response.id} was rolled back due to group failure`);
    // Don't retry - the entire group failed
  } else if (response.status >= 400) {
    console.log(`Request ${response.id} failed: ${response.body.message}`);
    // This might be the original failure that caused rollback
  }
});
```

### 5. Consider Timeout Implications

Long-running transactions can:
- Hold database locks
- Block other operations
- Increase failure risk

**Recommendation:** Keep transaction time under 5 seconds.

---

## Advanced Examples

### Example 1: E-commerce Order Flow with Atomicity

Complete workflow with multiple atomicity groups:

```json
{
  "requests": [
    {
      "id": "check-inventory",
      "method": "GET",
      "url": "/api/Inventory?productId=101"
      // Independent query - no atomicity group
    },
    {
      "id": "customer",
      "method": "POST",
      "url": "/api/Customers",
      "atomicityGroup": "order-flow",
      "body": {
        "firstName": "Alice",
        "lastName": "Johnson",
        "email": "alice@example.com"
      }
    },
    {
      "id": "shipping-address",
      "method": "POST",
      "url": "$customer/Addresses",
      "atomicityGroup": "order-flow",
      "body": {
        "type": "shipping",
        "street": "456 Oak Ave",
        "city": "Boston"
      }
    },
    {
      "id": "order",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "order-flow",
      "body": {
        "customerId": "$$customer.id",
        "shippingAddressId": "$$shipping-address.id",
        "items": [
          {"productId": 101, "quantity": 2}
        ]
      }
    },
    {
      "id": "reserve-inventory",
      "method": "POST",
      "url": "/api/Inventory/reserve",
      "atomicityGroup": "order-flow",
      "body": {
        "orderId": "$$order.id",
        "productId": 101,
        "quantity": 2
      }
    },
    {
      "id": "payment",
      "method": "POST",
      "url": "/api/Payments",
      "atomicityGroup": "order-flow",
      "body": {
        "orderId": "$$order.id",
        "amount": "$$order.totalAmount",
        "method": "credit_card"
      }
    },
    {
      "id": "send-confirmation",
      "method": "POST",
      "url": "/api/Emails/send",
      "body": {
        "to": "$$customer.email",
        "template": "order_confirmation",
        "data": {
          "orderId": "$$order.id"
        }
      }
      // Email sending is separate - not in atomicity group
    }
  ]
}
```

**Processing:**
1. ✅ Inventory check (independent)
2. ⚡ Atomicity group executes:
   - Customer creation
   - Address creation
   - Order creation
   - Inventory reservation
   - Payment creation
3. ✅ Email sending (independent, even if email fails, order is already committed)

### Example 2: Bulk Import with Validation

```json
{
  "requests": [
    {
      "id": "validate-data",
      "method": "POST",
      "url": "/api/Validation/bulk",
      "body": {
        "data": [/* bulk data */]
      }
      // Validation step - no atomicity group
    },
    {
      "id": "import-1",
      "method": "POST",
      "url": "/api/Products",
      "atomicityGroup": "import-batch-1",
      "body": {"name": "Product 1", "price": 99}
    },
    {
      "id": "import-2",
      "method": "POST",
      "url": "/api/Products",
      "atomicityGroup": "import-batch-1",
      "body": {"name": "Product 2", "price": 149}
    },
    {
      "id": "import-3",
      "method": "POST",
      "url": "/api/Products",
      "atomicityGroup": "import-batch-2",
      "body": {"name": "Product 3", "price": 199}
    },
    {
      "id": "import-4",
      "method": "POST",
      "url": "/api/Products",
      "atomicityGroup": "import-batch-2",
      "body": {"name": "Product 4", "price": 249}
    }
  ]
}
```

**Benefit:** If products 1-2 succeed but 3-4 fail, you have partial success instead of all-or-nothing.

### Example 3: Multi-Tenant Data Migration

```json
{
  "requests": [
    {
      "id": "tenant-1-user",
      "method": "POST",
      "url": "/api/Users",
      "atomicityGroup": "tenant-1-migration",
      "body": {"tenantId": 1, "name": "User A"}
    },
    {
      "id": "tenant-1-settings",
      "method": "POST",
      "url": "/api/Settings",
      "atomicityGroup": "tenant-1-migration",
      "body": {"userId": "$$tenant-1-user.id", "preferences": {...}}
    },
    {
      "id": "tenant-2-user",
      "method": "POST",
      "url": "/api/Users",
      "atomicityGroup": "tenant-2-migration",
      "body": {"tenantId": 2, "name": "User B"}
    },
    {
      "id": "tenant-2-settings",
      "method": "POST",
      "url": "/api/Settings",
      "atomicityGroup": "tenant-2-migration",
      "body": {"userId": "$$tenant-2-user.id", "preferences": {...}}
    }
  ]
}
```

**Each tenant's migration is atomic**, but tenants are independent.

---

## Error Handling

### Failed Request Behavior

When a request in a batch fails:

**Without Atomicity Group:**
- ✅ The failed request returns its error status and details
- ✅ Subsequent requests **continue to execute**
- ⚠️ References to failed requests remain unresolved

**With Atomicity Group:**
- ❌ The failed request returns its error (400, 500, etc.)
- ❌ All other requests in the same group return **424 Failed Dependency**
- ✅ Requests in different groups or without groups **continue to execute**
- ⚡ **Database transaction is rolled back**

### Example: Atomicity Group Failure

**Request:**

```json
{
  "requests": [
    {
      "id": "independent",
      "method": "POST",
      "url": "/api/Logs",
      "body": {"message": "Starting process"}
    },
    {
      "id": "group-req-1",
      "method": "POST",
      "url": "/api/Customers",
      "atomicityGroup": "tx1",
      "body": {"name": "Test"}
    },
    {
      "id": "group-req-2",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "tx1",
      "body": {"invalidData": true}  // This will fail
    },
    {
      "id": "group-req-3",
      "method": "POST",
      "url": "/api/Payments",
      "atomicityGroup": "tx1",
      "body": {"amount": 100}
    }
  ]
}
```

**Response:**

```json
{
  "responses": [
    {
      "id": "independent",
      "status": 201,
      "body": {"id": 1, "message": "Starting process"}
      // ✅ Succeeded - not in group
    },
    {
      "id": "group-req-1",
      "status": 424,
      "body": {
        "message": "Failed Dependency - Transaction rolled back",
        "atomicityGroup": "tx1"
      }
      // ❌ Rolled back - part of failed group
    },
    {
      "id": "group-req-2",
      "status": 400,
      "body": {
        "message": "Bad Request - Invalid data",
        "errors": [...]
      }
      // ❌ Original failure
    },
    {
      "id": "group-req-3",
      "status": 424,
      "body": {
        "message": "Failed Dependency - Transaction rolled back",
        "atomicityGroup": "tx1"
      }
      // ❌ Rolled back - part of failed group
    }
  ]
}
```

**Database State:**
- ✅ Log entry exists (independent request)
- ❌ Customer does NOT exist (rolled back)
- ❌ Order does NOT exist (original failure)
- ❌ Payment does NOT exist (rolled back)

### Unresolved References

If a referenced request fails or doesn't exist:

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "url": "/api/InvalidEndpoint",
      "atomicityGroup": "tx1",
      "body": {"test": "data"}
    },
    {
      "id": "2",
      "method": "POST",
      "url": "/api/Orders",
      "atomicityGroup": "tx1",
      "body": {
        "customerId": "$$1.id"  // ← Will not resolve due to group failure
      }
    }
  ]
}
```

**Best Practice:** Check response statuses and handle unresolved references in your application logic.

---

## Best Practices

### 1. Use Descriptive Content-IDs

❌ **Avoid:**
```json
{"id": "1"}, {"id": "2"}, {"id": "3"}
```

✅ **Prefer:**
```json
{"id": "create-customer"},
{"id": "create-order"},
{"id": "send-notification"}
```

### 2. Order Requests by Dependency

Ensure requests appear **after** their dependencies:

✅ **Correct Order:**
```json
[
  {"id": "customer", "method": "POST", "url": "/api/Customers"},
  {"id": "order", "body": {"customerId": "$$customer.id"}}
]
```

❌ **Wrong Order:**
```json
[
  {"id": "order", "body": {"customerId": "$$customer.id"}},
  {"id": "customer", "method": "POST", "url": "/api/Customers"}
]
```

### 3. Choose Atomicity Groups Wisely

✅ **Use atomicity groups for:**
- Financial transactions
- Related entity creation
- Data consistency requirements
- Operations that must succeed together

❌ **Don't use atomicity groups for:**
- Independent operations
- Read operations (GET)
- When partial success is acceptable
- Long-running operations

### 4. Limit Batch Size

The default configuration limits batches to **2-25 requests**:

```javascript
batch(app, {
  min: 2,    // Minimum requests per batch
  max: 25    // Maximum requests per batch
});
```

**Recommendation:** Keep batches focused and under 20 requests for optimal performance.

### 5. Use Both Reference Types Appropriately

| Scenario | Use | Example |
|----------|-----|---------|
| Navigation to child entity | `$id` | `$customer/Orders` |
| Foreign key reference | `$$id.property` | `$$customer.id` |
| Complex data passing | `$$id.property` | `$$order.totalAmount` |
| Transactional operations | `atomicityGroup` | `"atomicityGroup": "tx1"` |

### 6. Handle Errors Gracefully

Always check response statuses:

```javascript
const responses = batchResponse.responses;

// Check if all succeeded
const allSucceeded = responses.every(r => r.status >= 200 && r.status < 300);

// Find failures
const failures = responses.filter(r => r.status >= 400);

// Find rollbacks
const rollbacks = responses.filter(r => r.status === 424);

// Get specific result
const customerResponse = responses.find(r => r.id === 'create-customer');
if (customerResponse.status === 201) {
  const customerId = customerResponse.body.id;
  // Use customerId...
} else if (customerResponse.status === 424) {
  console.log('Customer creation rolled back due to transaction failure');
}
```

### 7. Monitor Transaction Duration

```javascript
// Log transaction durations
responses.forEach(response => {
  if (response.body.atomicityGroup) {
    console.log(`Group ${response.body.atomicityGroup}: ${response.duration}ms`);
  }
});
```

### 8. Optimize Network Usage

Batch related operations together:

✅ **Good:**
```json
// One batch: Create customer + add address + create order (atomic)
{
  "requests": [
    {"id": "customer", "atomicityGroup": "order-tx", ...},
    {"id": "address", "atomicityGroup": "order-tx", ...},
    {"id": "order", "atomicityGroup": "order-tx", ...}
  ]
}
```

❌ **Bad:**
```json
// Three separate HTTP requests
POST /api/Customers
POST /api/Addresses
POST /api/Orders
```

---

## API Reference

### Configuration Options

```javascript
import { batch } from '@themost/express';

app.use('/api/', batch(app, {
  // Minimum number of requests per batch
  min: 2,
  
  // Maximum number of requests per batch
  max: 25,
  
  // Enable atomicity group support
  atomicityGroups: true,
  
  // Transaction timeout in milliseconds
  transactionTimeout: 30000,
  
  // Database isolation level
  isolationLevel: 'READ_COMMITTED',
  
  // Headers to inherit from parent request
  headers: [
    'authorization',
    'content-type',
    'accept',
    'accept-language',
    'accept-encoding',
    'user-agent'
  ]
}));
```

### Request Object Schema

```typescript
interface BatchRequest {
  id: string;                          // Unique identifier (Content-ID)
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;                         // Can contain $id references
  headers?: Record<string, string>;    // Optional request headers
  body?: any;                          // Request body (can contain $$id.property)
  atomicityGroup?: string;             // Optional: transaction group name
}
```

### Response Object Schema

```typescript
interface BatchResponse {
  id: string;                          // Matches request Content-ID
  status: number;                      // HTTP status code
  headers: Record<string, string>;     // Response headers
  body: any;                           // Response body
  atomicityGroup?: string;             // If part of a group
  duration?: number;                   // Processing time in ms
}
```

### Batch Request Schema

```typescript
interface BatchRequestPayload {
  requests: BatchRequest[];
}
```

### Batch Response Schema

```typescript
interface BatchResponsePayload {
  responses: BatchResponse[];
}
```

### HTTP Status Codes

| Status | Name | Usage |
|--------|------|-------|
| **200** | OK | Successful GET, PATCH, DELETE |
| **201** | Created | Successful POST |
| **204** | No Content | Successful operation with no response body |
| **400** | Bad Request | Validation error, malformed request |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource does not exist |
| **424** | Failed Dependency | Rolled back due to atomicity group failure |
| **500** | Internal Server Error | Unexpected server error |

---

## Reference Resolution Algorithm

### URL Reference (`$id`)

```
1. Check if URL contains $<id> pattern
2. Look up result by Content-ID
3. Try resolution in order:
   a. response.headers.Location
   b. response.headers.location (case-insensitive)
   c. response.body['@odata.id']
   d. response.body.value[0]['@odata.id'] (for collections)
4. Replace $<id> with resolved URL
5. If not found, leave as-is (will likely result in 404)
```

### Body Property Reference (`$$id.property`)

```
1. Scan request body for $$<id>.<path> patterns
2. For each match:
   a. Look up result by Content-ID
   b. Check if request succeeded (status 2xx)
   c. If in atomicity group, check group didn't fail
   d. Parse property path (support dot notation and array indexes)
   e. Extract value from response body
   f. Replace $$<id>.<path> with extracted value
3. If resolution fails, leave as-is (literal string)
```

### Atomicity Group Processing

```
1. Group requests by atomicityGroup property
2. For each group:
   a. Begin database transaction
   b. Execute requests in order
   c. Resolve references within group
   d. If all succeed:
      - Commit transaction
      - Return success responses
   e. If any fails:
      - Rollback transaction
      - Return 424 for all requests in group
      - Include original error for failed request
3. Process requests without groups independently
```

---

## Testing Examples

### Example Test: Atomicity Group Success

```javascript
import request from 'supertest';

describe('Batch Atomicity Groups', () => {
  it('should commit transaction when all requests succeed', async () => {
    const response = await request(app)
      .post('/api/$batch')
      .set('Content-Type', 'application/json')
      .send({
        requests: [
          {
            id: 'customer',
            method: 'POST',
            url: '/api/Customers',
            atomicityGroup: 'tx1',
            body: {
              name: 'Test Customer',
              email: 'test@example.com'
            }
          },
          {
            id: 'order',
            method: 'POST',
            url: '/api/Orders',
            atomicityGroup: 'tx1',
            body: {
              customerId: '$$customer.id',
              amount: 100
            }
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.responses).toHaveLength(2);
    
    const customerResponse = response.body.responses[0];
    expect(customerResponse.status).toBe(201);
    expect(customerResponse.body.id).toBeDefined();
    
    const orderResponse = response.body.responses[1];
    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.customerId).toBe(customerResponse.body.id);
    
    // Verify data exists in database
    const customer = await db.customers.findById(customerResponse.body.id);
    expect(customer).toBeDefined();
    
    const order = await db.orders.findById(orderResponse.body.id);
    expect(order).toBeDefined();
  });

  it('should rollback transaction when any request fails', async () => {
    const response = await request(app)
      .post('/api/$batch')
      .set('Content-Type', 'application/json')
      .send({
        requests: [
          {
            id: 'customer',
            method: 'POST',
            url: '/api/Customers',
            atomicityGroup: 'tx1',
            body: {
              name: 'Test Customer'
            }
          },
          {
            id: 'order',
            method: 'POST',
            url: '/api/Orders',
            atomicityGroup: 'tx1',
            body: {
              customerId: '$$customer.id',
              amount: -100  // Invalid amount - will fail validation
            }
          }
        ]
      });

    expect(response.status).toBe(200);
    
    const customerResponse = response.body.responses[0];
    expect(customerResponse.status).toBe(424);  // Failed Dependency
    
    const orderResponse = response.body.responses[1];
    expect(orderResponse.status).toBe(400);  // Original failure
    
    // Verify nothing was created in database
    const customerCount = await db.customers.count();
    expect(customerCount).toBe(0);
    
    const orderCount = await db.orders.count();
    expect(orderCount).toBe(0);
  });

  it('should isolate atomicity groups from each other', async () => {
    const response = await request(app)
      .post('/api/$batch')
      .set('Content-Type', 'application/json')
      .send({
        requests: [
          {
            id: 'customer-1',
            method: 'POST',
            url: '/api/Customers',
            atomicityGroup: 'group-A',
            body: {name: 'Customer A'}
          },
          {
            id: 'order-1',
            method: 'POST',
            url: '/api/Orders',
            atomicityGroup: 'group-A',
            body: {
              customerId: '$$customer-1.id',
              amount: -100  // Will fail
            }
          },
          {
            id: 'customer-2',
            method: 'POST',
            url: '/api/Customers',
            atomicityGroup: 'group-B',
            body: {name: 'Customer B'}
          },
          {
            id: 'order-2',
            method: 'POST',
            url: '/api/Orders',
            atomicityGroup: 'group-B',
            body: {
              customerId: '$$customer-2.id',
              amount: 100  // Valid
            }
          }
        ]
      });

    expect(response.status).toBe(200);
    
    // Group A failed
    expect(response.body.responses[0].status).toBe(424);  // customer-1 rolled back
    expect(response.body.responses[1].status).toBe(400);  // order-1 failed
    
    // Group B succeeded
    expect(response.body.responses[2].status).toBe(201);  // customer-2 created
    expect(response.body.responses[3].status).toBe(201);  // order-2 created
    
    // Verify only group B data exists
    const customers = await db.customers.findAll();
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe('Customer B');
    
    const orders = await db.orders.findAll();
    expect(orders).toHaveLength(1);
  });
});
```

---

## Migration Guide

### From Individual Requests to Batch with Atomicity

**Before:**

```javascript
// Multiple requests with manual rollback
let customer, order;

try {
  customer = await fetch('/api/Customers', {
    method: 'POST',
    body: JSON.stringify({name: 'John'})
  }).then(r => r.json());

  order = await fetch('/api/Orders', {
    method: 'POST',
    body: JSON.stringify({
      customerId: customer.id,
      amount: 100
    })
  }).then(r => r.json());
  
} catch (error) {
  // Manual cleanup - delete customer if order failed
  if (customer && !order) {
    await fetch(`/api/Customers(${customer.id})`, {
      method: 'DELETE'
    });
  }
  throw error;
}
```

**After:**

```javascript
// Single batch request with automatic rollback
const batchResponse = await fetch('/api/$batch', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    requests: [
      {
        id: 'customer',
        method: 'POST',
        url: '/api/Customers',
        atomicityGroup: 'create-order',
        body: {name: 'John'}
      },
      {
        id: 'order',
        method: 'POST',
        url: '/api/Orders',
        atomicityGroup: 'create-order',
        body: {
          customerId: '$$customer.id',
          amount: 100
        }
      }
    ]
  })
}).then(r => r.json());

// Check if transaction succeeded
const allSucceeded = batchResponse.responses.every(r => 
  r.status >= 200 && r.status < 300
);

if (allSucceeded) {
  const [customerRes, orderRes] = batchResponse.responses;
  // Both created successfully
} else {
  // Automatic rollback - nothing to clean up
  console.error('Transaction failed and rolled back');
}
```

**Benefits:**
- 🚀 **2x fewer network round trips**
- ⚡ **Automatic rollback** - no manual cleanup
- 🔒 **Guaranteed consistency**
- 📦 **Simpler error handling**

---

## Troubleshooting

### Issue: Atomicity Group Not Rolling Back

**Symptom:** Partial data remains in database after failure

**Causes:**
1. Database doesn't support transactions
2. Transaction not properly configured
3. Requests not in same atomicity group

**Solution:**
```javascript
// Verify transaction support
const config = {
  atomicityGroups: true,  // Must be enabled
  transactionTimeout: 30000
};

// Check all requests have same group name
requests.forEach(r => {
  console.log(`${r.id}: ${r.atomicityGroup}`);
});
```

### Issue: 424 Status on All Requests

**Symptom:** All requests in batch return 424

**Causes:**
1. First request in group failed
2. Database transaction error
3. Timeout exceeded

**Solution:**
```javascript
// Find the original failure
const originalFailure = responses.find(r => 
  r.status >= 400 && r.status !== 424
);
console.error('Original failure:', originalFailure);
```

### Issue: References Not Resolving

**Symptom:** `$$1.id` appears literally in created entities

**Causes:**
1. Referenced request failed (check status)
2. Request rolled back due to group failure
3. Property path is incorrect
4. Request order is wrong

**Solution:**
```javascript
// Check responses
responses.forEach(r => {
  console.log(`Request ${r.id}: Status ${r.status}`);
  if (r.status === 424) {
    console.log(`  Rolled back in group: ${r.body.atomicityGroup}`);
  }
  if (r.status >= 400) {
    console.error(`  Failed: ${r.body.message}`);
  }
});
```

### Issue: Transaction Timeout

**Symptom:** 500 error - "Transaction timeout"

**Causes:**
1. Too many operations in one group
2. Slow database operations
3. Lock contention

**Solution:**
```javascript
// Split into smaller groups
{
  "requests": [
    // Group 1: 2-3 operations
    {"atomicityGroup": "group-1", ...},
    {"atomicityGroup": "group-1", ...},
    
    // Group 2: 2-3 operations
    {"atomicityGroup": "group-2", ...},
    {"atomicityGroup": "group-2", ...}
  ]
}

// Or increase timeout
batch(app, {
  transactionTimeout: 60000  // 60 seconds
});
```

---

## Security Considerations

### 1. Authentication

Batch requests inherit authentication from the parent request:

```javascript
POST /api/$batch
Authorization: Bearer <token>
```

All sub-requests automatically receive this authorization.

### 2. Authorization

Each sub-request is authorized **individually**, even within atomicity groups:

```json
{
  "requests": [
    {"id": "1", "url": "/api/PublicData", "atomicityGroup": "tx1"},
    {"id": "2", "url": "/api/AdminOnly", "atomicityGroup": "tx1"}
  ]
}
```

Response:
```json
{
  "responses": [
    {"id": "1", "status": 424},  // Rolled back
    {"id": "2", "status": 403}   // Forbidden - caused rollback
  ]
}
```

**Security benefit:** Authorization failures trigger rollback, preventing partial operations.

### 3. Transaction Isolation

Configure appropriate isolation level:

```javascript
batch(app, {
  isolationLevel: 'READ_COMMITTED'  // Prevent dirty reads
});
```

### 4. Rate Limiting

Consider limiting atomicity groups:

```javascript
// Limit transaction complexity per user
const MAX_ATOMICITY_GROUP_SIZE = 10;
const MAX_CONCURRENT_TRANSACTIONS = 5;
```

---

## Performance Tips

### 1. Transaction Duration

**Target:** Keep transactions under 5 seconds

```javascript
// ✅ Good: Small, focused transaction
"atomicityGroup": "order-tx"
// 3 operations: customer + order + payment

// ❌ Bad: Large, complex transaction
"atomicityGroup": "huge-tx"
// 20+ operations: high failure risk, long locks
```

### 2. Database Optimization

Ensure proper indexing:

```sql
-- Index foreign keys used in transactions
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
```

### 3. Lock Contention

Minimize lock contention:

- **Avoid long-running read operations in atomicity groups**
- **Order operations to minimize lock time**
- **Use appropriate isolation level**

### 4. Connection Pooling

Configure adequate connection pool:

```javascript
{
  database: {
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 30000
    }
  }
}
```

---

## FAQ

**Q: Can I reference a request that comes later in the batch?**

A: No. Requests execute sequentially. You can only reference requests that have already completed.

**Q: What happens if I reference a failed request?**

A: The reference remains unresolved (as a literal string). The dependent request may fail validation or create incomplete data.

**Q: Can I use both `$id` and `$$id.property` in the same request?**

A: Yes! For example:
```json
{
  "url": "$customer/Orders",
  "body": {"amount": "$$product.price"}
}
```

**Q: Are atomicity groups transactional across the entire batch?**

A: No. Each atomicity group is its own transaction. Different groups are independent.

**Q: Can requests in different atomicity groups reference each other?**

A: Yes, but carefully:
```json
[
  {"id": "1", "atomicityGroup": "groupA", ...},
  {"id": "2", "atomicityGroup": "groupB", "body": {"refId": "$$1.id"}}
]
```
If groupA rolls back, the reference in groupB won't resolve.

**Q: What's the difference between atomicityGroup and no group?**

A:
- **With group:** All-or-nothing, automatic rollback on failure
- **Without group:** Each request is independent, no rollback

**Q: Can I nest atomicity groups?**

A: No. Atomicity groups cannot be nested. Each request belongs to zero or one group.

**Q: What happens if my database doesn't support transactions?**

A: Atomicity groups won't work. Operations will execute independently. Enable transaction support in your database configuration.

**Q: Can GET requests be in atomicity groups?**

A: Technically yes, but it's not recommended. GET requests don't modify data, so they don't need transactional protection.

**Q: What's the maximum size for an atomicity group?**

A: No hard limit, but **keep groups under 10 requests** for optimal performance and reliability.

---

## Additional Resources

- [OData v4.0 Specification](http://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part1-protocol.html)
- [OData Batch Processing](http://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html#_Toc372793748)
- [OData Batch Request Format](http://docs.oasis-open.org/odata/odata-json-format/v4.0/os/odata-json-format-v4.0-os.html#_Toc372793091)
- [@themost/express Documentation](https://github.com/themost-framework/express)
- [Database Transaction Best Practices](https://www.postgresql.org/docs/current/transaction-iso.html)

---

## Changelog

### Version 2.x
- ✅ Added batch request support
- ✅ Implemented Content-ID URL referencing (`$id`)
- ✅ Added custom body property referencing (`$$id.property`)
- ✅ Implemented atomicity groups (changesets) with transaction support
- ✅ Support for sequential execution
- ✅ Configurable batch size limits
- ✅ 424 Failed Dependency status for rolled back requests

---

## License

MIT License - See LICENSE file for details

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Need Help?** Open an issue on [GitHub](https://github.com/themost-framework/express/issues)