# 冒険者スプライト（24x32）のパーツ定義
# '.' は透明。文字は役割（色はキャラごとのパレットで決まる）
#  S/s 肌  E 目の縁  I 瞳  w 目の光  P 頬  m 口
#  H/h/j 髪（基本/影/光）
#  O/o 服（基本/影）  A/a 差し色  C/c マント  T/t ズボン  B/b 靴
#  L/l 革  M/m/n 金属（基本/影/光）  G/g 金  W/V 白布  K/k 木  X/x 宝玉  N 黒縁  Y/y 紙  R/r 赤

W, H = 24, 32
BLANK = "." * W


def pad(rows, top=0):
    """top 行目から rows を置き、32 行にそろえる"""
    out = [BLANK] * top + list(rows)
    out += [BLANK] * (H - len(out))
    return out


HEAD = pad([
    ".......SSSSSSSSSS.......",  # 5
    "......SSSSSSSSSSSS......",  # 6
    ".....SSSSSSSSSSSSSS.....",  # 7
    ".....SSSSSSSSSSSSSS.....",  # 8
    ".....SSSSSSSSSSSSSS.....",  # 9
    ".....SSSEESSSSEESSS.....",  # 10
    ".....SSSIwSSSSIwSSS.....",  # 11
    ".....SSSIISSSSIISSS.....",  # 12
    ".....SPPSSSSSSSSPPS.....",  # 13
    "......SSSSSmmSSSSS......",  # 14
    ".......sSSSSSSSSs.......",  # 15
    "..........ssss..........",  # 16
], 5)

# 閉じ目（幽霊・まばたき用ではなく、表情差分用に残しておく）
HEAD_CLOSED = [r for r in HEAD]
HEAD_CLOSED[10] = ".....SSSSSSSSSSSSSS....."
HEAD_CLOSED[11] = ".....SSSEESSSSEESSS....."
HEAD_CLOSED[12] = ".....SSSSSSSSSSSSSS....."

LEGS_PANTS = [
    "........TTTTTTTT........",  # 26
    "........TTT..TTT........",  # 27
    "........TTt..tTT........",  # 28
    "........BBB..BBB........",  # 29
    ".......BBBB..BBBB.......",  # 30
    ".......bbbb..bbbb.......",  # 31
]

# ---------------- 髪（前） ----------------
HAIR_FRONT = {
    "short": pad([
        "........HHHHHHHH........",  # 3
        "......HHHjjjjHHHHH......",  # 4
        ".....HHHjjHHHHHHHHH.....",  # 5
        "....HHHHHHHHHHHHHHHH....",  # 6
        "....HHHHHHHHHHHHHHhH....",  # 7
        "....HHhHH.HHHHH.HHhH....",  # 8
        "....HH...H..H..H..HH....",  # 9
        "....Hh............hH....",  # 10
        "....h..............h....",  # 11
    ], 3),
    "spiky": pad([
        ".........H....H.........",  # 1
        "........HH...HH..H......",  # 2
        ".......HHHH.HHHHHH......",  # 3
        "......HHHjjjjHHHHHH.....",  # 4
        "....HHHHjjHHHHHHHHHH....",  # 5
        "...HHHHHHHHHHHHHHHHHH...",  # 6
        "....HHHHHHHHHHHHHHhH....",  # 7
        "....HH.HHH.HHHH.HHH.H...",  # 8
        "....H..H...H..H...H.H...",  # 9
        "....Hh............hH....",  # 10
    ], 1),
    "messy": pad([
        "........HHHHHHHH........",  # 3
        "......HHHjjjjHHHHH......",  # 4
        ".....HHHjjHHHHHHHHHH....",  # 5
        "....HHHHHHHHHHHHHHHHH...",  # 6
        "....HHHHHHHHHHHHHHHhH...",  # 7
        "....HHH.HHhHHHHhH.HHH...",  # 8
        "....HH..H...HH...H.HH...",  # 9
        "....HH.............HH...",  # 10
        "....Hh.............hH...",  # 11
        "....h...............h...",  # 12
    ], 3),
    "long": pad([
        ".......HHHjjjjHHH.......",  # 3
        "......HHjjHHHHHHHH......",  # 4
        ".....HHHHHHHHHHHHHH.....",  # 5
        "....HHHHHHHHHHHHHHHH....",  # 6
        "....HHHHHhHHHHhHHHHH....",  # 7
        "....HHH.HHHhhHHH.HHH....",  # 8
        "....HH..H.H..H.H..HH....",  # 9
        "...HHH............HHH...",  # 10
        "...HHH............HHH...",  # 11
        "...HHh............hHH...",  # 12
        "...Hh..............hH...",  # 13
        "...Hh..............hH...",  # 14
    ], 3),
    "bob": pad([
        ".......HHHjjjjHHH.......",  # 3
        "......HHjjHHHHHHHH......",  # 4
        ".....HHHHHHHHHHHHHH.....",  # 5
        "....HHHHHHHHHHHHHHHH....",  # 6
        "....HHHHHHHHHHHHHHHH....",  # 7
        "....HHHHHHHHHHHHHHHH....",  # 8
        "....HHH...H..H...HHH....",  # 9
        "...HHH............HHH...",  # 10
        "...HHH............HHH...",  # 11
        "...HHH............HHH...",  # 12
        "...HHh............hHH...",  # 13
        "...hHh............hHh...",  # 14
        "....hh............hh....",  # 15
    ], 3),
}

# ---------------- 髪（後ろ） ----------------
HAIR_BACK = {
    "long": pad([
        "......hhhhhhhhhhhh......",  # 5
        "....hhhhhhhhhhhhhhhh....",  # 6
    ] + ["...hHHHHHHHHHHHHHHHHh..."] * 13 + [  # 7-19
        "...hHHhHHHHHHHHHHhHHh...",  # 20
        "...hhH.hHH....HHh.Hhh...",  # 21
        "....h...h......h...h....",  # 22
    ], 5),
    "twin": pad([
        "..HH................HH..",  # 6
        ".HHHH..............HHHH.",  # 7
        ".HHHh..............hHHH.",  # 8
        "HHHHh..............hHHHH",  # 9
        "HHHh................hHHH",  # 10
        "HHHh................hHHH",  # 11
        "HHHh................hHHH",  # 12
        ".HHh................hHH.",  # 13
        ".HHh................hHH.",  # 14
        ".HH..................HH.",  # 15
        ".Hh..................hH.",  # 16
        "..h..................h..",  # 17
    ], 6),
    "pony": pad([
        "....................HH..",  # 6
        "...................HHHH.",  # 7
        "...................hHHH.",  # 8
        "....................HHH.",  # 9
        "....................HHH.",  # 10
        "....................hHH.",  # 11
        "....................hHH.",  # 12
        "....................hH..",  # 13
        "....................h...",  # 14
    ], 6),
}

# ---------------- 体（服） ----------------
OUTFIT = {
    "tunic": pad([
        ".......OOOOAAOOOO.......",  # 17
        "......OOOOOAAOOOOO......",  # 18
        ".....OOOOOOAAOOOOOO.....",  # 19
        ".....OO.OOOAAOOO.OO.....",  # 20
        ".....Oo.OOOAAOOO.oO.....",  # 21
        ".....SS.LLLGGLLL.SS.....",  # 22
        ".....SS.OOOOOOOO.SS.....",  # 23
        ".....SS.oOOOOOOo.SS.....",  # 24
        ".....SS..oooooo..SS.....",  # 25
    ] + LEGS_PANTS, 17),
    "light": pad([
        ".......MMLLLLLLMM.......",  # 17
        "......MMnLLLLLLnMM......",  # 18
        ".....SSmLLlLLlLLmSS.....",  # 19
        ".....SS.LLLLLLLL.SS.....",  # 20
        ".....Ss.LlLLLLlL.sS.....",  # 21
        ".....SS.AAAGGAAA.SS.....",  # 22
        ".....SS.OOOOOOOO.SS.....",  # 23
        ".....LL.OoOOOOoO.LL.....",  # 24
        ".....SS..OOOOOO..SS.....",  # 25
    ] + LEGS_PANTS, 17),
    "plate": pad([
        ".......MMMMMMMMMM.......",  # 17
        "......nMMMMAAMMMMn......",  # 18
        ".....MMMMMMAAMMMMMM.....",  # 19
        ".....MM.MMMAAMMM.MM.....",  # 20
        ".....mM.MMMAAMMM.Mm.....",  # 21
        ".....MM.mmmGGmmm.MM.....",  # 22
        ".....MM.OOOAAOOO.MM.....",  # 23
        ".....mm.OOOAAOOO.mm.....",  # 24
        ".....MM..oOAAOo..MM.....",  # 25
        "........MMMMMMMM........",  # 26
        "........MMM..MMM........",  # 27
        "........MMm..mMM........",  # 28
        "........nMM..MMn........",  # 29
        ".......MMMM..MMMM.......",  # 30
        ".......mmmm..mmmm.......",  # 31
    ], 17),
    "robe": pad([
        ".......OOOOAAOOOO.......",  # 17
        "......OOOOOAAOOOOO......",  # 18
        ".....OOOOOOAAOOOOOO.....",  # 19
        "....OOO.OOOAAOOO.OOO....",  # 20
        "....OOO.OOOAAOOO.OOO....",  # 21
        "....ooo.AAAAAAAA.ooo....",  # 22
        "....AAA.OOOAAOOO.AAA....",  # 23
        ".....SS.OOOAAOOO.SS.....",  # 24
        ".....SS.OOOAAOOO.SS.....",  # 25
        ".......OOOOAAOOOO.......",  # 26
        ".......OOOOAAOOOO.......",  # 27
        "......OOOOOAAOOOOO......",  # 28
        "......oOOOOAAOOOOo......",  # 29
        "......oooooooooooo......",  # 30
        "........BB....BB........",  # 31
    ], 17),
    "coat": pad([
        ".......OOOWWWWOOO.......",  # 17
        "......OOOOWAAWOOOO......",  # 18
        ".....OOOOOWAAWOOOOO.....",  # 19
        ".....OO.OOWAAWOO.OO.....",  # 20
        ".....Oo.OOWWWWOO.oO.....",  # 21
        ".....OO.OOWWWWOO.OO.....",  # 22
        ".....oo.OOTTTTOO.oo.....",  # 23
        ".....SS.OOTTTTOO.SS.....",  # 24
        ".....SS.OoTTTToO.SS.....",  # 25
        ".......OOOTTTTOOO.......",  # 26
        ".......OOOT..TOOO.......",  # 27
        ".......oooT..Tooo.......",  # 28
        "........BBB..BBB........",  # 29
        ".......BBBB..BBBB.......",  # 30
        ".......bbbb..bbbb.......",  # 31
    ], 17),
    "vest": pad([
        ".......WWWOWWOWWW.......",  # 17
        "......WWWOOWWOOWWW......",  # 18
        ".....WWWOOOWWOOOWWW.....",  # 19
        ".....WW.OOOWWOOO.WW.....",  # 20
        ".....WV.OOOWWOOO.VW.....",  # 21
        ".....SS.OOOWWOOO.SS.....",  # 22
        ".....SS.LLLGGLLL.SS.....",  # 23
        ".....SS.TTTTTTTT.SS.....",  # 24
        ".....SS..TTTTTT..SS.....",  # 25
    ] + LEGS_PANTS, 17),
    "poncho": pad([
        ".......CCCCCCCCCC.......",  # 17
        "......CCCCCCCCCCCC......",  # 18
        ".....CCCCCCCCCCCCCC.....",  # 19
        "....CCCCCCCCCCCCCCCC....",  # 20
        "....CcCCAACCCCAACCcC....",  # 21
        "....cccccccccccccccc....",  # 22
        "....A.A.A.A..A.A.A.A....",  # 23
        ".....SS.OOOOOOOO.SS.....",  # 24
        ".....SS..oOOOOo..SS.....",  # 25
    ] + LEGS_PANTS, 17),
}

# ---------------- 背中側 ----------------
BACK = {
    "cape": pad([
        "......cCCCCCCCCCCc......",  # 17
        ".....cCCCCCCCCCCCCc.....",  # 18
        "....cCCCCCCCCCCCCCCc....",  # 19
    ] + ["....cCCcCCCCCCCCcCCc...."] * 6 + [  # 20-25
        "....cCCCCCCccCCCCCCc....",  # 26
        "....cCCCCCCccCCCCCCc....",  # 27
        "....ccCCCCCccCCCCCcc....",  # 28
        ".....cccccc..cccccc.....",  # 29
    ], 17),
    "pack": pad([
        "......aAAAAAAAAAAa......",  # 1
        ".....aAAaAAAAaAAAAa.....",  # 2
        "......aaaaaaaaaaaa......",  # 3
    ] + ["..LLl..............lLL.."] * 20 + [  # 4-23
        "..lll..............lll..",  # 24
    ], 1),
}

# ---------------- 頭の装備 ----------------
HEADGEAR = {
    "circlet": pad([
        "....GGGGGGGXXGGGGGGG....",  # 7
    ], 7),
    "headband": pad([
        "....RRRRRRRRRRRRRRRR....",  # 7
        "....rrrrrrrrrrrrrrrrRR..",  # 8
        "....................RrR.",  # 9
        ".....................rR.",  # 10
    ], 7),
    "wizard": pad([
        "...............OO.......",  # 0
        ".............OOOo.......",  # 1
        "...........OOOOo........",  # 2
        "..........OOOOOo........",  # 3
        ".........OOOOOOOo.......",  # 4
        "........OOOOOOOOOo......",  # 5
        "......AAAAAAAAAAAAA.....",  # 6
        "..OOOOOOOOOOOOOOOOOOOO..",  # 7
        "...oooooooooooooooooo...",  # 8
    ], 0),
    "hood": pad([
        "........CCCCCCCC........",  # 2
        "......CCCCCCCCCCCC......",  # 3
        ".....CCCCCCCCCCCCCC.....",  # 4
        "....CCCCCCCCCCCCCCCC....",  # 5
        "...CCCCCCCCCCCCCCCCCC...",  # 6
        "...CCCc..........cCCC...",  # 7
        "...CCCc..........cCCC...",  # 8
        "...CCCc..........cCCC...",  # 9
        "...CCCc..........cCCC...",  # 10
        "...CCCc..........cCCC...",  # 11
        "...CCCc..........cCCC...",  # 12
        "...CCCc..........cCCC...",  # 13
        "...cCCc..........cCCc...",  # 14
        "....cCCc........cCCc....",  # 15
        ".....cCCCCCCCCCCCCc.....",  # 16
    ], 2),
    "helmet": pad([
        "..........RR............",  # 0
        ".........RRRR...........",  # 1
        "........MMMMMMMM........",  # 2
        "......MMnnMMMMMMMM......",  # 3
        ".....MMnMMMMMMMMMMM.....",  # 4
        "....MMMMMMMMMMMMMMMM....",  # 5
        "....MMMMMMMMMMMMMMMM....",  # 6
        "....mmmmmmmmmmmmmmmm....",  # 7
        "....MMm..........mMM....",  # 8
        "....MMm..........mMM....",  # 9
        "....MMm..........mMM....",  # 10
        "....MMm..........mMM....",  # 11
        "....MMm..........mMM....",  # 12
        "....MMm..........mMM....",  # 13
        "....MMMm........mMMM....",  # 14
        ".....mmm........mmm.....",  # 15
    ], 0),
    "cap": pad([
        "........AAAAAAAA........",  # 2
        "......AAAAAAAAAAAA......",  # 3
        ".....AAAAAAAAAAAAAA.....",  # 4
        "....AAAAAAAAAAAAAAAA....",  # 5
        "....aaaaaaaaaaaaaaaa....",  # 6
    ], 2),
    "widehat": pad([
        "........LLLLLLLL........",  # 2
        ".......LLLLLLLLLL.......",  # 3
        ".......LLLLLLLLLL.......",  # 4
        ".......AAAAAAAAAA.......",  # 5
        ".LLLLLLLLLLLLLLLLLLLLLL.",  # 6
        "..llllllllllllllllllll..",  # 7
    ], 2),
    "veil": pad([
        "........WWWWWWWW........",  # 2
        "......WWWWWWWWWWWW......",  # 3
        ".....WWWWWWGGWWWWWW.....",  # 4
        "....WWWWWWGGGGWWWWWW....",  # 5
        "....GGGGGGGGGGGGGGGG....",  # 6
        "...WWWV..........VWWW...",  # 7
        "...WWWV..........VWWW...",  # 8
        "...WWWV..........VWWW...",  # 9
        "...WWWV..........VWWW...",  # 10
        "...WWWV..........VWWW...",  # 11
        "...WWWV..........VWWW...",  # 12
        "...WWWV..........VWWW...",  # 13
        "...VWWWV........VWWWV...",  # 14
        "....VWWWWWWWWWWWWWWV....",  # 15
    ], 2),
    "glasses": pad([
        ".......NNNN..NNNN.......",  # 9
        ".......N..N..N..N.......",  # 10
        "......NN..NNNN..NN......",  # 11
        ".......N..N..N..N.......",  # 12
        ".......NNNN..NNNN.......",  # 13
    ], 9),
}

# ---------------- 持ち物 ----------------
def col(x, ch, y0, y1):
    return {(x, y): ch for y in range(y0, y1 + 1)}


def grid_from(points):
    rows = [list(BLANK) for _ in range(H)]
    for (x, y), ch in points.items():
        if 0 <= x < W and 0 <= y < H:
            rows[y][x] = ch
    return ["".join(r) for r in rows]


def item_sword():
    p = {(19, 10): "n"}
    p.update(col(19, "M", 11, 22)); p.update(col(20, "m", 11, 22))
    for x in range(17, 22): p[(x, 23)] = "G"
    p.update(col(19, "L", 24, 25)); p[(19, 26)] = "G"
    return grid_from(p)


def item_axe():
    p = col(19, "K", 8, 28)
    rows = {8: "MMM", 9: "MMMM", 10: "MMMn", 11: "MMMM", 12: "MMM"}
    for y, s in rows.items():
        for i, ch in enumerate(s): p[(20 + i, y)] = ch
    p[(18, 9)] = "m"; p[(18, 10)] = "m"; p[(18, 11)] = "m"
    return grid_from(p)


def item_staff():
    p = col(19, "K", 6, 31)
    p.update({(18, 2): "x", (19, 2): "X", (20, 2): "x", (18, 3): "X", (19, 3): "n", (20, 3): "X",
              (18, 4): "x", (19, 4): "X", (20, 4): "x", (18, 5): "G", (20, 5): "G", (19, 5): "G"})
    return grid_from(p)


def item_bow():
    p = {}
    curve = {12: 20, 13: 21, 14: 21, 15: 22, 16: 22, 17: 22, 18: 22, 19: 22, 20: 22, 21: 22, 22: 22,
             23: 22, 24: 21, 25: 21, 26: 20}
    for y, x in curve.items(): p[(x, y)] = "L"
    p[(20, 12)] = "l"; p[(20, 26)] = "l"
    for y in range(13, 26): p[(19, y)] = "W"
    p[(22, 19)] = "l"
    return grid_from(p)


def item_book():
    p = {}
    for x in range(14, 19):
        p[(x, 20)] = "A"; p[(x, 24)] = "a"
    for y in range(21, 24):
        p[(14, y)] = "A"; p[(18, y)] = "A"
        for x in range(15, 18): p[(x, y)] = "Y"
    p[(15, 22)] = "y"; p[(16, 22)] = "y"; p[(17, 22)] = "y"
    p[(15, 21)] = "G"
    return grid_from(p)


def item_spear():
    p = col(19, "K", 5, 31)
    p.update({(19, 1): "n", (19, 2): "M", (18, 3): "M", (19, 3): "M", (20, 3): "m", (19, 4): "m",
              (18, 5): "R", (20, 5): "R", (18, 6): "r", (20, 6): "r"})
    return grid_from(p)


def item_shield():
    rows = {18: ".mMMMMm", 19: ".MAAAAM", 20: ".MAGGAM", 21: ".MGGGGM", 22: ".MAGGAM",
            23: ".MAAAAM", 24: "..MAAM.", 25: "..mAAm.", 26: "...mm.."}
    p = {}
    for y, s in rows.items():
        for x, ch in enumerate(s):
            if ch != ".": p[(x, y)] = ch
    return grid_from(p)


def item_stick():
    p = col(19, "K", 14, 31)
    p.update({(18, 12): "K", (19, 12): "K", (20, 13): "K", (18, 13): "k", (17, 13): "k"})
    p[(19, 13)] = "K"
    return grid_from(p)


def item_cross():
    p = col(19, "K", 7, 31)
    p.update(col(19, "G", 1, 6))
    p.update({(18, 3): "G", (20, 3): "G", (17, 3): "g", (21, 3): "g", (19, 0): "g"})
    p[(18, 7)] = "g"; p[(20, 7)] = "g"
    return grid_from(p)


def item_pouch():
    p = {(5, 24): "L", (6, 24): "L", (4, 25): "L", (5, 25): "G", (6, 25): "L", (7, 25): "L",
         (4, 26): "l", (5, 26): "L", (6, 26): "L", (7, 26): "l", (5, 27): "l", (6, 27): "l"}
    return grid_from(p)


ITEMS = {
    "sword": item_sword(), "axe": item_axe(), "staff": item_staff(), "bow": item_bow(),
    "book": item_book(), "spear": item_spear(), "shield": item_shield(), "stick": item_stick(),
    "cross": item_cross(), "pouch": item_pouch(),
}

# 包帯（共通の重ね絵）
BANDAGE = grid_from({
    **{(x, 7): "W" for x in range(4, 20)},
    **{(x, 8): "V" for x in range(5, 19)},
    (19, 6): "W", (20, 6): "W", (20, 7): "W", (21, 8): "V", (20, 9): "V",
    (15, 13): "Y", (16, 13): "Y", (17, 13): "Y", (16, 12): "y",
    (5, 21): "W", (6, 21): "W", (5, 22): "V", (6, 22): "V",
})
