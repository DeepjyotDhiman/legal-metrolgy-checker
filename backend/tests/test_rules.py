from app.models.enums import ComplianceStatus
from app.rules.base import RuleContext
from app.rules.definitions.mrp_rule import MRPRule
from app.rules.definitions.net_quantity_rule import NetQuantityRule
from app.rules.definitions.manufacturer_rule import ManufacturerRule
from app.rules.definitions.date_of_mfg_rule import DateOfMfgRule
from app.rules.definitions.consumer_care_rule import ConsumerCareRule
from app.rules.definitions.country_of_origin_rule import CountryOfOriginRule


def test_mrp_rule_pass():
    rule = MRPRule()
    ctx = RuleContext(
        product_category="Food",
        extracted_fields={"mrp": "MRP Rs. 199.00 (Inclusive of all taxes)"},
        field_confidences={"mrp": 0.95},
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.PASS
    assert result.confidence >= 0.9


def test_mrp_rule_fail_missing_taxes():
    rule = MRPRule()
    ctx = RuleContext(
        product_category="Food",
        extracted_fields={"mrp": "MRP Rs. 199.00"},
        field_confidences={"mrp": 0.90},
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.FAIL
    assert "inclusive of all taxes" in result.explanation


def test_mrp_rule_fail_missing_all():
    rule = MRPRule()
    ctx = RuleContext(product_category="Food", raw_text="Just some snack text")
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.FAIL


def test_net_quantity_metric_pass():
    rule = NetQuantityRule()
    ctx = RuleContext(
        product_category="Grocery",
        extracted_fields={"net_quantity": "500 g"},
        field_confidences={"net_quantity": 0.92},
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.PASS
    assert "500 g" in result.explanation


def test_net_quantity_imperial_only_fail():
    rule = NetQuantityRule()
    ctx = RuleContext(
        product_category="Imported",
        extracted_fields={"net_quantity": "16 oz"},
        field_confidences={"net_quantity": 0.90},
        raw_text="Net Weight: 16 oz",
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.FAIL
    assert "non-metric" in result.explanation


def test_manufacturer_rule_pass():
    rule = ManufacturerRule()
    ctx = RuleContext(
        product_category="Cosmetics",
        extracted_fields={
            "manufacturer_name": "Herbal Care India Pvt Ltd",
            "manufacturer_address": "Plot 10, Okhla Phase 3, New Delhi 110020",
        },
        field_confidences={"manufacturer_name": 0.92, "manufacturer_address": 0.90},
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.PASS


def test_date_of_mfg_rule_pass():
    rule = DateOfMfgRule()
    ctx = RuleContext(
        product_category="Food",
        extracted_fields={"mfg_date": "Mfg Date: 04/2026"},
        field_confidences={"mfg_date": 0.91},
        raw_text="Mfg Date: 04/2026",
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.PASS


def test_consumer_care_rule_pass():
    rule = ConsumerCareRule()
    ctx = RuleContext(
        product_category="Food",
        extracted_fields={"consumer_care": "For feedback contact care@company.in or 1800112233"},
        field_confidences={"consumer_care": 0.93},
        raw_text="For feedback contact care@company.in or 1800112233",
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.PASS


def test_country_of_origin_rule_pass():
    rule = CountryOfOriginRule()
    ctx = RuleContext(
        product_category="Electronics",
        extracted_fields={"country_of_origin": "India"},
        field_confidences={"country_of_origin": 0.95},
        raw_text="Country of Origin: India",
    )
    result = rule.evaluate(ctx)
    assert result.status == ComplianceStatus.PASS
