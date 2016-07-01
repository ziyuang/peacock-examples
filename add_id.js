d3.selectAll('path')
	.each(function(d, i) {
		// var id = 'path-' + i;
		var id = i;
		d3.select(this).attr('id', id);
	});


function validId (numericId) {
  return "#" + numericId.toString().split("").map(function (d) { return "\\" + d.charCodeAt(0).toString(16); }).join("");
}