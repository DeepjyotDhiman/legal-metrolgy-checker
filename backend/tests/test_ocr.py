from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from PIL import Image as PILImage

from app.services.base_ocr import BaseOCRService, OCRPipelineResult, OCRRawOutput, ExtractedDeclarationOutput
from app.services.mock_ocr import MockOCRService
from app.services.paddle_ocr import PaddleOCRService
from app.services.image_service import ImageService
from app.services.inspection_service import InspectionService


def test_ocr_service_interface_inheritance():
    """Verify both MockOCRService and PaddleOCRService implement BaseOCRService protocol."""
    mock_service = MockOCRService()
    paddle_service = PaddleOCRService()

    assert isinstance(mock_service, BaseOCRService)
    assert isinstance(paddle_service, BaseOCRService)


def test_mock_ocr_service_modes():
    """Test MockOCRService for compliant, missing_mrp_tax, and non_compliant modes."""
    # 1. Compliant mode
    service_compliant = MockOCRService(mode="compliant")
    result_compliant = service_compliant.process_images([Path("dummy.png")], source_image_ids=["img_1"])

    assert isinstance(result_compliant, OCRPipelineResult)
    assert isinstance(result_compliant.raw_output, OCRRawOutput)
    assert result_compliant.raw_output.confidence > 0.8
    assert len(result_compliant.extracted_fields) >= 6

    field_names = [f.field_name for f in result_compliant.extracted_fields]
    assert "mrp" in field_names
    assert "net_quantity" in field_names
    assert "manufacturer_name" in field_names
    assert "country_of_origin" in field_names

    # Check bounding box shape
    mrp_field = next(f for f in result_compliant.extracted_fields if f.field_name == "mrp")
    assert mrp_field.bounding_box == {"x": 60, "y": 140, "w": 320, "h": 40}
    assert mrp_field.source_image_id == "img_1"

    # 2. Non-compliant mode
    service_non_comp = MockOCRService(mode="non_compliant")
    result_non_comp = service_non_comp.process_images([Path("dummy.png")], source_image_ids=["img_1"])
    field_names_nc = [f.field_name for f in result_non_comp.extracted_fields]
    assert "net_quantity" in field_names_nc
    assert "mrp" not in field_names_nc


def test_bounding_box_normalization():
    """Test polygon coordinates to bounding box conversion."""
    polygon = [[10.0, 20.0], [110.0, 20.0], [110.0, 60.0], [10.0, 60.0]]
    bbox = PaddleOCRService._normalize_bounding_box(polygon)

    assert bbox == {"x": 10, "y": 20, "w": 100, "h": 40}


def test_image_preprocessing_and_quality_check(tmp_path):
    """Test ImageService preprocessing and quality assessment functions."""
    # Create synthetic test image
    img_file = tmp_path / "test_label.png"
    pil_img = PILImage.new("RGB", (400, 300), color=(240, 240, 240))
    pil_img.save(img_file)

    # Assess quality
    quality_result = ImageService.assess_quality(img_file)
    assert "quality_score" in quality_result
    assert quality_result["is_acceptable"] is True
    assert quality_result["width"] == 400
    assert quality_result["height"] == 300

    # Preprocess
    proc_img = ImageService.preprocess_image_for_ocr(img_file)
    assert isinstance(proc_img, PILImage.Image)
    assert proc_img.size == (400, 300)


def test_paddle_ocr_with_mocked_engine(tmp_path):
    """Test PaddleOCRService process_images flow with a mocked PaddleOCR engine."""
    img_file = tmp_path / "mock_packaging.png"
    pil_img = PILImage.new("RGB", (600, 400), color=(255, 255, 255))
    pil_img.save(img_file)

    paddle_service = PaddleOCRService(lang="en")

    # Mock PaddleOCR engine output format
    mock_ocr_engine = MagicMock()
    mock_ocr_engine.ocr.return_value = [
        [
            [[[50, 100], [350, 100], [350, 140], [50, 140]], ("MRP Rs. 500.00 (Incl. of all taxes)", 0.95)],
            [[[50, 160], [250, 160], [250, 195], [50, 195]], ("Net Quantity: 1 kg", 0.96)],
            [[[50, 210], [300, 210], [300, 240], [50, 240]], ("Mfg Date: 04/2026", 0.92)],
            [[[50, 250], [400, 250], [400, 280], [50, 280]], ("Manufactured By: Quality Foods Ltd", 0.91)],
            [[[50, 290], [450, 290], [450, 320], [50, 320]], ("Plot 12, Industrial Area, Jaipur, Rajasthan", 0.89)],
            [[[50, 330], [400, 330], [400, 360], [50, 360]], ("Customer Care: 1800-123-4567, care@qualityfoods.in", 0.94)],
            [[[50, 370], [250, 370], [250, 395], [50, 395]], ("Country of Origin: India", 0.97)],
        ]
    ]

    with patch.object(PaddleOCRService, "_get_ocr_engine", return_value=mock_ocr_engine):
        result = paddle_service.process_images([img_file], source_image_ids=["img_uuid_100"])

        assert isinstance(result, OCRPipelineResult)
        assert result.raw_output.confidence > 0.90
        assert "MRP Rs. 500.00" in result.raw_output.raw_text

        # Verify extracted declarations
        fields_by_name = {f.field_name: f for f in result.extracted_fields}
        assert "mrp" in fields_by_name
        assert "net_quantity" in fields_by_name
        assert "mfg_date" in fields_by_name
        assert "manufacturer_name" in fields_by_name
        assert "manufacturer_address" in fields_by_name
        assert "consumer_care" in fields_by_name
        assert "country_of_origin" in fields_by_name

        mrp_item = fields_by_name["mrp"]
        assert mrp_item.bounding_box == {"x": 50, "y": 100, "w": 300, "h": 40}
        assert mrp_item.source_image_id == "img_uuid_100"


def test_paddle_ocr_low_quality_image_handling(tmp_path):
    """Verify low quality images produce appropriate low-confidence results safely."""
    tiny_img_file = tmp_path / "tiny_unreadable.png"
    pil_img = PILImage.new("RGB", (20, 20), color=(128, 128, 128))
    pil_img.save(tiny_img_file)

    paddle_service = PaddleOCRService(lang="en")
    result = paddle_service.process_images([tiny_img_file], source_image_ids=["img_tiny"])

    assert result.raw_output.confidence < 0.20
    assert "LOW_QUALITY_WARNING" in result.raw_output.raw_text


def test_inspection_service_default_ocr_resolver():
    """Verify InspectionService resolves active OCR provider based on application configuration."""
    ocr_service = InspectionService.get_default_ocr_service()
    assert isinstance(ocr_service, BaseOCRService)
