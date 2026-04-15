#!/usr/bin/env bash
# Download Cytoscape + Dagre dependencies for offline use.
# After running this, graph.html will still use CDN by default,
# but you can switch the <script> tags in graph.html to /lib/ if desired.

set -e

mkdir -p web/static/lib
cd web/static/lib

curl -fsSL -o cytoscape.min.js https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js
curl -fsSL -o dagre.min.js https://unpkg.com/dagre@0.8.5/dist/dagre.min.js
curl -fsSL -o cytoscape-dagre.js https://unpkg.com/cytoscape-dagre@2.5.0/cytoscape-dagre.js

echo "Graph libraries downloaded to web/static/lib/"
