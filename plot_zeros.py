"""Plot Bessel function zeros: x-axis = zero value, y-axis = m, color = n.

Interactive features:
  - Vertical crosshair line follows the cursor
  - Hovering a point shows an annotation with m and n values
"""

from scipy.special import jn_zeros
import matplotlib.pyplot as plt
import numpy as np

M_MAX_ORDER = 16
N_MAX_ORDER = 32

fig, ax = plt.subplots(figsize=(12, 7))

# Collect all points so we can do a single scatter (needed for pick events)
xs, ys, ns = [], [], []
for m in range(M_MAX_ORDER):
    zs = jn_zeros(m, N_MAX_ORDER)
    for n_idx in range(N_MAX_ORDER):
        xs.append(zs[n_idx])
        ys.append(m)
        ns.append(n_idx + 1)

sc = ax.scatter(xs, ys, c=ns, cmap="viridis", vmin=1, vmax=M_MAX_ORDER,
                s=30, edgecolors="none", picker=True)

# Colorbar
sm = plt.cm.ScalarMappable(cmap="viridis", norm=plt.Normalize(vmin=1, vmax=N_MAX_ORDER))
cbar = fig.colorbar(sm, ax=ax)
cbar.set_label("n (zero index)")

ax.set_xlabel("Zero value")
ax.set_ylabel("m (Bessel order)")
ax.set_title("Zeros of Bessel functions $J_m$")
ax.set_yticks(range(M_MAX_ORDER))

# --- Interactive: vertical crosshair line ---
vline = ax.axvline(x=0, color="gray", linewidth=0.5, linestyle="--", visible=False)

def on_mouse_move(event):
    if event.inaxes == ax:
        vline.set_xdata([event.xdata])
        vline.set_visible(True)
    else:
        vline.set_visible(False)
    fig.canvas.draw_idle()

fig.canvas.mpl_connect("motion_notify_event", on_mouse_move)

# --- Interactive: hover annotation ---
annot = ax.annotate("", xy=(0, 0), xytext=(10, 10),
                    textcoords="offset points",
                    bbox=dict(boxstyle="round,pad=0.3", fc="wheat", alpha=0.9),
                    fontsize=9, visible=False)

def on_hover(event):
    if event.inaxes == ax:
        cont, ind = sc.contains(event)
        if cont:
            idx = ind["ind"][0]
            annot.xy = (xs[idx], ys[idx])
            annot.set_text(f"m={ys[idx]}, n={ns[idx]}\nzero={xs[idx]:.4f}")
            annot.set_visible(True)
        else:
            annot.set_visible(False)
    else:
        annot.set_visible(False)
    fig.canvas.draw_idle()

fig.canvas.mpl_connect("motion_notify_event", on_hover)

plt.tight_layout()
plt.show()
