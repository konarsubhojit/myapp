# Fix Verification for JSON Parsing Error

## Problem
Error: "No number after minus sign in JSON at position 1 (line 1 column 2)"
This occurred when creating items with design variants in the Next.js app.

## Root Cause
The client code in `lib/api/client.ts` sends FormData when an image is present:
```typescript
if (data.image) {
  const formData = new FormData();
  // ... populate FormData
  const response = await fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: formData,  // Sends multipart/form-data
  });
}
```

However, the server route in `app/api/items/route.ts` was only expecting JSON:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();  // Tries to parse FormData as JSON!
    // ...
  }
}
```

When Next.js tries to parse FormData (which starts with a boundary like `--WebKitFormBoundary...`) as JSON, it encounters the `--` prefix and expects a number after the minus sign, causing the JSON parsing error.

## Solution
Modified `app/api/items/route.ts` to detect Content-Type and handle both formats:

```typescript
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let name, price, color, fabric, specialFeatures, image;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData();
      name = formData.get('name') as string;
      price = formData.get('price') as string;
      // ... etc
    } else {
      // Handle JSON
      const body = await request.json();
      ({ name, price, color, fabric, specialFeatures, image } = body);
    }
    // ... rest of the logic
  }
}
```

## Additional Improvements
1. Added error handling for design uploads in `components/items/CreateItem.tsx`:
   - Now checks response status after each design upload
   - Throws descriptive errors if uploads fail
   - Better user experience with clear error messages

## Testing Steps
1. Navigate to Create Item page
2. Fill in item details (name, price, color, fabric)
3. Upload a main image (triggers FormData path)
4. Add design variants using the MultipleDesignUpload component
5. Submit the form
6. Verify:
   - Item is created successfully
   - All design variants are uploaded
   - No JSON parsing errors occur

## Expected Behavior
- Items with images can now be created successfully
- Design variants upload correctly
- Error messages are clear and helpful
- Both JSON and FormData submissions are supported
