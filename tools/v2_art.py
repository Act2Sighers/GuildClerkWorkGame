#!/usr/bin/env python3
"""v2 用の小物：ハンコ3種、箱に入っている間の小さな品、品を中に入れる前提の箱（奥と手前の2枚）。
  python3 tools/v2_art.py [--preview 出力先.png]
"""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from gen_sprites import hx, shade, outline, IMG  # noqa: E402
from item_art import PAL  # noqa: E402

P2 = dict(PAL)
P2.update({
    "J": hx("#2e4a3a"), "j": hx("#1e3228"),     # 認可/却下ハンコの胴（深緑）
    "U": hx("#2d4a8a"), "u": hx("#1e3264"),     # 承認印の胴（紺）
    "A": hx("#e8eef4"), "a": hx("#a8b2be"),     # 数量ハンコ（銀）
    "F": hx("#5a3e2e"),                          # 印面
})


def grid(rows):
    w = len(rows[0])
    im = Image.new("RGBA", (w, len(rows)), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        assert len(r) == w, (r, len(r))
        for x, ch in enumerate(r):
            if ch != ".":
                px[x, y] = P2[ch] + (255,)
    return im


STAMPS = {
    # 認可/却下用ハンコ：丸い木のつまみと深緑の胴
    "stamp_ar": [
        "................",
        "......kKKk......",
        ".....kKKKKk.....",
        ".....KKKKKK.....",
        "......kKKk......",
        ".......Kk.......",
        "......JJJJ......",
        ".....JJJJJJ.....",
        ".....JjJJJJ.....",
        ".....JjJJJJ.....",
        "....JJJJJJJJ....",
        "....jjjjjjjj....",
        "....FFFFFFFF....",
        "................",
        "................",
        "................",
    ],
    # ギルド承認印：金のつまみに宝石、紺の角胴
    "stamp_seal": [
        "......gGGg......",
        ".....gGGGGg.....",
        "......GXXG......",
        ".......GG.......",
        "......gGGg......",
        "...UUUUUUUUUU...",
        "...UuUUUUUUuU...",
        "...UUUUGGUUUU...",
        "...UUUGGGGUUU...",
        "...UUUUGGUUUU...",
        "...UUUUUUUUUU...",
        "...uuuuuuuuuu...",
        "...FFFFFFFFFF...",
        "................",
        "................",
        "................",
    ],
    # 数量ハンコ：細い銀の軸
    "stamp_q": [
        "................",
        "................",
        "................",
        ".......AA.......",
        "......AwAA......",
        ".......AA.......",
        ".......Aa.......",
        ".......Aa.......",
        "......aAAa......",
        ".....AAAAAA.....",
        ".....AwAAAa.....",
        ".....aaaaaa.....",
        ".....FFFFFF.....",
        "................",
        "................",
        "................",
    ],
}

# 箱に入っている間の小さな品（8x8）
MINI = {
    "gel": [
        "..kKKk..",
        ".VWWWWV.",
        "VXRXRXXV",
        "VXRRRXxV",
        "VxXRXxxV",
        "VxXXXxxV",
        ".VVVVVV.",
        "........",
    ],
    "elixir": [
        "...gG...",
        "...VV...",
        "..VZZV..",
        ".VZwZZV.",
        ".VZZGZV.",
        ".VzZZzV.",
        "..VVVV..",
        "........",
    ],
}


def box_layers(kind):
    """品を中に入れる前提の箱。back（奥の壁と底）、front（手前の壁）を返す。
    品は back と front の間に描く。中の品が見える高さは inner 範囲。"""
    if kind == "pouch":
        W, H = 30, 26
        back = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(back)
        d.ellipse([2, 2, W - 3, 14], fill=hx("#6a4024"))
        d.ellipse([4, 4, W - 5, 13], fill=hx("#2a1a12"))
        front = Image.new("RGBA", (W, H), (0, 0, 0, 0)); f = ImageDraw.Draw(front)
        f.pieslice([0, -4, W - 1, H - 1], 0, 180, fill=hx("#a8703f"))
        f.rectangle([0, 9, W - 1, 13], fill=hx("#a8703f"))
        f.line([(2, 10), (W - 3, 10)], fill=hx("#6a4024"))
        for x in range(4, W - 4, 5):
            f.point((x, 17), fill=hx("#8a5a30"))
        f.line([(W // 2 - 4, 11), (W // 2 - 8, 6)], fill=hx("#f2c64a")); f.line([(W // 2 + 4, 11), (W // 2 + 8, 6)], fill=hx("#f2c64a"))
        return back, front, (5, 5, W - 10, 3)
    W, H = (34, 28) if kind == "crate_s" else (42, 30)
    back = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(back)
    d.polygon([(0, 8), (5, 2), (W - 6, 2), (W - 1, 8)], fill=hx("#7a4e28"))       # 奥の縁
    d.polygon([(2, 8), (6, 4), (W - 7, 4), (W - 3, 8)], fill=hx("#3a2414"))        # 中の暗がり
    d.rectangle([2, 8, W - 3, 13], fill=hx("#2e1c10"))
    for x in range(6, W - 6, 4):
        d.point((x, 6), fill=hx("#c8a868"))                                         # 詰め物の藁
    front = Image.new("RGBA", (W, H), (0, 0, 0, 0)); f = ImageDraw.Draw(front)
    f.rectangle([0, 12, W - 1, H - 1], fill=hx("#b07a44"))
    for y in (12, 19, H - 1):
        f.line([(0, y), (W - 1, y)], fill=hx("#7a4e28"))
    f.line([(0, 12), (0, H - 1)], fill=hx("#7a4e28")); f.line([(W - 1, 12), (W - 1, H - 1)], fill=hx("#7a4e28"))
    for x in (2, W - 3):
        f.point((x, 14), fill=hx("#c9d2de")); f.point((x, H - 3), fill=hx("#c9d2de"))
    f.rectangle([W // 2 - 6, 15, W // 2 + 5, 25], fill=hx("#f4e8c8"), outline=hx("#7a4e28"))  # ラベルを貼る場所
    return back, front, (3, 4, W - 6, 3)


def main():
    out = {}
    for k, rows in STAMPS.items():
        im = outline(grid(rows)); im.save(os.path.join(IMG, f"{k}.png")); out[k] = im
    for k, rows in MINI.items():
        im = grid(rows); im.save(os.path.join(IMG, f"mini_{k}.png")); out["mini_" + k] = im
    boxes = {}
    for k in ("pouch", "crate_s", "crate_l"):
        b, f, inner = box_layers(k)
        outline(b).save(os.path.join(IMG, f"box_{k}_back.png")); f.save(os.path.join(IMG, f"box_{k}_front.png"))
        boxes[k] = (b, f, inner)
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        sheet = Image.new("RGBA", (700, 220), (90, 80, 70, 255))
        x = 10
        for k in STAMPS:
            sheet.alpha_composite(out[k].resize((96, 96), Image.NEAREST), (x, 10)); x += 110
        for k in MINI:
            sheet.alpha_composite(out["mini_" + k].resize((64, 64), Image.NEAREST), (x, 20)); x += 80
        x = 10
        for k, (b, f, inner) in boxes.items():
            comp = b.copy()
            ix, iy, iw, ih = inner
            n = {"pouch": 2, "crate_s": 5, "crate_l": 10}[k]
            for i in range(n):
                m = out["mini_gel"]
                per = 5 if k != "pouch" else 2
                row = i // per
                comp.alpha_composite(m, (ix + (i % per) * 8 + (4 if row else 0), iy + row * ih))
            comp.alpha_composite(f)
            sheet.alpha_composite(comp.resize((comp.width * 3, comp.height * 3), Image.NEAREST), (x, 120)); x += comp.width * 3 + 20
        sheet.save(sys.argv[2])
    print("ok")


if __name__ == "__main__":
    main()
