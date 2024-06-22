"use strict";

import { RWSE2Token, RWSE2_OPT } from "./RWSE2Token.js";
import { CustomError } from "./Errors.js";
import { utf8ToUnicode, unicodeToUtf8 } from "./UTF8Coding.js";
import { RWSH, RWSH_TYPE } from "./RWSH.js";
export { RWCFCreate, RWCFRead };

const RWCF_HEADER = new Uint8Array([0xd2, 0x57, 0x43, 0x46]);

function RWCFCreate(bin, file_name, token, sec_param, mode, update_prog = (prog) => { }) {
    if (!(bin instanceof Uint8Array)) {
        throw new CustomError(-5, "Illegal input format");
    }
    if (!(typeof (file_name) == 'string' || file_name instanceof String)) {
        throw new CustomError(-5, "Illegal input format");
    }

    let file_size = bin.byteLength;
    if (file_size > 1932800000) {
        throw new CustomError(-6, "File size too large");
    }

    let hash_size = 0;
    let h;
    switch (sec_param) {
        default:
        case RWSE2_OPT.OPT_256:
            hash_size = 32;
            h = new RWSH(RWSH_TYPE.RWSH256);
            break;
        case RWSE2_OPT.OPT_384:
            hash_size = 48;
            h = new RWSH(RWSH_TYPE.RWSH384);
            break;
        case RWSE2_OPT.OPT_512:
            hash_size = 64;
            h = new RWSH(RWSH_TYPE.RWSH512);
            break;
    }

    let utf8_file_name = unicodeToUtf8(file_name);
    let file_name_size = utf8_file_name.byteLength;

    let result = {};

    result.raw = new Uint8Array(30 + hash_size + file_name_size + file_size);
    result.header = result.raw.subarray(0, 4);
    result.salt = result.raw.subarray(4, 20);
    result.hash_size = result.raw.subarray(20, 21);
    result.hash = result.raw.subarray(21, 21 + hash_size);
    result.mode = result.raw.subarray(21 + hash_size, 22 + hash_size);
    result.file_name_size = result.raw.subarray(22 + hash_size, 26 + hash_size);
    result.file_name = result.raw.subarray(26 + hash_size, 26 + hash_size + file_name_size);
    result.file_size = result.raw.subarray(26 + hash_size + file_name_size, 30 + hash_size + file_name_size);
    result.data = result.raw.subarray(30 + hash_size + file_name_size);

    result.header.set(RWCF_HEADER);
    crypto.getRandomValues(result.salt);
    result.hash_size[0] = hash_size;
    result.hash.set(
        h.
            absorb(unicodeToUtf8(token)).
            absorb(result.salt).
            digest()
    );
    result.mode[0] = mode;
    write32(result.file_name_size, file_name_size);
    result.file_name.set(utf8_file_name);
    write32(result.file_size, file_size);
    result.data.set(bin);

    RWSE2Token(result.data, token, result.salt, sec_param, mode, update_prog);

    return result;
}

function RWCFRead(bin, token, update_prog = (prog) => { }) {
    if (!(bin instanceof Uint8Array)) {
        throw new CustomError(-5, "Illegal input format");
    }

    let length = bin.byteLength;
    if (length > 2000000000) {
        throw new CustomError(-6, "File size too large");
    } else if (length < 62) {
        throw new CustomError(-7, "Malformed file");
    }

    for (let i = 0; i < 4; i++) {
        if (RWCF_HEADER[i] !== bin[i]) {
            throw new CustomError(-7, "Malformed file");
        }
    }

    let salt = bin.subarray(4, 20);
    let hash_size = bin[20];
    let sec_param = 0;
    let h;
    switch (hash_size) {
        default:
        case 32:
            hash_size = 32;
            sec_param = RWSE2_OPT.OPT_256;
            h = new RWSH(RWSH_TYPE.RWSH256);
            break;
        case 48:
            sec_param = RWSE2_OPT.OPT_384;
            h = new RWSH(RWSH_TYPE.RWSH384);
            break;
        case 64:
            sec_param = RWSE2_OPT.OPT_512;
            h = new RWSH(RWSH_TYPE.RWSH512);
            break;
    }
    if (length < hash_size + 30) {
        throw new CustomError(-7, "Malformed file");
    }

    let record_hash = bin.subarray(21, 21 + hash_size);
    let hash = h.
        absorb(unicodeToUtf8(token)).
        absorb(salt).
        digest();

    for (let i = 0; i < hash_size; i++) {
        if (hash[i] !== record_hash[i]) {
            throw new CustomError(-8, "Incorrect Token");
        }
    }
    let mode = bin[21 + hash_size];
    let file_name_size = read32(bin.subarray(22 + hash_size, 26 + hash_size));
    if (length < 30 + file_name_size + hash_size) {
        throw new CustomError(-7, "Malformed file");
    }

    let result = {};
    try {
        result.file_name = utf8ToUnicode(bin.subarray(26 + hash_size, 26 + hash_size + file_name_size));
    } catch (e) {
        result.file_name = "Untitled.bin";
    }
    let file_size = read32(bin.subarray(26 + hash_size + file_name_size, 30 + hash_size + file_name_size));
    if (length < 30 + hash_size + file_name_size + file_size) {
        throw new CustomError(-7, "Malformed file");
    }

    result.data = bin.slice(30 + hash_size + file_name_size, 30 + hash_size + file_name_size + file_size);

    RWSE2Token(result.data, token, salt, sec_param, mode, update_prog);

    return result;
}

const write32 = (buf, val) => {
    buf[0] = val & 0xff;
    buf[1] = (val >>> 8) & 0xff;
    buf[2] = (val >>> 16) & 0xff;
    buf[3] = (val >>> 24) & 0xff;
};

const read32 = (buf) => (
    ((buf[3] & 0xff) << 24) |
    ((buf[2] & 0xff) << 16) |
    ((buf[1] & 0xff) << 8) |
    (buf[0] & 0xff)
);