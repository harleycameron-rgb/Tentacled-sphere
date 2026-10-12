#!/usr/bin/env python3
"""Generate the integrated homepage and eight app pages from one template."""

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPS = (
    ("tap", "Tap"),
    ("surface", "Surface"),
    ("spiritlevel", "SpiritLevel"),
    ("gain", "Gain"),
    ("habitat", "Habitat"),
    ("time", "Time"),
    ("space", "Space"),
    ("lineage", "Lineage"),
)


def render(template: str, app_id: str, title: str) -> str:
    return template.replace("__APP_ID__", app_id).replace("__TITLE__", title)


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def build(output: Path, check: bool = False) -> bool:
    template = (ROOT / "web" / "app-template.html").read_text(encoding="utf-8")
    generated = {output / "index.html": render(template, "home", "Integrated view")}
    generated.update({
        output / "apps" / f"{app_id}.html": render(template, app_id, title)
        for app_id, title in APPS
    })
    assets = ("geometry.js", "protocol.js", "audio.js", "app.js", "style.css")
    correct = True
    for path, contents in generated.items():
        if check:
            if not path.is_file() or path.read_text(encoding="utf-8") != contents:
                print(f"Out of date: {display_path(path)}")
                correct = False
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(contents, encoding="utf-8")
            print(f"Generated {display_path(path)}")
    for asset in assets:
        source = ROOT / "web" / asset
        target = output / "web" / asset
        if check:
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                print(f"Out of date: {display_path(target)}")
                correct = False
        elif source.resolve() != target.resolve():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            print(f"Copied {display_path(target)}")
    return correct


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    if not build(arguments.output.resolve(), arguments.check):
        raise SystemExit(1)
