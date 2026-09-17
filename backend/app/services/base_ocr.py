from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from pathlib import Path


@dataclass
class OCRRawOutput:
    """Raw OCR text output and confidence from one or more package images."""
    raw_text: str
    confidence: float
    language: str = "multilingual"


@dataclass
class ExtractedDeclarationOutput:
    """Standardized extracted mandatory packaging declaration."""
    field_name: str
    field_value: str
    confidence: float
    bounding_box: Optional[Dict[str, Any]] = None
    source_image_id: Optional[str] = None


@dataclass
class OCRPipelineResult:
    """Consolidated outcome of the OCR and field-extraction stage."""
    raw_output: OCRRawOutput
    extracted_fields: List[ExtractedDeclarationOutput]


class BaseOCRService(ABC):
    """Abstract interface for packaging OCR and declaration extraction services."""

    @abstractmethod
    def process_images(
        self,
        image_paths: List[Path],
        source_image_ids: Optional[List[str]] = None,
    ) -> OCRPipelineResult:
        """Perform OCR and declaration field extraction on uploaded images.

        Args:
            image_paths: Local filesystem paths to packaging images.
            source_image_ids: Database IDs of corresponding image records.

        Returns:
            OCRPipelineResult containing raw OCR text and structured fields.
        """
        raise NotImplementedError
