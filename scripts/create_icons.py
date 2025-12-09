#!/usr/bin/env python3
"""
Create icon files for BlackMamba Studio
Generates a simple but professional-looking icon
"""

from PIL import Image, ImageDraw, ImageFont
import struct
import os
import sys

# Configuration constants
GRADIENT_ITERATIONS = 10
DEFAULT_ICON_SIZE = 512
BRAND_COLOR = (0, 212, 255)  # Electric blue from BlackMamba branding

def create_base_icon(size):
    """Create a base icon with BlackMamba Studio branding"""
    # Create image with dark background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background circle with gradient effect
    center = size // 2
    
    # Draw background circle - dark purple/blue
    for i in range(GRADIENT_ITERATIONS):
        radius = max(1, center - i * 2)
        if radius > 0:
            alpha = int(255 * (1 - i/GRADIENT_ITERATIONS))
            color = BRAND_COLOR + (alpha,)  # Add alpha to RGB tuple
            draw.ellipse(
                [center - radius, center - radius, center + radius, center + radius],
                fill=color
            )
    
    # Draw a stylized snake/mamba shape (simplified)
    if size >= 32:
        # Snake body
        snake_width = max(2, size // 8)
        snake_color = (255, 255, 255, 255)  # White
        
        # Draw S-shaped snake
        points = []
        for i in range(100):
            t = i / 100
            x = center + (size * 0.3) * (t - 0.5)
            y = center + (size * 0.4) * ((t - 0.5) ** 3) * 8
            points.append((x, y))
        
        # Draw the snake path
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=snake_color, width=snake_width)
        
        # Draw eyes (two small circles)
        eye_size = max(1, size // 20)
        eye_y = center - size // 4
        if eye_size > 0:
            draw.ellipse([center - size // 6 - eye_size, eye_y - eye_size, 
                          center - size // 6 + eye_size, eye_y + eye_size], 
                         fill=(255, 0, 100, 255))
            draw.ellipse([center + size // 6 - eye_size, eye_y - eye_size, 
                          center + size // 6 + eye_size, eye_y + eye_size], 
                         fill=(255, 0, 100, 255))
    else:
        # For very small icons, just draw a simple shape
        margin = size // 4
        draw.rectangle([margin, margin, size - margin, size - margin], 
                      fill=(255, 255, 255, 255))
    
    return img

def create_ico(output_path):
    """Create a Windows .ico file with multiple sizes"""
    sizes = [16, 32, 48, 64, 128, 256]
    images = [create_base_icon(size) for size in sizes]
    
    # Save as ICO
    images[0].save(output_path, format='ICO', sizes=[(s, s) for s in sizes], 
                   append_images=images[1:])
    print(f"✓ Created Windows icon: {output_path}")

def create_icns(output_path):
    """Create a macOS .icns file"""
    # ICNS requires specific sizes
    icns_sizes = [
        (16, 'ic04'),   # 16x16
        (32, 'ic05'),   # 32x32
        (64, 'ic06'),   # 64x64
        (128, 'ic07'),  # 128x128
        (256, 'ic08'),  # 256x256
        (512, 'ic09'),  # 512x512
        (1024, 'ic10'), # 1024x1024
        (32, 'ic11'),   # 16x16@2x (32x32)
        (64, 'ic12'),   # 32x32@2x (64x64)
        (256, 'ic13'),  # 128x128@2x (256x256)
        (512, 'ic14'),  # 256x256@2x (512x512)
    ]
    
    icns_data = b'icns'
    temp_data = b''
    
    for size, code in icns_sizes:
        img = create_base_icon(size)
        
        # Convert to PNG bytes
        from io import BytesIO
        png_buffer = BytesIO()
        img.save(png_buffer, format='PNG')
        png_data = png_buffer.getvalue()
        
        # Create icon element: type + size + data
        element = code.encode('ascii') + struct.pack('>I', len(png_data) + 8) + png_data
        temp_data += element
    
    # Create final ICNS: header + total_size + elements
    total_size = len(temp_data) + 8
    icns_file = icns_data + struct.pack('>I', total_size) + temp_data
    
    with open(output_path, 'wb') as f:
        f.write(icns_file)
    
    print(f"✓ Created macOS icon: {output_path}")

def create_png(output_path, size=DEFAULT_ICON_SIZE):
    """Create a high-resolution PNG icon"""
    img = create_base_icon(size)
    img.save(output_path, format='PNG')
    print(f"✓ Created PNG icon: {output_path}")

def get_output_directory():
    """Get the output directory for icons, relative to script location"""
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level to project root, then to assets
    project_root = os.path.dirname(script_dir)
    output_dir = os.path.join(project_root, 'assets')
    
    # Create assets directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    return output_dir

if __name__ == '__main__':
    # Allow custom output directory via command line argument
    if len(sys.argv) > 1:
        output_dir = sys.argv[1]
        # Create custom directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
    else:
        output_dir = get_output_directory()
    
    print("🐍 Creating BlackMamba Studio Icons...")
    print("=" * 50)
    
    # Create all icon formats
    create_ico(os.path.join(output_dir, 'icon.ico'))
    create_icns(os.path.join(output_dir, 'icon.icns'))
    create_png(os.path.join(output_dir, 'icon.png'))
    
    print("=" * 50)
    print("✅ All icons created successfully!")
    print(f"📁 Location: {output_dir}")
