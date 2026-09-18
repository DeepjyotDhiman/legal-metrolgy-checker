"""
Comprehensive unit tests for TriNetra Legal Metrology Rule Engine.

Coverage: PASS / FAIL / REVIEW paths for all 6 Rule 6(1) rules,
plus edge-cases (low OCR confidence, no-space units, hyphen date separators,
missing fields, malformed values, and mixed evidence scenarios).
"""

import pytest
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import RuleContext
from app.rules.registry import RuleRegistry
from app.rules.definitions.mrp_rule import MRPRule
from app.rules.definitions.net_quantity_rule import NetQuantityRule
from app.rules.definitions.manufacturer_rule import ManufacturerRule
from app.rules.definitions.date_of_mfg_rule import DateOfMfgRule
from app.rules.definitions.consumer_care_rule import ConsumerCareRule
from app.rules.definitions.country_of_origin_rule import CountryOfOriginRule


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ctx(fields=None, confidences=None, raw="", category="Food & Beverages"):
    """Convenience factory for RuleContext."""
    return RuleContext(
        product_category=category,
        extracted_fields=fields or {},
        field_confidences=confidences or {},
        raw_text=raw,
    )


# ===========================================================================
# MRP Rule  (LMPC-R06-MRP) – Rule 6(1)(e)
# ===========================================================================

class TestMRPRule:
    rule = MRPRule()

    def test_pass_full_compliant_rupee_symbol(self):
        """₹ symbol, MRP label, and 'inclusive of all taxes' → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"mrp": "MRP ₹ 199.00 Inclusive of all taxes"},
            confidences={"mrp": 0.95},
        ))
        assert result.status == ComplianceStatus.PASS
        assert result.confidence >= 0.9
        assert result.evidence["has_mrp_label"] is True
        assert result.evidence["has_tax_inclusive"] is True
        assert result.evidence["price_found"] is not None

    def test_pass_rs_currency_notation(self):
        """Rs. currency notation with incl. abbreviation → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"mrp": "MRP Rs. 49.00 Incl. of all taxes"},
            confidences={"mrp": 0.92},
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_raw_text_only_no_isolated_field(self):
        """No isolated mrp field but compliant text in raw_text → PASS."""
        result = self.rule.evaluate(ctx(
            raw="Maximum Retail Price Rs. 350.00 Inclusive of all taxes"
        ))
        assert result.status == ComplianceStatus.PASS

    def test_fail_missing_tax_inclusive_clause(self):
        """MRP label + price but no 'inclusive of all taxes' → FAIL."""
        result = self.rule.evaluate(ctx(
            fields={"mrp": "MRP Rs. 199.00"},
            confidences={"mrp": 0.90},
        ))
        assert result.status == ComplianceStatus.FAIL
        assert "inclusive of all taxes" in result.explanation.lower()

    def test_fail_no_mrp_declaration_at_all(self):
        """Completely absent MRP → FAIL with HIGH severity."""
        result = self.rule.evaluate(ctx(raw="Just some snack text without any price"))
        assert result.status == ComplianceStatus.FAIL
        assert result.severity == SeverityLevel.HIGH

    def test_fail_tax_clause_without_price(self):
        """Has 'inclusive of all taxes' but no actual currency amount → REVIEW/FAIL (ambiguous)."""
        result = self.rule.evaluate(ctx(
            fields={"mrp": "inclusive of all taxes"},
            confidences={"mrp": 0.85},
        ))
        # No price → neither PASS nor FAIL (ambiguous) → REVIEW or FAIL
        assert result.status in (ComplianceStatus.FAIL, ComplianceStatus.REVIEW)

    def test_review_low_ocr_confidence(self):
        """Field confidence < 0.65 → REVIEW (never auto-FAIL on low OCR)."""
        result = self.rule.evaluate(ctx(
            fields={"mrp": "MRP Rs. 199.00 Incl. of all taxes"},
            confidences={"mrp": 0.50},
        ))
        assert result.status == ComplianceStatus.REVIEW
        assert "confidence" in result.explanation.lower()

    def test_review_confidence_exactly_at_boundary(self):
        """Confidence exactly at 0.65 should NOT trigger the low-confidence review path."""
        result = self.rule.evaluate(ctx(
            fields={"mrp": "MRP Rs. 199.00 Inclusive of all taxes"},
            confidences={"mrp": 0.65},
        ))
        # 0.65 is not < 0.65, so it should pass through to normal evaluation
        assert result.status == ComplianceStatus.PASS

    def test_evidence_contains_price_found(self):
        """Evidence should contain the actual extracted price string."""
        result = self.rule.evaluate(ctx(
            fields={"mrp": "MRP Rs. 79.50 Inclusive of all taxes"},
            confidences={"mrp": 0.91},
        ))
        assert result.status == ComplianceStatus.PASS
        assert result.evidence["price_found"] is not None
        assert "79" in result.evidence["price_found"]


# ===========================================================================
# Net Quantity Rule  (LMPC-R06-NETQTY) – Rule 6(1)(d)
# ===========================================================================

class TestNetQuantityRule:
    rule = NetQuantityRule()

    def test_pass_grams_with_space(self):
        """'500 g' (with space between digit and unit) → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "500 g"},
            confidences={"net_quantity": 0.92},
        ))
        assert result.status == ComplianceStatus.PASS
        assert "500" in result.explanation

    def test_pass_ml_no_space(self):
        """'500ml' (no space — common label format) → PASS (regression fix)."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "500ml"},
            confidences={"net_quantity": 0.91},
        ))
        assert result.status == ComplianceStatus.PASS
        assert result.evidence["metric_match"] is not None

    def test_pass_kg_decimal(self):
        """'1.5 kg' → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "1.5 kg"},
            confidences={"net_quantity": 0.90},
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_ltr_variant(self):
        """'1 ltr' → PASS (litre abbreviation variant)."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "Net Qty: 1 ltr"},
            confidences={"net_quantity": 0.89},
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_pieces_unit(self):
        """'12 pieces' → PASS (count-based commodity)."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "12 pieces"},
            confidences={"net_quantity": 0.88},
        ))
        assert result.status == ComplianceStatus.PASS

    def test_fail_imperial_only_oz(self):
        """'16 oz' with no metric equivalent → FAIL."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "16 oz"},
            confidences={"net_quantity": 0.90},
            raw="Net Weight: 16 oz",
        ))
        assert result.status == ComplianceStatus.FAIL
        assert "non-metric" in result.explanation.lower()

    def test_fail_imperial_lbs(self):
        """'2 lbs' only → FAIL."""
        result = self.rule.evaluate(ctx(
            raw="Weight 2 lbs"
        ))
        assert result.status == ComplianceStatus.FAIL

    def test_fail_no_quantity_declaration(self):
        """No quantity at all → FAIL with HIGH severity."""
        result = self.rule.evaluate(ctx(raw="Organic snack bar. Delicious and crunchy."))
        assert result.status == ComplianceStatus.FAIL
        assert result.severity == SeverityLevel.HIGH

    def test_review_low_ocr_confidence(self):
        """Field confidence < 0.65 with metric value → REVIEW (not FAIL)."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "250 g"},
            confidences={"net_quantity": 0.55},
        ))
        assert result.status == ComplianceStatus.REVIEW

    def test_metric_wins_over_imperial_when_both_present(self):
        """Dual declaration '500g / 17.6 oz' → PASS (metric present)."""
        result = self.rule.evaluate(ctx(
            fields={"net_quantity": "500g / 17.6 oz"},
            confidences={"net_quantity": 0.90},
        ))
        assert result.status == ComplianceStatus.PASS


# ===========================================================================
# Manufacturer Rule  (LMPC-R06-MFG) – Rule 6(1)(a)
# ===========================================================================

class TestManufacturerRule:
    rule = ManufacturerRule()

    def test_pass_name_and_address_with_pincode(self):
        """Full name + address with 6-digit PIN → PASS."""
        result = self.rule.evaluate(ctx(
            fields={
                "manufacturer_name": "Herbal Care India Pvt Ltd",
                "manufacturer_address": "Plot 10, Okhla Phase 3, New Delhi 110020",
            },
            confidences={"manufacturer_name": 0.92, "manufacturer_address": 0.90},
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_keyword_in_raw_text(self):
        """'Manufactured by XYZ' + PIN in raw text → PASS."""
        result = self.rule.evaluate(ctx(
            raw="Manufactured by Sunshine Foods Pvt Ltd, Mumbai 400001. Est. 1985."
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_packed_by_keyword(self):
        """'Packed by' keyword variant → PASS."""
        result = self.rule.evaluate(ctx(
            raw="Packed by: AgriGold Co. Ltd., Pune 411001, Maharashtra."
        ))
        assert result.status == ComplianceStatus.PASS

    def test_review_name_only_no_address(self):
        """Name identified but no address/PIN → REVIEW."""
        result = self.rule.evaluate(ctx(
            fields={"manufacturer_name": "XYZ Foods Ltd"},
            confidences={"manufacturer_name": 0.88},
        ))
        assert result.status == ComplianceStatus.REVIEW
        assert "address" in result.explanation.lower() or "pin" in result.explanation.lower()

    def test_review_low_ocr_confidence(self):
        """Confidence < 0.65 → REVIEW regardless of field content."""
        result = self.rule.evaluate(ctx(
            fields={
                "manufacturer_name": "ABC Foods",
                "manufacturer_address": "123 Main St, Mumbai 400001",
            },
            confidences={"manufacturer_name": 0.55, "manufacturer_address": 0.60},
        ))
        assert result.status == ComplianceStatus.REVIEW

    def test_fail_completely_absent(self):
        """No manufacturer information at all → FAIL with HIGH severity."""
        result = self.rule.evaluate(ctx(
            raw="Premium quality basmati rice. Net weight 1kg."
        ))
        assert result.status == ComplianceStatus.FAIL
        assert result.severity == SeverityLevel.HIGH


# ===========================================================================
# Date of Manufacture Rule  (LMPC-R06-DATE) – Rule 6(1)(c)
# ===========================================================================

class TestDateOfMfgRule:
    rule = DateOfMfgRule()

    def test_pass_numeric_slash_separator(self):
        """'Mfg Date: 04/2026' (slash separator) → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"mfg_date": "Mfg Date: 04/2026"},
            confidences={"mfg_date": 0.91},
            raw="Mfg Date: 04/2026",
        ))
        assert result.status == ComplianceStatus.PASS
        assert result.evidence["date_match"] is not None

    def test_pass_hyphen_separator(self):
        """'Pkd: Jan-2026' (hyphen separator — regression fix) → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"mfg_date": "Pkd: Jan-2026"},
            confidences={"mfg_date": 0.90},
            raw="Pkd: Jan-2026",
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_full_month_name(self):
        """'Manufactured: March 2025' (full month name) → PASS."""
        result = self.rule.evaluate(ctx(
            raw="Manufactured: March 2025 Best Before: March 2027"
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_dom_abbreviation(self):
        """'DOM: 08/2025' — DOM (Date of Manufacture) abbreviation → PASS."""
        result = self.rule.evaluate(ctx(
            raw="DOM: 08/2025"
        ))
        assert result.status == ComplianceStatus.PASS

    def test_review_date_without_qualifier(self):
        """Date number found but no Mfg/Pkd keyword → REVIEW."""
        result = self.rule.evaluate(ctx(
            fields={"mfg_date": "04/2026"},
            confidences={"mfg_date": 0.80},
            raw="04/2026",
        ))
        assert result.status == ComplianceStatus.REVIEW
        assert "qualifier" in result.explanation.lower() or "keyword" in result.explanation.lower() or "confirm" in result.explanation.lower()

    def test_review_low_ocr_confidence(self):
        """Low confidence date field → REVIEW (not auto-FAIL)."""
        result = self.rule.evaluate(ctx(
            fields={"mfg_date": "Mfg Date: 06/2026"},
            confidences={"mfg_date": 0.50},
        ))
        assert result.status == ComplianceStatus.REVIEW

    def test_fail_no_date_at_all(self):
        """No date information → FAIL."""
        result = self.rule.evaluate(ctx(
            raw="Net Wt. 500g, MRP Rs. 99.00 incl. all taxes"
        ))
        assert result.status == ComplianceStatus.FAIL

    def test_fail_empty_context(self):
        """Completely empty context → FAIL."""
        result = self.rule.evaluate(ctx())
        assert result.status == ComplianceStatus.FAIL


# ===========================================================================
# Consumer Care Rule  (LMPC-R06-CARE) – Rule 6(1)(f)
# ===========================================================================

class TestConsumerCareRule:
    rule = ConsumerCareRule()

    def test_pass_keyword_and_email(self):
        """Consumer care keyword + email address → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"consumer_care": "Consumer Care: care@brand.in"},
            confidences={"consumer_care": 0.93},
            raw="Consumer Care: care@brand.in",
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_keyword_and_tollfree_phone(self):
        """Consumer care keyword + toll-free 1800 number → PASS."""
        result = self.rule.evaluate(ctx(
            fields={"consumer_care": "Helpline 1800-112-233"},
            confidences={"consumer_care": 0.91},
            raw="Helpline 1800-112-233",
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_keyword_and_mobile(self):
        """Customer care keyword + Indian mobile number → PASS."""
        result = self.rule.evaluate(ctx(
            raw="Customer Care: 9876543210 | feedback@brand.com"
        ))
        assert result.status == ComplianceStatus.PASS

    def test_review_email_without_keyword(self):
        """Email found but no explicit consumer care keyword → REVIEW."""
        result = self.rule.evaluate(ctx(
            raw="info@company.com"
        ))
        assert result.status == ComplianceStatus.REVIEW

    def test_review_phone_without_keyword(self):
        """Phone number found but no consumer care keyword → REVIEW."""
        result = self.rule.evaluate(ctx(
            raw="Call us: 9123456789"
        ))
        assert result.status == ComplianceStatus.REVIEW

    def test_fail_no_contact_details(self):
        """No email or phone number anywhere → FAIL."""
        result = self.rule.evaluate(ctx(
            raw="Premium quality basmati rice, Net Wt 1 kg, MRP Rs. 120."
        ))
        assert result.status == ComplianceStatus.FAIL

    def test_fail_empty_context(self):
        """Completely empty context → FAIL."""
        result = self.rule.evaluate(ctx())
        assert result.status == ComplianceStatus.FAIL


# ===========================================================================
# Country of Origin Rule  (LMPC-R06-ORIGIN) – Rule 6(1)(g)
# ===========================================================================

class TestCountryOfOriginRule:
    rule = CountryOfOriginRule()

    def test_pass_country_of_origin_label(self):
        """'Country of Origin: India' → PASS with extracted country name."""
        result = self.rule.evaluate(ctx(
            fields={"country_of_origin": "India"},
            confidences={"country_of_origin": 0.95},
            raw="Country of Origin: India",
        ))
        assert result.status == ComplianceStatus.PASS
        assert result.evidence["country_detected"] is not None

    def test_pass_made_in_variant(self):
        """'Made in India' → PASS."""
        result = self.rule.evaluate(ctx(
            raw="Made in India. Best basmati quality."
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_manufactured_in_variant(self):
        """'Manufactured in India' → PASS."""
        result = self.rule.evaluate(ctx(
            raw="Manufactured in India by XYZ Pvt Ltd."
        ))
        assert result.status == ComplianceStatus.PASS

    def test_pass_assembled_in_variant(self):
        """'Assembled in India' → PASS (electronics)."""
        result = self.rule.evaluate(ctx(
            raw="Assembled in India",
            category="Electronics",
        ))
        assert result.status == ComplianceStatus.PASS

    def test_review_low_ocr_confidence(self):
        """Low OCR confidence on country_of_origin field → REVIEW."""
        result = self.rule.evaluate(ctx(
            fields={"country_of_origin": "India"},
            confidences={"country_of_origin": 0.45},
        ))
        assert result.status == ComplianceStatus.REVIEW

    def test_fail_no_origin_declaration(self):
        """No country of origin anywhere → FAIL with HIGH severity."""
        result = self.rule.evaluate(ctx(
            raw="Net Wt 500g. MRP Rs. 99. Consumer Care: 1800123456."
        ))
        assert result.status == ComplianceStatus.FAIL
        assert result.severity == SeverityLevel.HIGH

    def test_fail_empty_context(self):
        """Completely empty context → FAIL."""
        result = self.rule.evaluate(ctx())
        assert result.status == ComplianceStatus.FAIL


# ===========================================================================
# Registry Integration Tests
# ===========================================================================

class TestRuleRegistry:

    def test_all_six_rules_load(self):
        """RuleRegistry must load all 6 active Rule 6(1) rules."""
        registry = RuleRegistry()
        active_rules = registry.list_rules(active_only=True)
        rule_codes = {r.rule_code for r in active_rules}
        assert "LMPC-R06-MRP" in rule_codes
        assert "LMPC-R06-NETQTY" in rule_codes
        assert "LMPC-R06-MFG" in rule_codes
        assert "LMPC-R06-DATE" in rule_codes
        assert "LMPC-R06-CARE" in rule_codes
        assert "LMPC-R06-ORIGIN" in rule_codes
        assert len(active_rules) >= 6

    def test_evaluate_all_returns_six_results(self):
        """evaluate_all() must produce exactly one result per active rule."""
        registry = RuleRegistry()
        full_ctx = RuleContext(
            product_category="Food & Beverages",
            extracted_fields={
                "mrp": "MRP Rs. 99.00 Inclusive of all taxes",
                "net_quantity": "500 g",
                "manufacturer_name": "Test Foods Pvt Ltd",
                "manufacturer_address": "Sector 5, Gurugram 122001",
                "mfg_date": "Mfg Date: 03/2026",
                "consumer_care": "Consumer Care: 1800-123-456",
                "country_of_origin": "India",
            },
            field_confidences={
                "mrp": 0.95,
                "net_quantity": 0.93,
                "manufacturer_name": 0.91,
                "manufacturer_address": 0.90,
                "mfg_date": 0.92,
                "consumer_care": 0.90,
                "country_of_origin": 0.94,
            },
            raw_text=(
                "MRP Rs. 99.00 Inclusive of all taxes. Net Wt. 500 g. "
                "Mfg. by Test Foods Pvt Ltd, Sector 5, Gurugram 122001. "
                "Mfg Date: 03/2026. Consumer Care: 1800-123-456. "
                "Country of Origin: India."
            ),
        )
        results = registry.evaluate_all(full_ctx)
        assert len(results) >= 6
        statuses = [r.status for r in results]
        assert ComplianceStatus.PASS in statuses

    def test_evaluate_all_fully_non_compliant_context(self):
        """A context with no valid declarations must yield at least one FAIL."""
        registry = RuleRegistry()
        empty_ctx = RuleContext(
            product_category="Food & Beverages",
            raw_text="Random label text with no useful declarations.",
        )
        results = registry.evaluate_all(empty_ctx)
        assert len(results) >= 6
        statuses = [r.status for r in results]
        assert ComplianceStatus.FAIL in statuses

    def test_each_result_has_required_fields(self):
        """Every RuleEvaluationResult must carry rule_code, status, explanation, evidence."""
        registry = RuleRegistry()
        results = registry.evaluate_all(RuleContext(product_category="Test"))
        for r in results:
            assert r.rule_code
            assert r.status in list(ComplianceStatus)
            assert isinstance(r.explanation, str) and len(r.explanation) > 0
            assert isinstance(r.evidence, dict)
            assert 0.0 <= r.confidence <= 1.0
