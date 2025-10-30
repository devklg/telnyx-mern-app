// BMAD V4 - Database Initialization Master Script
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 BMAD V4 - Initializing all databases...\n');

const scripts = [
  { name: 'MongoDB', file: 'seed-mongodb.js' },
  { name: 'Neo4j', file: 'seed-neo4j.js' }
];

async function runScript(scriptName, scriptFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Running ${scriptName} seed script...`);
    
    const child = spawn('node', [path.join(__dirname, scriptFile)], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} seed failed with code ${code}`));
      }
    });
  });
}

async function initAll() {
  try {
    for (const script of scripts) {
      await runScript(script.name, script.file);
    }
    
    console.log('\n✅ All databases initialized successfully!');
    console.log('\n🎯 Next: Start the backend with: npm run dev');
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initAll();
