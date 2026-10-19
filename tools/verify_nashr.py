#!/usr/bin/env python3
"""
Machine check of every rule against the an-Nashr statement it cites.

For each rule, finds the sentence on the cited page(s) of sources/nashr-farsh.jsonl that mentions the rule's word,
reads the readers named in its opening clause ("فقرأ … ب…", "فروى …"), and compares them with the readers the rule
names for its non-majority variants. Readers given as khulf (~x) are ignored on both sides.

  python3 tools/verify_nashr.py [OUT.tsv]   -> prints counts, writes mismatches (default: stdout)

sources/nashr-farsh.jsonl is not distributed with the repository; this tool only runs where it is present.
"""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import build_data as B

ROOT = Path(__file__).resolve().parent.parent
NASHR = ROOT / "sources" / "nashr-farsh.jsonl"
AR = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
MARKS = re.compile("[ً-ٰٟـ]")

def plain(s):
    s = MARKS.sub("", s)
    return re.sub("[ٱأإآ]", "ا", s).replace("ى", "ي").replace("ة", "ه")

def skel(s):
    return re.sub("[اويءئؤ]", "", plain(s))

G = B.GROUPS
NAMES = [  # longest first; plain spelling
    ("خلف عن حمزه", ["kh"]), ("خلاد عن حمزه", ["kd"]), ("الدوري عن الكسائي", ["dk"]), ("الدوري عن ابي عمرو", ["da"]),
    ("ابو الحارث", ["ah"]), ("ابن ذكوان", ["dh"]), ("ابن وردان", ["iw"]), ("ابن جماز", ["ij"]), ("ابن كثير", G["kathir"]),
    ("ابن عامر", G["ibnamir"]), ("ابو عمرو", G["abuamr"]), ("ابو جعفر", G["abujafar"]), ("ابو بكر", ["sh"]),
    ("المدنيان", G["madaniyan"]), ("البصريان", G["basriyan"]), ("الكوفيون", G["kufiyun"]), ("الحرميان", G["harmiyan"]),
    ("الاخوان", G["akhawan"]), ("قالون", ["qa"]), ("ورش", ["wr"]), ("الازرق", ["wr"]), ("الاصبهاني", ["wr"]), ("البزي", ["bz"]),
    ("قنبل", ["qn"]), ("السوسي", ["su"]), ("هشام", ["hi"]), ("شعبه", ["sh"]), ("حفص", ["hf"]), ("عاصم", G["asim"]),
    ("حمزه", G["hamzah"]), ("خلاد", ["kd"]), ("الكسائي", G["kisai"]), ("رويس", ["rw"]), ("روح", ["rh"]), ("يعقوب", G["yaqub"]),
    ("خلف", G["khalaf"]), ("نافع", G["nafi"]), ("ادريس", ["id"]), ("اسحاق", ["is"]),
]
NAMES = [(plain(n).split(), c) for n, c in NAMES]
CASE = re.compile(r"(ٌ|ٍ|ُ|ِ|ً|َ)+$")

def names_at(tokens, i):
    """Readers named from token i on, stopping at the first token that is not a name or a conjunction."""
    got = set()
    while i < len(tokens):
        hit = False
        for parts, codes in NAMES:
            cand = tokens[i:i + len(parts)]
            if len(cand) == len(parts) and all(re.sub("^و", "", c) == p if k == 0 else c == p
                                               for k, (c, p) in enumerate(zip(cand, parts))):
                got |= set(codes); i += len(parts); hit = True; break
        if not hit:
            break
    return got

def clause_readers(seg):
    """Readers of the first «فقرأ/فروى» clause, plus those after «وقرأ/وروى/ووافقهم» clauses before «الباقون»."""
    toks = [re.sub(r"[^\w]", "", t) for t in plain(seg).split()]
    toks = [t for t in toks if t]
    out = []
    for i, t in enumerate(toks):
        if t in ("الباقون",):
            break
        if t in ("فقرا", "فروي", "وقرا", "وروي", "قرا", "روي", "فقراه", "فقراهما", "فرواه", "وقراه", "وقراهما",
                 "وافقه", "وافقهم", "وافقهما", "ووافقه", "ووافقهم", "ووافقهما", "وكذلك", "وكذا"):
            got = names_at(toks, i + 1)
            if got:
                out.append(got)
    if not out:
        # «وأسكن الدال من القدس حيث جاء ابن كثير»: the readers follow the words; take the first run of names
        for i, t in enumerate(toks):
            if t.startswith("واختلف") or t == "الباقون":
                break
            got = names_at(toks, i)
            if got:
                out.append(got)
                break
    return out

USUL = ROOT / "sources" / "nashr-usul.jsonl"   # optional: volume 1 pages (al-Fatihah is treated in the usul)

def load_pages():
    pages = {}
    for path, vol in ((NASHR, None), (USUL, "1")):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf8").splitlines():
            d = json.loads(line)
            pages[(d.get("vol") or vol, d["page"])] = d["text"]
    return pages

def cited_pages(ref):
    out = []
    for m in re.finditer(r"([١٢])/([٠-٩]+)(?:[–-]([٠-٩]+))?", ref):
        vol, a = m.group(1).translate(AR), int(m.group(2).translate(AR))
        b = int(m.group(3).translate(AR)) if m.group(3) else a
        out += [(vol, str(p)) for p in range(a - 1, b + 2)]
    return out

def segments(text):
    return [s for s in re.split(r"\((?:و)?(?:اختلفوا|اختلف|اتفقوا)\)|\n", text) if s.strip()]

def main():
    pages = load_pages()
    ayat = B.load_quran()
    rows, stats = [], {"agree": 0, "differ": 0, "no-text": 0, "no-names": 0}
    for path in sorted(B.RULES_DIR.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf8"))
        for rule in doc["rules"]:
            where = f"{path.name}#{rule.get('id')}"
            try:
                occ = B.occurrences(rule, ayat, where)
            except ValueError:
                continue
            if not occ:
                continue
            ours_named, khulf = set(), set()
            for _t, spec, *_ in rule["v"]:
                toks = B.expand_spec(spec, where).split()
                for tok in toks:
                    if tok == "*":
                        continue
                    c = tok.strip("~!")
                    if tok.startswith("~"):
                        khulf.add(c)
                    elif "*" not in toks:
                        ours_named.add(c)
            s, a, i, _ = occ[0]
            word = ayat[(s, a)][i][0]
            target = skel(word)
            text = "\n".join(pages.get(p, "") for p in cited_pages(rule.get("ref", "")))
            hit = lambda g, n: any(skel(w) == target or (len(target) > 3 and target in skel(w)) for w in g.split()[:n])
            allsegs = segments(text)
            segs = [g for g in allsegs if hit(g, 12)] or [g for g in allsegs if hit(g, 40)] or [g for g in allsegs if hit(g, 400)]
            if not segs:
                stats["no-text"] += 1
                rows.append(("no-text", where, f"{s}:{a}", word, "", ""))
                continue
            clauses = clause_readers(segs[0])
            if not clauses:
                stats["no-names"] += 1
                rows.append(("no-names", where, f"{s}:{a}", word, "", segs[0][:200]))
                continue
            S = ours_named - khulf
            comp = set(B.CODES) - ours_named - khulf
            from itertools import combinations
            cands = [set().union(*combo) - khulf for k in range(1, min(len(clauses), 4) + 1)
                     for combo in combinations(clauses, k)]
            if S in cands or comp in cands:
                stats["agree"] += 1
                rows.append(("agree", where, f"{s}:{a}", word, "", ""))
            else:
                stats["differ"] += 1
                order = lambda xs: " ".join(sorted(xs, key=B.CODES.index))
                rows.append(("differ", where, f"{s}:{a}", word,
                             f"ours={order(S)} | nashr={' / '.join(order(c) for c in clauses)}", segs[0][:260]))
    out = open(sys.argv[1], "w", encoding="utf8") if len(sys.argv) > 1 else sys.stdout
    for r in rows:
        out.write("\t".join(r) + "\n")
    print(stats, file=sys.stderr)

if __name__ == "__main__":
    main()
