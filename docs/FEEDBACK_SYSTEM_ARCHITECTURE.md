# Feedback Management System Architecture

## Overview

The Feedback Management System is a comprehensive solution for collecting, managing, and analyzing customer feedback for completed orders. It enables order managers to gather valuable insights from customers to improve products, services, and overall customer experience.

## System Architecture

### Database Layer

The feedback system uses PostgreSQL (Neon) with Drizzle ORM for data persistence.

#### Feedbacks Table Schema

```sql
CREATE TABLE feedbacks (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,                    -- Overall rating (1-5)
  comment TEXT,                                -- Customer feedback text
  product_quality INTEGER,                     -- Product quality rating (1-5)
  delivery_experience INTEGER,                 -- Delivery experience rating (1-5)
  customer_service INTEGER,                    -- Customer service rating (1-5)
  is_public INTEGER DEFAULT 1,                 -- Public visibility (0 or 1)
  response_text TEXT,                          -- Manager's response to feedback
  responded_at TIMESTAMP,                      -- When manager responded
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Design Decisions:**
- **Cascading Delete**: Feedbacks are automatically deleted when the associated order is deleted
- **Multi-dimensional Ratings**: Separate ratings for different aspects (product, delivery, service)
- **Public/Private Flag**: Allows customers to choose feedback visibility
- **Response Mechanism**: Managers can respond to feedback with timestamping

### Backend Architecture

#### Model Layer (`backend/models/Feedback.js`)

**Key Methods:**
- `find()` - Get all feedbacks
- `findPaginated({ page, limit })` - Get paginated feedbacks
- `findById(id)` - Get specific feedback
- `findByOrderId(orderId)` - Get feedback for a specific order
- `create(data)` - Create new feedback
- `findByIdAndUpdate(id, data)` - Update existing feedback
- `getAverageRatings()` - Calculate average ratings across all dimensions
- `getFeedbacksByRating(rating)` - Filter feedbacks by overall rating

**Data Transformation:**
- Converts database integers to booleans for `isPublic`
- Formats timestamps to ISO strings
- Adds `_id` field for consistency with frontend expectations

#### Route Layer (`backend/routes/feedbacks.js`)

**API Endpoints:**

1. **GET /api/feedbacks**
   - Retrieve all feedbacks (with optional pagination)
   - Query params: `page`, `limit`
   - Returns: Array of feedbacks or paginated response

2. **GET /api/feedbacks/stats**
   - Get feedback statistics and averages
   - Returns: Average ratings and total count

3. **GET /api/feedbacks/:id**
   - Get specific feedback by ID
   - Returns: Single feedback object

4. **GET /api/feedbacks/order/:orderId**
   - Get feedback for a specific order
   - Returns: Feedback object or 404 if not found

5. **POST /api/feedbacks**
   - Create new feedback for an order
   - Validations:
     - Order must exist
     - Order must be completed
     - No existing feedback for the order
     - Rating must be 1-5
     - Optional ratings must be 1-5 or null
     - Comment max length: 1000 characters
   - Returns: Created feedback object

6. **PUT /api/feedbacks/:id**
   - Update existing feedback
   - Can update ratings, comment, visibility, or add manager response
   - Validations: Same as POST
   - Returns: Updated feedback object

**Validation Rules:**
```javascript
- MIN_RATING = 1
- MAX_RATING = 5
- MAX_COMMENT_LENGTH = 1000
- MAX_RESPONSE_LENGTH = 1000
```

#### Constants (`backend/constants/feedbackConstants.js`)

Centralized configuration for:
- Rating boundaries (1-5)
- Text length limits
- Rating labels (Very Poor, Poor, Average, Good, Excellent)

### Frontend Architecture

#### API Service Layer (`frontend/src/services/api.js`)

**Feedback API Methods:**
- `getFeedbacks()` - Fetch all feedbacks
- `getFeedbacksPaginated({ page, limit })` - Fetch paginated feedbacks
- `getFeedbackStats()` - Fetch statistics
- `getFeedback(id)` - Fetch single feedback
- `getFeedbackByOrderId(orderId)` - Fetch order-specific feedback
- `createFeedback(feedback)` - Submit new feedback
- `updateFeedback(id, feedback)` - Update feedback or add response

**Guest Mode Support:**
All API calls are intercepted in guest mode and return empty data structures.

#### Component Layer

##### 1. FeedbackPanel (`frontend/src/components/FeedbackPanel.jsx`)

**Purpose:** Main dashboard for viewing all customer feedbacks

**Features:**
- Statistics cards showing average ratings across all dimensions
- Paginated list of all feedbacks
- Visual rating displays with stars
- Priority chips (Good/Excellent = green, Average = warning, Poor/Very Poor = error)
- Manager response display
- Public/private indicators

**State Management:**
- Local state for feedbacks list
- Pagination state (page, totalPages)
- Statistics state
- Loading states

##### 2. FeedbackDialog (`frontend/src/components/FeedbackDialog.jsx`)

**Purpose:** Modal dialog for customers to submit feedback

**Features:**
- Overall rating (required) with 5-star rating component
- Three optional detailed ratings:
  - Product Quality
  - Delivery Experience
  - Customer Service
- Comment text area (1000 char limit)
- Public/private visibility checkbox
- Pre-submission validations:
  - Order must be completed
  - No existing feedback for order
  - Overall rating required

**Integration:**
- Called from OrderDetails component
- Only visible for completed orders
- Real-time character count for comments

##### 3. OrderDetails Enhancement (`frontend/src/components/OrderDetails.jsx`)

**New Feature:**
- "Give Feedback" button appears only for completed orders
- Opens FeedbackDialog when clicked
- Shows success notification on submission

#### Navigation

**New Tab Added:** Feedback tab in main navigation
- Icon: FeedbackIcon
- Route: `/feedback`
- Component: FeedbackPanel
- Position: 6th tab (after Sales Report)

## Data Flow

### Feedback Submission Flow

```
1. Customer views completed order in Order History
2. Clicks on order to open OrderDetails
3. Sees "Give Feedback" button (only for completed orders)
4. Clicks button → FeedbackDialog opens
5. System checks if feedback already exists
6. If not, customer fills form:
   - Overall rating (required)
   - Optional detailed ratings
   - Optional comment
   - Visibility preference
7. Submits → POST /api/feedbacks
8. Backend validates:
   - Order exists and is completed
   - No duplicate feedback
   - Rating values valid
9. Saves to database
10. Returns success → Shows notification
11. Dialog closes
```

### Feedback Viewing Flow

```
1. Manager navigates to Feedback tab
2. System fetches:
   - GET /api/feedbacks/stats (statistics)
   - GET /api/feedbacks?page=1&limit=10 (paginated list)
3. Displays:
   - Summary cards with average ratings
   - List of feedbacks with details
4. Manager can:
   - View all feedback details
   - See ratings and comments
   - Identify improvement areas
   - Navigate through pages
```

### Manager Response Flow (Future Enhancement)

```
1. Manager views feedback in FeedbackPanel
2. Clicks "Respond" button
3. Opens response dialog
4. Writes response
5. Submits → PUT /api/feedbacks/:id
6. Updates feedback with response_text and responded_at
7. Customer can see manager response
```

## Security Considerations

1. **Authentication Required:** All feedback endpoints require authentication (except health check)
2. **Authorization:** 
   - Customers can only create feedback for their own orders
   - Managers can view all feedbacks
   - Managers can respond to feedbacks
3. **Input Validation:**
   - All user inputs are validated and sanitized
   - Maximum length limits prevent abuse
   - Rating bounds enforced
4. **SQL Injection Prevention:** Drizzle ORM provides parameterized queries
5. **XSS Prevention:** React automatically escapes output

## Performance Optimizations

1. **Pagination:** Large datasets are paginated (default 10 items per page)
2. **Indexed Queries:** Database indexes on `order_id` and `created_at`
3. **Lazy Loading:** Feedback data loaded only when Feedback tab is accessed
4. **Caching Strategy:** Statistics can be cached on frontend for brief periods

## Analytics Capabilities

### Current Metrics

1. **Average Ratings:**
   - Overall average rating
   - Average product quality
   - Average delivery experience
   - Average customer service
   - Total feedback count

2. **Distribution Analysis:**
   - Feedbacks by rating (1-5)
   - Positive vs negative feedback ratio

### Future Enhancements

1. **Trending Analysis:**
   - Rating trends over time
   - Improvement tracking

2. **Customer Insights:**
   - Repeat customer satisfaction
   - Customer segment analysis
   - Order source correlation

3. **Product Insights:**
   - Item-specific feedback
   - Most appreciated products
   - Quality issue identification

4. **Actionable Alerts:**
   - Low rating notifications
   - Negative feedback alerts
   - Response required reminders

## Integration Points

### With Order Management System

1. **Order Status Integration:**
   - Feedback only available for completed orders
   - Status validation before submission

2. **Order History Integration:**
   - Feedback button in order details
   - Feedback indicator in order list

3. **Customer Data Integration:**
   - Links feedback to customer records
   - Enables customer satisfaction tracking

## Testing Strategy

### Backend Tests

1. **Model Tests** (`backend/__tests__/models/Feedback.test.js`):
   - CRUD operations
   - Data transformation
   - Edge cases (invalid IDs, null values)
   - Statistics calculations

2. **Constants Tests** (`backend/__tests__/constants/feedbackConstants.test.js`):
   - Validation constants
   - Rating labels

### Frontend Tests (To Be Implemented)

1. **Component Tests:**
   - FeedbackPanel rendering
   - FeedbackDialog form validation
   - User interactions

2. **Integration Tests:**
   - API call mocking
   - End-to-end feedback flow

## Deployment Considerations

1. **Database Migration:**
   - Create `feedbacks` table in production
   - Add indexes for performance

2. **Environment Variables:**
   - No new environment variables required
   - Uses existing database connection

3. **Backward Compatibility:**
   - New feature doesn't affect existing functionality
   - Graceful degradation if feedback unavailable

## Future Roadmap

1. **Phase 1: Current Implementation** ✅
   - Basic feedback submission
   - Feedback viewing dashboard
   - Statistics display

2. **Phase 2: Enhanced Features** (Planned)
   - Manager response capability
   - Email notifications for new feedback
   - Feedback moderation tools

3. **Phase 3: Advanced Analytics** (Planned)
   - Trend analysis charts
   - Sentiment analysis
   - Predictive insights
   - Export capabilities

4. **Phase 4: Customer Portal** (Planned)
   - Customer-facing feedback history
   - Public feedback showcase
   - Feedback editing capability

## Best Practices

1. **For Managers:**
   - Review feedback regularly
   - Respond to negative feedback promptly
   - Use insights for continuous improvement
   - Track trends over time

2. **For Customers:**
   - Provide honest, constructive feedback
   - Be specific in comments
   - Use detailed ratings for better insights

3. **For Developers:**
   - Follow existing code patterns
   - Add tests for new features
   - Document API changes
   - Maintain consistent error handling

## Conclusion

The Feedback Management System provides a robust, scalable solution for collecting and analyzing customer feedback. It integrates seamlessly with the existing Order Management System while maintaining separation of concerns and following best practices for security, performance, and user experience.
