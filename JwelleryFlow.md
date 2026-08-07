# Jwellery Project Flow

This document explains the end-to-end flow of the Jewellery backend and frontend:
- what each major feature does
- which API endpoints power it
- what payloads are expected
- how the frontend calls those APIs
- how the checkout, OTP, cart, product, admin, and B2B journeys work together

Repo paths used for this document:
- Backend: `JwelleryBackend`
- Frontend: `JwelleryFronted`

## 1. High-Level Architecture

The system is split into:
- **Backend**: Express + MySQL + Razorpay + Shiprocket + Cloudinary + SMTP/SMS + WebSocket + background worker
- **Frontend**: Next.js app router + Redux + custom service layer + client-side checkout/cart/auth flows

Core request flow:
1. Frontend pages/components call service functions from `src/Services`
2. Services call backend REST APIs
3. Backend controllers read/write MySQL and invoke external services
4. Response is returned in a shared shape:

```json
{
  "data": null,
  "status": 200,
  "statusMessage": "Success message"
}
```

Shared response helper:
- Backend response helper: `src/utils/responseHelper.js`

Auth flow:
- JWT token is generated on login/register
- Frontend stores auth cookies and sends `Authorization: Bearer <token>` automatically through Axios interceptor

## 2. Backend Bootstrap Flow

### Entry files
- `src/app.js`
- `src/server.js`

### What `app.js` does
- creates Express app
- enables CORS with credentials
- parses JSON bodies
- serves static files from:
  - `/uploads`
  - `/invoices`
  - `/api/invoices`
- mounts all API route groups under `/api/*`

### What `server.js` does
- creates the HTTP server
- initializes WebSocket
- starts the background job worker
- listens on `PORT` or `5000`

### Important middleware
- JWT auth: `src/utils/authMiddleware.js`
- role guard: `src/utils/roleMiddleware.js`
- error handling: `src/utils/errorHandler.js`
- WebSocket: `src/utils/websocket.js`

## 3. Shared Backend Response Contract

Almost every controller returns:

```json
{
  "data": {},
  "status": 200,
  "statusMessage": "Human readable message"
}
```

This is important because the frontend usually checks:
- `response.status`
- `response.data.data`
- `response.data.statusMessage`

## 4. Authentication and User Flow

### Backend routes
- `POST /api/users/register`
- `POST /api/users/register-b2b`
- `POST /api/users/prospect`
- `POST /api/users/login`
- `GET /api/users/`
- `GET /api/users/:userId`
- `PUT /api/users/:userId`
- `PUT /api/users/:userId/reset-password`
- `DELETE /api/users/:userId`
- `POST /api/users/update-b2b-status`
- `GET /api/users/b2b-journey/:userId`
- `POST /api/users/re-apply-b2b`

### User register payload
`POST /api/users/register`

```json
{
  "name": "John",
  "email": "john@example.com",
  "phone": "9876543210",
  "passwordHash": "plainOrClientProvidedPassword",
  "userRole": 1,
  "companyName": "",
  "gstNumber": "",
  "createdBy": 1,
  "city": "",
  "state": "",
  "businessType": "",
  "businessExperience": "",
  "monthlyPurchaseEstimate": "",
  "primarySellingCity": "",
  "verificationLink": "",
  "isEmailVerified": false
}
```

### B2B register payload
`POST /api/users/register-b2b`

```json
{
  "phone": "9876543210",
  "name": "Buyer Name",
  "email": "buyer@example.com",
  "passwordHash": "optional",
  "userRole": 2,
  "companyName": "Company",
  "gstNumber": "GST123",
  "city": "Surat",
  "state": "Gujarat",
  "businessType": "Retailer",
  "businessExperience": "5 years",
  "monthlyPurchaseEstimate": "50000",
  "primarySellingCity": "Surat",
  "verificationLink": "",
  "isEmailVerified": true
}
```

### Login payload
`POST /api/users/login`

```json
{
  "email": "john@example.com",
  "password": "secret",
  "isB2bLogin": false
}
```

### What backend login does
- loads user by email
- compares password with bcrypt
- if `isB2bLogin` is true, validates B2B role
- returns `{ user, token }`

### Register behavior details
- email is optional in normal registration
- phone must be unique
- uploaded verification image, if present, is sent to Cloudinary
- password is stored as bcrypt hash
- token is generated immediately after successful register

### OTP-related backend routes
- `POST /api/verify/send-otp`
- `POST /api/verify/confirm-otp`
- `POST /api/verify/send-otp-password-reset`
- `POST /api/verify/reset-password`
- `POST /api/verify/verify-contact-checkout`
- `POST /api/verify/verify-email-checkout`

### OTP send payload
```json
{
  "contactType": "mobile",
  "contactValue": "9876543210",
  "userId": 10,
  "isLoginAuth": true,
  "isRegistration": false
}
```

### OTP verify payload
```json
{
  "contactType": "mobile",
  "contactValue": "9876543210",
  "otpCode": "123456",
  "isLoginAuth": true
}
```

### OTP reset password payload
```json
{
  "contactType": "email",
  "contactValue": "john@example.com",
  "userId": 10
}
```

```json
{
  "email": "john@example.com",
  "newPassword": "newPassword",
  "otpCode": "123456"
}
```

### Checkout verification payloads
```json
{ "userId": 10 }
```

### OTP logic summary
- OTP is 6 digits
- OTP is rate-limited by resend interval
- OTP has an expiry time
- login/registration flow can reuse OTP verification
- checkout uses contact/email verification checks before payment

## 5. Product Flow

### Backend routes
- `POST /api/products/addWithImages`
- `POST /api/products/fetch`
- `GET /api/products/fetch/:id`
- `POST /api/products/updateWithImages/:id`
- `POST /api/products/delete/:id`

### Product create payload
`POST /api/products/addWithImages`

The backend accepts `multipart/form-data`.

Text fields commonly include:
```json
{
  "name": "Ring",
  "description": "Gold ring",
  "basePrice": 10000,
  "b2bPrice": 9000,
  "stockQuantity": 20,
  "skuCode": "RNG-001",
  "discountPrice": 500,
  "weight": 4.5,
  "subcategoryId": "12",
  "createdBy": 1
}
```

Images:
- field name: `images`
- max count: 5

### Product update payload
`POST /api/products/updateWithImages/:id`

Same style as create plus:
```json
{
  "updatedBy": 1,
  "deleteImageIds": "3,4"
}
```

### Product fetch payload
`POST /api/products/fetch`

The backend expects filters in the request body. It also supports:
- `?isB2b=true`
- `?isB2b=false`

Example:
```json
{
  "categoryId": 2,
  "subcategoryId": 12,
  "minPrice": 1000,
  "maxPrice": 50000,
  "search": "ring",
  "page": 1,
  "limit": 12
}
```

### Product fetch-by-id response
Returns:
- product fields
- all images for the product
- related product ids

### Product backend behavior
- creates product first
- uploads images to Cloudinary
- stores product image records in DB
- fetch products returns product list with image arrays attached
- related products are derived from subcategory logic

## 6. Category and Subcategory Flow

### Category routes
- `POST /api/categories/add`
- `GET /api/categories/fetch`
- `GET /api/categories/fetchOne/:id`
- `POST /api/categories/update/:id`
- `POST /api/categories/delete/:id`

### Subcategory routes
- `POST /api/subcategories/add`
- `GET /api/subcategories/fetch`
- `GET /api/subcategories/fetchOne/:id`
- `POST /api/subcategories/update/:id`
- `POST /api/subcategories/delete/:id`
- `GET /api/subcategories/category/:categoryId`
- `GET /api/subcategories/parent/:parentId`

### Category/subcategory payload examples
```json
{ "name": "Rings", "createdBy": 1 }
```

```json
{ "name": "Gold Rings", "categoryId": 2, "parentId": 0, "createdBy": 1 }
```

### Frontend usage
Frontend uses these endpoints for:
- homepage collections
- shop filters
- nested category menus
- product listing page URL-driven filtering

## 7. Banner Flow

### Backend routes
- `GET /api/banners/fetch`
- `GET /api/banners/fetch-active`
- `GET /api/banners/fetchOne/:id`
- `POST /api/banners/add`
- `POST /api/banners/update/:id`
- `POST /api/banners/delete/:id`

### Banner create/update payload
`multipart/form-data`

```json
{
  "isActive": 1,
  "createdBy": 1
}
```

Image field:
- `image`

### Banner behavior
- image is uploaded to Cloudinary
- admin-only endpoints require JWT + role 3
- active banners are public

## 8. Config Flow

### Backend routes
- `POST /api/config/getConfig`
- `GET /api/config/getAll`
- `POST /api/config/add`
- `PUT /api/config/update/:id`
- `DELETE /api/config/delete/:id`

### Config payload example
```json
{
  "ConfigName": "GST Rate",
  "ConfigValue": "3"
}
```

### Where config is used
- GST calculation
- payment status and delivery status labels
- pickup code
- COD charge settings
- role labels
- B2B logic

## 9. Cart Flow

### Backend routes
- `POST /api/cart/add`
- `GET /api/cart/fetch/:userId`
- `GET /api/cart/estimation/:userId`
- `POST /api/cart/deleteOne/:id`
- `POST /api/cart/clear/:cartId`

### Add-to-cart payload
```json
{
  "userId": 10,
  "sessionId": "optionalGuestSessionId",
  "productId": 55,
  "quantity": 2,
  "size": "6"
}
```

### Cart estimation call
`GET /api/cart/estimation/:userId?delivery_pincode=395006`

### Cart behavior
- cart is created if missing
- cart items are updated or inserted
- guest cart can exist with session data
- estimation returns subtotal, GST, shipping and final amount

### Frontend cart flow
Frontend `cart/page.tsx`:
- loads cart from Redux/hook
- loads user addresses
- computes pincode-based estimation
- supports guest fallback calculation if API fails
- shows recommended products
- supports promo-code UI

Frontend service calls:
- `FetchCart`
- `GetCartEstimation`
- `FetchAddresses`
- `GetAllProducts`

## 10. Address Flow

### Backend routes
- `GET /api/addresses/states`
- `GET /api/addresses/fetch`
- `GET /api/addresses/fetchOne/:id`
- `POST /api/addresses/add`
- `PUT /api/addresses/update/:id`
- `DELETE /api/addresses/delete/:id`

### Address payload example
```json
{
  "userId": 10,
  "Addtype": "1",
  "line1": "123 Main Street",
  "line2": "Near Market",
  "cityName": "Surat",
  "stateId": 12,
  "postal_code": "395006"
}
```

### Frontend usage
- used in checkout
- used in cart estimation
- used to preselect default shipping pincode

## 11. Wishlist Flow

### Backend routes
- `POST /api/wishlist/add`
- `POST /api/wishlist/remove`
- `GET /api/wishlist/fetch/:userId`

### Wishlist payload
```json
{
  "userId": 10,
  "productId": 55
}
```

### Frontend usage
- wishlist page
- wishlist button
- Redux wishlist slice

## 12. Review Flow

### Backend routes
- `POST /api/review/add`
- `GET /api/review/product/:productId`
- `POST /api/review/delete`

### Review payload
```json
{
  "productId": 55,
  "userId": 10,
  "rating": 5,
  "reviewText": "Beautiful product"
}
```

### Frontend usage
- product detail review section
- review modal / inline review section
- fetch reviews on product page

## 13. Coupon Flow

### Backend routes
- `GET /api/coupons/new-user-coupon`
- `POST /api/coupons/apply-coupon`
- `GET /api/coupons/fetch`
- `POST /api/coupons/add`
- `POST /api/coupons/update/:id`
- `POST /api/coupons/delete/:id`

### Coupon payload to apply
```json
{
  "couponCode": "SAVE10",
  "userId": 10,
  "cartTotal": 25000
}
```

### Coupon create payload
```json
{
  "code": "SAVE10",
  "discountType": "percentage",
  "discountValue": 10,
  "minOrderAmount": 1000,
  "maxUses": 100,
  "isActive": 1,
  "targetAudience": "all",
  "expiresAt": "2026-12-31"
}
```

### Frontend usage
- checkout page loads active coupons
- user can apply coupon during checkout
- admin can manage coupons in dashboard

## 14. Checkout and Payment Flow

### Backend routes
- `POST /api/orders/checkout`
- `POST /api/orders/cancel-payment`
- `POST /api/orders/create-cod-charge-order`
- `GET /api/orders/userOrders/:userId`
- `GET /api/orders/orderItems/:orderId/:userId`
- `GET /api/orders/all`
- `GET /api/orders/export`
- `GET /api/orders/track/:awbCode`
- `GET /api/orders/delivery-estimate`
- `GET /api/orders/shipments/:userId`
- `GET /api/orders/pickup-locations`

### Checkout request payload
This is the main purchase payload:

```json
{
  "userId": 10,
  "paymentMethod": "razorpay",
  "addressId": 5,
  "isCOD": false,
  "shippingAmount": 100,
  "shippingPartner": "Standard Shipping",
  "giftingItemIds": [1, 2],
  "couponCode": "SAVE10"
}
```

### COD-specific checkout payload additions
```json
{
  "codChargeRazorpayPaymentId": "pay_123",
  "codChargeRazorpayOrderId": "order_123",
  "codChargeRazorpaySignature": "signature"
}
```

### COD charge order payload
`POST /api/orders/create-cod-charge-order`

```json
{
  "userId": 10
}
```

### Payment cancel payload
```json
{
  "orderId": 99,
  "userId": 10
}
```

### What checkout does in the backend
1. logs checkout start in audit table
2. verifies user exists and contact is verified
3. blocks B2B users unless approved
4. checks minimum B2B order value
5. loads full address snapshot
6. loads cart items and checks stock
7. calculates subtotal, GST, shipping, COD charges, gifting charge, coupon discount
8. creates Razorpay order for online payments
9. creates order row inside a DB transaction
10. for COD:
   - reserves stock
   - inserts order items
   - clears cart
   - queues invoice/email/shipment jobs
11. for online payment:
   - reserves stock only
   - leaves webhook to finalize later
12. commits the transaction and returns:

```json
{
  "orderId": 99,
  "razorpayOrderId": "order_123",
  "amount": 123456,
  "invoiceNumber": "INV-..."
}
```

### Frontend checkout flow
Frontend `checkout/page.tsx`:
- loads guest or logged-in user state from cookies
- if guest:
  - asks for phone
  - sends OTP
  - verifies OTP
  - either logs in existing user or registers new user
  - migrates guest cart to server
- if logged in:
  - loads addresses
  - loads cart estimation
  - loads coupons
  - lets user select payment method
  - supports COD charge flow
  - supports refund policy acceptance
- after successful checkout:
  - shows success modal
  - keeps order details for invoice/order confirmation

### Frontend checkout service calls
- `FetchAddresses`
- `AddAddress`
- `CheckoutOrder`
- `CreateRazorpayOrder`
- `VerifyPayment`
- `ClearCart`
- `VerifyContactCheckout`
- `VerifyEmailCheckout`
- `CancelPayment`
- `CreateCodChargeOrder`
- `ApplyCoupon`
- `SendOtp`
- `VerifyOtp`
- `RegisterUserAuth`

## 15. Order Management Flow

### Backend order list and detail flow
- `GET /api/orders/userOrders/:userId`
- `GET /api/orders/orderItems/:orderId/:userId`
- `GET /api/orders/all`
- `GET /api/orders/export`

### Order detail behavior
When fetching order details:
- shipment is checked
- shipment tracking can be refreshed
- order items are loaded
- order summary is loaded
- delivery estimate is computed using Shiprocket serviceability

### Tracking payload
`GET /api/orders/track/:awbCode`

No body. The AWB code is part of the URL.

### Delivery estimate payload
`GET /api/orders/delivery-estimate?delivery_pincode=395006&weight=0.5&cod=false`

### Frontend order pages
Frontend routes:
- `src/app/account/orders/page.tsx`
- `src/app/account/orders/[id]/page.tsx`
- admin orders page

These pages use:
- order list APIs
- order detail APIs
- invoice viewer
- shipment tracking data

## 16. Invoice and Bill Flow

### Backend routes
- `POST /api/bills/generate`
- `GET /api/bills/invoice/:invoiceNumber`
- `GET /api/bills/invoice/order/:orderId`
- `DELETE /api/bills/delete/:orderId`

### What invoice endpoints return
The invoice endpoints return base64-encoded PDF data:

```json
{
  "status": 200,
  "message": "Invoice retrieved successfully",
  "data": {
    "invoiceNumber": "INV-123",
    "pdfBase64": "...",
    "mimeType": "application/pdf"
  }
}
```

### Frontend usage
- invoice viewer component
- account order detail page
- admin order review

## 17. Bulk Upload Flow

### Backend routes
- `POST /api/bulk/bulk-upload`
- `GET /api/bulk/template`
- `GET /api/bulk/status/:fileLogId`
- `GET /api/bulk/files`
- `GET /api/bulk/download/:fileId`
- `DELETE /api/bulk/files/:fileId`

### Bulk upload payload
`multipart/form-data`

Fields:
- `excelFile`
- `createdBy`

### Bulk upload behavior
- file is stored in `uploads/excel`
- only xlsx/xls/csv are allowed
- backend processes products in background
- upload status can be polled
- uploaded files can be downloaded or deleted

### Frontend usage
- bulk upload page
- bulk management page
- upload progress components
- websocket/live progress components

## 18. Contact and Diagnostic Flow

### Backend routes
- `POST /api/contact/send`
- `GET /api/diag/smtp`

### Contact payload
```json
{
  "name": "John",
  "email": "john@example.com",
  "subject": "Query",
  "message": "Hello"
}
```

### Diagnostic usage
- SMTP connectivity check
- admin/debug support

## 19. Dashboard and Admin Flow

### Backend routes
- `GET /api/dashboard/stats`
- `GET /api/dashboard/recent-orders`
- `GET /api/dashboard/low-stock`

### Dashboard behavior
Stats include:
- total users
- customer users
- B2B users
- categories
- products
- active products
- orders
- paid orders
- pending orders
- total revenue
- active carts
- low stock count

Recent orders include:
- invoice number
- customer name
- amount
- COD status normalization

Low stock includes:
- product id
- name
- SKU
- stock quantity
- latest image

### Frontend admin pages
Frontend admin routes:
- `src/app/admin/page.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/admin/products/page.tsx`
- `src/app/admin/products/add/page.tsx`
- `src/app/admin/products/edit/[id]/page.tsx`
- `src/app/admin/categories/page.tsx`
- `src/app/admin/banners/page.tsx`
- `src/app/admin/coupons/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/products/bulk-upload/page.tsx`
- `src/app/admin/products/bulk-management/page.tsx`

Admin UI depends on:
- `src/components/AdminAuth.tsx`
- `src/layout/AppSidebar.tsx`
- `src/layout/AppHeader.tsx`
- `src/components/ui/*`

## 20. B2B Journey Flow

### Backend routes
- `POST /api/users/register-b2b`
- `POST /api/users/update-b2b-status`
- `GET /api/users/b2b-journey/:userId`
- `GET /api/users/b2b-status/:userId`
- `POST /api/users/re-apply-b2b`

### B2B behavior in checkout
- B2B user role must be approved
- rejected B2B accounts are blocked
- unapproved B2B accounts are blocked
- B2B minimum order value is enforced
- B2B shipping is weight-based and different from retail

### Frontend B2B pages
- `src/app/b2b/page.tsx`
- `src/app/b2b-registration/page.tsx`
- `src/app/account/b2b-status/page.tsx`
- `src/app/account/b2b-status/re-apply/page.tsx`

## 21. Frontend API Layer

### API constants
Main API constants live in:
- `src/Constant/Api.ts`

### HTTP wrapper
Main request wrappers:
- `src/Services/ApiMethod.ts`

### Optimized caching
- `src/Services/OptimizedApiService.jsx`

Caching is used for:
- categories
- products
- config
- reviews

The frontend invalidates cache when data changes:
- product changes clear product cache
- category changes clear category cache
- config changes clear config cache
- review changes clear review cache

### Important Axios behavior
- auth token is attached through interceptor
- on `401`, user is redirected to OTP login unless checkout guest flow is active

## 22. Frontend Page Flow

### Homepage
File:
- `src/app/page.tsx`

Flow:
- loads categories
- detects B2B user from cookie
- renders hero
- renders product grid
- renders collection cards
- redirects collection clicks to shop with category query params

### Shop page
File:
- `src/app/shop/page.tsx`

Flow:
- reads filters from URL
- loads category/subcategory hierarchy
- loads products from backend with pagination
- supports sort, price range, mobile filters, list/grid view
- supports infinite loading / load more logic

### Product detail page
File:
- `src/app/products/[id]/page.tsx`

Flow:
- fetches single product
- shows images
- loads reviews
- supports add-to-cart and wishlist
- supports related product suggestions

### Cart page
File:
- `src/app/cart/page.tsx`

Flow:
- reads cart data from Redux/hook
- calculates subtotal and discounts
- fetches cart estimation
- shows recommended products
- allows quantity updates and removal

### Checkout page
File:
- `src/app/checkout/page.tsx`

Flow:
- guest OTP first or logged-in checkout
- address selection
- coupon selection
- gift item selection
- COD charge payment support
- payment completion

### Account pages
Main routes:
- `src/app/account/page.tsx`
- `src/app/account/profile/page.tsx`
- `src/app/account/addresses/page.tsx`
- `src/app/account/orders/page.tsx`
- `src/app/account/orders/[id]/page.tsx`
- `src/app/account/wishlist/page.tsx`
- `src/app/account/settings/page.tsx`
- `src/app/account/b2b-status/page.tsx`

### Auth pages
- `src/app/auth/login/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/app/auth/otp-login/page.tsx`
- `src/app/auth/forgot-password/page.tsx`
- `src/app/auth/reset-password/page.tsx`

## 23. Redux and Hook Flow

### Redux slices
- auth: `src/redux/features/auth/authSlice.js`
- cart: `src/redux/features/cart/cartSlice.js`
- products: `src/redux/features/products/productsSlice.js`
- orders: `src/redux/features/orders/ordersSlice.js`
- wishlist: `src/redux/features/wishlist/wishlistSlice.js`
- categories: `src/redux/features/categories/categoriesSlice.js`

### Important hooks
- `src/hooks/useCart.ts`
- `src/hooks/useWishlist.ts`
- `src/hooks/useReview.js`
- `src/hooks/useProductReviews.js`
- `src/hooks/useWebSocket.ts`

### Purpose of hooks
- hide API and state complexity from pages
- provide cart/wishlist state and mutation methods
- connect to WebSocket progress updates

## 24. File and Media Handling Flow

### Product and banner media
- images are uploaded via Multer to local temp/upload folders
- then uploaded to Cloudinary
- product images and banner images are stored as Cloudinary URLs in DB

### Static serving
- local invoice PDFs and uploads are served from backend static paths

### Frontend media helpers
- `src/utils/imageUtils.ts`
- `src/utils/invoiceUtils.ts`
- `src/utils/migrateGuestCart.ts`

## 25. Database and SQL/Migration Context

The backend repo includes SQL files for:
- bulk upload indexes
- coupon tables
- banners table
- file master table
- prospect users table
- audit table
- subcategory parent relation
- B2B approval columns
- invoice/order data fixes

These SQL files support the features above and are part of the expected project flow.

## 26. Feature-by-Feature API Summary

### Users
- register, login, OTP, B2B journey, password reset

### Products
- create/update with images, fetch list, fetch single, delete

### Categories/Subcategories
- CRUD and hierarchy lookups

### Cart
- add, list, remove, clear, estimate

### Checkout
- Razorpay online flow, COD flow, coupon flow, guest flow

### Orders
- user order history, admin order list, detail view, export, tracking

### Addresses
- CRUD and state lookup

### Wishlist
- add/remove/list

### Reviews
- add/list/delete

### Banners
- admin CRUD and public active banners

### Coupons
- admin CRUD, public new-user coupon, checkout apply coupon

### Bulk Upload
- template, upload, status, file management

### Contact
- contact email form

### Dashboard
- stats, recent orders, low stock

## 27. Practical App Build Flow

If you want to rebuild the APK/app from this project, the real implementation order is:
1. auth and OTP
2. product catalog
3. category/subcategory filters
4. cart and cart estimation
5. address book
6. checkout and coupon
7. Razorpay and COD handling
8. order history and tracking
9. wishlist and reviews
10. B2B registration/status
11. admin catalog management
12. bulk upload and dashboard

That order matches how the frontend and backend are wired today.

## 28. Important Notes

- The frontend repo folder is named `JwelleryFronted` in the workspace
- Many admin endpoints require JWT plus role `3`
- B2B logic is mixed into product, cart, checkout, and user flows
- Some endpoints are public, but most mutation endpoints are protected
- Checkout has special handling for:
  - guest users
  - verified contacts
  - verified email
  - approved B2B accounts
  - COD charge payment
  - coupon validation
  - stock reservation

## 29. Most Important Files To Review Together

Backend:
- `src/app.js`
- `src/server.js`
- `src/routes/*.js`
- `src/controllers/*.js`
- `src/models/*.js`
- `src/utils/*.js`

Frontend:
- `src/Constant/Api.ts`
- `src/Services/ApiMethod.ts`
- `src/Services/GetService.jsx`
- `src/Services/PostService.jsx`
- `src/app/page.tsx`
- `src/app/shop/page.tsx`
- `src/app/products/[id]/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/admin/*`

---

If you want, I can also turn this into a second version that is more implementation-oriented, with:
- exact request/response examples per endpoint
- frontend page-to-API mapping table
- file-by-file architecture notes
- database table mapping
