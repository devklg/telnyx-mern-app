require('dotenv').config();
const app = require('./app');
const { connectDatabases } = require('./config/database');

const PORT = process.env.PORT || 3550;

async function startServer() {
  try {
    await connectDatabases();
    console.log('✅ All databases connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
