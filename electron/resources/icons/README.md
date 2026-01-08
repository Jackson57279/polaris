# Application Icons

This directory contains the application icons for Polaris IDE.

## Required Files

Before building for production, you need to create the following icon files:

### Windows
- `icon.ico` - Multi-resolution ICO file (16x16, 32x32, 48x48, 64x64, 128x128, 256x256)

### Linux
Create PNG icons in the following sizes:
- `16x16.png`
- `32x32.png`
- `48x48.png`
- `64x64.png`
- `128x128.png`
- `256x256.png`
- `512x512.png`

## Creating Icons

1. Start with a high-resolution source (at least 1024x1024 PNG with transparency)
2. Use a tool like ImageMagick, GIMP, or an online converter

### Using ImageMagick

```bash
# Create ICO for Windows
convert icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# Create PNG sizes for Linux
for size in 16 32 48 64 128 256 512; do
  convert icon-1024.png -resize ${size}x${size} ${size}x${size}.png
done
```

### BMP Header (Windows Installer)

For the NSIS installer header (`installerHeader.bmp`):
- Size: 150x57 pixels
- Format: BMP (24-bit, no alpha)
- Used in the Windows installer wizard

## Current Status

Placeholder icons are provided for development. Replace them with production icons before release.
