"""Print a photo as a 4x6 label from the command line: python print_photo.py selfie.jpg"""

import sys

from PIL import Image, ImageOps

from printer import Printer, label

Printer().send(label(ImageOps.exif_transpose(Image.open(sys.argv[1]))))
print("sent")
