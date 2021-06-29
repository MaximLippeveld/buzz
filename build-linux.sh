#/bin/sh

[ -d "./buzz" ] && rm -r "./buzz"

# build tailwind and snowpack
npm run build

# nwjs
wget https://dl.nwjs.io/v0.54.0/nwjs-v0.54.0-linux-x64.tar.gz
tar xzf nwjs-v0.54.0-linux-x64.tar.gz
mv nwjs-v0.54.0-linux-x64/* buzz/
mv buzz/nw buzz/buzz

# compress
VERSION=$(grep version package.json | sed 's/[^:]\+:[^0-9]\+\([^"]\+\).*/\1/')
mv buzz buzz-$VERSION
tar -czf buzz-$VERSION.tar.gz buzz-$VERSION/

# clean up
rm -r buzz-$VERSION nwjs-v*
