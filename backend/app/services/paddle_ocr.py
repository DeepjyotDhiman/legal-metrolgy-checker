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
                for model_name in [
                    "PP-OCRv6_medium_det",
                    "PP-OCRv6_medium_rec",
                    "PP-LCNet_x1_0_textline_ori",
                    "PP-LCNet_x1_0_doc_ori",
                    "PP-OCRv4_mobile_det",
                    "PP-OCRv4_mobile_rec",
                    "PP-OCRv5_server_det",
                    "devanagari_PP-OCRv5_mobile_rec",
                ]:
                    if model_name not in bl.MKLDNN_BLOCKLIST:
                        bl.MKLDNN_BLOCKLIST.append(model_name)
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
            except (TypeError, ValueError):
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

        engine = self._get_ocr_engine(self.lang, self.use_angle_cls, self.show_log)

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
                if hasattr(engine, "predict"):
                    ocr_results = list(engine.predict(img_np))
                else:
                    try:
                        ocr_results = engine.ocr(img_np)
                    except TypeError:
                        ocr_results = engine.ocr(img_np, cls=self.use_angle_cls)
            except Exception as e:
                logger.error(f"PaddleOCR inference failed on '{img_path}': {str(e)}")
                raise RuntimeError(f"PaddleOCR inference failed on image '{img_path.name}': {str(e)}") from e

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
            if hasattr(box_points, "tolist"):
                box_points = box_points.tolist()
            xs = [float(pt[0]) for pt in box_points]
            ys = [float(pt[1]) for pt in box_points]
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

        # 1. MRP Pattern
        mrp_pattern = re.compile(
            r"(?:M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|PRICE|RS\.?|₹)\s*[:\.-]?\s*([0-9\.,]+).*",
            re.IGNORECASE,
        )

        # 2. Net Quantity Patterns
        # Ban nutritional and serving size contexts (e.g. "per 100 g", "approx. values per 100 g")
        nutritional_exclude = re.compile(
            r"\b(?:per\s+100\s*(?:g|ml|gms)|approx\.?\s*values?|serving\s*size|nutrition|energy|protein|carbohydrate|fat|sugar|basis)\b",
            re.IGNORECASE,
        )
        # Explicit labeled net quantity (Net Quantity, Net Qty, Net Wt, Net Weight, Net Volume, etc.)
        netqty_explicit_pattern = re.compile(
            r"\b(?:NET\s*(?:QTY\.?|QUANTITY|WT\.?|WEIGHT|CONTENTS?|VOL\.?|VOLUME)|N\.?Q\.?)\s*[:\.-]?\s*([0-9\.,]+\s*(?:kg|g|gms|milligrams|mg|litres?|liters?|ltr|millilitres?|milliliters?|ml|l|pieces?|pcs?|units?|m|cm|mm|n|nos))\b.*",
            re.IGNORECASE,
        )
        # Fallback unlabeled metric quantity (only used if explicit label is absent and line is not nutritional)
        netqty_fallback_pattern = re.compile(
            r"\b([0-9\.]+\s*(?:g|kg|ml|l|liter|litres|ltr|m|cm|mm|n|nos|units|gms))\b",
            re.IGNORECASE,
        )

        # 3. Manufacturing Date Pattern (supports numeric dates and textual months e.g. "12 MAR 2025", "12-MAR-2025", "MAR 2025")
        mfg_date_pattern = re.compile(
            r"(?:MFG\.?\s*DATE|MFD\.?\s*DATE|MANUFACTURING\s*DATE|DATE\s*OF\s*(?:MFG|MANUFACTURE|PACKING)|PKD\.?\s*DATE|PACKED\s*(?:ON|DATE)?|DOM|DOP|MFG\.?|MFD\.?|PKD\.?|DATE)\s*[:\.-]?\s*(\d{1,2}[\s\/\.-]?(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s\/\.-]?\d{2,4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s\/\.-]?\d{2,4}|\d{1,2}[\/\.-]\d{2,4})\b.*",
            re.IGNORECASE,
        )

        # 4. Manufacturer Name Pattern (supports Mfd. By, Mfd By, Mfg. By, Mfg By, Manufactured By, etc.)
        mfg_name_pattern = re.compile(
            r"(?:M(?:FD|FG)\.?\s*(?:&|AND)?\s*(?:PKD\.?)?\s*BY|MANUFACTURED\s*(?:&|AND)?\s*(?:PACKED\s*)?BY|PACKED\s*BY|PKD\.?\s*BY|IMPORTED\s*BY|MARKETED\s*BY)\s*[:\.-]?\s*(.*)",
            re.IGNORECASE,
        )

        # 5. Manufacturer Address Pattern (postal PIN, streets, cities, landmarks)
        addr_pattern = re.compile(
            r"\b(?:\d+\s*[\/\-]\s*[0-9a-zA-Z]+|\bplot\b|\bsector\b|\bindustrial\s+area\b|\bstreet\b|\broad\b|\blane\b|\bmarg\b|\bnagar\b|\bestate\b|\bfloor\b|\bbldg\b|\bbuilding\b|\bdistrict\b|\bkolkata\b|\bmumbai\b|\bdelhi\b|\bbengaluru\b|\bbangalore\b|\bchennai\b|\bhyderabad\b|\bpune\b|\bahmedabad\b|\bjaipur\b|\bdehradun\b|\bharyana\b|\bgujarat\b|\bkarnataka\b|\bmaharashtra\b|\bwest\s+bengal\b|\btamil\s+nadu\b)\b|\b[1-9]\d{5}\b|\b[1-9]\d{2}\s*\d{3}\b",
            re.IGNORECASE,
        )

        # 6. Consumer Care Patterns (phone numbers, emails, grievance headings)
        care_heading_pattern = re.compile(
            r"\b(?:CUSTOMER\s*CARE|CONSUMER\s*CARE|HELPLINE|FEEDBACK|COMPLAINTS?|CARE\s*EXECUTIVE|CONTACT\s*US)\b",
            re.IGNORECASE,
        )
        email_pattern = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
        phone_pattern = re.compile(r"\b1800[\s-]?\d{3}[\s-]?\d{3,4}\b|\b(?:\+?91[\s-]?)?[6-9]\d{9}\b|\b0\d{2,4}[\s-]?\d{6,8}\b")

        # 7. Country of Origin Pattern (requires explicit contextual label, never guess from address)
        origin_explicit_pattern = re.compile(
            r"\b(?:COUNTRY\s*OF\s*(?:ORIGIN|MANUFACTURE)|MADE\s*IN|PRODUCT\s*OF|PRODUCED\s*IN|MANUFACTURED\s*IN|ASSEMBLED\s*IN|ORIGIN)\s*[:\.-]?\s*([a-zA-Z\s]{3,30})\b",
            re.IGNORECASE,
        )

        care_contacts: List[str] = []
        care_main_item: Optional[Dict[str, Any]] = None

        # Pass 1: Explicit labels and key fields
        for item in detected_items:
            text = item["text"].strip()
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

            # 2. Explicit Net Quantity
            if "net_quantity" not in extracted:
                if netqty_explicit_pattern.search(text) and not nutritional_exclude.search(text):
                    extracted["net_quantity"] = ExtractedDeclarationOutput(
                        field_name="net_quantity",
                        field_value=text,
                        confidence=conf,
                        bounding_box=bbox,
                        source_image_id=src_id,
                    )

            # 3. Mfg Date
            if "mfg_date" not in extracted and mfg_date_pattern.search(text) and not nutritional_exclude.search(text):
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

            # 5. Manufacturer Address (exclude dates, prices, and net quantities)
            if (
                "manufacturer_address" not in extracted
                and not mfg_name_pattern.search(text)
                and not mfg_date_pattern.search(text)
                and not mrp_pattern.search(text)
                and not netqty_explicit_pattern.search(text)
                and addr_pattern.search(text)
            ):
                extracted["manufacturer_address"] = ExtractedDeclarationOutput(
                    field_name="manufacturer_address",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

            # 6. Consumer Care detection (collect phones and emails across items)
            if care_heading_pattern.search(text) or email_pattern.search(text) or phone_pattern.search(text):
                if care_main_item is None:
                    care_main_item = item
                phones = phone_pattern.findall(text)
                emails = email_pattern.findall(text)
                for p in phones:
                    if p not in care_contacts:
                        care_contacts.append(p)
                for e in emails:
                    if e not in care_contacts:
                        care_contacts.append(e)

            # 7. Country of Origin (explicit contextual label only)
            if "country_of_origin" not in extracted and origin_explicit_pattern.search(text):
                extracted["country_of_origin"] = ExtractedDeclarationOutput(
                    field_name="country_of_origin",
                    field_value=text,
                    confidence=conf,
                    bounding_box=bbox,
                    source_image_id=src_id,
                )

        # Populate Consumer Care with gathered concrete contact details
        if care_contacts and care_main_item:
            val = ", ".join(care_contacts)
            extracted["consumer_care"] = ExtractedDeclarationOutput(
                field_name="consumer_care",
                field_value=val,
                confidence=care_main_item["confidence"],
                bounding_box=care_main_item["bounding_box"],
                source_image_id=care_main_item["source_image_id"],
            )
        elif care_main_item:
            extracted["consumer_care"] = ExtractedDeclarationOutput(
                field_name="consumer_care",
                field_value=care_main_item["text"],
                confidence=care_main_item["confidence"],
                bounding_box=care_main_item["bounding_box"],
                source_image_id=care_main_item["source_image_id"],
            )

        # Pass 2: Fallback Net Quantity ONLY if explicit label was not found and line is not nutritional
        if "net_quantity" not in extracted:
            for item in detected_items:
                text = item["text"].strip()
                if not nutritional_exclude.search(text) and not mrp_pattern.search(text):
                    if netqty_fallback_pattern.search(text):
                        extracted["net_quantity"] = ExtractedDeclarationOutput(
                            field_name="net_quantity",
                            field_value=text,
                            confidence=item["confidence"],
                            bounding_box=item["bounding_box"],
                            source_image_id=item["source_image_id"],
                        )
                        break

        return list(extracted.values())
