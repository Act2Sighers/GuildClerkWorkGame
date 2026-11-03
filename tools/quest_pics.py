#!/usr/bin/env python3
"""クエスト要請の写しに載せる「写真や絵」（40x28、どうとでも受け取れる風景）を描く。
  python3 tools/quest_pics.py [--preview]
出力: img/qpic_00.png 〜 img/qpic_15.png
"""
import os
import random
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")
W, H = 40, 28


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def sky(d, top, bottom, y1):
    a, b = hx(top), hx(bottom)
    for y in range(H):
        t = min(1, y / max(1, y1 - 1))
        d.line([(0, y), (W, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))


def ground(d, y0, col, col2=None, rnd=None):
    d.rectangle([0, y0, W, H], fill=hx(col))
    if col2 and rnd:
        for _ in range(30):
            x, y = rnd.randrange(W), rnd.randrange(y0, H)
            d.point((x, y), fill=hx(col2))


def tree(d, x, y, h, c="#3f7a3a", trunk="#6a4424"):
    d.line([(x, y), (x, y - h // 2)], fill=hx(trunk))
    d.polygon([(x - 3, y - h // 3), (x + 3, y - h // 3), (x, y - h)], fill=hx(c))


def mountain(d, x, y, w, h, c, snow=None):
    d.polygon([(x - w, y), (x + w, y), (x, y - h)], fill=hx(c))
    if snow:
        d.polygon([(x - w // 4, y - h + h // 4), (x + w // 4, y - h + h // 4), (x, y - h)], fill=hx(snow))


def scene(i):
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    rnd = random.Random(100 + i)
    if i == 0:  # 森
        sky(d, "#8ec3e6", "#d6ecf4", 14); ground(d, 20, "#4f8a3a", "#3a6a2a", rnd)
        for x in range(2, 40, 5):
            tree(d, x, 22 + rnd.randrange(3), 12 + rnd.randrange(6))
    elif i == 1:  # 山
        sky(d, "#7fb0dc", "#e0eef6", 20)
        mountain(d, 14, 22, 16, 18, "#6a7a8a", "#f2f6fa"); mountain(d, 30, 22, 14, 13, "#5a6a78", "#e8eef4")
        ground(d, 22, "#6a8a4a", "#5a7a3a", rnd)
    elif i == 2:  # 洞窟
        sky(d, "#a0b8c8", "#c8d4dc", 10)
        d.rectangle([0, 6, W, H], fill=hx("#6a5a4a"))
        d.ellipse([12, 10, 28, 30], fill=hx("#1a1412"))
        for _ in range(14):
            d.point((rnd.randrange(W), rnd.randrange(6, H)), fill=hx("#4a3e32"))
    elif i == 3:  # 街道と荷車
        sky(d, "#9ccae8", "#e6f2f8", 15); ground(d, 15, "#7aa04a", "#6a9040", rnd)
        d.polygon([(16, 15), (24, 15), (36, H), (4, H)], fill=hx("#c8a878"))
        d.rectangle([17, 17, 25, 21], fill=hx("#8a5a30")); d.rectangle([18, 14, 24, 17], fill=hx("#e8e0c8"))
        d.ellipse([16, 20, 19, 23], fill=hx("#3a2a1a")); d.ellipse([23, 20, 26, 23], fill=hx("#3a2a1a"))
    elif i == 4:  # 城
        sky(d, "#8ab8e0", "#dceaf4", 18); ground(d, 22, "#6a8a4a")
        d.rectangle([10, 10, 30, 22], fill=hx("#b8b0a4"))
        for x in (8, 28):
            d.rectangle([x, 6, x + 4, 22], fill=hx("#a8a094")); d.polygon([(x - 1, 6), (x + 5, 6), (x + 2, 2)], fill=hx("#a84a3a"))
        d.rectangle([18, 16, 22, 22], fill=hx("#4a3a2a"))
    elif i == 5:  # 遺跡
        sky(d, "#c8b890", "#ece0c0", 16); ground(d, 20, "#b8a070", "#a08858", rnd)
        for x in (6, 14, 26, 33):
            h = 6 + rnd.randrange(8)
            d.rectangle([x, 20 - h, x + 3, 20], fill=hx("#d8d0c0"))
        d.rectangle([12, 8, 30, 10], fill=hx("#d8d0c0"))
    elif i == 6:  # 川
        sky(d, "#8ec8ea", "#e0f0f8", 12); ground(d, 12, "#5a9a4a", "#4a8a3a", rnd)
        d.polygon([(18, 12), (22, 12), (30, H), (10, H)], fill=hx("#4a90c8"))
        for y in range(14, H, 3):
            d.point((15 + (y % 7), y), fill=hx("#cfe8f8"))
    elif i == 7:  # 畑と柵
        sky(d, "#9cd0f0", "#eef6fa", 13); ground(d, 13, "#d8c070")
        for y in range(15, H, 3):
            d.line([(0, y), (W, y)], fill=hx("#b8a050"))
        for x in range(0, W, 5):
            d.line([(x, 11), (x, 15)], fill=hx("#8a6a3a"))
        d.line([(0, 12), (W, 12)], fill=hx("#8a6a3a"))
    elif i == 8:  # 沼
        sky(d, "#8a9a88", "#b8c4b0", 12); ground(d, 12, "#4a5a3a", "#3a4a2a", rnd)
        d.ellipse([4, 16, 36, 26], fill=hx("#3a5a4a"))
        for x in (6, 30, 34):
            d.line([(x, 12), (x, 18)], fill=hx("#2a3a24"))
    elif i == 9:  # 町の門
        sky(d, "#94c4e4", "#e2eef6", 16); ground(d, 22, "#b8a888")
        d.rectangle([4, 8, 36, 22], fill=hx("#a89c8c"))
        d.rectangle([15, 12, 25, 22], fill=hx("#5a4030")); d.pieslice([15, 8, 25, 16], 180, 360, fill=hx("#5a4030"))
        for x in range(4, 37, 4):
            d.rectangle([x, 6, x + 2, 8], fill=hx("#a89c8c"))
    elif i == 10:  # 塔
        sky(d, "#7aa8d8", "#d4e4f2", 22); ground(d, 22, "#5a7a4a")
        d.rectangle([17, 4, 23, 22], fill=hx("#9a8e80")); d.polygon([(15, 5), (25, 5), (20, 0)], fill=hx("#5a4a8a"))
        d.rectangle([19, 9, 21, 11], fill=hx("#f0d070"))
    elif i == 11:  # 海の崖
        sky(d, "#88c0e8", "#e4f2fa", 12)
        d.rectangle([0, 12, W, H], fill=hx("#3a7ab8"))
        d.polygon([(0, 8), (16, 10), (20, H), (0, H)], fill=hx("#8a7a6a"))
        for x in range(22, W, 6):
            d.point((x, 16 + (x % 5)), fill=hx("#e8f4fa"))
    elif i == 12:  # 砂丘
        sky(d, "#e8c890", "#f6e8c8", 12)
        d.rectangle([0, 12, W, H], fill=hx("#e0b870"))
        d.pieslice([-10, 14, 24, 40], 180, 360, fill=hx("#d0a860")); d.pieslice([14, 16, 50, 44], 180, 360, fill=hx("#c89a50"))
        d.ellipse([30, 2, 36, 8], fill=hx("#fff2c0"))
    elif i == 13:  # 夜の野営
        sky(d, "#1a2040", "#3a3a5a", 18); ground(d, 18, "#2a3024")
        for _ in range(10):
            d.point((rnd.randrange(W), rnd.randrange(12)), fill=hx("#f0f0d0"))
        d.polygon([(6, 22), (14, 22), (10, 14)], fill=hx("#8a6a4a"))
        d.polygon([(22, 23), (26, 23), (24, 18)], fill=hx("#f0a030")); d.point((24, 20), fill=hx("#fff0a0"))
    elif i == 14:  # 橋
        sky(d, "#90c4e8", "#e2f0f8", 14)
        d.rectangle([0, 14, W, H], fill=hx("#4a7a5a")); d.rectangle([0, 20, W, H], fill=hx("#3a78b0"))
        d.arc([4, 12, 36, 32], 180, 360, fill=hx("#8a6a4a"), width=2)
        d.line([(0, 14), (W, 14)], fill=hx("#8a6a4a"), width=2)
    else:  # 暗がりに光る目
        sky(d, "#1a1420", "#2a2030", H)
        for _ in range(6):
            tree(d, rnd.randrange(W), H, 16 + rnd.randrange(8), c="#1e2a1e", trunk="#1a1410")
        for (x, y) in ((14, 14), (18, 14)):
            d.rectangle([x, y, x + 1, y], fill=hx("#f0d040"))
        d.rectangle([26, 18, 26, 18], fill=hx("#e04030")); d.rectangle([29, 18, 29, 18], fill=hx("#e04030"))
    return im


def main():
    os.makedirs(IMG, exist_ok=True)
    pics = [scene(i) for i in range(16)]
    for i, im in enumerate(pics):
        im.save(os.path.join(IMG, f"qpic_{i:02d}.png"))
    if "--preview" in sys.argv:
        sheet = Image.new("RGB", (W * 4 * 4 + 30, H * 4 * 4 + 30), (90, 80, 70))
        for i, im in enumerate(pics):
            sheet.paste(im.resize((W * 4, H * 4), Image.NEAREST), ((i % 4) * (W * 4 + 10), (i // 4) * (H * 4 + 10)))
        sheet.save(sys.argv[-1] if sys.argv[-1].endswith(".png") else "qpic_preview.png")
    print("ok", len(pics))


if __name__ == "__main__":
    main()
