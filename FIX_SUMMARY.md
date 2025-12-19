# Fix Summary: JSON Parsing Error When Creating Item Designs

## Issue Description
Users encountered the error "No number after minus sign in JSON at position 1 (line 1 column 2)" when attempting to create items with design variants in the Next.js application.

## Root Cause
The issue was caused by a mismatch between the client and server's expectation of request data format:

1. **Client Side** (`lib/api/client.ts`):
   - When creating an item WITH an image, sends data as `FormData` (multipart/form-data)
   - When creating an item WITHOUT an image, sends data as JSON

2. **Server Side** (`app/api/items/route.ts`):
   - Only expected JSON requests
   - Called `await request.json()` for all requests

3. **The Error**:
   - FormData body starts with a boundary like `--WebKitFormBoundary...`
   - When `JSON.parse()` encounters `--`, it expects a number after the minus sign
   - This causes the specific error: "No number after minus sign in JSON at position 1"

## Solution Implemented

### 1. Modified Server Route (`/api/items`)
Added Content-Type detection to handle both formats:

```typescript
const contentType = request.headers.get('content-type') || '';

if (contentType.includes('multipart/form-data')) {
  // Parse FormData
  const formData = await request.formData();
  name = (formData.get('name') as string | null) ?? '';
  // ... other fields
} else {
  // Parse JSON
  const body = await request.json();
  ({ name, price, color, fabric, specialFeatures, image } = body);
}
```

**Key Design Decisions**:
- Use `??` (nullish coalescing) for required fields to preserve empty strings for validation
- Use `||` (logical OR) for optional fields to convert empty/null to undefined
- Let validation logic catch invalid required fields with user-friendly error messages

### 2. Improved Error Handling (`CreateItem.tsx`)
Enhanced design upload error handling:

```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ 
    message: `Upload failed with HTTP ${response.status}: ${response.statusText}` 
  }))
  throw new Error(`Failed to upload design "${design.name}": ${errorData.message}`)
}
```

**Benefits**:
- Checks response status after each design upload
- Provides clear error messages with design name and HTTP status
- Gracefully handles cases where error response isn't valid JSON

## Files Changed
1. `next/app/api/items/route.ts` - Added FormData/JSON detection and parsing
2. `next/components/items/CreateItem.tsx` - Added error handling for design uploads
3. `next/verify-fix.js` - Verification script demonstrating the fix
4. `next/test-fix.md` - Documentation of the issue and solution
5. `next/code-review-response.md` - Response to code review feedback

## Testing
- ✅ Next.js build successful (26 pages generated)
- ✅ Backend tests pass (452 tests, all passing)
- ✅ Verification script confirms fix works
- ✅ No new lint errors introduced
- ✅ Type safety improved throughout
- ✅ All code review feedback addressed

## Impact
- **Before**: Creating items with images would fail with cryptic JSON parsing error
- **After**: Items can be created successfully with both FormData (images) and JSON (no images)
- **Backward Compatibility**: Fully maintained - both formats are supported
- **User Experience**: Better error messages for design upload failures

## Future Considerations
This fix highlights that the client-side API abstraction could be simplified:
- Consider always using JSON with base64 images (already supported)
- Or always using FormData for consistency
- Current solution supports both for maximum flexibility

## Verification Steps for Manual Testing
1. Navigate to Create Item page in Next.js app
2. Fill in item details (name, price, color, fabric, special features)
3. Upload a main image (triggers FormData path)
4. Add one or more design variants
5. Submit the form
6. Verify item is created successfully with all designs uploaded

## Related Documentation
- Next.js Request API: https://nextjs.org/docs/app/api-reference/functions/next-request
- FormData API: https://developer.mozilla.org/en-US/docs/Web/API/FormData
- Item Design Variants Guide: `next/ITEM_DESIGN_VARIANTS_GUIDE.md`
