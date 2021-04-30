from flask import Flask, request, stream_with_context, Response
from flask_caching import Cache
from flask_cors import CORS
from io import BytesIO
from PIL import Image 
import numpy
import base64
import pandas
from scipy.spatial.distance import jensenshannon
import logging
from more_itertools import chunked
import json
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

config = {
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": numpy.iinfo(numpy.uint16).max
}

app = Flask(__name__)
app.config.from_mapping(config)
cache = Cache(app)
CORS(app)

# path = "VIB/Vulcan/vib-vulcan-metadata/representations/umap/Slava_PBMC/data.feather"
path = "weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/c8ba196c-0b22-4489-9f9c-1242f68dd7a5.feather"
df = pandas.read_feather(path)
cache.set("data", df) 

@app.route("/feather/<path:path>")
def load_feather(path):
    def generate():
        df = cache.get("data")
        CHUNK_SIZE = 50000
        index_chunks = chunked(range(len(df)), CHUNK_SIZE)
        for ii in index_chunks:
            yield json.dumps(dict(data=df.iloc[ii].filter(regex="meta|dim").to_dict(orient="records")))

    return Response(generate(), content_type="application/json")

@app.route("/feather/<path:path>/meta")
def load_feather_meta(path):
    df = cache.get("data")
    return dict(total=len(df))

@app.route("/features/list")
def get_features():
    df = cache.get("data")
    return dict(
        features=df.filter(regex="feat").columns.tolist(),
        meta=df.filter(regex="meta").columns.tolist(),
    )

@app.route("/features/get/<string:feature>")
def get_feature(feature):
    return dict(data=cache.get("data")[feature].tolist())

@app.route("/features/js-divergence", methods=["POST"])
def get_js_divergence_between_populations():
    populations = numpy.array(request.json["populations"])
    popids = request.json["selected"]

    def to_prob(vec1, vec2):
        histP = numpy.histogram(vec1, bins=1000)
        P = histP[0]/histP[0].sum()
        histQ = numpy.histogram(vec2, bins=histP[1])
        Q = histQ[0]/histQ[0].sum()
        return P, Q 

    df = cache.get("data")
    feat_df = df.filter(regex="feat")
    js = []
    for col in feat_df:
        vec1 = feat_df.iloc[numpy.nonzero(populations==popids[0])][col].values 
        vec2 = feat_df.iloc[numpy.nonzero(populations==popids[1])][col].values 
        P, Q = to_prob(vec1, vec2)
        js.append(jensenshannon(P, Q))

    sorted_idx = numpy.argsort(js)[::-1]
    return dict(data=feat_df.columns[sorted_idx[:10]].tolist())


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
    return dict(data=data_uri, width=img.width, height=img.height, channels=len(data_uri))
