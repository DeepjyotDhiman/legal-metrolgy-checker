import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image as PILImage

from app.core.config import settings
from app.services.base_ocr import (
    BaseOCRService,
    ExtractedDeclarationOutput,
    OCRPipelineResult,
    OCRRawOutput,
)
from app.services.image_service import ImageService

logger = logging.getLogger("trinetra.ocr.paddle")


class PaddleOCRService(BaseOCRService):
    """Production PaddleOCR service implementing BaseOCRService with lazy model loading."""

    _model_cache: Dict[str, Any] = {}

    def __init__(
        self,
        lang: Optional[str] = None,
        use_angle_cls: bool = True,
        show_log: bool = False,
    ):
        """Initialize PaddleOCR service settings.

        Args:
            lang: Language code ('en', 'hi', 'gu', etc.). Defaults to settings.OCR_DEFAULT_LANG.
            use_angle_cls: Whether to use orientation angle classifier.
            show_log: Whether PaddleOCR prints verbose logs.
        """
        self.lang = lang or getattr(settings, "OCR_DEFAULT_LANG", "en")
        self.use_angle_cls = use_angle_cls
        self.show_log = show_log

    @classmethod
    def _get_ocr_engine(cls, lang: str, use_angle_cls: bool = True, show_log: bool = False) -> Any:
        """Lazy-load and cache the PaddleOCR engine instance for a given language."""
        cache_key = f"{lang}_{use_angle_cls}"
        if cache_key in cls._model_cache:
            return cls._model_cache[cache_key]

        try:
            from paddleocr import PaddleOCR
        except ImportError as e:
            logger.error(f"PaddleOCR package is missing or not installed: {str(e)}")
            raise RuntimeError(
                "PaddleOCR dependency is not installed. Please install 'paddlepaddle' and 'paddleocr'."
            ) from e

        try:
            # Handle Windows CPU PaddleX onednn bug by updating blocklist
            try:
                import paddlex.inference.models.runners.paddle_static.config.blocklists as bl
                bl.MKLDNN_BLOCKLIST.extend([
                    "PP-OCRv6_medium_det",
                    "PP-OCRv6_medium_rec",
                    "PP-LCNet_x1_0_textline_ori",
                    "PP-OCRv4_mobile_det",
                    "PP-OCRv4_mobile_rec",
                    "PP-OCRv5_server_det",
                    "devanagari_PP-OCRv5_mobile_rec",
                ])
            except Exception:
                pass

            logger.info(f"Initializing PaddleOCR engine for language: '{lang}'...")
            try:
                # PaddleOCR 3.x (PaddleX pipeline)
                engine = PaddleOCR(
                    lang=lang,
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                )
            except TypeError:
                # PaddleOCR 2.x fallback
                engine = PaddleOCR(
                    use_angle_cls=use_angle_cls,
                    lang=lang,
                    show_log=show_log,
                )
            cls._model_cache[cache_key] = engine
            return engine
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR engine for lang '{lang}': {str(e)}")
            raise RuntimeError(f"PaddleOCR model initialization failed: {str(e)}") from e

    def process_images(
        self,
        image_paths: List[Path],
        source_image_ids: Optional[List[str]] = None,
    ) -> OCRPipelineResult:
        """Perform OCR transcription and mandatory declaration extraction using PaddleOCR."""
        if not image_paths:
            return OCRPipelineResult(
                raw_output=OCRRawOutput(raw_text="", confidence=0.0, language=self.lang),
                extracted_fields=[],
            )

        all_raw_lines: List[str] = []
        all_line_confidences: List[float] = []
        all_detected_items: List[Dict[str, Any]] = []

        engine = None
        engine_init_failed = False
        try:
            engine = self._get_ocr_engine(self.lang, self.use_angle_cls, self.show_log)
        except Exception as err:
            logger.warning(f"PaddleOCR engine unavailable: {str(err)}")
            engine_init_failed = True

        for idx, img_path in enumerate(image_paths):
            source_img_id = (
                source_image_ids[idx]
                if source_image_ids and idx < len(source_image_ids)
                else None
            )

            # 1. Image Quality Assessment Gate
            quality_info = ImageService.assess_quality(img_path)
            if not quality_info.get("is_acceptable", True):
                all_raw_lines.append(
                    f"[LOW_QUALITY_WARNING: Image '{img_path.name}' is too low quality or resolution for clear OCR]"
                )
                all_line_confidences.append(0.15)
                continue

            if engine_init_failed or engine is None:
                all_raw_lines.append(f"[OCR_ENGINE_UNAVAILABLE: Could not process {img_path.name}]")
                all_line_confidences.append(0.0)
                continue

            # 2. Image Preprocessing
            try:
                preprocessed_pil = ImageService.preprocess_image_for_ocr(img_path)
                import numpy as np
                img_np = np.array(preprocessed_pil)
            except Exception as e:
                logger.error(f"Error preprocessing image '{img_path}': {str(e)}")
                img_np = str(img_path)

            # 3. PaddleOCR Inference (handles both PaddleX 3.x and 2.x APIs)
            ocr_results = None
            try:
                try:
                    ocr_results = engine.ocr(img_np)
                except TypeError:
                    ocr_results = engine.ocr(img_np, cls=self.use_angle_cls)
            except Exception:
                try:
                    if hasattr(engine, "predict"):
                        ocr_results = list(engine.predict(img_np))
                except Exception as e2:
                    logger.error(f"PaddleOCR inference failed on '{img_path}': {str(e2)}")
                    all_raw_lines.append(f"[OCR_ERROR: {str(e2)}]")
                    all_line_confidences.append(0.0)
                    continue

            if not ocr_results:
                continue

            # 4. Normalize results across versions
            page_items = ocr_results[0]
            if isinstance(page_items, dict) and "rec_texts" in page_items:
                # PaddleOCR 3.x (PaddleX prediction dict)
                texts = page_items.get("rec_texts", [])
                scores = page_items.get("rec_scores", [])
                polys = page_items.get("rec_polys", page_items.get("dt_polys", []))
                boxes = page_items.get("rec_boxes", [])
                for i in range(len(texts)):
                    text_clean = str(texts[i]).strip()
                    conf_val = float(scores[i]) if i < len(scores) else 1.0
                    if not text_clean:
                        continue
                    all_raw_lines.append(text_clean)
                    all_line_confidences.append(conf_val)

                    if i < len(polys) and polys[i] is not None:
                        bbox_norm = self._normalize_bounding_box(polys[i])
                    elif i < len(boxes) and boxes[i] is not None:
                        bx = boxes[i]
                        bbox_norm = {
                            "x": int(bx[0]),
                            "y": int(bx[1]),
                            "w": int(bx[2] - bx[0]),
                            "h": int(bx[3] - bx[1]),
                        }
                    else:
                        bbox_norm = {"x": 0, "y": 0, "w": 0, "h": 0}

                    all_detected_items.append(
                        {
                            "text": text_clean,
                            "confidence": conf_val,
                            "bounding_box": bbox_norm,
                            "source_image_id": source_img_id,
                        }
                    )
            elif isinstance(page_items, list):
                # PaddleOCR 2.x (nested list format)
                for item in page_items:
                    if not item or len(item) < 2:
                        continue
                    box_points, (text, conf) = item[0], item[1]
                    text_clean = str(text).strip()
                    conf_val = float(conf)

                    if text_clean:
                        all_raw_lines.append(text_clean)
                        all_line_confidences.append(conf_val)

                        bbox_norm = self._normalize_bounding_box(box_points)
                        all_detected_items.append(
                            {
                                "text": text_clean,
                                "confidence": conf_val,
                                "bounding_box": bbox_norm,
                                "source_image_id": source_img_id,
                            }
                        )

        # Calculate consolidated raw text & overall confidence
        raw_text_combined = "\n".join(all_raw_lines)
        overall_confidence = (
            round(sum(all_line_confidences) / len(all_line_confidences), 2)
            if all_line_confidences
            else 0.0
        )

        # 5. Mandatory Packaging Declaration Extraction
        extracted_fields = self._extract_declarations(all_detected_items, raw_text_combined)

        return OCRPipelineResult(
            raw_output=OCRRawOutput(
                raw_text=raw_text_combined,
                confidence=overall_confidence,
                language=self.lang,
            ),
            extracted_fields=extracted_fields,
        )

    @staticmethod
    def _normalize_bounding_box(box_points: Any) -> Dict[str, int]:
        """Convert PaddleOCR polygon points [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] to {"x", "y", "w", "h"}."""
        try:
            import numpy as np
            if isinstance(box_points, np.ndarray):
                xs = box_points[:, 0].tolist()
                ys = box_points[:, 1].tolist()
            else:
                xs = [pt[0] for pt in box_points]
                ys = [pt[1] for pt in box_points]
            min_x = max(0, int(min(xs)))
            min_y = max(0, int(min(ys)))
            max_x = int(max(xs))
            max_y = int(max(ys))
            width = max(1, max_x - min_x)
            height = max(1, max_y - min_y)
            return {"x": min_x, "y": min_y, "w": width, "h": height}
        except Exception:
            return {"x": 0, "y": 0, "w": 0, "h": 0}

    def _extract_declarations(
        self,
        detected_items: List[Dict[str, Any]],
        raw_text: str,
    ) -> List[ExtractedDeclarationOutput]:
        """Extract mandatory Statutory Legal Metrology declarations from transcribed text items."""
        extracted: Dict[str, ExtractedDeclarationOutput] = {}

        # Regular expressions for Legal Metrology mandatory declarations
        mrp_pattern = re.compile(
            r"(M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|PRICE|RS\.?|₹)\s*[:\.-]?\s*([0-9\.,]+).*",
            re.IGNORECASE,
        )
        netqty_pattern = re.compile(
            r"(NET\s*(QTY|QUANTITY|WT|WEIGHT|CONTENTS?|VOL|VOLUME))\s*[:\.-]?\s*([0-9\.,]+\s*[a-zA-Z]+).*",
            re.IGNORECASE,
        )
        netqty_fallback_pattern = re.compile(
            r"\b([0-9\.]+\s*(g|kg|ml|l|liter|litres|m|cm|mm|n|nos|units|oz|gms))\b",
            re.IGNORECASE,
        )
        mfg_date_pattern = re.compile(
            r"(MFG|PACKED|PKD|DATE|DATE OF MFG|MFG DATE)\s*[:\.-]?\s*([0-9]{2}[\/\.-][0-9]{2,4}|[a-zA-Z]{3,9}\s*20?[0-9]{2}).*",
            re.IGNORECASE,
        )
        mfg_name_pattern = re.compile(
            r"(MFG BY|MANUFACTURED BY|PACKED BY|IMPORTED BY|MARKETED BY)\s*[:\.-]?\s*(.*)",
            re.IGNORECASE,
        )
        care_pattern = re.compile(
            r"(CARE|HELPLINE|CUSTOMER|CONSUMER|TOLL\s*FREE|CONTACT|EMAIL|FEEDBACK)\s*[:\.-]?\s*(.*)",
            re.IGNORECASE,
        )
        origin_pattern = re.compile(
            r"(COUNTRY OF ORIGIN|ORIGIN|MADE IN|PRODUCT OF)\s*[:\.-]?\s*(.*)",
            re.IGNORECASE,
        )

        for item in detected_items:
            text = item["text"]
            conf = item["confidence"]
            bbox = item["bounding_box"]
            src_id = item["source_image_id"]

            # 1. MRP
            if "mrp" not in extracted and (mrp_pattern.search(text) or "inclusive of all taxes" in text.lower()):
                extracted["mrp"] = ExtractedDeclarationOutput(
                    field_name="mrp",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

            # 2. Net Quantity
            if "net_quantity" not in extracted:
                if netqty_pattern.search(text):
                    extracted["net_quantity"] = ExtractedDeclarationOutput(
                        field_name="net_quantity",
                        field_value=text,
                        confidence=conf,
                        bounding_box=bbox,
                        source_image_id=src_id,
                    )
                elif netqty_fallback_pattern.search(text) and not mrp_pattern.search(text):
                    extracted["net_quantity"] = ExtractedDeclarationOutput(
                        field_name="net_quantity",
                        field_value=text,
                        confidence=conf,
                        bounding_box=bbox,
                        source_image_id=src_id,
                    )

            # 3. Mfg Date
            if "mfg_date" not in extracted and mfg_date_pattern.search(text):
                extracted["mfg_date"] = ExtractedDeclarationOutput(
                    field_name="mfg_date",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

            # 4. Manufacturer Name
            if "manufacturer_name" not in extracted and mfg_name_pattern.search(text):
                extracted["manufacturer_name"] = ExtractedDeclarationOutput(
                    field_name="manufacturer_name",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

            # 5. Manufacturer Address
            if "manufacturer_address" not in extracted and (
                "address" in text.lower() or "plot" in text.lower() or "industrial area" in text.lower() or re.search(r"\b\d{6}\b", text)
            ):
                extracted["manufacturer_address"] = ExtractedDeclarationOutput(
                    field_name="manufacturer_address",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

            # 6. Consumer Care
            if "consumer_care" not in extracted and (
                care_pattern.search(text) or "1800-" in text or "@" in text
            ):
                extracted["consumer_care"] = ExtractedDeclarationOutput(
                    field_name="consumer_care",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

            # 7. Country of Origin
            if "country_of_origin" not in extracted and origin_pattern.search(text):
                extracted["country_of_origin"] = ExtractedDeclarationOutput(
                    field_name="country_of_origin",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

        return list(extracted.values())
