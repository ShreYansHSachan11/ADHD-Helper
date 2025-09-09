/**
 * Build Script for Focus Productivity Extension
 * Creates production-ready distribution package
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExtensionBuilder {
  constructor() {
    this.sourceDir = __dirname;
    this.distDir = path.join(this.sourceDir, 'dist');
    this.packageName = 'focus-productivity-extension';
  }

  /**
   * Main build process
   */
  async build() {
    console.log('🚀 Starting extension build process...');
    
    try {
      // Clean previous build
      this.cleanDist();
      
      // Create dist directory
      this.createDistDirectory();
      
      // Copy and process files
      await this.copyFiles();
      
      // Optimize assets
      await this.optimizeAssets();
      
      // Validate build
      this.validateBuild();
      
      // Create package
      await this.createPackage();
      
      console.log('✅ Build completed successfully!');
      console.log(`📦 Package created: ${this.packageName}.zip`);
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Clean previous build
   */
  cleanDist() {
    console.log('🧹 Cleaning previous build...');
    
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }
    
    // Remove old package
    const packagePath = path.join(this.sourceDir, `${this.packageName}.zip`);
    if (fs.existsSync(packagePath)) {
      fs.unlinkSync(packagePath);
    }
  }

  /**
   * Create distribution directory structure
   */
  createDistDirectory() {
    console.log('📁 Creating distribution directory...');
    
    const directories = [
      'popup',
      'popup/components',
      'services',
      'external-pages',
      'utils',
      'assets',
      'assets/icons',
      'assets/sounds'
    ];

    fs.mkdirSync(this.distDir, { recursive: true });
    
    directories.forEach(dir => {
      fs.mkdirSync(path.join(this.distDir, dir), { recursive: true });
    });
  }

  /**
   * Copy and process files
   */
  async copyFiles() {
    console.log('📋 Copying and processing files...');

    // Files to copy directly
    const directCopyFiles = [
      'manifest.json',
      'background.js',
      'popup/popup.html',
      'popup/popup.css',
      'popup/popup.js',
      'popup/components/task-manager.js',
      'popup/components/breathing-exercise.js',
      'services/audio-manager.js',
      'services/calendar-service.js',
      'services/gemini-service.js',
      'services/storage-manager.js',
      'services/tab-tracker.js',
      'external-pages/focus-anxiety.html',
      'external-pages/focus-anxiety.js',
      'external-pages/focus-anxiety.css',
      'external-pages/asmr-fidget.html',
      'external-pages/asmr-fidget.js',
      'external-pages/asmr-fidget.css',
      'utils/constants.js',
      'utils/helpers.js',
      'utils/error-handler.js',
      'utils/accessibility.js',
      'utils/error-feedback.css',
      'utils/loading-styles.css'
    ];

    // Copy files
    for (const file of directCopyFiles) {
      const sourcePath = path.join(this.sourceDir, file);
      const destPath = path.join(this.distDir, file);
      
      if (fs.existsSync(sourcePath)) {
        const content = fs.readFileSync(sourcePath, 'utf8');
        const processedContent = this.processFile(content, file);
        fs.writeFileSync(destPath, processedContent);
      } else {
        console.warn(`⚠️  File not found: ${file}`);
      }
    }

    // Copy assets
    await this.copyAssets();
  }

  /**
   * Process file content for production
   */
  processFile(content, filename) {
    // Remove development comments and console.logs for JS files
    if (filename.endsWith('.js')) {
      // Remove console.log statements (but keep console.error and console.warn)
      content = content.replace(/console\.log\([^)]*\);?\s*/g, '');
      
      // Remove development comments
      content = content.replace(/\/\*\s*DEV:.*?\*\//gs, '');
      content = content.replace(/\/\/\s*DEV:.*$/gm, '');
      
      // Minify whitespace (basic)
      content = content.replace(/\n\s*\n/g, '\n');
    }

    // Process CSS files
    if (filename.endsWith('.css')) {
      // Remove comments
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Minify whitespace
      content = content.replace(/\s+/g, ' ').trim();
    }

    // Process HTML files
    if (filename.endsWith('.html')) {
      // Remove comments
      content = content.replace(/<!--[\s\S]*?-->/g, '');
      
      // Minify whitespace
      content = content.replace(/>\s+</g, '><');
    }

    return content;
  }

  /**
   * Copy asset files
   */
  async copyAssets() {
    console.log('🎨 Copying assets...');

    // Copy icons
    const iconsDir = path.join(this.sourceDir, 'assets/icons');
    if (fs.existsSync(iconsDir)) {
      const iconFiles = fs.readdirSync(iconsDir);
      iconFiles.forEach(file => {
        const sourcePath = path.join(iconsDir, file);
        const stats = fs.statSync(sourcePath);
        
        // Only copy files, not directories
        if (stats.isFile()) {
          const destPath = path.join(this.distDir, 'assets/icons', file);
          fs.copyFileSync(sourcePath, destPath);
        }
      });
    } else {
      // Create placeholder icons
      this.createPlaceholderIcons();
    }

    // Copy sounds
    const soundsDir = path.join(this.sourceDir, 'assets/sounds');
    if (fs.existsSync(soundsDir)) {
      const soundFiles = fs.readdirSync(soundsDir);
      soundFiles.forEach(file => {
        const sourcePath = path.join(soundsDir, file);
        const stats = fs.statSync(sourcePath);
        
        // Only copy files, not directories
        if (stats.isFile()) {
          const destPath = path.join(this.distDir, 'assets/sounds', file);
          fs.copyFileSync(sourcePath, destPath);
        }
      });
    } else {
      console.warn('⚠️  No sound files found, creating placeholder');
      this.createPlaceholderSounds();
    }
  }

  /**
   * Create placeholder icons
   */
  createPlaceholderIcons() {
    console.log('🖼️  Creating placeholder icons...');
    
    const iconSizes = [16, 48, 128];
    const iconDir = path.join(this.distDir, 'assets/icons');
    
    iconSizes.forEach(size => {
      // Create a simple SVG icon and convert to ICO format
      const svgContent = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="#3498db"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${size/3}">F</text>
        </svg>
      `;
      
      fs.writeFileSync(path.join(iconDir, `${size}.svg`), svgContent.trim());
    });
  }

  /**
   * Create placeholder sound files
   */
  createPlaceholderSounds() {
    console.log('🔊 Creating placeholder sound files...');
    
    const soundsDir = path.join(this.distDir, 'assets/sounds');
    
    // Create empty audio files (will be replaced with actual audio)
    const soundFiles = [
      'rain-white-noise.mp3',
      'ocean-waves.mp3',
      'forest-sounds.mp3',
      'notification.mp3'
    ];
    
    soundFiles.forEach(file => {
      // Create minimal MP3 header (placeholder)
      const placeholder = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, // MP3 header
        0x00, 0x00, 0x00, 0x00  // Minimal data
      ]);
      
      fs.writeFileSync(path.join(soundsDir, file), placeholder);
    });
    
    console.log('⚠️  Placeholder audio files created. Replace with actual audio before distribution.');
  }

  /**
   * Optimize assets
   */
  async optimizeAssets() {
    console.log('⚡ Optimizing assets...');

    // Optimize manifest.json
    const manifestPath = path.join(this.distDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Ensure production settings
      manifest.version = manifest.version || '1.0.0';
      manifest.description = manifest.description || 'A comprehensive productivity extension with focus tracking, task management, and wellness features';
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }

    // Create optimized CSS bundle
    await this.createCSSBundle();
  }

  /**
   * Create CSS bundle
   */
  async createCSSBundle() {
    console.log('🎨 Creating CSS bundle...');

    const cssFiles = [
      'popup/popup.css',
      'utils/error-feedback.css',
      'utils/loading-styles.css'
    ];

    let bundledCSS = '/* Focus Productivity Extension - Bundled CSS */\n\n';

    cssFiles.forEach(file => {
      const filePath = path.join(this.distDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        bundledCSS += `/* ${file} */\n${content}\n\n`;
      }
    });

    // Write bundled CSS
    fs.writeFileSync(path.join(this.distDir, 'popup/popup-bundle.css'), bundledCSS);

    // Update HTML to use bundled CSS
    const htmlPath = path.join(this.distDir, 'popup/popup.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      
      // Replace individual CSS links with bundle
      html = html.replace(
        /<link rel="stylesheet" href="popup\.css" \/>\s*<link rel="stylesheet" href="\.\.\/utils\/error-feedback\.css" \/>\s*<link rel="stylesheet" href="\.\.\/utils\/loading-styles\.css" \/>/,
        '<link rel="stylesheet" href="popup-bundle.css" />'
      );
      
      fs.writeFileSync(htmlPath, html);
    }
  }

  /**
   * Validate build
   */
  validateBuild() {
    console.log('✅ Validating build...');

    const requiredFiles = [
      'manifest.json',
      'background.js',
      'popup/popup.html',
      'popup/popup.js'
    ];

    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(this.distDir, file))
    );

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    // Validate manifest
    const manifestPath = path.join(this.distDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    if (manifest.manifest_version !== 3) {
      throw new Error('Manifest must be version 3');
    }

    if (!manifest.name || !manifest.version) {
      throw new Error('Manifest missing required fields');
    }

    console.log('✅ Build validation passed');
  }

  /**
   * Create distribution package
   */
  async createPackage() {
    console.log('📦 Creating distribution package...');

    try {
      // Use system zip command if available, otherwise use Node.js implementation
      const packagePath = path.join(this.sourceDir, `${this.packageName}.zip`);
      
      if (this.hasSystemZip()) {
        execSync(`cd "${this.distDir}" && zip -r "${packagePath}" .`, { stdio: 'inherit' });
      } else {
        await this.createZipNodeJS(packagePath);
      }

      // Verify package (only if zip was created)
      if (fs.existsSync(packagePath)) {
        const stats = fs.statSync(packagePath);
        console.log(`📦 Package size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log('📁 Extension files ready in extension-package directory');
      }

    } catch (error) {
      throw new Error(`Failed to create package: ${error.message}`);
    }
  }

  /**
   * Check if system has zip command
   */
  hasSystemZip() {
    try {
      execSync('zip --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create zip using Node.js (fallback)
   */
  async createZipNodeJS(packagePath) {
    try {
      const archiver = await import('archiver');
      const output = fs.createWriteStream(packagePath);
      const archive = archiver.default('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(this.distDir, false);
        archive.finalize();
      });
    } catch (error) {
      // Fallback: create a simple directory copy
      console.warn('Archiver not available, copying files instead');
      const fallbackDir = path.join(this.sourceDir, 'extension-package');
      if (fs.existsSync(fallbackDir)) {
        fs.rmSync(fallbackDir, { recursive: true });
      }
      fs.cpSync(this.distDir, fallbackDir, { recursive: true });
      console.log(`📁 Files copied to: ${fallbackDir}`);
    }
  }

  /**
   * Generate build report
   */
  generateReport() {
    console.log('\n📊 Build Report:');
    console.log('================');
    
    const distSize = this.getDirectorySize(this.distDir);
    console.log(`Distribution size: ${(distSize / 1024 / 1024).toFixed(2)} MB`);
    
    const fileCount = this.countFiles(this.distDir);
    console.log(`Total files: ${fileCount}`);
    
    console.log('\nFiles included:');
    this.listFiles(this.distDir, '');
  }

  /**
   * Get directory size recursively
   */
  getDirectorySize(dirPath) {
    let size = 0;
    
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        size += this.getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    });
    
    return size;
  }

  /**
   * Count files recursively
   */
  countFiles(dirPath) {
    let count = 0;
    
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        count += this.countFiles(filePath);
      } else {
        count++;
      }
    });
    
    return count;
  }

  /**
   * List files recursively
   */
  listFiles(dirPath, prefix) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        console.log(`${prefix}📁 ${file}/`);
        this.listFiles(filePath, prefix + '  ');
      } else {
        const size = (stats.size / 1024).toFixed(1);
        console.log(`${prefix}📄 ${file} (${size} KB)`);
      }
    });
  }
}

// Run build if called directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('build.js');
if (isMainModule) {
  const builder = new ExtensionBuilder();
  builder.build().then(() => {
    builder.generateReport();
  }).catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

export default ExtensionBuilder;