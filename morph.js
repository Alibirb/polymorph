/**
	Copyright 2015 Daniel Piros/WriterOfAlicrow
	
	This file is part of Polymorph

	Polymorph is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Polymorph is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Polymorph.  If not, see <http://www.gnu.org/licenses/>.
*/

var template = Snap("#template_svg");
var result = Snap("#result");
var base_template;
var cat_template;
var template_groups;
var loaded;
var result_elements;
var furriness, antifurriness;


function convertToAbsolute(path){
	var x0,y0,x1,y1,x2,y2,segs = path.pathSegList;
	for (var x=0,y=0,i=0,len=segs.numberOfItems;i<len;++i){
		var seg = segs.getItem(i), c=seg.pathSegTypeAsLetter;
		if (/[MLHVCSQTA]/.test(c)){
			if ('x' in seg) x=seg.x;
			if ('y' in seg) y=seg.y;
		}else{
			if ('x1' in seg) x1=x+seg.x1;
			if ('x2' in seg) x2=x+seg.x2;
			if ('y1' in seg) y1=y+seg.y1;
			if ('y2' in seg) y2=y+seg.y2;
			if ('x'  in seg) x+=seg.x;
			if ('y'  in seg) y+=seg.y;
			switch(c){
				case 'm': segs.replaceItem(path.createSVGPathSegMovetoAbs(x,y),i);                   break;
				case 'l': segs.replaceItem(path.createSVGPathSegLinetoAbs(x,y),i);                   break;
				case 'h': segs.replaceItem(path.createSVGPathSegLinetoHorizontalAbs(x),i);           break;
				case 'v': segs.replaceItem(path.createSVGPathSegLinetoVerticalAbs(y),i);             break;
				case 'c': segs.replaceItem(path.createSVGPathSegCurvetoCubicAbs(x,y,x1,y1,x2,y2),i); break;
				case 's': segs.replaceItem(path.createSVGPathSegCurvetoCubicSmoothAbs(x,y,x2,y2),i); break;
				case 'q': segs.replaceItem(path.createSVGPathSegCurvetoQuadraticAbs(x,y,x1,y1),i);   break;
				case 't': segs.replaceItem(path.createSVGPathSegCurvetoQuadraticSmoothAbs(x,y),i);   break;
				case 'a': segs.replaceItem(path.createSVGPathSegArcAbs(x,y,seg.r1,seg.r2,seg.angle,seg.largeArcFlag,seg.sweepFlag),i);   break;
				case 'z': case 'Z': x=x0; y=y0; break;
			}
		}
		// Record the start of a subpath
		if (c=='M' || c=='m') x0=x, y0=y;
	}
}

function refresh_display() {
	furriness = document.getElementById("furriness_slider").value;
	antifurriness = 1.0 - furriness;
	
	result.clear();
	
	var base_elements = base_template.node.children;
	var cat_elements = cat_template.node.children;
	result_elements = result.group();
	
	result_elements.attr({
		stroke: base_template.node.getAttribute("stroke"),
		fill: base_template.node.getAttribute("fill"),
		"stroke-linecap": base_template.node.getAttribute("stroke-linecap"),
		transform: base_template.node.getAttribute("transform")
	});
	
	for(var i=0; i < base_elements.length; ++i) {
		var base_e = base_elements[i];
		var cat_e = cat_elements[i];
		if(base_e.nodeName !== "path")
			continue;
			
		convertToAbsolute(base_e);
		convertToAbsolute(cat_e);
		
		var result_path = result_elements.path();
		var result_e = result_path.node;
		/// FIXME: morph transformation.
		result_path.attr({
			transform: base_e.getAttribute("transform")
		});
		
		/// combine the path properties.
		var base_seglist = base_e.pathSegList;
		var cat_seglist = cat_e.pathSegList;
		var result_seglist = result_e.pathSegList;
		
		for(var j=0; j < base_seglist.length; ++j) {
			/// segment in path
			var base_seg = base_seglist[j];
			var cat_seg = cat_seglist[j];
			var result_seg;
			if(base_seg.pathSegType != cat_seg.pathSegType) {
				console.warn("path segment types do not match: %i (%s), %i (%s)", base_seg.pathSegType, base_seg.pathSegTypeAsLetter, cat_seg.pathSegType, cat_seg.pathSegTypeAsLetter);
			}
			switch(base_seg.pathSegType) {
				case SVGPathSeg.PATHSEG_CLOSEPATH: {
					result_seg = result_e.createSVGPathSegClosePath();
					break;
				}
				case SVGPathSeg.PATHSEG_MOVETO_ABS: {
					var x = (base_seg.x * antifurriness + cat_seg.x * furriness);
					var y = (base_seg.y * antifurriness + cat_seg.y * furriness);
					result_seg = result_e.createSVGPathSegMovetoAbs(x,y);
					break;
				}
				case SVGPathSeg.PATHSEG_LINETO_ABS: {
					var x = (base_seg.x * antifurriness + cat_seg.x * furriness);
					var y = (base_seg.y * antifurriness + cat_seg.y * furriness);
					result_seg = result_e.createSVGPathSegLinetoAbs(x,y);
					break;
				}
				case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS: {
					var x = (base_seg.x * antifurriness + cat_seg.x * furriness);
					var y = (base_seg.y * antifurriness + cat_seg.y * furriness);
					var x1 = (base_seg.x1 * antifurriness + cat_seg.x1 * furriness);
					var y1 = (base_seg.y1 * antifurriness + cat_seg.y1 * furriness);
					var x2 = (base_seg.x2 * antifurriness + cat_seg.x2 * furriness);
					var y2 = (base_seg.y2 * antifurriness + cat_seg.y2 * furriness);
					result_seg = result_e.createSVGPathSegCurvetoCubicAbs(x, y, x1, y1, x2, y2);
					break;
				}
				case SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS: {
					var x = (base_seg.x * antifurriness + cat_seg.x * furriness);
					var y = (base_seg.y * antifurriness + cat_seg.y * furriness);
					var x2 = (base_seg.x2 * antifurriness + cat_seg.x2 * furriness);
					var y2 = (base_seg.y2 * antifurriness + cat_seg.y2 * furriness);
					result_seg = result_e.createSVGPathSegCurvetoCubicSmoothAbs(x, y, x2, y2);
					break;
				}
				case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS: {
					var x = (base_seg.x * antifurriness + cat_seg.x * furriness);
					var y = (base_seg.y * antifurriness + cat_seg.y * furriness);
					var x1 = (base_seg.x1 * antifurriness + cat_seg.x1 * furriness);
					var y1 = (base_seg.y1 * antifurriness + cat_seg.y1 * furriness);
					result_seg = result_e.createSVGPathSegCurvetoQuadraticAbs(x, y, x1, y1);
					break;
				}
				case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS: {
					var x = (base_seg.x * antifurriness + cat_seg.x * furriness);
					var y = (base_seg.y * antifurriness + cat_seg.y * furriness);
					result_seg = result_e.createSVGPathSegCurvetoQuadraticSmoothAbs(x, y);
					break;
				}
				case SVGPathSeg.PATHSEG_ARC_ABS: {
					var x = (base_seg.x * antifurriness + cat_seg.x * furriness);
					var y = (base_seg.y * antifurriness + cat_seg.y * furriness);
					var r1 = (base_seg.r1 * antifurriness + cat_seg.r1 * furriness);
					var r2 = (base_seg.r2 * antifurriness + cat_seg.r2 * furriness);
					var angle = (base_seg.angle * antifurriness + cat_seg.angle * furriness);
					var largeArcFlag = base_seg.largeArcFlag;	///FIXME
					var sweepFlag = base_seg.sweepFlag;		///FIXME
					result_seg = result_e.createSVGPathSegArcAbs(x, y, r1, r2, angle, largeArcFlag, sweepFlag);
					break;
				}
				default: {
					console.error("no morph implementation for path segment type %s", base_seg.pathSegTypeAsLetter);
					break;
				}
			}
			if(result_seg != null)
				result_seglist.appendItem(result_seg);
		}
	}
	
}


Snap.load("polymorph-opt.svg", function(loaded_svg) {
	template.attr({
		height: 500,
		width: 200
	});
	template_groups = loaded_svg.selectAll("g");
	base_template = template_groups[0];
	cat_template = template_groups[1];
	loaded = loaded_svg;
	
	refresh_display();
});

