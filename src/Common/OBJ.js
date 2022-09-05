export default class OBJ {

  constructor(name) {
    this.vertices = [];
    this.triangles = [];
  }

  addVertex(x, y, z) {
    this.vertices.push([x, y, z]);
    return this.vertices.length;
  }

  addFace(index0, index1, index2) {
    this.triangles.push([index0, index1, index2]);
  }

  toFile() {
    let out = "# Generated with Anno2070.js\n";
    for (let vertex of this.vertices) {
      out += `v ${vertex[0]} ${vertex[1]} ${vertex[2]}\n`      
    }
    for (let triangle of this.triangles) {
      out += `f ${triangle[0]} ${triangle[1]} ${triangle[2]}\n`
    } 
    return out;
  }

}