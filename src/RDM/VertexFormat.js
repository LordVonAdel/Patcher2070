export default class VertexFormat {

  static getBySize(size) {
    let format = formats.find(f => f.size == size);
    if (format) {
      return new VertexFormat(format);
    }
    throw new Error("Vertex format not supported (" + size + ")");
  }

  constructor(format) {
    this.format = format;
    this.validateVertexFormat();
  }

  read(data) {
    let out = [];
    let offset = 0;
    for (let attribute of this.format.attributes) {
      out[attribute.name] = attribute.read(data, offset);
      offset += attribute.size;
    }
    return out;
  }

  get size() {
    return this.format.size;
  }

  hasAttribute(name) {
    return this.format.attributes.some(a => a.name == name);
  }

  validateVertexFormat() {
    let computedSize = 0;
    for (let attribute of this.format.attributes) {
      computedSize += attribute.size;
    }
    if (computedSize != this.size) {
      throw new Error("Vertex format size mismatch");
    }
    return true;
  }
}

// Attribute Types
const AttributePositionUInt16 = {
  size: 8,
  name: "position",
  read: (data, offset) => {
    return [
      halfToFloat(data.readUInt16LE(offset)),
      halfToFloat(data.readUInt16LE(offset + 2)),
      halfToFloat(data.readUInt16LE(offset + 4))
    ]
  }
};

const AttributePositionFloat = {
  size: 8,
  name: "position",
  read: (data, offset) => {
    return [
      data.readFloatLE(offset),
      data.readFloatLE(offset + 2),
      data.readFloatLE(offset + 4)
    ]
  }
};

const AttributeNormalUInt8 = {
  size: 4,
  name: "normal",
  read: (data, offset) => {
    return [
      (data.readUInt8(offset) * 2 / 255) - 1,
      (data.readUInt8(offset + 1) * 2 / 255) - 1,
      (data.readUInt8(offset + 2) * 2 / 255) - 1
    ]
  }
};

const AttributeTangentUInt8 = {
  size: 4,
  name: "tangent",
  read: (data, offset) => {
    return [
      data.readUInt8(offset),
      data.readUInt8(offset + 1),
      data.readUInt8(offset + 2)
    ]
  }
};

const AttributeBitangentUInt8 = {
  size: 4,
  name: "bitangent",
  read: (data, offset) => {
    return [
      data.readUInt8(offset),
      data.readUInt8(offset + 1),
      data.readUInt8(offset + 2)
    ]
  }
};

const AttributeTexcoordUInt16 = {
  size: 4,
  name: "texcoord",
  read: (data, offset) => {
    return [
          halfToFloat(data.readUInt16LE(offset)),
      1 - halfToFloat(data.readUInt16LE(offset + 2))
    ]
  }
};

const AttributeUnknown = (size) => ({
  size: size,
  name: "unknown",
  read: (data, offset) => undefined
});


// Format types
const formats = [
  {
    size: 8,
    attributes: [
      AttributePositionUInt16,
    ]
  },
  {
    size: 16,
    attributes: [
      AttributePositionUInt16,
      AttributeTexcoordUInt16,
      AttributeUnknown(4)
    ]
  },
  {
    size: 20,
    attributes: [
      AttributePositionUInt16,
      AttributeNormalUInt8,
      AttributeTexcoordUInt16,
      AttributeUnknown(4)
    ]
  },
  {
    size: 24,
    attributes: [
      AttributePositionUInt16,
      AttributeNormalUInt8,
      AttributeTangentUInt8,
      AttributeBitangentUInt8,
      AttributeTexcoordUInt16
    ]
  },
  {
    size: 28,
    attributes: [
      AttributePositionUInt16,
      AttributeNormalUInt8,
      AttributeTangentUInt8,
      AttributeBitangentUInt8,
      AttributeTexcoordUInt16,
      AttributeUnknown(4)
    ]
  },
  {
    size: 32,
    attributes: [
      AttributePositionUInt16,
      AttributeNormalUInt8,
      AttributeTangentUInt8,
      AttributeBitangentUInt8,
      AttributeTexcoordUInt16,
      AttributeUnknown(8)
    ]
  }
];

function singleScale(x) {
  Math.min(Math.max(((x + 1) / 2) * 255, 0), 255);
}

/**
 * Sources:
 * https://devblogs.microsoft.com/dotnet/introducing-the-half-type/#:~:text=A%20Half%20can%20be%20converted,the%20inverse%20is%20not%20true.
 * https://en.wikipedia.org/wiki/Half-precision_floating-point_format
 **/
function halfToFloat(x) {
  const fraction = (x & 0b00000011_11111111) / 1024;
  const exponent = ((x & 0b01111100_00000000) >> 10) - 15;
  const sign = (x & 0b10000000_00000000) >> 15;
  const implicitBit = fraction != 0;
  return (implicitBit + fraction) * Math.pow(2, exponent) * Math.pow(-1, sign);
}