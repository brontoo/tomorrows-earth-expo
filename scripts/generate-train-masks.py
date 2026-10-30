"""Derive complementary aperture masks from the supplied unmodified cabin JPEG.

The connected white placeholder is the window, not the lamps or paper table.
Thresholds preserve the illustrated curtain tassels and lamp silhouettes.
Requires Pillow; rerun only if the source cabin artwork changes.
"""
from pathlib import Path
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[1] / 'client/public/train'
source = Image.open(root / 'main fram.jpg').convert('RGB')
threshold = source.point(lambda v: 255 if v >= 242 else 0)
r, g, b = threshold.split()
from PIL import ImageChops, ImageDraw
white = ImageChops.darker(ImageChops.darker(r, g), b)
# Flood only the placeholder connected to the centre of the window.
flood = white.convert('RGB')
ImageDraw.floodfill(flood, (source.width // 2, source.height // 2), (255, 0, 0), thresh=0)
r, g, b = flood.split()
aperture = ImageChops.subtract(r, g).filter(ImageFilter.GaussianBlur(0.5))
for name, alpha in [('window-mask.png', aperture), ('cabin-mask.png', ImageChops.invert(aperture))]:
    result = Image.new('RGBA', source.size, 'white')
    result.putalpha(alpha)
    result.save(root / name, optimize=True)
print('Window bounds:', aperture.getbbox())
