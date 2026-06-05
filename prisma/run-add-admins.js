require('ts-node').register({
  compilerOptions: {
    module: 'CommonJS',
  },
});
require('./add-admins.ts');
