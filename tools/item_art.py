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
    "L": hx("#a8703f"), "l": hx("#6a4024"), "D": hx("#2a1a12"), "B": hx("#8a5a30"),
    "U": hx("#4a8ad8"), "u": hx("#2a5a9a"),
    "O": hx("#f2a33a"), "o": hx("#b86a1a"),
    "Q": hx("#4a4250"), "q": hx("#2a2230"),
    "P": hx("#cdb0ec"), "p": hx("#9070c0"), "H": hx("#f6f2fa"),
    "E": hx("#f08ab0"), "e": hx("#b04a78"), "A": hx("#e8eef4"), "C": hx("#f2e2b8"), "c": hx("#b08850"),
    "T": hx("#2c3e78"), "t": hx("#18224a"), "F": hx("#7ab84a"), "f": hx("#4a7a2a"),
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
        "..VXwYYYYYYYXV..",
        "..VXwYYRYRYYXV..",
        "..VXXYRRRRRYxV..",
        "..VXXYYRRRYYxV..",
        "..VxXYYYRYYYxV..",
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


CRATE_S_BODY = [
    "..kKKKKKKKKKKk..",
    "..kkkkkkkkkkkk..",
    "..kKKKKKKKKKKk..",
    "..kKkKKKKKKkKk..",
    "..kKKKKKKKKKKk..",
    "..kkkkkkkkkkkk..",
    "..kKKKKKKKKKKk..",
    "..kKkKKKKKKkKk..",
    "..kkkkkkkkkkkk..",
    "................",
]
ICONS.update({
    "pouch": [
        "................",
        "......lLLl......",
        ".......GG.......",
        "......LLLL......",
        ".....LLLLLL.....",
        "....LLLLLLLL....",
        "...LLLlLLLLLL...",
        "...LLLLLLLLLL...",
        "..LLLLLLLLLLLL..",
        "..LLLLLLLLLLlL..",
        "..LlLLLLLLLLlL..",
        "..lLLLLLLLLLll..",
        "...llLLLLLLll...",
        "....llllllll....",
        "................",
        "................",
    ],
    "pouch_open": [
        "................",
        "................",
        "................",
        "...LLLLLLLLLL...",
        "..LDDDDDDDDDDL..",
        "..LDDYDDDYDDDL..",
        "...LLLLLLLLLL...",
        "..LLLLLLLLLLLL..",
        "..LLLLLLLLLLLL..",
        "..LLLLLLLLLLlL..",
        "..LlLLLLLLLLlL..",
        "..lLLLLLLLLLll..",
        "...llLLLLLLll...",
        "....llllllll....",
        "................",
        "................",
    ],
    "crate_s": [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        "..kKKKKKKKKKKk..",
        "..kKkKKKKKKkKk..",
        "..kkkkkkkkkkkk..",
    ] + CRATE_S_BODY,
    "crate_s_open": [
        "................",
        "................",
        "..kkkkkkkkkkkk..",
        "..kDYDDYDDDYDk..",
        "..kYDDDYDYDDYk..",
        "..kkkkkkkkkkkk..",
    ] + CRATE_S_BODY,
    "envelope": [
        "................",
        "................",
        "................",
        ".yyyyyyyyyyyyyy.",
        ".yYyYYYYYYYYyYy.",
        ".yYYyYYYYYYyYYy.",
        ".yYYYyYYYYyYYYy.",
        ".yYYYYyRRyYYYYy.",
        ".yYYYYYRRYYYYYy.",
        ".yYYYYYYYYYYYYy.",
        ".yYYYYYYYYYYYYy.",
        ".yYYYYYYYYYYYYy.",
        ".yyyyyyyyyyyyyy.",
        "................",
        "................",
        "................",
    ],
})


ICONS.update({
    # クジラ酒：鯨のラベルの小瓶
    "whale": [
        "................",
        "......kKKk......",
        "......kKKk......",
        ".......VV.......",
        "......VWWV......",
        ".....VUUUUV.....",
        "....VUwUUUUV....",
        "....VUwYYYYV....",
        "....VUYuuuYV....",
        "....VUuuuYuV....",
        "....VUYYYYYV....",
        "....VuUUUUuV....",
        ".....VVVVVV.....",
        "................",
        "................",
        "................",
    ],
    # 陽飴：両端をねじった包み紙
    "candy": [
        "................",
        "................",
        "................",
        "................",
        "................",
        "..o...oooo...o..",
        "..oo.oOOOOo.oo..",
        "..oOoOOwOOOoOo..",
        "..oOOOOOOOOOOo..",
        "..oOoOOOOOOoOo..",
        "..oo.oOOOOo.oo..",
        "..o...oooo...o..",
        "................",
        "................",
        "................",
        "................",
    ],
    # 黒包帯：雷マークの包装
    "bband": [
        "................",
        "................",
        "...........qq...",
        "...qqqqqqqqqqq..",
        "...qQQQQQGQQq...",
        "...qQQQQGGQQq...",
        "...qQQQGGQQQq...",
        "...qQQGGGGGQq...",
        "...qQQQQGGQQq...",
        "...qQQQGGQQQq...",
        "...qQQQGQQQQq...",
        "...qQQQQQQQQq...",
        "...qqqqqqqqqq...",
        "................",
        "................",
        "................",
    ],
    # 中和剤：薄紫の粉の小袋
    "neut": [
        "................",
        "......g..g......",
        ".......gg.......",
        "......HHHH......",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....HPPPPPPH....",
        "...HPpPPPPpPH...",
        "...HPPPpPPPPH...",
        "...HPPPPPpPPH...",
        "...HHPPPPPPHH...",
        "....HHHHHHHH....",
        "................",
        "................",
        "................",
        "................",
    ],
})


# ---------------- 一時保管の預かり物 ----------------
def _blank(rows):
    out = rows + ["." * 16] * (16 - len(rows))
    return out


def _swap(rows, table):
    return ["".join(table.get(ch, ch) for ch in r) for r in rows]


DEPOSITS = {
    "watch": _blank([
        "................",
        ".......GG.......",
        "......G..G......",
        ".......GG.......",
        ".....MMMMMM.....",
        "....MAAAAAAM....",
        "...MAAAANAAAM...",
        "...MAAAANAAAM...",
        "...MAAAANNNAM...",
        "...MAAAAAAAAM...",
        "...MAAAAAAAAM...",
        "....MAAAAAAM....",
        ".....MMMMMM.....",
    ]),
    "letters": _blank([
        "................",
        "................",
        "................",
        "..YYYYYYYYYYY...",
        ".yYYYYYRYYYYYy..",
        ".yYYyYYRYYyYYy..",
        ".yYYYyYRYyYYYy..",
        ".yRRRRRRRRRRRy..",
        ".yYYYYYRYYYYYy..",
        ".yYYYYYRYYYYYy..",
        ".yyyyyyRyyyyyy..",
        "..yyyyyyyyyyyy..",
    ]),
    "doll": _blank([
        "................",
        "......kKKk......",
        ".....kKKKKk.....",
        ".....KNKKNK.....",
        ".....KKKKKK.....",
        "......kKKk......",
        "....kKKKKKKk....",
        "...kK.KKKK.Kk...",
        "...k..KKKK..k...",
        "......KKKK......",
        "......KkkK......",
        ".....KK..KK.....",
        ".....kk..kk.....",
    ]),
    "scarf": _blank([
        "................",
        "................",
        "................",
        "................",
        "...RRRRRRRRRR...",
        "..RRrRRRRRRrRR..",
        "..RRRrRRRRrRRR..",
        "...RRRrRRrRRR...",
        "....RRRrrRRR....",
        ".....RRRRRR.....",
        "......RRRR......",
        "......R.R.R.....",
        ".....R.R.R.R....",
    ]),
    "keys": _blank([
        "................",
        "................",
        ".....gGGGg......",
        "....g.....g.....",
        "....g.....g.....",
        ".....gGGGg......",
        "....G..G..G.....",
        "....G..G..G.....",
        "....G..G..G.....",
        "...GG..GG.GG....",
        "....G..G..G.....",
        "...GG.GG...GG...",
    ]),
    "quill": _blank([
        "................",
        "...........WW...",
        "..........WWWV..",
        ".........WWWV...",
        "........WWWV....",
        ".......WWWV.....",
        "......WWWV......",
        ".....WWWV.......",
        "....WWV.........",
        "...WV...........",
        "..N.............",
        ".N..............",
    ]),
    "jewel": _blank([
        "................",
        "................",
        "................",
        "................",
        "...PPPPPPPPPP...",
        "..PppppppppppP..",
        "..GGGGGGGGGGGG..",
        "..PPPPPXXPPPPP..",
        "..PPPPPGGPPPPP..",
        "..PPPPPPPPPPPP..",
        "..pppppppppppp..",
        "..GGGGGGGGGGGG..",
    ]),
    "compass": _blank([
        "................",
        "................",
        "................",
        ".....gGGGGg.....",
        "....gCCCCCCg....",
        "...gCCCCRCCCg...",
        "...gCCCRRCCCg...",
        "...gCCCNNCCCg...",
        "...gCCCWWCCCg...",
        "...gCCCCWCCCg...",
        "....gCCCCCCg....",
        ".....gGGGGg.....",
    ]),
    "mittens": _blank([
        "................",
        "................",
        "................",
        "................",
        "..UUU.....UUU...",
        ".UUUUU...UUUUU..",
        ".UUUUUU.UUUUUU..",
        ".UUUUUU.UUUUUU..",
        ".UUUUU...UUUUU..",
        ".UUUUU...UUUUU..",
        ".WWWWW...WWWWW..",
        ".WWWWW...WWWWW..",
    ]),
}
# 支給品に似た見た目のもの（形はほぼ同じで、色やラベルが違う）
DEPOSITS["perfume"] = _swap(ICONS["gel"], {"k": "g", "K": "G", "R": "E"})
DEPOSITS["perfume"][9] = "..VXXYEYEYYXxV.."
DEPOSITS["perfume"][10] = "..VXXYYEYYYxxV.."
DEPOSITS["perfume"][8] = "..VXwYYYYYYXXV.."
DEPOSITS["ink"] = _swap(ICONS["elixir"], {"Z": "T", "z": "t", "G": "N", "g": "N", "w": "u"})
DEPOSITS["drops"] = _swap(ICONS["whale"], {"U": "X", "u": "x"})
DEPOSITS["drops"][8] = "....VXYYNYYV...."
DEPOSITS["drops"][9] = "....VXYNNNYV...."
DEPOSITS["caramel"] = _swap(ICONS["candy"], {"O": "C", "o": "c"})
DEPOSITS["notebook"] = _swap(ICONS["bband"], {"G": "A"})
DEPOSITS["notebook"][4:11] = [
    "...qQQQQQQQQq...",
    "...qQQQQAQQQq...",
    "...qQQQAAAQQq...",
    "...qQQAAAAAQq...",
    "...qQQQAAAQQq...",
    "...qQQAQQQAQq...",
    "...qQQQQQQQQq...",
]
DEPOSITS["tea"] = _swap(ICONS["neut"], {"P": "F", "p": "f"})


def crate_l(open_):
    """大きな木箱 24x24"""
    rows = []
    rows.append("." * 24)
    rows.append("." * 24)
    rows.append("." + "k" * 22 + ".")
    if open_:
        rows.append(".k" + "DYDDYDDDYDYDDYDDYDDY" + "k.")
        rows.append(".k" + "YDDDYDYDDDDYDYDDDYDD" + "k.")
        rows.append(".k" + "DDYDDDDYDYDDDDYDYDDY" + "k.")
    else:
        rows.append(".k" + "K" * 20 + "k.")
        rows.append(".k" + "KkKKKKKKKKKKKKKKKKkK" + "k.")
        rows.append(".k" + "K" * 20 + "k.")
    rows.append("." + "k" * 22 + ".")
    for i in range(14):
        r = ["K"] * 20
        if i in (4, 9):
            r = ["k"] * 20
        else:
            d = int(i * 19 / 13)
            r[d] = "k"
            if d + 1 < 20: r[d + 1] = "B"
        if i in (1, 12):
            r[1] = "M"; r[18] = "M"
        rows.append(".k" + "".join(r) + "k.")
    rows.append("." + "k" * 22 + ".")
    rows.append("." * 24)
    rows.append("." * 24)
    return rows


def icon(rows):
    size = len(rows[0])
    im = Image.new("RGBA", (size, len(rows)), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        assert len(r) == size, r
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
    icon(crate_l(False)).save(os.path.join(IMG, "item_crate_l.png"))
    for k, rows in DEPOSITS.items():
        icon(rows).save(os.path.join(IMG, f"dep_{k}.png"))
    if "--preview" in sys.argv:
        dp = Image.new("RGBA", (len(DEPOSITS) * 80, 80), (120, 104, 92, 255))
        for i, k in enumerate(DEPOSITS):
            dp.alpha_composite(icon(DEPOSITS[k]).resize((80, 80), Image.NEAREST), (i * 80, 0))
        dp.save("/tmp/dep_preview.png")
    icon(crate_l(True)).save(os.path.join(IMG, "item_crate_l_open.png"))
    lobby_bg().save(os.path.join(IMG, "bg_lobby.png"))
    if "--preview" in sys.argv:
        bg = Image.new("RGBA", (16 * 6 * len(ICONS), 16 * 6), (120, 104, 92, 255))
        for i, k in enumerate(ICONS):
            bg.alpha_composite(icon(ICONS[k]).resize((96, 96), Image.NEAREST), (i * 96, 0))
        bg2 = Image.new("RGBA", (bg.width, 96 + 24 * 4), (120, 104, 92, 255))
        bg2.alpha_composite(bg, (0, 0))
        bg2.alpha_composite(icon(crate_l(False)).resize((96, 96), Image.NEAREST), (0, 96))
        bg2.alpha_composite(icon(crate_l(True)).resize((96, 96), Image.NEAREST), (110, 96))
        bg = bg2
        bg.save("/tmp/items_preview.png")
    print("ok")


if __name__ == "__main__":
    main()
