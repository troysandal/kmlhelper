# kmlhelper
I use Google Earth to build tracks for adventure rides I do every year.  When creating new tracks from existing ones I find I need lots of helpers that don't exist in Google Earth so I switch to this project, paste in the KML and do various edits here.  I haven't figured out a way yet to add these directly into Google Earth via an extension API which would really help track creation.

* **add distance to name** - Suffix Placemark Names with length of LineStrings, e.g. "Foo (5.4M)"
* **combine strings** - Combines all LineStrings into a single, continuous string.
* **gx to LineString** - Convert gx:track node to KML Linestring, useful when importing GPX files into Google Earth.
* **remove MultiGeometry** - Many KML files I get have a single line string in a MultiGeometry node. Google Earth doesn't expose the singular linestring in it's interface which means I can't extract it in order to get length and altitude from it. This helper removes the multi geometry.
* **reverse path** - So simple, so needed when extending paths as Google Earth only allows extension from the end of a LineString.
* **show On Map** - Display KML in Google Maps.
* **split At Distance** - I use this to split a single, long track, every N miles where N, placed in 2nd KML field, is the distance I can safely go on my motorcycle without running out of fuel.
* **splitAtPoint** - Splits a LineString nearest a given point.  Place split points as lat,long into 2nd KML fiel, e.g. -121.293921, 35.2030

## Adding Google Maps
If you want to enable Google Maps you'll need to add loadmap.js to the root of your project.
```html
var head = document.getElementsByTagName('head')[0];
var script = document.createElement('script');
script.src = 'https://maps.googleapis.com/maps/api/js?key=GOOGLE_MAPS_API_KEY';
script.type = "text/javascript";
head.appendChild(script);
```