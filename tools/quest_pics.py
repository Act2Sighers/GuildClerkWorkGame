#!/usr/bin/env python3
"""クエスト要請の写しに載せる「写真や絵」（80x56）を描く。25種類の景色 × 2（時間帯や天気）＝ 50枚。
  python3 tools/quest_pics.py [--preview 出力先.png]
出力: img/qpic_00.png 〜 img/qpic_49.png（偶数＝昼、奇数＝夕方・夜・雪・霧など）
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")
W, H = 80, 56


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


SKY = {
    "day": ("#6fa8dc", "#d8ecf6"), "dusk": ("#5a4a8a", "#f4a868"), "night": ("#0e1430", "#2a3460"),
    "snow": ("#a8b8c8", "#e8eef4"), "fog": ("#b8c0b8", "#dfe4dc"), "rain": ("#5a6470", "#9aa4ac"),
}
TINT = {"day": (1, 1, 1), "dusk": (1.0, .78, .62), "night": (.42, .48, .72), "snow": (.92, .96, 1.04), "fog": (.9, .94, .9), "rain": (.7, .76, .82)}


class Pic:
    def __init__(self, seed, tod):
        self.im = Image.new("RGB", (W, H)); self.d = ImageDraw.Draw(self.im)
        self.r = random.Random(seed); self.tod = tod; self.lights = []

    def sky(self, horizon=30):
        a, b = (hx(c) for c in SKY[self.tod])
        for y in range(H):
            self.d.line([(0, y), (W, y)], fill=mix(a, b, min(1, y / max(1, horizon))))
        if self.tod == "day":
            for _ in range(self.r.randint(1, 3)):
                cx, cy = self.r.randint(5, 75), self.r.randint(3, 14)
                for k in range(4):
                    self.d.ellipse([cx + k * 4 - 5, cy - 3 + (k % 2), cx + k * 4 + 3, cy + 3], fill=(244, 248, 252))
            if self.r.random() < .5:
                for _ in range(3):
                    x, y = self.r.randint(30, 70), self.r.randint(6, 16)
                    self.d.point((x, y), fill=(40, 40, 50)); self.d.point((x - 1, y - 1), fill=(40, 40, 50)); self.d.point((x + 1, y - 1), fill=(40, 40, 50))
        elif self.tod == "dusk":
            self.d.ellipse([58, horizon - 12, 70, horizon], fill=(255, 210, 140))
        elif self.tod == "night":
            for _ in range(22):
                self.d.point((self.r.randint(0, W - 1), self.r.randint(0, horizon)), fill=(230, 230, 200))
            self.d.ellipse([62, 4, 70, 12], fill=(240, 236, 200)); self.d.ellipse([65, 3, 72, 11], fill=hx(SKY["night"][0]))

    def hills(self, y, col, amp=4, seed=0):
        pts = [(0, H)]
        for x in range(0, W + 4, 4):
            pts.append((x, y + math.sin((x + seed * 13) / 9) * amp + math.sin((x + seed * 7) / 4) * amp / 3))
        pts.append((W, H)); self.d.polygon(pts, fill=hx(col))

    def ground(self, y, col, speck=None):
        self.d.rectangle([0, y, W, H], fill=hx(col))
        if speck:
            for _ in range(70):
                self.d.point((self.r.randint(0, W - 1), self.r.randint(y, H - 1)), fill=hx(speck))

    def mountain(self, x, y, w, h, col, snow=True):
        c = hx(col)
        self.d.polygon([(x - w, y), (x + w, y), (x, y - h)], fill=c)
        self.d.polygon([(x, y - h), (x + w, y), (x + w // 3, y)], fill=mix(c, (0, 0, 0), .2))
        if snow:
            self.d.polygon([(x - w // 4, y - h + h // 3), (x, y - h + h // 4 + 2), (x + w // 4, y - h + h // 3), (x, y - h)], fill=(240, 244, 248))

    def pine(self, x, y, h, col="#2e5a34"):
        c = hx(col)
        self.d.line([(x, y), (x, y - 3)], fill=(90, 60, 36))
        for k in range(3):
            ww = h // 3 - k
            yy = y - 2 - k * (h // 4)
            self.d.polygon([(x - ww, yy), (x + ww, yy), (x, yy - h // 2)], fill=mix(c, (255, 255, 255), .08 * k))
        if self.tod == "snow":
            self.d.point((x, y - h + 1), fill=(250, 250, 250)); self.d.line([(x - 2, y - h // 2), (x + 2, y - h // 2)], fill=(240, 244, 248))

    def tree(self, x, y, s, col="#4f8a3a"):
        self.d.rectangle([x - 1, y - s, x, y], fill=(110, 72, 40))
        c = hx(col)
        self.d.ellipse([x - s, y - s * 2 - 2, x + s, y - s + 2], fill=c)
        self.d.ellipse([x - s // 2, y - s * 2, x + s // 3, y - s - 2], fill=mix(c, (255, 255, 230), .2))

    def house(self, x, y, w, h, wall="#d8c8a8", roof="#a84a3a", lit=True):
        self.d.rectangle([x, y - h, x + w, y], fill=hx(wall))
        self.d.polygon([(x - 2, y - h), (x + w + 2, y - h), (x + w // 2, y - h - w // 2 - 2)], fill=hx(roof))
        self.d.rectangle([x + w // 2 - 1, y - 4, x + w // 2 + 1, y], fill=(80, 52, 32))
        wx, wy = x + 2, y - h + 3
        self.d.rectangle([wx, wy, wx + 2, wy + 2], fill=(60, 70, 90))
        if lit:
            self.lights.append((wx, wy, wx + 2, wy + 2))

    def water(self, y0, y1, col="#3a7ab8"):
        self.d.rectangle([0, y0, W, y1], fill=hx(col))
        for _ in range(16):
            x, y = self.r.randint(0, W - 6), self.r.randint(y0 + 1, y1 - 1)
            self.d.line([(x, y), (x + self.r.randint(2, 5), y)], fill=mix(hx(col), (255, 255, 255), .5))

    def path(self, top_x, bottom_w, y0, col="#c8a878"):
        self.d.polygon([(top_x - 2, y0), (top_x + 2, y0), (W // 2 + bottom_w, H), (W // 2 - bottom_w, H)], fill=hx(col))

    def rocks(self, n, y0, y1, col="#8a8a84"):
        for _ in range(n):
            x, y = self.r.randint(0, W - 6), self.r.randint(y0, y1)
            s = self.r.randint(2, 4)
            self.d.ellipse([x, y, x + s * 2, y + s], fill=hx(col)); self.d.point((x + 1, y + 1), fill=mix(hx(col), (255, 255, 255), .4))

    def tufts(self, n, y0, col="#3a6a2a"):
        for _ in range(n):
            x, y = self.r.randint(0, W - 1), self.r.randint(y0, H - 1)
            self.d.line([(x, y), (x - 1, y - 2)], fill=hx(col)); self.d.line([(x, y), (x + 1, y - 2)], fill=hx(col))

    def fire(self, x, y):
        self.d.polygon([(x - 2, y), (x + 2, y), (x, y - 5)], fill=(240, 150, 40)); self.d.point((x, y - 2), fill=(255, 240, 160))
        self.lights.append((x - 1, y - 3, x + 1, y - 1))

    def finish(self):
        t = TINT[self.tod]
        if t != (1, 1, 1):
            px = self.im.load()
            for y in range(H):
                for x in range(W):
                    r, g, b = px[x, y]
                    px[x, y] = (min(255, int(r * t[0])), min(255, int(g * t[1])), min(255, int(b * t[2])))
        if self.tod in ("night", "dusk"):
            for (a, b, c, e) in self.lights:
                self.d.rectangle([a, b, c, e], fill=(255, 216, 110))
        if self.tod == "snow":
            for _ in range(60):
                self.d.point((self.r.randint(0, W - 1), self.r.randint(0, H - 1)), fill=(255, 255, 255))
        if self.tod == "rain":
            for _ in range(50):
                x, y = self.r.randint(0, W - 1), self.r.randint(0, H - 1)
                self.d.line([(x, y), (x - 1, y + 3)], fill=(200, 210, 220))
        if self.tod == "fog":
            fog = Image.new("RGB", (W, H), (226, 230, 224))
            self.im = Image.blend(self.im, fog, .32)
        return self.im


# ---------------- 景色 ----------------
def forest_path(p):
    p.sky(26); p.hills(26, "#5a8a4a", 3); p.ground(34, "#4f8a3a", "#3e7030")
    p.path(40, 14, 30, "#b89868")
    for x in (4, 12, 20, 60, 68, 76): p.pine(x, 44 + p.r.randint(0, 4), 18 + p.r.randint(0, 6))
    for x in (28, 52): p.tree(x, 36, 5)
    p.tufts(20, 36)


def mountains(p):
    p.sky(34); p.mountain(22, 40, 26, 30, "#6a7a8a"); p.mountain(52, 40, 22, 24, "#5a6a7a"); p.mountain(72, 40, 14, 16, "#7a8a96")
    p.hills(40, "#6a8a4a", 2); p.ground(46, "#5a7a3a", "#4a6a30")
    for x in range(2, 80, 9): p.pine(x, 50, 10)


def cave(p):
    p.sky(18); p.ground(10, "#6a5a4a", "#5a4a3c")
    p.d.polygon([(0, 10), (12, 4), (30, 8), (50, 3), (66, 7), (80, 5), (80, 14), (0, 14)], fill=hx("#7a6a58"))
    p.d.ellipse([24, 18, 56, 64], fill=hx("#14100e")); p.d.ellipse([28, 24, 52, 64], fill=hx("#0a0806"))
    for x in (22, 56): p.d.rectangle([x, 26, x + 1, 32], fill=(110, 72, 40)); p.fire(x + 1, 26)
    p.rocks(10, 44, 54, "#8a7a68")
    for x, y in ((36, 30), (44, 28)): p.d.point((x, y), fill=(240, 200, 80))


def road_cart(p):
    p.sky(24); p.hills(24, "#7aa04a", 3); p.ground(30, "#7aa04a", "#6a9040")
    p.path(44, 16, 24, "#c8a878")
    p.d.rectangle([30, 34, 44, 40], fill=hx("#8a5a30")); p.d.pieslice([30, 26, 44, 40], 180, 360, fill=hx("#e8e0c8"))
    p.d.ellipse([30, 38, 34, 42], fill=hx("#3a2a1a")); p.d.ellipse([40, 38, 44, 42], fill=hx("#3a2a1a"))
    p.d.rectangle([45, 34, 50, 38], fill=hx("#7a5a3a")); p.d.rectangle([47, 31, 50, 34], fill=hx("#7a5a3a"))
    p.d.line([(64, 40), (64, 28)], fill=(110, 72, 40)); p.d.rectangle([60, 28, 72, 31], fill=hx("#c8a060"))
    p.tufts(14, 32); p.tree(10, 30, 5); p.tree(74, 32, 4)


def castle(p):
    p.sky(30); p.hills(34, "#6a8a4a", 4, 2); p.ground(44, "#5a7a3a")
    p.d.rectangle([24, 16, 56, 36], fill=hx("#b8b0a4"))
    for x in (20, 52):
        p.d.rectangle([x, 8, x + 8, 36], fill=hx("#a8a094")); p.d.polygon([(x - 1, 8), (x + 9, 8), (x + 4, 1)], fill=hx("#a84a3a"))
        p.d.line([(x + 4, 1), (x + 4, -3)], fill=(60, 50, 40)); p.d.rectangle([x + 5, -3, x + 8, -1], fill=hx("#3d6fc9"))
    for x in range(24, 57, 4): p.d.rectangle([x, 14, x + 2, 16], fill=hx("#b8b0a4"))
    p.d.rectangle([36, 26, 44, 36], fill=hx("#4a3a2a"))
    for x in (28, 48): p.house(x, 24, 0, 0, lit=False); p.lights.append((x, 20, x + 1, 22))
    p.path(40, 8, 36, "#b8a070")


def ruins(p):
    p.sky(28); p.ground(36, "#b8a070", "#a08858")
    for x, h in ((8, 18), (18, 26), (30, 12), (58, 22), (70, 16)):
        p.d.rectangle([x, 36 - h, x + 5, 36], fill=hx("#d8d0c0")); p.d.line([(x + 5, 36 - h), (x + 5, 36)], fill=hx("#a8a090"))
        for k in range(3): p.d.point((x + p.r.randint(0, 5), 36 - p.r.randint(0, h)), fill=hx("#5a8a3a"))
    p.d.rectangle([16, 8, 34, 11], fill=hx("#d8d0c0"))
    p.rocks(10, 40, 54, "#c8c0b0"); p.tufts(10, 40, "#7a8a4a")


def river(p):
    p.sky(18); p.ground(18, "#5a9a4a", "#4a8a3a")
    p.d.polygon([(34, 18), (42, 18), (56, H), (20, H)], fill=hx("#4a90c8"))
    for _ in range(10): x, y = p.r.randint(26, 50), p.r.randint(22, 54); p.d.line([(x, y), (x + 3, y)], fill=(210, 232, 248))
    p.rocks(4, 30, 50, "#9a9a94")
    for x in (6, 66, 74): p.tree(x, 30, 5)
    p.d.ellipse([46, 40, 50, 42], fill=(240, 160, 60))


def farm(p):
    p.sky(24); p.ground(26, "#d8c070")
    for y in range(28, H, 4): p.d.line([(0, y), (W, y)], fill=hx("#b8a050"))
    p.d.rectangle([52, 12, 70, 28], fill=hx("#a84a3a")); p.d.polygon([(50, 12), (72, 12), (61, 4)], fill=hx("#6a3a2a"))
    p.d.rectangle([58, 20, 64, 28], fill=hx("#5a2a1a"))
    p.d.rectangle([18, 6, 22, 26], fill=hx("#e8e0c8"))
    for a in range(4):
        ang = a * math.pi / 2 + .4
        p.d.line([(20, 8), (20 + math.cos(ang) * 9, 8 + math.sin(ang) * 9)], fill=(120, 90, 60), width=2)
    for x in range(0, 46, 6): p.d.line([(x, 24), (x, 28)], fill=(120, 90, 50))
    p.d.line([(0, 25), (46, 25)], fill=(120, 90, 50))
    p.lights.append((60, 15, 62, 17))


def swamp(p):
    p.sky(16); p.ground(16, "#4a5a3a", "#3a4a2a")
    p.d.ellipse([6, 30, 74, 52], fill=hx("#3a5a4a"))
    for x in (4, 20, 62, 76):
        p.d.line([(x, 16), (x, 34)], fill=hx("#2a3a24"), width=2); p.d.line([(x, 22), (x + 4, 18)], fill=hx("#2a3a24"))
    for _ in range(6): x, y = p.r.randint(12, 68), p.r.randint(34, 48); p.d.ellipse([x, y, x + 3, y + 1], fill=hx("#5a8a5a"))
    p.d.point((40, 38), fill=(240, 220, 60)); p.d.point((43, 38), fill=(240, 220, 60))


def town_gate(p):
    p.sky(24); p.ground(40, "#b8a888", "#a89878")
    p.d.rectangle([6, 14, 74, 40], fill=hx("#a89c8c"))
    for x in range(6, 75, 6): p.d.rectangle([x, 11, x + 3, 14], fill=hx("#a89c8c"))
    p.d.rectangle([30, 22, 50, 40], fill=hx("#4a3424")); p.d.pieslice([30, 14, 50, 30], 180, 360, fill=hx("#4a3424"))
    for x in (24, 54):
        p.d.rectangle([x, 30, x + 3, 40], fill=hx("#3d4a6a")); p.d.ellipse([x, 26, x + 3, 29], fill=hx("#e0b890")); p.d.line([(x + 4, 22), (x + 4, 40)], fill=(150, 150, 160))
    p.lights.append((14, 20, 15, 22)); p.lights.append((64, 20, 65, 22))
    p.path(40, 10, 40, "#c8b898")


def cliff_tower(p):
    p.sky(30); p.d.polygon([(30, 56), (34, 24), (64, 22), (70, 56)], fill=hx("#7a6a5a"))
    p.d.rectangle([44, 6, 52, 24], fill=hx("#9a8e80")); p.d.polygon([(42, 7), (54, 7), (48, 0)], fill=hx("#5a4a8a"))
    p.lights.append((47, 12, 49, 14))
    p.ground(46, "#4a7aa8"); p.water(46, 56, "#3a6a98")
    p.d.polygon([(0, 40), (20, 44), (24, 56), (0, 56)], fill=hx("#6a5a4a"))


def sea_ship(p):
    p.sky(26); p.water(26, 56, "#3a7ab8")
    p.d.polygon([(30, 34), (54, 34), (50, 40), (34, 40)], fill=hx("#6a4a2a"))
    p.d.line([(42, 34), (42, 16)], fill=(90, 60, 40)); p.d.polygon([(43, 17), (43, 32), (54, 30)], fill=hx("#f2efe4")); p.d.polygon([(41, 18), (41, 32), (32, 31)], fill=hx("#e8e0d0"))
    p.d.polygon([(0, 20), (14, 22), (18, 56), (0, 56)], fill=hx("#8a7a6a"))
    p.d.rectangle([4, 10, 8, 22], fill=hx("#f2efe4")); p.lights.append((5, 11, 7, 13))


def desert(p):
    p.sky(24); p.d.rectangle([0, 24, W, H], fill=hx("#e0b870"))
    p.d.pieslice([-20, 30, 44, 80], 180, 360, fill=hx("#d0a860")); p.d.pieslice([30, 34, 100, 90], 180, 360, fill=hx("#c89a50"))
    p.d.polygon([(48, 28), (66, 28), (57, 14)], fill=hx("#c8a060")); p.d.polygon([(57, 14), (66, 28), (60, 28)], fill=hx("#a88040"))
    for x in (14, 70):
        p.d.rectangle([x, 34, x + 2, 44], fill=hx("#4a8a4a")); p.d.rectangle([x - 3, 37, x - 1, 39], fill=hx("#4a8a4a")); p.d.rectangle([x + 3, 36, x + 5, 38], fill=hx("#4a8a4a"))
    if p.tod == "day": p.d.ellipse([8, 4, 18, 14], fill=(255, 244, 200))


def camp(p):
    p.sky(30); p.ground(34, "#3a5030", "#2e4026")
    for x in (2, 10, 70, 78): p.pine(x, 40, 16)
    p.d.polygon([(14, 46), (30, 46), (22, 32)], fill=hx("#8a6a4a")); p.d.line([(22, 32), (22, 46)], fill=hx("#5a4a3a"))
    p.d.polygon([(48, 44), (60, 44), (54, 34)], fill=hx("#5a6a8a"))
    p.fire(40, 46); p.rocks(5, 46, 48, "#6a6a64")
    p.d.rectangle([34, 44, 37, 46], fill=hx("#6a4a2a"))


def snowfield(p):
    p.sky(26); p.mountain(56, 30, 30, 20, "#8a9aaa"); p.ground(30, "#e8eef4", "#d0d8e2")
    for x in range(4, 80, 8): p.pine(x + p.r.randint(-2, 2), 40 + p.r.randint(0, 10), 12, "#2e4a3a")
    p.d.line([(0, 50), (80, 44)], fill=hx("#c8d0da"))


def lake(p):
    p.sky(22); p.hills(22, "#4a7a4a", 3, 4); p.water(28, 56, "#4a88b8")
    p.d.polygon([(30, 40), (44, 40), (42, 43), (32, 43)], fill=hx("#7a5a3a")); p.d.line([(37, 40), (37, 34)], fill=(90, 60, 40))
    for x in (4, 12, 70): p.tree(x, 28, 5)
    p.d.rectangle([60, 24, 64, 28], fill=hx("#d8c8a8"))


def village(p):
    p.sky(18); p.ground(36, "#b8a888", "#a89878")
    p.house(4, 36, 14, 12); p.house(24, 34, 12, 10, roof="#4a6a8a"); p.house(42, 36, 14, 14, roof="#6a4a2a"); p.house(62, 34, 12, 10)
    p.d.rectangle([0, 40, W, 44], fill=hx("#c8b898"))
    for x in (20, 58): p.d.line([(x, 44), (x, 34)], fill=(60, 60, 60)); p.lights.append((x - 1, 33, x + 1, 35))


def graveyard(p):
    p.sky(24); p.ground(32, "#4a5a3a", "#3a4a2a")
    for x, y in ((10, 40), (24, 44), (40, 38), (54, 46), (68, 40)):
        p.d.rectangle([x, y - 7, x + 5, y], fill=hx("#9a9a9a")); p.d.pieslice([x, y - 10, x + 5, y - 4], 180, 360, fill=hx("#9a9a9a"))
    p.d.line([(74, 32), (74, 14)], fill=(50, 40, 40)); p.d.line([(74, 18), (78, 14)], fill=(50, 40, 40)); p.d.line([(74, 22), (69, 18)], fill=(50, 40, 40))
    for x in range(0, 80, 5): p.d.line([(x, 30), (x, 34)], fill=(60, 60, 60))


def volcano(p):
    p.sky(32); p.d.polygon([(4, 44), (34, 10), (46, 10), (76, 44)], fill=hx("#5a4a42"))
    p.d.polygon([(36, 10), (44, 10), (48, 28), (40, 22), (34, 30)], fill=hx("#e06030"))
    p.d.ellipse([30, 0, 40, 8], fill=(120, 110, 110)); p.d.ellipse([38, -2, 50, 6], fill=(140, 130, 130))
    p.ground(44, "#3a3230", "#2a2220")
    p.lights.append((39, 12, 41, 16))


def crystal_cave(p):
    p.d.rectangle([0, 0, W, H], fill=hx("#2a2434"))
    for _ in range(14):
        x, y, h = p.r.randint(0, 78), p.r.randint(20, 56), p.r.randint(6, 16)
        c = p.r.choice([(120, 200, 240), (180, 140, 240), (140, 230, 200)])
        p.d.polygon([(x - 3, y), (x + 3, y), (x, y - h)], fill=c); p.d.line([(x, y - h + 2), (x, y - 2)], fill=(240, 250, 255))
    p.d.polygon([(0, 0), (80, 0), (80, 6), (60, 10), (40, 4), (20, 9), (0, 5)], fill=hx("#1a1620"))
    for x in range(4, 80, 9): p.d.polygon([(x, 6), (x + 3, 6), (x + 1, 12)], fill=hx("#3a3444"))


def market(p):
    p.sky(16); p.ground(34, "#c8b898", "#b8a888")
    for i, c in enumerate(("#c94a3a", "#3d6fc9", "#e0b040", "#4a8a4a")):
        x = 4 + i * 19
        p.d.rectangle([x, 26, x + 15, 36], fill=hx("#8a6a4a")); p.d.polygon([(x - 1, 26), (x + 16, 26), (x + 14, 20), (x + 1, 20)], fill=hx(c))
        for k in range(3): p.d.ellipse([x + 2 + k * 4, 27, x + 4 + k * 4, 29], fill=p.r.choice([(230, 80, 60), (240, 200, 60), (120, 200, 90)]))
    p.house(0, 18, 18, 10, lit=False); p.house(60, 18, 18, 10, roof="#4a6a8a", lit=False)
    for x in (20, 46): p.d.rectangle([x, 40, x + 2, 46], fill=hx("#5a4a8a")); p.d.ellipse([x, 37, x + 2, 39], fill=(230, 190, 150))


def wheat(p):
    p.sky(24); p.ground(26, "#e0c060")
    for _ in range(140):
        x, y = p.r.randint(0, 79), p.r.randint(28, 55)
        p.d.line([(x, y), (x, y - 2)], fill=p.r.choice([(200, 160, 60), (230, 200, 90), (180, 140, 50)]))
    p.d.line([(60, 40), (60, 26)], fill=(110, 80, 50)); p.d.line([(56, 30), (64, 30)], fill=(110, 80, 50))
    p.d.ellipse([57, 22, 63, 27], fill=hx("#c8a060"))
    p.tree(12, 26, 4)


def waterfall(p):
    p.sky(10); p.d.rectangle([0, 6, W, H], fill=hx("#5a6a5a"))
    p.d.rectangle([30, 6, 46, 44], fill=hx("#9ac8e8"))
    for _ in range(18): x = p.r.randint(31, 45); p.d.line([(x, p.r.randint(6, 40)), (x, p.r.randint(6, 44))], fill=(230, 244, 252))
    p.water(44, 56, "#4a90c8")
    for x in (6, 16, 60, 72): p.pine(x, 30 + p.r.randint(0, 8), 14, "#2e5a34")
    for _ in range(6): x = p.r.randint(28, 50); p.d.ellipse([x, 42, x + 4, 46], fill=(240, 248, 255))


def chasm_bridge(p):
    p.sky(30); p.mountain(14, 34, 20, 18, "#6a7a8a", False); p.mountain(66, 34, 20, 18, "#6a7a8a", False)
    p.d.polygon([(0, 34), (24, 34), (22, 56), (0, 56)], fill=hx("#6a5a4a")); p.d.polygon([(56, 34), (80, 34), (80, 56), (58, 56)], fill=hx("#6a5a4a"))
    p.d.rectangle([22, 44, 58, 56], fill=hx("#1a1a24"))
    for x in range(22, 58, 3):
        y = 34 + int(math.sin((x - 22) / 36 * math.pi) * 4)
        p.d.line([(x, y), (x + 2, y)], fill=hx("#8a6a4a"))
    p.d.line([(22, 30), (58, 30)], fill=hx("#6a4a2a"))


def dark_forest(p):
    p.d.rectangle([0, 0, W, H], fill=hx("#1a1420"))
    for _ in range(12): p.pine(p.r.randint(0, 79), H - p.r.randint(0, 6), 26 + p.r.randint(0, 14), "#1e2a1e")
    for x, c in ((30, (240, 210, 60)), (48, (230, 70, 50))):
        p.d.point((x, 34), fill=c); p.d.point((x + 3, 34), fill=c)
    p.ground(50, "#141018")


SCENES = [
    (forest_path, "fog"), (mountains, "snow"), (cave, "night"), (road_cart, "dusk"), (castle, "night"),
    (ruins, "dusk"), (river, "rain"), (farm, "dusk"), (swamp, "fog"), (town_gate, "night"),
    (cliff_tower, "dusk"), (sea_ship, "rain"), (desert, "dusk"), (camp, "night"), (snowfield, "night"),
    (lake, "fog"), (village, "night"), (graveyard, "fog"), (volcano, "night"), (crystal_cave, "day"),
    (market, "dusk"), (wheat, "dusk"), (waterfall, "fog"), (chasm_bridge, "rain"), (dark_forest, "night"),
]
# 2枚目の時間帯を使わない景色（もともと暗い・屋内）は昼の別の並びにする
TAGS = {
    "討伐": [0, 1, 2, 5, 8, 17, 18, 19, 23, 24],
    "探索": [0, 1, 2, 5, 6, 12, 14, 15, 19, 22],
    "護衛": [3, 4, 9, 10, 11, 12, 13, 16, 20, 23],
}


def main():
    os.makedirs(IMG, exist_ok=True)
    pics = []
    for i, (fn, alt) in enumerate(SCENES):
        for k, tod in enumerate(("day", alt)):
            p = Pic(1000 + i * 7 + k, tod)
            fn(p)
            pics.append(p.finish())
    for i, im in enumerate(pics):
        im.save(os.path.join(IMG, f"qpic_{i:02d}.png"))
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        cols = 10
        sheet = Image.new("RGB", (cols * (W * 2 + 6), (len(pics) // cols) * (H * 2 + 6)), (60, 50, 44))
        for i, im in enumerate(pics):
            sheet.paste(im.resize((W * 2, H * 2), Image.NEAREST), ((i % cols) * (W * 2 + 6), (i // cols) * (H * 2 + 6)))
        sheet.save(sys.argv[2])
    print("ok", len(pics))


if __name__ == "__main__":
    main()
