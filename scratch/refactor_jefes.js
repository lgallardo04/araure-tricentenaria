const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('d:/Users/Intel Core I5/Desktop/araure tricentenaria/src/app/dashboard/jefes-calle/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Inyectar estado de errors
content = content.replace(
  `  const [form, setForm] = useState({`,
  `  const [errors, setErrors] = useState<Record<string, string>>({});\n  const [form, setForm] = useState({`
);

// 2. Clear errors when form opens
content = content.replace(
  `    setShowPassword(false);\n    setShowModal(true);`,
  `    setErrors({});\n    setShowPassword(false);\n    setShowModal(true);`
);
content = content.replace(
  `    setForm({\n      name: user.name,`,
  `    setErrors({});\n    setForm({\n      name: user.name,`
);

// 3. Capturar fieldErrors de Zod en handleSubmit
content = content.replace(
  `      const res = await apiFetch('/api/users', {\n        method,\n        body: JSON.stringify(body),\n      });\n      if (!res.ok) {\n        const err = await res.json();\n        throw new Error(err.error);\n      }`,
  `      const res = await apiFetch('/api/users', {\n        method,\n        body: JSON.stringify(body),\n      });\n      if (!res.ok) {\n        const err = await res.json();\n        if (err.details && err.details.fieldErrors) {\n          const validationErrors: Record<string, string> = {};\n          for (const [k, v] of Object.entries(err.details.fieldErrors)) {\n            validationErrors[k] = (v as string[])[0];\n          }\n          setErrors(validationErrors);\n          toast.error('Corrige los campos marcados en rojo');\n          return;\n        }\n        throw new Error(err.error || 'Error desconocido');\n      }`
);

// Helper function to replace form inputs
function modifyInput(label, fieldName, type, placeholder) {
  let isSelect = type === 'select';
  
  if (isSelect) {
    const regex = new RegExp(\`<label className="input-label">\${label}</label>[\\s\\S]*?<select value={form\.\${fieldName}}[\\s\\S]*?</select>\`);
    const match = content.match(regex);
    if (match) {
      let replacement = match[0].replace(
        \`<label className="input-label">\${label}</label>\`,
        \`<div className="flex justify-between items-end"><label className="input-label mb-1">\${label} <span className="text-red-400">*</span></label>{errors.\${fieldName} && <span className="text-red-400 text-[11px] font-semibold animate-pulse mb-1">{errors.\${fieldName}}</span>}</div>\`
      );
      replacement = replacement.replace(
        \`onChange={(e) => setForm({ ...form, \${fieldName}: e.target.value })}\`,
        \`onChange={(e) => { setForm({ ...form, \${fieldName}: e.target.value }); setErrors(prev => ({...prev, \${fieldName}: ''})); }}\`
      );
      replacement = replacement.replace(
        \`className="select-field"\`,
        \`className={\\\`select-field \\\${errors.\${fieldName} ? 'border-red-500 bg-red-900/20' : ''}\\\`}\`
      );
      content = content.replace(regex, replacement);
    }
  } else {
    // Basic Input Replacement
    let regexStr = \`<label className="input-label">\${label}\\b.*?</label>[\\s\\S]*?<input.*?value={form\.\${fieldName}}.*?>\`;
    if (fieldName === 'password') {
       regexStr = \`<label className="input-label">\${label}\\b.*?</label>[\\s\\S]*?<div className="relative">[\\s\\S]*?<input.*?value={form\.\${fieldName}}.*?>[\\s\\S]*?</div>\`;
    }
    const regex = new RegExp(regexStr);
    const match = content.match(regex);
    if (match) {
      let replacement = match[0].replace(
        new RegExp(\`<label className="input-label">\${label}\\b.*?</label>\`),
        \`<div className="flex justify-between items-end"><label className="input-label mb-1">\${label} <span className="text-red-400">*</span></label>{errors.\${fieldName} && <span className="text-red-400 text-[11px] font-semibold animate-pulse mb-1">{errors.\${fieldName}}</span>}</div>\`
      );
      replacement = replacement.replace(
        \`onChange={(e) => setForm({ ...form, \${fieldName}: e.target.value })}\`,
        \`onChange={(e) => { setForm({ ...form, \${fieldName}: e.target.value }); setErrors(prev => ({...prev, \${fieldName}: ''})); }}\`
      );
      replacement = replacement.replace(
        \`className="input-field"\`,
        \`className={\\\`input-field \\\${errors.\${fieldName} ? 'border-red-500 bg-red-900/20 shadow-inner' : ''}\\\`}\`
      );
      replacement = replacement.replace(
        \`className="input-field pr-10"\`,
        \`className={\\\`input-field pr-10 \\\${errors.\${fieldName} ? 'border-red-500 bg-red-900/20 shadow-inner' : ''}\\\`}\`
      );
      content = content.replace(regex, replacement);
    }
  }
}

modifyInput('Nombre Completo', 'name', 'input');
modifyInput('Correo Electrónico', 'email', 'input');
modifyInput('Nueva Contraseña (dejar vacío para no cambiar)', 'password', 'input');
modifyInput('Contraseña', 'password', 'input');
modifyInput('Comunidad Asignada', 'comunidadId', 'select');
modifyInput('Rol', 'role', 'select');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Jefes-Calle UI refactored successfully!');
