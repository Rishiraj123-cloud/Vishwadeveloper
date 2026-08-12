import fitz  # PyMuPDF
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import io
import os

pdf_path = "Modern_real_estate_property_ALL_FRAMES_contact_sheet.pdf"
output_dir = "frames_pdf"

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
gray = img.convert('L')
pixels = list(gray.getdata())
width, height = img.size

print("Calculating grid using pure Python...")
col_sums = [0]*width
row_sums = [0]*height

# Find non-white pixels
for y in range(height):
    for x in range(width):
        if pixels[y*width + x] < 240:
            col_sums[x] += 1
            row_sums[y] += 1

def get_blocks(sums, min_size=50):
    blocks = []
    in_block = False
    start = 0
    for i, val in enumerate(sums):
        if val > 0 and not in_block:
            in_block = True
            start = i
        elif val == 0 and in_block:
            in_block = False
            if i - start > min_size:
                blocks.append((start, i))
    if in_block:
        if len(sums) - start > min_size:
            blocks.append((start, len(sums)))
    return blocks

x_blocks = get_blocks(col_sums)
y_blocks = get_blocks(row_sums)

print(f"Detected {len(x_blocks)} columns and {len(y_blocks)} rows.")

frame_idx = 1
for r, (y_start, y_end) in enumerate(y_blocks):
    for c, (x_start, x_end) in enumerate(x_blocks):
        if frame_idx == 1:
            fw = x_end - x_start
            fh = y_end - y_start
            
        frame_img = img.crop((x_start, y_start, x_end, y_end))
        # Ensure exact same size for canvas rendering
        frame_img = frame_img.resize((fw, fh), Image.Resampling.LANCZOS)
        
        filename = f"frame_{str(frame_idx).zfill(6)}.jpg"
        filepath = os.path.join(output_dir, filename)
        frame_img.save(filepath, "JPEG", quality=90)
        
        if frame_idx % 24 == 0:
            print(f"Saved {frame_idx} frames...")
            
        frame_idx += 1

print("Done extracting smart frames!")
