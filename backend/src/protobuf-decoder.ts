/**
 * Protobuf decoder for OTLP trace data
 *
 * Uses protobufjs to decode OTLP protobuf format into JSON
 */

import protobuf from 'protobufjs';

// Define the OTLP trace schema using protobufjs reflection
const root = protobuf.Root.fromJSON({
  nested: {
    opentelemetry: {
      nested: {
        proto: {
          nested: {
            collector: {
              nested: {
                trace: {
                  nested: {
                    v1: {
                      nested: {
                        ExportTraceServiceRequest: {
                          fields: {
                            resourceSpans: { rule: "repeated", type: "opentelemetry.proto.trace.v1.ResourceSpans", id: 1 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            trace: {
              nested: {
                v1: {
                  nested: {
                    ResourceSpans: {
                      fields: {
                        resource: { type: "opentelemetry.proto.resource.v1.Resource", id: 1 },
                        scopeSpans: { rule: "repeated", type: "ScopeSpans", id: 2 },
                        schemaUrl: { type: "string", id: 3 }
                      }
                    },
                    ScopeSpans: {
                      fields: {
                        scope: { type: "opentelemetry.proto.common.v1.InstrumentationScope", id: 1 },
                        spans: { rule: "repeated", type: "Span", id: 2 },
                        schemaUrl: { type: "string", id: 3 }
                      }
                    },
                    Span: {
                      fields: {
                        traceId: { type: "bytes", id: 1 },
                        spanId: { type: "bytes", id: 2 },
                        traceState: { type: "string", id: 3 },
                        parentSpanId: { type: "bytes", id: 4 },
                        name: { type: "string", id: 5 },
                        kind: { type: "int32", id: 6 },
                        startTimeUnixNano: { type: "fixed64", id: 7 },
                        endTimeUnixNano: { type: "fixed64", id: 8 },
                        attributes: { rule: "repeated", type: "opentelemetry.proto.common.v1.KeyValue", id: 9 },
                        droppedAttributesCount: { type: "uint32", id: 10 },
                        events: { rule: "repeated", type: "Event", id: 11 },
                        droppedEventsCount: { type: "uint32", id: 12 },
                        links: { rule: "repeated", type: "Link", id: 13 },
                        droppedLinksCount: { type: "uint32", id: 14 },
                        status: { type: "Status", id: 15 }
                      }
                    },
                    Event: {
                      fields: {
                        timeUnixNano: { type: "fixed64", id: 1 },
                        name: { type: "string", id: 2 },
                        attributes: { rule: "repeated", type: "opentelemetry.proto.common.v1.KeyValue", id: 3 },
                        droppedAttributesCount: { type: "uint32", id: 4 }
                      }
                    },
                    Link: {
                      fields: {
                        traceId: { type: "bytes", id: 1 },
                        spanId: { type: "bytes", id: 2 },
                        traceState: { type: "string", id: 3 },
                        attributes: { rule: "repeated", type: "opentelemetry.proto.common.v1.KeyValue", id: 4 },
                        droppedAttributesCount: { type: "uint32", id: 5 }
                      }
                    },
                    Status: {
                      fields: {
                        message: { type: "string", id: 2 },
                        code: { type: "int32", id: 3 }
                      }
                    }
                  }
                }
              }
            },
            resource: {
              nested: {
                v1: {
                  nested: {
                    Resource: {
                      fields: {
                        attributes: { rule: "repeated", type: "opentelemetry.proto.common.v1.KeyValue", id: 1 },
                        droppedAttributesCount: { type: "uint32", id: 2 }
                      }
                    }
                  }
                }
              }
            },
            common: {
              nested: {
                v1: {
                  nested: {
                    InstrumentationScope: {
                      fields: {
                        name: { type: "string", id: 1 },
                        version: { type: "string", id: 2 },
                        attributes: { rule: "repeated", type: "KeyValue", id: 3 },
                        droppedAttributesCount: { type: "uint32", id: 4 }
                      }
                    },
                    KeyValue: {
                      fields: {
                        key: { type: "string", id: 1 },
                        value: { type: "AnyValue", id: 2 }
                      }
                    },
                    AnyValue: {
                      oneofs: {
                        value: { oneof: ["stringValue", "boolValue", "intValue", "doubleValue", "arrayValue", "kvlistValue", "bytesValue"] }
                      },
                      fields: {
                        stringValue: { type: "string", id: 1 },
                        boolValue: { type: "bool", id: 2 },
                        intValue: { type: "int64", id: 3 },
                        doubleValue: { type: "double", id: 4 },
                        arrayValue: { type: "ArrayValue", id: 5 },
                        kvlistValue: { type: "KeyValueList", id: 6 },
                        bytesValue: { type: "bytes", id: 7 }
                      }
                    },
                    ArrayValue: { fields: { values: { rule: "repeated", type: "AnyValue", id: 1 } } },
                    KeyValueList: { fields: { values: { rule: "repeated", type: "KeyValue", id: 1 } } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
});

// Get the message type for ExportTraceServiceRequest
const ExportTraceServiceRequest = root.lookupType('opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest');

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array | Buffer | number[]): string {
  if (!bytes || (Array.isArray(bytes) && bytes.length === 0)) {
    return '';
  }
  const arr = bytes instanceof Uint8Array ? bytes : Buffer.from(bytes);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert protobuf Long to string
 */
function longToString(value: any): string {
  if (value === null || value === undefined) {
    return '0';
  }
  // Handle Long type from protobufjs
  if (typeof value === 'object' && 'low' in value && 'high' in value) {
    // Convert to BigInt for accuracy
    const low = BigInt(value.low >>> 0);
    const high = BigInt(value.high >>> 0);
    const result = (high << BigInt(32)) | low;
    return result.toString();
  }
  return String(value);
}

/**
 * Transform decoded protobuf message to JSON-compatible format
 */
function transformToJSON(message: any): any {
  if (!message) return message;

  if (Array.isArray(message)) {
    return message.map(transformToJSON);
  }

  if (typeof message !== 'object') {
    return message;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(message)) {
    // Handle bytes fields (traceId, spanId, parentSpanId)
    if (key === 'traceId' || key === 'spanId' || key === 'parentSpanId') {
      result[key] = bytesToHex(value as any);
    }
    // Handle timestamp fields
    else if (key === 'startTimeUnixNano' || key === 'endTimeUnixNano' || key === 'timeUnixNano') {
      result[key] = longToString(value);
    }
    // Handle nested objects and arrays
    else if (typeof value === 'object') {
      result[key] = transformToJSON(value);
    }
    else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Decode OTLP protobuf data to JSON
 */
export function decodeOTLPProtobuf(buffer: Buffer): any {
  try {
    // Decode the protobuf message
    const message = ExportTraceServiceRequest.decode(buffer);

    // Convert to plain object
    const obj = ExportTraceServiceRequest.toObject(message, {
      longs: String,
      bytes: Array,
      defaults: true,
      arrays: true,
      objects: true,
    });

    // Transform bytes and longs to proper format
    const transformed = transformToJSON(obj);

    return transformed;
  } catch (error) {
    console.error('[Protobuf] Error decoding protobuf:', error);
    throw error;
  }
}

