from api import main

def test_should_load_multipage_tiff():
    path = "api/tests/assets/multipage.tiff"
    data = main.load_image(path)
    for i, d in enumerate(data):
        assert d is not None, "Value was None, should be data (channel %d)" % i
