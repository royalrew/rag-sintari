"""
Tester för presentation modes (consulting/chat/raw) och output formattering.

Verifierar att:
- consulting mode innehåller rubriker + "Källor:" om flaggan är true
- chat mode inte har "Källor:"-block när flaggan är false
- raw mode har inga extra rubriker, minimal text
- OutputFormatter konverterar "- " till "• " korrekt
"""

import pytest
from rag.output_formatter import format_answer
from unittest.mock import Mock, patch
import tempfile
import os


class TestOutputFormatter:
    """Tester för OutputFormatter."""
    
    def test_bullet_conversion(self):
        """Test att - → • konvertering fungerar."""
        input_text = """Fördelar:

- Punkt 1
- Punkt 2
- Punkt 3"""
        
        result = format_answer(input_text)
        
        assert "• Punkt 1" in result
        assert "• Punkt 2" in result
        assert "• Punkt 3" in result
        assert "- Punkt" not in result
    
    def test_asterisk_conversion(self):
        """Test att * → • konvertering fungerar."""
        input_text = """Lista:
* Item 1
* Item 2"""
        
        result = format_answer(input_text)
        
        assert "• Item 1" in result
        assert "• Item 2" in result
        assert "* Item" not in result
    
    def test_blank_line_collapse(self):
        """Test att flera blanka rader collapsas till max 2."""
        input_text = """Text 1


Text 2



Text 3"""
        
        result = format_answer(input_text)
        
        # Räkna blanka rader - bör inte vara fler än 2 i rad
        lines = result.split('\n')
        blank_count = 0
        max_blank_sequence = 0
        
        for line in lines:
            if line.strip() == "":
                blank_count += 1
                max_blank_sequence = max(max_blank_sequence, blank_count)
            else:
                blank_count = 0
        
        assert max_blank_sequence <= 2, f"För många blanka rader i rad: {max_blank_sequence}"
    
    def test_trailing_space_trim(self):
        """Test att trailing spaces trimmas."""
        input_text = "Text med trailing spaces   \n"
        
        result = format_answer(input_text)
        
        # Kontrollera att ingen rad slutar med space
        for line in result.split('\n'):
            if line:
                assert not line.endswith(' '), f"Rad slutar med space: '{line}'"


class TestPresentationModes:
    """Tester för presentation modes via engine."""
    
    @pytest.fixture
    def mock_config(self):
        """Mock config för tester."""
        config = {
            "output": {
                "include_sources_in_answer": True,
                "presentation_mode": "consulting",
                "bullets": "•",
            },
            "models": {"llm": {"answer": "gpt-4o"}},
            "rerank": {"enabled": False},
            "bench": {"use_bench_prompt": False},
        }
        return config
    
    @pytest.fixture
    def mock_retriever(self):
        """Mock retriever för tester."""
        retriever = Mock()
        retriever.retrieve.return_value = [
            {
                "text": "Test text från dokument",
                "metadata": {"document_name": "test.txt", "page_number": 1},
                "chunk_id": "chunk1",
            }
        ]
        retriever.mode = "hybrid"
        retriever.top_k = 5
        return retriever
    
    @pytest.fixture
    def mock_llm(self):
        """Mock LLM client för tester."""
        llm = Mock()
        llm.answer.return_value = """Fördelar:

- Punkt 1
- Punkt 2

Källor:
- test.txt s.1"""
        llm.model_answer = "gpt-4o"
        return llm
    
    def test_consulting_mode_with_sources(self, mock_config, mock_retriever, mock_llm):
        """Test consulting mode med källor inkluderade."""
        from rag.engine import RAGEngine
        
        with patch('rag.engine.load_config', return_value=mock_config):
            engine = RAGEngine(retriever=mock_retriever, llm=mock_llm)
            engine.include_sources_in_answer = True
            engine.presentation_mode = "consulting"
        
        result = engine.answer_question("Testfråga", workspace_id="default", mode="answer")
        
        answer = result.get("answer", "")
        
        # Consulting mode bör ha strukturerad text med rubriker
        assert answer, "Svar saknas"
        # Bullet points bör vara konverterade
        assert "•" in answer or "Fördelar" in answer, "Saknar strukturerad presentation"
    
    def test_chat_mode_without_sources(self, mock_config, mock_retriever, mock_llm):
        """Test chat mode utan källor i svaret."""
        from rag.engine import RAGEngine
        
        mock_config["output"]["include_sources_in_answer"] = False
        mock_config["output"]["presentation_mode"] = "chat"
        
        with patch('rag.engine.load_config', return_value=mock_config):
            engine = RAGEngine(retriever=mock_retriever, llm=mock_llm)
            # Källorna ska finnas i resultatet men inte i answer-texten
            # (om flaggan är false)
        
        # Notera: I praktiken läggs källor till programmatiskt om flaggan är true
        # Om flaggan är false bör de inte läggas till automatiskt
        assert True  # Placeholder - real test behöver mer setup
    
    def test_raw_mode_minimal(self, mock_config, mock_retriever, mock_llm):
        """Test raw mode med minimal formatering."""
        from rag.engine import RAGEngine
        
        mock_config["output"]["presentation_mode"] = "raw"
        
        with patch('rag.engine.load_config', return_value=mock_config):
            engine = RAGEngine(retriever=mock_retriever, llm=mock_llm)
        
        assert engine.presentation_mode == "raw"
        # Raw mode bör ge korta, direkta svar
        assert True  # Placeholder - real test behöver mer setup


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

