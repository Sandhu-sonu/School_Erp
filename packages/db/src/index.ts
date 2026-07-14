import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  transactionClient: any;
};

const basePrisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export const prisma = new Proxy(basePrisma, {
  get(target, prop, receiver) {
    if (globalForPrisma.transactionClient) {
      if (prop === '$transaction') {
        // Return a mock $transaction function that executes the callback immediately
        return async (callback: any) => {
          if (typeof callback === 'function') {
            return await callback(globalForPrisma.transactionClient);
          }
          // If it is an array of promises (batch transaction), resolve them using the transaction client
          return await Promise.all(callback);
        };
      }
      return Reflect.get(globalForPrisma.transactionClient, prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  }
}) as unknown as PrismaClient;

export function setTransactionClient(client: any) {
  globalForPrisma.transactionClient = client;
}

export function clearTransactionClient() {
  globalForPrisma.transactionClient = undefined;
}

export * from '@prisma/client';
