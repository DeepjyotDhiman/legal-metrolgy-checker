from typing import Dict, List, Optional
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult
from app.rules.definitions import ALL_RULES


class RuleRegistry:
    """Central registry and execution engine for Legal Metrology compliance rules."""

    def __init__(self):
        self._rules: Dict[str, BaseRule] = {}
        for rule in ALL_RULES:
            self.register(rule)

    def register(self, rule: BaseRule) -> None:
        """Register a new or updated compliance rule."""
        self._rules[rule.rule_code] = rule

    def unregister(self, rule_code: str) -> Optional[BaseRule]:
        """Remove a rule from the active registry."""
        return self._rules.pop(rule_code, None)

    def get_rule(self, rule_code: str) -> Optional[BaseRule]:
        """Retrieve a rule by its rule_code identifier."""
        return self._rules.get(rule_code)

    def list_rules(self, active_only: bool = True) -> List[BaseRule]:
        """Return list of all registered rules."""
        if active_only:
            return [r for r in self._rules.values() if r.active]
        return list(self._rules.values())

    def evaluate_all(self, context: RuleContext) -> List[RuleEvaluationResult]:
        """Execute all active rules against the given package declaration context."""
        results: List[RuleEvaluationResult] = []
        for rule in self.list_rules(active_only=True):
            result = rule.evaluate(context)
            results.append(result)
        return results


# Global singleton registry instance
rule_registry = RuleRegistry()
