"use strict";

import { CustomError } from "./Errors.js";
export { base64encode, base64decode };

const BASE64_STRING = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const BASE64_INV = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3e, 0x00, 0x00, 0x00, 0x3f,
    0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
    0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

function base64encode(array) {
    let length = Math.floor((array.length - 1) / 3);
    let last = array.length - 3 * length;
    var result = "";
    let i;

    for (i = 0; i < length; i++) {
        result +=
            BASE64_STRING.charAt((array[3 * i] >>> 2) & 63) +
            BASE64_STRING.charAt(((array[3 * i] << 4) | (array[3 * i + 1] >>> 4)) & 63) +
            BASE64_STRING.charAt(((array[3 * i + 1] << 2) | (array[3 * i + 2] >>> 6)) & 63) +
            BASE64_STRING.charAt(array[3 * i + 2] & 63);
    }
    let temp = new Uint8Array(3);
    temp.set(array.subarray(3 * i));

    result +=
        BASE64_STRING.charAt((temp[0] >>> 2) & 63) +
        BASE64_STRING.charAt(((temp[0] << 4) | (temp[1] >>> 4)) & 63) +
        BASE64_STRING.charAt(((temp[1] << 2) | (temp[2] >>> 6)) & 63) +
        BASE64_STRING.charAt(temp[2] & 63);

    result = result.substr(0, (i << 2) + 1 + last) + "===".substr(last);

    return result;
}

function base64decode(b64) {
    let length = b64.length;
    if ((length & 3) != 0) {
        throw new CustomError(-9, "Illegal base64 string!");
    }
    let pos = b64.search("=");
    if (pos > 0 && length - pos > 2) {
        throw new CustomError(-9, "Illegal base64 string!");
    }
    if (pos > 0) {
        for (let i = pos; i < length; i++) {
            if (b64.charAt(i) != "=") {
                throw new CustomError(-9, "Illegal base64 string!");
            }
        }
    }
    let pad = (pos > 0) ? (length - pos) : 0;

    var result = new Uint8Array((length >>> 2) * 3 - pad), temp = new Uint8Array(3);
    let i;
    for (i = 0; i < (length >>> 2) - 1; i++) {
        temp[0] = ((BASE64_INV[b64.charCodeAt(i << 2)] << 2) | (BASE64_INV[b64.charCodeAt((i << 2) + 1)] >> 4)) & 0xff;
        temp[1] = ((BASE64_INV[b64.charCodeAt((i << 2) + 1)] << 4) | (BASE64_INV[b64.charCodeAt((i << 2) + 2)] >> 2)) & 0xff;
        temp[2] = ((BASE64_INV[b64.charCodeAt((i << 2) + 2)] << 6) | BASE64_INV[b64.charCodeAt((i << 2) + 3)]) & 0xff;
        result.set(temp, 3 * i);
    }
    temp[0] = ((BASE64_INV[b64.charCodeAt(i << 2)] << 2) | (BASE64_INV[b64.charCodeAt((i << 2) + 1)] >> 4)) & 0xff;
    temp[1] = ((BASE64_INV[b64.charCodeAt((i << 2) + 1)] << 4) | (BASE64_INV[b64.charCodeAt((i << 2) + 2)] >> 2)) & 0xff;
    temp[2] = ((BASE64_INV[b64.charCodeAt((i << 2) + 2)] << 6) | BASE64_INV[b64.charCodeAt((i << 2) + 3)]) & 0xff;
    result.set(temp.subarray(0, 3 - pad), 3 * i);

    return result;
}