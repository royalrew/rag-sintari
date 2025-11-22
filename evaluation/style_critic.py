"""
StyleCritic - Micro-agent för formatting-kvalitetscheck i Golden Tests.

Kontrollerar:
- Punktlistor konsekventa (•)
- Radbrytningar följer regler
- Rubriker h1-h3 korrekt
- Inga "- punkt" utan "• punkt"
- Max radlängd
- Whitespace-regler
"""

import re
from typing import Dict, List, Tuple


def evaluate_formatting_quality(text: str) -> Dict[str, any]:
    """
    Evaluera formatting-kvalitet av AI-svar.
    
    Returns:
        Dict med:
        - score: float (0.0-1.0)
        - issues: List[str] med specifika problem
        - checks: Dict med detaljerade resultat per check
    """
    if not text or not text.strip():
        return {
            "score": 0.0,
            "issues": ["Tom svar"],
            "checks": {}
        }
    
    issues: List[str] = []
    checks: Dict[str, bool] = {}
    score = 1.0
    penalty_per_issue = 0.05  # -5% per issue, max -50%
    
    lines = text.split('\n')
    
    # Check 1: Punktlistor är konsekventa (använder •, inte - eller *)
    bullet_lines = [line for line in lines if re.match(r'^\s*[•*-]\s+', line)]
    if bullet_lines:
        dash_asterisk_count = sum(1 for line in bullet_lines if re.match(r'^\s*[-*]\s+', line))
        if dash_asterisk_count > 0:
            issues.append(f"Använder bindestreck/asterisk ({dash_asterisk_count}) istället för punktlistor")
            score -= penalty_per_issue * (dash_asterisk_count / len(bullet_lines))
        checks["bullet_consistency"] = dash_asterisk_count == 0
    
    # Check 2: Inga "- punkt" utan "• punkt"
    dash_pattern_lines = [line for line in lines if re.match(r'^\s*-\s+[^\•]', line)]
    if dash_pattern_lines:
        issues.append(f"Rad(er) med '- punkt' istället för '• punkt': {len(dash_pattern_lines)}")
        score -= penalty_per_issue * min(1.0, len(dash_pattern_lines) / 3)  # Max penalty för detta
        checks["no_dash_bullets"] = len(dash_pattern_lines) == 0
    
    # Check 3: Radbrytningar följer regler (max 2 blanka rader i rad)
    blank_line_sequences = [len(match.group(0)) for match in re.finditer(r'\n{3,}', text)]
    if blank_line_sequences:
        max_sequence = max(blank_line_sequences) if blank_line_sequences else 0
        issues.append(f"För många blanka rader i rad (max {max_sequence - 1})")
        score -= penalty_per_issue
        checks["line_breaks"] = len(blank_line_sequences) == 0
    
    # Check 4: Max radlängd (ca 100 tecken, men flexibelt)
    long_lines = [i for i, line in enumerate(lines, 1) if len(line) > 120]
    if long_lines:
        issues.append(f"Rad(er) för långa (>120 tecken): {len(long_lines)}")
        score -= penalty_per_issue * min(1.0, len(long_lines) / 5)  # Max penalty om >5
        checks["max_line_length"] = len(long_lines) == 0
    
    # Check 5: Whitespace-regler (inga trailing spaces, konsekvent indentering)
    trailing_spaces = sum(1 for line in lines if line.rstrip() != line and line.strip())
    if trailing_spaces > 0:
        issues.append(f"Rad(er) med trailing whitespace: {trailing_spaces}")
        score -= penalty_per_issue * min(1.0, trailing_spaces / 5)
        checks["whitespace"] = trailing_spaces == 0
    
    # Check 6: Rubriker använder korrekt format (h3 ### eller kolon-format)
    # Detta är mer flexibelt - vi bara kollar att det finns någon struktur
    has_headings = bool(re.search(r'^###\s+|^[A-ZÄÖÅ][^:]+:\s*$', text, re.MULTILINE))
    # Vi straffar inte om det saknas rubriker, bara om format är konstigt
    
    # Check 7: Punktlistor är inte brutna över flera rader (bullet på en rad, content på nästa)
    bullet_line_breaks = 0
    for i in range(len(lines) - 1):
        if re.match(r'^\s*[•*-]\s*$', lines[i]) and lines[i + 1].strip():
            bullet_line_breaks += 1
    if bullet_line_breaks > 0:
        issues.append(f"Punktlistor brutna över flera rader: {bullet_line_breaks}")
        score -= penalty_per_issue * min(1.0, bullet_line_breaks / 2)
        checks["bullet_line_breaks"] = bullet_line_breaks == 0
    
    # Normalisera score till 0.0-1.0
    score = max(0.0, min(1.0, score))
    
    return {
        "score": score,
        "issues": issues,
        "checks": checks
    }


def get_formatting_bonus(text: str) -> float:
    """
    Get formatting bonus score (0.0-0.2) för nice-coverage.
    
    Används i golden eval för att ge extra poäng för formatting-kvalitet.
    Ger +0.1 till +0.2 i nice-score.
    """
    result = evaluate_formatting_quality(text)
    # Konvertera 0.0-1.0 till 0.0-0.2 bonus
    return result["score"] * 0.2


if __name__ == "__main__":
    # Test
    test_text = """Detta är ett test.

• Punkt ett
• Punkt två
- Punkt tre (fel format)

### Rubrik

Text med för lång rad som går över 120 tecken och därför borde flaggas som problem men kanske inte alltid.

• Punkt fyra
"""
    result = evaluate_formatting_quality(test_text)
    print(f"Score: {result['score']:.2f}")
    print(f"Issues: {result['issues']}")
    print(f"Checks: {result['checks']}")

