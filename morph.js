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
var squirrel_template;
var template_groups;
var loaded;
var result_elements_group;
var furriness, squirreliness;


function copy_attributes(src_node, dest_node) {
	for(var i=0; i < src_node.attributes.length; ++i) {
		var attr = src_node.attributes[i];
		if(attr.name === "id" || attr.name === "d")
			continue;
		dest_node.setAttribute(attr.name, attr.value);
	}
}


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


function merge_path_elements(result_path, elements, values) {
	console.log("merging path elements");
	
	var seg_lists = [];
	
	for(var i=0; i < elements.length; ++i) {
		var element = elements[i];
		
		if(element.nodeName !== "path") {
			console.warn("element nodeName is '" + element.nodeName + "', not 'path'. ");
			return;
		}
		
		convertToAbsolute(element);
		seg_lists[i] = element.pathSegList;
	}
	
	var result_e = result_path.node;
	
	/// FIXME: morph these attributes
	copy_attributes(elements[0], result_e);
	
	var base_seglist = seg_lists[0];
	var result_seglist = result_e.pathSegList;
	
	if(elements.length === 1) {
		/// Only one element to merge.
		console.log("merging single element. Copying path directly");
		result_e.setAttribute("d", elements[0].getAttribute("d"));
		return;
	}
	
	for(var i=0; i < base_seglist.length; ++i) {
		/// segment in path
		var base_seg = base_seglist[i];
		var segments = [];
		for(var j=0; j < elements.length; ++j) {
			segments[j] = seg_lists[j][i];
			
			if(base_seg.pathSegType != segments[j].pathSegType) {
				console.warn("path segment types do not match: %i (%s), %i (%s)", base_seg.pathSegType, base_seg.pathSegTypeAsLetter, segments[j].pathSegType, segment[j].pathSegTypeAsLetter);
			}
		}
		var result_seg;
		switch(base_seg.pathSegType) {
			case SVGPathSeg.PATHSEG_CLOSEPATH: {
				result_seg = result_e.createSVGPathSegClosePath();
				break;
			}
			case SVGPathSeg.PATHSEG_MOVETO_ABS: {
				var x = base_seg.x;
				var y = base_seg.y;
				for(var j=1; j < elements.length; ++j) {
					x += (segments[j].x - base_seg.x) * values[j];
					y += (segments[j].y - base_seg.y) * values[j];
				}
				result_seg = result_e.createSVGPathSegMovetoAbs(x,y);
				break;
			}
			case SVGPathSeg.PATHSEG_LINETO_ABS: {
				var x = base_seg.x;
				var y = base_seg.y;
				for(var j=1; j < elements.length; ++j) {
					x += (segments[j].x - base_seg.x) * values[j];
					y += (segments[j].y - base_seg.y) * values[j];
				}
				result_seg = result_e.createSVGPathSegLinetoAbs(x,y);
				break;
			}
			case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS: {
				var x = base_seg.x;
				var y = base_seg.y;
				var x1 = base_seg.x1;
				var y1 = base_seg.y1;
				var x2 = base_seg.x2;
				var y2 = base_seg.y2;
				for(var j=1; j < elements.length; ++j) {
					x += (segments[j].x - base_seg.x) * values[j];
					y += (segments[j].y - base_seg.y) * values[j];
					x1 += (segments[j].x1 - base_seg.x1) * values[j];
					y1 += (segments[j].y1 - base_seg.y1) * values[j];
					x2 += (segments[j].x2 - base_seg.x2) * values[j];
					y2 += (segments[j].y2 - base_seg.y2) * values[j];
				}
				result_seg = result_e.createSVGPathSegCurvetoCubicAbs(x, y, x1, y1, x2, y2);
				break;
			}
			case SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS: {
				var x = base_seg.x;
				var y = base_seg.y;
				var x2 = base_seg.x2;
				var y2 = base_seg.y2;
				for(var j=1; j < elements.length; ++j) {
					x += (segments[j].x - base_seg.x) * values[j];
					y += (segments[j].y - base_seg.y) * values[j];
					x2 += (segments[j].x2 - base_seg.x2) * values[j];
					y2 += (segments[j].y2 - base_seg.y2) * values[j];
				}
				result_seg = result_e.createSVGPathSegCurvetoCubicSmoothAbs(x, y, x2, y2);
				break;
			}
			case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS: {
				var x = base_seg.x;
				var y = base_seg.y;
				var x1 = base_seg.x1;
				var y1 = base_seg.y1;
				for(var j=1; j < elements.length; ++j) {
					x += (segments[j].x - base_seg.x) * values[j];
					y += (segments[j].y - base_seg.y) * values[j];
					x1 += (segments[j].x1 - base_seg.x1) * values[j];
					y1 += (segments[j].y1 - base_seg.y1) * values[j];
				}
				result_seg = result_e.createSVGPathSegCurvetoQuadraticAbs(x, y, x1, y1);
				break;
			}
			case SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS: {
				var x = base_seg.x;
				var y = base_seg.y;
				for(var j=1; j < elements.length; ++j) {
					x += (segments[j].x - base_seg.x) * values[j];
					y += (segments[j].y - base_seg.y) * values[j];
				}
				result_seg = result_e.createSVGPathSegCurvetoQuadraticSmoothAbs(x, y);
				break;
			}
			case SVGPathSeg.PATHSEG_ARC_ABS: {
				var largeArcFlag = base_seg.largeArcFlag;	///FIXME: figure out how to blend this
				var sweepFlag = base_seg.sweepFlag;		///FIXME: figure out how to blend this
				var x = base_seg.x;
				var y = base_seg.y;
				var r1 = base_seg.r1;
				var r2 = base_seg.r2;
				var angle = base_seg.angle;
				for(var j=1; j < elements.length; ++j) {
					x += (segments[j].x - base_seg.x) * values[j];
					y += (segments[j].y - base_seg.y) * values[j];
					r1 += (segments[j].r1 - base_seg.r1) * values[j];
					r2 += (segments[j].r2 - base_seg.r2) * values[j];
					angle += (segments[j].angle - base_seg.angle) * values[j];
				}
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

function merge_group_elements(result_group, groups, values) {
	console.log("merging group elements");

	var base_group = groups[0];
	var base_elements = base_group.children;
	
	/// Copy base attributes into result group
	copy_attributes(base_group, result_group.node);
	
	for(var i=0; i < base_elements.length; ++i) {
		var base_e = base_elements[i];
		var child_elements = [];
		for(var j=0; j < groups.length; ++j) {
			child_elements[j] = groups[j].children[i];
		}
		
		if(base_e.nodeName === "path") {
			merge_path_elements(result_group.path(), child_elements, values);
		} else if(base_e.nodeName === "g") {
			var group_name = base_e.getAttribute("polymorph:label");
			
			/// find matching nodes in the other groups
			var matching_groups = [];
			var matching_group_values = [];
			for(var j=0; j < groups.length; ++j) {
				for(var k=0; k < groups[j].children.length; ++k) {
					if(groups[j].children[k].nodeName === "g" && groups[j].children[k].getAttribute("polymorph:label") === group_name) {
						matching_groups.push(groups[j].children[k]);
						matching_group_values.push(values[j]);
						break;
					}
				}
			}
			merge_group_elements(result_group.group(), matching_groups, matching_group_values);
		} else {
			console.warn("nodeName is '" + base_e.nodeName + "', not 'path' or 'g'.");
		}
	}
}


function refresh_display() {
	furriness = document.getElementById("furriness_slider").value;
	squirreliness = document.getElementById("squirreliness_slider").value;
	
	result.clear();
	
	var base_elements = base_template.node.children;
	var cat_elements = cat_template.node.children;
	var squirrel_elements = squirrel_template.node.children;
	
	/// result_elements_group is analogous to base_template
	result_elements_group = result.group();
	
	/// Copy base attributes into result group
	for(var i=0; i < base_template.node.attributes.length; ++i) {
		var attr = base_template.node.attributes[i];
		if(attr.name === "id") {
			continue;
		}
		result_elements_group.node.setAttribute(attr.name, attr.value);
	}
	
	merge_group_elements(result_elements_group, [base_template.node, cat_template.node, squirrel_template.node], [1, furriness, squirreliness]);
}


Snap.load("polymorph-opt.svg", function(loaded_svg) {
	template.attr({
		height: 500,
		width: 200
	});
	template_groups = loaded_svg.selectAll("svg > g");	/// all g elements whose parent is an svg element
	base_template = template_groups[0];
	cat_template = template_groups[1];
	squirrel_template = template_groups[2];
	loaded = loaded_svg;
	
	refresh_display();
});

