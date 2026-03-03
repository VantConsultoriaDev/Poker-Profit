import { createServer } from 'vite';

async function start() {
  try {
    const server = await createServer({
      configFile: './vite.config.ts',
      server: {
        port: 5173,
        host: '0.0.0.0'
      }
    });
    await server.listen();
    server.printUrls();
    
    console.log('Keep alive started');
    // Keep alive
    setInterval(() => {
        // console.log('tick');
    }, 5000);
  } catch (e) {
    console.error('Error starting server:', e);
    process.exit(1);
  }
}

start();
