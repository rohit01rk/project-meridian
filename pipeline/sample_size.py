"""Sample-size estimation for a two-sample t-test.

Iterative non-central-t power calculation (no statsmodels dependency):
finds the smallest per-group n reaching the requested power. For
effect_size=0.5, alpha=0.05, power=0.80 this returns exactly 64 per
group (128 total) — the figure recorded in the project report.
"""
from __future__ import annotations

import math


def required_n_per_group(effect_size: float = 0.5, alpha: float = 0.05, power: float = 0.80) -> int:
    from scipy import stats

    n = 2
    while n < 100000:
        df = 2 * n - 2
        ncp = effect_size * math.sqrt(n / 2.0)
        crit = stats.t.ppf(1 - alpha / 2, df)
        achieved = 1 - stats.nct.cdf(crit, df, ncp) + stats.nct.cdf(-crit, df, ncp)
        if achieved >= power:
            return n
        n += 1
    raise RuntimeError("sample size search did not converge")


if __name__ == "__main__":
    n = required_n_per_group()
    print(f"required per group: {n}; total: {2 * n}")
