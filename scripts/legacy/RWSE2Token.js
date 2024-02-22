"use-strict";

import { CRYPT_MODE as RWSE2_MODE, RWSE2_OPT, RWSE2_OFB, RWSE2_CTR } from "./RWSE2Mode.js";
import { RWSH, RWSH_TYPE } from "../RWSH.js";
import { unicodeToUtf8 } from "../UTF8Coding.js";
import { CustomError } from "../Errors.js";
export { RWSE2_OPT, RWSE2_MODE, RWSE2Token };

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

    switch (mode) {
        default:
        case RWSE2_MODE.CTR:
            RWSE2_CTR(content, key, iv, crypt_type, update_prog);
            break;
        case RWSE2_MODE.OFB:
            RWSE2_OFB(content, key, iv, crypt_type, update_prog);
            break;
    }
}
