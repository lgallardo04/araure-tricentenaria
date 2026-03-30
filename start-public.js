const { spawn } = require('child_process');
const fs = require('fs');

const envPath = '.env';
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

console.log("======================================================");
console.log("🚀 Iniciando Túnel Público Automático con Localtunnel...");
console.log("======================================================");

// Ejecutar localtunnel
const lt = spawn('npx', ['-y', 'localtunnel', '--port', '3000', '--local-host', '127.0.0.1'], { shell: true });

let nextStartProcess = null;

lt.stdout.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes('your url is:')) {
    const url = output.split('your url is:')[1].trim();
    
    // Actualizar .env con la nueva URL pública
    const urlRegex = /NEXTAUTH_URL=.*/g;
    if (envContent.match(urlRegex)) {
      envContent = envContent.replace(urlRegex, `NEXTAUTH_URL="${url}"`);
    } else {
      envContent += `\nNEXTAUTH_URL="${url}"`;
    }
    fs.writeFileSync(envPath, envContent);
    
    console.log("\n✅ Túnel establecido con éxito.");
    console.log("======================================================");
    console.log("🌐 URL PÚBLICA PARA ACCEDER DESDE CUALQUIER LUGAR:");
    console.log("👉 " + url);
    console.log("======================================================");
    console.log("⚠️ NOTA: Al entrar por primera vez, haz clic en 'Click to Continue'.\n");
    console.log("Iniciando aplicación Next.js...\n");
    
    // Iniciar Next.js
    nextStartProcess = spawn('npm', ['run', 'start'], {
      stdio: 'inherit',
      shell: true
    });
  }
});

lt.stderr.on('data', (data) => {
  console.error(`Error del túnel: ${data.toString()}`);
});

process.on('SIGINT', () => {
    lt.kill();
    if (nextStartProcess) {
       nextStartProcess.kill();
    }
    process.exit();
});
