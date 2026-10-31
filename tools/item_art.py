#!/usr/bin/env python3
"""小物（16x16）とロビー背景を描く。"""
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from gen_sprites import hx, shade, outline, IMG  # noqa: E402

PAL = {
    "K": hx("#b07a44"), "k": hx("#7a4e28"),
    "W": hx("#e8f4f8"), "V": hx("#9ab8c8"), "w": hx("#ffffff"),
    "X": hx("#5fd08a"), "x": hx("#2f9a5a"),
    "Z": hx("#d68af5"), "z": hx("#8a42c0"),
    "G": hx("#f2c64a"), "g": hx("#b48a22"),
    "Y": hx("#f4e8c8"), "y": hx("#cdb88c"),
    "R": hx("#d6404f"), "r": hx("#962a38"),
    "N": hx("#3a2e30"), "M": hx("#c9d2de"),
    "S": hx("#c8a070"),
}

ICONS = {
    "gel": [
        "................",
        "................",
        ".....kKKKKk.....",
        ".....KKKKKK.....",
        "....VWWWWWWV....",
        "...VXXXXXXXXV...",
        "...VXwXXXXXXV...",
        "..VXwXXXXXXXXV..",
        "..VXwYYYYYYXXV..",
        "..VXXYYRRYYXxV..",
        "..VXXYRRRRYxxV..",
        "..VxXYYRRYYxxV..",
        "...VxxxxxxxxV...",
        "....VVVVVVVV....",
        "................",
        "................",
    ],
    "elixir": [
        "......gGGg......",
        "......GGGG......",
        ".......VV.......",
        ".......VV.......",
        "......VZZV......",
        ".....VZZZZV.....",
        "....VZwZZZZV....",
        "...VZwZZZZZZV...",
        "...VZwZZGZZZV...",
        "...VZZZGGGZzV...",
        "...VZZZZGZzzV...",
        "...VzZZZZzzzV...",
        "....VzzzzzzV....",
        ".....VVVVVV.....",
        "................",
        "................",
    ],
    "tag": [
        "................",
        "..S.............",
        "...S............",
        "....S...........",
        "....YYYYYYYY....",
        "...YYNYYYYYYY...",
        "...YYYYYYYYYY...",
        "...YYYRRRRYYY...",
        "...YYRYYYYRYY...",
        "...YYRYGGYRYY...",
        "...YYRYYYYRYY...",
        "...YYYRRRRYYY...",
        "...YYYYYYYYYY...",
        "...yyyyyyyyyy...",
        "................",
        "................",
    ],
    "tags": [
        "................",
        ".......YYYYYYY..",
        "......YYYYYYYYY.",
        "....YYYYYYYYYyy.",
        "...YYYYYYYYYYy..",
        "..YYNYYYYYYYYy..",
        "..YYYYYYYYYYYy..",
        "..YYYYRRRRYYY...",
        "..RRRRRRRRRRR...",
        "..rrrrrrrrrrr...",
        "..YYYRYYYYRYY...",
        "..YYYYRRRRYYY...",
        "..YYYYYYYYYYY...",
        "..yyyyyyyyyyy...",
        "................",
        "................",
    ],
    "stamp": [
        "................",
        "......kKKk......",
        ".....kKKKKk.....",
        ".....KKKKKK.....",
        "......KKKK......",
        "......KkKK......",
        "......KkKK......",
        "......KkKK......",
        ".....KKKKKK.....",
        "....MMMMMMMM....",
        "....RRRRRRRR....",
        "....rrrrrrrr....",
        "................",
        "................",
        "................",
        "................",
    ],
}


def icon(rows):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        assert len(r) == 16, r
        for x, ch in enumerate(r):
            if ch != ".":
                px[x, y] = PAL[ch] + (255,)
    return outline(im)


def lobby_bg():
    """ロビーの背景 320x68（4倍で 1280x272）"""
    W, H = 320, 68
    im = Image.new("RGBA", (W, H))
    px = im.load()
    rnd = random.Random(7)
    wall = hx("#6b4a36")
    for y in range(H):
        for x in range(W):
            if y < 38:  # 板壁
                plank = x // 10
                c = shade(wall, (rnd.random() - 0.5) * 0.06 + ((plank % 3) - 1) * 0.04)
                if x % 10 == 0:
                    c = shade(wall, -0.35)
                if (x * 7 + y * 3 + plank * 11) % 53 == 0:
                    c = shade(wall, -0.2)
            elif y < 42:  # 腰板の縁
                c = hx("#4a3022") if y in (38, 41) else hx("#8a6244")
            else:  # 床
                row = (y - 42) // 5
                off = (row * 13) % 24
                c = shade(hx("#9a7452"), ((row % 2) * 0.05) + (rnd.random() - 0.5) * 0.05)
                if (y - 42) % 5 == 0 or (x + off) % 24 == 0:
                    c = shade(hx("#9a7452"), -0.3)
            px[x, y] = c + (255,)
    # 窓（上部）とランプ
    for i in range(6):
        cx = 26 + i * 52
        for y in range(4, 16):
            for x in range(cx - 7, cx + 8):
                edge = y in (4, 15) or x in (cx - 7, cx + 7) or x == cx or y == 10
                px[x, y] = (hx("#3a2418") if edge else shade(hx("#9fd0f0"), (y - 4) * -0.03)) + (255,)
    return im


def main():
    for k, rows in ICONS.items():
        icon(rows).save(os.path.join(IMG, f"item_{k}.png"))
    lobby_bg().save(os.path.join(IMG, "bg_lobby.png"))
    if "--preview" in sys.argv:
        bg = Image.new("RGBA", (16 * 6 * len(ICONS), 16 * 6), (120, 104, 92, 255))
        for i, k in enumerate(ICONS):
            bg.alpha_composite(icon(ICONS[k]).resize((96, 96), Image.NEAREST), (i * 96, 0))
        bg.save("/tmp/items_preview.png")
    print("ok")


if __name__ == "__main__":
    main()
