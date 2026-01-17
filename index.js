const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

async function runDependencyInstallation(projectRoot) {
  console.log('\n📦 Installing dependencies...');

  try {
    // Check if composer.json exists
    const composerJsonPath = path.join(projectRoot, 'composer.json');
    if (await fs.pathExists(composerJsonPath)) {
      console.log('▶ Running: composer install');
      execSync('composer install', {
        cwd: projectRoot,
        stdio: 'inherit'
      });
      console.log('✓ Composer dependencies installed\n');
    } else {
      console.log('⚠ composer.json not found, skipping composer install\n');
    }

    // Check if package.json exists
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      console.log('▶ Running: npm install');
      execSync('npm install', {
        cwd: projectRoot,
        stdio: 'inherit'
      });
      console.log('✓ NPM dependencies installed\n');

      // Check if build script exists in package.json
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.scripts && packageJson.scripts.build) {
        console.log('▶ Running: npm run build');
        execSync('npm run build', {
          cwd: projectRoot,
          stdio: 'inherit'
        });
        console.log('✓ NPM build completed\n');
      } else {
        console.log('⚠ No build script found in package.json, skipping npm run build\n');
      }
    } else {
      console.log('⚠ package.json not found, skipping npm install\n');
    }
  } catch (error) {
    throw new Error(`Dependency installation failed: ${error.message}`);
  }
}

async function runArtisanOptimizeClear(projectRoot) {
  console.log('🧹 Clearing Laravel caches...');

  const artisanPath = path.join(projectRoot, 'artisan');
  if (!(await fs.pathExists(artisanPath))) {
    console.log('⚠ artisan file not found, skipping php artisan optimize:clear\n');
    return;
  }

  try {
    execSync('php artisan optimize:clear', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✓ Laravel caches cleared\n');
  } catch (error) {
    throw new Error(`php artisan optimize:clear failed: ${error.message}`);
  }
}

async function build(options = {}) {
  const { clean = false } = options;
  const projectRoot = process.cwd();
  const distPath = path.join(projectRoot, 'dist');
  const laravelDistPath = path.join(distPath, 'laravel');
  const zipPath = path.join(projectRoot, 'drac_upload.zip');

  console.log('🚀 Starting Laravel shared hosting build...');
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`📦 Dist folder: ${distPath}`);

  try {
    // Install dependencies
    await runDependencyInstallation(projectRoot);

    // Clear Laravel caches
    await runArtisanOptimizeClear(projectRoot);

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

    await createZip(distPath, zipPath);

    console.log('✅ Build completed successfully!');
    console.log(`📦 Ready to deploy to shared hosting from: ${distPath}`);
    console.log(`🗜  Zip archive created at: ${zipPath}`);
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

use Illuminate\\Foundation\\Application;
use Illuminate\\Http\\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__ . '/laravel/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__ . '/laravel/vendor/autoload.php';

$app = require_once __DIR__ . '/laravel/bootstrap/app.php';

$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
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

  async function cleanFolder(folderPath, folderName) {
    if (await fs.pathExists(folderPath)) {
      const files = await fs.readdir(folderPath);
      await Promise.all(
        files
          .filter(file => file !== '.gitignore')
          .map(async (file) => {
            const itemPath = path.join(folderPath, file);
            try {
              await fs.remove(itemPath);
            } catch (error) {
              console.warn(`  ⚠ Failed to remove ${file}: ${error.message}`);
            }
          })
      );
      console.log(`  ✓ Cleaned ${folderName}`);
    }
  }

  for (const folder of foldersToClean) {
    await cleanFolder(path.join(storagePath, folder), folder);
  }

  await cleanFolder(path.join(storagePath, 'framework'), 'framework');
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

async function createZip(distPath, zipPath) {
  console.log('🗜  Creating deployment zip...');

  if (!(await fs.pathExists(distPath))) {
    throw new Error('dist folder not found, nothing to zip');
  }

  await fs.remove(zipPath);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(distPath + path.sep, false);
    archive.finalize();
  });

  console.log('  ✓ Deployment zip created');
}

module.exports = { build };
