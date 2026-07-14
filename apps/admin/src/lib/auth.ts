import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@school-erp/db';
import { verifyPassword } from '@school-erp/utils';

declare global {
  var loginAttemptsTracker: Record<string, {
    attempts: number;
    lockedUntil?: Date;
    lastFailedLogin?: Date;
  }> | undefined;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const email = credentials.email.toLowerCase();

        // Load settings from database
        const settings = await prisma.schoolSettings.findFirst();
        const maxAttempts = settings?.maxLoginAttempts ?? 5;
        const lockDuration = settings?.lockDurationMinutes ?? 15;

        // Check if locked
        const tracker = globalThis.loginAttemptsTracker?.[email];
        if (tracker && tracker.lockedUntil && tracker.lockedUntil > new Date()) {
          const diffMs = tracker.lockedUntil.getTime() - Date.now();
          const mins = Math.ceil(diffMs / 1000 / 60);
          throw new Error(`Account locked. Please try again in ${mins} minutes.`);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.status === 'INACTIVE') {
          throw new Error('No active account found with this email');
        }

        const isValid = verifyPassword(credentials.password, user.passwordHash);

        if (!isValid) {
          // Increment tracker
          if (!globalThis.loginAttemptsTracker) {
            globalThis.loginAttemptsTracker = {};
          }
          const curr = globalThis.loginAttemptsTracker[email] || { attempts: 0 };
          curr.attempts += 1;
          curr.lastFailedLogin = new Date();

          if (curr.attempts >= maxAttempts) {
            curr.lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
            globalThis.loginAttemptsTracker[email] = curr;
            throw new Error(`Account locked due to too many failed attempts. Try again in ${lockDuration} minutes.`);
          }

          globalThis.loginAttemptsTracker[email] = curr;
          const remaining = maxAttempts - curr.attempts;
          throw new Error(`Incorrect password. Attempts remaining: ${remaining}`);
        }

        // Login success - Reset tracker
        if (globalThis.loginAttemptsTracker?.[email]) {
          delete globalThis.loginAttemptsTracker[email];
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 4 * 60 * 60, // 4 hours session timeout
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only',
};
