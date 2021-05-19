# Buzz: an interactive tool for feature space exploration

High-dimensional datasets are often squeezed through an algorithm like PCA, UMAP, T-SNE or others to visualize it
on a 2D scatterplot. These dimensionality reduction procedures let us expose heterogeneity in the dataset of which we would
like to know the source. Buzz is an interactive tool that lets you explore the low dimensional embedding of your dataset 
so you can interpret it.

## Features
**Brushing** Select groups of points and compare their feature distributions using histograms.

**Coloring** Easily color your scatterplot according to feature values.

**WebGL** Visualize embeddings of 10,000s of datapoints thanks to GPU acceleration.

**lightweight** Buzz is entirely written in JavaScript making it a nifty and lightweight tool.

**CSV** Compatible with any language. Just export to CSV and import in Buzz. Thanks to Papaparse, loading times are decent.

## Standing on the shoulders of giants
* D3.js, for visualization
* D3FC, and specifically its WebGL component
* Alpine.js, for user control
* TailwindCSS, for styling
* NW.js, for packaging into a desktop app
* Papaparse, for fast CSV parsing

## Development

### Setup environment
`npm install`

### Setup servers
`npm run dev:nw`