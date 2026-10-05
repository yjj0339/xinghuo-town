"""绿幕/背景抠图：自适应角部背景色，色距抠图+边缘羽化+绿边清除，裁剪到内容包围盒。
用法：python tools/cutout.py in.png out.png [--max 256]"""
import sys
from PIL import Image, ImageFilter


def corner_bg(img):
    w, h = img.size
    px = img.load()
    pts = [(3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4), (w // 2, 3), (3, h // 2), (w - 4, h // 2), (w // 2, h - 4)]
    cols = [px[x, y][:3] for x, y in pts]
    return tuple(sorted(c)[len(c) // 2] for c in zip(*cols))


def main(inp, outp, maxside=256):
    img = Image.open(inp).convert('RGBA')
    bg = corner_bg(img)
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** .5
            if d < 60:
                px[x, y] = (r, g, b, 0)
            elif d < 110:
                px[x, y] = (r, g, b, int(255 * (d - 60) / 50))
    data = img.getdata()
    nd = []
    for r, g, b, a in data:
        if 0 < a < 255 and g > r and g > b:
            g = (r + b) // 2
        nd.append((r, g, b, a))
    img.putdata(nd)
    img = img.filter(ImageFilter.GaussianBlur(.6))
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    sc = maxside / max(w, h)
    if sc < 1:
        img = img.resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    img.save(outp)
    print('OK', outp, img.size)


if __name__ == '__main__':
    inp, outp = sys.argv[1], sys.argv[2]
    mx = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 256
    main(inp, outp, mx)
