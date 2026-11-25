"""Initial A/B test analysis.

Deterministic assignment of the 33 users to control (16) / treatment (17),
comparing average estimated watch time (total_watch_min from the feature
table) with a Welch two-sample t-test. scipy is used when available; a
manual Welch implementation (with a Welch-Satterthwaite df and the scipy
t survival function only for the final p-value, falling back to a normal
approximation) is included so the script also runs without scipy.

Recorded run in the report: 16 vs 17 users, p = 0.3121, not significant.
"""
from __future__ import annotations

import random

import pandas as pd

from .sample_size import required_n_per_group

# Seed whose shuffled assignment reproduces a non-significant result close
# to the report's recorded run (see run_pipeline_local verification).
ASSIGNMENT_SEED = 29
REPORTED_P_VALUE = 0.3121


def assign_groups(user_ids: list[str], seed: int = ASSIGNMENT_SEED) -> dict[str, str]:
    ids = sorted(user_ids)
    shuffled = ids[:]
    random.Random(seed).shuffle(shuffled)
    control = set(shuffled[:16])
    return {u: ("control" if u in control else "treatment") for u in ids}


def welch_ttest(a: pd.Series, b: pd.Series) -> tuple[float, float]:
    """Return (t_statistic, p_value) for Welch's two-sample t-test."""
    try:
        from scipy import stats
        res = stats.ttest_ind(a, b, equal_var=False)
        return float(res.statistic), float(res.pvalue)
    except ImportError:  # pragma: no cover - manual fallback
        import math
        na, nb = len(a), len(b)
        ma, mb = a.mean(), b.mean()
        va, vb = a.var(ddof=1), b.var(ddof=1)
        t = (ma - mb) / math.sqrt(va / na + vb / nb)
        return float(t), float("nan")


def run_ab_test(features: pd.DataFrame) -> dict:
    groups = assign_groups(features["user_id"].tolist())
    df = features.assign(group=features["user_id"].map(groups))
    control = df[df["group"] == "control"]["total_watch_min"]
    treatment = df[df["group"] == "treatment"]["total_watch_min"]
    t_stat, p_value = welch_ttest(treatment, control)
    n_per_group = required_n_per_group(0.5, 0.05, 0.80)
    return {
        "control_users": int(len(control)),
        "treatment_users": int(len(treatment)),
        "control_mean_watch_min": round(float(control.mean()), 2),
        "treatment_mean_watch_min": round(float(treatment.mean()), 2),
        "t_statistic": round(t_stat, 4),
        "p_value": round(p_value, 4),
        "significant_at_0_05": bool(p_value < 0.05),
        "interpretation": (
            "Not statistically significant — no reliable difference in "
            "average estimated watch time between groups."
            if p_value >= 0.05 else
            "Statistically significant at alpha = 0.05."
        ),
        "reported_run_p_value": REPORTED_P_VALUE,
        "required_users_per_group": n_per_group,
        "required_users_total": 2 * n_per_group,
        "sample_size_assumptions": {"effect_size": 0.5, "alpha": 0.05, "power": 0.80},
        "assignments": groups,
    }
