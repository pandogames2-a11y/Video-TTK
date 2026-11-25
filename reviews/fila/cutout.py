# Cut the sneaker out of the white ad photos (GrabCut seeded by: pure white touching the border = background, dark pixels = shoe).
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
for i in (1, 3):   # photo 2 (back view) is left out: its bright toe sole merges with the white background
    bgr = cv2.imread(f'../tenis_fila/tenis_fila_{i}.jpg')
    f = bgr.astype(np.int16); mx, mn = f.max(2), f.min(2)
    white = (mn > 250) | (((mn > 140) & (mx - mn < 12)) if i == 3 else False)
    lab, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sure_bg = np.isin(lab, list(border))
    m = np.full(mn.shape, cv2.GC_PR_FGD, np.uint8)
    m[(mn > 225) & (mx - mn < 10)] = cv2.GC_PR_BGD
    m[sure_bg] = cv2.GC_BGD
    m[mx < 110] = cv2.GC_FGD
    bm, fm = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(bgr, m, None, bm, fm, 6, cv2.GC_INIT_WITH_MASK)
    fg = (m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)
    lab, n = ndimage.label(fg); sizes = ndimage.sum(fg, lab, range(1, n + 1)); fg = lab == (1 + int(np.argmax(sizes)))
    fg = ndimage.binary_fill_holes(ndimage.binary_closing(fg, iterations=2))
    a = cv2.GaussianBlur(fg.astype(np.float32), (0, 0), 1.0)
    rgba = np.dstack([bgr[..., ::-1], (a * 255).astype(np.uint8)])
    ys, xs = np.where(a > 0.05)
    Image.fromarray(rgba, 'RGBA').crop((max(0, xs.min() - 4), max(0, ys.min() - 4), xs.max() + 5, ys.max() + 5)).save(f'tenis_{i}.png')
    print(i, xs.min(), ys.min(), xs.max(), ys.max())
