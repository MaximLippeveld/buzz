from flask import Flask
from io import BytesIO
from PIL import Image 
import numpy
import base64

app = Flask(__name__)

@app.after_request
def after_request(response):
    header = response.headers
    header['Access-Control-Allow-Origin'] = '*'
    return response

@app.route("/image/<path:path>")
def load_image(path):
    """
    Encodes a multipage tiff as an array of base64 encoded JPEGs
    """

    # Load tiff with PIL
    with Image.open(path) as img:
        r = range(img.n_frames)
        data_uri = []

        for i in r:
            img.seek(i)
            arr = numpy.array(img)
            arr = ((numpy.iinfo(numpy.uint8).max-1)*(arr - numpy.min(arr))/numpy.ptp(arr)).astype(numpy.uint8)

            output = BytesIO()
            Image.fromarray(arr, mode="L").save(output, format="JPEG")
            im_data = output.getvalue()
            image_data = base64.b64encode(im_data)
            if not isinstance(image_data, str):
                # Python 3, decode from bytes to string
                image_data = image_data.decode()
            data_uri.append('data:image/jpg;base64,' + image_data)
    return dict(data=data_uri)
