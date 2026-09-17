from app.rules.definitions.mrp_rule import MRPRule
from app.rules.definitions.net_quantity_rule import NetQuantityRule
from app.rules.definitions.manufacturer_rule import ManufacturerRule
from app.rules.definitions.date_of_mfg_rule import DateOfMfgRule
from app.rules.definitions.consumer_care_rule import ConsumerCareRule
from app.rules.definitions.country_of_origin_rule import CountryOfOriginRule

ALL_RULES = [
    MRPRule(),
    NetQuantityRule(),
    ManufacturerRule(),
    DateOfMfgRule(),
    ConsumerCareRule(),
    CountryOfOriginRule(),
]

__all__ = [
    "MRPRule",
    "NetQuantityRule",
    "ManufacturerRule",
    "DateOfMfgRule",
    "ConsumerCareRule",
    "CountryOfOriginRule",
    "ALL_RULES",
]
