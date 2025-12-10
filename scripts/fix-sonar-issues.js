#!/usr/bin/env node

/**
 * Auto-fix script para resolver issues de SonarLint
 * Aplica transformaciones modernas de JavaScript de forma automática
 */

const fs = require('fs');
const path = require('path');

// Configuración de transformaciones
const transformations = [
  // 1. parseInt -> Number.parseInt
  {
    name: 'parseInt to Number.parseInt',
    pattern: /\bparseInt\(/g,
    replacement: 'Number.parseInt(',
    test: (content) => /\bparseInt\(/.test(content) && !content.includes('Number.parseInt')
  },
  
  // 2. parseFloat -> Number.parseFloat
  {
    name: 'parseFloat to Number.parseFloat',
    pattern: /\bparseFloat\(/g,
    replacement: 'Number.parseFloat(',
    test: (content) => /\bparseFloat\(/.test(content) && !content.includes('Number.parseFloat')
  },
  
  // 3. isNaN -> Number.isNaN
  {
    name: 'isNaN to Number.isNaN',
    pattern: /\bisNaN\(/g,
    replacement: 'Number.isNaN(',
    test: (content) => /\bisNaN\(/.test(content) && !content.includes('Number.isNaN')
  },
  
  // 4. NaN -> Number.NaN (solo en contextos específicos)
  {
    name: 'NaN to Number.NaN',
    pattern: /\bNaN\b/g,
    replacement: 'Number.NaN',
    test: (content) => {
      // Solo en comparaciones o returns, no en Number.isNaN
      return /\bNaN\b/.test(content) && 
             !/Number\.isNaN/.test(content) &&
             (content.includes('=== NaN') || content.includes('!== NaN') || content.includes('return NaN'));
    }
  },
  
  // 5. require('fs') -> require('node:fs')
  {
    name: 'Add node: prefix to fs',
    pattern: /require\(['"]fs['"]\)/g,
    replacement: "require('node:fs')",
    test: (content) => /require\(['"]fs['"]\)/.test(content)
  },
  
  // 6. require('path') -> require('node:path')
  {
    name: 'Add node: prefix to path',
    pattern: /require\(['"]path['"]\)/g,
    replacement: "require('node:path')",
    test: (content) => /require\(['"]path['"]\)/.test(content)
  },
  
  // 7. require('os') -> require('node:os')
  {
    name: 'Add node: prefix to os',
    pattern: /require\(['"]os['"]\)/g,
    replacement: "require('node:os')",
    test: (content) => /require\(['"]os['"]\)/.test(content)
  },
  
  // 8. require('child_process') -> require('node:child_process')
  {
    name: 'Add node: prefix to child_process',
    pattern: /require\(['"]child_process['"]\)/g,
    replacement: "require('node:child_process')",
    test: (content) => /require\(['"]child_process['"]\)/.test(content)
  },
  
  // 9. Remover decimales .0 innecesarios (números literales)
  {
    name: 'Remove .0 from number literals',
    pattern: /\b(\d+)\.0\b/g,
    replacement: '$1',
    test: (content) => /\b\d+\.0\b/.test(content)
  },
  
  // 10. window -> globalThis (solo en renderer)
  {
    name: 'window to globalThis',
    pattern: /\bwindow\./g,
    replacement: 'globalThis.',
    test: (content, filePath) => {
      return filePath.includes('renderer') && /\bwindow\./.test(content);
    }
  }
];

// Funciones auxiliares
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, coverage
      if (!['node_modules', 'dist', 'coverage', '.git'].includes(file)) {
        getAllJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function applyTransformations(content, filePath) {
  let modified = content;
  let changes = [];
  
  transformations.forEach(transform => {
    if (transform.test(modified, filePath)) {
      const before = modified;
      modified = modified.replace(transform.pattern, transform.replacement);
      
      if (before !== modified) {
        // Contar cambios
        const matches = (before.match(transform.pattern) || []).length;
        changes.push(`  ✓ ${transform.name}: ${matches} cambio(s)`);
      }
    }
  });
  
  return { modified, changes };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { modified, changes } = applyTransformations(content, filePath);
    
    if (content !== modified) {
      fs.writeFileSync(filePath, modified, 'utf8');
      return { filePath, changes, success: true };
    }
    
    return { filePath, changes: [], success: true, skipped: true };
  } catch (error) {
    return { filePath, error: error.message, success: false };
  }
}

// Main execution
function main() {
  console.log('🔧 BlackMamba Studio - Auto-fix SonarLint Issues\n');
  console.log('Buscando archivos JavaScript...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const jsFiles = getAllJsFiles(srcDir);
  
  console.log(`📁 Encontrados ${jsFiles.length} archivos JavaScript\n`);
  console.log('Aplicando transformaciones...\n');
  
  let totalFixed = 0;
  let totalChanges = 0;
  let errors = [];
  
  jsFiles.forEach(filePath => {
    const result = processFile(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (!result.success) {
      errors.push({ path: relativePath, error: result.error });
      console.log(`❌ ${relativePath}: ${result.error}`);
    } else if (!result.skipped && result.changes.length > 0) {
      totalFixed++;
      totalChanges += result.changes.length;
      console.log(`✅ ${relativePath}`);
      result.changes.forEach(change => console.log(change));
      console.log('');
    }
  });
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`Total archivos procesados: ${jsFiles.length}`);
  console.log(`Archivos modificados: ${totalFixed}`);
  console.log(`Total de cambios aplicados: ${totalChanges}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errores encontrados: ${errors.length}`);
    errors.forEach(err => {
      console.log(`  - ${err.path}: ${err.error}`);
    });
  }
  
  console.log('\n✨ Proceso completado!\n');
  console.log('💡 Recomendaciones siguientes:');
  console.log('  1. Ejecutar: npm run lint');
  console.log('  2. Ejecutar: npm test');
  console.log('  3. Revisar manualmente cambios con: git diff');
  console.log('  4. Hacer commit si todo está correcto\n');
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { applyTransformations, getAllJsFiles };
