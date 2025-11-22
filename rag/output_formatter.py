"""
OutputFormatter - Formaterar AI-svar för konsistent, enterprise-ready presentation.

Gör automatisk konvertering av:
- Listor till punktlistor (•)
- Oönskade bindestreck till korrekt formatering
- Whitespace och radbrytningar
"""

import re
from typing import Dict, Any, Optional

# Compiled pattern for bullet matching
BULLET_PATTERN = re.compile(r'^(\s*)[-*]\s+(.*)$')


class OutputFormatter:
    """Formaterar LLM-output för konsekvent, professionell presentation."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize formatter with config.
        
        Args:
            config: Output config dict with keys like:
                - bullets: str (e.g., "•")
                - headings: bool
                - tables: bool
                - max_list_items: int
        """
        self.cfg = config or {}
        self.bullet_char = self.cfg.get("bullets", "•")
    
    def format(self, text: str) -> str:
        """
        Main formatting function - applies all transformations.
        
        Args:
            text: Raw LLM output text
            
        Returns:
            Formatted text ready for display
        """
        if not text or not text.strip():
            return text
        
        # Step 1: Convert "- " or "* " to "• " (most important)
        lines = text.splitlines()
        converted = []
        
        for line in lines:
            # Match lines starting with "- " or "* "
            match = re.match(r'^(\s*)[-*]\s+(.*)$', line)
            if match:
                indent = match.group(1)
                rest = match.group(2)
                converted.append(f"{indent}{self.bullet_char} {rest}")
            else:
                converted.append(line.rstrip())
        
        # Step 2: Collapse multiple blank lines to max 2
        cleaned = []
        blank_count = 0
        for line in converted:
            if line.strip() == "":
                blank_count += 1
                if blank_count <= 2:
                    cleaned.append("")
            else:
                blank_count = 0
                cleaned.append(line)
        
        result = "\n".join(cleaned).strip()
        
        return result
    


def format_answer(text: str) -> str:
    """
    Post-processar LLM-svar:
    - '- ' / '* ' → '• '
    - Trimmar trailing spaces
    - Max 2 tomrader i rad
    """
    if not text or not text.strip():
        return text
    
    lines = text.splitlines()
    converted = []
    
    for line in lines:
        m = BULLET_PATTERN.match(line)
        if m:
            indent, rest = m.groups()
            converted.append(f"{indent}• {rest}")
        else:
            converted.append(line.rstrip())
    
    cleaned = []
    blank_count = 0
    for line in converted:
        if line.strip() == "":
            blank_count += 1
            if blank_count <= 2:
                cleaned.append("")
        else:
            blank_count = 0
            cleaned.append(line)
    
    return "\n".join(cleaned).strip()


def format_output(text: str, config: Optional[Dict[str, Any]] = None) -> str:
    """
    Convenience function to format output text.
    
    Args:
        text: Raw LLM output
        config: Optional formatter config dict
        
    Returns:
        Formatted text
    """
    formatter = OutputFormatter(config)
    return formatter.format(text)

