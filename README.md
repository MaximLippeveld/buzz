# Buzz: an interactive tool for feature space exploration

High-dimensional datasets are often squeezed through dimensionality reduction
algorithms like PCA, UMAP, T-SNE or others to visualize them on a 2D scatterplot. 
These procedures let us expose heterogeneity in datasets. However, we would
like to know the source of this heterogeneity as well. This is where Buzz can help.

Buzz is an interactive tool that lets you explore low dimensional embeddings
of your dataset by:
- coloring it according to features you provide,
- and selecting populations between which you can compare feature distributions.

## Features
**Brushing** Select groups of points and compare their feature distributions using histograms.

**Coloring** Easily color your scatterplot according to feature values.

**WebGL** Visualize embeddings of 10,000s of datapoints thanks to GPU acceleration.

**lightweight** Buzz is entirely written in JavaScript making it a snappy and lightweight tool.

**CSV** Compatible with any language. Just export to CSV and import in Buzz. 
Thanks to Papaparse, loading times are decent. Currently, a rewrite using *Arquero* is underway.

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

**Paparse** Currently, only CSV input is supported. Papaparse is the most performant
JavaScript library for loading CSV files.

**Arquero** This is a fast JavaScript library for loading array-backed data tables.
Buzz is being rewritten to use Arquero under the hood for faster data processing, and
to allow Apache Arrow input formats.

## Buzz roadmap

Buzz is in alpha-phase. The initial features and aim of the app are laid out, and 
a first working prototype is implemented.

The next milestone is the beta-phase. The following needs to 
be implemented to reach this phase:
- Buzz needs to be fully backed by Arquero, allowing for input in CSV 
  or Apache Arrow format.
- Users need to be able to load their own datasets with a simple file selector.
- New users should be given the option to load a demo dataset.

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

