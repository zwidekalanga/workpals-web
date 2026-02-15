# JD Normalization & Section Detection: Research & Implementation Guide

> For the WorkPals CV Alignment Engine -- Phase 2 backend processing pipeline.
> Rule-based first, LLM fallback when confidence is low.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Raw JD Text Cleaning](#2-raw-jd-text-cleaning)
3. [Rule-Based Section Detection](#3-rule-based-section-detection)
4. [Tone Detection](#4-tone-detection)
5. [Seniority Level Detection](#5-seniority-level-detection)
6. [Skill Cluster Extraction](#6-skill-cluster-extraction)
7. [Confidence Scoring & LLM Fallback](#7-confidence-scoring--llm-fallback)
8. [Putting It All Together](#8-putting-it-all-together)

---

## 1. Architecture Overview

The JD processing pipeline has two layers:

```
Raw JD Text (PDF/DOCX/TXT/HTML)
        |
        v
  [Layer 1: Rule-Based Engine]
        |--- Text cleaning & normalization
        |--- Section detection via regex/keywords
        |--- Seniority detection
        |--- Tone classification
        |--- Skill extraction & clustering
        |--- Confidence scoring per field
        |
        v
  [Decision Gate: Confidence >= threshold?]
       / \
     YES   NO
      |      \
      v       v
  [Return]  [Layer 2: LLM Fallback]
              |--- Send ambiguous sections to LLM
              |--- Merge LLM results with rule-based results
              |--- Return combined output
```

Design principle: the rule-based layer should handle ~70-80% of JDs confidently.
LLM calls are expensive and slow -- reserve them for genuinely ambiguous cases.

---

## 2. Raw JD Text Cleaning

### 2.1 HTML Entity & Unicode Normalization

Job descriptions scraped from the web or extracted from rich-text editors carry
HTML entities, smart quotes, non-breaking spaces, and other encoding artifacts.

```python
import re
import html
import unicodedata


def clean_jd_text(raw: str) -> str:
    """
    Full cleaning pipeline for raw JD text.
    Order matters -- HTML decoding must happen before regex passes.
    """
    text = raw

    # --- Step 1: HTML entity decoding (run twice for double-encoded entities) ---
    # e.g. "&amp;amp;" -> "&amp;" -> "&"
    text = html.unescape(html.unescape(text))

    # --- Step 2: Strip remaining HTML tags ---
    text = re.sub(r"<[^>]+>", " ", text)

    # --- Step 3: Unicode normalization (NFKC collapses compatibility chars) ---
    # Converts: fi ligature -> "fi", fullwidth A -> "A", etc.
    text = unicodedata.normalize("NFKC", text)

    # --- Step 4: Smart quotes and typographic characters ---
    SMART_QUOTE_MAP = {
        "\u2018": "'",   # left single quote
        "\u2019": "'",   # right single quote / apostrophe
        "\u201C": '"',   # left double quote
        "\u201D": '"',   # right double quote
        "\u2013": "-",   # en dash
        "\u2014": "--",  # em dash
        "\u2026": "...", # ellipsis
        "\u00A0": " ",   # non-breaking space
        "\u200B": "",    # zero-width space
        "\u200C": "",    # zero-width non-joiner
        "\u200D": "",    # zero-width joiner
        "\uFEFF": "",    # byte order mark
    }
    for char, replacement in SMART_QUOTE_MAP.items():
        text = text.replace(char, replacement)

    # --- Step 5: Normalize whitespace ---
    # Collapse multiple spaces/tabs to single space
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse 3+ newlines to 2 (preserve paragraph breaks)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip leading/trailing whitespace per line
    text = "\n".join(line.strip() for line in text.split("\n"))
    # Strip leading/trailing whitespace overall
    text = text.strip()

    return text
```

### 2.2 Boilerplate Removal

Common boilerplate sections that add noise to JD analysis:

- **EEO / Equal Opportunity Statements**
- **Legal disclaimers** (E-Verify, background check notices)
- **Immigration / visa sponsorship notices**
- **Salary disclosure compliance boilerplate** (Colorado, NYC, California)
- **Cookie / privacy banners** (from web scraping)
- **"How to apply" procedural text**

```python
# --------------------------------------------------------------------------
# Boilerplate detection patterns
# --------------------------------------------------------------------------
# These are compiled once at module level for performance.
# Each pattern is case-insensitive and matches multi-line blocks.

EEO_PATTERNS = [
    # Core EEO declarations
    r"(?:is\s+)?an?\s+equal\s+opportunity\s+employer",
    r"equal\s+opportunity[\s/]+affirmative\s+action\s+employer",
    r"EOE\b.*(?:M/F|minority|female|disability|veteran)",
    r"EEO\s+(?:statement|policy|employer)",
    # Non-discrimination blocks
    r"(?:does\s+not|will\s+not|shall\s+not)\s+discriminate\s+"
    r"(?:on\s+the\s+basis\s+of|based\s+(?:on|upon)|against)",
    r"without\s+regard\s+to\s+(?:race|color|religion|sex|age|national\s+origin)",
    r"prohibits?\s+discrimination\s+(?:and|or)\s+harassment",
    # Protected categories (long comma-separated lists)
    r"race,?\s+color,?\s+religion,?\s+sex(?:ual\s+orientation)?.*"
    r"(?:national\s+origin|disability|veteran|genetic|pregnancy|marital)",
    # Accommodation language
    r"reasonable\s+accommodations?\s+(?:for|to)\s+"
    r"(?:qualified\s+)?(?:individuals?|applicants?|persons?)",
]

LEGAL_PATTERNS = [
    # E-Verify
    r"(?:participates?\s+in|uses?)\s+E-?Verify",
    r"E-?Verify\s+(?:employer|participant)",
    # Background checks
    r"(?:subject\s+to|require[sd]?)\s+(?:a\s+)?(?:background|criminal|drug)\s+"
    r"(?:check|screen|test)",
    # Visa / work authorization
    r"(?:must\s+be|authorized\s+to)\s+(?:legally\s+)?(?:work|authorized)"
    r"(?:\s+in\s+the\s+(?:United\s+States|U\.?S\.?|US))?",
    r"(?:will\s+not|unable\s+to|cannot|does\s+not)\s+"
    r"(?:sponsor|provide)\s+(?:work\s+)?visa",
    r"no\s+(?:visa\s+)?sponsorship",
]

SALARY_DISCLOSURE_PATTERNS = [
    # State/city compliance disclaimers
    r"(?:in\s+accordance\s+with|pursuant\s+to|as\s+required\s+by)\s+"
    r"(?:Colorado|New\s+York|California|NYC|local)\s+"
    r"(?:law|legislation|ordinance|pay\s+transparency)",
    r"pay\s+transparency\s+(?:act|law|nondiscrimination|provision)",
    r"compensation\s+(?:range|band)\s+(?:is\s+)?(?:provided\s+)?"
    r"(?:in\s+(?:compliance|accordance))",
]

APPLY_PATTERNS = [
    r"(?:how\s+to\s+apply|to\s+apply\s*[:,]|apply\s+(?:now|here|today|online))",
    r"(?:click|tap)\s+(?:here|below|the\s+button)\s+to\s+(?:apply|submit)",
    r"submit\s+your\s+(?:application|resume|CV)\s+(?:at|to|through|via)",
]


def compile_boilerplate_patterns():
    """Compile all boilerplate patterns into a single list of regexes."""
    all_patterns = (
        EEO_PATTERNS
        + LEGAL_PATTERNS
        + SALARY_DISCLOSURE_PATTERNS
        + APPLY_PATTERNS
    )
    return [re.compile(p, re.IGNORECASE | re.DOTALL) for p in all_patterns]


BOILERPLATE_REGEXES = compile_boilerplate_patterns()


def remove_boilerplate(text: str) -> tuple[str, list[str]]:
    """
    Remove boilerplate paragraphs from JD text.

    Strategy: split into paragraphs, test each paragraph against
    boilerplate patterns, remove matching paragraphs.

    Returns:
        (cleaned_text, list_of_removed_paragraphs)

    We return removed paragraphs so the caller can log/inspect what was stripped.
    """
    paragraphs = re.split(r"\n{2,}", text)
    kept = []
    removed = []

    for para in paragraphs:
        para_stripped = para.strip()
        if not para_stripped:
            continue

        is_boilerplate = False
        for pattern in BOILERPLATE_REGEXES:
            if pattern.search(para_stripped):
                is_boilerplate = True
                break

        if is_boilerplate:
            removed.append(para_stripped)
        else:
            kept.append(para_stripped)

    return "\n\n".join(kept), removed


def remove_boilerplate_suffix(text: str) -> str:
    """
    Many JDs have a big EEO block at the very end.
    This is a targeted approach: scan from the bottom up and remove
    trailing boilerplate paragraphs.
    """
    paragraphs = re.split(r"\n{2,}", text.strip())

    # Walk backward from end
    cut_index = len(paragraphs)
    for i in range(len(paragraphs) - 1, -1, -1):
        para = paragraphs[i].strip()
        if not para:
            cut_index = i
            continue
        is_bp = any(p.search(para) for p in BOILERPLATE_REGEXES)
        if is_bp:
            cut_index = i
        else:
            break  # Stop at first non-boilerplate paragraph from bottom

    return "\n\n".join(paragraphs[:cut_index]).strip()
```

### 2.3 Job-Board-Specific Cleaning

Different job boards inject their own artifacts:

```python
# Patterns for platform-specific cruft that appears in scraped text

PLATFORM_NOISE = {
    "linkedin": [
        r"(?:Show\s+more|Show\s+less)\s*$",
        r"^Seniority\s+level\s*\n.*$",          # LinkedIn metadata sidebar
        r"^Employment\s+type\s*\n.*$",
        r"^Job\s+function\s*\n.*$",
        r"^Industries?\s*\n.*$",
        r"Set\s+alert\s+for\s+similar\s+jobs",
        r"Report\s+this\s+job",
    ],
    "indeed": [
        r"^(Full Job Description|Job details)\s*$",
        r"Job\s+Type:\s+\w+[-\w\s]*$",
        r"Salary:\s+\$[\d,.]+-?\$?[\d,.]*\s+(?:per|a)\s+\w+",
        r"^Benefits\s+pulled\s+from\s+the\s+full\s+job\s+description",
        r"Indeed\.com",
    ],
    "greenhouse": [
        # Greenhouse hosted pages use specific div structures.
        # After HTML stripping, you often get these artifacts:
        r"^Apply\s+for\s+this\s+Job\s*$",
        r"^\*\s+Required\s*$",
        r"^First\s+Name\s*\*?\s*$",
        r"^Last\s+Name\s*\*?\s*$",
        r"^Email\s*\*?\s*$",
        r"^Resume/CV\s*\*?\s*$",
        r"^Cover\s+Letter\s*$",
        r"^LinkedIn\s+Profile\s*$",
    ],
    "lever": [
        r"^Apply\s+for\s+this\s+job\s*$",
        r"^Or\s+,?\s*you\s+can\s+.*email",
        r"^\+\s+Add\s+cover\s+letter\s*$",
        r"^Submit\s+application\s*$",
    ],
}


def remove_platform_noise(text: str, platform: str | None = None) -> str:
    """
    Remove platform-specific noise from scraped JD text.

    Args:
        text: The JD text after HTML stripping
        platform: One of 'linkedin', 'indeed', 'greenhouse', 'lever', or None.
                  If None, all platform patterns are tried.
    """
    if platform and platform in PLATFORM_NOISE:
        pattern_groups = [PLATFORM_NOISE[platform]]
    else:
        pattern_groups = PLATFORM_NOISE.values()

    for patterns in pattern_groups:
        for p in patterns:
            text = re.sub(p, "", text, flags=re.IGNORECASE | re.MULTILINE)

    # Clean up any resulting empty lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
```

---

## 3. Rule-Based Section Detection

### 3.1 How JD Sections Are Structured Across Platforms

After analyzing hundreds of JDs from LinkedIn, Indeed, Greenhouse, Lever, Workday,
and direct company career pages, these are the dominant section header formats:

| Format | Example | Frequency |
|--------|---------|-----------|
| **ALL CAPS line** | `RESPONSIBILITIES` | Very common (Greenhouse, direct pages) |
| **Title Case with colon** | `Requirements:` | Very common (Indeed, LinkedIn) |
| **Bold markdown** | `**What You'll Do**` | Common (startup career pages) |
| **H-tag (after HTML strip)** | Just the text left | Common (all platforms) |
| **Sentence-style** | `What we're looking for` | Common (modern/casual JDs) |
| **Numbered prefix** | `2. Qualifications` | Rare |
| **Emoji prefix** | `What You'll Do` | Rare but growing (startups) |

### 3.2 Section Keyword Taxonomy

```python
from dataclasses import dataclass, field
from enum import Enum


class JDSection(str, Enum):
    """Canonical section types for a job description."""
    RESPONSIBILITIES = "responsibilities"
    REQUIREMENTS = "requirements"
    SKILLS_REQUIRED = "skills_required"
    SKILLS_PREFERRED = "skills_preferred"
    ABOUT_COMPANY = "about_company"
    ABOUT_ROLE = "about_role"
    CULTURE_BENEFITS = "culture_benefits"
    COMPENSATION = "compensation"
    EDUCATION = "education"
    EXPERIENCE = "experience"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Keyword lists for section classification
# ---------------------------------------------------------------------------
# Each list is ordered by specificity (most specific first).
# Matching is done case-insensitively against the header text.

SECTION_KEYWORDS: dict[JDSection, list[str]] = {
    JDSection.RESPONSIBILITIES: [
        # Exact / near-exact matches
        "responsibilities",
        "key responsibilities",
        "core responsibilities",
        "primary responsibilities",
        "job responsibilities",
        "duties",
        "duties and responsibilities",
        "roles and responsibilities",
        "essential duties",
        "essential functions",
        "job duties",
        # Conversational headers
        "what you'll do",
        "what you will do",
        "what you'll be doing",
        "what you will be doing",
        "what does this role do",
        "in this role you will",
        "in this role, you will",
        "your day-to-day",
        "day to day",
        "the role",
        "role overview",
        "role description",
        "role summary",
        "position overview",
        "position summary",
        "job description",
        "job summary",
        "the opportunity",
        "about the role",
        "about this role",
        "the job",
        "scope of role",
    ],
    JDSection.REQUIREMENTS: [
        "requirements",
        "job requirements",
        "position requirements",
        "minimum requirements",
        "basic requirements",
        "mandatory requirements",
        "qualifications",
        "minimum qualifications",
        "basic qualifications",
        "required qualifications",
        "essential qualifications",
        "who you are",
        "what we're looking for",
        "what we are looking for",
        "what you'll need",
        "what you will need",
        "what you bring",
        "what you'll bring",
        "you should have",
        "you must have",
        "what it takes",
        "candidate profile",
        "ideal candidate",
    ],
    JDSection.SKILLS_REQUIRED: [
        "required skills",
        "must-have skills",
        "must have skills",
        "essential skills",
        "technical requirements",
        "technical skills",
        "required technical skills",
        "core competencies",
        "key skills",
        "skills and experience",
        "skills & experience",
        "skills required",
        "required experience",
    ],
    JDSection.SKILLS_PREFERRED: [
        "preferred skills",
        "preferred qualifications",
        "desired qualifications",
        "desired skills",
        "nice to have",
        "nice-to-have",
        "nice to haves",
        "nice-to-haves",
        "bonus skills",
        "bonus points",
        "bonus qualifications",
        "plus if you have",
        "a plus if",
        "preferred but not required",
        "not required but preferred",
        "additional skills",
        "extra credit",
        "it would be great if",
        "ideally you also have",
        "even better if",
        "what sets you apart",
        "standout qualifications",
    ],
    JDSection.ABOUT_COMPANY: [
        "about us",
        "about the company",
        "about [company]",       # placeholder -- see note below
        "who we are",
        "our company",
        "our mission",
        "our story",
        "our vision",
        "company overview",
        "company description",
        "company background",
        "why us",
        "why join us",
        "why work here",
        "why work with us",
        "our team",
        "about the team",
        "the team",
        "meet the team",
    ],
    JDSection.ABOUT_ROLE: [
        "about the role",
        "about this role",
        "about the position",
        "about this position",
        "role overview",
        "position overview",
        "the opportunity",
        "overview",
    ],
    JDSection.CULTURE_BENEFITS: [
        "benefits",
        "benefits and perks",
        "perks",
        "perks and benefits",
        "what we offer",
        "we offer",
        "our benefits",
        "employee benefits",
        "compensation and benefits",
        "total rewards",
        "why you'll love working here",
        "why you'll love it here",
        "our culture",
        "culture",
        "work environment",
        "life at",
        "working at",
        "our values",
        "company culture",
    ],
    JDSection.COMPENSATION: [
        "compensation",
        "salary",
        "salary range",
        "pay range",
        "pay band",
        "compensation range",
        "total compensation",
        "base salary",
        "base pay",
    ],
    JDSection.EDUCATION: [
        "education",
        "educational requirements",
        "educational qualifications",
        "degree requirements",
        "academic requirements",
        "certifications",
    ],
    JDSection.EXPERIENCE: [
        "experience",
        "experience required",
        "required experience",
        "years of experience",
        "professional experience",
        "work experience",
        "relevant experience",
    ],
}
```

### 3.3 Section Header Detection Engine

```python
@dataclass
class DetectedSection:
    """A detected section within the JD text."""
    section_type: JDSection
    header_text: str           # The raw header text that was matched
    start_line: int            # Line index where header was found
    end_line: int | None       # Line index where next section starts (or None for last)
    content: str               # The text content of this section
    confidence: float          # 0.0 - 1.0 confidence in the classification
    match_method: str          # "exact", "fuzzy", "regex_structure", "llm_fallback"


# ---------------------------------------------------------------------------
# Section header regex patterns
# ---------------------------------------------------------------------------
# These patterns detect STRUCTURAL markers of section headers, independent
# of the actual keywords. They answer: "Does this line LOOK like a header?"

HEADER_STRUCTURE_PATTERNS = [
    # ALL CAPS line (at least 2 words or one long word, no lowercase)
    # e.g. "RESPONSIBILITIES", "KEY REQUIREMENTS AND QUALIFICATIONS"
    (r"^[A-Z][A-Z\s&/,:-]{4,}$", 0.8, "all_caps"),

    # Title Case with optional trailing colon or dash
    # e.g. "Key Responsibilities:", "What You'll Do -"
    (r"^(?:[A-Z][a-z]+\s*){1,6}(?:\s*[:|-])\s*$", 0.75, "title_colon"),

    # Title Case line standing alone (short, < 60 chars, no period at end)
    # e.g. "About the Role"
    (r"^(?:[A-Z][a-z']+\s*){1,7}$", 0.5, "title_case_standalone"),

    # Markdown-style bold header
    # e.g. "**Responsibilities**", "**What We're Looking For**"
    (r"^\*\*(.+?)\*\*\s*:?\s*$", 0.85, "markdown_bold"),

    # Numbered section header
    # e.g. "1. Responsibilities", "2) Requirements"
    (r"^\d+[.)]\s+[A-Z]", 0.6, "numbered"),

    # Emoji-prefixed header (common in modern startup JDs)
    # Matches line starting with emoji followed by text
    (
        r"^[\U0001F300-\U0001F9FF\u2600-\u26FF\u2700-\u27BF]"
        r"\s*[A-Z]",
        0.5,
        "emoji_prefix",
    ),
]


def _normalize_header(text: str) -> str:
    """Normalize a header string for keyword matching."""
    text = text.lower().strip()
    # Remove markdown bold markers
    text = re.sub(r"\*\*", "", text)
    # Remove leading numbers/bullets
    text = re.sub(r"^[\d.)\-*#]+\s*", "", text)
    # Remove trailing colon, dash, pipe
    text = re.sub(r"\s*[:|\-]+\s*$", "", text)
    # Remove emojis
    text = re.sub(
        r"[\U0001F300-\U0001F9FF\u2600-\u26FF\u2700-\u27BF]",
        "",
        text,
    )
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def classify_header(raw_header: str) -> tuple[JDSection, float, str]:
    """
    Classify a header line into a JDSection.

    Returns:
        (section_type, confidence, match_method)
    """
    normalized = _normalize_header(raw_header)

    if not normalized:
        return JDSection.UNKNOWN, 0.0, "empty"

    # --- Pass 1: Exact keyword match ---
    for section_type, keywords in SECTION_KEYWORDS.items():
        for keyword in keywords:
            if normalized == keyword:
                return section_type, 0.95, "exact"

    # --- Pass 2: Substring / containment match ---
    # Check if the normalized header CONTAINS a keyword
    for section_type, keywords in SECTION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in normalized or normalized in keyword:
                # Score based on how much of the header is the keyword
                overlap = len(keyword) / max(len(normalized), 1)
                conf = min(0.85, 0.5 + overlap * 0.4)
                return section_type, conf, "substring"

    # --- Pass 3: Structural pattern match only ---
    # The line looks like a header but we don't recognize the keywords
    for pattern, base_conf, method in HEADER_STRUCTURE_PATTERNS:
        if re.match(pattern, raw_header.strip()):
            return JDSection.UNKNOWN, base_conf * 0.5, f"structure_{method}"

    return JDSection.UNKNOWN, 0.0, "none"


def detect_sections(text: str) -> list[DetectedSection]:
    """
    Detect sections in a JD by finding header lines and classifying them.

    Strategy:
    1. Split text into lines
    2. Score each line on "header-likeness" (structural patterns)
    3. Classify lines that look like headers
    4. Build sections from header positions
    """
    lines = text.split("\n")
    headers: list[tuple[int, str, JDSection, float, str]] = []

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip empty lines and very short lines
        if len(stripped) < 3:
            continue

        # Skip lines that are clearly body text (too long, contains periods mid-text)
        if len(stripped) > 80:
            continue
        if stripped.count(".") > 1 and not stripped.endswith("."):
            continue

        # Check structural patterns first
        is_structural_header = False
        structural_conf = 0.0
        for pattern, conf, _ in HEADER_STRUCTURE_PATTERNS:
            if re.match(pattern, stripped):
                is_structural_header = True
                structural_conf = conf
                break

        # Classify the header
        section_type, keyword_conf, method = classify_header(stripped)

        # Combine structural and keyword confidence
        if section_type != JDSection.UNKNOWN:
            # Known section: boost confidence if structurally header-like
            final_conf = keyword_conf
            if is_structural_header:
                final_conf = min(1.0, keyword_conf + structural_conf * 0.15)
            headers.append((i, stripped, section_type, final_conf, method))
        elif is_structural_header and structural_conf >= 0.6:
            # Unknown keyword but strong structural signal -- include it
            headers.append(
                (i, stripped, JDSection.UNKNOWN, structural_conf * 0.5, "structure_only")
            )

    # --- Build sections from headers ---
    sections: list[DetectedSection] = []
    for idx, (line_num, header_text, section_type, conf, method) in enumerate(headers):
        # End line is the start of the next header, or end of document
        if idx + 1 < len(headers):
            end_line = headers[idx + 1][0]
        else:
            end_line = len(lines)

        # Extract content (lines between this header and the next)
        content_lines = lines[line_num + 1 : end_line]
        content = "\n".join(content_lines).strip()

        sections.append(
            DetectedSection(
                section_type=section_type,
                header_text=header_text,
                start_line=line_num,
                end_line=end_line,
                content=content,
                confidence=conf,
                match_method=method,
            )
        )

    return sections
```

### 3.4 Handling JDs Without Clear Section Headers

Some JDs (especially short ones from LinkedIn Easy Apply or informal startups)
have no clear section headers. They read as continuous prose.

```python
def detect_implicit_sections(text: str) -> list[DetectedSection]:
    """
    For JDs without clear section headers, use content-based heuristics
    to infer section boundaries.

    Heuristics:
    - Bullet-point blocks are likely responsibilities or requirements
    - Lines mentioning "you will" / "you'll" signal responsibilities
    - Lines with "you have" / "you should" signal requirements
    - Lines with "$" or salary keywords signal compensation
    - Lines with "benefits" keywords signal culture/benefits
    """
    lines = text.split("\n")
    sections: list[DetectedSection] = []
    current_type = JDSection.UNKNOWN
    current_start = 0
    current_lines: list[str] = []

    RESPONSIBILITY_SIGNALS = re.compile(
        r"(?:you\s+will|you'll|we\s+need\s+you\s+to|"
        r"your\s+(?:role|mission|mandate)\s+(?:is|will\s+be)|"
        r"(?:build|design|develop|create|lead|manage|drive|own)\s)",
        re.IGNORECASE,
    )

    REQUIREMENT_SIGNALS = re.compile(
        r"(?:you\s+(?:have|should|must|need|bring)|"
        r"(?:requires?|requiring)\s|"
        r"\d+\+?\s*years?\s+(?:of\s+)?(?:experience|exp)|"
        r"(?:bachelor|master|phd|degree|diploma)\s|"
        r"(?:proficiency|expertise|fluency|competency)\s+(?:in|with))",
        re.IGNORECASE,
    )

    COMPENSATION_SIGNALS = re.compile(
        r"(?:\$\s*\d{2,3}[,.]?\d{0,3}|"
        r"salary|compensation|pay\s+(?:range|band)|"
        r"(?:base|total)\s+(?:salary|comp)|"
        r"\d+k\s*[-–]\s*\d+k)",
        re.IGNORECASE,
    )

    BENEFITS_SIGNALS = re.compile(
        r"(?:(?:health|dental|vision)\s+(?:insurance|coverage|plan)|"
        r"(?:401k|401\(k\)|pension|retirement)|"
        r"(?:PTO|paid\s+time\s+off|vacation|holidays)|"
        r"(?:equity|stock\s+options|RSU)|"
        r"(?:remote|hybrid|flexible)\s+(?:work|schedule)|"
        r"(?:parental|maternity|paternity)\s+leave)",
        re.IGNORECASE,
    )

    def classify_line(line: str) -> JDSection:
        if COMPENSATION_SIGNALS.search(line):
            return JDSection.COMPENSATION
        if BENEFITS_SIGNALS.search(line):
            return JDSection.CULTURE_BENEFITS
        if RESPONSIBILITY_SIGNALS.search(line):
            return JDSection.RESPONSIBILITIES
        if REQUIREMENT_SIGNALS.search(line):
            return JDSection.REQUIREMENTS
        return JDSection.UNKNOWN

    for i, line in enumerate(lines):
        detected = classify_line(line)
        if detected != JDSection.UNKNOWN and detected != current_type:
            # Save previous section
            if current_lines:
                content = "\n".join(current_lines).strip()
                if content:
                    sections.append(
                        DetectedSection(
                            section_type=current_type,
                            header_text="(inferred)",
                            start_line=current_start,
                            end_line=i,
                            content=content,
                            confidence=0.4,
                            match_method="implicit_content",
                        )
                    )
            current_type = detected
            current_start = i
            current_lines = [line]
        else:
            current_lines.append(line)

    # Don't forget the last section
    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            sections.append(
                DetectedSection(
                    section_type=current_type,
                    header_text="(inferred)",
                    start_line=current_start,
                    end_line=len(lines),
                    content=content,
                    confidence=0.4,
                    match_method="implicit_content",
                )
            )

    return sections
```

---

## 4. Tone Detection

### 4.1 Tone Categories

| Tone | Signal Words / Patterns | Structural Signals |
|------|------------------------|-------------------|
| **Formal / Corporate** | "shall", "pursuant", "incumbent", "the successful candidate", "commensurate with experience" | Long sentences, passive voice, third person, no contractions |
| **Friendly / Conversational** | "you'll", "we're", "we'd love", "excited", "passionate", "awesome", "amazing", "love" | Second person ("you"), contractions, exclamation marks |
| **Technical / Engineering** | Technical acronyms, version numbers, tool-specific terms, "distributed systems", "event-driven" | Bullet-heavy, jargon-dense, less fluff |
| **Startup-Casual** | "rockstar", "ninja", "guru", "move fast", "wear many hats", "scrappy", "hustle", "0 to 1" | Short paragraphs, emoji, informal, first-person plural "we" |

### 4.2 Tone Scoring Implementation

```python
from dataclasses import dataclass


@dataclass
class ToneScores:
    formal: float = 0.0
    friendly: float = 0.0
    technical: float = 0.0
    startup_casual: float = 0.0

    @property
    def dominant(self) -> str:
        scores = {
            "formal": self.formal,
            "friendly": self.friendly,
            "technical": self.technical,
            "startup_casual": self.startup_casual,
        }
        return max(scores, key=scores.get)

    @property
    def confidence(self) -> float:
        """How confident we are in the dominant tone (spread between top two)."""
        vals = sorted(
            [self.formal, self.friendly, self.technical, self.startup_casual],
            reverse=True,
        )
        if vals[0] == 0:
            return 0.0
        return (vals[0] - vals[1]) / vals[0]


# --- Tone signal patterns ---

FORMAL_SIGNALS = {
    "words": [
        "shall", "pursuant", "herein", "herewith", "incumbent",
        "the successful candidate", "the ideal candidate",
        "commensurate", "requisite", "proficiency",
        "hereunder", "thereof", "aforementioned",
        "as per", "in accordance with", "with respect to",
    ],
    "patterns": [
        r"\b(?:he|she|they)\s+(?:will|shall|must)\b",  # third person
        r"\bthe\s+(?:selected|chosen|ideal|qualified)\s+candidate\b",
        r"\b(?:is\s+expected\s+to|will\s+be\s+required\s+to)\b",
        r"\b(?:duties|functions)\s+(?:include|encompass)\b",
    ],
}

FRIENDLY_SIGNALS = {
    "words": [
        "you'll", "we're", "we've", "you're", "we'd",
        "excited", "passionate", "love", "awesome", "amazing",
        "incredible", "thrilled", "fun", "enjoy",
        "we believe", "we value", "we care",
        "join us", "come join",
    ],
    "patterns": [
        r"\byou(?:'ll|'re|'ve|'d)\b",             # contractions with "you"
        r"\bwe(?:'re|'ve|'ll|'d)\b",              # contractions with "we"
        r"!\s",                                     # exclamation marks
        r"\b(?:can't wait|looking forward)\b",
        r"\bcome\s+(?:join|help|build|grow)\b",
    ],
}

TECHNICAL_SIGNALS = {
    "words": [
        "distributed systems", "microservices", "event-driven",
        "CI/CD", "infrastructure as code", "scalability",
        "latency", "throughput", "SLA", "SLO", "SLI",
        "REST API", "GraphQL", "gRPC", "WebSocket",
        "containerization", "orchestration", "observability",
        "idempotent", "eventual consistency", "CAP theorem",
        "data pipeline", "ETL", "stream processing",
    ],
    "patterns": [
        r"\b(?:v\d+\.?\d*|version\s+\d+)\b",              # version numbers
        r"\b[A-Z]{2,}(?:/[A-Z]{2,})+\b",                   # acronym chains like CI/CD
        r"\b(?:AWS|GCP|Azure|Kubernetes|Docker|Terraform)\b",
        r"\b(?:Python|Java|Go|Rust|TypeScript|C\+\+)\b",
        r"\b\d+(?:ms|GB|TB|QPS|RPS|TPS)\b",                # technical metrics
    ],
}

STARTUP_CASUAL_SIGNALS = {
    "words": [
        "rockstar", "ninja", "guru", "wizard", "unicorn",
        "hustle", "scrappy", "move fast", "break things",
        "wear many hats", "roll up your sleeves",
        "0 to 1", "zero to one", "greenfield",
        "disrupt", "game-changer", "bleeding edge",
        "startup", "seed", "series a", "series b",
        "fast-paced", "high-growth", "hyper-growth",
    ],
    "patterns": [
        r"[\U0001F300-\U0001F9FF]",           # emoji in text
        r"\b(?:we're\s+a\s+(?:small|lean|scrappy))\b",
        r"\b(?:from\s+day\s+one|day\s+1)\b",
        r"\bhands[- ]on\b",
    ],
}


def detect_tone(text: str) -> ToneScores:
    """
    Score the JD text across four tone dimensions.
    Returns a ToneScores object with 0.0-1.0 scores per dimension.
    """
    text_lower = text.lower()
    word_count = max(len(text_lower.split()), 1)

    def score_dimension(signals: dict) -> float:
        hits = 0
        # Word/phrase matches
        for word in signals["words"]:
            hits += len(re.findall(re.escape(word), text_lower))
        # Regex pattern matches
        for pattern in signals["patterns"]:
            hits += len(re.findall(pattern, text, re.IGNORECASE))
        # Normalize by word count (signals per 100 words)
        raw_score = (hits / word_count) * 100
        # Map to 0-1 using a sigmoid-like curve
        # ~3 signals per 100 words -> ~0.5 score
        # ~6+ signals per 100 words -> ~0.8+ score
        return min(1.0, raw_score / 8.0)

    scores = ToneScores(
        formal=score_dimension(FORMAL_SIGNALS),
        friendly=score_dimension(FRIENDLY_SIGNALS),
        technical=score_dimension(TECHNICAL_SIGNALS),
        startup_casual=score_dimension(STARTUP_CASUAL_SIGNALS),
    )

    # --- Structural signals (additive adjustments) ---

    # Passive voice density (formal indicator)
    passive_hits = len(re.findall(
        r"\b(?:is|are|was|were|be|been|being)\s+\w+ed\b",
        text_lower,
    ))
    passive_ratio = passive_hits / word_count
    scores.formal += passive_ratio * 2.0  # boost formal for high passive voice

    # Contraction density (anti-formal)
    contraction_hits = len(re.findall(r"\w+'(?:ll|re|ve|d|t|s)\b", text_lower))
    contraction_ratio = contraction_hits / word_count
    scores.formal = max(0.0, scores.formal - contraction_ratio * 3.0)

    # Exclamation mark density (friendly / startup)
    excl_count = text.count("!")
    excl_ratio = excl_count / max(text.count(".") + excl_count, 1)
    scores.friendly += excl_ratio * 0.3
    scores.startup_casual += excl_ratio * 0.2

    # Average sentence length (formal tends to be longer)
    sentences = re.split(r"[.!?]+", text)
    avg_sentence_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    if avg_sentence_len > 25:
        scores.formal += 0.15
    elif avg_sentence_len < 12:
        scores.startup_casual += 0.1

    # Clamp all scores to [0, 1]
    scores.formal = max(0.0, min(1.0, scores.formal))
    scores.friendly = max(0.0, min(1.0, scores.friendly))
    scores.technical = max(0.0, min(1.0, scores.technical))
    scores.startup_casual = max(0.0, min(1.0, scores.startup_casual))

    return scores
```

---

## 5. Seniority Level Detection

### 5.1 Seniority Levels

```python
class SeniorityLevel(str, Enum):
    INTERN = "intern"
    ENTRY = "entry"          # Junior, Associate, Entry-level
    MID = "mid"              # Mid-level, no prefix
    SENIOR = "senior"        # Senior, Sr.
    STAFF = "staff"          # Staff (common in tech)
    LEAD = "lead"            # Lead, Tech Lead, Team Lead
    PRINCIPAL = "principal"  # Principal, Distinguished
    DIRECTOR = "director"    # Director, Head of
    VP = "vp"                # VP, Vice President
    EXECUTIVE = "executive"  # C-suite, CTO, CEO, SVP, EVP
    UNKNOWN = "unknown"
```

### 5.2 Detection Strategy

Seniority detection uses three signal sources ranked by reliability:

1. **Title-based signals** (highest reliability): Keywords in the job title itself
2. **Experience-based signals**: "X+ years of experience" patterns
3. **Responsibility-based signals**: Scope and impact language in the description

```python
@dataclass
class SeniorityResult:
    level: SeniorityLevel
    confidence: float
    signals: list[str]   # what triggered the classification


# --- Signal 1: Title keywords ---

TITLE_SENIORITY_MAP: list[tuple[str, SeniorityLevel, float]] = [
    # Order matters -- more specific patterns first
    # (regex_pattern, level, confidence)

    # Executive
    (r"\b(?:chief|CTO|CIO|CPO|CEO|CFO|COO|CISO|SVP|EVP)\b", SeniorityLevel.EXECUTIVE, 0.95),
    (r"\bC-?(?:suite|level)\b", SeniorityLevel.EXECUTIVE, 0.9),

    # VP
    (r"\b(?:vice\s+president|VP)\b", SeniorityLevel.VP, 0.95),

    # Director
    (r"\b(?:director|head\s+of)\b", SeniorityLevel.DIRECTOR, 0.9),

    # Principal / Distinguished / Fellow
    (r"\b(?:principal|distinguished|fellow)\b", SeniorityLevel.PRINCIPAL, 0.9),

    # Staff
    (r"\bstaff\b", SeniorityLevel.STAFF, 0.85),

    # Lead
    (r"\b(?:lead|team\s+lead|tech\s+lead|engineering\s+lead)\b", SeniorityLevel.LEAD, 0.85),

    # Senior
    (r"\b(?:senior|sr\.?)\b", SeniorityLevel.SENIOR, 0.9),

    # Mid (tricky -- often NO prefix means mid-level)
    (r"\b(?:mid[- ]?level|intermediate)\b", SeniorityLevel.MID, 0.8),

    # Entry / Junior
    (r"\b(?:junior|jr\.?|entry[- ]?level|associate|early[- ]?career)\b", SeniorityLevel.ENTRY, 0.9),

    # Intern
    (r"\b(?:intern(?:ship)?|co[- ]?op|apprentice|trainee)\b", SeniorityLevel.INTERN, 0.95),
]


# --- Signal 2: Years of experience ---

EXPERIENCE_PATTERN = re.compile(
    r"(\d{1,2})\s*(?:\+|[-–]\s*(\d{1,2}))?\s*"
    r"(?:years?|yrs?\.?)\s+"
    r"(?:of\s+)?(?:experience|exp\.?|professional|relevant|related|industry)",
    re.IGNORECASE,
)

def _years_to_seniority(min_years: int) -> tuple[SeniorityLevel, float]:
    """Map minimum years of experience to seniority level."""
    if min_years <= 0:
        return SeniorityLevel.INTERN, 0.6
    elif min_years <= 1:
        return SeniorityLevel.ENTRY, 0.7
    elif min_years <= 3:
        return SeniorityLevel.MID, 0.65     # 2-3 years is ambiguous
    elif min_years <= 5:
        return SeniorityLevel.MID, 0.7
    elif min_years <= 7:
        return SeniorityLevel.SENIOR, 0.7
    elif min_years <= 10:
        return SeniorityLevel.SENIOR, 0.75
    elif min_years <= 15:
        return SeniorityLevel.STAFF, 0.6    # could be lead/principal too
    else:
        return SeniorityLevel.PRINCIPAL, 0.55


# --- Signal 3: Responsibility scope ---

SCOPE_SIGNALS: dict[SeniorityLevel, list[str]] = {
    SeniorityLevel.INTERN: [
        "learning", "shadow", "mentored by", "under supervision",
        "academic project", "coursework",
    ],
    SeniorityLevel.ENTRY: [
        "under guidance", "with supervision", "assist",
        "support the team", "help with", "contribute to",
        "learn and grow", "entry level",
    ],
    SeniorityLevel.MID: [
        "independently", "own features", "collaborate with",
        "work closely with", "implement", "develop features",
        "participate in design",
    ],
    SeniorityLevel.SENIOR: [
        "mentor", "lead projects", "drive technical decisions",
        "architect", "design systems", "technical leadership",
        "code reviews", "influence", "set standards",
    ],
    SeniorityLevel.STAFF: [
        "cross-team", "cross-functional", "technical vision",
        "multiple teams", "org-wide", "company-wide impact",
        "define technical direction", "raise the bar",
    ],
    SeniorityLevel.LEAD: [
        "manage a team", "people management", "direct reports",
        "hiring", "performance reviews", "team building",
        "lead a team of", "manage engineers",
    ],
    SeniorityLevel.PRINCIPAL: [
        "industry-wide", "thought leadership", "define strategy",
        "long-term vision", "research", "patents",
        "shape the future", "org-level architecture",
    ],
    SeniorityLevel.DIRECTOR: [
        "multiple teams", "department", "org-level strategy",
        "budget", "headcount", "roadmap ownership",
        "executive stakeholders", "P&L",
    ],
    SeniorityLevel.EXECUTIVE: [
        "company strategy", "board", "investors",
        "enterprise-wide", "global", "transformation",
        "P&L ownership", "business unit",
    ],
}


def detect_seniority(title: str, description: str) -> SeniorityResult:
    """
    Detect seniority level from job title and description.

    Uses three signal sources with weighted scoring.
    """
    signals: list[str] = []

    # --- Title signals (weight: 3x) ---
    title_level = None
    title_conf = 0.0
    for pattern, level, conf in TITLE_SENIORITY_MAP:
        if re.search(pattern, title, re.IGNORECASE):
            title_level = level
            title_conf = conf
            signals.append(f"title_match: '{pattern}' -> {level.value}")
            break

    # --- Experience signals (weight: 2x) ---
    exp_level = None
    exp_conf = 0.0
    exp_matches = EXPERIENCE_PATTERN.findall(description)
    if exp_matches:
        # Take the highest years mentioned (some JDs list ranges)
        all_years = []
        for match in exp_matches:
            min_y = int(match[0])
            max_y = int(match[1]) if match[1] else min_y
            all_years.append(min_y)
            if max_y > min_y:
                all_years.append(max_y)

        primary_years = max(all_years) if all_years else 0
        exp_level, exp_conf = _years_to_seniority(primary_years)
        signals.append(f"experience: {primary_years}+ years -> {exp_level.value}")

    # --- Scope signals (weight: 1x) ---
    scope_scores: dict[SeniorityLevel, int] = {}
    desc_lower = description.lower()
    for level, phrases in SCOPE_SIGNALS.items():
        hits = sum(1 for p in phrases if p in desc_lower)
        if hits > 0:
            scope_scores[level] = hits
            signals.append(f"scope: {hits} signals for {level.value}")

    scope_level = None
    scope_conf = 0.0
    if scope_scores:
        scope_level = max(scope_scores, key=scope_scores.get)
        scope_conf = min(0.6, scope_scores[scope_level] * 0.15)

    # --- Weighted combination ---
    # Title signal dominates when present
    if title_level:
        final_level = title_level
        final_conf = title_conf
        # Boost if experience agrees
        if exp_level == title_level:
            final_conf = min(1.0, final_conf + 0.05)
        # Slight penalty if experience disagrees significantly
        elif exp_level and abs(
            list(SeniorityLevel).index(exp_level)
            - list(SeniorityLevel).index(title_level)
        ) > 2:
            final_conf = max(0.3, final_conf - 0.15)
    elif exp_level:
        final_level = exp_level
        final_conf = exp_conf
        # Boost if scope agrees
        if scope_level == exp_level:
            final_conf = min(1.0, final_conf + 0.1)
    elif scope_level:
        final_level = scope_level
        final_conf = scope_conf
    else:
        # No signals at all -- default to MID (most common)
        final_level = SeniorityLevel.MID
        final_conf = 0.2
        signals.append("default: no signals found, assuming mid-level")

    return SeniorityResult(
        level=final_level,
        confidence=final_conf,
        signals=signals,
    )
```

### 5.3 Years of Experience Extraction (Standalone Utility)

```python
@dataclass
class ExperienceRequirement:
    min_years: int
    max_years: int | None
    context: str         # the surrounding text
    raw_match: str       # the raw matched substring


EXPERIENCE_PATTERNS = [
    # "5+ years of experience"
    re.compile(
        r"(\d{1,2})\+\s*(?:years?|yrs?)\s+(?:of\s+)?(\w[\w\s]{0,40}?)(?:experience|exp)",
        re.IGNORECASE,
    ),
    # "3-5 years of experience"
    re.compile(
        r"(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*(?:years?|yrs?)\s+(?:of\s+)?(\w[\w\s]{0,40}?)(?:experience|exp)",
        re.IGNORECASE,
    ),
    # "at least 5 years"
    re.compile(
        r"(?:at\s+least|minimum\s+(?:of\s+)?|no\s+less\s+than)\s*(\d{1,2})\s*(?:years?|yrs?)",
        re.IGNORECASE,
    ),
    # "5 years of professional experience"
    re.compile(
        r"(\d{1,2})\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional|hands[- ]on|direct|relevant|related|practical|industry)\s+experience",
        re.IGNORECASE,
    ),
]


def extract_experience_requirements(text: str) -> list[ExperienceRequirement]:
    """Extract all years-of-experience mentions from JD text."""
    results = []
    for pattern in EXPERIENCE_PATTERNS:
        for match in pattern.finditer(text):
            groups = match.groups()
            min_y = int(groups[0])
            # Check if pattern has a max years group
            max_y = None
            if len(groups) >= 2 and groups[1] and groups[1].isdigit():
                max_y = int(groups[1])

            # Get surrounding context (50 chars before and after)
            start = max(0, match.start() - 50)
            end = min(len(text), match.end() + 50)
            context = text[start:end].strip()

            results.append(ExperienceRequirement(
                min_years=min_y,
                max_years=max_y,
                context=context,
                raw_match=match.group(0),
            ))

    return results
```

---

## 6. Skill Cluster Extraction

### 6.1 Skill Taxonomy (Static Keyword Lists)

The approach: maintain curated keyword dictionaries for known skill clusters.
This gives fast, deterministic extraction without NLP models. The taxonomy
below covers tech roles; extend for other domains as needed.

```python
@dataclass
class SkillCluster:
    category: str              # e.g. "programming_languages"
    display_name: str          # e.g. "Programming Languages"
    skills: dict[str, list[str]]  # canonical_name -> [aliases]


SKILL_TAXONOMY: list[SkillCluster] = [
    SkillCluster(
        category="programming_languages",
        display_name="Programming Languages",
        skills={
            "Python": ["python", "python3", "py"],
            "JavaScript": ["javascript", "js", "ecmascript", "es6", "es2015"],
            "TypeScript": ["typescript", "ts"],
            "Java": ["java", "jdk", "j2ee", "jvm"],
            "C#": ["c#", "csharp", "c-sharp", ".net c#"],
            "C++": ["c++", "cpp", "c plus plus"],
            "C": ["c programming", "ansi c"],
            "Go": ["go", "golang"],
            "Rust": ["rust", "rust-lang"],
            "Ruby": ["ruby", "rb"],
            "PHP": ["php"],
            "Swift": ["swift"],
            "Kotlin": ["kotlin"],
            "Scala": ["scala"],
            "R": ["r programming", "r language", "r-project"],
            "Dart": ["dart"],
            "Elixir": ["elixir"],
            "Haskell": ["haskell"],
            "Clojure": ["clojure"],
            "Lua": ["lua"],
            "Perl": ["perl"],
            "SQL": ["sql", "t-sql", "pl/sql", "plsql", "tsql"],
            "Shell/Bash": ["bash", "shell", "sh", "zsh", "shell scripting"],
        },
    ),
    SkillCluster(
        category="frontend_frameworks",
        display_name="Frontend Frameworks & Libraries",
        skills={
            "React": ["react", "reactjs", "react.js", "react js"],
            "Next.js": ["next.js", "nextjs", "next js"],
            "Vue.js": ["vue", "vuejs", "vue.js", "vue js"],
            "Nuxt.js": ["nuxt", "nuxtjs", "nuxt.js"],
            "Angular": ["angular", "angularjs", "angular.js"],
            "Svelte": ["svelte", "sveltekit"],
            "Remix": ["remix", "remix.run"],
            "Astro": ["astro"],
            "jQuery": ["jquery"],
            "Ember.js": ["ember", "emberjs", "ember.js"],
            "Tailwind CSS": ["tailwind", "tailwindcss", "tailwind css"],
            "Bootstrap": ["bootstrap"],
            "Material UI": ["material ui", "mui", "material-ui"],
            "Chakra UI": ["chakra", "chakra ui", "chakra-ui"],
        },
    ),
    SkillCluster(
        category="backend_frameworks",
        display_name="Backend Frameworks",
        skills={
            "Node.js": ["node", "nodejs", "node.js", "node js"],
            "Express.js": ["express", "expressjs", "express.js"],
            "Django": ["django"],
            "Flask": ["flask"],
            "FastAPI": ["fastapi", "fast api"],
            "Spring Boot": ["spring boot", "spring", "spring framework"],
            "Ruby on Rails": ["rails", "ruby on rails", "ror"],
            "Laravel": ["laravel"],
            "ASP.NET": ["asp.net", "aspnet", "asp net", ".net core", "dotnet"],
            "NestJS": ["nestjs", "nest.js", "nest js"],
            "Gin": ["gin", "gin-gonic"],
            "Actix": ["actix", "actix-web"],
            "Phoenix": ["phoenix framework", "phoenix elixir"],
        },
    ),
    SkillCluster(
        category="databases",
        display_name="Databases & Data Stores",
        skills={
            "PostgreSQL": ["postgresql", "postgres", "psql"],
            "MySQL": ["mysql"],
            "SQLite": ["sqlite"],
            "MongoDB": ["mongodb", "mongo"],
            "Redis": ["redis"],
            "Elasticsearch": ["elasticsearch", "elastic search", "es"],
            "DynamoDB": ["dynamodb", "dynamo db"],
            "Cassandra": ["cassandra"],
            "Neo4j": ["neo4j"],
            "ClickHouse": ["clickhouse"],
            "Snowflake": ["snowflake"],
            "BigQuery": ["bigquery", "big query"],
            "Supabase": ["supabase"],
            "Firebase": ["firebase", "firestore"],
            "CockroachDB": ["cockroachdb", "cockroach db"],
        },
    ),
    SkillCluster(
        category="cloud_infra",
        display_name="Cloud & Infrastructure",
        skills={
            "AWS": ["aws", "amazon web services"],
            "GCP": ["gcp", "google cloud", "google cloud platform"],
            "Azure": ["azure", "microsoft azure"],
            "Docker": ["docker", "containerization"],
            "Kubernetes": ["kubernetes", "k8s"],
            "Terraform": ["terraform", "tf"],
            "Ansible": ["ansible"],
            "Pulumi": ["pulumi"],
            "CloudFormation": ["cloudformation", "cfn"],
            "Helm": ["helm"],
            "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous deployment"],
            "GitHub Actions": ["github actions", "gha"],
            "Jenkins": ["jenkins"],
            "GitLab CI": ["gitlab ci", "gitlab-ci"],
            "CircleCI": ["circleci", "circle ci"],
            "ArgoCD": ["argocd", "argo cd"],
            "Datadog": ["datadog"],
            "Grafana": ["grafana"],
            "Prometheus": ["prometheus"],
            "New Relic": ["new relic", "newrelic"],
        },
    ),
    SkillCluster(
        category="data_ml",
        display_name="Data & Machine Learning",
        skills={
            "Pandas": ["pandas"],
            "NumPy": ["numpy"],
            "Scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
            "TensorFlow": ["tensorflow", "tf"],
            "PyTorch": ["pytorch"],
            "Keras": ["keras"],
            "Spark": ["spark", "apache spark", "pyspark"],
            "Airflow": ["airflow", "apache airflow"],
            "dbt": ["dbt", "data build tool"],
            "Kafka": ["kafka", "apache kafka"],
            "Hadoop": ["hadoop"],
            "Tableau": ["tableau"],
            "Power BI": ["power bi", "powerbi"],
            "Looker": ["looker"],
            "LLM/GenAI": ["llm", "large language model", "generative ai", "genai", "gpt", "chatgpt"],
            "LangChain": ["langchain"],
            "RAG": ["rag", "retrieval augmented generation"],
            "MLflow": ["mlflow"],
            "Hugging Face": ["hugging face", "huggingface", "transformers"],
        },
    ),
    SkillCluster(
        category="soft_skills",
        display_name="Soft Skills",
        skills={
            "Communication": [
                "communication skills", "written communication",
                "verbal communication", "presentation skills",
                "public speaking",
            ],
            "Leadership": [
                "leadership", "team leadership", "people management",
                "mentoring", "coaching",
            ],
            "Problem Solving": [
                "problem solving", "problem-solving", "analytical thinking",
                "critical thinking", "troubleshooting",
            ],
            "Collaboration": [
                "collaboration", "teamwork", "cross-functional",
                "stakeholder management", "interpersonal",
            ],
            "Time Management": [
                "time management", "prioritization", "multitasking",
                "deadline-driven", "organizational skills",
            ],
            "Adaptability": [
                "adaptability", "flexibility", "fast-paced",
                "ambiguity", "comfortable with change",
            ],
            "Attention to Detail": [
                "attention to detail", "detail-oriented", "detail oriented",
                "meticulous", "thoroughness",
            ],
        },
    ),
    SkillCluster(
        category="methodologies",
        display_name="Methodologies & Practices",
        skills={
            "Agile": ["agile", "agile methodology", "agile development"],
            "Scrum": ["scrum", "scrum master", "sprint"],
            "Kanban": ["kanban"],
            "TDD": ["tdd", "test-driven development", "test driven development"],
            "BDD": ["bdd", "behavior-driven development"],
            "DevOps": ["devops", "dev ops"],
            "SRE": ["sre", "site reliability engineering", "site reliability"],
            "Pair Programming": ["pair programming", "mob programming"],
            "Code Review": ["code review", "code reviews", "peer review"],
            "Design Patterns": ["design patterns", "SOLID", "clean architecture"],
            "Microservices": ["microservices", "micro-services", "service-oriented"],
            "Event-Driven": ["event-driven", "event driven", "event sourcing", "CQRS"],
            "API Design": ["api design", "rest api", "restful", "graphql", "grpc"],
        },
    ),
    SkillCluster(
        category="domain_knowledge",
        display_name="Domain Knowledge",
        skills={
            "FinTech": ["fintech", "financial technology", "payments", "banking"],
            "HealthTech": ["healthtech", "healthcare", "health tech", "HIPAA", "HL7", "FHIR"],
            "EdTech": ["edtech", "education technology", "e-learning"],
            "E-Commerce": ["ecommerce", "e-commerce", "retail tech"],
            "Cybersecurity": ["cybersecurity", "infosec", "information security", "SOC", "SIEM"],
            "Blockchain": ["blockchain", "web3", "smart contracts", "defi", "crypto"],
            "IoT": ["iot", "internet of things", "embedded systems"],
            "Gaming": ["game development", "game engine", "unity", "unreal"],
            "SaaS": ["saas", "software as a service", "b2b saas"],
        },
    ),
]
```

### 6.2 Skill Extraction Engine

```python
@dataclass
class ExtractedSkill:
    canonical_name: str     # e.g. "React"
    matched_alias: str      # e.g. "reactjs" (what was found in text)
    cluster_category: str   # e.g. "frontend_frameworks"
    cluster_display: str    # e.g. "Frontend Frameworks & Libraries"
    is_required: bool       # True if found in requirements, False if in nice-to-have
    context: str            # surrounding text snippet


def build_skill_index(
    taxonomy: list[SkillCluster],
) -> dict[str, tuple[str, str, str]]:
    """
    Build a flat lookup index: alias_lower -> (canonical_name, category, display_name)

    For performance, this should be built once and reused.
    """
    index: dict[str, tuple[str, str, str]] = {}
    for cluster in taxonomy:
        for canonical, aliases in cluster.skills.items():
            for alias in aliases:
                index[alias.lower()] = (canonical, cluster.category, cluster.display_name)
            # Also index the canonical name itself
            index[canonical.lower()] = (canonical, cluster.category, cluster.display_name)
    return index


# Build once at module level
SKILL_INDEX = build_skill_index(SKILL_TAXONOMY)


def _build_skill_patterns(
    index: dict[str, tuple[str, str, str]],
) -> list[tuple[re.Pattern, str]]:
    """
    Build regex patterns from skill index.

    Strategy: sort aliases by length (longest first) to prevent
    partial matches (e.g. "c" matching inside "react").
    Use word boundaries for short aliases, looser matching for long ones.
    """
    patterns = []
    # Sort by length descending to match longest first
    for alias in sorted(index.keys(), key=len, reverse=True):
        # Short aliases (1-2 chars) need very strict boundaries
        # to avoid false positives (e.g. "c", "r", "go")
        if len(alias) <= 2:
            # Only match if surrounded by non-word characters or specific contexts
            # "C" language is tricky -- skip single-char aliases
            # unless they're acronyms in all-caps
            if alias.upper() == alias and len(alias) == 1:
                continue  # Skip single-char aliases like "c", "r"
            pat = re.compile(
                r"(?<![a-zA-Z])" + re.escape(alias) + r"(?![a-zA-Z])",
                re.IGNORECASE,
            )
        elif len(alias) <= 4:
            # 3-4 char aliases: use word boundaries
            pat = re.compile(r"\b" + re.escape(alias) + r"\b", re.IGNORECASE)
        else:
            # Longer aliases: standard word boundaries
            pat = re.compile(r"\b" + re.escape(alias) + r"\b", re.IGNORECASE)

        patterns.append((pat, alias))

    return patterns


SKILL_PATTERNS = _build_skill_patterns(SKILL_INDEX)


def extract_skills(
    text: str,
    sections: list[DetectedSection] | None = None,
) -> list[ExtractedSkill]:
    """
    Extract skills from JD text using keyword matching.

    If sections are provided, marks skills as required vs preferred
    based on which section they appear in.
    """
    # Determine required vs preferred sections
    required_text = ""
    preferred_text = ""

    if sections:
        for section in sections:
            if section.section_type in (
                JDSection.REQUIREMENTS,
                JDSection.SKILLS_REQUIRED,
                JDSection.RESPONSIBILITIES,
            ):
                required_text += " " + section.content
            elif section.section_type == JDSection.SKILLS_PREFERRED:
                preferred_text += " " + section.content
            else:
                # Default: treat as required
                required_text += " " + section.content
    else:
        required_text = text

    seen_canonicals: set[str] = set()
    results: list[ExtractedSkill] = []

    for pat, alias in SKILL_PATTERNS:
        canonical, category, display = SKILL_INDEX[alias.lower()]

        # Skip if we already found this canonical skill
        if canonical in seen_canonicals:
            continue

        # Check in required sections first
        match = pat.search(required_text)
        is_required = True

        if not match:
            match = pat.search(preferred_text)
            is_required = False

        if match:
            seen_canonicals.add(canonical)

            # Extract surrounding context
            full_text = required_text if is_required else preferred_text
            start = max(0, match.start() - 40)
            end = min(len(full_text), match.end() + 40)
            context = full_text[start:end].strip()

            results.append(ExtractedSkill(
                canonical_name=canonical,
                matched_alias=match.group(0),
                cluster_category=category,
                cluster_display=display,
                is_required=is_required,
                context=context,
            ))

    return results


def group_skills_by_cluster(
    skills: list[ExtractedSkill],
) -> dict[str, list[ExtractedSkill]]:
    """Group extracted skills by their cluster category."""
    groups: dict[str, list[ExtractedSkill]] = {}
    for skill in skills:
        groups.setdefault(skill.cluster_category, []).append(skill)
    return groups
```

### 6.3 Handling Ambiguous Skill Names

Some skill names are ambiguous:

| Alias | Could Be |
|-------|----------|
| "Go" | Go language, or the verb "go" |
| "C" | C language, or the letter |
| "R" | R language, or abbreviation |
| "Spring" | Spring framework, or the season |
| "Spark" | Apache Spark, or generic "spark" |
| "Unity" | Unity game engine, or the concept |
| "Helm" | Kubernetes Helm, or generic "helm" |

Strategy for disambiguation:

```python
AMBIGUOUS_SKILLS = {
    "go": {
        "require_context": [
            r"\bgo(?:lang)?\b",
            r"\bwritten\s+in\s+go\b",
            r"\bgo\s+(?:modules?|routines?|channels?|concurrency)\b",
            r"\bgo\b.*\b(?:gin|echo|fiber|gorilla)\b",
        ],
        "exclude_context": [
            r"\bgo\s+(?:to|ahead|forward|through|beyond|above)\b",
            r"\blet(?:'s)?\s+go\b",
            r"\bon\s+the\s+go\b",
        ],
    },
    "spring": {
        "require_context": [
            r"\bspring\s+(?:boot|framework|cloud|security|mvc|data|batch)\b",
            r"\bjava\b.*\bspring\b",
            r"\bspring\b.*\bjava\b",
        ],
        "exclude_context": [
            r"\bspring\s+(?:of\s+)?\d{4}\b",  # "spring 2024"
        ],
    },
    "spark": {
        "require_context": [
            r"\b(?:apache\s+)?spark\b.*\b(?:scala|pyspark|hadoop|hive)\b",
            r"\bspark\s+(?:sql|streaming|ml|mllib)\b",
        ],
        "exclude_context": [],
    },
}


def is_skill_contextually_valid(
    alias: str,
    surrounding_text: str,
) -> bool:
    """
    For ambiguous skill names, check surrounding context to confirm
    it's actually referring to the technology.
    """
    alias_lower = alias.lower()

    if alias_lower not in AMBIGUOUS_SKILLS:
        return True  # Not ambiguous, always valid

    rules = AMBIGUOUS_SKILLS[alias_lower]

    # Check exclusion patterns first
    for pattern in rules["exclude_context"]:
        if re.search(pattern, surrounding_text, re.IGNORECASE):
            return False

    # Check if any positive context pattern matches
    for pattern in rules["require_context"]:
        if re.search(pattern, surrounding_text, re.IGNORECASE):
            return True

    # No positive context found -- ambiguous, low confidence
    return False
```

---

## 7. Confidence Scoring & LLM Fallback

### 7.1 Confidence Model

Each component of the pipeline produces a confidence score. The overall JD
analysis confidence determines whether to invoke the LLM.

```python
@dataclass
class JDAnalysisResult:
    """Complete result of JD analysis."""
    cleaned_text: str
    sections: list[DetectedSection]
    seniority: SeniorityResult
    tone: ToneScores
    skills: list[ExtractedSkill]
    experience_requirements: list[ExperienceRequirement]

    # Confidence metrics
    section_coverage: float         # % of text assigned to sections
    section_avg_confidence: float   # average confidence across sections
    overall_confidence: float       # composite confidence score

    needs_llm_fallback: bool
    llm_fallback_reasons: list[str]


def calculate_section_coverage(
    sections: list[DetectedSection],
    total_text_length: int,
) -> float:
    """What % of the JD text is covered by detected sections?"""
    if total_text_length == 0:
        return 0.0
    covered = sum(len(s.content) for s in sections)
    return min(1.0, covered / total_text_length)


def calculate_overall_confidence(result: JDAnalysisResult) -> float:
    """
    Composite confidence score for the entire JD analysis.

    Weights:
    - Section detection: 40% (most important for CV alignment)
    - Skill extraction: 25%
    - Seniority detection: 20%
    - Tone detection: 15% (least critical)
    """
    # Section confidence
    section_score = (
        result.section_coverage * 0.5
        + result.section_avg_confidence * 0.5
    )

    # Skill confidence: based on whether we found a reasonable number
    skill_count = len(result.skills)
    if skill_count >= 8:
        skill_score = 0.9
    elif skill_count >= 5:
        skill_score = 0.7
    elif skill_count >= 2:
        skill_score = 0.5
    else:
        skill_score = 0.2

    # Seniority confidence
    seniority_score = result.seniority.confidence

    # Tone confidence
    tone_score = result.tone.confidence

    return (
        section_score * 0.40
        + skill_score * 0.25
        + seniority_score * 0.20
        + tone_score * 0.15
    )
```

### 7.2 LLM Fallback Decision

```python
# Thresholds for triggering LLM fallback
CONFIDENCE_THRESHOLDS = {
    "overall": 0.55,              # Below this -> full LLM analysis
    "sections": 0.45,             # Below this -> LLM section detection
    "section_coverage": 0.30,     # Below this -> JD may be unstructured prose
    "seniority": 0.40,            # Below this -> LLM seniority detection
    "skills_min_count": 2,        # Fewer than this -> LLM skill extraction
}


def determine_llm_fallback(result: JDAnalysisResult) -> tuple[bool, list[str]]:
    """
    Determine which parts of the analysis need LLM fallback.

    Returns:
        (needs_fallback, list_of_reasons)
    """
    reasons: list[str] = []

    if result.overall_confidence < CONFIDENCE_THRESHOLDS["overall"]:
        reasons.append(
            f"Overall confidence {result.overall_confidence:.2f} "
            f"< threshold {CONFIDENCE_THRESHOLDS['overall']}"
        )

    if result.section_avg_confidence < CONFIDENCE_THRESHOLDS["sections"]:
        reasons.append(
            f"Section avg confidence {result.section_avg_confidence:.2f} "
            f"< threshold {CONFIDENCE_THRESHOLDS['sections']}"
        )

    if result.section_coverage < CONFIDENCE_THRESHOLDS["section_coverage"]:
        reasons.append(
            f"Section coverage {result.section_coverage:.2f} "
            f"< threshold {CONFIDENCE_THRESHOLDS['section_coverage']} "
            f"(JD may be unstructured)"
        )

    if result.seniority.confidence < CONFIDENCE_THRESHOLDS["seniority"]:
        reasons.append(
            f"Seniority confidence {result.seniority.confidence:.2f} "
            f"< threshold {CONFIDENCE_THRESHOLDS['seniority']}"
        )

    if len(result.skills) < CONFIDENCE_THRESHOLDS["skills_min_count"]:
        reasons.append(
            f"Only {len(result.skills)} skills found "
            f"< minimum {CONFIDENCE_THRESHOLDS['skills_min_count']}"
        )

    # Check for unknown sections (detected structurally but unclassified)
    unknown_sections = [s for s in result.sections if s.section_type == JDSection.UNKNOWN]
    if unknown_sections:
        reasons.append(
            f"{len(unknown_sections)} unclassified section(s) detected"
        )

    return bool(reasons), reasons
```

### 7.3 LLM Prompt Templates

When rule-based detection falls back to LLM, use targeted prompts for
specific subtasks rather than asking the LLM to do everything.

```python
LLM_PROMPTS = {
    "section_detection": """You are a job description parser. Given the following job description text,
identify and label each section. Return a JSON array of sections.

Each section should have:
- "type": one of ["responsibilities", "requirements", "skills_required", "skills_preferred",
  "about_company", "about_role", "culture_benefits", "compensation", "education", "experience", "unknown"]
- "header": the section header text (or null if no explicit header)
- "content": the section content text
- "start_char": approximate character offset where this section starts

Job Description:
---
{jd_text}
---

Return ONLY valid JSON. No explanation.""",

    "seniority_detection": """Analyze this job description and determine the seniority level.

Job Title: {title}
Job Description (first 500 chars): {description_preview}

Respond with ONLY a JSON object:
{{
  "level": "<intern|entry|mid|senior|staff|lead|principal|director|vp|executive>",
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence explanation>"
}}""",

    "skill_extraction": """Extract technical and professional skills from this job description.

Text:
---
{section_text}
---

Return a JSON array of objects:
[
  {{
    "skill": "<canonical skill name>",
    "category": "<programming_language|framework|database|cloud|tool|methodology|soft_skill|domain>",
    "is_required": <true|false>,
    "context": "<short phrase where this skill was mentioned>"
  }}
]

Return ONLY valid JSON. No explanation. Do not include generic terms like "software" or "technology".""",

    "tone_detection": """Classify the tone of this job description.

Text (first 500 chars):
---
{text_preview}
---

Respond with ONLY a JSON object:
{{
  "dominant_tone": "<formal|friendly|technical|startup_casual>",
  "scores": {{"formal": <0-1>, "friendly": <0-1>, "technical": <0-1>, "startup_casual": <0-1>}},
  "reasoning": "<one sentence>"
}}""",
}
```

### 7.4 Selective LLM Invocation Pattern

```python
async def analyze_jd_with_fallback(
    raw_text: str,
    title: str = "",
    llm_client=None,  # your LLM API client
) -> JDAnalysisResult:
    """
    Main pipeline: rule-based first, LLM fallback for low-confidence areas.
    """
    # --- Step 1: Clean text ---
    cleaned = clean_jd_text(raw_text)
    cleaned = remove_boilerplate_suffix(cleaned)
    cleaned = remove_platform_noise(cleaned)

    # --- Step 2: Rule-based section detection ---
    sections = detect_sections(cleaned)
    if not sections or all(s.confidence < 0.3 for s in sections):
        sections = detect_implicit_sections(cleaned)

    # --- Step 3: Rule-based extraction ---
    seniority = detect_seniority(title, cleaned)
    tone = detect_tone(cleaned)
    skills = extract_skills(cleaned, sections)
    experience_reqs = extract_experience_requirements(cleaned)

    # --- Step 4: Calculate confidence ---
    total_len = len(cleaned)
    section_coverage = calculate_section_coverage(sections, total_len)
    section_avg_conf = (
        sum(s.confidence for s in sections) / len(sections)
        if sections else 0.0
    )

    result = JDAnalysisResult(
        cleaned_text=cleaned,
        sections=sections,
        seniority=seniority,
        tone=tone,
        skills=skills,
        experience_requirements=experience_reqs,
        section_coverage=section_coverage,
        section_avg_confidence=section_avg_conf,
        overall_confidence=0.0,
        needs_llm_fallback=False,
        llm_fallback_reasons=[],
    )

    result.overall_confidence = calculate_overall_confidence(result)
    needs_fallback, reasons = determine_llm_fallback(result)
    result.needs_llm_fallback = needs_fallback
    result.llm_fallback_reasons = reasons

    # --- Step 5: LLM fallback for low-confidence areas ---
    if needs_fallback and llm_client:
        # Only call LLM for the specific areas that need help
        if section_coverage < CONFIDENCE_THRESHOLDS["section_coverage"]:
            llm_sections = await _llm_detect_sections(llm_client, cleaned)
            if llm_sections:
                result.sections = llm_sections

        if seniority.confidence < CONFIDENCE_THRESHOLDS["seniority"]:
            llm_seniority = await _llm_detect_seniority(
                llm_client, title, cleaned[:500]
            )
            if llm_seniority:
                result.seniority = llm_seniority

        if len(skills) < CONFIDENCE_THRESHOLDS["skills_min_count"]:
            llm_skills = await _llm_extract_skills(llm_client, cleaned)
            if llm_skills:
                # Merge: keep rule-based skills, add new LLM-discovered ones
                existing = {s.canonical_name for s in result.skills}
                for s in llm_skills:
                    if s.canonical_name not in existing:
                        result.skills.append(s)

        # Recalculate confidence after LLM augmentation
        result.overall_confidence = calculate_overall_confidence(result)

    return result
```

---

## 8. Putting It All Together

### 8.1 Complete Pipeline Example

```python
# Example usage

async def process_uploaded_jd(
    raw_text: str,
    job_title: str = "",
    source_platform: str | None = None,
) -> dict:
    """
    Process an uploaded JD through the full pipeline.
    Returns a structured dict suitable for storage/API response.
    """
    result = await analyze_jd_with_fallback(raw_text, title=job_title)

    return {
        "cleaned_text": result.cleaned_text,
        "sections": [
            {
                "type": s.section_type.value,
                "header": s.header_text,
                "content": s.content,
                "confidence": round(s.confidence, 3),
            }
            for s in result.sections
        ],
        "seniority": {
            "level": result.seniority.level.value,
            "confidence": round(result.seniority.confidence, 3),
            "signals": result.seniority.signals,
        },
        "tone": {
            "dominant": result.tone.dominant,
            "scores": {
                "formal": round(result.tone.formal, 3),
                "friendly": round(result.tone.friendly, 3),
                "technical": round(result.tone.technical, 3),
                "startup_casual": round(result.tone.startup_casual, 3),
            },
            "confidence": round(result.tone.confidence, 3),
        },
        "skills": {
            "all": [
                {
                    "name": s.canonical_name,
                    "category": s.cluster_category,
                    "is_required": s.is_required,
                }
                for s in result.skills
            ],
            "by_cluster": {
                category: [s.canonical_name for s in skills]
                for category, skills in group_skills_by_cluster(result.skills).items()
            },
            "required": [s.canonical_name for s in result.skills if s.is_required],
            "preferred": [s.canonical_name for s in result.skills if not s.is_required],
        },
        "experience": [
            {
                "min_years": e.min_years,
                "max_years": e.max_years,
                "raw": e.raw_match,
            }
            for e in result.experience_requirements
        ],
        "meta": {
            "overall_confidence": round(result.overall_confidence, 3),
            "section_coverage": round(result.section_coverage, 3),
            "used_llm_fallback": result.needs_llm_fallback,
            "llm_fallback_reasons": result.llm_fallback_reasons,
        },
    }
```

### 8.2 Example Output

For a typical Senior Software Engineer JD from Greenhouse:

```json
{
  "sections": [
    {"type": "about_company", "header": "About Us", "confidence": 0.95},
    {"type": "about_role", "header": "About the Role", "confidence": 0.95},
    {"type": "responsibilities", "header": "What You'll Do", "confidence": 0.95},
    {"type": "requirements", "header": "What We're Looking For", "confidence": 0.95},
    {"type": "skills_preferred", "header": "Nice to Haves", "confidence": 0.95},
    {"type": "culture_benefits", "header": "What We Offer", "confidence": 0.95},
    {"type": "compensation", "header": "Compensation", "confidence": 0.95}
  ],
  "seniority": {
    "level": "senior",
    "confidence": 0.95,
    "signals": ["title_match: 'senior' -> senior", "experience: 5+ years -> senior"]
  },
  "tone": {
    "dominant": "friendly",
    "scores": {"formal": 0.15, "friendly": 0.72, "technical": 0.45, "startup_casual": 0.22}
  },
  "skills": {
    "by_cluster": {
      "programming_languages": ["Python", "TypeScript", "SQL"],
      "backend_frameworks": ["FastAPI", "Node.js"],
      "frontend_frameworks": ["React", "Next.js"],
      "databases": ["PostgreSQL", "Redis"],
      "cloud_infra": ["AWS", "Docker", "Kubernetes", "CI/CD"],
      "methodologies": ["Agile", "Microservices", "API Design"]
    },
    "required": ["Python", "TypeScript", "React", "PostgreSQL", "AWS"],
    "preferred": ["Kubernetes", "Redis", "Next.js"]
  },
  "experience": [{"min_years": 5, "max_years": null, "raw": "5+ years of experience"}],
  "meta": {
    "overall_confidence": 0.82,
    "section_coverage": 0.91,
    "used_llm_fallback": false
  }
}
```

### 8.3 Performance Characteristics

| Component | Typical Speed | Memory |
|-----------|--------------|--------|
| Text cleaning | < 5ms | Negligible |
| Boilerplate removal | < 10ms | Negligible |
| Section detection | < 20ms | Negligible |
| Seniority detection | < 10ms | Negligible |
| Tone detection | < 15ms | Negligible |
| Skill extraction | < 30ms | ~2MB for index |
| **Total rule-based** | **< 90ms** | **< 5MB** |
| LLM fallback (if needed) | 2-8 seconds | N/A (API call) |

The rule-based layer processes a JD in under 100ms. LLM fallback adds 2-8s
depending on the model and what needs to be re-analyzed. The goal is to keep
the LLM fallback rate under 20-30% of all JDs processed.

---

## References & Further Reading

- [ESCO Classification](https://esco.ec.europa.eu/en/classification) -- European skill taxonomy with 13,890 skill concepts
- [O*NET Online](https://www.onetonline.org/) -- US Department of Labor occupational information
- [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html) -- JSON API for job data
- [Nesta Skills Taxonomy v2](https://github.com/nestauk/skills-taxonomy-v2) -- Data-driven skill clustering pipeline
- [Ongig EEO Statement Samples](https://blog.ongig.com/diversity-and-inclusion/eeo-statement-samples/) -- Common EEO boilerplate patterns
- [Seniority Level Guide (Indeed)](https://www.indeed.com/career-advice/career-development/seniority-level) -- Seniority level definitions
- [Deel Job Level Classification](https://www.deel.com/blog/job-level-classification/) -- Job level frameworks
- [Skill-LLM Paper](https://arxiv.org/html/2410.12052v1) -- LLM-based skill extraction research
