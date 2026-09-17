from pathlib import Path
from typing import List, Optional
from app.services.base_ocr import (
    BaseOCRService,
    OCRPipelineResult,
    OCRRawOutput,
    ExtractedDeclarationOutput,
)


class MockOCRService(BaseOCRService):
    """Deterministic mock OCR and field extraction service for testing and MVP foundation."""

    def __init__(self, mode: str = "compliant"):
        """Initialize mock service.

        Args:
            mode: 'compliant' for a fully compliant package,
                  'missing_mrp_tax' for MRP missing tax clause,
                  'non_compliant' for missing mandatory declarations.
        """
        self.mode = mode

    def process_images(
        self,
        image_paths: List[Path],
        source_image_ids: Optional[List[str]] = None,
    ) -> OCRPipelineResult:
        primary_image_id = source_image_ids[0] if source_image_ids else None

        if self.mode == "missing_mrp_tax":
            raw_text = (
                "HIMALAYAN ORGANICS ALMOND CRUNCH\n"
                "Net Wt: 400 g\n"
                "MRP Rs. 240.00\n"
                "Mfg Date: 05/2026\n"
                "Packed by: Nature Care Pvt Ltd, Plot 42, Sector 18, Gurugram, Haryana 122001\n"
                "Customer Helpline: +91 9876543210, Email: support@naturecare.in\n"
                "Country of Origin: India\n"
            )
            extracted = [
                ExtractedDeclarationOutput(
                    field_name="mrp",
                    field_value="MRP Rs. 240.00",
                    confidence=0.88,
                    bounding_box={"x": 50, "y": 120, "w": 220, "h": 40},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="net_quantity",
                    field_value="400 g",
                    confidence=0.94,
                    bounding_box={"x": 50, "y": 80, "w": 180, "h": 35},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="manufacturer_name",
                    field_value="Nature Care Pvt Ltd",
                    confidence=0.91,
                    bounding_box={"x": 50, "y": 180, "w": 300, "h": 35},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="manufacturer_address",
                    field_value="Plot 42, Sector 18, Gurugram, Haryana 122001",
                    confidence=0.89,
                    bounding_box={"x": 50, "y": 220, "w": 400, "h": 40},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="mfg_date",
                    field_value="05/2026",
                    confidence=0.92,
                    bounding_box={"x": 50, "y": 150, "w": 190, "h": 30},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="consumer_care",
                    field_value="+91 9876543210, support@naturecare.in",
                    confidence=0.90,
                    bounding_box={"x": 50, "y": 270, "w": 420, "h": 35},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="country_of_origin",
                    field_value="India",
                    confidence=0.95,
                    bounding_box={"x": 50, "y": 310, "w": 200, "h": 30},
                    source_image_id=primary_image_id,
                ),
            ]
        elif self.mode == "non_compliant":
            raw_text = (
                "GENERIC EXPORT COOKIES\n"
                "Net Wt: 12 oz\n"
                "Price: $5.00\n"
            )
            extracted = [
                ExtractedDeclarationOutput(
                    field_name="net_quantity",
                    field_value="12 oz",
                    confidence=0.85,
                    bounding_box={"x": 40, "y": 70, "w": 120, "h": 30},
                    source_image_id=primary_image_id,
                )
            ]
        else:
            # Fully compliant default package
            raw_text = (
                "SHREE KRISHNA PREMIUM BASMATI RICE\n"
                "Net Quantity: 5 kg\n"
                "MRP Rs. 650.00 (Incl. of all taxes)\n"
                "Mfg Date: 03/2026\n"
                "Manufactured & Packed by: Agro Foods India Ltd, Industrial Area, Karnal, Haryana 132001\n"
                "For Consumer Complaints contact: 1800-111-2222 or care@agrofoods.in\n"
                "Country of Origin: India\n"
            )
            extracted = [
                ExtractedDeclarationOutput(
                    field_name="mrp",
                    field_value="MRP Rs. 650.00 (Incl. of all taxes)",
                    confidence=0.96,
                    bounding_box={"x": 60, "y": 140, "w": 320, "h": 40},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="net_quantity",
                    field_value="5 kg",
                    confidence=0.95,
                    bounding_box={"x": 60, "y": 90, "w": 180, "h": 35},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="manufacturer_name",
                    field_value="Agro Foods India Ltd",
                    confidence=0.93,
                    bounding_box={"x": 60, "y": 200, "w": 280, "h": 35},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="manufacturer_address",
                    field_value="Industrial Area, Karnal, Haryana 132001",
                    confidence=0.91,
                    bounding_box={"x": 60, "y": 240, "w": 400, "h": 40},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="mfg_date",
                    field_value="03/2026",
                    confidence=0.94,
                    bounding_box={"x": 60, "y": 170, "w": 180, "h": 30},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="consumer_care",
                    field_value="1800-111-2222, care@agrofoods.in",
                    confidence=0.92,
                    bounding_box={"x": 60, "y": 290, "w": 410, "h": 35},
                    source_image_id=primary_image_id,
                ),
                ExtractedDeclarationOutput(
                    field_name="country_of_origin",
                    field_value="India",
                    confidence=0.97,
                    bounding_box={"x": 60, "y": 330, "w": 210, "h": 30},
                    source_image_id=primary_image_id,
                ),
            ]

        return OCRPipelineResult(
            raw_output=OCRRawOutput(
                raw_text=raw_text,
                confidence=0.93,
                language="en",
            ),
            extracted_fields=extracted,
        )
