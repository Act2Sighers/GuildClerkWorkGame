#!/usr/bin/env python3
"""v2 の内職「容器の洗浄」用の素材。
  容器（回復ジェルの瓶・霊薬の瓶）とその重ね絵（汚れ・水滴）、栓2種、タグ、
  回収箱、桶（奥・水・手前）、布、乾燥棚、栓のトレー、緩衝材入りの箱（奥・手前・ふた）。
  python3 tools/naishoku_art.py [--preview 出力先.png]
すべて画面では3倍で表示する。
"""
import os
import random
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from gen_sprites import hx, outline, IMG  # noqa: E402

OUT = os.path.join(IMG, "naishoku")

C = {
    "V": hx("#7f9fb2") + (255,),     # ガラスの縁
    "v": hx("#5d7d92") + (255,),
    "i": (214, 236, 246, 110),       # ガラスの中（半透明）
    "w": (255, 255, 255, 230),       # 光
    "K": hx("#b07a44") + (255,), "k": hx("#7a4e28") + (255,), "c": hx("#d6a868") + (255,),  # コルク
    "G": hx("#f2c64a") + (255,), "g": hx("#b48a22") + (255,),
    "Y": hx("#f4e8c8") + (255,), "y": hx("#cdb88c") + (255,),
    "R": hx("#d6404f") + (255,), "N": hx("#3a2e30") + (255,), "S": hx("#c8a070") + (255,),
    "U": hx("#4a7ac8") + (255,),
}


def grid(rows, h=None):
    w = len(rows[0])
    h = h or len(rows)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    off = h - len(rows)
    for y, r in enumerate(rows):
        assert len(r) == w, (r, len(r))
        for x, ch in enumerate(r):
            if ch != ".":
                px[x, y + off] = C[ch]
    return im


# 容器は 16x20、底をそろえる。栓は口に合わせて別に置く（座標は JS 側の WB_CORK）
BOTTLE = {
    "gel": [
        "....vVVVVVVv....",
        "....ViiiiiiV....",
        "...VVVVVVVVVV...",
        "..VwiiiiiiiiiV..",
        "..Vwiiiiiiiiiv..",
        "..Vwiiiiiiiiiv..",
        "..Vwiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "..VViiiiiiiivv..",
        "...vvvvvvvvvv...",
    ],
    "elixir": [
        ".....vVVVVv.....",
        "......ViwV......",
        "......ViiV......",
        "......ViiV......",
        ".....VViiVV.....",
        "....VwiiiiiV....",
        "...VwiiiiiiiV...",
        "..VwiiiiiiiiiV..",
        "..Vwiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "..Viiiiiiiiiiv..",
        "...viiiiiiiiv...",
        "....vvvvvvvv....",
    ],
    # クジラ酒の瓶：角ばった肩と、やや太い首
    "whale": [
        ".....vVVVVv.....",
        ".....ViiiiV.....",
        ".....ViiiiV.....",
        "....VViiiiVV....",
        "...VwiiiiiiiV...",
        "...Vwiiiiiiiv...",
        "...Vwiiiiiiiv...",
        "...Viiiiiiiiv...",
        "...Viiiiiiiiv...",
        "...Viiiiiiiiv...",
        "...Viiiiiiiiv...",
        "...Viiiiiiiiv...",
        "...Vviiiiiivv...",
        "....vvvvvvvv....",
    ],
}
CORK = {
    # 広口の平たい栓（回復ジェルの瓶）
    "gel": [
        ".kKKKKKKKKk.",
        "kKcKKcKKKKKk",
        "kKKKKKKcKKKk",
        ".kkkkkkkkkk.",
    ],
    # 細い口の長い栓（霊薬の瓶）。頭に金の封蝋
    "elixir": [
        ".gGGGg.",
        "gGGGGGg",
        ".kKcKk.",
        "..KKk..",
        "..KcK..",
        "..kKk..",
    ],
    # 中くらいの栓（クジラ酒の瓶）。青い紐を巻く
    "whale": [
        "kKKcKk",
        "kKKKKk",
        "UUUUUU",
        ".KcKK.",
        ".KKcK.",
        ".kKKk.",
    ],
}
# 容器（16x20）の中での栓とタグの位置（JS の WB_CORK・WB_TAG と同じ）
CORK_POS = {"gel": (2, 3), "elixir": (4, 5), "whale": (5, 3)}
TAG_POS = {"gel": (11, 7), "elixir": (9, 9), "whale": (10, 8)}
TAG = [
    "S.........",
    ".S........",
    "..SYYYYYY.",
    "..YNYYYYYY",
    "..YYRRRRYY",
    "..YRYYYYRY",
    "..YRYGGYRY",
    "..YRYYYYRY",
    "..YYRRRRYY",
    "..yyyyyyyy",
]


def inner_mask(kind):
    b = grid(BOTTLE[kind], 20)
    px = b.load()
    return [(x, y) for y in range(20) for x in range(16) if px[x, y][3] and px[x, y][3] < 200]


def grime(kind, seed):
    """中に残った品の跡（底）と茶色の汚れ"""
    rnd = random.Random(seed)
    im = Image.new("RGBA", (16, 20), (0, 0, 0, 0))
    px = im.load()
    pts = inner_mask(kind)
    bottom = max(y for _, y in pts)
    res = {"gel": (95, 190, 120), "elixir": (190, 120, 230), "whale": (214, 178, 104)}[kind]
    for x, y in pts:
        if y >= bottom - 2 + (1 if rnd.random() < 0.3 else 0):
            px[x, y] = res + (230,)
        elif y >= bottom - 4 and rnd.random() < 0.35:
            px[x, y] = res + (170,)
        elif rnd.random() < 0.22:
            px[x, y] = (122, 92, 58, 200)
        elif rnd.random() < 0.12:
            px[x, y] = (150, 128, 96, 150)
    return im


def drops(kind, seed):
    """拭く前の水滴"""
    rnd = random.Random(seed)
    im = Image.new("RGBA", (16, 20), (0, 0, 0, 0))
    px = im.load()
    pts = inner_mask(kind)
    for _ in range(9):
        x, y = rnd.choice(pts)
        px[x, y] = (250, 255, 255, 255)
        if y + 1 < 20 and rnd.random() < 0.6:
            px[x, y + 1] = (190, 225, 245, 230)
    return im


def return_box(bottles, corks, tag):
    """回収箱：使用済みの容器が詰まった木箱（60x44）"""
    W, H = 60, 44
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(0, 12), (6, 4), (W - 7, 4), (W - 1, 12)], fill=hx("#7a4e28"))
    d.polygon([(3, 12), (8, 7), (W - 9, 7), (W - 4, 12)], fill=hx("#3a2414"))
    rnd = random.Random(7)
    kinds = ["gel", "elixir", "gel", "whale", "gel", "elixir", "gel"]
    for n, k in enumerate(kinds):
        b = bottles[k].copy()
        b.alpha_composite(grime(k, 40 + n))
        b.alpha_composite(corks[k], CORK_POS[k])
        x = 2 + n * 8 + rnd.randint(-1, 1)
        y = 2 + (n % 2) * 3
        im.alpha_composite(b, (x, y))
    t = tag.copy()
    im.alpha_composite(t, (40, 9))
    f = ImageDraw.Draw(im)
    f.rectangle([0, 18, W - 1, H - 1], fill=hx("#b07a44"))
    for y in (18, 30, H - 1):
        f.line([(0, y), (W - 1, y)], fill=hx("#7a4e28"))
    f.line([(0, 18), (0, H - 1)], fill=hx("#7a4e28")); f.line([(W - 1, 18), (W - 1, H - 1)], fill=hx("#7a4e28"))
    f.rectangle([W // 2 - 12, 22, W // 2 + 11, 38], fill=hx("#f4e8c8"), outline=hx("#7a4e28"))
    for x in (2, W - 3):
        f.point((x, 20), fill=hx("#c9d2de")); f.point((x, H - 3), fill=hx("#c9d2de"))
    return outline(im)


def bucket():
    """桶（56x48）：奥（縁の奥と水面）・水（容器に重ねる半透明）・手前の壁"""
    W, H = 56, 48
    back = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(back)
    d.ellipse([1, 2, W - 2, 20], fill=hx("#8a5a30"))
    d.ellipse([4, 4, W - 5, 18], fill=hx("#3d6f8e"))
    d.ellipse([8, 6, W - 9, 15], fill=hx("#4f88a8"))
    for x, y in ((14, 9), (30, 7), (40, 12), (22, 13)):
        d.line([(x, y), (x + 4, y)], fill=hx("#9fd0e8"))
    water = Image.new("RGBA", (W, H), (0, 0, 0, 0)); w = ImageDraw.Draw(water)
    w.ellipse([4, 9, W - 5, 18], fill=(70, 130, 170, 90))
    w.rectangle([4, 14, W - 5, 30], fill=(60, 115, 155, 110))
    for x in range(8, W - 8, 5):
        w.point((x, 10 + (x // 5) % 2), fill=(200, 235, 250, 200))
    front = Image.new("RGBA", (W, H), (0, 0, 0, 0)); f = ImageDraw.Draw(front)
    f.chord([1, 2, W - 2, 20], 0, 180, fill=hx("#a8703f"))
    f.chord([4, 4, W - 5, 18], 0, 180, fill=(0, 0, 0, 0))
    f.polygon([(1, 11), (W - 2, 11), (W - 6, H - 1), (5, H - 1)], fill=hx("#a8703f"))
    f.chord([4, 4, W - 5, 18], 0, 180, fill=(0, 0, 0, 0))
    for x in range(9, W - 8, 7):
        f.line([(x, 20), (x + 1, H - 2)], fill=hx("#8a5a30"))
    for y in (22, 40):
        f.line([(2 + (y - 11) // 9, y), (W - 3 - (y - 11) // 9, y)], fill=hx("#6a6a74"))
        f.line([(2 + (y - 11) // 9, y + 1), (W - 3 - (y - 11) // 9, y + 1)], fill=hx("#9a9aa4"))
    return outline(back), water, front


def cloth():
    rows = [
        "..................",
        "..YYYYYYYYYYYYYY..",
        ".YYUYYYYYYYYUYYYY.",
        ".YYUYYYYYYYYUYYYY.",
        ".YYYYYYYYYYYYYYYY.",
        ".YYUYYYYYYYYUYYYY.",
        ".yyyyyyyyyyyyyyyy.",
        ".YYUYYYYYYYYUYYYY.",
        ".YYYYYYYYYYYYYYYY.",
        ".YYUYYYYYYYYUYYYY.",
        ".YYYYYYYYYYYYYYYy.",
        "..yyyyyyyyyyyyyy..",
        "..................",
        "..................",
    ]
    rows = [r.replace("U", "u") for r in rows]
    C["u"] = hx("#7aa0c8") + (255,)
    return outline(grid(rows))


def rack():
    """乾燥棚（92x58）：上下2段、各段に逆さの容器を挿す5本の棒"""
    W, H = 92, 58
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 2, H - 1], fill=hx("#8a5a30")); d.rectangle([W - 3, 0, W - 1, H - 1], fill=hx("#8a5a30"))
    for r in range(2):
        by = 22 + r * 28
        d.rectangle([0, by, W - 1, by + 3], fill=hx("#b07a44"))
        d.line([(0, by + 3), (W - 1, by + 3)], fill=hx("#7a4e28"))
        for c in range(5):
            px = 4 + c * 17 + 8
            d.rectangle([px - 1, by - 6, px, by - 1], fill=hx("#d6a868"))
    d.rectangle([0, 0, W - 1, 2], fill=hx("#b07a44"))
    return outline(im)


def tray():
    """栓のトレー（64x30）：5x2 のくぼみ"""
    W, H = 64, 30
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W - 1, H - 1], fill=hx("#8a5a30"))
    d.rectangle([1, 1, W - 2, H - 2], fill=hx("#a8703f"))
    for r in range(2):
        for c in range(5):
            x, y = 3 + c * 12, 3 + r * 13
            d.rectangle([x, y, x + 10, y + 10], fill=hx("#6a4024"))
            d.line([(x, y), (x + 10, y)], fill=hx("#4a2c18"))
    return outline(im)


def cushion_box():
    """緩衝材入りの箱（92x52）：奥（中の詰め物）・手前の壁・ふた"""
    W, H = 92, 52
    back = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(back)
    d.polygon([(0, 10), (6, 2), (W - 7, 2), (W - 1, 10)], fill=hx("#9a7a52"))
    d.polygon([(3, 10), (8, 5), (W - 9, 5), (W - 4, 10)], fill=hx("#4a3624"))
    d.rectangle([3, 10, W - 4, 30], fill=hx("#4a3624"))
    rnd = random.Random(3)
    for _ in range(170):
        x, y = rnd.randint(4, W - 5), rnd.randint(6, 30)
        d.point((x, y), fill=hx(rnd.choice(["#e8d090", "#c8a868", "#f2e2b0"])))
    front = Image.new("RGBA", (W, H), (0, 0, 0, 0)); f = ImageDraw.Draw(front)
    f.rectangle([0, 24, W - 1, H - 1], fill=hx("#c8a070"))
    f.rectangle([0, 24, W - 1, 26], fill=hx("#d8b888"))
    f.line([(0, 24), (W - 1, 24)], fill=hx("#7a5a38"))
    f.line([(0, H - 1), (W - 1, H - 1)], fill=hx("#7a5a38"))
    f.line([(0, 24), (0, H - 1)], fill=hx("#7a5a38")); f.line([(W - 1, 24), (W - 1, H - 1)], fill=hx("#7a5a38"))
    f.rectangle([W // 2 - 16, 31, W // 2 + 15, 45], fill=hx("#f4e8c8"), outline=hx("#7a5a38"))
    f.line([(W // 2 - 12, 36), (W // 2 + 11, 36)], fill=hx("#b0a080")); f.line([(W // 2 - 12, 40), (W // 2 + 5, 40)], fill=hx("#b0a080"))
    for x in range(5, W - 5, 6):
        f.point((x, 25), fill=hx("#f2e2b0"))
    lid = Image.new("RGBA", (W, H), (0, 0, 0, 0)); l = ImageDraw.Draw(lid)
    l.polygon([(0, 24), (6, 4), (W - 7, 4), (W - 1, 24)], fill=hx("#d8b888"))
    l.line([(0, 24), (6, 4), (W - 7, 4), (W - 1, 24)], fill=hx("#7a5a38"))
    l.line([(W // 2, 4), (W // 2, 24)], fill=hx("#b89868"))
    l.rectangle([0, 22, W - 1, 27], fill=hx("#c8a070"), outline=hx("#7a5a38"))
    return outline(back), front, outline(lid)


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {}
    bottles, corks = {}, {}
    for k in BOTTLE:
        b = grid(BOTTLE[k], 20)
        bottles[k] = b
        b.save(os.path.join(OUT, f"bottle_{k}.png")); out["bottle_" + k] = b
        g = grime(k, {"gel": 11, "elixir": 23, "whale": 31}[k]); g.save(os.path.join(OUT, f"grime_{k}.png")); out["grime_" + k] = g
        dr = drops(k, {"gel": 5, "elixir": 9, "whale": 13}[k]); dr.save(os.path.join(OUT, f"drops_{k}.png")); out["drops_" + k] = dr
        c = outline(grid(CORK[k])); corks[k] = c
        c.save(os.path.join(OUT, f"cork_{k}.png")); out["cork_" + k] = c
    tag = outline(grid(TAG)); tag.save(os.path.join(OUT, "tag.png")); out["tag"] = tag
    rb = return_box(bottles, corks, tag); rb.save(os.path.join(OUT, "returnbox.png")); out["returnbox"] = rb
    bb, bw, bf = bucket()
    bb.save(os.path.join(OUT, "bucket_back.png")); bw.save(os.path.join(OUT, "bucket_water.png")); bf.save(os.path.join(OUT, "bucket_front.png"))
    cl = cloth(); cl.save(os.path.join(OUT, "cloth.png")); out["cloth"] = cl
    rk = rack(); rk.save(os.path.join(OUT, "rack.png")); out["rack"] = rk
    tr = tray(); tr.save(os.path.join(OUT, "tray.png")); out["tray"] = tr
    xb, xf, xl = cushion_box()
    xb.save(os.path.join(OUT, "cbox_back.png")); xf.save(os.path.join(OUT, "cbox_front.png")); xl.save(os.path.join(OUT, "cbox_lid.png"))
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        K = 3
        sheet = Image.new("RGBA", (900, 620), (138, 96, 64, 255))
        def put(im, x, y):
            sheet.alpha_composite(im.resize((im.width * K, im.height * K), Image.NEAREST), (x, y))
        x = 10
        for k in BOTTLE:
            put(bottles[k], x, 10)
            dirty = bottles[k].copy(); dirty.alpha_composite(out["grime_" + k]); put(dirty, x + 60, 10)
            wet = bottles[k].copy(); wet.alpha_composite(out["drops_" + k]); put(wet, x + 120, 10)
            put(corks[k], x + 180, 10)
            x += 210
        put(tag, 540, 10)
        put(rb, 10, 100)
        comp = bb.copy(); comp.alpha_composite(bottles["gel"], (20, 0)); comp.alpha_composite(bw); comp.alpha_composite(bf); put(comp, 210, 100)
        put(cl, 400, 100)
        put(rk, 10, 260); put(tr, 300, 260)
        comp = xb.copy(); comp.alpha_composite(xf); put(comp, 10, 440)
        comp = xb.copy(); comp.alpha_composite(xf); comp.alpha_composite(xl); put(comp, 300, 440)
        sheet.save(sys.argv[2])
    print("ok")


if __name__ == "__main__":
    main()
