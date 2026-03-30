// Helper script to run seed with CommonJS module setting
require('ts-node').register({
  compilerOptions: {
    module: 'CommonJS',
  },
});
require('./seed.ts');
