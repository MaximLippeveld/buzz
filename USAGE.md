# Installation

1. [Download](https://github.com/MaximLippeveld/buzz/releases) the latest release
1. Untar it `tar xzf buzz-X.X.X.tar.gz`
1. Change dir to buzz-X.X.X.tar.gz
1. Run `buzz`

# Preparing a dataset for Buzz

Datasets should be exported to an Apache Arrow compatible format, such as Feather.

When using Pandas in Python, a DataFrame can be exported to a Feather file by running:
```
df.to_feather('output.feather', compression='uncompressed')
```

The dataframe should contain a column named `index`, which should be a column
running from 0 to the length of the dataframe.

Columns can be of two types:
- feature, the column name should have prefix `feat_`,
- or meta data, the column name should have prefix `meta_`.

