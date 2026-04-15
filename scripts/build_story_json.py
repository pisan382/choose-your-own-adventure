"""
build_story_json.py

Converts the cot-pages-ocr-v2 txt files into a single JSON file
(data/story.json) suitable for the static web reader.

Usage:
    python3 scripts/build_story_json.py \
        --pages-dir output/cot-pages-ocr-v2 \
        --output data/story.json
"""

import argparse
import json
import os
import re


def parse_choices(text):
    """
    Extract choices from page text.
    Handles both single-line and multiline "If you ... turn to page N" patterns,
    plus bare "turn to page N" lines.
    Returns list of {label, target} dicts and cleaned body text.
    """
    # Normalise OCR variant "tum" -> "turn"
    text = re.sub(r'\btum\b', 'turn', text)

    choices = []
    choice_spans = []  # track regions to remove from body

    # Match multiline If-you blocks:
    #   "If you [action text across 1-3 lines], turn to page N."
    if_pattern = re.compile(
        r'(If you\b[\s\S]{1,120}?turn to page\s+(\d+)\.?)',
        re.IGNORECASE
    )
    for m in if_pattern.finditer(text):
        full = m.group(1)
        target = int(m.group(2))
        label = re.sub(r'\s*turn to page\s+\d+\.?', '', full, flags=re.IGNORECASE)
        label = re.sub(r'^If you\s+', '', label, flags=re.IGNORECASE).strip().strip(',').strip()
        label = ' '.join(label.split())  # collapse whitespace/newlines
        choices.append({"label": label, "target": target})
        choice_spans.append((m.start(), m.end()))

    # Bare "turn to page N" not already covered
    standalone = re.compile(r'turn to page\s+(\d+)\.?', re.IGNORECASE)
    already_targeted = {c["target"] for c in choices}
    for m in standalone.finditer(text):
        t = int(m.group(1))
        if t not in already_targeted:
            # check if this position overlaps any already-matched span
            in_span = any(s <= m.start() < e for s, e in choice_spans)
            if not in_span:
                choices.append({"label": f"Turn to page {t}", "target": t})
                already_targeted.add(t)
                choice_spans.append((m.start(), m.end()))

    # Build body by removing matched choice spans (in reverse order to keep indices valid)
    body = text
    for start, end in sorted(choice_spans, reverse=True):
        body = body[:start] + body[end:]
    body = re.sub(r'\n{3,}', '\n\n', body).strip()

    return choices, body


def is_ending(text):
    return bool(re.search(r'The\s+End', text, re.IGNORECASE))


def load_pages(pages_dir):
    pages = {}
    for fname in sorted(os.listdir(pages_dir)):
        if not fname.endswith('.txt'):
            continue
        m = re.match(r'^(\d+)-', fname)
        if not m:
            continue
        page_num = int(m.group(1))
        path = os.path.join(pages_dir, fname)
        with open(path, encoding='utf-8') as f:
            raw = f.read()
        # Strip leading "Page N\n" header
        raw = re.sub(r'^Page\s+\d+\s*\n', '', raw).strip()
        choices, body = parse_choices(raw)
        ending = is_ending(raw)
        pages[page_num] = {
            "page": page_num,
            "text": body,
            "choices": choices,
            "is_ending": ending,
        }
    return pages


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pages-dir', default='output/cot-pages-ocr-v2')
    parser.add_argument('--output', default='data/story.json')
    args = parser.parse_args()

    pages = load_pages(args.pages_dir)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    out = {
        "title": "The Cave of Time",
        "start_page": 2,
        "pages": pages,
    }

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(pages)} pages to {args.output}")


if __name__ == '__main__':
    main()
