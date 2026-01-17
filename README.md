# Laravel Shared Hosting Builder

A CLI tool to prepare Laravel projects for deployment on shared hosting platforms like Hostinger, cPanel, and other PHP-based hosting services.

## Features

- Automatically packages Laravel projects for shared hosting
- Copies public files to `dist/` directory
- Generates optimized `index.php` that loads Laravel from a subdirectory
- Copies all necessary Laravel core files
- Cleans storage folders (logs, sessions, cache) while preserving `.gitignore`
- Supports maintenance mode
- Cross-platform support (Linux, macOS, Windows)

## Installation

### Global Installation

```bash
npm install -g laravel-shared-hosting-builder
```

### Local Installation

```bash
npm install laravel-shared-hosting-builder
```

### Using npx (No Installation Required)

```bash
npx laravel-shb build
```

## Usage

### Basic Usage

Navigate to your Laravel project root directory and run:

```bash
npx laravel-shb build
```

Or if installed globally:

```bash
laravel-shb build
```

### Options

```bash
npx laravel-shb build [options]
```

**Options:**

- `-c, --clean` - Clean the `dist/` folder before building
- `-h, --help` - Display help information
- `-V, --version` - Display version number

### Example with Clean Build

```bash
npx laravel-shb build --clean
```

## What Gets Built

The tool creates a `dist/` folder in your Laravel project root with the following structure:

```
dist/
├── .htaccess                 (copied from public/.htaccess if exists)
├── index.php                 (new entry point for shared hosting)
├── [all public files]        (copied from public/)
└── laravel/
    ├── app/
    ├── bootstrap/
    ├── config/
    ├── database/
    ├── resources/
    ├── routes/
    ├── storage/              (cleaned: logs, cache, sessions)
    ├── vendor/
    ├── artisan
    ├── composer.json
    ├── composer.lock
    └── .env.example          (from .env.production_example if available)
```

## Deployment to Shared Hosting

### For Hostinger / cPanel

1. Run the build command in your local Laravel project:
   ```bash
   npx laravel-shb build
   ```

2. Upload the contents of the `dist/` folder to your hosting's `public_html` directory using:
   - FTP client (FileZilla, etc.)
   - File Manager in cPanel
   - Git deployment (if available)

3. Configure your `.env` file:
   - Copy `.env.example` to `.env` in the `laravel/` directory
   - Update database credentials
   - Set `APP_URL` to your domain
   - Update any other environment variables

4. Generate application key:
   ```bash
   php laravel/artisan key:generate
   ```

5. Run database migrations:
   ```bash
   php laravel/artisan migrate
   ```

6. Set proper permissions:
   - Make `laravel/storage` and its subdirectories writable (755)
   - Make `laravel/bootstrap/cache` writable (755)

### Directory Structure After Upload

```
public_html/
├── .htaccess
├── index.php
├── [public assets: css, js, images]
└── laravel/
    ├── app/
    ├── bootstrap/
    ├── config/
    ├── database/
    ├── resources/
    ├── routes/
    ├── storage/
    ├── vendor/
    ├── artisan
    ├── composer.json
    ├── composer.lock
    ├── .env
    └── .env.example
```

## Requirements

- Node.js 14.0.0 or higher
- Laravel project (tested with Laravel 8.x, 9.x, 10.x, 11.x)

## How It Works

1. **Public Files**: Copies all files from `public/` to `dist/` (except original `index.php`)
2. **HTAccess**: Copies `.htaccess` from `public/.htaccess` if it exists
3. **Entry Point**: Creates a new `dist/index.php` that:
   - Loads Laravel from the `dist/laravel` subdirectory
   - Sets the public path to `dist/`
   - Supports Laravel's maintenance mode
4. **Laravel Core**: Copies core Laravel folders into `dist/laravel/`
5. **Composer Files**: Copies `artisan`, `composer.json`, and `composer.lock`
6. **Storage Cleanup**: Cleans storage folders (logs, sessions, cache, uploaded files) while preserving `.gitignore`
7. **Environment**: Optionally copies `.env.production_example` to `.env.example`

## Troubleshooting

### "public folder not found" Error

Ensure you're running the command from the Laravel project root directory (where `public/`, `app/`, etc. are located).

### Permission Issues

After uploading, make sure these directories are writable:
- `laravel/storage/` and all subdirectories
- `laravel/bootstrap/cache/`

Typically, permissions should be set to 755 for directories and 644 for files.

### Maintenance Mode

To enable maintenance mode on shared hosting:
```bash
php laravel/artisan down
```

To disable maintenance mode:
```bash
php laravel/artisan up
```

## Development
BY MD. SHAZAN MAHMUD ARPON

### Building the Package Locally

```bash
npm link
```

This allows you to test the package locally before publishing.

### Running Tests

```bash
npm test
```

## Publishing to NPM

1. Update version in `package.json`:
   ```bash
   npm version patch  # or minor, or major
   ```

2. Login to npm (if not already logged in):
   ```bash
   npm login
   ```

3. Publish the package:
   ```bash
   npm publish
   ```

4. Verify publication:
   ```bash
   npm view laravel-shared-hosting-builder
   ```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.
