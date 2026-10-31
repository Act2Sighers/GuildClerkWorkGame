#!/usr/bin/env python3
"""ドット絵の PNG を生成する。
  python3 tools/gen_sprites.py
出力: img/adventurers.png（24x32 を 10 列 x 3 行）, img/bandage.png, js/adv_meta.js
受付嬢は tools/clerk_art.py、小物は tools/item_art.py を参照。
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import adv_parts as P  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def shade(c, k):
    r, g, b = hx(c) if isinstance(c, str) else c
    if k >= 0:
        return tuple(int(v + (255 - v) * k) for v in (r, g, b))
    return tuple(int(v * (1 + k)) for v in (r, g, b))


FIXED = {
    "E": "#2b1d2e", "w": "#ffffff", "m": "#a8424e",
    "L": "#93603a", "l": "#5f3b24",
    "M": "#c9d2de", "m_": "#8791a5", "n": "#f2f6fb",
    "G": "#f0c445", "g": "#b0841e",
    "W": "#f3efe4", "V": "#c6bfae",
    "K": "#8e5c32", "k": "#5c3a1e",
    "X": "#86e6ff", "x": "#3584d4",
    "N": "#2e2a36",
    "Y": "#f2e6c4", "y": "#c7b48a",
    "R": "#d4453f", "r": "#8c2530",
    "B": "#5a3d2e", "b": "#3a271d",
}
SKIN = {
    "light": ("#ffe0c8", "#f0b898", "#ff9fa8"),
    "fair": ("#f7cfae", "#e2a882", "#f48f94"),
    "tan": ("#d9a074", "#b47a52", "#d9716a"),
    "dark": ("#9c6644", "#774a30", "#b9585a"),
}


def make_palette(spec):
    pal = {k: hx(v) for k, v in FIXED.items() if not k.endswith("_")}
    pal["m"] = hx(FIXED["m"])  # 口
    skin, sshade, blush = SKIN[spec.get("skin", "fair")]
    pal.update({"S": hx(skin), "s": hx(sshade), "P": hx(blush)})
    hair = spec["hair_c"]
    pal.update({"H": hx(hair), "h": shade(hair, -0.3), "j": shade(hair, 0.35)})
    pal["I"] = hx(spec.get("eye", "#3c5aa8"))
    o = spec.get("o", "#4466aa")
    pal.update({"O": hx(o), "o": shade(o, -0.28)})
    a = spec.get("a", "#d8b040")
    pal.update({"A": hx(a), "a": shade(a, -0.3)})
    c = spec.get("c", "#b33838")
    pal.update({"C": hx(c), "c": shade(c, -0.3)})
    t = spec.get("t", "#5a5068")
    pal.update({"T": hx(t), "t": shade(t, -0.28)})
    if "boots" in spec:
        pal.update({"B": hx(spec["boots"]), "b": shade(spec["boots"], -0.35)})
    return pal


# 金属の影色 m は口の m と重なるため、金属パーツでは別の文字に置き換える
METAL_SHADE = hx(FIXED["m_"])


def layer_grid(rows, metal=False):
    out = []
    for r in rows:
        assert len(r) == P.W, (len(r), r)
        out.append(r.replace("m", "\x01") if metal else r)
    assert len(out) == P.H, len(out)
    return out


def compose(layers, pal):
    """layers: [(grid, metal_flag)] 下から順"""
    img = Image.new("RGBA", (P.W, P.H), (0, 0, 0, 0))
    px = img.load()
    for grid, metal in layers:
        g = layer_grid(grid, metal)
        for y, row in enumerate(g):
            for x, ch in enumerate(row):
                if ch == ".":
                    continue
                if ch == "\x01":
                    col = METAL_SHADE
                else:
                    col = pal[ch]
                px[x, y] = col + (255,)
    return img


def outline(img, base=(34, 22, 38)):
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            nb = []
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and src[xx, yy][3]:
                    nb.append(src[xx, yy])
            if nb:
                r = sum(c[0] for c in nb) / len(nb)
                g = sum(c[1] for c in nb) / len(nb)
                b = sum(c[2] for c in nb) / len(nb)
                k = 0.28
                dst[x, y] = (int(base[0] * (1 - k) + r * k * 0.5), int(base[1] * (1 - k) + g * k * 0.5),
                             int(base[2] * (1 - k) + b * k * 0.5), 255)
    return out


# ---------------- 見た目の職業ごとの組み立て ----------------
LOOK = {
    "hero": dict(outfit="tunic", back=["cape"], gear=["circlet"], items=["sword"]),
    "warrior": dict(outfit="light", back=[], gear=["headband"], items=["axe"]),
    "mage": dict(outfit="robe", back=[], gear=["wizard"], items=["staff"]),
    "hunter": dict(outfit="tunic", back=["cape"], gear=["hood"], items=["bow"]),
    "merchant": dict(outfit="vest", back=["pack"], gear=["cap"], items=["pouch"]),
    "scholar": dict(outfit="coat", back=[], gear=["glasses"], items=["book"]),
    "knight": dict(outfit="plate", back=[], gear=["helmet"], items=["shield", "spear"]),
    "traveler": dict(outfit="poncho", back=[], gear=["widehat"], items=["stick"]),
    "priest": dict(outfit="robe", back=[], gear=["veil"], items=["cross"]),
}
METAL_GEAR = {"helmet"}
METAL_OUTFIT = {"plate", "light"}
METAL_ITEMS = {"sword", "axe", "shield", "spear"}

# 30 人。g: 性別（名前の抽選に使う）
CHARS = [
    # 勇者
    dict(look="hero", g="m", hair="spiky", hair_c="#e8c050", o="#3d6fc9", a="#f0c445", c="#c83c3c", t="#4a4260", eye="#3c6ad0"),
    dict(look="hero", g="f", hair="long", hair_c="#d8573e", o="#f2efe4", a="#3d6fc9", c="#2d56a8", t="#3c4a78", eye="#2f8a5a", skin="light"),
    dict(look="hero", g="m", hair="messy", hair_c="#3a2a24", o="#c94a3a", a="#f0c445", c="#f2efe4", t="#5a4a3a", eye="#8a4a2a", skin="tan", drop_gear=True),
    # 戦士
    dict(look="warrior", g="m", hair="spiky", hair_c="#8a3a2a", o="#6a4a3a", a="#5a3d2e", t="#4a3a30", eye="#5a3a2a", skin="tan"),
    dict(look="warrior", g="f", hair="pony", hair_c="#f0d070", o="#4a5a7a", a="#7a3030", t="#3a3a4a", eye="#3a7ab0", skin="fair"),
    dict(look="warrior", g="m", hair="short", hair_c="#2a2a30", o="#5a6a3a", a="#3a2a20", t="#3a3a2a", eye="#3a2a2a", skin="dark", drop_gear=True),
    dict(look="warrior", g="f", hair="bob", hair_c="#c04a3a", o="#7a5a3a", a="#3a3a4a", t="#4a3a3a", eye="#6a3a2a", skin="tan"),
    # 魔術師
    dict(look="mage", g="f", hair="long", hair_c="#9a7ae0", o="#4a3a8a", a="#f0c445", eye="#9a4ad0", skin="light"),
    dict(look="mage", g="m", hair="messy", hair_c="#d8d8e0", o="#7a2a5a", a="#f0c445", eye="#c04040", skin="fair"),
    dict(look="mage", g="f", hair="twin", hair_c="#3a3a5a", o="#2a4a6a", a="#86e6ff", eye="#3ab0d0", skin="fair"),
    dict(look="mage", g="m", hair="short", hair_c="#6a4a2a", o="#3a5a3a", a="#d8b040", eye="#3a7a3a", skin="tan"),
    # 狩人
    dict(look="hunter", g="f", hair="long", hair_c="#c07a3a", o="#5a7a3a", a="#8a5a30", c="#3a6a3a", t="#5a4a30", eye="#3a7a3a", skin="fair"),
    dict(look="hunter", g="m", hair="short", hair_c="#4a3a2a", o="#7a6a4a", a="#5a3a20", c="#5a5a3a", t="#4a3a2a", eye="#5a4a2a", skin="tan"),
    dict(look="hunter", g="f", hair="bob", hair_c="#e8e0d0", o="#4a6a5a", a="#3a3a2a", c="#7a3a3a", t="#3a3a3a", eye="#a03a3a", skin="light"),
    # 商人
    dict(look="merchant", g="m", hair="short", hair_c="#7a4a2a", o="#3a6a5a", a="#c04a3a", t="#5a4a3a", eye="#5a3a2a", skin="fair"),
    dict(look="merchant", g="f", hair="twin", hair_c="#e07a4a", o="#8a3a4a", a="#3a6aa0", t="#4a3a4a", eye="#3a6a3a", skin="light"),
    dict(look="merchant", g="m", hair="messy", hair_c="#a0a0a8", o="#6a5a2a", a="#4a7a4a", t="#3a3a3a", eye="#3a3a5a", skin="tan"),
    # 学者
    dict(look="scholar", g="f", hair="bob", hair_c="#4a3a5a", o="#5a4a3a", a="#3a5aa0", t="#3a3a4a", eye="#5a3a8a", skin="light"),
    dict(look="scholar", g="m", hair="short", hair_c="#c8b080", o="#3a3a5a", a="#a03a3a", t="#4a4a5a", eye="#3a5a8a", skin="fair"),
    dict(look="scholar", g="f", hair="long", hair_c="#5a8ac0", o="#6a6a7a", a="#3a3a3a", t="#3a3a4a", eye="#3a6aa0", skin="fair"),
    # 騎士
    dict(look="knight", g="m", hair="short", hair_c="#c8a050", o="#2d56a8", a="#f2efe4", t="#3a3a4a", eye="#3a5aa0", skin="fair"),
    dict(look="knight", g="f", hair="long", hair_c="#f0e0a0", o="#a83a3a", a="#f0c445", t="#3a3a4a", eye="#3a7ab0", skin="light", drop_gear=True),
    dict(look="knight", g="m", hair="short", hair_c="#2a2a2a", o="#3a6a3a", a="#f0c445", t="#3a3a4a", eye="#3a3a3a", skin="dark"),
    # 旅人
    dict(look="traveler", g="m", hair="messy", hair_c="#5a3a2a", c="#b0703a", a="#e8d8a0", o="#6a5a4a", t="#4a4a3a", eye="#5a4a2a", skin="tan"),
    dict(look="traveler", g="f", hair="pony", hair_c="#3a2a24", c="#5a7aa0", a="#f2efe4", o="#7a6a5a", t="#4a3a3a", eye="#3a3a5a", skin="fair"),
    dict(look="traveler", g="f", hair="twin", hair_c="#a0d070", c="#c05a5a", a="#f0c445", o="#5a5a6a", t="#3a3a4a", eye="#3a8a5a", skin="light"),
    # 僧侶
    dict(look="priest", g="f", hair="long", hair_c="#f0d890", o="#f2efe4", a="#3d6fc9", eye="#3a6ad0", skin="light"),
    dict(look="priest", g="m", hair="short", hair_c="#8a6a4a", o="#f2efe4", a="#c94a3a", eye="#5a4a3a", skin="fair", drop_gear=True),
    dict(look="priest", g="f", hair="bob", hair_c="#7a3a2a", o="#3a3a5a", a="#f0c445", eye="#7a3a2a", skin="tan"),
    dict(look="priest", g="m", hair="spiky", hair_c="#e8e8f0", o="#f2efe4", a="#d8b040", eye="#4a8ad0", skin="dark"),
]


def build_char(spec):
    look = LOOK[spec["look"]]
    pal = make_palette(spec)
    layers = []
    hair = spec["hair"]
    if hair in P.HAIR_BACK:
        layers.append((P.HAIR_BACK[hair], False))
    for b in look["back"]:
        layers.append((P.BACK[b], False))
    layers.append((P.OUTFIT[look["outfit"]], look["outfit"] in METAL_OUTFIT))
    layers.append((P.HEAD, False))
    front = "long" if hair in ("twin", "pony") else hair
    layers.append((P.HAIR_FRONT[front], False))
    if not spec.get("drop_gear"):
        for gname in look["gear"]:
            layers.append((P.HEADGEAR[gname], gname in METAL_GEAR))
    for it in look["items"]:
        layers.append((P.ITEMS[it], it in METAL_ITEMS))
    return outline(compose(layers, pal))


def main():
    os.makedirs(IMG, exist_ok=True)
    cols, rows = 10, 3
    sheet = Image.new("RGBA", (P.W * cols, P.H * rows), (0, 0, 0, 0))
    meta = []
    for i, spec in enumerate(CHARS):
        im = build_char(spec)
        sheet.paste(im, ((i % cols) * P.W, (i // cols) * P.H))
        meta.append({"look": spec["look"], "g": spec["g"]})
    sheet.save(os.path.join(IMG, "adventurers.png"))
    band = outline(compose([(P.BANDAGE, False)], make_palette(CHARS[0])))
    band.save(os.path.join(IMG, "bandage.png"))
    data = {"w": P.W, "h": P.H, "cols": cols, "chars": meta}
    # ゲームは file:// でも動くよう JS として読み込む
    with open(os.path.join(ROOT, "js", "adv_meta.js"), "w", encoding="utf-8") as f:
        f.write("// tools/gen_sprites.py が生成（img/adventurers.png の並び順）\n")
        f.write("window.ADV_META = " + json.dumps(data, ensure_ascii=False) + ";\n")
    # 確認用の拡大シート
    if "--preview" in sys.argv:
        big = sheet.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST)
        bg = Image.new("RGBA", big.size, (120, 104, 92, 255))
        bg.alpha_composite(big)
        bg.save("/tmp/adv_preview.png")
    print("ok", len(CHARS))


if __name__ == "__main__":
    main()
