from setuptools import setup

setup(
    name="api",
    version="0.0.1",
    packages=["api"],
    install_requires=[
        "flask",
        "Pillow",
        "numpy"
    ]
)