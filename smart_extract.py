import fitz  # PyMuPDF
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import io
import os
import numpy as np

pdf_path = "Modern_real_estate_property_ALL_FRAMES_contact_sheet.pdf"
output_dir = "frames_pdf_smart"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print(f"Opening PDF: {pdf_path}")
doc = fitz.open(pdf_path)

# Render the first page at high resolution
print("Rendering PDF page to image at high resolution...")
page = doc.load_page(0)
zoom_x = 8.0
zoom_y = 8.0
mat = fitz.Matrix(zoom_x, zoom_y)
pix = page.get_pixmap(matrix=mat)

print(f"Rendered image size: {pix.width}x{pix.height}")

# Convert PyMuPDF pixmap to Pillow Image
img_data = pix.tobytes("jpeg")
img = Image.open(io.BytesIO(img_data)).convert('RGB')

print("Converting to numpy array for smart cropping...")
arr = np.array(img.convert('L'))

# Define non-white as pixels < 240
# Contact sheet background is usually pure white (255)
mask = arr < 240

# Sum along rows and cols
col_sums = mask.sum(axis=0) # shape (width,)
row_sums = mask.sum(axis=1) # shape (height,)

def get_blocks(sums, min_size=50):
    # Find contiguous regions where sums > 0
    is_content = sums > 0
    # Add false at both ends to find edges
    padded = np.insert(is_content, [0, len(is_content)], False)
    diff = np.diff(padded.astype(int))
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    
    blocks = []
    for s, e in zip(starts, ends):
        if e - s > min_size:
            blocks.append((s, e))
    return blocks

x_blocks = get_blocks(col_sums)
y_blocks = get_blocks(row_sums)

print(f"Detected {len(x_blocks)} columns and {len(y_blocks)} rows.")

if len(x_blocks) == 0 or len(y_blocks) == 0:
    print("Failed to detect grid. Defaulting to naive grid split.")
    # naive split logic here if needed...
    exit()

frame_idx = 1
for r, (y_start, y_end) in enumerate(y_blocks):
    for c, (x_start, x_end) in enumerate(x_blocks):
        # We enforce exactly the same dimensions for all frames 
        # based on the first frame to avoid any tiny size discrepancies
        if frame_idx == 1:
            fw = x_end - x_start
            fh = y_end - y_start
            
        # Optional: just use exact detected bounds per frame
        frame_img = img.crop((x_start, y_start, x_end, y_end))
        # Ensure it's exactly the same size for canvas rendering
        frame_img = frame_img.resize((fw, fh), Image.Resampling.LANCZOS)
        
        filename = f"frame_{str(frame_idx).zfill(6)}.jpg"
        filepath = os.path.join(output_dir, filename)
        frame_img.save(filepath, "JPEG", quality=90)
        
        if frame_idx % 24 == 0:
            print(f"Saved {frame_idx} frames...")
            
        frame_idx += 1

print("Done extracting smart frames!")
