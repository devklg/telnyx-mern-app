#!/usr/bin/env node

/**
 * Backend Setup Verification Script
 * Checks all prerequisites before starting the server
 *
 * Run: node verify-setup.js
 */

const fs = require('fs');
const path = require('path');
const net = require('net');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset}  ${msg}`)
};

console.log('\n🔍 Backend Setup Verification\n');

// Check 1: .env file exists
console.log('1. Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  log.success('.env file exists');

  // Load and validate .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  const required = [
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'TELNYX_API_KEY'
  ];

  const missing = [];
  required.forEach(key => {
    if (!envContent.includes(`${key}=`)) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    log.error(`Missing required variables: ${missing.join(', ')}`);
  } else {
    log.success('All required environment variables present');
  }
} else {
  log.error('.env file not found - run setup first');
  process.exit(1);
}

// Check 2: node_modules
console.log('\n2. Checking dependencies...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  log.success('node_modules directory exists');

  // Check key packages
  const packages = ['express', 'mongoose', 'socket.io', 'telnyx'];
  packages.forEach(pkg => {
    const pkgPath = path.join(nodeModulesPath, pkg);
    if (fs.existsSync(pkgPath)) {
      log.success(`${pkg} installed`);
    } else {
      log.error(`${pkg} not installed - run: npm install`);
    }
  });
} else {
  log.error('node_modules not found - run: npm install');
  process.exit(1);
}

// Check 3: MongoDB connection
console.log('\n3. Checking MongoDB connection...');
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:28000';
const mongoPort = parseInt(mongoUri.split(':').pop().split('/')[0]);

const checkPort = (port, name) => {
  return new Promise((resolve) => {
    const client = new net.Socket();

    client.setTimeout(2000);

    client.on('connect', () => {
      log.success(`${name} is running on port ${port}`);
      client.destroy();
      resolve(true);
    });

    client.on('timeout', () => {
      log.error(`${name} connection timeout on port ${port}`);
      client.destroy();
      resolve(false);
    });

    client.on('error', (err) => {
      log.error(`${name} not accessible on port ${port}`);
      log.info(`Start ${name}: docker run -d -p ${port}:27017 mongo:latest`);
      resolve(false);
    });

    client.connect(port, 'localhost');
  });
};

checkPort(mongoPort, 'MongoDB').then((mongoRunning) => {

  // Check 4: Redis (optional)
  console.log('\n4. Checking Redis (optional)...');
  checkPort(6379, 'Redis').then((redisRunning) => {
    if (!redisRunning) {
      log.warn('Redis not running (optional for development)');
    }

    // Check 5: Port availability
    console.log('\n5. Checking server port availability...');
    const serverPort = 3550;

    const checkPortAvailable = (port) => {
      return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            log.error(`Port ${port} is already in use`);
            log.info(`Find process: lsof -i :${port}`);
            resolve(false);
          } else {
            resolve(false);
          }
        });

        server.once('listening', () => {
          server.close();
          log.success(`Port ${port} is available`);
          resolve(true);
        });

        server.listen(port);
      });
    };

    checkPortAvailable(serverPort).then((portAvailable) => {

      // Final summary
      console.log('\n📊 Setup Summary\n');
      console.log('Required:');
      console.log(`  ✅ .env file`);
      console.log(`  ✅ Dependencies installed`);
      console.log(`  ${mongoRunning ? '✅' : '❌'} MongoDB connection`);
      console.log(`  ${portAvailable ? '✅' : '❌'} Server port available`);

      console.log('\nOptional:');
      console.log(`  ${redisRunning ? '✅' : '⚠️ '} Redis connection`);

      if (mongoRunning && portAvailable) {
        console.log(`\n${colors.green}🚀 Ready to start!${colors.reset}`);
        console.log(`\nRun: ${colors.blue}npm run dev${colors.reset}\n`);
      } else {
        console.log(`\n${colors.red}⚠️  Fix issues above before starting${colors.reset}\n`);
        process.exit(1);
      }
    });
  });
});
