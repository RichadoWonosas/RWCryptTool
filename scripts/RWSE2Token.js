"use strict";

import { RWSH, RWSH_TYPE } from "./RWSH.js";
import { unicodeToUtf8 } from "./UTF8Coding.js";
import { CustomError } from "./Errors.js";
import { Module } from "./RWSE4WASM.js";
export { RWSE2_OPT, RWSE2_MODE, RWSE2Token };

const RWSE2_MODE = {
    CTR: 0,
    OFB: 1
};

const RWSE2_OPT = {
    OPT_256: 0,
    OPT_384: 1,
    OPT_512: 2
};

function RWSE2Token(content, token, salt, crypt_type, mode, update_prog = (prog) => { }) {
    if (!content instanceof Uint8Array) {
        throw new CustomError(-1, "Illegal content");
    }
    if (!(typeof (token) === "string" || token instanceof String)) {
        throw new CustomError(-2, "Illegal token");
    }
    if (!salt instanceof Uint8Array) {
        throw new CustomError(-3, "Illegal salt");
    }

    let output_length = 0, hash_type = RWSH_TYPE.RWXH256;
    switch (crypt_type) {
        default:
        case RWSE2_OPT.OPT_256:
            hash_type = RWSH_TYPE.RWXH256;
            output_length = 512;
            break;
        case RWSE2_OPT.OPT_384:
            hash_type = RWSH_TYPE.RWXH512;
            output_length = 640;
            break;
        case RWSE2_OPT.OPT_512:
            hash_type = RWSH_TYPE.RWXH512;
            output_length = 768;
            break;
    }

    let raw_key =
        new RWSH(hash_type).
            absorb(unicodeToUtf8(token)).
            absorb(salt).
            digest(output_length);

    let key = raw_key.subarray(0, -32);
    let iv = raw_key.subarray(-32);

    RWSE2Mode(content, key, iv, mode, crypt_type, update_prog);
}

function RWSE2Mode(content, key, iv, mode, crypt_type, update_prog) {
    let update_fn = Module.addFunction(update_prog, 'vf');
    let content_len = content.length;
    let content_pos = Module._malloc(content_len);
    let key_pos = Module._malloc(key.length);
    let iv_pos = Module._malloc(iv.length);

    let hkey = Module.HEAPU8.subarray(key_pos, key_pos + key.length);
    let hiv = Module.HEAPU8.subarray(iv_pos, iv_pos + iv.length);
    let hcontent = Module.HEAPU8.subarray(content_pos, content_pos + content_len);

    hcontent.set(content);
    hkey.set(key);
    hiv.set(iv);

    // use wasm content
    switch (mode) {
        default:
        case RWSE2_MODE.CTR:
            Module._RWSE2_CTR(content_pos, content_len, key_pos, iv_pos, crypt_type, update_fn);
            break;
        case RWSE2_MODE.OFB:
            Module._RWSE2_OFB(content_pos, content_len, key_pos, iv_pos, crypt_type, update_fn);
            break;
    }

    content.set(hcontent);

    Module._free(iv_pos);
    Module._free(key_pos);
    Module._free(content_pos);
    Module.removeFunction(update_fn);
}
