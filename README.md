# Buzz: an interactive tool for feature space exploration

![Demonstration](demo.gif)

High-dimensional datasets are often squeezed through dimensionality reduction
algorithms like PCA, UMAP, T-SNE or others to visualize them on a 2D scatterplot. 
These procedures let us expose heterogeneity in datasets. However, we would
like to know the source of this heterogeneity as well. This is where Buzz can help.

Buzz is an interactive tool that lets you explore low dimensional embeddings
of your dataset by:
- coloring it according to features you provide,
- and selecting populations between which you can compare feature distributions.

See [USAGE](USAGE.md) for instructions on how to use Buzz.

## Features
**Brushing** Select groups of points and compare their feature distributions using histograms.

**Coloring** Easily color your scatterplot according to feature values.

**WebGL** Visualize embeddings of 10,000s of datapoints thanks to GPU acceleration.

**lightweight** Buzz is entirely written in JavaScript making it a snappy and lightweight tool.

**Arquero** Compatible with any language thanks to Arquero and Apache Arrow. Just export 
your dataset to an Arrow-file and import in Buzz. See [USAGE](USAGE.md) for more info
on how to import your dataset.

## Building blocks of Buzz

Buzz uses a number of open-source projects for its functionalities.

**D3.js** The feature histograms are plotted using D3.js. 

**D3FC** This is a wrapper library around D3.js. In this project we use d3fc-webgl,
which is a component of D3FC that makes it easy to create scatterplots in WebGL.

Brushing is also possible thanks to D3FC.

**Alpine.js** Application controls are implemented with Alpine.js. It is a lightweight
framework with easy DOM manipulation, allowing for fast development of interactive
applications.

**TailwindCSS** A utility-first CSS framework that lets you easily add style to
HTML documents.

**NW.js** This library lets you package JavaScript apps into cross-platform, 
standalone desktop apps with access to native system APIs. In the near future, Buzz will
be available as a NW.js desktop app.

**Arquero** This is a fast JavaScript library for loading array-backed data tables.
Buzz is being rewritten to use Arquero under the hood for faster data processing, and
to allow Apache Arrow input formats.

## Buzz roadmap

Buzz is in beta-phase. The initial features and aim of the app are laid out, and 
a first functional version of the app is implemented.

In the long term, Buzz functionality needs to be expanded. However, the focus
should always remain on the *exploration* of low-dimensional embeddings on a local
machine. 

The aim is not, for instance, to implement dimensionality reduction
techniques within Buzz. It is also not the goal to the make Buzz part of data
processing pipelines run on HPC clusters. Other methods are more suitable for 
such goals.

Good expansions could be to allow Buzz to automatically suggest the most 
interesting features when comparing populations, or to let users export a 
report about their embedding.

Buzz could also be integrated in a Napari plugin to allow for exploration of
imaging datasets. Clicking on a point in the scatterplot could then open the 
corresponding image in Napari, letting the user go back to the original data.

