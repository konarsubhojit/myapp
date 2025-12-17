import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Runtime validation of environment variables
// This only runs when the auth endpoints are actually called
if (process.env.NODE_ENV !== 'test') {
  const requiredEnvVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('📝 Please copy .env.example to .env and configure the values');
    console.error('💡 See QUICKSTART.md for detailed setup instructions');
    
    if (missingVars.includes('NEXTAUTH_URL')) {
      console.error('⚠️  NEXTAUTH_URL must be set to prevent redirect_uri mismatch errors');
      console.error('   Example: NEXTAUTH_URL=http://localhost:3000');
    }
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

