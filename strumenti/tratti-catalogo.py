#!/usr/bin/env python3
"""Build the character's ordinary Trait catalogue from the manual's sole source.

Run with --check in validation: the app must retain the same requirements and
complete rule paragraphs as §16.9, without another hand-maintained catalogue.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "strumenti/manuale-correzioni.json"
OUTPUT = ROOT / "regole/tratti-data.js"


def identifier(name):
    plain = unicodedata.normalize("NFKD", name)
    plain = "".join(c for c in plain if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")


def catalogue():
    sections = json.loads(SOURCE.read_text(encoding="utf-8"))["sezioni"]
    section = next(s for s in sections if s["sezione"] == "16.9")
    blocks = section["contenuto"]
    table = next(b for b in blocks if b.get("classe") == "man-tab-tratti")
    rows = {row[2]: row for row in table["righe"]}
    start = next(i for i, b in enumerate(blocks) if b.get("testo", "").startswith("16.9.6"))
    end = next(i for i, b in enumerate(blocks) if b.get("testo", "").startswith("16.9.7"))
    traits = []
    skill = ""
    for i in range(start + 1, end):
        block = blocks[i]
        if block["t"] == "h":
            skill = block["testo"]
        if block["t"] != "h3":
            continue
        name = block["testo"]
        paragraphs = []
        for following in blocks[i + 1:end]:
            if following["t"] in ("h", "h3"):
                break
            if following["t"] == "p":
                paragraphs.append(following["testo"])
        metadata, *effects = paragraphs
        match = re.search(r"Requisiti: (Forza|Tecnica|Astuzia|Spirito) (d\d+), (.+?) (d\d+)(?:,| ·|$)", metadata)
        if not match:
            raise ValueError(f"Requisiti non riconosciuti: {name}")
        attribute, attribute_die, requirement_skill, skill_die = match.groups()
        if requirement_skill != skill or rows[name][0] != skill:
            raise ValueError(f"Skill discordante nel catalogo: {name}")
        evolution = re.search(r"Evoluzione di (.+?) ·", metadata)
        previous = identifier(evolution.group(1)) if evolution else ""
        limit_match = re.search(r"Limite: (.+?)(?: ·|$)", metadata)
        limit = limit_match.group(1) if limit_match else ""
        if not limit:
            limit = next((p[len("Limite: "):].rstrip(".") for p in effects if p.startswith("Limite: ")), "")
        frequency = ""
        for text, key in (("round", "round"), ("turno", "turn"), ("scena", "scene"),
                          ("scontro", "combat"), ("intervento", "intervention"), ("traversata", "voyage")):
            if text in limit:
                frequency = key
                break
        trait = {"id": identifier(name), "name": name, "skill": skill,
                 "attribute": attribute, "attributeDie": attribute_die, "skillDie": skill_die,
                 "requires": [previous] if previous else [],
                 "replaces": [previous] if previous else [], "type": "Passivo",
                 "limit": limit, "frequency": frequency, "effects": effects,
                 "requirementsText": rows[name][3], "metadata": metadata,
                 "manual": "/manuale/#sez-16-9"}
        if name in ("Corpo Mostruoso", "Fortezza Vivente"):
            trait["passiveDefense"] = 4 if previous else 2
        traits.append(trait)
    if len(traits) != 31 or len(rows) != 31 or {t["name"] for t in traits} != set(rows):
        raise ValueError("Il catalogo deve corrispondere a tutti i 31 Tratti ordinari.")
    if any(r not in {t["id"] for t in traits} for t in traits for r in t["requires"]):
        raise ValueError("Prerequisito di Evoluzione mancante.")
    return {"version": 1, "source": "Manuale GLC §16.9",
            "sourceHash": hashlib.sha256(json.dumps(section, ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
            "manual": "/manuale/#sez-16-9",
            "dice": ["d4", "d6", "d8", "d10", "d12", "d20", "d20+d4", "d20+d6", "d20+d8", "d20+d10", "d20+d12", "d20+d20"],
            "skills": list(dict.fromkeys(t["skill"] for t in traits)), "traits": traits}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = json.dumps(catalogue(), ensure_ascii=False, indent=2)
    result = ("/* Generated from Manuale GLC §16.9; regenerate with strumenti/tratti-catalogo.py. */\n"
              "(function(root){'use strict';root.GLCTrattiData=" + data + ";\n"
              "})(typeof window!=='undefined'?window:globalThis);\n")
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != result:
            raise SystemExit("Il catalogo Tratti dell’app non corrisponde al manuale: rigenerarlo.")
        print("Catalogo Tratti allineato: 31 Tratti, 16 Skill.")
    else:
        OUTPUT.write_text(result, encoding="utf-8")
        print("Generato regole/tratti-data.js: 31 Tratti, 16 Skill.")


if __name__ == "__main__":
    main()
