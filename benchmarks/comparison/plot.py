"""Plot the expanded benchmark matrix without importing or running either UI library."""

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import LogLocator, FuncFormatter

parser = argparse.ArgumentParser()
parser.add_argument("results", type=Path)
parser.add_argument("--output", type=Path, default=Path(__file__).with_name("comparison"))
args = parser.parse_args()
report = json.loads(args.results.read_text())
rows = report["summary"]
series = [
    ("before", "Before DOM-order fix", "#9a9ca4", "o", -0.24),
    ("current", "Current FrameKit", "#1766b5", "s", -0.08),
    ("reactRoot", "React root update", "#be651e", "^", 0.08),
    ("reactLocal", "React local state", "#7d409a", "D", 0.24),
]
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "svg.fonttype": "none"})
fig, ax = plt.subplots(figsize=(14, max(12, len(rows) * 0.5 + 1.5)))
all_ratios = []
for key, label, color, marker, offset in series:
    ratios = [row[key]["medianMs"] / row["reactRoot"]["medianMs"] for row in rows]
    all_ratios.extend(ratios)
    ax.scatter(ratios, [index + offset for index in range(len(rows))], color=color,
               marker=marker, s=40, label=label, zorder=3)
ax.set_xscale("log")
ax.axvline(1, color="#40434a", linewidth=1)
ax.set_yticks(range(len(rows)), [row["label"] for row in rows])
ax.invert_yaxis()
ax.set_xlim(min(0.035, min(all_ratios) * 0.75), max(3, max(all_ratios) * 1.25))
ax.xaxis.set_major_locator(LogLocator(base=10, subs=(1, 3)))
ax.xaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value:g}×"))
ax.grid(axis="x", color="#e2e3e7", linewidth=0.7)
for index in range(len(rows)):
    if index % 2 == 0:
        ax.axhspan(index - 0.48, index + 0.48, color="#f6f7f9", zorder=0)
for spine in ax.spines.values():
    spine.set_visible(False)
ax.tick_params(axis="both", length=0, pad=7)
ax.set_xlabel("Time relative to React root update (1×) · logarithmic scale · lower is better", labelpad=14)
ax.legend(loc="lower left", bbox_to_anchor=(0, 1.015), ncol=2, frameon=False)
fig.suptitle("FrameKit / React: the expanded performance profile", x=0.03, ha="left", y=0.99, fontsize=17)
fig.text(0.03, 0.945, f"{report['environment']['cpu']} · production Chromium · React {report['environment']['reactVersion']} · medians of {report['methodology']['rounds']} rounds", color="#555a62")
fig.text(0.03, 0.025, "Relative times compare the same scenario only. Both front and tail layout edits are measured; see results.md.\nNative/synthetic hover, local-state bailouts, and immediate layout contracts differ; see results.md.", color="#555a62", fontsize=9)
fig.subplots_adjust(left=0.34, right=0.98, top=0.87, bottom=0.1)
args.output.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(args.output.with_suffix(".png"), dpi=160, facecolor="white")
fig.savefig(args.output.with_suffix(".svg"), facecolor="white")
svg_path = args.output.with_suffix(".svg")
svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text().splitlines()) + "\n")
print(args.output.with_suffix(".png"))
