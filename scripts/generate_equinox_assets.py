import os
import shutil
import numpy as np
from PIL import Image

def generate_assets():
    source_path = 'logo/equinox-orbital-mark.jpg'
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Source not found: {source_path}")

    # Open source image and convert to RGBA
    src = Image.open(source_path).convert('RGBA')
    arr = np.array(src, dtype=np.float32)

    # Key out dark navy background cleanly around (13, 21, 34)
    bg = np.array([13.0, 21.0, 34.0])
    diff = np.linalg.norm(arr[:, :, :3] - bg, axis=2)

    # Smooth alpha roll-off
    t_low = 13.0
    t_high = 42.0
    alpha = np.clip((diff - t_low) / (t_high - t_low), 0.0, 1.0) * 255.0
    arr[:, :, 3] = alpha

    full_trans = Image.fromarray(arr.astype(np.uint8))

    # Center crop square around the central emblem
    cx, cy = 512, 512
    crop_size = 580
    half = crop_size // 2
    cropped = full_trans.crop((cx - half, cy - half, cx + half, cy + half))

    # Base 512x512 master PNG
    logo_512 = cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Favicon 32x32, 16x16
    fav_32 = cropped.resize((32, 32), Image.Resampling.LANCZOS)
    fav_16 = cropped.resize((16, 16), Image.Resampling.LANCZOS)

    # Multi-resolution ICO
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = [cropped.resize(sz, Image.Resampling.LANCZOS) for sz in ico_sizes]

    destinations = [
        # logo dir
        ('logo/logo.png', logo_512),
        ('logo/logo-white.png', logo_512),
        ('logo/custom-logo.png', logo_512),
        ('logo/custom-logo-white.png', logo_512),

        # frontend
        ('frontend/public/static/images/logo/logo.png', logo_512),
        ('frontend/public/static/images/logo/logo-white.png', logo_512),
        ('frontend/public/static/images/overview/tokyo-logo.png', logo_512),
        ('frontend/public/favicon-32x32.png', fav_32),
        ('frontend/public/favicon-16x16.png', fav_16),

        # home (if home directory exists)
        ('home/public/static/images/logo/logo.png', logo_512),
        ('home/public/static/images/logo/logo-white.png', logo_512),
        ('home/public/static/images/overview/tokyo-logo.png', logo_512),
        ('home/public/favicon-32x32.png', fav_32),
        ('home/public/favicon-16x16.png', fav_16),

        # api
        ('api/src/main/resources/static/images/logo.png', logo_512),
    ]

    for path, img in destinations:
        parent = os.path.dirname(path)
        if parent and not os.path.exists(parent):
            os.makedirs(parent, exist_ok=True)
        img.save(path, 'PNG', optimize=True)
        print(f"Saved: {path}")

    # Save .ico files
    for ico_path in ['frontend/public/favicon.ico', 'home/public/favicon.ico']:
        parent = os.path.dirname(ico_path)
        if os.path.exists(parent):
            ico_images[0].save(
                ico_path,
                format='ICO',
                sizes=ico_sizes,
                append_images=ico_images[1:]
            )
            print(f"Saved ICO: {ico_path}")

    print("\nAll Equinox logo and favicon assets generated successfully!")

if __name__ == '__main__':
    generate_assets()
