#!/usr/bin/env python3
"""受付嬢（48x48）を描く。img/clerk_work.png（営業中）, img/clerk_rest.png（深夜・休憩）
PNG を直接手直しして差し替えても、ゲーム側はそのまま読み込む。
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from gen_sprites import hx, shade, outline, IMG  # noqa: E402

SZ = 48
HAIR = "#b8714a"
PAL = {
    "H": hx(HAIR), "h": shade(HAIR, -0.28), "d": shade(HAIR, -0.45), "j": shade(HAIR, 0.32),
    "S": hx("#ffe2cc"), "s": hx("#f1b99a"), "P": hx("#ff9eaa"),
    "E": hx("#2b1d2e"), "I": hx("#2f9c70"), "J": hx("#1b5a44"), "i": hx("#8fe0b8"), "w": hx("#ffffff"),
    "m": hx("#b0465a"), "M": hx("#e07a8a"),
    "O": hx("#2d3f72"), "o": hx("#1f2c52"), "q": hx("#4a62a0"),
    "W": hx("#f6f3ea"), "V": hx("#cfc8b8"),
    "R": hx("#d6404f"), "r": hx("#962a38"),
    "G": hx("#f2c64a"), "g": hx("#b48a22"),
    "K": hx("#efe8dc"), "k": hx("#c9bca8"),  # マグ
    "T": hx("#9a5a32"), "t": hx("#6a3a1e"),  # お茶
    "Z": hx("#ffffff"),
}


class Grid:
    def __init__(self):
        self.g = [["."] * SZ for _ in range(SZ)]

    def put(self, x, y, ch):
        if 0 <= x < SZ and 0 <= y < SZ:
            self.g[y][x] = ch

    def get(self, x, y):
        return self.g[y][x] if 0 <= x < SZ and 0 <= y < SZ else "."

    def span(self, y, x0, x1, ch):
        for x in range(x0, x1 + 1):
            self.put(x, y, ch)

    def ellipse(self, cx, cy, rx, ry, ch):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.0:
                    self.put(x, y, ch)

    def sym(self, x, y, ch):
        """中央（23|24）を軸に左右対称に置く"""
        self.put(x, y, ch)
        self.put(SZ - 1 - x, y, ch)

    def sym_span(self, y, x0, x1, ch):
        for x in range(x0, x1 + 1):
            self.sym(x, y, ch)

    def image(self):
        im = Image.new("RGBA", (SZ, SZ), (0, 0, 0, 0))
        px = im.load()
        for y in range(SZ):
            for x in range(SZ):
                c = self.g[y][x]
                if c != ".":
                    px[x, y] = PAL[c] + (255,)
        return im


FACE_HALF = {9: 9, 10: 10, 11: 11, 12: 11, 13: 11, 14: 11, 15: 11, 16: 11, 17: 11, 18: 11, 19: 11,
             20: 11, 21: 11, 22: 11, 23: 10, 24: 10, 25: 9, 26: 8, 27: 6, 28: 4}
# 前髪の下端（x -> y）。顔の幅 x13..34
BANG = [13, 14, 15, 14, 12, 11, 13, 15, 16, 14, 12, 11, 11, 13, 15, 16, 14, 12, 11, 12, 14, 15, 14, 13]


def draw_back_hair(G):
    G.ellipse(24, 17, 17.5, 16, "h")
    for y in range(18, 46):
        half = 17 - max(0, (y - 38)) * 1
        G.span(y, 24 - half, 23 + half, "h")
    for y in range(40, 46):
        for x in range(24 - 17, 24 + 17):
            if (x + y) % 5 == 0 and y > 42:
                G.put(x, y, ".")


def draw_body(G, rest=False):
    # 首
    for y in range(26, 31):
        G.span(y, 21, 26, "s" if y < 29 else "S")
    # 肩から下
    for y in range(30, SZ):
        half = min(18, 8 + (y - 30) * 2)
        G.span(y, 24 - half, 23 + half, "O")
    # 腕の境目
    for y in range(35, SZ):
        G.sym(13, y, "o")
        G.sym(12, y, "q" if y < 40 else "O")
    # 袖口（白）
    for y in (45, 46):
        G.sym_span(y, 7, 12, "W")
    G.sym_span(47, 7, 12, "V")
    # ブラウスの襟（V字）
    for i, y in enumerate(range(30, 41)):
        half = max(0, 5 - i // 2)
        if half:
            G.span(y, 24 - half, 23 + half, "W")
    G.sym(19, 30, "V"); G.sym(18, 31, "V"); G.sym(20, 31, "W")
    # 襟の縁取り
    for i, y in enumerate(range(31, 41)):
        half = max(0, 5 - i // 2)
        if half:
            G.sym(24 - half - 1, y, "q")
    # リボン
    G.sym_span(31, 19, 23, "R")
    G.sym_span(32, 18, 23, "R")
    G.sym_span(33, 19, 22, "r")
    G.sym_span(32, 22, 23, "r")
    G.sym_span(31, 23, 23, "r")
    for y in (34, 35, 36):
        G.sym(22, y, "R"); G.sym(21, y + 1, "r")
    # 金ボタン
    for y in (40, 43, 46):
        G.sym(21, y, "G")
    # 胸の徽章
    G.put(31, 37, "G"); G.put(32, 37, "G"); G.put(31, 38, "g"); G.put(32, 38, "G")


def draw_face(G):
    for y, half in FACE_HALF.items():
        G.span(y, 24 - half, 23 + half, "S")
    # 輪郭の影
    for y, half in FACE_HALF.items():
        if y >= 23:
            G.sym(24 - half, y, "s")
    # 頬
    for x in (14, 15, 16):
        G.sym(x, 23, "P")
    G.sym(15, 22, "P")


def draw_eyes(G, closed=False):
    if closed:
        for x in range(15, 20):
            G.sym(x, 20, "E")
        G.sym(14, 19, "E"); G.sym(20, 19, "E")
        return
    # まつ毛
    G.sym_span(17, 15, 19, "E")
    G.sym(14, 18, "E"); G.sym(20, 17, "E")
    # 瞳 x15..19, y18..22
    for y in range(18, 23):
        G.sym_span(y, 15, 19, "I")
    for y in (19, 20, 21):
        G.sym_span(y, 16, 18, "J")
    G.sym_span(22, 16, 18, "i"); G.sym(15, 22, "I"); G.sym(19, 22, "I")
    G.sym(15, 18, "E"); G.sym(19, 18, "E")
    G.sym(15, 23, "s"); G.sym(19, 23, "s")
    G.sym_span(23, 16, 18, "E")
    # ハイライト（同じ向き）
    for x0 in (16, 29):
        G.put(x0, 19, "w"); G.put(x0 + 1, 19, "w"); G.put(x0, 20, "w")
        G.put(x0 + 2, 21, "i")


def draw_mouth(G, smile=True):
    if smile:
        G.put(22, 25, "m"); G.put(25, 25, "m"); G.put(23, 26, "m"); G.put(24, 26, "m")
    else:
        G.put(23, 26, "m"); G.put(24, 26, "m")


def draw_front_hair(G):
    # 頭頂
    top = Grid()
    top.ellipse(24, 10.5, 13.5, 9.5, "H")
    for y in range(0, 12):
        for x in range(SZ):
            if top.g[y][x] != ".":
                G.put(x, y, "H")
    # 前髪
    for i, by in enumerate(BANG):
        x = 13 + i
        for y in range(4, by + 1):
            G.put(x, y, "H")
        G.put(x, by, "h")
    for x in range(10, 38):
        if G.get(x, 12) == "H" and x % 3 == 0:
            G.put(x, 13, G.get(x, 13))
    # 横の房（顔の両脇から胸元へ）
    for y in range(11, 42):
        w = 3 if y < 30 else (2 if y < 38 else 1)
        for k in range(w + 2):
            G.sym(9 + k, y, "H")
        G.sym(9 + w + 1, y, "h")
        if y > 36:
            G.sym(9, y, ".")
    # 光
    for x in range(16, 23):
        G.put(x, 5, "j")
    for x in range(14, 19):
        G.put(x, 6, "j")
    for x in range(27, 33):
        G.put(x, 5, "j")
    G.put(31, 6, "j"); G.put(32, 6, "j")
    # 毛先の影
    for i, by in enumerate(BANG):
        x = 13 + i
        if by >= 16:
            G.put(x, by - 1, "h")


def draw_cap(G):
    G.ellipse(31, 4.5, 8.5, 3.5, "O")
    G.span(7, 23, 39, "o")
    G.span(6, 23, 39, "q")
    G.span(1, 28, 34, "q")
    G.put(32, 3, "G"); G.put(33, 3, "G"); G.put(32, 4, "g"); G.put(33, 4, "G")
    G.put(39, 5, "R"); G.put(40, 6, "R"); G.put(40, 7, "r")


def draw_hands_work(G):
    # 胸の前で手を重ねる
    for y in (43, 44, 45):
        G.span(y, 18, 29, "S")
    G.span(46, 19, 28, "s")
    for x in (21, 24, 27):
        G.put(x, 44, "s")
    G.put(18, 43, "s"); G.put(29, 43, "s")


def draw_mug(G):
    # マグを両手で持つ
    for y in range(37, 46):
        G.span(y, 19, 28, "K")
    G.span(37, 19, 28, "k")
    G.span(38, 20, 27, "T")
    G.span(39, 20, 27, "t")
    for y in range(40, 46):
        G.put(28, y, "k")
    G.span(46, 19, 28, "k")
    G.put(30, 40, "K"); G.put(30, 41, "K"); G.put(30, 42, "K"); G.put(29, 39, "K"); G.put(29, 43, "K")
    for y in (42, 43, 44, 45):
        G.span(y, 16, 18, "S"); G.span(y, 29, 31, "S")
    G.span(46, 16, 18, "s"); G.span(46, 29, 31, "s")
    G.put(24, 41, "R"); G.put(23, 42, "R"); G.put(25, 42, "R"); G.put(24, 43, "R")
    # 湯気
    for (x, y) in ((22, 34), (23, 33), (22, 32), (26, 35), (27, 34), (26, 33)):
        G.put(x, y, "Z")


def build(rest=False):
    G = Grid()
    draw_back_hair(G)
    draw_body(G, rest)
    draw_face(G)
    draw_eyes(G, closed=rest)
    draw_mouth(G, smile=True)
    draw_front_hair(G)
    if not rest:
        draw_cap(G)
        draw_hands_work(G)
    else:
        draw_mug(G)
    return outline(G.image())


def main():
    work = build(False)
    rest = build(True)
    work.save(os.path.join(IMG, "clerk_work.png"))
    rest.save(os.path.join(IMG, "clerk_rest.png"))
    if "--preview" in sys.argv:
        bg = Image.new("RGBA", (SZ * 2 * 6 + 12, SZ * 6), (120, 104, 92, 255))
        bg.alpha_composite(work.resize((SZ * 6, SZ * 6), Image.NEAREST), (0, 0))
        bg.alpha_composite(rest.resize((SZ * 6, SZ * 6), Image.NEAREST), (SZ * 6 + 12, 0))
        bg.save("/tmp/clerk_preview.png")
    print("ok")


if __name__ == "__main__":
    main()
