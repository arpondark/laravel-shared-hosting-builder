const fs = require('fs-extra');
const path = require('path');

async function build(options = {}) {
  const { clean = false } = options;
  const projectRoot = process.cwd();
  const distPath = path.join(projectRoot, 'dist');
  const laravelDistPath = path.join(distPath, 'laravel');

  console.log('🚀 Starting Laravel shared hosting build...');
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`📦 Dist folder: ${distPath}`);

  try {
    if (clean) {
      console.log('🧹 Cleaning dist folder...');
      await fs.remove(distPath);
    }

    await fs.ensureDir(distPath);
    await fs.ensureDir(laravelDistPath);

    await copyPublicFiles(projectRoot, distPath);
    await copyHtaccess(projectRoot, distPath);
    await createDistIndexPhp(distPath);
    await copyLaravelCoreFolders(projectRoot, laravelDistPath);
    await copyComposerFiles(projectRoot, laravelDistPath);
    await cleanStorageFolders(laravelDistPath);
    await copyEnvExample(projectRoot, laravelDistPath);

    console.log('✅ Build completed successfully!');
    console.log(`📦 Ready to deploy to shared hosting from: ${distPath}`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

async function copyPublicFiles(projectRoot, distPath) {
  console.log('📄 Copying public files...');
  const publicPath = path.join(projectRoot, 'public');

  if (!(await fs.pathExists(publicPath))) {
    throw new Error('public folder not found. Are you in a Laravel project root?');
  }

  await fs.copy(publicPath, distPath, {
    filter: (src) => {
      const basename = path.basename(src);
      return basename !== 'index.php';
    }
  });
}

async function copyHtaccess(projectRoot, distPath) {
  console.log('🔐 Copying .htaccess...');
  const sourceHtaccess = path.join(projectRoot, 'public', '.htaccess');
  const destHtaccess = path.join(distPath, '.htaccess');

  if (await fs.pathExists(sourceHtaccess)) {
    await fs.copy(sourceHtaccess, destHtaccess);
    console.log('✓ .htaccess copied');
  } else {
    console.log('⚠ .htaccess not found in public folder');
  }
}

async function createDistIndexPhp(distPath) {
  console.log('📝 Creating dist/index.php...');
  const indexPath = path.join(distPath, 'index.php');
  const templatePath = path.join(__dirname, 'templates', 'index.php');

  let template;
  if (await fs.pathExists(templatePath)) {
    template = await fs.readFile(templatePath, 'utf8');
  } else {
    template = getDefaultIndexPhpTemplate();
  }

  await fs.writeFile(indexPath, template, 'utf8');
  console.log('✓ index.php created');
}

function getDefaultIndexPhpTemplate() {
  return `<?php

define('LARAVEL_START', microtime(true));

if (file_exists(__DIR__ . '/laravel/storage/framework/maintenance.php')) {
    require __DIR__ . '/laravel/storage/framework/maintenance.php';
}

require __DIR__ . '/laravel/vendor/autoload.php';

$app = require_once __DIR__ . '/laravel/bootstrap/app.php';

$app->bind('request', function () {
    return Illuminate\\Http\\Request::capture();
});

$kernel = $app->make(Illuminate\\Contracts\\Http\\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\\Http\\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
`;
}

async function copyLaravelCoreFolders(projectRoot, laravelDistPath) {
  console.log('📂 Copying Laravel core folders...');
  const folders = [
    'app',
    'bootstrap',
    'config',
    'database',
    'resources',
    'routes',
    'storage',
    'vendor'
  ];

  for (const folder of folders) {
    const sourcePath = path.join(projectRoot, folder);
    const destPath = path.join(laravelDistPath, folder);

    if (await fs.pathExists(sourcePath)) {
      console.log(`  - Copying ${folder}...`);
      await fs.copy(sourcePath, destPath);
    } else {
      console.log(`  ⚠ ${folder} folder not found, skipping...`);
    }
  }
}

async function copyComposerFiles(projectRoot, laravelDistPath) {
  console.log('📦 Copying composer files...');
  
  const files = ['artisan', 'composer.json', 'composer.lock'];
  
  for (const file of files) {
    const sourcePath = path.join(projectRoot, file);
    const destPath = path.join(laravelDistPath, file);

    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, destPath);
      console.log(`  ✓ ${file} copied`);
    } else {
      console.log(`  ⚠ ${file} not found, skipping...`);
    }
  }
}

async function cleanStorageFolders(laravelDistPath) {
  console.log('🧹 Cleaning storage folders...');
  const storagePath = path.join(laravelDistPath, 'storage');

  if (!(await fs.pathExists(storagePath))) {
    console.log('  ⚠ storage folder not found, skipping...');
    return;
  }

  const foldersToClean = [
    'logs',
    'framework/cache',
    'framework/sessions',
    'framework/views'
  ];

  for (const folder of foldersToClean) {
    const folderPath = path.join(storagePath, folder);

    if (await fs.pathExists(folderPath)) {
      const files = await fs.readdir(folderPath);
      
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile() && file !== '.gitignore') {
          await fs.unlink(filePath);
        }
      }
      console.log(`  ✓ Cleaned ${folder}`);
    }
  }

  const frameworkPath = path.join(storagePath, 'framework');
  if (await fs.pathExists(frameworkPath)) {
    const files = await fs.readdir(frameworkPath);
    
    for (const file of files) {
      const filePath = path.join(frameworkPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile() && file !== '.gitignore') {
        await fs.unlink(filePath);
      }
    }
  }
}

async function copyEnvExample(projectRoot, laravelDistPath) {
  console.log('📄 Copying .env.example...');
  
  const envSources = [
    path.join(projectRoot, '.env.production_example'),
    path.join(projectRoot, '.env.example')
  ];

  for (const sourcePath of envSources) {
    if (await fs.pathExists(sourcePath)) {
      const destPath = path.join(laravelDistPath, '.env.example');
      await fs.copy(sourcePath, destPath);
      console.log(`  ✓ ${path.basename(sourcePath)} copied as .env.example`);
      return;
    }
  }

  console.log('  ⚠ No .env.example or .env.production_example found, skipping...');
}

module.exports = { build };
