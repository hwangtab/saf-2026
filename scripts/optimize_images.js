const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IMAGES_DIR = path.join(__dirname, '../public/images/artworks');
const TARGET_SIZE_BYTES = 1024 * 1024; // 1MB

function formatBytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function optimizeImages() {
    const files = fs.readdirSync(IMAGES_DIR);
    let optimizedCount = 0;
    let totalSavedBytes = 0;

    console.log(`Checking ${files.length} images in ${IMAGES_DIR}...`);

    for (const file of files) {
        if (file.startsWith('.')) continue;

        const filePath = path.join(IMAGES_DIR, file);
        const stats = fs.statSync(filePath);

        if (stats.size > TARGET_SIZE_BYTES) {
            console.log(`Optimizing ${file} (Size: ${formatBytes(stats.size)})`);
            const originalSize = stats.size;

            try {
                const ext = path.extname(file).toLowerCase();
                if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

                // Iterative optimization strategy
                const steps = [
                    { width: 1600, quality: 80 },
                    { width: 1400, quality: 75 },
                    { width: 1200, quality: 70 },
                    { width: 1024, quality: 65 },
                    { width: 1000, quality: 60 },
                    { width: 900, quality: 50 },
                    { width: 800, quality: 50 },
                    { width: 600, quality: 50 }
                ];

                for (const step of steps) {
                    let cmd = `sips -Z ${step.width} -s formatOptions ${step.quality} "${filePath}"`;
                    if (ext === '.png') {
                        cmd = `sips -Z ${step.width} "${filePath}"`;
                    }

                    execSync(cmd, { stdio: 'ignore' });

                    const currentStats = fs.statSync(filePath);
                    if (currentStats.size <= TARGET_SIZE_BYTES) {
                        console.log(`  -> [SUCCESS] Resized to ${step.width}px, Q${step.quality}. New Size: ${formatBytes(currentStats.size)}`);
                        break;
                    }
                }

                const finalStats = fs.statSync(filePath);
                const saved = originalSize - finalStats.size;
                totalSavedBytes += saved;

                if (finalStats.size > TARGET_SIZE_BYTES) {
                    console.log(`  -> [WARN] Could not get under 1MB. Final Size: ${formatBytes(finalStats.size)}`);
                }
                optimizedCount++;

            } catch (error) {
                console.error(`  -> Failed for ${file}:`, error.message);
            }
        }
    }

    console.log('------------------------------------------------');
    console.log(`Optimization Complete.`);
    console.log(`Optimized: ${optimizedCount} images`);
    console.log(`Total Space Saved: ${formatBytes(totalSavedBytes)}`);
}

optimizeImages();
