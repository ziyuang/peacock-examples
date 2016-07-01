function mouseover() {
  var currentLine = d3.select(this);
  var currentId = currentLine.attr("id");
  var neighbors = adjMap[currentId];
  for (var nId in neighbors) {
    d3.select(validId(nId)).attr("class", "link link--bundled");
  }
}

function mouseout() {
  d3.selectAll(".link--bundled").classed("link--bundled", false);
}


function bindMouseEvents() {
  d3.selectAll('path')
    .each(function(d) {
      d3.select(this)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);
      });
}