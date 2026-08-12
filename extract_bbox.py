import fitz  # PyMuPDF
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = None
import io
import os

pdf_path = "Modern_real_estate_property_ALL_FRAMES_contact_sheet.pdf"
output_dir = "frames_pdf"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print(f"Opening PDF: {pdf_path}")
doc = fitz.open(pdf_path)

print("Rendering PDF page to image at high resolution...")
page = doc.load_page(0)
zoom_x = 8.0
zoom_y = 8.0
mat = fitz.Matrix(zoom_x, zoom_y)
pix = page.get_pixmap(matrix=mat)

print(f"Rendered image size: {pix.width}x{pix.height}")

img_data = pix.tobytes("jpeg")
img = Image.open(io.BytesIO(img_data)).convert('RGB')

# Find content bbox (ignoring white margins)
inv = ImageOps.invert(img)
bbox = inv.getbbox()
print(f"Content bbox: {bbox}")

if bbox:
    content = img.crop(bbox)
else:
    content = img

cols = 10
rows = 24
frame_width = content.width / cols
frame_height = content.height / rows

print(f"Cropping grid. Frame size: {frame_width}x{frame_height}")

frame_idx = 1
for r in range(rows):
    for c in range(cols):
        left = c * frame_width
        top = r * frame_height
        right = (c + 1) * frame_width
        bottom = (r + 1) * frame_height
        
        frame_img = content.crop((left, top, right, bottom))
        
        filename = f"frame_{str(frame_idx).zfill(6)}.jpg"
        filepath = os.path.join(output_dir, filename)
        frame_img.save(filepath, "JPEG", quality=85)
        
        if frame_idx % 24 == 0:
            print(f"Saved {frame_idx} frames...")
            
        frame_idx += 1

print("Done extracting properly cropped frames!")
