import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const startServer = () => {
  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  // --------------- Graceful shutdown ---------------

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);

    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log('Prisma disconnected');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forced shutdown — graceful timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// --------------- Unhandled rejection / uncaught exception ---------------

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  // In production let process manager (Render) restart
  if (env.NODE_ENV === 'production') process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
