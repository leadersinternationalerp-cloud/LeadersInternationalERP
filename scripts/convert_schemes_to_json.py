import json
import re
from pathlib import Path
from docx import Document

SCHEMES_ROOT = Path(r'F:/SCHEMES')
OUTPUT_PATH = Path(r'f:/LEADERS_INTERNATIONAL_FILES/LeadersInternationalERP/src/lib/data/curriculum/all_subjects.json')

SUBJECT_MAP = {
    'ART&CRAFT': 'Art and Craft',
    'COMPUTING': 'Computing',
    'DIGITAL LITERACY': 'Digital Literacy',
    'ENGLISH': 'English Language',
    'MATHEMATICS': 'Mathematics',
    'MUSIC': 'Music',
    'SCIENCE': 'Science',
    'GLOBAL PERSPECTIVES': 'Global Perspectives'
}

STAGE_PATTERN = re.compile(r'Stage\s*(\d+)')
TOPIC_LINE_PATTERN = re.compile(r'^(?:Unit\s*\d+(?:\.\d+)?\s*)?(?:Topic\s*\d+\s*)?(.*?)(?:\t|\s{2,}|$)')


def parse_docx_topics(doc_path: Path):
    doc = Document(doc_path)
    stage = None
    topics = []

    file_stage_match = STAGE_PATTERN.search(doc_path.name)
    if file_stage_match:
        stage = f"Stage {file_stage_match.group(1)}"

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        stage_match = STAGE_PATTERN.search(text)
        if stage_match and 'Stage' in text and not text.lower().startswith('unit'):
            stage = f"Stage {stage_match.group(1)}"
            continue

        if text.lower().startswith('unit'):
            cleaned = TOPIC_LINE_PATTERN.match(text)
            if cleaned:
                topic_name = cleaned.group(1).strip()
                if topic_name and not topic_name.lower().startswith('contents') and not topic_name.lower().startswith('sample') and 'changes to' not in topic_name.lower():
                    topics.append(topic_name)

    unique_topics = []
    seen = set()
    for topic in topics:
        normalized = topic.lower().strip()
        if normalized not in seen:
            seen.add(normalized)
            unique_topics.append(topic)

    return stage, unique_topics


def build_subject_json():
    subject_data = {}

    for subject_dir in SCHEMES_ROOT.iterdir():
        if not subject_dir.is_dir():
            continue
        subject_key = subject_dir.name.upper()
        mapped = SUBJECT_MAP.get(subject_key, subject_dir.name)
        subject_data[mapped] = {f"Stage {i}": [] for i in range(1, 7)}

        for docx_file in sorted(subject_dir.glob('*.docx')):
            stage, topics = parse_docx_topics(docx_file)
            if stage is None:
                continue
            entry_list = []
            for topic in topics:
                entry_list.append({
                    'topic': topic,
                    'content': ''
                })
            subject_data[mapped][stage] = entry_list

    return subject_data


if __name__ == '__main__':
    data = build_subject_json()
    print('Subjects converted:', list(data.keys()))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print('Written', OUTPUT_PATH)
