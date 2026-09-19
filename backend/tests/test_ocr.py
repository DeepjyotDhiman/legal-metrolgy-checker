from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from PIL import Image as PILImage, ImageDraw

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
    mock_ocr_engine.predict.return_value = [
        {
            "rec_texts": [
                "MRP Rs. 500.00 (Incl. of all taxes)",
                "Net Quantity: 1 kg",
                "Mfg Date: 04/2026",
                "Manufactured By: Quality Foods Ltd",
                "Plot 12, Industrial Area, Jaipur, Rajasthan",
                "Customer Care: 1800-123-4567, care@qualityfoods.in",
                "Country of Origin: India",
            ],
            "rec_scores": [0.95, 0.96, 0.92, 0.91, 0.89, 0.94, 0.97],
            "rec_polys": [
                [[50, 100], [350, 100], [350, 140], [50, 140]],
                [[50, 160], [250, 160], [250, 195], [50, 195]],
                [[50, 210], [300, 210], [300, 240], [50, 240]],
                [[50, 250], [400, 250], [400, 280], [50, 280]],
                [[50, 290], [450, 290], [450, 320], [50, 320]],
                [[50, 330], [400, 330], [400, 360], [50, 360]],
                [[50, 370], [250, 370], [250, 395], [50, 395]],
            ],
        }
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
    assert isinstance(ocr_service, PaddleOCRService)


def test_no_silent_mock_fallback_on_error():
    """Verify that PaddleOCR does not silently return mock data on failure."""
    paddle_service = PaddleOCRService(lang="en")
    with patch.object(PaddleOCRService, "_get_ocr_engine", side_effect=RuntimeError("Engine Init Crash")):
        with pytest.raises(RuntimeError) as exc_info:
            paddle_service.process_images([Path("non_existent.png")])
        assert "Engine Init Crash" in str(exc_info.value)


def test_real_paddle_ocr_live_inference(tmp_path):
    """Execute a real, live PaddleOCR inference test on a generated label image."""
    img_file = tmp_path / "real_label_test.png"
    pil_img = PILImage.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(pil_img)
    draw.text((50, 50), "ORGANIC HIMALAYAN HONEY", fill=(0, 0, 0))
    draw.text((50, 100), "Net Quantity: 500 g", fill=(0, 0, 0))
    draw.text((50, 150), "MRP Rs. 350.00 (Incl. of all taxes)", fill=(0, 0, 0))
    draw.text((50, 200), "Mfg Date: 08/2026", fill=(0, 0, 0))
    draw.text((50, 250), "Manufactured By: Pure Nature Organics Ltd", fill=(0, 0, 0))
    draw.text((50, 300), "Plot 14, Industrial Estate, Dehradun 248001, India", fill=(0, 0, 0))
    draw.text((50, 350), "Customer Care: 1800-444-5555, care@purenature.in", fill=(0, 0, 0))
    draw.text((50, 400), "Country of Origin: India", fill=(0, 0, 0))
    pil_img.save(img_file)

    service = PaddleOCRService(lang="en")
    result = service.process_images([img_file], source_image_ids=["real_test_uuid"])

    assert isinstance(result, OCRPipelineResult)
    assert result.raw_output.confidence > 0.85
    assert len(result.extracted_fields) >= 5

    field_dict = {f.field_name: f for f in result.extracted_fields}
    assert "mrp" in field_dict
    assert "net_quantity" in field_dict
    assert "mfg_date" in field_dict
    assert "country_of_origin" in field_dict

    # Check that bounding boxes are real coordinates (not zero)
    assert field_dict["mrp"].bounding_box["w"] > 0
    assert field_dict["mrp"].bounding_box["h"] > 0
    assert field_dict["mrp"].confidence > 0.80


def test_packaged_food_extraction_regression():
    """Regression test for real packaged food label text extraction."""
    detected_items = [
        {"text": "(Approx. values per 100 g)", "confidence": 0.95, "bounding_box": {"x": 10, "y": 10, "w": 150, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "Net Quantity: 100 g", "confidence": 0.99, "bounding_box": {"x": 10, "y": 40, "w": 100, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "Mfd. By: Britannia Industries Ltd.", "confidence": 0.98, "bounding_box": {"x": 10, "y": 70, "w": 200, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "5/1A, Hungerford Street, Kolkata - 700017, India.", "confidence": 0.97, "bounding_box": {"x": 10, "y": 100, "w": 300, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "Mfg. Date: 12 MAR 2025", "confidence": 0.99, "bounding_box": {"x": 10, "y": 130, "w": 150, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "MRP ₹ 40.00 (Incl. of all taxes)", "confidence": 0.99, "bounding_box": {"x": 10, "y": 160, "w": 180, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "Customer Care Executive, Britannia Industries Ltd.", "confidence": 0.96, "bounding_box": {"x": 10, "y": 190, "w": 250, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "1800 425 4444", "confidence": 0.98, "bounding_box": {"x": 10, "y": 220, "w": 100, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "customercare@britindia.com", "confidence": 0.98, "bounding_box": {"x": 10, "y": 250, "w": 150, "h": 20}, "source_image_id": "img_reg_1"},
        {"text": "India", "confidence": 0.99, "bounding_box": {"x": 10, "y": 280, "w": 50, "h": 20}, "source_image_id": "img_reg_1"},
    ]

    service = PaddleOCRService(lang="en")
    raw_text = "\n".join(i["text"] for i in detected_items)
    extracted = service._extract_declarations(detected_items, raw_text)

    field_map = {f.field_name: f for f in extracted}

    # 1. Net Quantity must be 'Net Quantity: 100 g' and NEVER '(Approx. values per 100 g)'
    assert "net_quantity" in field_map
    assert "100 g" in field_map["net_quantity"].field_value
    assert "approx" not in field_map["net_quantity"].field_value.lower()
    assert "per 100" not in field_map["net_quantity"].field_value.lower()
    assert field_map["net_quantity"].bounding_box == {"x": 10, "y": 40, "w": 100, "h": 20}

    # 2. Manufacturer Name must be 'Mfd. By: Britannia Industries Ltd.'
    assert "manufacturer_name" in field_map
    assert "Britannia Industries" in field_map["manufacturer_name"].field_value

    # 3. Manufacturer Address must be '5/1A, Hungerford Street, Kolkata - 700017, India.'
    assert "manufacturer_address" in field_map
    assert "Kolkata - 700017" in field_map["manufacturer_address"].field_value

    # 4. Mfg Date must be 'Mfg. Date: 12 MAR 2025'
    assert "mfg_date" in field_map
    assert "12 MAR 2025" in field_map["mfg_date"].field_value

    # 5. MRP must be 'MRP ₹ 40.00 (Incl. of all taxes)'
    assert "mrp" in field_map
    assert "40.00" in field_map["mrp"].field_value

    # 6. Consumer Care must preserve phone and email evidence
    assert "consumer_care" in field_map
    assert "1800 425 4444" in field_map["consumer_care"].field_value
    assert "customercare@britindia.com" in field_map["consumer_care"].field_value

    # 7. Country of Origin should NOT be falsely extracted from address or standalone 'India'
    assert "country_of_origin" not in field_map


def test_net_quantity_nutritional_collision_only():
    """Verify that packages with only nutritional per 100g and no Net Quantity do not falsely extract."""
    detected_items = [
        {"text": "Energy: 450 kcal", "confidence": 0.95, "bounding_box": {"x": 10, "y": 10, "w": 100, "h": 20}, "source_image_id": "img_1"},
        {"text": "Per 100g values", "confidence": 0.95, "bounding_box": {"x": 10, "y": 30, "w": 100, "h": 20}, "source_image_id": "img_1"},
    ]
    service = PaddleOCRService(lang="en")
    extracted = service._extract_declarations(detected_items, "Energy: 450 kcal\nPer 100g values")
    field_map = {f.field_name: f for f in extracted}
    assert "net_quantity" not in field_map

