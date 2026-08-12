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
# Use a zoom factor to get a high-res image.
# If original is around A4 size, zoom=8 should give a large enough image.
zoom_x = 8.0
zoom_y = 8.0
mat = fitz.Matrix(zoom_x, zoom_y)
pix = page.get_pixmap(matrix=mat)

print(f"Rendered image size: {pix.width}x{pix.height}")

# Convert PyMuPDF pixmap to Pillow Image
img_data = pix.tobytes("jpeg")
img = Image.open(io.BytesIO(img_data))

# The grid is 10 columns by 24 rows
cols = 10
rows = 24

frame_width = img.width / cols
frame_height = img.height / rows

print(f"Cropping into {cols}x{rows} grid (frame size: {frame_width}x{frame_height})")

frame_idx = 1
for r in range(rows):
    for c in range(cols):
        left = c * frame_width
        top = r * frame_height
        right = (c + 1) * frame_width
        bottom = (r + 1) * frame_height
        
        # Crop the frame
        frame_img = img.crop((left, top, right, bottom))
        
        # Save the frame
        filename = f"frame_{str(frame_idx).zfill(6)}.jpg"
        filepath = os.path.join(output_dir, filename)
        frame_img.save(filepath, "JPEG", quality=90)
        
        if frame_idx % 24 == 0:
            print(f"Saved {frame_idx}/{cols*rows} frames...")
            
        frame_idx += 1

print("Done extracting frames!")
