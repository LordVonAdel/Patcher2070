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

  write(data, vertex, offset) {
    for (let attribute of this.format.attributes) {
      attribute.write(data, offset, vertex[attribute.name]);
      offset += attribute.size;
    }
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
  },
  write: (data, offset, value) => {
    data.writeUInt16LE(floatToHalf(value[0]), offset);
    data.writeUInt16LE(floatToHalf(value[1]), offset + 2);
    data.writeUInt16LE(floatToHalf(value[2]), offset + 4);
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
  },
  write: (data, offset, value) => {
    data.writeUInt8(Math.round((value[0] + 1) * 127), offset);
    data.writeUInt8(Math.round((value[1] + 1) * 127), offset + 1);
    data.writeUInt8(Math.round((value[2] + 1) * 127), offset + 2);
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
  },
  write: (data, offset, value) => {
    data.writeUInt16LE(floatToHalf(value[0]), offset);
    data.writeUInt16LE(floatToHalf(1 - value[1]), offset + 2);
  }
};

const AttributeUnknown = (size) => ({
  size: size,
  name: "unknown",
  read: (data, offset) => undefined,
  write: (data, offset, value) => {}
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

/**
 * Converts 16 bit float to a number.
 * Uses Copilot voodoo!
 * @param {number} half integer representing the float value
 * @returns the number as a float
 */
function halfToFloat(half) {
  const sign = (half & 0x8000) >> 15;
  const exponent = (half & 0x7C00) >> 10;
  const fraction = half & 0x03FF;
  if(exponent === 0) {
      return (sign?-1:1) * Math.pow(2, -14) * (fraction / Math.pow(2, 10));
  } else if(exponent === 0x1F) {
      return fraction?NaN:((sign?-1:1)*Infinity);
  }
  return (sign?-1:1) * Math.pow(2, exponent - 15) * (1 + fraction / Math.pow(2, 10));
}

function floatToHalf(x) {
    // Code generated using ChatGPT

    // Ensure the float value is within the representable range of half-precision
    if (x > 65504.0) x = 65504.0;
    if (x < -65504.0) x = -65504.0;

    // Extract the sign, exponent, and mantissa bits from the float
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, x, true);
    const floatBits = view.getUint32(0, true);
    const signBit = (floatBits & 0x80000000) >> 16; // Sign bit
    const exponentBits = (floatBits & 0x7F800000) >> 23; // Exponent bits
    const mantissaBits = floatBits & 0x007FFFFF; // Mantissa bits

    // Convert to half-precision format
    const halfSign = signBit >> 15;
    const halfExponent = exponentBits - 112;
    const halfMantissa = (mantissaBits >> 13) & 0x03FF;

    // Combine the bits into a half-precision value
    const halfValue = (halfSign << 15) | (halfExponent << 10) | halfMantissa;

    return halfValue;
}